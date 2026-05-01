<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$distributor = App\Models\Distributor::where('name', 'like', '%Abebe%')->first();
if ($distributor) {
    echo 'Distributor ID: ' . $distributor->distributor_id . PHP_EOL;
    $accounts = App\Models\Account::where('distributor_id', $distributor->distributor_id)->with('product')->get();
    echo 'Accounts count: ' . $accounts->count() . PHP_EOL;
    foreach($accounts as $acc) {
        echo 'Product ID: ' . $acc->product_id . ', Rate: ' . ($acc->product ? $acc->product->referral_rate : 'null') . PHP_EOL;
    }
} else {
    echo 'No distributor named Abebe found.' . PHP_EOL;
}
