<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Distributor;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
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
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // First, check if it's an Admin/Owner in the 'users' table
        // IMPORTANT: Only 'admin' and 'owner' roles are allowed here
        $user = \App\Models\User::where('email', $request->email)->first();

        if ($user && Hash::check($request->password, $user->password)) {
            // Reject if the role is not admin or owner — prevents old 'user' role records
            // from slipping through to the distributor dashboard
            if (!in_array($user->role, ['admin', 'owner'])) {
                return response()->json(['message' => 'Invalid login details'], 401);
            }
            $token = $user->createToken('auth_token')->plainTextToken;
            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ]);
        }

        // If not found or password mismatch, check 'distributors' table
        $distributor = \App\Models\Distributor::where('email', $request->email)->first();

        if ($distributor && Hash::check($request->password, $distributor->password)) {
            $token = $distributor->createToken('auth_token')->plainTextToken;
            
            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $distributor,
            ]);
        }

        return response()->json([
            'message' => 'Invalid login details'
        ], 401);
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

    public function index()
    {
        return response()->json(Distributor::all());
    }
    public function update(Request $request, $id)
    {
        $user = Distributor::findOrFail($id);
        
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:distributors,email,'.$id.',distributor_id',
            'phone' => 'sometimes|nullable|string|max:20|unique:distributors,phone,'.$id.',distributor_id',
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
        $user = Distributor::findOrFail($id);
        $user->is_paid = !$user->is_paid;
        $user->save();

        return response()->json(['message' => 'Distributor payment status updated', 'user' => $user]);
    }
}
