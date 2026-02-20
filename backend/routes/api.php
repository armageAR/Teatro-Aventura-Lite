<?php

use App\Http\Controllers\PlayController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuestionOptionController;
use App\Http\Controllers\PerformanceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        return response()->json(['status' => 'ok', 'database' => 'connected']);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'database' => 'not connected',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Nota: /sanctum/csrf-cookie lo expone Sanctum automáticamente (GET) vía middleware "web".
// En SPA, primero golpeás /sanctum/csrf-cookie y luego /login.

// === AUTH PROTEGIDO (requiere cookie de sesión Sanctum) ===
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', fn(Request $r) => $r->user());
    Route::post('/logout', [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'destroy']);
    // tus endpoints protegidos...
    Route::apiResource('plays', PlayController::class);
    Route::patch('plays/{play}/restore', [PlayController::class, 'restore'])->name('plays.restore');
    Route::apiResource('plays.questions', QuestionController::class)->shallow();
    Route::patch('questions/{question}/restore', [QuestionController::class, 'restore'])->name('questions.restore');
    Route::apiResource('questions.options', QuestionOptionController::class)->shallow();
    Route::patch('options/{option}/restore', [QuestionOptionController::class, 'restore'])->name('options.restore');
    Route::apiResource('plays.performances', PerformanceController::class)->shallow();
    Route::patch('performances/{performance}/restore', [PerformanceController::class, 'restore'])->name('performances.restore');
});

// === AUTH PÚBLICO ===
Route::post('/login', [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'store']);
Route::post('/register', [\App\Http\Controllers\Auth\RegisteredUserController::class, 'store']);





   
