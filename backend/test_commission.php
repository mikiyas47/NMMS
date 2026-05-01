<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Setup Abebe
$abebe = App\Models\Distributor::firstOrCreate(['email' => 'abebe@example.com'], [
    'name' => 'Abebe',
    'password' => 'password',
]);

// Setup Golden product (19% rate, 800 pts)
$golden = App\Models\Product::firstOrCreate(['category' => 'golden'], [
    'name' => 'Golden Package',
    'price' => 1000,
    'point' => 800,
    'referral_rate' => 19,
    'cycle_rate' => 15,
    'weekly_cap' => 5000,
]);

// Give Abebe a Golden Account
$node = App\Models\Node::firstOrCreate(['distributor_id' => $abebe->distributor_id], ['leg' => 1]);
App\Models\Account::firstOrCreate(['distributor_id' => $abebe->distributor_id, 'product_id' => $golden->id], ['node_id' => $node->id]);

// Abebe sells Green (400 pts, $410 price)
$green = App\Models\Product::firstOrCreate(['category' => 'green'], [
    'name' => 'Green Package',
    'price' => 410,
    'point' => 400,
    'referral_rate' => 18,
    'cycle_rate' => 14,
    'weekly_cap' => 4000,
]);

// Simulate PaymentController calculation
$sponsorAccounts = \App\Models\Account::where('distributor_id', $abebe->distributor_id)->with('product')->get();
$rate = 10;
foreach ($sponsorAccounts as $acc) {
    if ($acc->product && $acc->product->referral_rate > $rate) {
        $rate = $acc->product->referral_rate;
    }
}
$points = $green->point ?? 0;
$quantity = 1;
$commissionAmount = ($rate / 100) * $points * $quantity;

echo "Abebe's calculated referral rate: $rate%\n";
echo "Green package points: $points\n";
echo "Calculated Commission: $" . number_format($commissionAmount, 2) . "\n";
