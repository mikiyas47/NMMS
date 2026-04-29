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
    protected $description = 'Runs the weekly cycle engine, rank checks, and resets weekly earnings.';

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
                // 1. Run Cycle Engine
                $mlmEngine->runCycleEngine($distributor->distributor_id);

                // 2. Run Rank Check
                $mlmEngine->runRankCheck($distributor->distributor_id);

                // 3. Reset Weekly Earnings
                $wallet = Wallet::where('distributor_id', $distributor->distributor_id)->first();
                if ($wallet) {
                    $wallet->weekly_earnings = 0;
                    $wallet->save();
                }

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
