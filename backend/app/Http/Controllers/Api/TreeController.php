<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Node;
use App\Models\Account;
use App\Models\Distributor;
use App\Models\Stat;
use App\Services\MlmEngineService;
use Illuminate\Support\Facades\DB;

class TreeController extends Controller
{
    /**
     * GET /api/tree
     * Returns the tree structure for the authenticated distributor.
     * Each node shows own_points only — no stored left/right/team points.
     */
    public function myTree(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $distributorId = $user->distributor_id ?? $user->id;

        $rootNode = Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        if (!$rootNode) {
            return response()->json(['message' => 'No tree found. You have not purchased a product yet.'], 404);
        }

        $tree = $this->getOptimizedTree($rootNode->id, 3); // Load up to 3 levels deep initially

        return response()->json([
            'status' => 'success',
            'tree'   => $tree,
        ]);
    }

    /**
     * GET /api/tree/{nodeId}
     * Returns the subtree for a specific node (for expanding deep branches).
     */
    public function getSubtree($nodeId)
    {
        $node = Node::findOrFail($nodeId);
        $tree = $this->getOptimizedTree($node->id, 2);

        return response()->json([
            'status' => 'success',
            'tree'   => $tree,
        ]);
    }

    private function getOptimizedTree($rootNodeId, $depth)
    {
        // 1. Build eager load array dynamically based on depth
        // We go up to $depth + 1 for children so we can easily calculate has_more without N+1 count() queries.
        $with = ['distributor'];
        $currentChildRel = 'children';
        for ($i = 0; $i <= $depth; $i++) {
            $with[] = $currentChildRel;
            if ($i < $depth) {
                $with[] = $currentChildRel . '.distributor';
            }
            $currentChildRel .= '.children';
        }

        // 2. Fetch the root node with all nested children
        $rootNode = Node::with($with)->find($rootNodeId);
        if (!$rootNode) return null;

        // 3. Flatten the nodes to collect IDs for bulk fetching
        $allNodes = collect();
        $this->flattenNodes($rootNode, $allNodes, $depth);

        $nodeIds = $allNodes->pluck('id')->unique();
        $distributorIds = $allNodes->pluck('distributor_id')->unique();

        // 4. Bulk fetch Accounts with Products, and Stats
        $accounts = Account::whereIn('node_id', $nodeIds)->with('product')->get()->keyBy('node_id');
        $stats = Stat::whereIn('distributor_id', $distributorIds)->get()->keyBy('distributor_id');

        // 5. Map the in-memory tree to the response format
        return $this->mapNodeToResponse($rootNode, $depth, $accounts, $stats);
    }

    private function flattenNodes($node, &$collection, $depth)
    {
        if (!$node) return;
        $collection->push($node);
        if ($depth > 0 && $node->relationLoaded('children')) {
            foreach ($node->children as $child) {
                $this->flattenNodes($child, $collection, $depth - 1);
            }
        }
    }

    private function mapNodeToResponse($node, $depth, $accounts, $stats)
    {
        $stat = $stats->get($node->distributor_id);
        $account = $accounts->get($node->id);
        $productPoints = $account && $account->product ? $account->product->point : 0;

        $childrenData = [];
        if ($depth > 0 && $node->relationLoaded('children')) {
            foreach ($node->children as $child) {
                $childrenData[] = $this->mapNodeToResponse($child, $depth - 1, $accounts, $stats);
            }
        }

        // Calculate has_more using the loaded relation to prevent an extra query
        $hasMore = false;
        if ($depth == 0 && $node->relationLoaded('children')) {
            $hasMore = $node->children->count() > 0;
        }

        return [
            'id'               => $node->id,
            'distributor_name' => $node->distributor->name  ?? 'Unknown',
            'distributor_email'=> $node->distributor->email ?? 'Unknown',
            'distributor_phone'=> $node->distributor->phone ?? 'Unknown',
            'distributor_id'   => $node->distributor_id,
            'leg'              => $node->leg,
            'rank'             => $node->rank ?? 'CT',
            'status'           => $node->distributor->status ?? 'inactive',
            'product_points'   => $productPoints,
            'own_points'       => $stat->own_points ?? $productPoints,
            'children'         => $childrenData,
            'has_more'         => $hasMore,
        ];
    }
}
