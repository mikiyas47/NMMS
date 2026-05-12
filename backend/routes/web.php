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

Route::get('/debug-db', function () {
    try {
        $result = \Illuminate\Support\Facades\DB::select('SELECT 1');
        return 'DB connection successful!';
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});

Route::get('/debug-payments', function (\Illuminate\Http\Request $request) {
    $request->setUserResolver(function () {
        return \App\Models\User::where('email', 'miki@gmail.com')->first();
    });
    return app(\App\Http\Controllers\Api\PaymentController::class)->index($request);
});
