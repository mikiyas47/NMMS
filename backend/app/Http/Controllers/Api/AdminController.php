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
        // Build base filtered query for successful payments
        $applyFilters = function ($q) use ($request) {
            $q->where('status', 'success');
            if ($request->filled('date_from')) {
                $q->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $q->whereDate('created_at', '<=', $request->date_to);
            }
            return $q;
        };

        // Overview Stats
        $totalRevenue      = $applyFilters(Payment::query())->sum('amount');
        $totalTransactions = $applyFilters(Payment::query())->count();

        $pendingQ  = Payment::where('status', 'pending');
        $failedQ   = Payment::whereIn('status', ['failed', 'rejected']);
        if ($request->filled('date_from')) {
            $pendingQ->whereDate('created_at', '>=', $request->date_from);
            $failedQ->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $pendingQ->whereDate('created_at', '<=', $request->date_to);
            $failedQ->whereDate('created_at', '<=', $request->date_to);
        }

        // Detect database driver for cross-DB compatible date formatting
        $driver = DB::getDriverName();

        // Product Breakdown — LEFT JOIN so missing product rows still appear
        $productSales = $applyFilters(Payment::query())
            ->leftJoin('products', 'payments.product_id', '=', 'products.id')
            ->select(
                DB::raw("COALESCE(products.name, 'Unknown Product') as product_name"),
                DB::raw('count(*) as sales_count'),
                DB::raw('sum(payments.amount) as revenue')
            )
            ->groupBy('payments.product_id', 'products.name')
            ->orderByDesc('revenue')
            ->get();

        // Distributor Breakdown — LEFT JOIN
        $distributorSales = $applyFilters(Payment::query())
            ->leftJoin('distributors', 'payments.distributor_id', '=', 'distributors.distributor_id')
            ->select(
                DB::raw("COALESCE(distributors.name, 'Unknown') as distributor_name"),
                DB::raw('count(*) as sales_count'),
                DB::raw('sum(payments.amount) as revenue')
            )
            ->groupBy('payments.distributor_id', 'distributors.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        // Monthly Trend — use driver-appropriate date function
        $trendQuery = $applyFilters(Payment::query());
        if (!$request->filled('date_from')) {
            $trendQuery->where('payments.created_at', '>=', now()->subMonths(5)->startOfMonth());
        }

        if ($driver === 'pgsql') {
            $monthExpr = "TO_CHAR(created_at, 'YYYY-MM')";
        } elseif ($driver === 'sqlite') {
            $monthExpr = "strftime('%Y-%m', created_at)";
        } else {
            $monthExpr = "DATE_FORMAT(created_at, '%Y-%m')";
        }

        $monthlyTrend = $trendQuery
            ->select(
                DB::raw("{$monthExpr} as month"),
                DB::raw('sum(amount) as revenue'),
                DB::raw('count(*) as transactions')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'overview' => [
                    'total_revenue'          => (float) $totalRevenue,
                    'total_transactions'     => $totalTransactions,
                    'pending_transactions'   => $pendingQ->count(),
                    'failed_transactions'    => $failedQ->count(),
                ],
                'products'     => $productSales,
                'distributors' => $distributorSales,
                'trend'        => $monthlyTrend,
            ]
        ]);
    }
}
