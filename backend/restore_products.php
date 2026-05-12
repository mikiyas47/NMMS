<?php
/**
 * Restore original product names, images, and videos from the production database.
 */
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Product;
use Illuminate\Support\Facades\DB;

// Exact data recovered from the live production API
$restore = [
    1 => [
        'name'     => 'Powerful process',
        'category' => 'Yellow',
        'price'    => 7690,
        'point'    => 100,
        'image'    => 'https://res.cloudinary.com/docvdlgiv/image/upload/v1777629973/products/eqrczwq2dnnqugmpzwgu.jpg',
    ],
    2 => [
        'name'     => 'Habit building',
        'category' => 'Orange',
        'price'    => 14115,
        'point'    => 200,
        'image'    => 'https://res.cloudinary.com/docvdlgiv/video/upload/v1777630266/products/msdk1xo9nrxszjdhaopj.mp4',
    ],
    3 => [
        'name'     => 'Habit building',
        'category' => 'Orange',
        'price'    => 14115,
        'point'    => 200,
        'image'    => 'https://res.cloudinary.com/docvdlgiv/image/upload/v1777628059/products/umordldvmu9qucua6zgl.jpg',
    ],
    4 => [
        'name'     => 'Team and leadership',
        'category' => 'Golden',
        'price'    => 52665,
        'point'    => 800,
        'image'    => 'https://res.cloudinary.com/docvdlgiv/video/upload/v1777629868/products/jmicmkwhn0rb3nf3kdex.mp4',
    ],
];

// Product 5 (Mind programming / Green) only exists in production.
// We upsert it locally so local dev matches production.
$prod5 = [
    'name'     => 'Mind programming',
    'category' => 'Green',
    'price'    => 26965,
    'point'    => 400,
    'image'    => 'https://res.cloudinary.com/docvdlgiv/video/upload/v1777629917/products/wmc0mc6fszehiuhc2s2t.mp4',
];

foreach ($restore as $id => $data) {
    $rows = DB::table('products')->where('id', $id)->update($data);
    echo "Updated product ID $id ({$data['name']} / {$data['category']}): $rows row(s)\n";
}

// Upsert product 5
$existing = DB::table('products')->where('id', 5)->first();
if ($existing) {
    DB::table('products')->where('id', 5)->update($prod5);
    echo "Updated product ID 5 (Mind programming / Green)\n";
} else {
    DB::table('products')->insert(array_merge(['id' => 5], $prod5, [
        'created_at' => now(), 'updated_at' => now(),
    ]));
    echo "Inserted product ID 5 (Mind programming / Green)\n";
}

echo "\n=== Final product state ===\n";
foreach (DB::table('products')->orderBy('id')->get() as $p) {
    echo "ID {$p->id} | {$p->name} | {$p->category} | image: " . ($p->image ? substr($p->image, -40) : 'NULL') . "\n";
}
echo "\nDone!\n";
