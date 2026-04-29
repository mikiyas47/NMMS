<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Node;
use App\Models\Account;
use App\Models\Distributor;
use App\Models\Stat;
use Illuminate\Support\Facades\DB;

class TreeController extends Controller
{
    /**
     * Get the tree structure for the currently authenticated distributor
     */
    public function myTree(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $distributorId = $user->distributor_id ?? $user->id;

        // Find the root node for this distributor
        $rootNode = Node::where('distributor_id', $distributorId)->first();
        if (!$rootNode) {
            return response()->json(['message' => 'No tree found. You have not purchased a product yet.'], 404);
        }

        $tree = $this->buildTree($rootNode->id, 3); // Load up to 3 levels deep initially
        
        return response()->json([
            'status' => 'success',
            'tree' => $tree
        ]);
    }
    
    /**
     * Get the subtree for a specific node (for expanding deep branches)
     */
    public function getSubtree($nodeId)
    {
        $node = Node::findOrFail($nodeId);
        $tree = $this->buildTree($node->id, 2);
        
        return response()->json([
            'status' => 'success',
            'tree' => $tree
        ]);
    }

    private function buildTree($nodeId, $depth)
    {
        if ($depth < 0) return null;

        $node = Node::with(['distributor', 'children'])->find($nodeId);
        if (!$node) return null;

        $stat = Stat::where('distributor_id', $node->distributor_id)->first();
        
        $account = Account::where('node_id', $node->id)->with('product')->first();
        $productPoints = $account && $account->product ? $account->product->point : 0;
        
        $childrenData = [];
        if ($depth > 0) {
            foreach ($node->children as $child) {
                $childrenData[] = $this->buildTree($child->id, $depth - 1);
            }
        }

        return [
            'id' => $node->id,
            'distributor_name' => $node->distributor->name ?? 'Unknown',
            'distributor_email' => $node->distributor->email ?? 'Unknown',
            'distributor_phone' => $node->distributor->phone ?? 'Unknown',
            'distributor_id' => $node->distributor_id,
            'leg' => $node->leg,
            'rank' => $stat->rank ?? 'None',
            'product_points' => $productPoints,
            'left_points' => $stat->left_points ?? 0,
            'right_points' => $stat->right_points ?? 0,
            'total_points' => ($stat->left_points ?? 0) + ($stat->right_points ?? 0) + ($stat->carry_left ?? 0) + ($stat->carry_right ?? 0),
            'children' => $childrenData,
            'has_more' => $node->children->count() > 0 && $depth == 0
        ];
    }
}
