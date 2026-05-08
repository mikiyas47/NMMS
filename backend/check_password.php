<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$raw = DB::table('users')->where('email', 'mikila@gmail.com')->first();
if (!$raw) {
    echo "User NOT found in DB\n";
    exit(1);
}
echo "Role: " . $raw->role . "\n";
echo "Status: " . $raw->status . "\n";
echo "Password hash: " . $raw->password . "\n";
echo "Hash::check match: " . (Hash::check('mikiyas', $raw->password) ? 'PASS ✓' : 'FAIL ✗') . "\n";
