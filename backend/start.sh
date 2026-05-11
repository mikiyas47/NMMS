#!/usr/bin/env bash

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
