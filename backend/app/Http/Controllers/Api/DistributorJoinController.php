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
        $distributorId = $user->distributor_id ?? $user->id;

        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'sponsor_id' => 'nullable|exists:distributors,distributor_id',
            'quantity'   => 'nullable|integer|min:1|max:4',
        ]);

        $quantity  = $data['quantity'] ?? 1;
        $sponsorId = $data['sponsor_id'] ?? null;

        // Check how many accounts the distributor already has
        $existingCount = Account::where('distributor_id', $distributorId)->count();
        $maxAccounts   = 4; // Max quadruple account

        if ($existingCount + $quantity > $maxAccounts) {
            return response()->json([
                'status'  => 'error',
                'message' => "You can only have up to {$maxAccounts} accounts. You already have {$existingCount}."
            ], 422);
        }

        $accounts = [];
        try {
            for ($i = 0; $i < $quantity; $i++) {
                $account = $mlm->processPurchase($distributorId, $data['product_id'], $sponsorId);
                $accounts[] = $account;
            }
            $mlm->runCycleEngine($distributorId);
            $mlm->runRankCheck($distributorId);

            return response()->json([
                'status'   => 'success',
                'message'  => "Successfully joined with {$quantity} account(s).",
                'accounts' => $accounts,
            ]);
        } catch (\Exception $e) {
            Log::error('Distributor join error: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to process your join request: ' . $e->getMessage(),
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
