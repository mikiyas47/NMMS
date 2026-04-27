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
    const COMMISSION_RATE = 0.10;
    const CHAPA_BASE      = 'https://api.chapa.co/v1';

    // ─────────────────────────────────────────────────────────────────────────
    // 1. INITIATE — POST /api/payments/initiate
    // ─────────────────────────────────────────────────────────────────────────
    public function initiate(Request $request)
    {
        $data = $request->validate([
            'product_id'     => 'required|exists:products,id',
            'distributor_id' => 'required|exists:distributors,distributor_id',
            'quantity'       => 'required|integer|min:1',
            'customer_name'  => 'required|string|max:120',
            'customer_email' => 'required|email|max:120',
            'customer_phone' => 'nullable|string|max:20',
            'prospect_id'    => 'nullable|exists:prospects,prospect_id',
        ]);

        // Lock price from backend — distributor cannot override
        $product = Product::findOrFail($data['product_id']);

        if ($product->stock < $data['quantity']) {
            return response()->json([
                'status'  => 'error',
                'message' => "Insufficient stock. Only {$product->stock} unit(s) available.",
            ], 422);
        }

        $unitPrice        = (float) $product->price;
        $totalAmount      = round($unitPrice * $data['quantity'], 2);
        $commissionAmount = round($totalAmount * self::COMMISSION_RATE, 2);

        // Unique reference — ties product + distributor + customer together
        $txRef = 'NMMS-' . strtoupper(Str::random(10)) . '-' . time();

        $payment = Payment::create([
            'product_id'        => $product->id,
            'distributor_id'    => $data['distributor_id'],
            'prospect_id'       => $data['prospect_id'] ?? null,
            'customer_name'     => $data['customer_name'],
            'customer_email'    => $data['customer_email'],
            'customer_phone'    => $data['customer_phone'] ?? null,
            'tx_ref'            => $txRef,
            'amount'            => $totalAmount,
            'currency'          => 'ETB',
            'quantity'          => $data['quantity'],
            'commission_amount' => $commissionAmount,
            'status'            => 'pending',
        ]);

        // Call Chapa to create checkout link
        $chapaSecret = env('CHAPA_SECRET_KEY');
        $nameParts   = explode(' ', trim($data['customer_name']));

        $chapaPayload = [
            'amount'        => $totalAmount,
            'currency'      => 'ETB',
            'email'         => $data['customer_email'],
            'first_name'    => $nameParts[0],
            'last_name'     => count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '-',
            'phone_number'  => $data['customer_phone'] ?? '',
            'tx_ref'        => $txRef,
            'callback_url'  => env('APP_URL') . '/api/payments/webhook',
            'return_url'    => env('APP_URL') . '/api/payments/return?tx_ref=' . $txRef,
            'customization' => [
                'title'       => 'NMMS Purchase',
                'description' => $data['quantity'] . 'x ' . Str::limit($product->name, 20),
            ],
        ];

        try {
            $chapaResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $chapaSecret,
                'Content-Type'  => 'application/json',
            ])->post(self::CHAPA_BASE . '/transaction/initialize', $chapaPayload);

            $body = $chapaResponse->json();

            if ($chapaResponse->failed() || ($body['status'] ?? '') !== 'success') {
                Log::error('Chapa init failed', ['body' => $body]);
                $payment->update(['status' => 'failed']);
                return response()->json([
                    'status'  => 'error',
                    'message' => $body['message'] ?? 'Payment gateway error. Please try again.',
                ], 502);
            }

            $checkoutUrl = $body['data']['checkout_url'] ?? null;
            $payment->update(['payment_url' => $checkoutUrl]);

            return response()->json([
                'status'      => 'success',
                'tx_ref'      => $txRef,
                'payment_url' => $checkoutUrl,
                'amount'      => $totalAmount,
                'product'     => $product->name,
                'payment_id'  => $payment->id,
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

        $data   = $request->json()->all();
        $txRef  = $data['tx_ref'] ?? $data['reference'] ?? null;
        $status = strtolower($data['status'] ?? '');

        if (!$txRef) {
            return response()->json(['message' => 'Missing tx_ref'], 400);
        }

        $payment = Payment::where('tx_ref', $txRef)->first();
        if (!$payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }

        // Idempotency — skip if already processed
        if ($payment->status === 'success') {
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
            if ($status === 'success') {
                // Double-verify directly with Chapa
                $verified = $this->verifyChapaTransaction($payment->tx_ref);

                $payment->update([
                    'status'           => $verified ? 'success' : 'rejected',
                    'webhook_verified'  => $verified,
                    'chapa_reference'  => $data['reference'] ?? null,
                    'chapa_payload'    => $data,
                ]);

                if ($verified) {
                    // Deduct stock
                    Product::where('id', $payment->product_id)->decrement('stock', $payment->quantity);

                    // Credit commission to distributor
                    Distributor::where('distributor_id', $payment->distributor_id)
                        ->increment('income_monthly', $payment->commission_amount);
                    Distributor::where('distributor_id', $payment->distributor_id)
                        ->increment('income_yearly', $payment->commission_amount);

                    $payment->update(['commission_paid' => true]);
                }
            } else {
                $payment->update(['status' => 'failed', 'chapa_payload' => $data]);
            }
        });

        return response()->json(['message' => 'Webhook processed']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. VERIFY — GET /api/payments/verify/{txRef}
    //    Mobile app polls this to check payment status
    // ─────────────────────────────────────────────────────────────────────────
    public function verify($txRef)
    {
        $payment = Payment::where('tx_ref', $txRef)->first();
        if (!$payment) {
            return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        }

        if ($payment->status === 'pending') {
            $this->checkAndFinalizePayment($payment);
            $payment->refresh();
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
    //    Browser redirect after Chapa checkout page
    // ─────────────────────────────────────────────────────────────────────────
    public function returnUrl(Request $request)
    {
        $txRef   = $request->query('tx_ref');
        $payment = Payment::where('tx_ref', $txRef)->first();
        
        if ($payment && $payment->status === 'pending') {
            $this->checkAndFinalizePayment($payment);
            $payment->refresh();
        }

        $status  = $payment?->status ?? 'pending';

        return response()->json([
            'tx_ref'  => $txRef,
            'status'  => $status,
            'message' => $status === 'success'
                ? 'Payment successful! You may close this page.'
                : 'Payment ' . $status . '. You may close this page.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SALES HISTORY — GET /api/payments  (auth:sanctum)
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $user = $request->user();
        $distributorId = $request->query('distributor_id');

        // If the user is a distributor, force the query to only their own sales
        if ($user && $user->role === 'distributor') {
            // Use the distributor_id from their user model
            $distributorId = $user->distributor_id ?? $user->id; // depending on your user model setup, maybe $user->distributor->distributor_id
        }

        $query = Payment::with(['product', 'distributor']);
        if ($distributorId) {
            $query->where('distributor_id', $distributorId);
        }

        $payments = $query->orderByDesc('created_at')->get()->map(fn($p) => [
            'id'            => $p->id,
            'tx_ref'        => $p->tx_ref,
            'product'       => $p->product?->name,
            'quantity'      => $p->quantity,
            'amount'        => $p->amount,
            'commission'    => $p->commission_amount,
            'customer_name' => $p->customer_name,
            'customer_email'=> $p->customer_email,
            'distributor_name' => $p->distributor?->name ?? 'Unknown',
            'status'        => $p->status,
            'created_at'    => $p->created_at,
        ]);

        return response()->json(['status' => 'success', 'data' => $payments]);
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
                // Deduct stock
                Product::where('id', $payment->product_id)->decrement('stock', $payment->quantity);

                // Credit commission to distributor
                Distributor::where('distributor_id', $payment->distributor_id)
                    ->increment('income_monthly', $payment->commission_amount);
                Distributor::where('distributor_id', $payment->distributor_id)
                    ->increment('income_yearly', $payment->commission_amount);

                $payment->update([
                    'status'           => 'success',
                    'webhook_verified' => true,
                    'commission_paid'  => true,
                ]);
            });
        }
    }
}
