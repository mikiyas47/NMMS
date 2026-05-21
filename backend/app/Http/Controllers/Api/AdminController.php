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
        
        $distributors = Distributor::select(
            'distributor_id as userid',
            'name',
            'email',
            'phone',
            'status',
            'is_paid',
            'created_at',
            'rank'
        )->get()->map(function ($d) {
            $d->role = 'distributor';
            $d->isPaid = (bool) $d->is_paid;
            return $d;
        });

        // Combine and optionally filter/sort
        $allUsers = $users->concat($distributors);

        // Simple filtering (can be expanded)
        if ($request->has('role')) {
            $allUsers = $allUsers->where('role', $request->role);
        }
        if ($request->has('status')) {
            $allUsers = $allUsers->where('status', $request->status);
        }
        if ($request->has('search')) {
            $s = strtolower($request->search);
            $allUsers = $allUsers->filter(function($u) use ($s) {
                return str_contains(strtolower($u->name), $s) || 
                       str_contains(strtolower($u->email), $s) || 
                       str_contains(strtolower($u->phone ?? ''), $s);
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $allUsers->values() // Re-index array
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
        $role = $request->input('role');
        $isDistributor = ($role === 'distributor') || Distributor::where('distributor_id', $id)->exists();

        if ($isDistributor) {
            $model = Distributor::where('distributor_id', $id)->firstOrFail();
        } else {
            $model = User::where('userid', $id)->firstOrFail();
        }

        $model->status = $model->status === 'active' ? 'inactive' : 'active';
        $model->save();

        return response()->json(['status' => 'success', 'message' => 'User status updated', 'data' => $model]);
    }

    /**
     * Sales Reports Analytics
     */
    public function salesReport(Request $request)
    {
        $query = Payment::where('status', 'success');

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $baseQuery = clone $query;

        // Overview Stats
        $totalRevenue = (clone $baseQuery)->sum('amount');
        $totalTransactions = (clone $baseQuery)->count();
        $pendingTransactions = Payment::where('status', 'pending');
        $failedTransactions = Payment::where('status', 'failed');
        
        if ($request->filled('date_from')) {
            $pendingTransactions->whereDate('created_at', '>=', $request->date_from);
            $failedTransactions->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $pendingTransactions->whereDate('created_at', '<=', $request->date_to);
            $failedTransactions->whereDate('created_at', '<=', $request->date_to);
        }

        // Product Breakdown
        $productSales = (clone $baseQuery)
            ->join('products', 'payments.product_id', '=', 'products.id')
            ->select('products.name as product_name', DB::raw('count(*) as sales_count'), DB::raw('sum(payments.amount) as revenue'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('revenue')
            ->get();

        // Distributor Breakdown
        $distributorSales = (clone $baseQuery)
            ->join('distributors', 'payments.distributor_id', '=', 'distributors.distributor_id')
            ->select('distributors.name as distributor_name', DB::raw('count(*) as sales_count'), DB::raw('sum(payments.amount) as revenue'))
            ->groupBy('distributors.distributor_id', 'distributors.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        // Monthly Trend (Last 6 months by default, unless filtered)
        $monthlyQuery = clone $baseQuery;
        if (!$request->filled('date_from')) {
            $monthlyQuery->where('created_at', '>=', now()->subMonths(5)->startOfMonth());
        }
        
        $monthlyTrend = $monthlyQuery
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"), 
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
                    'total_revenue' => $totalRevenue,
                    'total_transactions' => $totalTransactions,
                    'pending_transactions' => $pendingTransactions->count(),
                    'failed_transactions' => $failedTransactions->count(),
                ],
                'products' => $productSales,
                'distributors' => $distributorSales,
                'trend' => $monthlyTrend
            ]
        ]);
    }
}
