<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Distributor;
use App\Services\MlmEngineService;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class RunWeeklyMlmFlow extends Command
{
    protected $signature    = 'mlm:weekly-flow';
    protected $description  = 'Runs weekly rank checks and resets weekly earnings.';

    public function handle(MlmEngineService $mlmEngine)
    {
        $this->info('Starting Weekly MLM Flow...');

        $distributors = Distributor::all();
        $bar = $this->output->createProgressBar(count($distributors));

        foreach ($distributors as $distributor) {
            DB::beginTransaction();
            try {
                // Run rank check (uses live subtree volume)
                $mlmEngine->runRankCheck($distributor->distributor_id);

                // Reset weekly earnings
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
