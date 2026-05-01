<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/fix-points', function () {
    \Illuminate\Support\Facades\Artisan::call('mlm:fix-points');
    return 'Points recalculated successfully! ' . \Illuminate\Support\Facades\Artisan::output();
});
