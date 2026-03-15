#!/usr/bin/env bash

# Run migrations and seeders
php artisan migrate --force --seed

# Start Apache
apache2-foreground
