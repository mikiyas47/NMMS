<?php
/**
 * One-time script: upload colored placeholder images to Cloudinary
 * and update each product's image URL in the database.
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Product;
use Cloudinary\Cloudinary;

$cloudinaryUrl = env('CLOUDINARY_URL');
if (!$cloudinaryUrl) {
    echo "CLOUDINARY_URL not set\n"; exit(1);
}

$cloudinary = new Cloudinary($cloudinaryUrl);

// A 2x2 pixel PNG in 4 brand colours (Yellow, Orange, Green, Golden)
// We use Cloudinary's text/overlay feature by uploading a tiny base and then
// generating themed thumbnails via transformation URL — but simpler: just upload
// a solid-colour SVG for each.
$products = [
    'Yellow' => ['color' => 'F59E0B', 'id' => null],
    'Orange' => ['color' => 'F97316', 'id' => null],
    'Green'  => ['color' => '10B981', 'id' => null],
    'Golden' => ['color' => 'D97706', 'id' => null],
];

// Load DB products
foreach (Product::all() as $p) {
    $cat = ucfirst(strtolower($p->category));
    if (isset($products[$cat])) {
        $products[$cat]['id'] = $p->id;
    }
}

foreach ($products as $cat => $info) {
    if (!$info['id']) { echo "No product for $cat\n"; continue; }
    if (Product::find($info['id'])->image) { echo "$cat already has image, skipping\n"; continue; }

    // Build SVG placeholder
    $color = $info['color'];
    $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280">
  <rect width="400" height="280" fill="#{$color}"/>
  <text x="200" y="140" font-family="Arial,sans-serif" font-size="36" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="middle">{$cat} Package</text>
  <text x="200" y="190" font-family="Arial,sans-serif" font-size="18"
        fill="rgba(255,255,255,0.8)" text-anchor="middle">NMMS</text>
</svg>
SVG;

    $tmpFile = sys_get_temp_dir() . "/nmms_{$cat}.svg";
    file_put_contents($tmpFile, $svg);

    try {
        $result = $cloudinary->uploadApi()->upload($tmpFile, [
            'folder'        => 'products',
            'public_id'     => 'nmms_' . strtolower($cat) . '_placeholder',
            'resource_type' => 'image',
            'overwrite'     => true,
        ]);
        $url = $result['secure_url'] ?? null;
        if ($url) {
            Product::where('id', $info['id'])->update(['image' => $url]);
            echo "$cat: uploaded → $url\n";
        } else {
            echo "$cat: upload returned no URL\n";
        }
    } catch (\Throwable $e) {
        echo "$cat: ERROR - " . $e->getMessage() . "\n";
    }
    @unlink($tmpFile);
}

echo "\nDone!\n";
