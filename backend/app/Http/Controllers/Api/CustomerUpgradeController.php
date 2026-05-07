<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Distributor;
use App\Models\Account;
use App\Models\Node;

class CustomerUpgradeController extends Controller
{
    /**
     * POST /api/customer/upgrade
     *
     * Called after a successful payment when the customer chooses to become a distributor.
     * The customer already exists in the distributors table (created by processCustomerPurchase
     * with a random temp password). This endpoint:
     *   1. Verifies the customer exists and the tx_ref matches a real payment for them
     *   2. Sets their chosen password
     *   3. Sets upline_id to the sponsor (the distributor who sold to them)
     *   4. Marks is_paid = true
     *   5. Returns a Sanctum token so they can log in immediately
     *
     * No auth required — the customer is not logged in yet.
     */
    public function upgrade(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6|confirmed', // password + password_confirmation
            'tx_ref'   => 'required|string',                 // proves they actually paid
        ]);

        // Find the distributor record created during processCustomerPurchase
        $distributor = Distributor::where('email', $data['email'])->first();
        if (!$distributor) {
            return response()->json(['message' => 'Account not found. Please contact your distributor.'], 404);
        }

        // Verify the tx_ref belongs to this customer's email
        $payment = \App\Models\Payment::where('tx_ref', $data['tx_ref'])
            ->where('customer_email', $data['email'])
            ->where('status', 'success')
            ->first();

        if (!$payment) {
            return response()->json(['message' => 'Payment not verified. Cannot upgrade account.'], 422);
        }

        // Set the real password and mark as active distributor
        $distributor->password = Hash::make($data['password']);
        $distributor->is_paid  = true;

        // Set upline_id to the sponsor (the distributor who made the sale)
        if ($payment->distributor_id && !$distributor->upline_id) {
            $distributor->upline_id = $payment->distributor_id;
        }

        $distributor->save();

        // Issue a Sanctum token so they can log in immediately
        $token = $distributor->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'       => 'success',
            'message'      => 'Welcome! Your distributor account is now active.',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $distributor,
        ]);
    }

    /**
     * GET /api/customer/status?email=...&tx_ref=...
     *
     * Lets the CustomerPayScreen check whether this email already has an active
     * distributor account (is_paid = true) so we don't show the upgrade prompt again.
     * Public — no auth required.
     */
    public function status(Request $request)
    {
        $email  = $request->query('email');
        $txRef  = $request->query('tx_ref');

        if (!$email || !$txRef) {
            return response()->json(['is_distributor' => false]);
        }

        $distributor = Distributor::where('email', $email)->first();
        if (!$distributor) {
            return response()->json(['is_distributor' => false]);
        }

        // Check if they have an account (node in the tree) — that means they were placed
        $hasAccount = Account::where('distributor_id', $distributor->distributor_id)->exists();

        return response()->json([
            'is_distributor' => $distributor->is_paid && $hasAccount,
            'has_account'    => $hasAccount,
            'name'           => $distributor->name,
        ]);
    }
}
