<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$accounts = App\Models\Account::all();
echo "Total accounts: " . $accounts->count() . PHP_EOL;

$distributors = App\Models\Distributor::all();
foreach ($distributors as $d) {
    echo "Distributor: {$d->name} (ID: {$d->distributor_id}), Accounts: " . $d->accounts()->count() . PHP_EOL;
}
