<?php

use App\Http\Controllers\PlayController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuestionOptionController;
use App\Http\Controllers\PerformanceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\HealthCheck;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();

        $health = DB::transaction(function () {
            $record = HealthCheck::query()->firstOrCreate(
                ['id' => 1],
                [
                    'counter' => 0,
                    'last_checked_at' => now(),
                    'last_checked_by' => 'api/health',
                ]
            );

            $before = $record->counter;
            $record->counter = $record->counter + 1;
            $record->last_checked_at = now();
            $record->last_checked_by = 'api/health';
            $record->save();

            return [
                'id' => $record->id,
                'counter_before' => $before,
                'counter_after' => $record->counter,
                'last_checked_at' => $record->last_checked_at,
            ];
        });

        return response()->json([
            'status' => 'ok',
            'database' => 'connected',
            'app_env' => config('app.env'),
            'health_check' => $health,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'database' => 'not connected',
            'message' => $e->getMessage()
        ], 500);
    }
});

// === AUTH PROTEGIDO ===
Route::middleware('auth')->group(function () {
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





   
