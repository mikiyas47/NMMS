<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$distributor = App\Models\Distributor::first();
if ($distributor) {
    $wallet = App\Models\Wallet::firstOrCreate(['distributor_id' => $distributor->distributor_id]);
    echo "Before Balance: " . ($wallet->balance ?? 'NULL') . PHP_EOL;
    $wallet->balance += 150;
    $wallet->save();
    $wallet->refresh();
    echo "After Balance: " . ($wallet->balance ?? 'NULL') . PHP_EOL;
} else {
    echo "No distributor found." . PHP_EOL;
}
