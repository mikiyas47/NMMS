<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Account;
use App\Services\MlmEngineService;
use Illuminate\Support\Facades\Log;

class DistributorJoinController extends Controller
{
    /**
     * POST /api/distributor/join
     *
     * Called when a distributor purchases their own product package to join the MLM
     * network (or to double/triple/quadruple their account).
     *
     * FIX: Pass the full quantity to processPurchase() in a single call instead of
     * looping. processPurchase() handles the quantity loop internally inside one
     * DB transaction, which prevents partial failures and deadlocks.
     */
    public function join(Request $request, MlmEngineService $mlm)
    {
        $user = $request->user();

        if (!$user) {
            Log::error('DistributorJoin: No authenticated user found');
            return response()->json([
                'status'  => 'error',
                'message' => 'Authentication required. Please log in again.',
            ], 401);
        }

        $distributorId = $user->distributor_id ?? $user->id;

        Log::info('DistributorJoin: Starting join request', [
            'distributor_id' => $distributorId,
            'email'          => $user->email ?? 'N/A',
            'request_data'   => $request->only(['product_id', 'sponsor_id', 'quantity']),
        ]);

        $data = $request->validate([
            'product_id'    => 'required|exists:products,id',
            'sponsor_id'    => 'nullable|exists:distributors,distributor_id',
            'quantity'      => 'nullable|integer|min:1|max:4',
            'preferred_leg' => 'nullable|integer|between:1,4',
        ]);

        $quantity     = (int) ($data['quantity'] ?? 1);
        $sponsorId    = $data['sponsor_id'] ?? null;
        $preferredLeg = $data['preferred_leg'] ?? null;

        // Fall back to the distributor's upline_id if no sponsor was provided.
        if (!$sponsorId && $user->upline_id) {
            $sponsorId = $user->upline_id;
        }

        // Validate account count before touching the DB
        $existingCount = Account::where('distributor_id', $distributorId)->count();
        $maxAccounts   = 4;

        Log::info('DistributorJoin: Pre-check', [
            'existing_accounts' => $existingCount,
            'requested_qty'     => $quantity,
            'sponsor_id'        => $sponsorId,
        ]);

        if ($existingCount + $quantity > $maxAccounts) {
            return response()->json([
                'status'  => 'error',
                'message' => "You can only have up to {$maxAccounts} accounts. You already have {$existingCount}.",
            ], 422);
        }

        try {
            // Pass the full quantity in one call — processPurchase handles the loop
            // internally inside a single DB transaction.
            $account = $mlm->processPurchase($distributorId, $data['product_id'], $sponsorId, $quantity, $preferredLeg);
            $mlm->runRankCheck($distributorId);

            // Fetch updated account list for the response
            $accounts = Account::where('distributor_id', $distributorId)
                ->with('product')
                ->get()
                ->map(fn($a) => [
                    'id'         => $a->id,
                    'product'    => $a->product?->name,
                    'node_id'    => $a->node_id,
                    'sponsor_id' => $a->sponsor_id,
                    'created_at' => $a->created_at,
                ]);

            // Reload the distributor to get fresh is_paid value
            $user->refresh();

            Log::info('DistributorJoin: Join complete', [
                'distributor_id'   => $distributorId,
                'quantity'         => $quantity,
                'total_accounts'   => $accounts->count(),
                'is_paid'          => $user->is_paid,
            ]);

            return response()->json([
                'status'   => 'success',
                'message'  => "Successfully joined with {$quantity} account" . ($quantity > 1 ? 's' : '') . '.',
                'accounts' => $accounts,
                'is_paid'  => (bool) $user->is_paid,
                'account_count' => $accounts->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('DistributorJoin: Failed', [
                'distributor_id' => $distributorId,
                'error'          => $e->getMessage(),
                'file'           => $e->getFile() . ':' . $e->getLine(),
                'trace'          => substr($e->getTraceAsString(), 0, 2000),
            ]);
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/distributor/status
     */
    public function status(Request $request)
    {
        $user          = $request->user();
        $distributorId = $user->distributor_id ?? $user->id;

        $accounts = Account::where('distributor_id', $distributorId)->with('product')->get();

        return response()->json([
            'status'        => 'success',
            'has_joined'    => $accounts->count() > 0,
            'account_count' => $accounts->count(),
            'max_accounts'  => 4,
            'upline_id'     => $user->upline_id ?? null,
            'is_paid'       => (bool) ($user->is_paid ?? false),
            'accounts'      => $accounts->map(fn($a) => [
                'id'         => $a->id,
                'product'    => $a->product?->name,
                'node_id'    => $a->node_id,
                'sponsor_id' => $a->sponsor_id,
                'created_at' => $a->created_at,
            ]),
        ]);
    }
}
