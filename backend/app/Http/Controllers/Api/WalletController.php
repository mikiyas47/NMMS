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
     * Returns wallet balance, stats, rank, and account info for the authenticated distributor.
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $distributorId = $user->distributor_id ?? $user->id;

        $wallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
        $stat   = Stat::firstOrCreate(['distributor_id' => $distributorId]);

        // Count direct referrals (accounts under their node)
        $rootNode = Node::where('distributor_id', $distributorId)->first();
        $directCount = 0;
        $totalTeam   = 0;
        $legs        = [];

        if ($rootNode) {
            $directCount = $rootNode->children()->count();
            // Count entire subtree
            $totalTeam = $this->countSubtree($rootNode->id) - 1; // exclude self

            // Leg point totals
            foreach ($rootNode->children as $child) {
                $legs[] = [
                    'leg'    => $child->leg,
                    'points' => $this->getSubtreePoints($child->id),
                    'rank'   => $this->getHighestRankInSubtree($child->id),
                ];
            }
        }

        // Commission history (last 10)
        $recentPayments = Payment::where('distributor_id', $distributorId)
            ->where('status', 'success')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'amount', 'commission_amount', 'customer_name', 'created_at', 'product_id'])
            ->map(function ($p) {
                return [
                    'id'          => $p->id,
                    'amount'      => $p->amount,
                    'commission'  => $p->commission_amount,
                    'customer'    => $p->customer_name,
                    'date'        => $p->created_at,
                ];
            });

        return response()->json([
            'status' => 'success',
            'wallet' => [
                'balance'         => $wallet->balance,
                'weekly_earnings' => $wallet->weekly_earnings,
                'total_earned'    => $wallet->total_earned,
            ],
            'stats' => [
                'left_points'   => $stat->left_points,
                'right_points'  => $stat->right_points,
                'carry_left'    => $stat->carry_left,
                'carry_right'   => $stat->carry_right,
                'rank'          => $stat->rank ?? 'None',
                'total_points'  => $stat->left_points + $stat->right_points + $stat->carry_left + $stat->carry_right,
            ],
            'team' => [
                'direct_count' => $directCount,
                'total_team'   => $totalTeam,
                'legs'         => $legs,
            ],
            'recent_commissions' => $recentPayments,
        ]);
    }

    /**
     * POST /api/wallet/run-cycle
     * Manually trigger cycle engine for the authenticated distributor (for testing).
     */
    public function runCycle(Request $request, MlmEngineService $mlm)
    {
        $user = $request->user();
        $distributorId = $user->distributor_id ?? $user->id;

        $result = $mlm->runCycleEngine($distributorId);
        $mlm->runRankCheck($distributorId);

        $wallet = Wallet::where('distributor_id', $distributorId)->first();
        $stat   = Stat::where('distributor_id', $distributorId)->first();

        $message = $result['cycles'] > 0 
            ? "Cycle engine ran successfully! Earned $" . $result['earnings'] . " from " . $result['cycles'] . " cycles."
            : "No cycles completed. You need at least 600 matching points on both legs.";

        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'result'  => $result,
            'wallet'  => $wallet,
            'stats'   => $stat,
        ]);
    }

    private function countSubtree($nodeId): int
    {
        $node = Node::with('children')->find($nodeId);
        if (!$node) return 0;
        $count = 1;
        foreach ($node->children as $child) {
            $count += $this->countSubtree($child->id);
        }
        return $count;
    }

    private function getSubtreePoints($nodeId): int
    {
        $node = Node::with(['children'])->find($nodeId);
        if (!$node) return 0;
        $stat = Stat::where('distributor_id', $node->distributor_id)->first();
        $pts = $stat ? ($stat->left_points + $stat->right_points + $stat->carry_left + $stat->carry_right) : 0;
        foreach ($node->children as $child) {
            $pts += $this->getSubtreePoints($child->id);
        }
        return $pts;
    }

    private function getHighestRankInSubtree($nodeId): ?string
    {
        $ranks = ['MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5];
        $highest = 0;
        $highestRank = null;

        $queue = [$nodeId];
        while (!empty($queue)) {
            $currId = array_shift($queue);
            $currNode = Node::with('children')->find($currId);
            if (!$currNode) continue;

            $stat = Stat::where('distributor_id', $currNode->distributor_id)->first();
            if ($stat && $stat->rank && isset($ranks[$stat->rank]) && $ranks[$stat->rank] > $highest) {
                $highest = $ranks[$stat->rank];
                $highestRank = $stat->rank;
            }
            foreach ($currNode->children as $child) {
                $queue[] = $child->id;
            }
        }
        return $highestRank;
    }
}
