#!/usr/bin/env bash
# exit on error
set -o errexit

composer install --no-dev --optimize-autoloader

# Run migrations if database is ready
# php artisan migrate --force
