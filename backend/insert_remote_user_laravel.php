<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

Config::set('database.connections.remote_pgsql', [
    'driver' => 'pgsql',
    'host' => 'ep-little-frost-ad8et1v2.c-2.us-east-1.aws.neon.tech',
    'port' => '5432',
    'database' => 'neondb',
    'username' => 'neondb_owner',
    'password' => 'npg_7ZLWexJBQ3uN',
    'charset' => 'utf8',
    'prefix' => '',
    'schema' => 'public',
    'sslmode' => 'require',
]);

try {
    $email = 'mikila@gmail.com';
    $password = bcrypt('mikiyas');
    
    $existing = DB::connection('remote_pgsql')->table('users')->where('email', $email)->first();
    
    if ($existing) {
        DB::connection('remote_pgsql')->table('users')->where('email', $email)->update([
            'password' => $password,
            'role' => 'owner'
        ]);
        echo "User already existed in remote DB. Password and role updated.\n";
    } else {
        DB::connection('remote_pgsql')->table('users')->insert([
            'name' => 'Owner',
            'email' => $email,
            'password' => $password,
            'role' => 'owner',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "Remote owner user created successfully.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
