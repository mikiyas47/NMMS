<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$nodes = App\Models\Node::all();
$fixed = 0;

foreach ($nodes as $node) {
    // Check if this distributor already has an account
    $hasAccount = App\Models\Account::where('distributor_id', $node->distributor_id)->exists();
    
    if (!$hasAccount) {
        // Try to find what product they bought
        $payment = App\Models\Payment::where('distributor_id', $node->distributor_id)
            ->whereNotNull('product_id')
            ->first();
            
        // Default to Golden Package (ID 3 or 4, we'll try to find 'golden')
        $productId = $payment ? $payment->product_id : null;
        if (!$productId) {
            $golden = App\Models\Product::where('category', 'golden')->first();
            $productId = $golden ? $golden->id : 1;
        }

        // Try to find sponsor (whoever's node is the parent, or if there's a referral)
        // For simplicity, we'll just leave sponsor_id null or extract from parent
        $sponsorId = null;
        if ($node->parent_id) {
            $parent = App\Models\Node::find($node->parent_id);
            if ($parent) {
                $sponsorId = $parent->distributor_id;
            }
        }

        App\Models\Account::create([
            'distributor_id' => $node->distributor_id,
            'node_id'        => $node->id,
            'product_id'     => $productId,
            'sponsor_id'     => $sponsorId,
        ]);
        
        $fixed++;
    }
}

echo "Successfully fixed and generated $fixed missing accounts for legacy tree data.\n";
