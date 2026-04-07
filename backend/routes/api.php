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
