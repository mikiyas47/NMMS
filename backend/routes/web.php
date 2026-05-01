<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/fix-points', function () {
    \Illuminate\Support\Facades\Artisan::call('mlm:fix-points');
    return 'Points recalculated successfully! ' . \Illuminate\Support\Facades\Artisan::output();
});

Route::get('/fix-points-debug', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('mlm:fix-points');
        return 'Success: ' . \Illuminate\Support\Facades\Artisan::output();
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine();
    }
});
