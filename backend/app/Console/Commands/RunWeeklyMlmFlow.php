<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Distributor;
use App\Services\MlmEngineService;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class RunWeeklyMlmFlow extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mlm:weekly-flow';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Runs weekly rank checks and resets weekly earnings. Does NOT run the cycle engine — distributors must trigger that manually via the Earnings screen.';

    /**
     * Execute the console command.
     */
    public function handle(MlmEngineService $mlmEngine)
    {
        $this->info('Starting Weekly MLM Flow...');

        $distributors = Distributor::all();
        $bar = $this->output->createProgressBar(count($distributors));

        foreach ($distributors as $distributor) {
            DB::beginTransaction();
            try {
                // 1. Run Rank Check (uses live subtree volume — no stored left/right points)
                $mlmEngine->runRankCheck($distributor->distributor_id);

                // 2. Reset Weekly Earnings
                $wallet = Wallet::where('distributor_id', $distributor->distributor_id)->first();
                if ($wallet) {
                    $wallet->weekly_earnings = 0;
                    $wallet->save();
                }

                // NOTE: Cycle engine is intentionally NOT run here.
                // Distributors must click "Run Cycle Engine" in the Earnings screen.

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                $this->error('Error processing distributor ' . $distributor->distributor_id . ': ' . $e->getMessage());
            }
            $bar->advance();
        }

        $bar->finish();
        $this->info("\nWeekly MLM Flow completed successfully.");
    }
}
