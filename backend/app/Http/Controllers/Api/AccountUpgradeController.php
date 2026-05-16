<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Account;
use App\Models\Distributor;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Stat;
use App\Models\Wallet;
use App\Services\MlmEngineService;

class AccountUpgradeController extends Controller
{
    /**
     * POST /api/account/upgrade/initiate
     *
     * Initiates a Chapa payment for upgrading an existing account's product.
     * The upgrade can be:
     *   - Self-upgrade: distributor upgrades their own account
     *   - Downline upgrade: distributor upgrades an inactive customer's account
     *
     * Request body:
     *   account_id    (required) - the Account to upgrade
     *   new_product_id (required) - the new product (must have higher point value)
     *   distributor_id (required) - the distributor initiating the payment (earns commission)
     */
    public function initiate(Request $request)
    {
        $data = $request->validate([
            'node_id'        => 'required|exists:nodes,id',
            'new_product_id' => 'required|exists:products,id',
            'distributor_id' => 'required|exists:distributors,distributor_id',
        ]);

        // Find account by node_id
        $account = Account::with(['product', 'distributor'])->where('node_id', $data['node_id'])->first();
        if (!$account) {
            return response()->json(['message' => 'No account found for this node.'], 404);
        }

        $newProduct = Product::findOrFail($data['new_product_id']);
        $sponsor    = Distributor::findOrFail($data['distributor_id']);
        $targetDist = $account->distributor;

        // ── Permission check ──────────────────────────────────────────────────
        // Case 1: Self-upgrade — distributor upgrading their own account
        $isSelf = $targetDist && (int)$targetDist->distributor_id === (int)$data['distributor_id'];

        // Case 2: Upline upgrading a downline — only allowed if the downline is
        // inactive (customer who hasn't set a password / become a distributor).
        // Active distributors must upgrade their own accounts themselves.
        $isAllowedDownline = $targetDist
            && !$isSelf
            && $targetDist->status === 'inactive';

        if (!$isSelf && !$isAllowedDownline) {
            return response()->json([
                'message' => 'You can only upgrade inactive customer accounts. Active distributors must upgrade their own accounts.',
            ], 403);
        }

        // Validate: new product must have more points than current
        $currentPoints = $account->product->point ?? 0;
        if ($newProduct->point <= $currentPoints) {
            return response()->json([
                'message' => 'New product must have more points than the current product.',
            ], 422);
        }

        // Price to pay = full price of new product (not just the difference)
        // The distributor earns commission on the full new product price
        $amount = (float) $newProduct->price;
        $rate   = max(10, (float) ($newProduct->referral_rate ?? 10));
        $commissionAmount = round(($rate / 100) * ($newProduct->point ?? 0), 2);

        $txRef = 'UPGRADE-' . strtoupper(\Illuminate\Support\Str::random(10)) . '-' . time();

        $payment = Payment::create([
            'product_id'        => $newProduct->id,
            'distributor_id'    => $data['distributor_id'],
            'customer_name'     => $account->distributor->name ?? 'Customer',
            'customer_email'    => $account->distributor->email ?? '',
            'customer_phone'    => $account->distributor->phone ?? null,
            'tx_ref'            => $txRef,
            'amount'            => $amount,
            'currency'          => 'ETB',
            'quantity'          => 1,
            'commission_amount' => $commissionAmount,
            'status'            => 'pending',
            'commission_paid'   => false,
            'webhook_verified'  => false,
            // Store account_id in leg field temporarily (we'll use a meta approach)
            'leg'               => null,
        ]);

        // Store upgrade metadata in a separate way — use the payment's customer_phone
        // to encode account_id and new_product_id (since we can't add columns easily)
        // Better: store in a JSON field or use a dedicated meta table.
        // Simplest: store as a special tx_ref prefix and look up by account_id in the complete endpoint.
        // We'll pass account_id and new_product_id back to the frontend and include in the complete call.

        // Call Chapa
        $chapaSecret = env('CHAPA_SECRET_KEY');
        $nameParts   = explode(' ', trim($account->distributor->name ?? 'Customer'));

        $chapaPayload = [
            'amount'       => $amount,
            'currency'     => 'ETB',
            'email'        => $account->distributor->email ?? 'upgrade@nmms.app',
            'first_name'   => $nameParts[0],
            'last_name'    => count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '-',
            'phone_number' => $account->distributor->phone ?? '',
            'tx_ref'       => $txRef,
            'callback_url' => env('APP_URL') . '/api/payments/webhook',
            'return_url'   => env('FRONTEND_URL', 'https://nmms-ochre.vercel.app')
                . '/pay?tx_ref=' . $txRef
                . '&distributor_id=' . $data['distributor_id']
                . '&product_id=' . $newProduct->id,
            'customization' => [
                'title'       => 'Account Upgrade',
                'description' => preg_replace('/[^a-zA-Z0-9\-_ .]/', '', 'Upgrade to ' . $newProduct->name . ' ' . $newProduct->category),
            ],
        ];

        try {
            $chapaResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'Authorization' => 'Bearer ' . $chapaSecret,
                'Content-Type'  => 'application/json',
            ])->post('https://api.chapa.co/v1/transaction/initialize', $chapaPayload);

            $body = $chapaResponse->json();

