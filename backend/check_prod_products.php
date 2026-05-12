<?php
/**
 * Connect to the production Neon PostgreSQL database and read the current product image values.
 */
require __DIR__ . '/vendor/autoload.php';

$dsn = 'pgsql:host=ep-little-frost-ad8et1v2.c-2.us-east-1.aws.neon.tech;dbname=neondb;sslmode=require';
$user = 'neondb_owner';
$pass = 'npg_7ZLWexJBQ3uN';

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->query("SELECT id, name, category, image, description FROM products ORDER BY id");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo "ID: {$r['id']} | Name: {$r['name']} | Category: {$r['category']}\n";
        echo "  Image: " . ($r['image'] ?? 'NULL') . "\n\n";
    }
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
