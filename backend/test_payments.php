<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$recent = App\Models\Payment::orderBy('id', 'desc')->take(3)->get()->toArray();
print_r($recent);
