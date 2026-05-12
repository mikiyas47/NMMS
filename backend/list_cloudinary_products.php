<?php
/**
 * Fetch ALL assets in the 'products' folder from Cloudinary
 * and print them out so we can restore previous product images/videos.
 */
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Cloudinary\Cloudinary;

$cloudinaryUrl = env('CLOUDINARY_URL');
$cloudinary    = new Cloudinary($cloudinaryUrl);

echo "=== Cloudinary assets in 'products' folder ===\n\n";

foreach (['image', 'video'] as $type) {
    try {
        $result = $cloudinary->adminApi()->assets([
            'type'          => 'upload',
            'prefix'        => 'products/',
            'resource_type' => $type,
            'max_results'   => 100,
        ]);
        $resources = $result['resources'] ?? [];
        echo strtoupper($type) . "S (" . count($resources) . "):\n";
        foreach ($resources as $r) {
            echo "  public_id : " . $r['public_id'] . "\n";
            echo "  secure_url: " . $r['secure_url'] . "\n";
            echo "  created_at: " . $r['created_at'] . "\n";
            echo "  bytes     : " . $r['bytes'] . "\n";
            echo "\n";
        }
    } catch (\Throwable $e) {
        echo strtoupper($type) . "S ERROR: " . $e->getMessage() . "\n";
    }
}
