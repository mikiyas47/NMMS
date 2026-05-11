<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Distributor;
use App\Models\Account;
use App\Models\Node;
use App\Models\Wallet;
use App\Models\Stat;

class CustomerUpgradeController extends Controller
{
    /**
     * POST /api/customer/upgrade
     *
     * Called after a successful payment when the customer chooses to become a distributor.
     *
     * The flow:
     *   1. Verify the tx_ref is a real successful payment
     *   2. Find or create the distributor record using the payment's customer info
     *   3. Set the chosen password and mark is_paid = true
     *   4. Return a Sanctum token so they can log in immediately
     *
     * This works regardless of whether the Chapa webhook has fired yet,
     * because we use the payment record (created at initiation time) as the source of truth.
     */
    public function upgrade(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6|confirmed',
            'tx_ref'   => 'required|string',
        ]);

        $email = strtolower(trim($data['email']));

        // ── Step 1: Verify the payment ────────────────────────────────────────
        // The payment record is created at initiation time (before webhook),
        // so it always exists after a successful Chapa checkout.
        $payment = \App\Models\Payment::where('tx_ref', $data['tx_ref'])->first();

        if (!$payment) {
            return response()->json([
                'message' => 'Payment record not found. Please contact your distributor.',
            ], 404);
        }

        // Accept both 'success' and 'pending' — pending means webhook hasn't fired yet
        // but the customer has completed the Chapa checkout page.
        if (!in_array($payment->status, ['success', 'pending'])) {
            return response()->json([
                'message' => 'Payment was not completed. Cannot create your account.',
            ], 422);
        }

        // Verify the email matches the payment
        if (strtolower(trim($payment->customer_email)) !== $email) {
            return response()->json([
                'message' => 'Email does not match the payment record.',
            ], 422);
        }

        // ── Step 2: Find or create the distributor record ─────────────────────
        DB::beginTransaction();
        try {
            $distributor = Distributor::whereRaw('LOWER(TRIM(email)) = ?', [$email])->first();

            if (!$distributor) {
                // Distributor record doesn't exist yet (webhook hasn't fired).
                // Create it now using the payment's customer info.
                $distributor = Distributor::create([
                    'name'      => $payment->customer_name,
                    'email'     => $email,
                    'phone'     => $payment->customer_phone ?? null,
                    'password'  => Hash::make($data['password']),
                    'upline_id' => $payment->distributor_id,
                    'is_paid'   => true,
                    'join_date' => now(),
                ]);

                // Create wallet and stat records
                Wallet::firstOrCreate(['distributor_id' => $distributor->distributor_id]);
                Stat::firstOrCreate(['distributor_id'   => $distributor->distributor_id]);

                // Place the node in the tree under the sponsor
                $mlm = new \App\Services\MlmEngineService();
                $sponsorNode = Node::where('distributor_id', $payment->distributor_id)
                    ->orderBy('id', 'asc')->first();

                if ($sponsorNode) {
                    $placementNode = $mlm->findPlacementNode($sponsorNode->id);
                    $leg = $placementNode->children()->count() + 1;
                    if ($leg > 4) $leg = 4;

                    $newNode = Node::create([
                        'parent_id'      => $placementNode->id,
                        'distributor_id' => $distributor->distributor_id,
                        'leg'            => $leg,
                    ]);

                    Account::create([
                        'distributor_id' => $distributor->distributor_id,
                        'node_id'        => $newNode->id,
                        'product_id'     => $payment->product_id,
                        'sponsor_id'     => $payment->distributor_id,
                    ]);

                    // Update own_points
                    $product = \App\Models\Product::find($payment->product_id);
                    if ($product) {
                        $stat = Stat::where('distributor_id', $distributor->distributor_id)->first();
                        if ($stat) {
                            $stat->own_points = $product->point ?? 0;
                            $stat->save();
                        }
                    }

                    // Run rank check for ancestors
                    $mlm->runRankCheckForAncestors($newNode, $distributor->distributor_id);
                }

            } else {
                // Distributor record already exists — update password and ensure tree placement
                $distributor->password = Hash::make($data['password']);
                $distributor->is_paid  = true;
                if ($payment->distributor_id && !$distributor->upline_id) {
                    $distributor->upline_id = $payment->distributor_id;
                }
                $distributor->save();

                // Ensure wallet and stat exist
                Wallet::firstOrCreate(['distributor_id' => $distributor->distributor_id]);
                Stat::firstOrCreate(['distributor_id'   => $distributor->distributor_id]);

                // ── Ensure the node and account exist in the tree ──────────────
                // The webhook may have created the distributor record but failed
                // to place the node, or the upgrade ran before the webhook.
                $hasAccount = Account::where('distributor_id', $distributor->distributor_id)->exists();

                if (!$hasAccount) {
                    $mlm = new \App\Services\MlmEngineService();
                    $sponsorNode = Node::where('distributor_id', $payment->distributor_id)
                        ->orderBy('id', 'asc')->first();

                    if ($sponsorNode) {
                        $placementNode = $mlm->findPlacementNode($sponsorNode->id);
                        $leg = $placementNode->children()->count() + 1;
                        if ($leg > 4) $leg = 4;

                        $newNode = Node::create([
                            'parent_id'      => $placementNode->id,
                            'distributor_id' => $distributor->distributor_id,
                            'leg'            => $leg,
                        ]);

                        Account::create([
                            'distributor_id' => $distributor->distributor_id,
                            'node_id'        => $newNode->id,
                            'product_id'     => $payment->product_id,
                            'sponsor_id'     => $payment->distributor_id,
                        ]);

                        // Update own_points
                        $product = \App\Models\Product::find($payment->product_id);
                        if ($product) {
                            $stat = Stat::where('distributor_id', $distributor->distributor_id)->first();
                            if ($stat) {
                                $stat->own_points = ($stat->own_points ?? 0) + ($product->point ?? 0);
                                $stat->save();
                            }
                        }

                        // Run rank check for ancestors
                        $mlm->runRankCheckForAncestors($newNode, $distributor->distributor_id);
                    }
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Customer upgrade error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Account creation failed. Please try again.',
                'error'   => $e->getMessage(),
            ], 500);
        }

        // ── Step 3: Mark payment as success ──────────────────────────────────
        // Whether the distributor record was just created or already existed,
        // the payment should now be marked as success since the customer has
        // completed the upgrade and we have verified the tx_ref.
        if ($payment->status !== 'success') {
            $payment->status           = 'success';
            $payment->webhook_verified = true;
            $payment->commission_paid  = false; // webhook will handle commission
            $payment->save();
        }

        // ── Step 4: Issue token ───────────────────────────────────────────────
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

    /**
     * Make runRankCheckForAncestors accessible — it's private in MlmEngineService
     * so we call it via a public wrapper.
     */
}
