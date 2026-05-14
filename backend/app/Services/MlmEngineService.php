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
    // Finds the first node in the subtree (BFS order) that has fewer than 4 children.
    // Loads ALL nodes in one query and does BFS in memory — no N+1 queries.
    public function findPlacementNode($startNodeId)
    {
        // Load all nodes in the entire tree in one query
        $allNodes = Node::all()->keyBy('id');

        // Build a children map: parent_id => [child_ids]
        $childrenMap = [];
        foreach ($allNodes as $node) {
            if ($node->parent_id !== null) {
                $childrenMap[$node->parent_id][] = $node->id;
            }
        }

        // BFS from startNodeId
        $queue   = [$startNodeId];
        $visited = [];

        while (!empty($queue)) {
            $currentId = array_shift($queue);
            if (isset($visited[$currentId])) continue;
            $visited[$currentId] = true;

            $childCount = count($childrenMap[$currentId] ?? []);
            if ($childCount < 4) {
                return $allNodes->get($currentId);
            }

            foreach (($childrenMap[$currentId] ?? []) as $childId) {
                if (!isset($visited[$childId])) {
                    $queue[] = $childId;
                }
            }
        }
        return null;
    }

    // ─── Recalculate own_points for a distributor ─────────────────────────────
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
    //
    // FIX: Removed lockForUpdate() on the distributor row — it caused deadlocks
    // when the DistributorJoinController called this in a loop for quantity > 1.
    // The controller already validates account count before calling us.
    //
    // FIX: Re-fetch the first account inside the loop so each iteration sees
    // the node created by the previous iteration, enabling correct BFS placement
    // for doubled/tripled/quadrupled accounts.
    //
    // FIX: Added null-check on findPlacementNode() result — throws a clear error
    // instead of a fatal null-pointer exception when the tree is full.
    public function processPurchase($distributorId, $productId, $sponsorId = null, $quantity = 1)
    {
        DB::beginTransaction();
        try {
            $distributor = Distributor::where('distributor_id', $distributorId)->firstOrFail();
            $product     = Product::findOrFail($productId);

            Wallet::firstOrCreate(['distributor_id' => $distributorId]);
            Stat::firstOrCreate(['distributor_id'   => $distributorId]);

            $nodes       = [];
            $lastAccount = null;

            for ($i = 0; $i < $quantity; $i++) {
                // Re-fetch inside loop so each iteration sees nodes from previous iterations
                $currentFirst = Account::where('distributor_id', $distributorId)->orderBy('id')->first();

                if ($currentFirst && $currentFirst->node_id) {
                    // Distributor already has a main node — place new account as a
                    // child of the main node (doubling). We always start BFS from
                    // the MAIN node (first account's node), not from any secondary node.
                    $mainNodeId    = Account::where('distributor_id', $distributorId)->orderBy('id')->value('node_id');
                    $placementNode = $this->findPlacementNode($mainNodeId);
                    if (!$placementNode) {
                        throw new \Exception('No available placement slot in the tree. Your tree is full.');
                    }
                    $leg = min($placementNode->children()->count() + 1, 4);
                    $newNode = Node::create([
                        'parent_id'      => $placementNode->id,
                        'distributor_id' => $distributorId,
                        'leg'            => $leg,
                    ]);
                } else {
                    // First-time join — place under sponsor or root
                    if ($sponsorId) {
                        $sponsorNode = Node::where('distributor_id', $sponsorId)->orderBy('id')->first();
                        if (!$sponsorNode) {
                            $companyRoot = Node::whereNull('parent_id')->first();
                            if ($companyRoot) {
                                $rootPlacement = $this->findPlacementNode($companyRoot->id);
                                if (!$rootPlacement) throw new \Exception('Root tree is full.');
                                $sponsorNode = Node::create([
                                    'parent_id'      => $rootPlacement->id,
                                    'distributor_id' => $sponsorId,
                                    'leg'            => min($rootPlacement->children()->count() + 1, 4),
                                ]);
                            } else {
                                $sponsorNode = Node::create(['parent_id' => null, 'distributor_id' => $sponsorId, 'leg' => 1]);
                            }
                        }
                        $placementNode = $this->findPlacementNode($sponsorNode->id);
                        if (!$placementNode) throw new \Exception('No available placement slot under sponsor.');
                        $leg = min($placementNode->children()->count() + 1, 4);
                        $newNode = Node::create(['parent_id' => $placementNode->id, 'distributor_id' => $distributorId, 'leg' => $leg]);
                    } else {
                        $root = Node::whereNull('parent_id')->first();
                        if ($root) {
                            $placementNode = $this->findPlacementNode($root->id);
                            if (!$placementNode) throw new \Exception('No available placement slot in the root tree.');
                            $leg = min($placementNode->children()->count() + 1, 4);
                            $newNode = Node::create(['parent_id' => $placementNode->id, 'distributor_id' => $distributorId, 'leg' => $leg]);
                        } else {
                            $newNode = Node::create(['parent_id' => null, 'distributor_id' => $distributorId, 'leg' => 1]);
                        }
                    }
                }

                $lastAccount = Account::create([
                    'distributor_id' => $distributorId,
                    'node_id'        => $newNode->id,
                    'product_id'     => $productId,
                    'sponsor_id'     => $sponsorId,
                ]);

                $nodes[] = $newNode;
            }

            // Mark distributor as paid now that they have at least one account
            DB::table('distributors')
                ->where('distributor_id', $distributorId)
                ->update(['is_paid' => true, 'updated_at' => now()]);
            $ownAccounts = Account::where('distributor_id', $distributorId)->with('product')->get();
            $selfRate    = 10;
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

            // ── Referral commission to sponsor ────────────────────────────────
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

            $this->refreshOwnPoints($distributorId);
            $this->runRankCheck($distributorId);
            $this->runRankCheckForAncestors($nodes[0] ?? null, $distributorId);

            DB::commit();
            return $lastAccount;
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

            $tempPassword = \Illuminate\Support\Str::random(12);

            $newDist = Distributor::firstOrCreate(
                ['email' => $customerEmail],
                [
                    'name'      => $customerName,
                    'phone'     => $customerPhone,
                    'password'  => bcrypt($tempPassword),
                    'upline_id' => $distributorId,
                    'status'    => 'inactive',
                    'is_paid'   => false,
                    'join_date' => now()->toDateString(),
                ]
            );

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
                    $rootPlacement   = $this->findPlacementNode($companyRoot->id);
                    $sponsorMainNode = Node::create([
                        'parent_id'      => $rootPlacement->id,
                        'distributor_id' => $distributorId,
                        'leg'            => min($rootPlacement->children()->count() + 1, 4),
                    ]);
                } else {
                    $sponsorMainNode = Node::create(['parent_id' => null, 'distributor_id' => $distributorId, 'leg' => 1]);
                }
                Account::firstOrCreate(
                    ['distributor_id' => $distributorId, 'node_id' => $sponsorMainNode->id],
                    ['product_id' => $productId, 'sponsor_id' => null]
                );
            }

            $placementNode = null;
            $leg           = null;

            if ($preferredLeg) {
                $existingLegChild = Node::where('parent_id', $sponsorMainNode->id)->where('leg', $preferredLeg)->first();
                if ($existingLegChild) {
                    $placementNode = $this->findPlacementNode($existingLegChild->id);
                    $leg           = min($placementNode->children()->count() + 1, 4);
                } else {
                    $placementNode = $sponsorMainNode;
                    $leg           = $preferredLeg;
                }
            } else {
                $secondaryNodes = Node::where('parent_id', $sponsorMainNode->id)
                    ->where('distributor_id', $distributorId)->orderBy('id')->get();
                if ($secondaryNodes->isNotEmpty()) {
                    foreach ($secondaryNodes as $secNode) {
                        $candidate = $this->findPlacementNode($secNode->id);
                        if ($candidate && $candidate->children()->count() < 4) {
                            $placementNode = $candidate;
                            break;
                        }
                    }
                }
                if (!$placementNode) $placementNode = $this->findPlacementNode($sponsorMainNode->id);
                $leg = min($placementNode->children()->count() + 1, 4);
            }

            if (!$placementNode) {
                throw new \Exception('No available placement slot in the sponsor tree.');
            }

            $newNode = Node::create([
                'parent_id'      => $placementNode->id,
                'distributor_id' => $newDist->distributor_id,
                'leg'            => $leg,
            ]);
            $account = Account::create([
                'distributor_id' => $newDist->distributor_id,
                'node_id'        => $newNode->id,
                'product_id'     => $productId,
                'sponsor_id'     => $distributorId,
            ]);

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

            $this->refreshOwnPoints($newDist->distributor_id);
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
    public function runRankCheck($distributorId)
    {
        $stat = Stat::where('distributor_id', $distributorId)->first();
        if (!$stat) return;

        $node = Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        if (!$node) return;

        $totalPoints = $this->getSubtreeVolume($node->id);
        $ownPoints   = (int)($stat->own_points ?? 0);

        $directLegs = Node::where('parent_id', $node->id)->get()->keyBy('leg');

        $legPoints = [];
        $legRanks  = [];
        for ($i = 1; $i <= 4; $i++) {
            $legNode       = $directLegs->get($i);
            $legPoints[$i] = $legNode ? $this->getSubtreeVolume($legNode->id) : 0;
            $legRanks[$i]  = $legNode ? $this->getHighestRankInSubtree($legNode->id) : 'CT';
        }

        $legPoints[1] += $ownPoints;

        $currentRank  = $stat->rank ?: 'CT';
        $newRank      = $currentRank;

        $legsAbove200 = count(array_filter($legPoints, fn($p) => $p >= 200));

        if ($legsAbove200 >= 4 && $totalPoints >= 5000) {
            $newRank = 'MT';
        }
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['MT']
            && $this->countLegsWithRank($legRanks, 'MT') >= 2
            && $totalPoints >= 10000) {
            $newRank = 'TT';
        }
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['TT']
            && $this->countLegsWithRank($legRanks, 'TT') >= 4
            && $totalPoints >= 50000) {
            $newRank = 'NTB';
        }
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['NTB']
            && $this->countLegsWithRank($legRanks, 'NTB') >= 4
            && $totalPoints >= 200000) {
            $newRank = 'IBB';
        }
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['IBB']
            && $this->countLegsWithRank($legRanks, 'IBB') >= 4
            && $totalPoints >= 800000) {
            $newRank = 'GEB';
        }
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['GEB']
            && $this->countLegsWithRank($legRanks, 'GEB') >= 4) {
            $newRank = 'CA';
        }
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['CA']
            && $this->countLegsWithRank($legRanks, 'CA') >= 2) {
            $newRank = 'C_AWARD';
        }
        if ((self::RANK_SCORE[$newRank] ?? 0) >= self::RANK_SCORE['C_AWARD']
            && $this->countLegsWithRank($legRanks, 'CA') >= 4) {
            $newRank = 'AL';
        }

        if ((self::RANK_SCORE[$newRank] ?? 0) < (self::RANK_SCORE[$currentRank] ?? 0)) {
            $newRank = $currentRank;
        }

        if ($newRank !== $currentRank) {
            $stat->rank = $newRank;
            $stat->save();

            $dist = Distributor::where('distributor_id', $distributorId)->first();
            if ($dist) {
                $dist->rank = $newRank;
                $dist->save();
            }

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
            if ($dist) {
                $dist->income_monthly += $totalBonus;
                $dist->income_yearly  += $totalBonus;
                $dist->save();
            }

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

    // ─── Subtree volume (BFS, each distributor counted once) ─────────────────
    public function getSubtreeVolume(int $nodeId): int
    {
        // Load all nodes and stats in bulk — no N+1 queries
        $allNodes   = Node::all()->keyBy('id');
        $allStats   = Stat::all()->keyBy('distributor_id');
        $childrenMap = [];
        foreach ($allNodes as $node) {
            if ($node->parent_id !== null) {
                $childrenMap[$node->parent_id][] = $node->id;
            }
        }

        $total   = 0;
        $counted = [];
        $queue   = [$nodeId];
        $visited = [];

        while (!empty($queue)) {
            $currId = array_shift($queue);
            if (isset($visited[$currId])) continue;
            $visited[$currId] = true;

            $node = $allNodes->get($currId);
            if (!$node) continue;

            $distId = (int) $node->distributor_id;
            if (!isset($counted[$distId])) {
                $stat = $allStats->get($distId);
                if ($stat) $total += (int)($stat->own_points ?? 0);
                $counted[$distId] = true;
            }

            foreach (($childrenMap[$currId] ?? []) as $childId) {
                if (!isset($visited[$childId])) $queue[] = $childId;
            }
        }

        return $total;
    }

    private function getHighestRankInSubtree(int $nodeId): string
    {
        $allNodes    = Node::all()->keyBy('id');
        $allStats    = Stat::all()->keyBy('distributor_id');
        $childrenMap = [];
        foreach ($allNodes as $node) {
            if ($node->parent_id !== null) {
                $childrenMap[$node->parent_id][] = $node->id;
            }
        }

        $highest     = 0;
        $highestRank = 'CT';
        $queue       = [$nodeId];
        $visited     = [];

        while (!empty($queue)) {
            $currId = array_shift($queue);
            if (isset($visited[$currId])) continue;
            $visited[$currId] = true;

            $node = $allNodes->get($currId);
            if (!$node) continue;
            $stat = $allStats->get($node->distributor_id);
            if ($stat && $stat->rank && isset(self::RANK_SCORE[$stat->rank])
                && self::RANK_SCORE[$stat->rank] > $highest) {
                $highest     = self::RANK_SCORE[$stat->rank];
                $highestRank = $stat->rank;
            }

            foreach (($childrenMap[$currId] ?? []) as $childId) {
                if (!isset($visited[$childId])) $queue[] = $childId;
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
