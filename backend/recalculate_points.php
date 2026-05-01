<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Distributor;
use App\Models\Stat;
use App\Models\Node;
use App\Models\Account;

echo "Starting point recalculation...\n";

$distributors = Distributor::all();

foreach ($distributors as $dist) {
    $stat = Stat::firstOrCreate(['distributor_id' => $dist->distributor_id]);
    
    // Find MAIN node
    $mainNode = Node::where('distributor_id', $dist->distributor_id)
        ->orderBy('id', 'asc')
        ->first();
        
    if (!$mainNode) {
        $stat->update(['left_points' => 0, 'right_points' => 0]);
        continue;
    }
    
    $leftPts = 0;
    $rightPts = 0;
    
    foreach ($mainNode->children as $child) {
        $pts = getPointsInSubtree($child->id);
        if ($child->leg == 1 || $child->leg == 2) {
            $leftPts += $pts;
        } else {
            $rightPts += $pts;
        }
    }
    
    $stat->update([
        'left_points' => $leftPts,
        'right_points' => $rightPts
    ]);
    
    echo "Distributor {$dist->name} ({$dist->email}): Left = {$leftPts}, Right = {$rightPts}\n";
}

echo "Recalculation complete!\n";

function getPointsInSubtree($nodeId)
{
    $total = 0;
    $queue = [$nodeId];
    while (!empty($queue)) {
        $currId = array_shift($queue);
        $currNode = Node::find($currId);
        if (!$currNode) continue;
        
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
