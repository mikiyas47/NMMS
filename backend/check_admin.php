<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

$user = User::where('email', 'admin@nmms.com')->first();

if ($user) {
    echo "✅ User found!\n";
    echo "Email: " . $user->email . "\n";
    echo "Name: " . $user->name . "\n";
    echo "Role: " . $user->role . "\n";
    echo "Status: " . $user->status . "\n";
} else {
    echo "❌ User not found in database\n";
}

echo "\n--- All admin/owner users ---\n";
$admins = User::whereIn('role', ['admin', 'owner'])->get(['email', 'role', 'status']);
foreach ($admins as $admin) {
    echo $admin->email . " | " . $admin->role . " | " . $admin->status . "\n";
}
