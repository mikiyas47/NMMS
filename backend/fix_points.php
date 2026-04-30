<?php 
require __DIR__.'/vendor/autoload.php'; 
$app = require_once __DIR__.'/bootstrap/app.php'; 
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class); 
$kernel->bootstrap(); 

$dist = \App\Models\Distributor::where('email', 'ab@gmail.com')->first(); 
if($dist) { 
    \App\Models\Stat::where('distributor_id', $dist->distributor_id)->update(['left_points' => 0, 'right_points' => 0, 'carry_left' => 0, 'carry_right' => 0]); 
    echo 'Points reset.'; 
}
