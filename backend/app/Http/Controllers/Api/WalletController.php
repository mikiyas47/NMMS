<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Wallet;
use App\Models\Stat;
use App\Models\Account;
use App\Models\Node;
use App\Models\Payment;
use App\Services\MlmEngineService;

class WalletController extends Controller
{
    /**
     * GET /api/wallet
     * Returns wallet balance, stats (total_points from live tree walk), rank, and team info.
     * Total points = sum of own_points for every unique distributor in the subtree,
     * including the root distributor themselves.
     */
    public function show(Request $request)
    {
        $user          = $request->user();
        $distributorId = $user->distributor_id ?? $user->id;

        $wallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
        $stat   = Stat::firstOrCreate(['distributor_id'   => $distributorId]);
        $mlm    = new MlmEngineService();

        // Own package points (sum of all packages this distributor purchased)
        $ownPoints = Account::where('distributor_id', $distributorId)
            ->with('product')
            ->get()
            ->sum(fn($a) => $a->product->point ?? 0);

        // Sync own_points to stat if drifted
        if ((int)$stat->own_points !== (int)$ownPoints) {
            $stat->own_points = $ownPoints;
            $stat->save();
        }

        // Total points = live BFS walk of the entire subtree.
        // Counts each unique distributor's own_points exactly once,
        // including the root distributor (the account owner themselves).
        $rootNode    = Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        $totalPoints = $rootNode ? $mlm->getSubtreeVolume($rootNode->id) : $ownPoints;

        // Team / leg data
        $directCount = 0;
        $totalTeam   = 0;
        $legs        = [];

        if ($rootNode) {
            $directCount = $rootNode->children()->count();
            $totalTeam   = $this->countSubtree($rootNode->id) - 1; // exclude self

            foreach ($rootNode->children as $child) {
                $legs[] = [
                    'leg'    => $child->leg,
                    'points' => $mlm->getSubtreeVolume($child->id),
                    'rank'   => $this->getHighestRankInSubtree($child->id),
                ];
            }
        }

        // Recent commissions (last 10)
        $recentPayments = Payment::where('distributor_id', $distributorId)
            ->where('status', 'success')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'amount', 'commission_amount', 'customer_name', 'created_at'])
            ->map(fn($p) => [
                'id'         => $p->id,
                'amount'     => $p->amount,
                'commission' => $p->commission_amount,
                'customer'   => $p->customer_name,
                'date'       => $p->created_at,
            ]);

        return response()->json([
            'status' => 'success',
            'wallet' => [
                'balance'         => $wallet->balance,
                'weekly_earnings' => $wallet->weekly_earnings,
                'total_earned'    => $wallet->total_earned,
            ],
            'stats' => [
                'own_points'   => $ownPoints,
                'total_points' => $totalPoints,
                'rank'         => $stat->rank ?? 'CT',
            ],
            'team' => [
                'direct_count' => $directCount,
                'total_team'   => $totalTeam,
                'legs'         => $legs,
            ],
            'recent_commissions' => $recentPayments,
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function countSubtree(int $nodeId): int
    {
        $node = Node::with('children')->find($nodeId);
        if (!$node) return 0;
        $count = 1;
        foreach ($node->children as $child) {
            $count += $this->countSubtree($child->id);
        }
        return $count;
    }

    private function getHighestRankInSubtree(int $nodeId): ?string
    {
        $ranks       = ['CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8];
        $highest     = 0;
        $highestRank = 'CT';
        $queue = [$nodeId];
        while (!empty($queue)) {
            $currId   = array_shift($queue);
            $currNode = Node::with('children')->find($currId);
            if (!$currNode) continue;
            $stat = Stat::where('distributor_id', $currNode->distributor_id)->first();
            if ($stat && $stat->rank && isset($ranks[$stat->rank]) && $ranks[$stat->rank] > $highest) {
                $highest     = $ranks[$stat->rank];
                $highestRank = $stat->rank;
            }
            foreach ($currNode->children as $child) $queue[] = $child->id;
        }
        return $highestRank;
    }
}
