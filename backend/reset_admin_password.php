<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Reset password for existing admin
$user = User::where('email', 'mikiadmin@gmail.com')->first();

if ($user) {
    $user->password = Hash::make('Admin@123');
    $user->save();
    
    echo "✅ Password reset successfully!\n\n";
    echo "Email: mikiadmin@gmail.com\n";
    echo "Password: Admin@123\n";
    echo "Role: " . $user->role . "\n";
} else {
    echo "❌ User not found\n";
}
