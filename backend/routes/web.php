<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/fix-points', function () {
    \Illuminate\Support\Facades\Artisan::call('mlm:fix-points');
    return 'Points recalculated successfully! ' . \Illuminate\Support\Facades\Artisan::output();
});

Route::get('/migrate', function () {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    return 'Migrated successfully! ' . \Illuminate\Support\Facades\Artisan::output();
});

Route::get('/fix-points-debug', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('mlm:fix-points');
        return 'Success: ' . \Illuminate\Support\Facades\Artisan::output();
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine();
    }
});

Route::get('/debug-db', function () {
    try {
        $result = \Illuminate\Support\Facades\DB::select('SELECT 1');
        return 'DB connection successful!';
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});

Route::get('/debug-payments', function () {
    return \App\Models\Payment::all();
});
