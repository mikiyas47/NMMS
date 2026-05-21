<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
     * FIX: Moved DB::beginTransaction() BEFORE the payment lookup so that
     * lockForUpdate() on the payment row actually works (locks require an active
     * transaction). This prevents the race condition between the Chapa webhook
     * and this endpoint both trying to process the same payment simultaneously.
     *
     * FIX: Removed $payment->save() with chapa_payload / webhook_verified fields
     * that may not exist on all deployments. We only update the fields we know exist.
     *
     * FIX: join_date is passed as a date string (not a Carbon object) to avoid
     * type errors on strict PostgreSQL date columns.
     *
     * FIX: All DB writes are inside the transaction so a failure anywhere rolls
     * back everything cleanly — no partial state left in the database.
     */
    public function upgrade(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6|confirmed',
            'tx_ref'   => 'required|string',
        ]);

        $email = strtolower(trim($data['email']));

        // Start transaction BEFORE the payment lookup so lockForUpdate works
        DB::beginTransaction();
        try {
            // ── Step 1: Verify the payment (with row lock to prevent race conditions) ──
            $payment = \App\Models\Payment::where('tx_ref', $data['tx_ref'])
                ->lockForUpdate()
                ->first();

            if (!$payment) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Payment record not found. Please contact your distributor.',
                ], 404);
            }

            // Accept both 'success' and 'pending' — pending means webhook hasn't fired yet
            if (!in_array($payment->status, ['success', 'pending'])) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Payment was not completed. Cannot create your account.',
                ], 422);
            }

            // Verify the email matches the payment
            if (strtolower(trim($payment->customer_email)) !== $email) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Email does not match the payment record.',
                ], 422);
            }

            // ── Step 2: Find or create the distributor record ─────────────────
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
                    'join_date' => now()->toDateString(),
                ]);

                Wallet::firstOrCreate(['distributor_id' => $distributor->distributor_id]);
                Stat::firstOrCreate(['distributor_id'   => $distributor->distributor_id]);

                // Place the node in the tree under the sponsor, respecting the leg from the payment
                $mlm         = new \App\Services\MlmEngineService();
                $sponsorNode = Node::where('distributor_id', $payment->distributor_id)
                    ->orderBy('id', 'asc')->first();

                if ($sponsorNode) {
                    $preferredLeg  = $payment->leg ?? null;
                    $placementNode = null;
                    $leg           = null;

                    if ($preferredLeg) {
                        // Place at the leg the distributor selected when sharing the link
                        $existingLegChild = Node::where('parent_id', $sponsorNode->id)
                            ->where('leg', $preferredLeg)->first();
                        if ($existingLegChild) {
                            // That leg is occupied (e.g. doubled account) — BFS from inside it
                            $placementNode = $mlm->findPlacementNode($existingLegChild->id);
                            $leg           = $placementNode ? min($placementNode->children()->count() + 1, 4) : 1;
                        } else {
                            // Leg is free — place directly under sponsor's main node
                            $placementNode = $sponsorNode;
                            $leg           = $preferredLeg;
                        }
                    } else {
                        $placementNode = $mlm->findPlacementNode($sponsorNode->id);
                        $leg           = $placementNode ? min($placementNode->children()->count() + 1, 4) : 1;
                    }

                    if ($placementNode) {
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

                        $product = \App\Models\Product::find($payment->product_id);
                        if ($product) {
                            $stat = Stat::where('distributor_id', $distributor->distributor_id)->first();
                            if ($stat) {
                                $stat->own_points = $product->point ?? 0;
                                $stat->save();
                            }
                        }

                        $mlm->runRankCheckForAncestors($newNode, $distributor->distributor_id);
                    }
                }

            } else {
                // Distributor record already exists — update password and activate
                Log::info('CustomerUpgrade: Activating existing distributor', [
                    'distributor_id' => $distributor->distributor_id,
                    'email'          => $email,
                    'old_status'     => $distributor->status,
                    'old_is_paid'    => $distributor->is_paid,
                ]);

                // Use DB::update for a direct SQL update — avoids any model cast issues
                DB::table('distributors')
                    ->where('distributor_id', $distributor->distributor_id)
                    ->update([
                        'password'   => Hash::make($data['password']),
                        'is_paid'    => true,
                        'status'     => 'active',
                        'upline_id'  => $distributor->upline_id ?? $payment->distributor_id,
                        'updated_at' => now(),
                    ]);

                // Reload the model to get fresh data
                $distributor = Distributor::find($distributor->distributor_id);

                Wallet::firstOrCreate(['distributor_id' => $distributor->distributor_id]);
                Stat::firstOrCreate(['distributor_id'   => $distributor->distributor_id]);

                // Ensure the node and account exist in the tree
                $accountCount = Account::where('distributor_id', $distributor->distributor_id)->count();
                $quantity     = $payment->quantity ?? 1;

                if ($accountCount < $quantity) {
                    $mlm         = new \App\Services\MlmEngineService();
                    $sponsorNode = Node::where('distributor_id', $payment->distributor_id)
                        ->orderBy('id', 'asc')->first();

                    if ($sponsorNode) {
                        $preferredLeg = $payment->leg ?? null;
                        
                        // Remaining accounts to create
                        $toCreate = $quantity - $accountCount;

                        for ($i = 0; $i < $toCreate; $i++) {
                            $placementNode = null;
                            $leg           = null;

                            // Only use preferred leg if it's the first node of the distributor EVER
                            if ($accountCount === 0 && $i === 0 && $preferredLeg) {
                                $existingLegChild = Node::where('parent_id', $sponsorNode->id)
                                    ->where('leg', $preferredLeg)->first();
                                if ($existingLegChild) {
                                    $placementNode = $mlm->findPlacementNode($existingLegChild->id);
                                    $leg           = $placementNode ? min(Node::where('parent_id', $placementNode->id)->count() + 1, 4) : 1;
                                } else {
                                    $placementNode = $sponsorNode;
                                    $leg           = $preferredLeg;
                                }
                            } else {
                                $placementNode = $mlm->findPlacementNode($sponsorNode->id);
                                $leg           = $placementNode ? min(Node::where('parent_id', $placementNode->id)->count() + 1, 4) : 1;
                            }

                            if ($placementNode) {
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

                                // Refresh points and check ranks after each account? 
                                // Actually better to do once after the loop.
                            }
                        }

                        $mlm->refreshOwnPoints($distributor->distributor_id);
                        $mlm->runRankCheck($distributor->distributor_id);
                        
                        // Use the first new node of THIS distributor for ancestor check
                        $firstNode = Node::where('distributor_id', $distributor->distributor_id)->orderBy('id')->first();
                        if ($firstNode) {
                            $mlm->runRankCheckForAncestors($firstNode, $payment->distributor_id);
                        }
                    }
                }

                Log::info('CustomerUpgrade: Distributor activated', [
                    'distributor_id' => $distributor->distributor_id,
                    'new_status'     => $distributor->status,
                    'new_is_paid'    => $distributor->is_paid,
                ]);
            }

            // ── Step 3: Mark payment as success and pay commission ────────────
            // Only update the columns we know exist on all deployments.
            if ($payment->status !== 'success' || !$payment->commission_paid) {
                DB::table('payments')
                    ->where('id', $payment->id)
                    ->update([
                        'status'          => 'success',
                        'commission_paid' => true,
                        'updated_at'      => now(),
                    ]);

                // Credit commission to the referring distributor's wallet
                if ($payment->commission_amount > 0 && $payment->distributor_id) {
                    $sponsorWallet = Wallet::firstOrCreate(['distributor_id' => $payment->distributor_id]);
                    $sponsorWallet->balance      += $payment->commission_amount;
                    $sponsorWallet->total_earned += $payment->commission_amount;
                    $sponsorWallet->save();

                    DB::table('distributors')
                        ->where('distributor_id', $payment->distributor_id)
                        ->increment('income_monthly', $payment->commission_amount);
                    DB::table('distributors')
                        ->where('distributor_id', $payment->distributor_id)
                        ->increment('income_yearly', $payment->commission_amount);
                }
            }

            // ── Step 4: Issue token ───────────────────────────────────────────
            // Reload to get the absolute latest state from DB
            $distributor = Distributor::find($distributor->distributor_id);

            $token = $distributor->createToken('auth_token')->plainTextToken;

            DB::commit();

            Log::info('CustomerUpgrade: Complete', [
                'distributor_id' => $distributor->distributor_id,
                'status'         => $distributor->status,
                'is_paid'        => $distributor->is_paid,
            ]);

            return response()->json([
                'status'       => 'success',
                'message'      => 'Welcome! Your distributor account is now active.',
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'user'         => array_merge($distributor->toArray(), [
                    'role'   => 'distributor',
                    'status' => 'active',
                ]),
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('CustomerUpgrade: Error', [
                'email'   => $email,
                'tx_ref'  => $data['tx_ref'],
                'message' => $e->getMessage(),
                'file'    => $e->getFile() . ':' . $e->getLine(),
                'trace'   => substr($e->getTraceAsString(), 0, 3000),
            ]);
            return response()->json([
                'message' => 'Account activation failed: ' . $e->getMessage(),
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
}
