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
        $visited = [];
        while (!empty($queue)) {
            $currentId = array_shift($queue);
            if (in_array($currentId, $visited)) continue;
            $visited[] = $currentId;
            $node = Node::with('children')->find($currentId);
            if (!$node) continue;
            if ($node->children->count() < 4) return $node;
            foreach ($node->children as $child) {
                if (!in_array($child->id, $visited)) $queue[] = $child->id;
            }
        }
        return null;
    }

    // ─── Recalculate own_points for a distributor ─────────────────────────────
    // own_points = sum of product.point for every account this distributor owns.
    // A quadruple golden = 4 × 800 = 3200 own_points.
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

            // ── Commission on own purchase ────────────────────────────────────
            // The distributor earns commission on every account they buy themselves
            // (single, double, triple, quadruple). Rate is taken from their best
            // existing account's referral_rate (or 10% minimum).
            $ownAccounts = Account::where('distributor_id', $distributorId)->with('product')->get();
            $selfRate = 10;
            foreach ($ownAccounts as $acc) {
                if ($acc->product && $acc->product->referral_rate > $selfRate) {
                    $selfRate = $acc->product->referral_rate;
                }
            }
            $selfCommission = ($selfRate / 100) * ($product->point ?? 0) * $quantity;
            if ($selfCommission > 0) {
                $selfWallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
                $selfWallet->balance      += $selfCommission;
                $selfWallet->total_earned += $selfCommission;
                $selfWallet->save();
                Distributor::where('distributor_id', $distributorId)->increment('income_monthly', $selfCommission);
                Distributor::where('distributor_id', $distributorId)->increment('income_yearly',  $selfCommission);
                \App\Models\Payment::create([
                    'product_id'        => $productId,
                    'distributor_id'    => $distributorId,
                    'customer_name'     => 'Own Account Commission (' . $quantity . 'x ' . $product->name . ')',
                    'customer_email'    => $distributor->email ?? 'N/A',
                    'tx_ref'            => 'SELF-' . strtoupper(\Illuminate\Support\Str::random(10)),
                    'amount'            => ($product->price ?? 0) * $quantity,
                    'currency'          => 'ETB',
                    'quantity'          => $quantity,
                    'commission_amount' => $selfCommission,
                    'status'            => 'success',
                    'webhook_verified'  => true,
                    'commission_paid'   => true,
                ]);
            }

            // ── Referral commission to sponsor (if referred by someone) ───────
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

            // Run rank check for this distributor and all ancestors
            $this->runRankCheck($distributorId);
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

            // Generate a random temporary password so the customer can log in
            // immediately after upgrading. The upgrade endpoint replaces this.
            $tempPassword = \Illuminate\Support\Str::random(12);

            $newDist = Distributor::firstOrCreate(
                ['email' => $customerEmail],
                [
                    'name'      => $customerName,
                    'phone'     => $customerPhone,
                    'password'  => bcrypt($tempPassword),
                    'upline_id' => $distributorId,   // link to sponsor from day one
                    'join_date' => now(),
                ]
            );

            // If the distributor already existed but has no upline set, set it now
            if (!$newDist->wasRecentlyCreated && !$newDist->upline_id) {
                $newDist->upline_id = $distributorId;
                $newDist->save();
            }

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

            // Run rank check for the new customer and all ancestors
            $this->runRankCheck($newDist->distributor_id);
            $this->runRankCheckForAncestors($newNode, $newDist->distributor_id);

            DB::commit();
            return $account;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ─── Rank Engine ─────────────────────────────────────────────────────────
    // total_points = live BFS walk of the entire subtree rooted at this distributor's
    //                first node, counting each unique distributor's own_points once.
    // The root distributor's own package (own_points) is included in total_points
    // AND added to leg 1's volume so their main account counts toward leg qualifications.
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

        // Total points = live walk of the entire subtree (each unique distributor counted once).
        // This already includes the root distributor's own own_points.
        $totalPoints = $this->getSubtreeVolume($node->id);

        // The root distributor's own package points — these belong to the main account
        // and must be counted toward leg qualifications, not just the total.
        $ownPoints = (int)($stat->own_points ?? 0);

        // Per-leg subtree volumes and highest ranks
        $directLegs = Node::where('parent_id', $node->id)->get()->keyBy('leg');

        $legPoints = [];
        $legRanks  = [];
        for ($i = 1; $i <= 4; $i++) {
            $legNode       = $directLegs->get($i);
            $legPoints[$i] = $legNode ? $this->getSubtreeVolume($legNode->id) : 0;
            $legRanks[$i]  = $legNode ? $this->getHighestRankInSubtree($legNode->id) : 'CT';
        }

        // Add the root distributor's own package points to leg 1 so their main
        // account is considered when evaluating per-leg volume thresholds.
        // This ensures a distributor who has purchased their own package is not
        // penalised by having their points excluded from leg qualification checks.
        $legPoints[1] += $ownPoints;

        $currentRank = $stat->rank ?: 'CT';
        $newRank     = $currentRank;

        // ── Rank progression is strictly sequential. Each rank requires the
        //    previous rank to have been achieved first. MT is the gateway —
        //    without it, no higher rank can be reached regardless of how many
        //    MT+ legs exist. When a distributor finally balances all 4 legs
        //    at ≥ 200 pts, all ranks they now qualify for are awarded in one go.
        //
        //    Evaluation order matters: we check from lowest to highest so that
        //    a single event can advance through multiple ranks at once (e.g.
        //    CT → MT → TT in one check if all conditions are met simultaneously).

        $legsAbove200 = count(array_filter($legPoints, fn($p) => $p >= 200));

        // CT → MT: requires ALL 4 legs ≥ 200 pts AND total ≥ 5,000
        // This is the mandatory gateway — no higher rank without it.
        if ($legsAbove200 >= 4 && $totalPoints >= 5000) {
            $newRank = 'MT';
        }

        // MT → TT: only reachable if MT was already achieved (current or just set above)
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['MT']
            && $this->countLegsWithRank($legRanks, 'MT') >= 2
            && $totalPoints >= 10000) {
            $newRank = 'TT';
        }

        // TT → NTB
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['TT']
            && $this->countLegsWithRank($legRanks, 'TT') >= 4
            && $totalPoints >= 50000) {
            $newRank = 'NTB';
        }

        // NTB → IBB
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['NTB']
            && $this->countLegsWithRank($legRanks, 'NTB') >= 4
            && $totalPoints >= 200000) {
            $newRank = 'IBB';
        }

        // IBB → GEB
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['IBB']
            && $this->countLegsWithRank($legRanks, 'IBB') >= 4
            && $totalPoints >= 800000) {
            $newRank = 'GEB';
        }

        // GEB → CA
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['GEB']
            && $this->countLegsWithRank($legRanks, 'GEB') >= 4) {
            $newRank = 'CA';
        }

        // CA → C_AWARD
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['CA']
            && $this->countLegsWithRank($legRanks, 'CA') >= 2) {
            $newRank = 'C_AWARD';
        }

        // C_AWARD → AL
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['C_AWARD']
            && $this->countLegsWithRank($legRanks, 'CA') >= 4) {
            $newRank = 'AL';
        }

        // Never demote — only advance
        if ((self::RANK_SCORE[$newRank] ?? 0) < (self::RANK_SCORE[$currentRank] ?? 0)) {
            $newRank = $currentRank;
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
    public function runRankCheckForAncestors(?Node $startNode, int $skipDistributorId): void
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
        $bonuses  = ['CA' => 50000, 'C_AWARD' => 100000, 'AL' => 500000];
        $oldScore = self::RANK_SCORE[$oldRank] ?? 0;
        $newScore = self::RANK_SCORE[$newRank] ?? 0;

        $totalBonus = 0;
        foreach ($bonuses as $rankName => $amount) {
            $rankScore = self::RANK_SCORE[$rankName] ?? 0;
            if ($oldScore < $rankScore && $newScore >= $rankScore) $totalBonus += $amount;
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
     *
     * Returns the sum of own_points for every UNIQUE distributor in the subtree,
     * INCLUDING the root node's distributor (the account owner themselves).
     *
     * own_points already aggregates all of a distributor's accounts
     * (e.g. quadruple golden = 4 × 800 = 3200), so each distributor_id
     * must be counted exactly once regardless of how many nodes they have.
     */
    public function getSubtreeVolume(int $nodeId): int
    {
        $total   = 0;
        $counted = []; // prevent double-counting distributors with multiple nodes
        $queue   = [$nodeId];
        $visited = [];

        while (!empty($queue)) {
            $currId = array_shift($queue);
            if (in_array($currId, $visited)) continue;
            $visited[] = $currId;
            
            $node   = Node::with('children')->find($currId);
            if (!$node) continue;

            $distId = (int) $node->distributor_id;

            if (!isset($counted[$distId])) {
                $stat = Stat::where('distributor_id', $distId)->first();
                if ($stat) $total += (int)($stat->own_points ?? 0);
                $counted[$distId] = true;
            }

            foreach ($node->children as $child) {
                if (!in_array($child->id, $visited)) $queue[] = $child->id;
            }
        }

        return $total;
    }

    private function getHighestRankInSubtree(int $nodeId): string
    {
        $highest     = 0;
        $highestRank = 'CT';
        $queue = [$nodeId];
        $visited = [];
        while (!empty($queue)) {
            $currId = array_shift($queue);
            if (in_array($currId, $visited)) continue;
            $visited[] = $currId;
            
            $node   = Node::with('children')->find($currId);
            if (!$node) continue;
            $stat = Stat::where('distributor_id', $node->distributor_id)->first();
            if ($stat && $stat->rank && isset(self::RANK_SCORE[$stat->rank]) && self::RANK_SCORE[$stat->rank] > $highest) {
                $highest     = self::RANK_SCORE[$stat->rank];
                $highestRank = $stat->rank;
            }
            foreach ($node->children as $child) {
                if (!in_array($child->id, $visited)) $queue[] = $child->id;
            }
        }
        return $highestRank;
    }

    private function countLegsWithRank(array $legRanks, string $requiredRank): int
    {
        $reqScore = self::RANK_SCORE[$requiredRank] ?? 0;
        return count(array_filter($legRanks, fn($r) => (self::RANK_SCORE[$r] ?? 0) >= $reqScore));
    }
}
