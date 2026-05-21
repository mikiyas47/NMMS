<?php

namespace App\Services;

use App\Models\Distributor;
use App\Models\Node;
use App\Models\Account;
use App\Models\Product;
use App\Models\Wallet;
use App\Models\Stat;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MlmEngineService
{
    // ─── Evaluation Cache ───────────────────────────────────────────────────
    protected $cachedAllNodes = null;
    protected $cachedAllStats = null;

    protected function preloadEvaluationData($force = false)
    {
        if ($this->cachedAllNodes === null || $force) {
            $this->cachedAllNodes = Node::all()->keyBy('id');
            $this->cachedAllStats = Stat::all()->keyBy('distributor_id');
        }
    }

    protected function clearEvaluationData()
    {
        $this->cachedAllNodes = null;
        $this->cachedAllStats = null;
    }

    /**
     * Self-purchase / Upgrade - adds accounts to an existing distributor.
     */
    public function processPurchase($distributorId, $productId, $sponsorId = null, $quantity = 1, $preferredLeg = null)
    {
        DB::beginTransaction();
        try {
            $distributor = Distributor::where('distributor_id', $distributorId)->firstOrFail();
            $product     = Product::findOrFail($productId);

            Wallet::firstOrCreate(['distributor_id' => $distributorId]);
            Stat::firstOrCreate(['distributor_id'   => $distributorId]);

            $mainNode = Node::where('distributor_id', $distributorId)->orderBy('id')->first();

            $nodes = [];
            for ($i = 0; $i < $quantity; $i++) {
                $placementNode = null;
                $leg = null;

                if (!$mainNode) {
                    $companyRoot = Node::whereNull('parent_id')->first();
                    if ($companyRoot) {
                        $placementNode = $this->findPlacementNode($companyRoot->id);
                        if (!$placementNode) {
                            throw new \Exception("No placement slot found in tree for new distributor {$distributorId}.");
                        }
                        $leg = $this->calculateNextLeg($placementNode->id);
                    } else {
                        // Creating the very first node in the system
                        $newNode = Node::create(['parent_id' => null, 'distributor_id' => $distributorId, 'leg' => 1]);
                        $mainNode = $newNode;
                    }
                } else {
                    if ($i === 0 && $preferredLeg) {
                        $existingLegChild = Node::where('parent_id', $mainNode->id)->where('leg', $preferredLeg)->first();
                        if ($existingLegChild) {
                            $placementNode = $this->findPlacementNode($existingLegChild->id);
                            if (!$placementNode) {
                                throw new \Exception("No placement slot found under preferred leg {$preferredLeg} for distributor {$distributorId}.");
                            }
                            $leg = $this->calculateNextLeg($placementNode->id);
                        } else {
                            $placementNode = $mainNode;
                            $leg = $preferredLeg;
                        }
                    } else {
                        $placementNode = $this->findPlacementNode($mainNode->id);
                        if (!$placementNode) {
                            throw new \Exception("No placement slot found under main node for distributor {$distributorId}.");
                        }
                        $leg = $this->calculateNextLeg($placementNode->id);
                    }
                }

                if ($placementNode) {
                    $newNode = Node::create([
                        'parent_id'      => $placementNode->id,
                        'distributor_id' => $distributorId,
                        'leg'            => $leg,
                    ]);
                    if (!$mainNode) $mainNode = $newNode;
                } else {
                    $newNode = $mainNode;
                }

                Account::create([
                    'distributor_id' => $distributorId,
                    'node_id'        => $newNode->id,
                    'product_id'     => $productId,
                    'sponsor_id'     => $sponsorId,
                ]);

                $nodes[] = $newNode;
            }

            // Mark distributor as paid
            $distributor->update(['is_paid' => true, 'status' => 'active']);

            DB::commit();

            $this->refreshOwnPoints($distributorId);
            $this->runRankCheck($distributorId);
            if (!empty($nodes)) {
                $this->runRankCheckForAncestors($nodes[0], $distributorId);
            }

            return $nodes[0] ?? null;
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('MLM processPurchase Error: ' . $e->getMessage(), [
                'distributor_id' => $distributorId,
                'product_id' => $productId,
                'file' => $e->getFile() . ':' . $e->getLine(),
            ]);
            throw $e;
        }
    }

    /**
     * Customer referral purchase - creates a NEW distributor (inactive).
     */
    public function processCustomerPurchase($distributorId, $productId, $customerName, $customerEmail, $customerPhone, $quantity = 1, $preferredLeg = null)
    {
        DB::beginTransaction();
        try {
            $product = Product::findOrFail($productId);
            
            // Check if customer already exists
            $newDist = Distributor::whereRaw('LOWER(TRIM(email)) = ?', [strtolower(trim($customerEmail))])->first();
            if (!$newDist) {
                $newDist = Distributor::create([
                    'name'      => $customerName,
                    'email'     => $customerEmail,
                    'phone'     => $customerPhone,
                    'password'  => bcrypt('password'),
                    'upline_id' => $distributorId,
                    'is_paid'   => false,
                    'status'    => 'customer',
                    'join_date' => now(),
                ]);
            }

            $sponsorNode = Node::where('distributor_id', $distributorId)->orderBy('id', 'asc')->first();
            if (!$sponsorNode) {
                $sponsorNode = Node::whereNull('parent_id')->first();
            }
            if (!$sponsorNode) throw new \Exception("Tree root not found.");

            $nodes = [];
            for ($i = 0; $i < $quantity; $i++) {
                $placementNode = null;
                $leg = null;

                if ($i === 0 && $preferredLeg) {
                    $existingLegChild = Node::where('parent_id', $sponsorNode->id)->where('leg', $preferredLeg)->first();
                    if ($existingLegChild) {
                        $placementNode = $this->findPlacementNode($existingLegChild->id);
                        if (!$placementNode) {
                            throw new \Exception("No placement slot found under preferred leg {$preferredLeg}.");
                        }
                        $leg = $this->calculateNextLeg($placementNode->id);
                    } else {
                        $placementNode = $sponsorNode;
                        $leg = $preferredLeg;
                    }
                } else {
                    $placementNode = $this->findPlacementNode($sponsorNode->id);
                    if (!$placementNode) {
                        throw new \Exception("No placement slot found under sponsor node.");
                    }
                    $leg = $this->calculateNextLeg($placementNode->id);
                }

                if (!$placementNode) throw new \Exception("No placement slot found.");

                $newNode = Node::create([
                    'parent_id'      => $placementNode->id,
                    'distributor_id' => $newDist->distributor_id,
                    'leg'            => $leg,
                ]);

                Account::create([
                    'distributor_id' => $newDist->distributor_id,
                    'node_id'        => $newNode->id,
                    'product_id'     => $productId,
                    'sponsor_id'     => $distributorId,
                ]);
                
                $nodes[] = $newNode;
            }

            // Pay referral commission (once per purchase event)
            $this->payReferralCommission($distributorId, $product, $quantity);

            DB::commit();

            $this->refreshOwnPoints($newDist->distributor_id);
            $this->runRankCheck($newDist->distributor_id);
            if (!empty($nodes)) {
                $this->runRankCheckForAncestors($nodes[0], $distributorId);
            }

            return $nodes[0] ?? null;
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('MLM processCustomerPurchase Error: ' . $e->getMessage(), [
                'distributor_id' => $distributorId,
                'product_id' => $productId,
                'file' => $e->getFile() . ':' . $e->getLine(),
            ]);
            throw $e;
        }
    }

    private function payReferralCommission($sponsorId, $product, $quantity)
    {
        $sponsorAccounts = Account::where('distributor_id', $sponsorId)->with('product')->get();
        $rate = 10;
        foreach ($sponsorAccounts as $acc) {
            if ($acc->product && $acc->product->referral_rate > $rate) {
                $rate = $acc->product->referral_rate;
            }
        }
        $commission = ($rate / 100) * ($product->point ?? 0) * $quantity;
        if ($commission > 0) {
            $wallet = Wallet::firstOrCreate(['distributor_id' => $sponsorId]);
            $wallet->balance      += $commission;
            $wallet->total_earned += $commission;
            $wallet->save();
        }
    }

    public function findPlacementNode($rootNodeId)
    {
        $queue = new \SplQueue();
        $queue->enqueue($rootNodeId);

        $allNodes    = Node::all()->keyBy('id');
        $childrenMap = [];
        foreach ($allNodes as $node) {
            if ($node->parent_id !== null) {
                $childrenMap[$node->parent_id][] = $node->id;
            }
        }

        while (!$queue->isEmpty()) {
            $currentId = $queue->dequeue();
            $childIds  = collect($childrenMap[$currentId] ?? []);

            if ($childIds->count() < 4) {
                return $allNodes->get($currentId);
            }

            for ($leg = 1; $leg <= 4; $leg++) {
                $child = $childIds->filter(fn($id) => $allNodes->get($id)->leg == $leg)->first();
                if ($child) $queue->enqueue($child);
            }
        }
        return null;
    }

    private function calculateNextLeg($nodeId)
    {
        $existingLegs = Node::where('parent_id', $nodeId)->pluck('leg')->toArray();
        for ($leg = 1; $leg <= 4; $leg++) {
            if (!in_array($leg, $existingLegs)) {
                return $leg;
            }
        }
        return 4; // Fallback
    }

    public function runRankCheck($distributorId)
    {
        $this->preloadEvaluationData(true);
        try {
            $stat = $this->cachedAllStats->get($distributorId);
            if (!$stat) {
                $stat = Stat::firstOrCreate(['distributor_id' => $distributorId]);
                $this->cachedAllStats->put($distributorId, $stat);
            }

            $myNodes = $this->cachedAllNodes->filter(fn($n) => $n->distributor_id == $distributorId)->sortBy('id');
            if ($myNodes->isEmpty()) return;

            $mainNode = $myNodes->first();
            $mainNewRank = null;

            foreach ($myNodes as $node) {
                $newRank = $this->evaluateNodeRank($node, $stat);
                if ($newRank !== ($node->rank ?? 'CT')) {
                    Node::where('id', $node->id)->update(['rank' => $newRank]);
                    $node->rank = $newRank;
                }
                if ($node->id === $mainNode->id) $mainNewRank = $newRank;
            }

            if ($mainNewRank) {
                $dist = Distributor::find($distributorId);
                if ($dist && $dist->rank !== $mainNewRank) {
                    $oldRank = $dist->rank;
                    $dist->rank = $mainNewRank;
                    $dist->save();
                    $stat->rank = $mainNewRank;
                    $stat->save();
                    $this->payRankBonus($distributorId, $oldRank, $mainNewRank);
                }
            }
        } finally {
            $this->clearEvaluationData();
        }
    }

    public function runRankCheckForAncestors($node, $distributorId = null)
    {
        $this->preloadEvaluationData(true);
        try {
            $curr = $node;
            $visited = [];
            while ($curr && $curr->parent_id && !isset($visited[$curr->id])) {
                $visited[$curr->id] = true;
                $parentNode = $this->cachedAllNodes->get($curr->parent_id);
                if ($parentNode) {
                    $this->evaluateAndSaveNodeRank($parentNode);
                    $curr = $parentNode;
                } else break;
            }
        } finally {
            $this->clearEvaluationData();
        }
    }

    private function evaluateAndSaveNodeRank($node)
    {
        $stat = $this->cachedAllStats->get($node->distributor_id);
        if (!$stat) {
            $stat = Stat::firstOrCreate(['distributor_id' => $node->distributor_id]);
            $this->cachedAllStats->put($node->distributor_id, $stat);
        }

        $newRank = $this->evaluateNodeRank($node, $stat);
        if ($newRank !== ($node->rank ?? 'CT')) {
            Node::where('id', $node->id)->update(['rank' => $newRank]);
            $node->rank = $newRank;

            $mainNodeId = $this->cachedAllNodes->filter(fn($n) => $n->distributor_id == $node->distributor_id)->sortBy('id')->first()?->id;
            if ($node->id === $mainNodeId) {
                $dist = Distributor::find($node->distributor_id);
                if ($dist && $dist->rank !== $newRank) {
                    $oldRank = $dist->rank;
                    $dist->rank = $newRank;
                    $dist->save();
                    $stat->rank = $newRank;
                    $stat->save();
                    $this->payRankBonus($node->distributor_id, $oldRank, $newRank);
                }
            }
        }
    }

    private function evaluateNodeRank($node, $stat): string
    {
        $this->preloadEvaluationData();
        $totalVol = $this->getSubtreeVolume($node->id);
        $ownPts   = (int)($stat->own_points ?? 0);

        $mainNodeId = $this->cachedAllNodes->filter(fn($n) => $n->distributor_id == $node->distributor_id)->sortBy('id')->first()?->id;
        $isMain     = ($mainNodeId === $node->id);

        $directLegs = $this->cachedAllNodes->filter(fn($n) => $n->parent_id == $node->id)->keyBy('leg');
        $legPoints  = [];
        $legRanks   = [];
        for ($i = 1; $i <= 4; $i++) {
            $ln = $directLegs->get($i);
            $legPoints[$i] = $ln ? $this->getSubtreeVolume($ln->id) : 0;
            $legRanks[$i]  = $ln ? $this->getHighestRankInSubtree($ln->id) : 'CT';
        }

        $ntt = collect($legRanks)->filter(fn($r) => $this->rankVal($r) >= $this->rankVal('NTB'))->count();
        $tt  = collect($legRanks)->filter(fn($r) => $this->rankVal($r) >= $this->rankVal('TT'))->count();
        $mt  = collect($legRanks)->filter(fn($r) => $this->rankVal($r) >= $this->rankVal('MT'))->count();
        $ct  = collect($legPoints)->filter(fn($p) => $p > 0)->count();

        if ($totalVol >= 2560000 && $ntt >= 2 && $tt >= 1) return 'CA';
        if ($totalVol >= 640000 && $tt >= 2) return 'IBB';
        if ($totalVol >= 160000 && $mt >= 2) return 'NTB';
        if ($totalVol >= 40000 && $ct >= 2) return 'TT';
        if ($totalVol >= 10000) return 'MT';

        return 'CT';
    }

    private function rankVal($r): int
    {
        $v = ['CT'=>1, 'MT'=>2, 'TT'=>3, 'NTB'=>4, 'IBB'=>5, 'GEB'=>6, 'CA'=>7];
        return $v[$r] ?? 0;
    }

    public function getSubtreeVolume(int $nodeId): int
    {
        $this->preloadEvaluationData();
        $total = 0;
        $q = new \SplQueue();
        $q->enqueue($nodeId);
        
        $cMap = [];
        foreach ($this->cachedAllNodes as $n) {
            if ($n->parent_id !== null) $cMap[$n->parent_id][] = $n->id;
        }

        while (!$q->isEmpty()) {
            $currId = $q->dequeue();
            if ($currId !== $nodeId) {
                $n = $this->cachedAllNodes->get($currId);
                if ($n) {
                    $s = $this->cachedAllStats->get($n->distributor_id);
                    $total += (int)($s->own_points ?? 0);
                }
            }
            foreach ($cMap[$currId] ?? [] as $cid) $q->enqueue($cid);
        }
        return $total;
    }

    public function getHighestRankInSubtree(int $nodeId): string
    {
        $this->preloadEvaluationData();
        $high = 'CT';
        $q = new \SplQueue();
        $q->enqueue($nodeId);
        
        $cMap = [];
        foreach ($this->cachedAllNodes as $n) {
            if ($n->parent_id !== null) $cMap[$n->parent_id][] = $n->id;
        }

        while (!$q->isEmpty()) {
            $currId = $q->dequeue();
            $n = $this->cachedAllNodes->get($currId);
            if ($n) {
                if ($this->rankVal($n->rank ?? 'CT') > $this->rankVal($high)) $high = $n->rank;
            }
            foreach ($cMap[$currId] ?? [] as $cid) $q->enqueue($cid);
        }
        return $high;
    }

    public function refreshOwnPoints($distributorId)
    {
        // When calculating own account commission/points, the main account 
        // should not be considered. Only additional (self-purchased) accounts count.
        $accounts = Account::where('distributor_id', $distributorId)
            ->join('products', 'accounts.product_id', '=', 'products.id')
            ->orderBy('accounts.id', 'asc')
            ->get(['products.point']);

        // Remove the first account (Main Account)
        $accounts->shift();

        $total = $accounts->sum('point');

        Stat::updateOrCreate(['distributor_id' => $distributorId], ['own_points' => $total]);
    }

    private function payRankBonus($distId, $old, $new)
    {
        Log::info("Rank Up: $distId from $old to $new");
    }
}
