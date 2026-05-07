<?php

namespace App\Services;

use App\Models\Node;
use App\Models\Account;
use App\Models\Distributor;
use App\Models\Wallet;
use App\Models\Stat;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class MlmEngineService
{
    // ─── Rank order ──────────────────────────────────────────────────────────
    private const RANK_SCORE = [
        'CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3,
        'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8,
    ];

    // ─── BFS placement ───────────────────────────────────────────────────────
    public function findPlacementNode($startNodeId)
    {
        $queue = [$startNodeId];
        while (!empty($queue)) {
            $currentId = array_shift($queue);
            $node = Node::with('children')->find($currentId);
            if (!$node) continue;
            if ($node->children->count() < 4) return $node;
            foreach ($node->children as $child) $queue[] = $child->id;
        }
        return null;
    }

    // ─── Recalculate own_points for a distributor ─────────────────────────────
    // own_points = sum of product.point for every account this distributor owns
    private function refreshOwnPoints(int $distributorId): int
    {
        $pts = Account::where('distributor_id', $distributorId)
            ->with('product')
            ->get()
            ->sum(fn($a) => $a->product->point ?? 0);

        $stat = Stat::firstOrCreate(['distributor_id' => $distributorId]);
        $stat->own_points = $pts;
        $stat->save();
        return $pts;
    }

    // ─── Self-purchase (joining / doubling / tripling / quadrupling) ──────────
    public function processPurchase($distributorId, $productId, $sponsorId = null, $quantity = 1)
    {
        DB::beginTransaction();
        try {
            $distributor = Distributor::findOrFail($distributorId);
            $product     = Product::findOrFail($productId);

            Wallet::firstOrCreate(['distributor_id' => $distributorId]);
            Stat::firstOrCreate(['distributor_id'   => $distributorId]);

            $firstAccount = Account::where('distributor_id', $distributorId)->first();
            $nodes = [];

            for ($i = 0; $i < $quantity; $i++) {
                if ($firstAccount && $firstAccount->node_id) {
                    $placementNode = $this->findPlacementNode($firstAccount->node_id);
                    $leg = $placementNode->children()->count() + 1;
                    $newNode = Node::create([
                        'parent_id'      => $placementNode->id,
                        'distributor_id' => $distributorId,
                        'leg'            => $leg,
                    ]);
                } else {
                    if ($sponsorId) {
                        $sponsorNode = Node::where('distributor_id', $sponsorId)->first();
                        if (!$sponsorNode) {
                            $companyRoot = Node::whereNull('parent_id')->first();
                            $sponsorNode = $companyRoot
                                ? Node::create(['parent_id' => $this->findPlacementNode($companyRoot->id)->id, 'distributor_id' => $sponsorId, 'leg' => $this->findPlacementNode($companyRoot->id)->children()->count() + 1])
                                : Node::create(['parent_id' => null, 'distributor_id' => $sponsorId, 'leg' => 1]);
                        }
                        $placementNode = $this->findPlacementNode($sponsorNode->id);
                        $leg = $placementNode->children()->count() + 1;
                        $newNode = Node::create(['parent_id' => $placementNode->id, 'distributor_id' => $distributorId, 'leg' => $leg]);
                    } else {
                        $root = Node::whereNull('parent_id')->first();
                        if ($root) {
                            $placementNode = $this->findPlacementNode($root->id);
                            $leg = $placementNode->children()->count() + 1;
                            $newNode = Node::create(['parent_id' => $placementNode->id, 'distributor_id' => $distributorId, 'leg' => $leg]);
                        } else {
                            $newNode = Node::create(['parent_id' => null, 'distributor_id' => $distributorId, 'leg' => 1]);
                        }
                    }
                }

                $account = Account::create([
                    'distributor_id' => $distributorId,
                    'node_id'        => $newNode->id,
                    'product_id'     => $productId,
                    'sponsor_id'     => $sponsorId,
                ]);

                if (!$firstAccount) $firstAccount = $account;
                $nodes[] = $newNode;
            }

            // Referral commission to sponsor
            if ($sponsorId) {
                $sponsorAccounts = Account::where('distributor_id', $sponsorId)->with('product')->get();
                if ($sponsorAccounts->isNotEmpty()) {
                    $rate = 10;
                    foreach ($sponsorAccounts as $acc) {
                        if ($acc->product && $acc->product->referral_rate > $rate) $rate = $acc->product->referral_rate;
                    }
                    $commission = ($rate / 100) * ($product->point ?? 0) * $quantity;
                    if ($commission > 0) {
                        $sponsorWallet = Wallet::firstOrCreate(['distributor_id' => $sponsorId]);
                        $sponsorWallet->balance      += $commission;
                        $sponsorWallet->total_earned += $commission;
                        $sponsorWallet->save();
                        Distributor::where('distributor_id', $sponsorId)->increment('income_monthly', $commission);
                        Distributor::where('distributor_id', $sponsorId)->increment('income_yearly', $commission);
                        \App\Models\Payment::create([
                            'product_id'        => $productId,
                            'distributor_id'    => $sponsorId,
                            'customer_name'     => $distributor->name ?? 'Distributor',
                            'customer_email'    => $distributor->email ?? 'N/A',
                            'tx_ref'            => 'JOIN-' . strtoupper(\Illuminate\Support\Str::random(10)),
                            'amount'            => ($product->price ?? 0) * $quantity,
                            'currency'          => 'ETB',
                            'quantity'          => $quantity,
                            'commission_amount' => $commission,
                            'status'            => 'success',
                            'webhook_verified'  => true,
                            'commission_paid'   => true,
                        ]);
                    }
                }
            }

            // Update own_points for this distributor
            $this->refreshOwnPoints($distributorId);

            // Run rank check for this distributor (uses live subtree volume — no propagation needed)
            $this->runRankCheck($distributorId);

            // Also run rank check for all ancestors since their subtree volume changed
            $this->runRankCheckForAncestors($nodes[0] ?? null, $distributorId);

            DB::commit();
            return $account ?? null;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ─── Customer purchase via referral link ──────────────────────────────────
    public function processCustomerPurchase($distributorId, $productId, $customerName, $customerEmail, $customerPhone, $quantity = 1, $preferredLeg = null)
    {
        DB::beginTransaction();
        try {
            $product = Product::findOrFail($productId);

            $newDist = Distributor::firstOrCreate(
                ['email' => $customerEmail],
                ['name' => $customerName, 'phone' => $customerPhone, 'password' => bcrypt('password123'), 'join_date' => now()]
            );

            Wallet::firstOrCreate(['distributor_id' => $newDist->distributor_id]);
            Stat::firstOrCreate(['distributor_id'   => $newDist->distributor_id]);

            $sponsorMainNode = Node::where('distributor_id', $distributorId)->orderBy('id', 'asc')->first();

            if (!$sponsorMainNode) {
                $companyRoot = Node::whereNull('parent_id')->first();
                if ($companyRoot) {
                    $rootPlacement = $this->findPlacementNode($companyRoot->id);
                    $sponsorMainNode = Node::create(['parent_id' => $rootPlacement->id, 'distributor_id' => $distributorId, 'leg' => $rootPlacement->children()->count() + 1]);
                } else {
                    $sponsorMainNode = Node::create(['parent_id' => null, 'distributor_id' => $distributorId, 'leg' => 1]);
                }
                Account::firstOrCreate(['distributor_id' => $distributorId, 'node_id' => $sponsorMainNode->id], ['product_id' => $productId, 'sponsor_id' => null]);
            }

            $placementNode = null;
            $leg = null;

            if ($preferredLeg) {
                $existingLegChild = Node::where('parent_id', $sponsorMainNode->id)->where('leg', $preferredLeg)->first();
                if ($existingLegChild) {
                    $placementNode = $this->findPlacementNode($existingLegChild->id);
                    $leg = $placementNode->children()->count() + 1;
                } else {
                    $placementNode = $sponsorMainNode;
                    $leg = $preferredLeg;
                }
            } else {
                $secondaryNodes = Node::where('parent_id', $sponsorMainNode->id)->where('distributor_id', $distributorId)->orderBy('id')->get();
                if ($secondaryNodes->isNotEmpty()) {
                    foreach ($secondaryNodes as $secNode) {
                        $candidate = $this->findPlacementNode($secNode->id);
                        if ($candidate && $candidate->children()->count() < 4) { $placementNode = $candidate; break; }
                    }
                }
                if (!$placementNode) $placementNode = $this->findPlacementNode($sponsorMainNode->id);
                $leg = $placementNode->children()->count() + 1;
            }

            if ($leg > 4) $leg = 4;

            $newNode = Node::create(['parent_id' => $placementNode->id, 'distributor_id' => $newDist->distributor_id, 'leg' => $leg]);
            $account = Account::create(['distributor_id' => $newDist->distributor_id, 'node_id' => $newNode->id, 'product_id' => $productId, 'sponsor_id' => $distributorId]);

            // Referral commission to sponsor
            $sponsorAccounts = Account::where('distributor_id', $distributorId)->with('product')->get();
            if ($sponsorAccounts->isNotEmpty()) {
                $rate = 10;
                foreach ($sponsorAccounts as $acc) {
                    if ($acc->product && $acc->product->referral_rate > $rate) $rate = $acc->product->referral_rate;
                }
                $commission = ($rate / 100) * ($product->point ?? 0) * $quantity;
                if ($commission > 0) {
                    $sponsorWallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
                    $sponsorWallet->balance      += $commission;
                    $sponsorWallet->total_earned += $commission;
                    $sponsorWallet->save();
                }
            }

            // Update new customer's own_points
            $this->refreshOwnPoints($newDist->distributor_id);

            // Run rank check for the new customer
            $this->runRankCheck($newDist->distributor_id);

            // Run rank check for all ancestors since their subtree volume changed
            $this->runRankCheckForAncestors($newNode, $newDist->distributor_id);

            DB::commit();
            return $account;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ─── Cycle Engine ─────────────────────────────────────────────────────────
    // Pool = live subtree volume (sum of every own_points in the entire tree).
    // Total points are NEVER deducted or modified — they are a permanent record.
    // The cycle engine only reads the tree total, calculates how many full 600-pt
    // cycles fit, pays out earnings, and records the last-run snapshot so the
    // distributor can see how many cycles they have collected so far.
    //
    // cycles  = floor(total_points / 600)
    // earning = cycles × 600 × (cycle_rate / 100)
    //
    // NOTE: This must ONLY be called when the distributor clicks "Run Cycle Engine"
    //       in the Earnings screen. It is never triggered automatically.
    public function runCycleEngine($distributorId)
    {
        $stat = Stat::where('distributor_id', $distributorId)->first();
        if (!$stat) return ['cycles' => 0, 'earnings' => 0];

        $wallet = Wallet::where('distributor_id', $distributorId)->first();
        if (!$wallet) return ['cycles' => 0, 'earnings' => 0];

        $accounts = Account::where('distributor_id', $distributorId)->with('product')->get();
        if ($accounts->isEmpty()) return ['cycles' => 0, 'earnings' => 0];

        // Best cycle rate & weekly cap from all owned packages
        $bestCycleRate = 0;
        $bestWeeklyCap = 0;
        foreach ($accounts as $acc) {
            if ($acc->product) {
                if ($acc->product->cycle_rate > $bestCycleRate) $bestCycleRate = $acc->product->cycle_rate;
                if ($acc->product->weekly_cap  > $bestWeeklyCap)  $bestWeeklyCap  = $acc->product->weekly_cap;
            }
        }

        // Live pool = entire subtree volume (walks the tree, sums every own_points).
        // This is the ONLY input — no carry, no deduction, no modification of points.
        $rootNode   = Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        $totalPoints = $rootNode ? $this->getSubtreeVolume($rootNode->id) : 0;

        if ($totalPoints <= 0) return ['cycles' => 0, 'earnings' => 0];

        // How many full 600-pt cycles fit in the current tree total
        $cycles = (int) floor($totalPoints / 600);

        if ($cycles <= 0) return ['cycles' => 0, 'earnings' => 0];

        // earnings per cycle = 600 × (cycle_rate %)
        $earningsPerCycle = 600 * ($bestCycleRate / 100);
        $earnings = $cycles * $earningsPerCycle;

        // Weekly cap check
        if ($bestWeeklyCap > 0 && ($wallet->weekly_earnings + $earnings) > $bestWeeklyCap) {
            $earnings = max(0, $bestWeeklyCap - $wallet->weekly_earnings);
            $cycles   = $earningsPerCycle > 0 ? (int) floor($earnings / $earningsPerCycle) : 0;
            if ($cycles <= 0) return ['cycles' => 0, 'earnings' => 0];
        }

        // Total points are NOT touched — they are a permanent record of all purchases.
        // cycle_carry is cleared since we no longer use a carry-forward model.
        $stat->cycle_carry = 0;
        $stat->save();

        if ($earnings > 0) {
            $wallet->balance         += $earnings;
            $wallet->weekly_earnings += $earnings;
            $wallet->total_earned    += $earnings;
            $wallet->save();

            Distributor::where('distributor_id', $distributorId)->increment('income_weekly',  $earnings);
            Distributor::where('distributor_id', $distributorId)->increment('income_monthly', $earnings);
            Distributor::where('distributor_id', $distributorId)->increment('income_yearly',  $earnings);

            $distributor = Distributor::where('distributor_id', $distributorId)->first();
            $highestAcc  = $accounts->sortByDesc(fn($a) => $a->product->cycle_rate ?? 0)->first();

            \App\Models\Payment::create([
                'product_id'        => $highestAcc ? $highestAcc->product_id : 1,
                'distributor_id'    => $distributorId,
                'customer_name'     => 'Cycle Bonus (' . $cycles . ' cycle' . ($cycles > 1 ? 's' : '') . ')',
                'customer_email'    => $distributor->email ?? 'N/A',
                'tx_ref'            => 'CYCLE-' . strtoupper(\Illuminate\Support\Str::random(10)),
                'amount'            => $earnings,
                'currency'          => 'ETB',
                'quantity'          => $cycles,
                'commission_amount' => $earnings,
                'status'            => 'success',
                'webhook_verified'  => true,
                'commission_paid'   => true,
            ]);
        }

        return ['cycles' => $cycles, 'earnings' => $earnings];
    }

    // ─── Rank Engine ─────────────────────────────────────────────────────────
    // Total points = live subtree volume (walks the tree, no stored left/right)
    // MT:      ALL 4 legs ≥ 200 pts  AND total ≥ 5,000
    // TT:      2 legs have MT+       AND total ≥ 10,000
    // NTB:     4 legs have TT+       AND total ≥ 50,000
    // IBB:     4 legs have NTB+      AND total ≥ 200,000
    // GEB:     4 legs have IBB+      AND total ≥ 800,000
    // CA:      4 legs have GEB       (Crown Achiever, $50K bonus)
    // C_AWARD: 2+ legs have CA       (Crown Award,   $100K bonus)
    // AL:      4 legs have CA        (Alpha Legend,  $500K bonus)
    public function runRankCheck($distributorId)
    {
        $stat = Stat::where('distributor_id', $distributorId)->first();
        if (!$stat) return;

        $node = Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        if (!$node) return;

        // Total points = live walk of the entire subtree (own_points of every node)
        $totalPoints = $this->getSubtreeVolume($node->id);

        // Per-leg subtree volumes and highest ranks
        $directLegs = Node::where('parent_id', $node->id)->get()->keyBy('leg');

        $legPoints = [];
        $legRanks  = [];
        for ($i = 1; $i <= 4; $i++) {
            $legNode       = $directLegs->get($i);
            $legPoints[$i] = $legNode ? $this->getSubtreeVolume($legNode->id) : 0;
            $legRanks[$i]  = $legNode ? $this->getHighestRankInSubtree($legNode->id) : 'CT';
        }

        $currentRank = $stat->rank ?: 'CT';
        $newRank     = $currentRank;

        // ── MT ─────────────────────────────────────────────────────────────
        $legsAbove200 = count(array_filter($legPoints, fn($p) => $p >= 200));
        if ($legsAbove200 >= 4 && $totalPoints >= 5000) {
            $newRank = 'MT';
        }
        // ── TT ─────────────────────────────────────────────────────────────
        if ($this->countLegsWithRank($legRanks, 'MT') >= 2 && $totalPoints >= 10000) {
            $newRank = 'TT';
        }
        // ── NTB ────────────────────────────────────────────────────────────
        if ($this->countLegsWithRank($legRanks, 'TT') >= 4 && $totalPoints >= 50000) {
            $newRank = 'NTB';
        }
        // ── IBB ────────────────────────────────────────────────────────────
        if ($this->countLegsWithRank($legRanks, 'NTB') >= 4 && $totalPoints >= 200000) {
            $newRank = 'IBB';
        }
        // ── GEB ────────────────────────────────────────────────────────────
        if ($this->countLegsWithRank($legRanks, 'IBB') >= 4 && $totalPoints >= 800000) {
            $newRank = 'GEB';
        }
        // ── CA (Crown Achiever) ─────────────────────────────────────────────
        if ($this->countLegsWithRank($legRanks, 'GEB') >= 4) {
            $newRank = 'CA';
        }
        // ── C_AWARD (Crown Award) ───────────────────────────────────────────
        if ($this->countLegsWithRank($legRanks, 'CA') >= 2) {
            $newRank = 'C_AWARD';
        }
        // ── AL (Alpha Legend) ───────────────────────────────────────────────
        if ($this->countLegsWithRank($legRanks, 'CA') >= 4) {
            $newRank = 'AL';
        }

        if ($newRank !== $currentRank) {
            $stat->rank = $newRank;
            $stat->save();

            $dist = Distributor::where('distributor_id', $distributorId)->first();
            if ($dist) { $dist->rank = $newRank; $dist->save(); }

            $this->payRankBonus($distributorId, $currentRank, $newRank);
        }
    }

    // ─── Walk up the tree and re-check rank for every ancestor ───────────────
    // Called after any purchase so ancestors' subtree volumes are re-evaluated.
    private function runRankCheckForAncestors(?Node $startNode, int $skipDistributorId): void
    {
        if (!$startNode) return;
        $current = $startNode;
        while ($current->parent_id) {
            $parent = Node::find($current->parent_id);
            if (!$parent) break;
            if ((int)$parent->distributor_id !== $skipDistributorId) {
                $this->runRankCheck($parent->distributor_id);
            }
            $current = $parent;
        }
    }

    // ─── Rank bonus payout ────────────────────────────────────────────────────
    private function payRankBonus($distributorId, $oldRank, $newRank)
    {
        $bonuses = ['CA' => 50000, 'C_AWARD' => 100000, 'AL' => 500000];
        $oldScore = self::RANK_SCORE[$oldRank] ?? 0;
        $newScore = self::RANK_SCORE[$newRank] ?? 0;

        $totalBonus = 0;
        foreach ($bonuses as $rankName => $amount) {
            $rankScore = self::RANK_SCORE[$rankName] ?? 0;
            if ($oldScore < $rankScore && $newScore >= $rankScore) {
                $totalBonus += $amount;
            }
        }

        if ($totalBonus > 0) {
            $wallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
            $wallet->balance      += $totalBonus;
            $wallet->total_earned += $totalBonus;
            $wallet->save();

            $dist = Distributor::where('distributor_id', $distributorId)->first();
            if ($dist) { $dist->income_monthly += $totalBonus; $dist->income_yearly += $totalBonus; $dist->save(); }

            \App\Models\Payment::create([
                'product_id'        => 1,
                'distributor_id'    => $distributorId,
                'customer_name'     => 'Rank Bonus (' . $newRank . ')',
                'customer_email'    => $dist->email ?? 'system',
                'tx_ref'            => 'RANKBONUS-' . strtoupper(\Illuminate\Support\Str::random(8)),
                'amount'            => $totalBonus,
                'currency'          => 'ETB',
                'quantity'          => 1,
                'commission_amount' => $totalBonus,
                'status'            => 'success',
                'webhook_verified'  => true,
                'commission_paid'   => true,
            ]);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * BFS walk of the subtree rooted at $nodeId.
     * Returns the sum of own_points for every UNIQUE distributor in the subtree.
     * own_points = sum of product.point for ALL accounts that distributor owns
     *              (already aggregated — so we must count each distributor only once,
     *               even if they have multiple nodes in the tree from doubling/tripling/quadrupling).
     */
    public function getSubtreeVolume(int $nodeId): int
    {
        $total   = 0;
        $counted = []; // track distributor_ids already added to avoid double-counting
        $queue   = [$nodeId];

        while (!empty($queue)) {
            $currId = array_shift($queue);
            $node   = Node::with('children')->find($currId);
            if (!$node) continue;

            $distId = (int) $node->distributor_id;

            // Only count each distributor's own_points once, no matter how many
            // nodes they have in the tree (double/triple/quadruple accounts).
            if (!isset($counted[$distId])) {
                $stat = Stat::where('distributor_id', $distId)->first();
                if ($stat) $total += (int)($stat->own_points ?? 0);
                $counted[$distId] = true;
            }

            foreach ($node->children as $child) $queue[] = $child->id;
        }

        return $total;
    }

    private function getHighestRankInSubtree(int $nodeId): string
    {
        $highest     = 0;
        $highestRank = 'CT';
        $queue = [$nodeId];
        while (!empty($queue)) {
            $currId = array_shift($queue);
            $node   = Node::with('children')->find($currId);
            if (!$node) continue;

            $stat = Stat::where('distributor_id', $node->distributor_id)->first();
            if ($stat && $stat->rank && isset(self::RANK_SCORE[$stat->rank]) && self::RANK_SCORE[$stat->rank] > $highest) {
                $highest     = self::RANK_SCORE[$stat->rank];
                $highestRank = $stat->rank;
            }
            foreach ($node->children as $child) $queue[] = $child->id;
        }
        return $highestRank;
    }

    private function countLegsWithRank(array $legRanks, string $requiredRank): int
    {
        $reqScore = self::RANK_SCORE[$requiredRank] ?? 0;
        return count(array_filter($legRanks, fn($r) => (self::RANK_SCORE[$r] ?? 0) >= $reqScore));
    }
}
