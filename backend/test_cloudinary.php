<?php
require 'vendor/autoload.php';

$cloudinaryUrl = 'cloudinary://712859382482377:7EJGyEUWIL6O-I4ABv11tiJ4N6s@docvdlgiv';

try {
    $c = new \Cloudinary\Cloudinary($cloudinaryUrl);
    echo 'Cloudinary instance created OK' . PHP_EOL;

    // 1x1 transparent PNG
    $data = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    file_put_contents('_test_img.png', $data);

    $result = $c->uploadApi()->upload('_test_img.png', ['folder' => 'test', 'resource_type' => 'image']);
    echo 'Upload OK: ' . ($result['secure_url'] ?? 'no url') . PHP_EOL;
    unlink('_test_img.png');
} catch (\Throwable $e) {
    echo 'ERROR: ' . $e->getMessage() . PHP_EOL;
    if (file_exists('_test_img.png')) unlink('_test_img.png');
}
