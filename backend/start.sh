#!/usr/bin/env bash

# Ensure storage directories have correct permissions at runtime
# (Render may mount volumes that override build-time permissions)
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/storage/framework/cache
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
mkdir -p /var/www/html/storage/app/public
touch /var/www/html/storage/logs/laravel.log
chmod -R 775 /var/www/html/storage
chmod -R 775 /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage
chown -R www-data:www-data /var/www/html/bootstrap/cache

# Clear all caches so new routes and config are picked up on every deploy
php artisan route:clear
php artisan config:clear
php artisan cache:clear

# Run migrations (without seed so seeder failures don't block startup)
php artisan migrate --force

# Seed the database (idempotent - safe to run every time)
php artisan db:seed --force

# Link storage for public file access (product images)
php artisan storage:link --force 2>/dev/null || true

# Start Apache
apache2-foreground
