<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

$distributor = \App\Models\Distributor::first();
if (!$distributor) {
    echo "No distributor found.\n";
    exit;
}
$token = $distributor->createToken('test')->plainTextToken;
echo "Token: $token\n";

$request = Illuminate\Http\Request::create('/api/wallet', 'GET');
$request->headers->set('Authorization', "Bearer $token");
$response = $kernel->handle($request);
echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";
