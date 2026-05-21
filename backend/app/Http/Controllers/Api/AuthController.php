<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Distributor;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:distributors',
            'phone' => 'nullable|string|max:20|unique:distributors',
            'password' => 'required|string|min:8',
        ]);

        $user = Distributor::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'status' => 'active',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            Log::info('Login attempt', ['email' => $request->email]);

            // First, check if it's an Admin/Owner in the 'users' table
            // IMPORTANT: Only 'admin' and 'owner' roles are allowed here
            $user = \App\Models\User::where('email', $request->email)->first();

            if ($user && Hash::check($request->password, $user->password)) {
                // Reject if the role is not admin or owner — prevents old 'user' role records
                // from slipping through to the distributor dashboard
                if (!in_array($user->role, ['admin', 'owner'])) {
                    Log::warning('Non-admin/owner tried to login', ['email' => $request->email, 'role' => $user->role]);
                    return response()->json(['message' => 'Invalid login details'], 401);
                }
                
                Log::info('Admin/Owner login successful', ['email' => $user->email, 'role' => $user->role]);
                
                $token = $user->createToken('auth_token')->plainTextToken;
                return response()->json([
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                    'user' => $user,
                ]);
            }

            // If not found or password mismatch, check 'distributors' table
            $distributor = \App\Models\Distributor::where('email', $request->email)->first();

            if ($distributor) {
                Log::info('Distributor login attempt', [
                    'email'     => $request->email,
                    'status'    => $distributor->status,
                    'is_paid'   => $distributor->is_paid,
                    'has_password' => !empty($distributor->password),
                ]);

                if (Hash::check($request->password, $distributor->password)) {
                    // Reject inactive distributors — they need to complete upgrade first
                    if ($distributor->status !== 'active') {
                        Log::warning('Inactive distributor tried to login', [
                            'email'  => $request->email,
                            'status' => $distributor->status,
                        ]);
                        return response()->json([
                            'message' => 'Your account is not yet active. Please complete the distributor activation process first.',
                        ], 403);
                    }

                    $token = $distributor->createToken('auth_token')->plainTextToken;

                    Log::info('Distributor login successful', [
                        'distributor_id' => $distributor->distributor_id,
                        'email'          => $distributor->email,
                        'status'         => $distributor->status,
                        'role'           => 'distributor',
                    ]);

                    return response()->json([
                        'access_token' => $token,
                        'token_type'   => 'Bearer',
                        'user'         => $distributor,
                    ]);
                }
            }

            Log::warning('Failed login attempt - invalid credentials', ['email' => $request->email]);

            return response()->json([
                'message' => 'Invalid login details'
            ], 401);
        } catch (\Throwable $e) {
            Log::error('Login error', [
                'message' => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Server Error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function user(Request $request)
    {
        return $request->user();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password does not match!'], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function index()
    {
        $users = \App\Models\User::select('userid', 'name', 'email', 'phone', 'role', 'status', 'created_at')->get();
        $distributors = \App\Models\Distributor::all()->map(function ($d) {
            // Distributors might not have a role column, so we assign it dynamically
            $d->role = 'distributor';
            $d->userid = $d->distributor_id; // Ensure consistent ID mapping for frontend
            $d->isPaid = (bool) $d->is_paid; // Map snake_case to camelCase
            return $d;
        });

        return response()->json($users->concat($distributors));
    }
    
    /**
     * Get admin dashboard statistics
     * Returns app user counts and transaction data
     */
    public function adminStats()
    {
        try {
            // Total distributors (app users)
            $totalDistributors = \App\Models\Distributor::count();
            
            // Active distributors (logged in within last 30 days)
            $activeDistributors = \App\Models\Distributor::where('updated_at', '>=', now()->subDays(30))->count();
            
            // Paid distributors
            $paidDistributors = \App\Models\Distributor::where('is_paid', true)->count();
            
            // Transaction statistics
            $totalTransactions = \App\Models\Payment::where('status', 'success')->count();
            $totalRevenue = \App\Models\Payment::where('status', 'success')->sum('amount');
            $pendingTransactions = \App\Models\Payment::where('status', 'pending')->count();
            $failedTransactions = \App\Models\Payment::where('status', 'failed')->count();
            
            // Recent transactions (last 10)
            $recentTransactions = \App\Models\Payment::with(['product', 'distributor'])
                ->where('status', 'success')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'customer_name' => $payment->customer_name,
                        'product_name' => $payment->product->name ?? 'Unknown',
                        'amount' => (float) $payment->amount,
                        'currency' => $payment->currency,
                        'distributor_name' => $payment->distributor->name ?? 'Unknown',
                        'created_at' => $payment->created_at->format('Y-m-d H:i:s'),
                    ];
                });
            
            // Product sales breakdown - Fixed query
            $productSalesRaw = \App\Models\Payment::where('status', 'success')
                ->selectRaw('product_id, COUNT(*) as sales_count, SUM(amount) as total_revenue')
                ->groupBy('product_id')
                ->get();
            
            $productSales = $productSalesRaw->map(function ($sale) {
                $product = \App\Models\Product::find($sale->product_id);
                return [
                    'product_id' => $sale->product_id,
                    'product_name' => $product->name ?? 'Unknown',
                    'sales_count' => (int) $sale->sales_count,
                    'total_revenue' => (float) $sale->total_revenue,
                ];
            });
            
            // Monthly revenue trend (last 6 months)
            $monthlyRevenue = \App\Models\Payment::where('status', 'success')
                ->where('created_at', '>=', now()->subMonths(6))
                ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, SUM(amount) as revenue')
                ->groupBy('month')
                ->orderBy('month', 'asc')
                ->get()
                ->map(function ($item) {
                    return [
                        'month' => $item->month,
                        'revenue' => (float) $item->revenue,
                    ];
                });
            
            return response()->json([
                'distributors' => [
                    'total' => $totalDistributors,
                    'active' => $activeDistributors,
                    'paid' => $paidDistributors,
                ],
                'transactions' => [
                    'total' => $totalTransactions,
                    'total_revenue' => (float) $totalRevenue,
                    'pending' => $pendingTransactions,
                    'failed' => $failedTransactions,
                ],
                'recent_transactions' => $recentTransactions,
                'product_sales' => $productSales,
                'monthly_revenue' => $monthlyRevenue,
            ]);
        } catch (\Exception $e) {
            Log::error('Admin stats error', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Failed to fetch admin statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function storeUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,owner',
        ]);

        $user = \App\Models\User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'status' => 'active',
        ]);

        return response()->json(['message' => 'User created successfully', 'user' => $user]);
    }

    public function update(Request $request, $id)
    {
        $user = \App\Models\User::findOrFail($id);
        
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,'.$id.',userid',
            'phone' => 'sometimes|nullable|string|max:20|unique:users,phone,'.$id.',userid',
            'password' => 'nullable|string|min:8',
        ]);

        $data = $request->only(['name', 'email', 'phone']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json(['message' => 'User updated successfully', 'user' => $user]);
    }

    public function toggleStatus($id)
    {
        $user = \App\Models\User::findOrFail($id);
        $user->status = $user->status === 'active' ? 'inactive' : 'active';
        $user->save();

        return response()->json(['message' => 'User status updated', 'user' => $user]);
    }
}
