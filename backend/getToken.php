<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$token = \Illuminate\Support\Str::random(16);
$pres = \App\Models\Presentation::first();
if (!$pres) {
    $pres = \App\Models\Presentation::create([
        'title' => 'Test',
        'content_type' => 'video',
        'external_url' => 'https://example.com/test-video',
        'is_active' => true,
        'distributor_id' => 1,
    ]);
}
$prospect = \App\Models\Prospect::first();
if (!$prospect) {
    $prospect = \App\Models\Prospect::create([
        'name' => 'John Doe',
        'phone' => '1234567890',
        'distributor_id' => 1,
        'stage' => 'New Lead',
    ]);
}

$a = \App\Models\PresentationAssignment::create([
    'presentation_id' => $pres->id,
    'prospect_id' => $prospect->prospect_id,
    'distributor_id' => 1,
    'token' => $token,
    'status' => 'sent',
]);

echo $token;
