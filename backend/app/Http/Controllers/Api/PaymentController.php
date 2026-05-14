<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Distributor;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    const CHAPA_BASE = 'https://api.chapa.co/v1';

    // ─────────────────────────────────────────────────────────────────────────
    // 1. INITIATE — POST /api/payments/initiate
    // ─────────────────────────────────────────────────────────────────────────
    public function initiate(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'distributor_id' => 'required|exists:distributors,distributor_id',
            'quantity' => 'required|integer|min:1',
            'customer_name' => 'required|string|max:120',
            'customer_email' => 'required|email|max:120',
            'customer_phone' => 'nullable|string|max:20',
            'prospect_id' => 'nullable|exists:prospects,prospect_id',
            'leg' => 'nullable|integer|between:1,4',
        ]);

        // Lock price from backend — distributor cannot override
        $product = Product::findOrFail($data['product_id']);

        $unitPrice = (float) $product->price;
        $totalAmount = round($unitPrice * $data['quantity'], 2);

        $sponsorAccounts = \App\Models\Account::where('distributor_id', $data['distributor_id'])->with('product')->get();
        $rate = 10;
        foreach ($sponsorAccounts as $acc) {
            if ($acc->product && $acc->product->referral_rate > $rate) {
                $rate = $acc->product->referral_rate;
            }
        }
        $points = $product->point ?? 0;
        $commissionAmount = ($rate / 100) * $points * $data['quantity'];

        // Unique reference — ties product + distributor + customer together
        $txRef = 'NMMS-' . strtoupper(Str::random(10)) . '-' . time();

        $payment = Payment::create([
            'product_id' => $product->id,
            'distributor_id' => $data['distributor_id'],
            'prospect_id' => $data['prospect_id'] ?? null,
            'customer_name' => $data['customer_name'],
            'customer_email' => $data['customer_email'],
            'customer_phone' => $data['customer_phone'] ?? null,
            'leg' => $data['leg'] ?? null,
            'tx_ref' => $txRef,
            'amount' => $totalAmount,
            'currency' => 'ETB',
            'quantity' => $data['quantity'],
            'commission_amount' => $commissionAmount,
            'status' => 'pending',
        ]);

        // Call Chapa to create checkout link
        $chapaSecret = env('CHAPA_SECRET_KEY');
        $nameParts = explode(' ', trim($data['customer_name']));

        $chapaPayload = [
            'amount' => $totalAmount,
            'currency' => 'ETB',
            'email' => $data['customer_email'],
            'first_name' => $nameParts[0],
            'last_name' => count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '-',
            'phone_number' => $data['customer_phone'] ?? '',
            'tx_ref' => $txRef,
            'callback_url' => env('APP_URL') . '/api/payments/webhook',
            'return_url' => env('APP_URL') . '/api/payments/return?tx_ref=' . $txRef,
            'customization' => [
                'title' => 'NMMS Purchase',
                'description' => $data['quantity'] . 'x ' . Str::limit($product->name, 20),
            ],
        ];

        try {
            $chapaResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $chapaSecret,
                'Content-Type' => 'application/json',
            ])->post(self::CHAPA_BASE . '/transaction/initialize', $chapaPayload);

            $body = $chapaResponse->json();

            if ($chapaResponse->failed() || ($body['status'] ?? '') !== 'success') {
                Log::error('Chapa init failed', ['body' => $body]);
                $payment->update(['status' => 'failed']);
                return response()->json([
                    'status' => 'error',
                    'message' => $body['message'] ?? 'Payment gateway error. Please try again.',
                ], 502);
            }

            $checkoutUrl = $body['data']['checkout_url'] ?? null;
            $payment->update(['payment_url' => $checkoutUrl]);

            return response()->json([
                'status' => 'success',
                'tx_ref' => $txRef,
                'payment_url' => $checkoutUrl,
                'amount' => $totalAmount,
                'product' => $product->name,
                'payment_id' => $payment->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Chapa exception: ' . $e->getMessage());
            $payment->update(['status' => 'failed']);
            return response()->json(['status' => 'error', 'message' => 'Could not reach payment gateway.'], 503);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. WEBHOOK — POST /api/payments/webhook  (PUBLIC — no auth)
    //    Chapa calls this after every payment attempt
    // ─────────────────────────────────────────────────────────────────────────
    public function webhook(Request $request)
    {
        // Verify Chapa signature
        $chapaHash = $request->header('Chapa-Signature');
        if ($chapaHash) {
            $expected = hash_hmac('sha256', $request->getContent(), env('CHAPA_SECRET_KEY'));
            if (!hash_equals($expected, $chapaHash)) {
                Log::warning('Chapa webhook: invalid signature');
                return response()->json(['message' => 'Invalid signature'], 401);
            }
        }

        $data = $request->json()->all();
        $txRef = $data['tx_ref'] ?? $data['reference'] ?? null;
        $status = strtolower($data['status'] ?? '');

        if (!$txRef) {
            return response()->json(['message' => 'Missing tx_ref'], 400);
        }

        $payment = Payment::where('tx_ref', $txRef)->first();
        if (!$payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }

        // Idempotency — skip only if already fully processed (commission paid)
        if ($payment->status === 'success' && $payment->commission_paid) {
            return response()->json(['message' => 'Already processed']);
        }

        // CRITICAL: Reject amount mismatch
        $paidAmount = (float) ($data['amount'] ?? 0);
        if ($status === 'success' && abs($paidAmount - (float) $payment->amount) > 0.01) {
            Log::error('Amount mismatch', ['expected' => $payment->amount, 'paid' => $paidAmount]);
            $payment->update(['status' => 'rejected', 'chapa_payload' => $data]);
            return response()->json(['message' => 'Amount mismatch — rejected'], 422);
        }

        DB::transaction(function () use ($payment, $status, $data) {
            // Lock the row to prevent race conditions
            $lockedPayment = Payment::where('id', $payment->id)->lockForUpdate()->first();
            if ($lockedPayment->status === 'success' && $lockedPayment->commission_paid) {
                return; // Already fully processed by another thread
            }

            if ($status === 'success') {
                // Double-verify directly with Chapa
                $verified = $this->verifyChapaTransaction($lockedPayment->tx_ref);

                $lockedPayment->update([
                    'status' => $verified ? 'success' : 'rejected',
                    'webhook_verified' => $verified,
                    'chapa_reference' => $data['reference'] ?? null,
                    'chapa_payload' => $data,
                ]);

                if ($verified) {
                    // Credit commission to distributor wallet AND income fields
                    $sponsorWallet = \App\Models\Wallet::firstOrCreate(['distributor_id' => $lockedPayment->distributor_id]);
                    $sponsorWallet->balance      += $lockedPayment->commission_amount;
                    $sponsorWallet->total_earned += $lockedPayment->commission_amount;
                    $sponsorWallet->save();

                    Distributor::where('distributor_id', $lockedPayment->distributor_id)
                        ->increment('income_monthly', $lockedPayment->commission_amount);
                    Distributor::where('distributor_id', $lockedPayment->distributor_id)
                        ->increment('income_yearly', $lockedPayment->commission_amount);

                    $lockedPayment->update(['commission_paid' => true]);

                    try {
                        $mlmEngine = app(\App\Services\MlmEngineService::class);

                        // Detect self-purchase: distributor is buying for themselves.
                        // FIX: Use a two-factor check — email match OR the customer email
                        // belongs to an existing distributor record with the same distributor_id.
                        // This handles cases where the cached email in the app differs slightly.
                        $distributor = Distributor::where('distributor_id', $lockedPayment->distributor_id)->first();
                        $customerDist = Distributor::whereRaw('LOWER(TRIM(email)) = ?', [
                            strtolower(trim($lockedPayment->customer_email))
                        ])->first();

                        $isSelfPurchase = $distributor && (
                            strtolower(trim($distributor->email)) === strtolower(trim($lockedPayment->customer_email))
                            || ($customerDist && (int)$customerDist->distributor_id === (int)$lockedPayment->distributor_id)
                        );

                        if ($isSelfPurchase) {
                            // Self-purchase (doubling/tripling/quadrupling):
                            // adds accounts to THIS distributor, not a new one.
                            // quantity loop inside processPurchase() creates the correct
                            // number of accounts → refreshOwnPoints() sums them all.
                            $mlmEngine->processPurchase(
                                $lockedPayment->distributor_id,
                                $lockedPayment->product_id,
                                null,                        // no external sponsor
                                $lockedPayment->quantity    // e.g. 4 → 4×800 = 3200 pts
                            );
                        } else {
                            // Normal customer referral purchase
                            $mlmEngine->processCustomerPurchase(
                                $lockedPayment->distributor_id,
                                $lockedPayment->product_id,
                                $lockedPayment->customer_name,
                                $lockedPayment->customer_email,
                                $lockedPayment->customer_phone,
                                $lockedPayment->quantity,
                                $lockedPayment->leg
                            );
                            $mlmEngine->runRankCheck($lockedPayment->distributor_id);
                        }
                    } catch (\Exception $e) {
                        Log::error('Mlm Engine Error: ' . $e->getMessage());
                    }
                } else {
                    $lockedPayment->update(['status' => 'failed', 'chapa_payload' => $data]);
                }
            } else {
                $lockedPayment->update(['status' => 'failed', 'chapa_payload' => $data]);
            }
        });

        return response()->json(['message' => 'Webhook processed']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. VERIFY — GET /api/payments/verify/{txRef}
    //    Mobile app polls this to check payment status.
    //    Returns the stored status immediately — no Chapa re-verification here.
    //    The webhook already verified with Chapa; polling just reads the result.
    // ─────────────────────────────────────────────────────────────────────────
    public function verify($txRef)
    {
        $payment = Payment::where('tx_ref', $txRef)->first();
        if (!$payment) {
            return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        }

        // If still pending after a reasonable time, do ONE Chapa check as fallback
        // (covers the case where the webhook never arrived)
        if ($payment->status === 'pending') {
            $ageSeconds = now()->diffInSeconds($payment->created_at);
            // Only hit Chapa if the payment is older than 15 seconds
            // (gives the webhook time to arrive first)
            if ($ageSeconds > 15) {
                $this->checkAndFinalizePayment($payment);
                $payment->refresh();
            }
        }

        return response()->json([
            'status'           => $payment->status,
            'tx_ref'           => $payment->tx_ref,
            'amount'           => $payment->amount,
            'commission'       => $payment->commission_amount,
            'webhook_verified' => $payment->webhook_verified,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. RETURN URL — GET /api/payments/return?tx_ref=...
    //    Browser redirect after Chapa checkout page.
    //    This is called by the WebView when Chapa redirects back.
    //    We do NOT re-verify with Chapa here — the webhook handles that.
    //    We just return the current stored status immediately so the WebView
    //    page loads fast and the app can detect the URL change instantly.
    // ─────────────────────────────────────────────────────────────────────────
    public function returnUrl(Request $request)
    {
        $txRef   = $request->query('tx_ref');
        $payment = Payment::where('tx_ref', $txRef)->first();

        // If the webhook already processed it, return immediately
        if ($payment && $payment->status !== 'pending') {
            return response()->json([
                'tx_ref'  => $txRef,
                'status'  => $payment->status,
                'message' => $payment->status === 'success'
                    ? 'Payment successful! You may close this page.'
                    : 'Payment ' . $payment->status . '. You may close this page.',
            ]);
        }

        // Webhook hasn't arrived yet — do one quick Chapa check
        if ($payment) {
            $this->checkAndFinalizePayment($payment);
            $payment->refresh();
        }

        $status = $payment?->status ?? 'pending';

        return response()->json([
            'tx_ref'  => $txRef,
            'status'  => $status,
            'message' => $status === 'success'
                ? 'Payment successful! You may close this page.'
                : 'Payment ' . $status . '. You may close this page.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SALES HISTORY — GET /api/payments
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        // Resolve the authenticated user — supports both owner (User) and distributor tokens
        $user = $request->user();
        if (!$user && $bearerToken = $request->bearerToken()) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($bearerToken);
            $user = $accessToken?->tokenable;
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $distributorId = $request->query('distributor_id');

        // Distributors can only see their own sales
        if ($user && method_exists($user, 'getRoleAttribute') && $user->role === 'distributor') {
            $distributorId = $user->distributor_id ?? $user->id;
        }
        // Owners and admins see all sales (no forced filter)

        $query = Payment::with(['product']);

        // Safely load distributor — use leftJoin approach to avoid missing FK errors
        $query->leftJoin('distributors', 'payments.distributor_id', '=', 'distributors.distributor_id')
              ->select('payments.*', 'distributors.name as distributor_name_join');

        // Filter by distributor_id
        if ($distributorId) {
            $query->where('payments.distributor_id', $distributorId);
        }

        // Advanced search filters
        $search = $request->query('search');
        $distributorName = $request->query('distributor_name');
        $productId = $request->query('product_id');
        $status = $request->query('status');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');

        // General search (checks multiple fields)
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw("CAST(payments.product_id AS TEXT) LIKE ?", ["%{$search}%"])
                    ->orWhereRaw("CAST(payments.distributor_id AS TEXT) LIKE ?", ["%{$search}%"])
                    ->orWhere('payments.customer_name', 'like', "%{$search}%")
                    ->orWhere('payments.tx_ref', 'like', "%{$search}%")
                    ->orWhere('distributors.name', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q3) use ($search) {
                        $q3->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Specific distributor name filter
        if ($distributorName) {
            $query->where('distributors.name', 'like', "%{$distributorName}%");
        }

        // Specific product ID filter
        if ($productId) {
            $query->where('payments.product_id', $productId);
        }

        // Status filter
        if ($status) {
            $query->where('payments.status', $status);
        }

        // Date range filters
        if ($dateFrom) {
            $query->whereDate('payments.created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('payments.created_at', '<=', $dateTo);
        }

        $perPage = $request->query('per_page', 15);
        $paginator = $query->orderByDesc('payments.created_at')->paginate($perPage);

        $paginator->getCollection()->transform(function ($p) {
            return [
                'id'               => $p->id,
                'tx_ref'           => $p->tx_ref,
                'product'          => $p->product?->name,
                'quantity'         => $p->quantity,
                'amount'           => $p->amount,
                'commission'       => $p->commission_amount,
                'customer_name'    => $p->customer_name,
                'customer_email'   => $p->customer_email,
                'distributor_name' => $p->distributor_name_join ?? $p->distributor?->name ?? 'Unknown',
                'status'           => $p->status,
                'created_at'       => $p->created_at,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private: verify transaction directly with Chapa
    // ─────────────────────────────────────────────────────────────────────────
    private function verifyChapaTransaction(string $txRef): bool
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('CHAPA_SECRET_KEY'),
            ])->get(self::CHAPA_BASE . '/transaction/verify/' . $txRef);

            $body = $response->json();
            return ($body['status'] ?? '') === 'success'
                && strtolower($body['data']['status'] ?? '') === 'success';
        } catch (\Exception $e) {
            Log::error('Chapa verify failed: ' . $e->getMessage());
            return false;
        }
    }

    private function checkAndFinalizePayment(Payment $payment)
    {
        $verified = $this->verifyChapaTransaction($payment->tx_ref);

        if ($verified) {
            DB::transaction(function () use ($payment) {
                // Lock the row to prevent race conditions
                $lockedPayment = Payment::where('id', $payment->id)->lockForUpdate()->first();
                if ($lockedPayment->status === 'success' && $lockedPayment->commission_paid) {
                    return; // Already fully processed
                }

                // Credit commission to distributor wallet AND income fields
                $sponsorWallet = \App\Models\Wallet::firstOrCreate(['distributor_id' => $lockedPayment->distributor_id]);
                $sponsorWallet->balance      += $lockedPayment->commission_amount;
                $sponsorWallet->total_earned += $lockedPayment->commission_amount;
                $sponsorWallet->save();

                Distributor::where('distributor_id', $lockedPayment->distributor_id)
                    ->increment('income_monthly', $lockedPayment->commission_amount);
                Distributor::where('distributor_id', $lockedPayment->distributor_id)
                    ->increment('income_yearly', $lockedPayment->commission_amount);

                $lockedPayment->update([
                    'status' => 'success',
                    'webhook_verified' => true,
                    'commission_paid' => true,
                ]);

                try {
                    $mlmEngine = app(\App\Services\MlmEngineService::class);

                    // Detect self-purchase: distributor is buying for themselves.
                    // FIX: Use a two-factor check — email match OR the customer email
                    // belongs to an existing distributor record with the same distributor_id.
                    $distributor = Distributor::where('distributor_id', $lockedPayment->distributor_id)->first();
                    $customerDist = Distributor::whereRaw('LOWER(TRIM(email)) = ?', [
                        strtolower(trim($lockedPayment->customer_email))
                    ])->first();

                    $isSelfPurchase = $distributor && (
                        strtolower(trim($distributor->email)) === strtolower(trim($lockedPayment->customer_email))
                        || ($customerDist && (int)$customerDist->distributor_id === (int)$lockedPayment->distributor_id)
                    );

                    if ($isSelfPurchase) {
                        // Self-purchase (doubling/tripling/quadrupling):
                        // quantity loop inside processPurchase() creates the correct
                        // number of accounts → refreshOwnPoints() sums them all.
                        $mlmEngine->processPurchase(
                            $lockedPayment->distributor_id,
                            $lockedPayment->product_id,
                            null,                        // no external sponsor
                            $lockedPayment->quantity    // e.g. 4 → 4×800 = 3200 pts
                        );
                    } else {
                        // Normal customer referral purchase
                        $mlmEngine->processCustomerPurchase(
                            $lockedPayment->distributor_id,
                            $lockedPayment->product_id,
                            $lockedPayment->customer_name,
                            $lockedPayment->customer_email,
                            $lockedPayment->customer_phone,
                            $lockedPayment->quantity,
                            $lockedPayment->leg
                        );
                        $mlmEngine->runRankCheck($lockedPayment->distributor_id);
                    }
                } catch (\Exception $e) {
                    Log::error('Mlm Engine Error in checkAndFinalizePayment: ' . $e->getMessage());
                }
            });
        }
    }
}
