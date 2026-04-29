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
    public function processPurchase($distributorId, $productId, $sponsorId = null)
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
                $sponsorProduct = Account::where('distributor_id', $sponsorId)->with('product')->first()?->product;
                if ($sponsorProduct) {
                    // Use sponsor's referral rate and sold product's point
                    $rate = $sponsorProduct->referral_rate ?? 0.10;
                    $points = $product->point ?? 0;
                    $commission = $rate * $points;
                    
                    if ($commission > 0) {
                        $sponsorWallet = Wallet::firstOrCreate(['distributor_id' => $sponsorId]);
                        $sponsorWallet->balance += $commission;
                        $sponsorWallet->total_earned += $commission;
                        $sponsorWallet->save();
                    }
                }
            }

            // C. Points Propagation Engine
            $pointsToPropagate = $product->point ?? 0;
            if ($pointsToPropagate > 0) {
                $currentNode = $newNode;
                while ($currentNode->parent_id) {
                    $parent = Node::find($currentNode->parent_id);
                    if (!$parent) break;
                    
                    $parentStat = Stat::firstOrCreate(['distributor_id' => $parent->distributor_id]);
                    
                    if ($currentNode->leg == 1 || $currentNode->leg == 2) {
                        $parentStat->left_points += $pointsToPropagate;
                    } else {
                        $parentStat->right_points += $pointsToPropagate;
                    }
                    $parentStat->save();
                    
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
     * Process a CUSTOMER purchase.
     * Creates a new distributor account for the customer and places them in the tree under the referring distributor.
     */
    public function processCustomerPurchase($distributorId, $productId, $customerName, $customerEmail, $customerPhone)
    {
        // 1. Create a distributor account for the customer
        $newDist = Distributor::firstOrCreate(
            ['email' => $customerEmail],
            [
                'name' => $customerName,
                'phone' => $customerPhone,
                'password' => bcrypt('password123'),
                'join_date' => now(),
            ]
        );

        // 2. Treat this exactly like a standard purchase by the new distributor, sponsored by the referring distributor
        return $this->processPurchase($newDist->distributor_id, $productId, $distributorId);
    }

    /**
     * Cycle Engine (Weekly)
     */
    public function runCycleEngine($distributorId)
    {
        $stat = Stat::where('distributor_id', $distributorId)->first();
        if (!$stat) return;

        $wallet = Wallet::where('distributor_id', $distributorId)->first();
        if (!$wallet) return;

        $account = Account::where('distributor_id', $distributorId)->with('product')->first();
        if (!$account || !$account->product) return;

        $product = $account->product;
        
        $totalLeft = $stat->left_points + $stat->carry_left;
        $totalRight = $stat->right_points + $stat->carry_right;

        $cycles = floor(min($totalLeft, $totalRight) / 600);
        
        if ($cycles > 0) {
            $earnings = $cycles * ($product->cycle_rate ?? 50); // Default $50 per cycle
            $cap = $product->weekly_cap ?? 5000;

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
            }
        }
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

        $newRank = $stat->rank;

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
        // GEB
        if ($this->countLegsWithRank($legRanks, 'IBB') >= 4 && $totalPoints >= 800000) {
            $newRank = 'GEB';
        }

        if ($newRank !== $stat->rank) {
            $stat->rank = $newRank;
            $stat->save();
        }
    }

    private function getHighestRankInSubtree($nodeId)
    {
        $ranks = ['MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5];
        $highest = 0;
        $highestRank = null;

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
        $ranks = ['MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5];
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
