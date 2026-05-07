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

        // Total points = live BFS walk of the entire subtree (own_points of every node).
        // This is a permanent, ever-growing number — never deducted, never modified.
        $rootNode    = Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        $totalPoints = $rootNode ? $mlm->getSubtreeVolume($rootNode->id) : $ownPoints;

        // Cycle pool = same as total_points (the live tree total IS the cycle pool).
        // The cycle engine reads this directly — no carry, no deduction.
        $cyclePool = $totalPoints;

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
                // Personal purchase volume (e.g. 4 × golden 800pts = 3,200)
                'own_points'   => $ownPoints,
                // Full tree total (own + every downline node's own_points, live walk).
                // This number only ever grows — it is never deducted.
                'total_points' => $totalPoints,
                // Cycle pool = same as total_points (the live tree IS the pool).
                'cycle_pool'   => $cyclePool,
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

    /**
     * POST /api/wallet/run-cycle
     * Manually trigger cycle engine for the authenticated distributor.
     * This is the ONLY way the cycle engine runs — never automatic.
     */
    public function runCycle(Request $request, MlmEngineService $mlm)
    {
        $user          = $request->user();
        $distributorId = $user->distributor_id ?? $user->id;

        $result = $mlm->runCycleEngine($distributorId);
        $mlm->runRankCheck($distributorId);

        $wallet = Wallet::where('distributor_id', $distributorId)->first();
        $stat   = Stat::where('distributor_id', $distributorId)->first();

        $message = $result['cycles'] > 0
            ? "Cycle engine ran! Earned $" . number_format($result['earnings'], 2) . " from " . $result['cycles'] . " cycle" . ($result['cycles'] > 1 ? 's' : '') . "."
            : "No cycles completed. Need at least 600 combined points across all legs.";

        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'result'  => $result,
            'wallet'  => $wallet,
            'stats'   => $stat,
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
        $ranks   = ['CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8];
        $highest = 0;
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