            if ($chapaResponse->failed() || ($body['status'] ?? '') !== 'success') {
                Log::error('Chapa upgrade init failed', ['body' => $body]);
                $payment->update(['status' => 'failed']);
                return response()->json([
                    'status'  => 'error',
                    'message' => $body['message'] ?? 'Payment gateway error.',
                ], 502);
            }

            $checkoutUrl = $body['data']['checkout_url'] ?? null;
            $payment->update(['payment_url' => $checkoutUrl]);

            return response()->json([
                'status'       => 'success',
                'tx_ref'       => $txRef,
                'payment_url'  => $checkoutUrl,
                'amount'       => $amount,
                'node_id'      => $data['node_id'],
                'account_id'   => $account->id,
                'new_product'  => $newProduct->name,
                'new_points'   => $newProduct->point,
                'payment_id'   => $payment->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Chapa upgrade exception: ' . $e->getMessage());
            $payment->update(['status' => 'failed']);
            return response()->json(['status' => 'error', 'message' => 'Could not reach payment gateway.'], 503);
        }
    }

    /**
     * POST /api/account/upgrade/complete
     *
     * Called after successful Chapa payment to apply the product upgrade.
     * Updates the account's product_id and recalculates points/rank.
     *
     * Request body:
     *   tx_ref         (required)
     *   account_id     (required)
     *   new_product_id (required)
     */
    public function complete(Request $request)
    {
        $data = $request->validate([
            'tx_ref'         => 'required|string',
            'node_id'        => 'required|exists:nodes,id',
            'new_product_id' => 'required|exists:products,id',
        ]);

        $payment    = Payment::where('tx_ref', $data['tx_ref'])->first();
        $account    = Account::with(['product', 'distributor'])->where('node_id', $data['node_id'])->first();
        if (!$account) {
            return response()->json(['message' => 'Account not found for this node.'], 404);
        }
        $newProduct = Product::findOrFail($data['new_product_id']);

        if (!$payment) {
            return response()->json(['message' => 'Payment not found.'], 404);
        }

        if (!in_array($payment->status, ['success', 'pending'])) {
            return response()->json(['message' => 'Payment was not completed.'], 422);
        }

        // Validate upgrade direction
        $currentPoints = $account->product->point ?? 0;
        if ($newProduct->point <= $currentPoints) {
            return response()->json(['message' => 'New product must have more points.'], 422);
        }

        DB::beginTransaction();
        try {
            $payment = Payment::where('tx_ref', $data['tx_ref'])->lockForUpdate()->first();

            // Apply the upgrade — update product_id on the account
            DB::table('accounts')
                ->where('id', $account->id)
                ->update(['product_id' => $newProduct->id, 'updated_at' => now()]);

            // Recalculate own_points for the account owner
            $mlm = new MlmEngineService();
            $mlm->recalcAndRankForDistributor($account->distributor_id);

            // Mark payment as success and credit commission
            if ($payment->status !== 'success' || !$payment->commission_paid) {
                DB::table('payments')->where('id', $payment->id)->update([
                    'status'          => 'success',
                    'commission_paid' => true,
                    'updated_at'      => now(),
                ]);

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

            DB::commit();

            // Reload account to get fresh product
            $account->refresh();
            $account->load('product');

            return response()->json([
                'status'       => 'success',
                'message'      => 'Account upgraded to ' . $newProduct->name . ' successfully.',
                'account_id'   => $account->id,
                'new_product'  => $newProduct->name,
                'new_category' => $newProduct->category,
                'new_points'   => $newProduct->point,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('AccountUpgrade complete error', [
                'tx_ref'     => $data['tx_ref'],
                'account_id' => $data['account_id'],
                'message'    => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Upgrade failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/account/upgrade/options?node_id=...
     *
     * Returns the available upgrade products for a given node's account.
     */
    public function options(Request $request)
    {
        $nodeId = $request->query('node_id') ?? $request->query('account_id');

        // Find account by node_id first, fall back to account id
        $account = Account::with(['product', 'distributor'])->where('node_id', $nodeId)->first()
                ?? Account::with(['product', 'distributor'])->find($nodeId);

        if (!$account) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        $currentPoints = $account->product->point ?? 0;
        $targetDist    = $account->distributor;

        // Check if upgrade is allowed for this node
        // (self-upgrade always allowed; downline upgrade only for inactive customers)
        $requestingDistId = $request->query('distributor_id');
        $isSelf = $targetDist && $requestingDistId && (int)$targetDist->distributor_id === (int)$requestingDistId;
        $isInactiveDownline = $targetDist && $targetDist->status === 'inactive';
        $canUpgrade = $isSelf || $isInactiveDownline || !$requestingDistId;

        // Only show products with MORE points than current
        $upgrades = Product::where('point', '>', $currentPoints)
            ->orderBy('point')
            ->get()
            ->map(fn($p) => [
                'id'       => $p->id,
                'name'     => $p->name,
                'category' => $p->category,
                'price'    => $p->price,
                'point'    => $p->point,
                'image'    => $p->image,
            ]);

        return response()->json([
            'account_id'      => $account->id,
            'can_upgrade'     => $canUpgrade,
            'target_status'   => $targetDist?->status ?? 'unknown',
            'current_product' => [
                'id'       => $account->product->id ?? null,
                'name'     => $account->product->name ?? 'Unknown',
                'category' => $account->product->category ?? 'Unknown',
                'point'    => $currentPoints,
            ],
            'upgrades' => $canUpgrade ? $upgrades : [],
        ]);
    }
}
