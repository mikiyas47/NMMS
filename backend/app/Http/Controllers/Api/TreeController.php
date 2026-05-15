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

        $rootNode = Node::where('distributor_id', $distributorId)->first();
        if (!$rootNode) {
            return response()->json(['message' => 'No tree found. You have not purchased a product yet.'], 404);
        }

        $tree = $this->buildTree($rootNode->id, 3); // Load up to 3 levels deep initially

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
        $tree = $this->buildTree($node->id, 2);

        return response()->json([
            'status' => 'success',
            'tree'   => $tree,
        ]);
    }

    private function buildTree($nodeId, $depth)
    {
        if ($depth < 0) return null;

        $node = Node::with(['distributor', 'children'])->find($nodeId);
        if (!$node) return null;

        $stat = Stat::where('distributor_id', $node->distributor_id)->first();

        // own_points = sum of product.point for all accounts this node's distributor owns
        $account       = Account::where('node_id', $node->id)->with('product')->first();
        $productPoints = $account && $account->product ? $account->product->point : 0;

        $childrenData = [];
        if ($depth > 0) {
            foreach ($node->children as $child) {
                $childrenData[] = $this->buildTree($child->id, $depth - 1);
            }
        }

        return [
            'id'               => $node->id,
            'distributor_name' => $node->distributor->name  ?? 'Unknown',
            'distributor_email'=> $node->distributor->email ?? 'Unknown',
            'distributor_phone'=> $node->distributor->phone ?? 'Unknown',
            'distributor_id'   => $node->distributor_id,
            'leg'              => $node->leg,
            // Each node has its own rank — secondary nodes start at CT and earn independently
            'rank'             => $node->rank ?? 'CT',
            'status'           => $node->distributor->status ?? 'inactive',
            'product_points'   => $productPoints,
            'own_points'       => $stat->own_points ?? $productPoints,
            'children'         => $childrenData,
            'has_more'         => $node->children->count() > 0 && $depth == 0,
        ];
    }
}
