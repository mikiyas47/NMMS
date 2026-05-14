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
     * Called when a distributor purchases their own product package to join the MLM network.
     * Creates their node in the placement tree and propagates points.
     *
     * Request body:
     *   product_id   (required) - the product they purchased
     *   sponsor_id   (optional) - the distributor_id of who referred them
     *   quantity     (optional, default 1) - number of packages (doubles/triples/quadruples legs)
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
            'user_class'     => get_class($user),
            'request_data'   => $request->only(['product_id', 'sponsor_id', 'quantity']),
        ]);

        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'sponsor_id' => 'nullable|exists:distributors,distributor_id',
            'quantity'   => 'nullable|integer|min:1|max:4',
        ]);

        $quantity  = $data['quantity'] ?? 1;
        $sponsorId = $data['sponsor_id'] ?? null;

        // If no sponsor_id was provided, fall back to the distributor's upline_id.
        // This ensures customers who upgraded to distributor are placed under the
        // person who originally sold to them.
        if (!$sponsorId && $user->upline_id) {
            $sponsorId = $user->upline_id;
        }

        // Check how many accounts the distributor already has
        $existingCount = Account::where('distributor_id', $distributorId)->count();
        $maxAccounts   = 4; // Max quadruple account

        Log::info('DistributorJoin: Pre-check', [
            'existing_accounts' => $existingCount,
            'requested_qty'     => $quantity,
            'sponsor_id'        => $sponsorId,
        ]);

        if ($existingCount + $quantity > $maxAccounts) {
            return response()->json([
                'status'  => 'error',
                'message' => "You can only have up to {$maxAccounts} accounts. You already have {$existingCount}."
            ], 422);
        }

        $accounts = [];
        try {
            for ($i = 0; $i < $quantity; $i++) {
                Log::info("DistributorJoin: Processing account " . ($i + 1) . " of {$quantity}");
                $account = $mlm->processPurchase($distributorId, $data['product_id'], $sponsorId);
                $accounts[] = $account;
            }
            $mlm->runRankCheck($distributorId);

            Log::info('DistributorJoin: Join complete', [
                'distributor_id'  => $distributorId,
                'accounts_created' => count($accounts),
            ]);

            return response()->json([
                'status'   => 'success',
                'message'  => "Successfully joined with {$quantity} account(s).",
                'accounts' => $accounts,
            ]);
        } catch (\Exception $e) {
            Log::error('DistributorJoin: Failed', [
                'distributor_id' => $distributorId,
                'error'          => $e->getMessage(),
                'file'           => $e->getFile() . ':' . $e->getLine(),
                'trace'          => substr($e->getTraceAsString(), 0, 2000),
            ]);
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to join the network: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/distributor/status
     * Returns whether the distributor has joined the MLM network and how many accounts they have.
     */
    public function status(Request $request)
    {
        $user = $request->user();
        $distributorId = $user->distributor_id ?? $user->id;

        $accounts = Account::where('distributor_id', $distributorId)->with('product')->get();

        return response()->json([
            'status'         => 'success',
            'has_joined'     => $accounts->count() > 0,
            'account_count'  => $accounts->count(),
            'max_accounts'   => 4,
            'upline_id'      => $user->upline_id ?? null,
            'is_paid'        => (bool) ($user->is_paid ?? false),
            'accounts'       => $accounts->map(fn($a) => [
                'id'         => $a->id,
                'product'    => $a->product?->name,
                'node_id'    => $a->node_id,
                'sponsor_id' => $a->sponsor_id,
                'created_at' => $a->created_at,
            ]),
        ]);
    }
}
