<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Stat;
use App\Models\Account;

class BackfillOwnPoints extends Command
{
    protected $signature   = 'mlm:backfill-own-points';
    protected $description = 'Backfill own_points for all distributors based on their purchased accounts';

    public function handle(): int
    {
        $stats = Stat::all();
        $bar   = $this->output->createProgressBar($stats->count());
        $bar->start();

        foreach ($stats as $stat) {
            $pts = Account::where('distributor_id', $stat->distributor_id)
                ->with('product')
                ->get()
                ->sum(fn($a) => $a->product->point ?? 0);

            $stat->own_points = $pts;
            $stat->save();
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Done. Updated {$stats->count()} distributor(s).");

        return self::SUCCESS;
    }
}
