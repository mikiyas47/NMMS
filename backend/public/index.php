<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Force debug mode to catch the 500 error
putenv('APP_DEBUG=true');
$_ENV['APP_DEBUG'] = true;
$_SERVER['APP_DEBUG'] = true;

// Force a valid APP_KEY in case the remote .env is corrupted
putenv('APP_KEY=base64:cBXXm4HSDjTdoNaTMyEUr63EespyTHclTW1EslmLO6w=');
$_ENV['APP_KEY'] = 'base64:cBXXm4HSDjTdoNaTMyEUr63EespyTHclTW1EslmLO6w=';
$_SERVER['APP_KEY'] = 'base64:cBXXm4HSDjTdoNaTMyEUr63EespyTHclTW1EslmLO6w=';

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
