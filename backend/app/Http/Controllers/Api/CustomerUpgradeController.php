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
     *   1. Finds the distributor by email (case-insensitive)
     *   2. Verifies the tx_ref matches a successful payment
     *   3. Sets their chosen password, marks is_paid = true
     *   4. Returns a Sanctum token so they can log in immediately
     */
    public function upgrade(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6|confirmed',
            'tx_ref'   => 'required|string',
        ]);

        // Normalize email to avoid case/whitespace mismatches
        $email = strtolower(trim($data['email']));

        // Find the distributor record — use case-insensitive match
        $distributor = Distributor::whereRaw('LOWER(TRIM(email)) = ?', [$email])->first();

        if (!$distributor) {
            // The distributor record may not exist yet if the webhook hasn't fired.
            // Try to find a successful payment and create the record on the fly.
            $payment = \App\Models\Payment::where('tx_ref', $data['tx_ref'])
                ->where('status', 'success')
                ->first();

            if (!$payment) {
                return response()->json([
                    'message' => 'Account not found. Please contact your distributor.',
                    'hint'    => 'No distributor record and no successful payment found for this email.',
                ], 404);
            }

            // Create the distributor record now
            $distributor = Distributor::create([
                'name'      => $payment->customer_name,
                'email'     => $email,
                'phone'     => $payment->customer_phone ?? null,
                'password'  => Hash::make($data['password']),
                'upline_id' => $payment->distributor_id,
                'is_paid'   => true,
                'join_date' => now(),
            ]);

            // Issue token and return
            $token = $distributor->createToken('auth_token')->plainTextToken;
            return response()->json([
                'status'       => 'success',
                'message'      => 'Welcome! Your distributor account is now active.',
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'user'         => $distributor,
            ]);
        }

        // Distributor record exists — verify the payment
        // Match on tx_ref + status only (email already matched above)
        $payment = \App\Models\Payment::where('tx_ref', $data['tx_ref'])
            ->where('status', 'success')
            ->first();

        if (!$payment) {
            // Payment may still be pending — check if it exists at all
            $anyPayment = \App\Models\Payment::where('tx_ref', $data['tx_ref'])->first();
            $hint = $anyPayment
                ? "Payment exists but status is: {$anyPayment->status}"
                : "No payment found with tx_ref: {$data['tx_ref']}";

            return response()->json([
                'message' => 'Payment not yet verified. Please wait a moment and try again.',
                'hint'    => $hint,
            ], 422);
        }

        // Set the real password and mark as active distributor
        $distributor->password = Hash::make($data['password']);
        $distributor->is_paid  = true;

        // Set upline_id to the sponsor if not already set
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
     */
    public function status(Request $request)
    {
        $email = $request->query('email');
        $txRef = $request->query('tx_ref');

        if (!$email || !$txRef) {
            return response()->json(['is_distributor' => false]);
        }

        $distributor = Distributor::whereRaw('LOWER(TRIM(email)) = ?', [strtolower(trim($email))])->first();
        if (!$distributor) {
            return response()->json(['is_distributor' => false]);
        }

        $hasAccount = Account::where('distributor_id', $distributor->distributor_id)->exists();

        return response()->json([
            'is_distributor' => $distributor->is_paid && $hasAccount,
            'has_account'    => $hasAccount,
            'name'           => $distributor->name,
        ]);
    }
}
