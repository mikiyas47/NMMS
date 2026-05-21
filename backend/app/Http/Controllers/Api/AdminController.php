<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Distributor;
use App\Models\Payment;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Get all users (admins, owners, and distributors)
     */
    public function getAllUsers(Request $request)
    {
        $users = User::select('userid', 'name', 'email', 'phone', 'role', 'status', 'created_at')->get();
        
        // Select distributor_id as userid so frontend uses the same key for all user types
        $distributors = Distributor::select(
            DB::raw('distributor_id as userid'),
            'name',
            'email',
            'phone',
            DB::raw("COALESCE(status, 'inactive') as status"),
            'is_paid',
            'created_at',
            'rank'
        )->get()->map(function ($d) {
            $d->role    = 'distributor';
            $d->is_paid = (bool) $d->is_paid;
            return $d;
        });

        $allUsers = $users->concat($distributors);

        if ($request->has('role')) {
            $allUsers = $allUsers->where('role', $request->role);
        }
        if ($request->has('status')) {
            $allUsers = $allUsers->where('status', $request->status);
        }
        if ($request->has('search')) {
            $s = strtolower($request->search);
            $allUsers = $allUsers->filter(function ($u) use ($s) {
                return str_contains(strtolower($u->name ?? ''), $s)
                    || str_contains(strtolower($u->email ?? ''), $s)
                    || str_contains(strtolower($u->phone ?? ''), $s);
            });
        }

        return response()->json([
            'status' => 'success',
            'data'   => $allUsers->values(),
        ]);
    }

    /**
     * Create admin or owner
     */
    public function createUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => ['nullable', 'string', 'regex:/^(09\d{8}|\+2519\d{8})$/', 'unique:users'],
            'password' => 'required|string|min:8|regex:/[0-9]/',
            'role' => 'required|in:admin,owner',
        ], [
            'phone.regex' => 'Phone must be a valid Ethiopian number (e.g., 09XXXXXXXX or +2519XXXXXXXX).',
            'password.regex' => 'Password must contain at least one digit.'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'status' => 'active',
        ]);

        return response()->json(['status' => 'success', 'message' => 'User created successfully', 'data' => $user], 201);
    }

    /**
     * Update user (admin/owner/distributor)
     */
    public function updateUser(Request $request, $id)
    {
        $role = $request->input('role'); // Client must pass role to know which table to update, or we can guess.
        
        $rules = [
            'name' => 'sometimes|required|string|max:255',
            'password' => 'nullable|string|min:8',
        ];

        // Determine if it's a distributor or admin/owner
        $isDistributor = ($role === 'distributor') || Distributor::where('distributor_id', $id)->exists();

        if ($isDistributor) {
            $model = Distributor::where('distributor_id', $id)->firstOrFail();
            $rules['email'] = 'sometimes|required|string|email|max:255|unique:distributors,email,' . $id . ',distributor_id';
            $rules['phone'] = ['sometimes', 'nullable', 'string', 'regex:/^(09\d{8}|\+2519\d{8})$/', 'unique:distributors,phone,' . $id . ',distributor_id'];
        } else {
            $model = User::where('userid', $id)->firstOrFail();
            $rules['email'] = 'sometimes|required|string|email|max:255|unique:users,email,' . $id . ',userid';
            $rules['phone'] = ['sometimes', 'nullable', 'string', 'regex:/^(09\d{8}|\+2519\d{8})$/', 'unique:users,phone,' . $id . ',userid'];
        }

        $request->validate($rules, [
            'phone.regex' => 'Phone must be a valid Ethiopian number (e.g., 09XXXXXXXX or +2519XXXXXXXX).'
        ]);

        $data = $request->only(['name', 'email', 'phone']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $model->update($data);

        return response()->json(['status' => 'success', 'message' => 'User updated successfully', 'data' => $model]);
    }

    /**
     * Toggle status active/inactive
     */
    public function toggleStatus(Request $request, $id)
    {
        $role = $request->input('role', '');

        // Use role to pick the correct table; fall back to distributor check if role missing
        if ($role === 'distributor') {
            $model = Distributor::where('distributor_id', $id)->firstOrFail();
        } elseif (in_array($role, ['admin', 'owner'])) {
            $model = User::where('userid', $id)->firstOrFail();
        } else {
            // Fallback: try users first, then distributors
            $model = User::where('userid', $id)->first()
                ?? Distributor::where('distributor_id', $id)->firstOrFail();
        }

        $model->status = $model->status === 'active' ? 'inactive' : 'active';
        $model->save();

        return response()->json(['status' => 'success', 'message' => 'User status updated', 'new_status' => $model->status]);
    }

    /**
     * Sales Reports Analytics
     */
    public function salesReport(Request $request)
    {
        try {
            // Fetch only necessary data, avoid JOINs/raw grouping in DB.
            $query = Payment::with(['product', 'distributor']);

            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            $allPayments = $query->get();

            $successPayments = $allPayments->where('status', 'success');
            $pendingPayments = $allPayments->where('status', 'pending');
            $failedPayments = $allPayments->whereIn('status', ['failed', 'rejected']);

            // Product Breakdown (in PHP)
            $productSales = $successPayments->groupBy('product_id')->map(function ($group) {
                return [
                    'product_name' => $group->first()->product->name ?? 'Unknown Product',
                    'sales_count'  => $group->count(),
                    'revenue'      => $group->sum('amount'),
                ];
            })->sortByDesc('revenue')->values();

            // Distributor Breakdown (in PHP)
            $distributorSales = $successPayments->groupBy('distributor_id')->map(function ($group) {
                return [
                    'distributor_name' => $group->first()->distributor->name ?? 'Unknown',
                    'sales_count'      => $group->count(),
                    'revenue'          => $group->sum('amount'),
                ];
            })->sortByDesc('revenue')->take(10)->values();

            // Monthly Trend (in PHP)
            $trendPayments = $successPayments;
            if (!$request->filled('date_from')) {
                $cutoff = now()->subMonths(5)->startOfMonth();
                $trendPayments = $successPayments->filter(fn($p) => $p->created_at >= $cutoff);
            }

            $monthlyTrend = $trendPayments->groupBy(function ($payment) {
                return $payment->created_at->format('Y-m');
            })->map(function ($group, $month) {
                return [
                    'month'        => $month,
                    'revenue'      => $group->sum('amount'),
                    'transactions' => $group->count(),
                ];
            })->sortKeys()->values();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'overview' => [
                        'total_revenue'        => (float) $successPayments->sum('amount'),
                        'total_transactions'   => $successPayments->count(),
                        'pending_transactions' => $pendingPayments->count(),
                        'failed_transactions'  => $failedPayments->count(),
                    ],
                    'products'     => $productSales,
                    'distributors' => $distributorSales,
                    'trend'        => $monthlyTrend,
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'line'    => $e->getFile() . ':' . $e->getLine(),
            ], 500);
        }
    }
}
