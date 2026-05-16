<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$token = \App\Models\PresentationAssignment::latest()->first()->token ?? null;
if (!$token) die("No assignment found\n");

// Simulate 50% watch
$req1 = \Illuminate\Http\Request::create("/api/p/$token/track", 'POST', [
    'action' => 'watched_50_percent',
    'watch_percent' => 50,
    'time_spent' => 120,
    'device_type' => 'Mobile'
]);
$res1 = app()->handle($req1);
echo "50% Watch: " . $res1->getContent() . "\n";

// Simulate Complete
$req2 = \Illuminate\Http\Request::create("/api/p/$token/track", 'POST', [
    'action' => 'completed',
    'watch_percent' => 100,
    'time_spent' => 240,
    'device_type' => 'Mobile'
]);
$res2 = app()->handle($req2);
echo "100% Watch: " . $res2->getContent() . "\n";

// Simulate CTA Click
$req3 = \Illuminate\Http\Request::create("/api/p/$token/track", 'POST', [
    'action' => 'cta_clicked',
    'watch_percent' => 100,
    'time_spent' => 250,
    'device_type' => 'Mobile'
]);
$res3 = app()->handle($req3);
echo "CTA Click: " . $res3->getContent() . "\n";

// Verify Prospect Score and Level
$assignment = \App\Models\PresentationAssignment::where('token', $token)->first();
$prospect = \App\Models\Prospect::find($assignment->prospect_id);
echo "Final Assignment Score: {$assignment->engagement_score}\n";
echo "Final Classification: {$assignment->classification}\n";
echo "Final Prospect Interest Score: {$prospect->interest_score}\n";
echo "Final Prospect Interest Level: {$prospect->interest_level}\n";

// Verify Follow-ups
$followups = \App\Models\Followup::where('prospect_id', $assignment->prospect_id)->get();
echo "Total Follow-ups created: " . $followups->count() . "\n";
foreach($followups as $f) {
    echo "- " . $f->notes . "\n";
}
