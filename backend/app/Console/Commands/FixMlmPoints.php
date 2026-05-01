<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Distributor;
use App\Models\Stat;
use App\Models\Node;
use App\Models\Account;

class FixMlmPoints extends Command
{
    protected $signature = 'mlm:fix-points';
    protected $description = 'Recalculates left and right points for all distributors based on the current tree structure.';

    public function handle()
    {
        $this->info('Starting point recalculation...');

        $distributors = Distributor::all();

        foreach ($distributors as $dist) {
            $stat = Stat::firstOrCreate(['distributor_id' => $dist->distributor_id]);
            
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
                $pts = $this->getPointsInSubtree($child->id);
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
            
            $this->line("Fixed Distributor {$dist->name} ({$dist->email}): Left = {$leftPts}, Right = {$rightPts}");
        }

        $this->info('Recalculation complete!');
    }

    private function getPointsInSubtree($nodeId)
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
}
