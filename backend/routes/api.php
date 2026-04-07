<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/all-users', [AuthController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/products', [\App\Http\Controllers\ProductController::class, 'store']);
});

// ── Temporary diagnostic routes – REMOVE AFTER USE ───────────────────────────

// Shows all tables + previously-run migrations
Route::get('/db-status', function() {
    try {
        $tables = \Illuminate\Support\Facades\DB::select(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        $migrations = [];
        try {
            $migrations = \Illuminate\Support\Facades\DB::select('SELECT * FROM migrations ORDER BY id');
        } catch (\Exception $e) {
            $migrations = ['error' => $e->getMessage()];
        }
        return response()->json([
            'status'     => 'ok',
            'tables'     => array_column($tables, 'table_name'),
            'migrations' => $migrations,
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Drops all tables and re-runs all migrations (USE ONLY ONCE TO FIX BROKEN STATE)
Route::get('/migrate-fresh', function() {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--force' => true, '--seed' => true]);
        return response()->json([
            'status'  => 'success',
            'message' => 'Fresh migration completed',
            'output'  => \Illuminate\Support\Facades\Artisan::output(),
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Runs pending migrations only
Route::get('/migrate', function() {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return response()->json([
            'status'  => 'success',
            'message' => 'Migrations completed',
            'output'  => \Illuminate\Support\Facades\Artisan::output(),
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
