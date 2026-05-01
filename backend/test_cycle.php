<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$account = App\Models\Account::first();
if (!$account) {
    echo "No accounts found." . PHP_EOL;
    exit;
}

$distributorId = $account->distributor_id;
$wallet = App\Models\Wallet::firstOrCreate(['distributor_id' => $distributorId]);
$stat = App\Models\Stat::firstOrCreate(['distributor_id' => $distributorId]);

$stat->left_points = 1000;
$stat->right_points = 1000;
$stat->save();

$mlm = app(App\Services\MlmEngineService::class);
echo "Before balance: " . $wallet->balance . PHP_EOL;
$mlm->runCycleEngine($distributorId);
$wallet->refresh();
echo "After balance: " . $wallet->balance . PHP_EOL;
