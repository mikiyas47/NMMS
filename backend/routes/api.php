<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/all-users', [AuthController::class, 'index']);
Route::put('/users/{id}', [AuthController::class, 'update']);
Route::patch('/users/{id}/status', [AuthController::class, 'toggleStatus']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/products', [\App\Http\Controllers\ProductController::class, 'store']);
    Route::put('/products/{product}', [\App\Http\Controllers\ProductController::class, 'update']);
    Route::delete('/products/{product}', [\App\Http\Controllers\ProductController::class, 'destroy']);
});

// ── Contacts (Prospects / Followups / Closings) ───────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/contacts',                        [ContactController::class, 'index']);
    Route::post('/contacts',                       [ContactController::class, 'store']);
    Route::get('/contacts/followups',              [ContactController::class, 'followups']);
    Route::get('/contacts/closings',               [ContactController::class, 'closings']);
    Route::get('/contacts/{id}',                   [ContactController::class, 'show']);
    Route::put('/contacts/{id}',                   [ContactController::class, 'update']);
    Route::delete('/contacts/{id}',                [ContactController::class, 'destroy']);
    Route::post('/contacts/{id}/followups',        [ContactController::class, 'storeFollowup']);
    Route::post('/contacts/{id}/closings',         [ContactController::class, 'storeClosing']);
});
// ─────────────────────────────────────────────────────────────────────────────

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

// Temporary route to create the owner account on the production database
Route::get('/create-owner', function() {
    $user = \App\Models\User::updateOrCreate(
        ['email' => 'miki@gmail.com'],
        [
            'name' => 'Mikiyas',
            'password' => \Illuminate\Support\Facades\Hash::make('mikiyas'),
            'role' => 'owner',
            'status' => 'active'
        ]
    );
    return response()->json(['message' => 'Owner created successfully on production database!', 'user' => $user]);
});

// ─────────────────────────────────────────────────────────────────────────────
