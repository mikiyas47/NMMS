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
                    'status'    => 'active',
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
                \Illuminate\Support\Facades\Log::info('Upgrading existing distributor', [
                    'distributor_id' => $distributor->distributor_id,
                    'email'          => $email,
                    'old_status'     => $distributor->status,
                    'old_is_paid'    => $distributor->is_paid,
                ]);

                $distributor->password = Hash::make($data['password']);
                $distributor->is_paid  = true;
                $distributor->status   = 'active';
                if ($payment->distributor_id && !$distributor->upline_id) {
                    $distributor->upline_id = $payment->distributor_id;
                }
                $distributor->save();

                \Illuminate\Support\Facades\Log::info('Distributor upgraded successfully', [
                    'distributor_id' => $distributor->distributor_id,
                    'new_status'     => $distributor->status,
                    'new_is_paid'    => $distributor->is_paid,
                ]);

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

            // ── Step 3: Mark payment as success and pay commission ───────────────
            // Whether the distributor record was just created or already existed,
            // mark the payment as success and credit the sponsor's commission now.
            // The webhook may never arrive on free-tier hosting, so we pay here too.
            if ($payment->status !== 'success' || !$payment->commission_paid) {
                $payment->status           = 'success';
                $payment->webhook_verified = true;
                $payment->commission_paid  = true;
                $payment->save();

                // Credit commission to the referring distributor's wallet
                if ($payment->commission_amount > 0 && $payment->distributor_id) {
                    $sponsorWallet = \App\Models\Wallet::firstOrCreate(['distributor_id' => $payment->distributor_id]);
                    $sponsorWallet->balance      += $payment->commission_amount;
                    $sponsorWallet->total_earned += $payment->commission_amount;
                    $sponsorWallet->save();

                    Distributor::where('distributor_id', $payment->distributor_id)
                        ->increment('income_monthly', $payment->commission_amount);
                    Distributor::where('distributor_id', $payment->distributor_id)
                        ->increment('income_yearly', $payment->commission_amount);
                }
            }

            // ── Step 4: Issue token ───────────────────────────────────────────────
            // Refresh the distributor model to ensure we have the latest data
            $distributor->refresh();

            \Illuminate\Support\Facades\Log::info('Distributor activation complete', [
                'distributor_id' => $distributor->distributor_id,
                'email'          => $distributor->email,
                'status'         => $distributor->status,
                'is_paid'        => $distributor->is_paid,
            ]);

            $token = $distributor->createToken('auth_token')->plainTextToken;

            DB::commit();

            return response()->json([
                'status'       => 'success',
                'message'      => 'Welcome! Your distributor account is now active.',
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'user'         => $distributor,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Customer upgrade error', [
                'email'     => $email,
                'tx_ref'    => $data['tx_ref'],
                'message'   => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Account activation failed. Please try again or contact support.',
                'error'   => config('app.debug') ? $e->getMessage() : 'An error occurred during activation.',
            ], 500);
        }
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
