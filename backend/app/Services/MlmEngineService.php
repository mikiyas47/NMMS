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
    /**
     * Finds the placement node using BFS.
     * Returns a valid parent node that has less than 4 children.
     */
    public function findPlacementNode($startNodeId)
    {
        $queue = [$startNodeId];
        
        while (!empty($queue)) {
            $currentId = array_shift($queue);
            $node = Node::with('children')->find($currentId);
            
            if (!$node) continue;
            
            if ($node->children->count() < 4) {
                return $node;
            }
            
            foreach ($node->children as $child) {
                $queue[] = $child->id;
            }
        }
        
        return null; // Should ideally never reach here unless the tree is completely full (which is impossible)
    }

    /**
     * Process a product purchase.
     * Handles account creation, multi-account rule, referral commission, and point propagation.
     */
    public function processPurchase($distributorId, $productId, $sponsorId = null, $quantity = 1)
    {
        DB::beginTransaction();
        try {
            $distributor = Distributor::findOrFail($distributorId);
            $product = Product::findOrFail($productId);
            
            // Ensure Wallet and Stats exist
            $wallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
            $stats = Stat::firstOrCreate(['distributor_id' => $distributorId]);

            // Check if user already has an account
            $firstAccount = Account::where('distributor_id', $distributorId)->first();
            
            $newNode = null;
            
            if ($firstAccount && $firstAccount->node_id) {
                // Multi-account rule: create under the same node
                $parentNode = Node::find($firstAccount->node_id);
                // The new node acts as a "dummy" or we simply create another account tied to the same node?
                // The prompt says: "create account under SAME node". So node_id is the same.
                // But wait, if they have multiple accounts, does it multiply their legs?
                // "when the distributor have for example 4 account the only 4 leg rules won't apply here because only 4 legs is for one account when it is quadripled it becomes 16 legs"
                // Actually, if we just create a new Node under the same parent?
                // For simplicity, let's just create a new Node directly under the first account's node if possible, 
                // OR we can make a Node represent an account. Let's make a new Node under the user's first node.
                $placementNode = $this->findPlacementNode($firstAccount->node_id);
                
                $leg = $placementNode->children()->count() + 1;
                $newNode = Node::create([
                    'parent_id' => $placementNode->id,
                    'distributor_id' => $distributorId,
                    'leg' => $leg
                ]);
            } else {
                // First account.
                if ($sponsorId) {
                    // Find the sponsor's node
                    $sponsorNode = Node::where('distributor_id', $sponsorId)->first();
                    
                    if (!$sponsorNode) {
                        // Sponsor doesn't have a node yet (hasn't bought a product but referred someone).
                        // Create a node for the sponsor so the tree can be built correctly.
                        $companyRoot = Node::whereNull('parent_id')->first();
                        if ($companyRoot) {
                            $rootPlacement = $this->findPlacementNode($companyRoot->id);
                            $sponsorNode = Node::create([
                                'parent_id' => $rootPlacement->id,
                                'distributor_id' => $sponsorId,
                                'leg' => $rootPlacement->children()->count() + 1
                            ]);
                        } else {
                            $sponsorNode = Node::create([
                                'parent_id' => null,
                                'distributor_id' => $sponsorId,
                                'leg' => 1
                            ]);
                        }
                    }

                    // Now find where to place the customer under the sponsor
                    $placementNode = $this->findPlacementNode($sponsorNode->id);
                    $leg = $placementNode->children()->count() + 1;
                    $newNode = Node::create([
                        'parent_id' => $placementNode->id,
                        'distributor_id' => $distributorId,
                        'leg' => $leg
                    ]);
                } else {
                    // No sponsor, maybe company root
                    $root = Node::whereNull('parent_id')->first();
                    if ($root) {
                        $placementNode = $this->findPlacementNode($root->id);
                        $leg = $placementNode->children()->count() + 1;
                        $newNode = Node::create([
                            'parent_id' => $placementNode->id,
                            'distributor_id' => $distributorId,
                            'leg' => $leg
                        ]);
                    } else {
                        $newNode = Node::create([
                            'parent_id' => null,
                            'distributor_id' => $distributorId,
                            'leg' => 1
                        ]);
                    }
                }
            }

            // Create account
            $account = Account::create([
                'distributor_id' => $distributorId,
                'node_id' => $newNode->id,
                'product_id' => $productId,
                'sponsor_id' => $sponsorId
            ]);

            // B. Referral Commission
            if ($sponsorId) {
                $sponsorAccounts = Account::where('distributor_id', $sponsorId)->with('product')->get();
                if ($sponsorAccounts->isNotEmpty()) {
                    // Use highest referral rate from all sponsor's accounts
                    $rate = 10;
                    foreach ($sponsorAccounts as $acc) {
                        if ($acc->product && $acc->product->referral_rate > $rate) {
                            $rate = $acc->product->referral_rate;
                        }
                    }
                    $points = $product->point ?? 0;
                    $commission = ($rate / 100) * $points * $quantity;
                    
                    if ($commission > 0) {
                        $sponsorWallet = Wallet::firstOrCreate(['distributor_id' => $sponsorId]);
                        $sponsorWallet->balance += $commission;
                        $sponsorWallet->total_earned += $commission;
                        $sponsorWallet->save();

                        \App\Models\Distributor::where('distributor_id', $sponsorId)
                            ->increment('income_monthly', $commission);
                        \App\Models\Distributor::where('distributor_id', $sponsorId)
                            ->increment('income_yearly', $commission);

                        // Create payment record so it shows up in "Recent Commissions"
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

            // C. Points Propagation Engine
            $pointsToPropagate = ($product->point ?? 0) * $quantity;
            if ($pointsToPropagate > 0) {
                $currentNode = $newNode;
                while ($currentNode->parent_id) {
                    $parent = Node::find($currentNode->parent_id);
                    if (!$parent) break;
                    
                    // Prevent double counting for multi-accounts by only updating at the main node
                    $isMainNode = true;
                    if ($parent->parent_id) {
                        $grandpa = Node::find($parent->parent_id);
                        if ($grandpa && $grandpa->distributor_id === $parent->distributor_id) {
                            $isMainNode = false;
                        }
                    }

                    if ($isMainNode) {
                        $parentStat = Stat::firstOrCreate(['distributor_id' => $parent->distributor_id]);
                        
                        if ($currentNode->leg == 1 || $currentNode->leg == 2) {
                            $parentStat->left_points += $pointsToPropagate;
                        } else {
                            $parentStat->right_points += $pointsToPropagate;
                        }
                        $parentStat->save();
                    }
                    
                    $currentNode = $parent;
                }
            }

            DB::commit();
            return $account;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Process a CUSTOMER purchase via referral link or checkout.
     *
     * Placement priority:
     *  1. Find the sponsor's SECONDARY accounts (doubled/tripled nodes that are
     *     direct children of the sponsor's main node AND owned by the sponsor).
     *  2. BFS through those secondary nodes to find an available leg.
     *  3. If no secondary account exists yet, fall back to the sponsor's main node.
     */
    public function processCustomerPurchase($distributorId, $productId, $customerName, $customerEmail, $customerPhone, $quantity = 1, $preferredLeg = null)
    {
        DB::beginTransaction();
        try {
            $product = Product::findOrFail($productId);

            // 1. Create or find the customer as a distributor record
            $newDist = Distributor::firstOrCreate(
                ['email' => $customerEmail],
                [
                    'name'      => $customerName,
                    'phone'     => $customerPhone,
                    'password'  => bcrypt('password123'),
                    'join_date' => now(),
                ]
            );

            // 2. Ensure wallet + stats for the new customer
            Wallet::firstOrCreate(['distributor_id' => $newDist->distributor_id]);
            Stat::firstOrCreate(['distributor_id'   => $newDist->distributor_id]);

            // 3. Locate the sponsor's MAIN node (first/oldest node belonging to sponsor)
            $sponsorMainNode = Node::where('distributor_id', $distributorId)
                ->orderBy('id', 'asc')
                ->first();

            // 4. If sponsor has no main node yet, create one for them
            if (!$sponsorMainNode) {
                $companyRoot = Node::whereNull('parent_id')->first();
                if ($companyRoot) {
                    $rootPlacement = $this->findPlacementNode($companyRoot->id);
                    $sponsorMainNode = Node::create([
                        'parent_id'      => $rootPlacement->id,
                        'distributor_id' => $distributorId,
                        'leg'            => $rootPlacement->children()->count() + 1,
                    ]);
                } else {
                    $sponsorMainNode = Node::create([
                        'parent_id'      => null,
                        'distributor_id' => $distributorId,
                        'leg'            => 1,
                    ]);
                }
                // Also create account for the sponsor since they didn't have one
                Account::firstOrCreate(
                    ['distributor_id' => $distributorId, 'node_id' => $sponsorMainNode->id],
                    ['product_id' => $productId, 'sponsor_id' => null]
                );
            }

            // 5. Find secondary account nodes: direct children of the main node that
            //    are also owned by the same sponsor (these are the "doubled" accounts).
            $secondaryNodes = Node::where('parent_id', $sponsorMainNode->id)
                ->where('distributor_id', $distributorId)
                ->orderBy('id', 'asc')
                ->get();

            // 6. Determine the placement node
            $placementNode = null;
            $leg = null;

            if ($preferredLeg) {
                $existingLegChild = Node::where('parent_id', $sponsorMainNode->id)
                    ->where('leg', $preferredLeg)
                    ->first();
                if ($existingLegChild) {
                    $placementNode = $this->findPlacementNode($existingLegChild->id);
                    $leg = $placementNode->children()->count() + 1;
                } else {
                    $placementNode = $sponsorMainNode;
                    $leg = $preferredLeg;
                }
            } else {
                if ($secondaryNodes->isNotEmpty()) {
                    // Try to find an available leg in any secondary account (BFS within each)
                    foreach ($secondaryNodes as $secNode) {
                        $candidate = $this->findPlacementNode($secNode->id);
                        if ($candidate && $candidate->children()->count() < 4) {
                            $placementNode = $candidate;
                            break;
                        }
                    }
                }

                // 7. Fall back to main node if no secondary account had space
                if (!$placementNode) {
                    $placementNode = $this->findPlacementNode($sponsorMainNode->id);
                }
                
                $leg = $placementNode->children()->count() + 1;
            }

            // Fallback safety limit for leg
            if ($leg > 4) {
                $leg = 4;
            }

            // 8. Create the customer's node
            $newNode = Node::create([
                'parent_id'      => $placementNode->id,
                'distributor_id' => $newDist->distributor_id,
                'leg'            => $leg,
            ]);

            // 9. Create the customer's account record
            $account = Account::create([
                'distributor_id' => $newDist->distributor_id,
                'node_id'        => $newNode->id,
                'product_id'     => $productId,
                'sponsor_id'     => $distributorId,
            ]);

            // 10. Referral commission to sponsor
            $sponsorAccounts = Account::where('distributor_id', $distributorId)->with('product')->get();
            if ($sponsorAccounts->isNotEmpty()) {
                $rate = 10;
                foreach ($sponsorAccounts as $acc) {
                    if ($acc->product && $acc->product->referral_rate > $rate) {
                        $rate = $acc->product->referral_rate;
                    }
                }
                $points     = $product->point ?? 0;
                $commission = ($rate / 100) * $points * $quantity;

                if ($commission > 0) {
                    $sponsorWallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
                    $sponsorWallet->balance      += $commission;
                    $sponsorWallet->total_earned += $commission;
                    $sponsorWallet->save();
                }
            }

            // 11. Propagate points up the tree
            $pointsToPropagate = ($product->point ?? 0) * $quantity;
            if ($pointsToPropagate > 0) {
                $currentNode = $newNode;
                while ($currentNode->parent_id) {
                    $parent = Node::find($currentNode->parent_id);
                    if (!$parent) break;

                    // Prevent double counting for multi-accounts by only updating at the main node
                    $isMainNode = true;
                    if ($parent->parent_id) {
                        $grandpa = Node::find($parent->parent_id);
                        if ($grandpa && $grandpa->distributor_id === $parent->distributor_id) {
                            $isMainNode = false;
                        }
                    }

                    if ($isMainNode) {
                        $parentStat = Stat::firstOrCreate(['distributor_id' => $parent->distributor_id]);
                        if ($currentNode->leg <= 2) {
                            $parentStat->left_points  += $pointsToPropagate;
                        } else {
                            $parentStat->right_points += $pointsToPropagate;
                        }
                        $parentStat->save();
                    }

                    $currentNode = $parent;
                }
            }

            DB::commit();
            return $account;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Cycle Engine (Weekly)
     */
    public function runCycleEngine($distributorId)
    {
        $stat = Stat::where('distributor_id', $distributorId)->first();
        if (!$stat) return ['cycles' => 0, 'earnings' => 0];

        $wallet = Wallet::where('distributor_id', $distributorId)->first();
        if (!$wallet) return ['cycles' => 0, 'earnings' => 0];

        $accounts = Account::where('distributor_id', $distributorId)->with('product')->get();
        if ($accounts->isEmpty()) return ['cycles' => 0, 'earnings' => 0];

        $bestCycleRate = 0;
        $bestWeeklyCap = 0;
        foreach ($accounts as $acc) {
            if ($acc->product) {
                if ($acc->product->cycle_rate > $bestCycleRate) $bestCycleRate = $acc->product->cycle_rate;
                if ($acc->product->weekly_cap > $bestWeeklyCap) $bestWeeklyCap = $acc->product->weekly_cap;
            }
        }
        
        $totalLeft = $stat->left_points + $stat->carry_left;
        $totalRight = $stat->right_points + $stat->carry_right;

        $cycles = floor(min($totalLeft, $totalRight) / 600);
        
        if ($cycles > 0) {
            $earnings = $cycles * $bestCycleRate;
            $cap = $bestWeeklyCap;

            if ($wallet->weekly_earnings + $earnings > $cap) {
                $earnings = $cap - $wallet->weekly_earnings;
            }

            $usedPoints = $cycles * 600;
            
            $stat->carry_left = $totalLeft - $usedPoints;
            $stat->carry_right = $totalRight - $usedPoints;
            $stat->left_points = 0;
            $stat->right_points = 0;
            $stat->save();

            if ($earnings > 0) {
                $wallet->balance += $earnings;
                $wallet->weekly_earnings += $earnings;
                $wallet->total_earned += $earnings;
                $wallet->save();

                \App\Models\Distributor::where('distributor_id', $distributorId)
                    ->increment('income_weekly', $earnings);
                \App\Models\Distributor::where('distributor_id', $distributorId)
                    ->increment('income_monthly', $earnings);
                \App\Models\Distributor::where('distributor_id', $distributorId)
                    ->increment('income_yearly', $earnings);

                $distributor = \App\Models\Distributor::where('distributor_id', $distributorId)->first();
                $highestAcc = $accounts->sortByDesc(fn($a) => $a->product->cycle_rate ?? 0)->first();

                \App\Models\Payment::create([
                    'product_id'        => $highestAcc ? $highestAcc->product_id : 1,
                    'distributor_id'    => $distributorId,
                    'customer_name'     => 'Cycle Bonus (' . $cycles . ' cycles)',
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
        return ['cycles' => 0, 'earnings' => 0];
    }

    /**
     * Rank Engine
     */
    public function runRankCheck($distributorId)
    {
        $stat = Stat::where('distributor_id', $distributorId)->first();
        if (!$stat) return;

        $totalPoints = $stat->left_points + $stat->right_points + $stat->carry_left + $stat->carry_right;
        
        $node = Node::where('distributor_id', $distributorId)->first();
        if (!$node) return;

        $legRanks = [];
        foreach ($node->children as $child) {
            $legRanks[$child->leg] = $this->getHighestRankInSubtree($child->id);
        }

        $currentRank = $stat->rank ?: 'CT';
        $newRank = $currentRank;

        // MT
        if ($this->countLegsWithPoints($node, 200) >= 4 && $totalPoints >= 5000) {
            $newRank = 'MT';
        }
        // TT
        if ($this->countLegsWithRank($legRanks, 'MT') >= 2 && $totalPoints >= 10000) {
            $newRank = 'TT';
        }
        // NTB
        if ($this->countLegsWithRank($legRanks, 'TT') >= 4 && $totalPoints >= 50000) {
            $newRank = 'NTB';
        }
        // IBB
        if ($this->countLegsWithRank($legRanks, 'NTB') >= 4 && $totalPoints >= 200000) {
            $newRank = 'IBB';
        }
        // GEB -> Crown Achiever (CA)
        if ($this->countLegsWithRank($legRanks, 'IBB') >= 4 && $totalPoints >= 800000) {
            $newRank = 'CA'; // GEB becomes CA
        }
        
        // Multiple GEB lines -> Crown Award (C_AWARD)
        if ($this->countLegsWithRank($legRanks, 'GEB') >= 2) {
            $newRank = 'C_AWARD';
        }
        
        // 4 CA lines -> Alpha Legend (AL)
        if ($this->countLegsWithRank($legRanks, 'CA') >= 4) {
            $newRank = 'AL';
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

    private function payRankBonus($distributorId, $oldRank, $newRank)
    {
        $ranks = ['CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8];
        $oldScore = $ranks[$oldRank] ?? 0;
        $newScore = $ranks[$newRank] ?? 0;
        
        $bonuses = [
            'CA' => 50000,
            'C_AWARD' => 100000,
            'AL' => 500000
        ];

        $totalBonus = 0;
        foreach ($bonuses as $rankName => $amount) {
            $rankScore = $ranks[$rankName];
            if ($oldScore < $rankScore && $newScore >= $rankScore) {
                $totalBonus += $amount;
            }
        }

        if ($totalBonus > 0) {
            $wallet = Wallet::firstOrCreate(['distributor_id' => $distributorId]);
            $wallet->balance += $totalBonus;
            $wallet->total_earned += $totalBonus;
            $wallet->save();

            $dist = Distributor::where('distributor_id', $distributorId)->first();
            if ($dist) {
                $dist->income_monthly += $totalBonus;
                $dist->income_yearly += $totalBonus;
                $dist->save();
            }

            \App\Models\Payment::create([
                'product_id'        => 1,
                'distributor_id'    => $distributorId,
                'customer_name'     => 'Rank Achievement Bonus (' . $newRank . ')',
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

    private function getHighestRankInSubtree($nodeId)
    {
        $ranks = ['CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8];
        $highest = 0;
        $highestRank = 'CT';

        $queue = [$nodeId];
        while (!empty($queue)) {
            $currId = array_shift($queue);
            $currNode = Node::find($currId);
            if (!$currNode) continue;

            $stat = Stat::where('distributor_id', $currNode->distributor_id)->first();
            if ($stat && $stat->rank) {
                if (isset($ranks[$stat->rank]) && $ranks[$stat->rank] > $highest) {
                    $highest = $ranks[$stat->rank];
                    $highestRank = $stat->rank;
                }
            }
            foreach ($currNode->children as $child) {
                $queue[] = $child->id;
            }
        }
        return $highestRank;
    }

    private function countLegsWithRank($legRanks, $requiredRank)
    {
        $ranks = ['CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8];
        $reqScore = $ranks[$requiredRank] ?? 0;
        $count = 0;
        foreach ($legRanks as $rank) {
            if ($rank && isset($ranks[$rank]) && $ranks[$rank] >= $reqScore) {
                $count++;
            }
        }
        return $count;
    }

    private function countLegsWithPoints($node, $minPoints)
    {
        $count = 0;
        foreach ($node->children as $child) {
            $pts = $this->getPointsInSubtree($child->id);
            if ($pts >= $minPoints) {
                $count++;
            }
        }
        return $count;
    }

    private function getPointsInSubtree($nodeId)
    {
        $total = 0;
        $queue = [$nodeId];
        while (!empty($queue)) {
            $currId = array_shift($queue);
            $currNode = Node::find($currId);
            if (!$currNode) continue;
            
            // Fetch points from accounts mapped to this node
            $account = Account::where('node_id', $currNode->id)->with('product')->first();
            if ($account && $account->product) {
                $total += $account->product->point ?? 0;
            }
            
            foreach ($currNode->children as $child) {
                $queue[] = $child->id;
            }
        }
        return $total;
    }
}
