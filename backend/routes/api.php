<?php

use App\Http\Controllers\PlayController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuestionOptionController;
use App\Http\Controllers\PerformanceController;
use App\Http\Controllers\UserController;
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

// === RUTAS PÚBLICAS (sin autenticación) ===
Route::post('performances/join', [PerformanceController::class, 'join'])->name('performances.join');
Route::get('performances/{performance}/current', [PerformanceController::class, 'current'])->name('performances.current');

// === AUTH PROTEGIDO (Keycloak) ===
Route::middleware('keycloak')->group(function () {
    Route::get('/me', fn(Request $r) => response()->json($r->get('keycloak_user')));

    Route::apiResource('users', UserController::class);

    Route::apiResource('plays', PlayController::class);
    Route::patch('plays/{play}/restore', [PlayController::class, 'restore'])->name('plays.restore');
    Route::apiResource('plays.questions', QuestionController::class)->shallow();
    Route::patch('questions/{question}/restore', [QuestionController::class, 'restore'])->name('questions.restore');
    Route::apiResource('questions.options', QuestionOptionController::class)->shallow();
    Route::patch('options/{option}/restore', [QuestionOptionController::class, 'restore'])->name('options.restore');
    Route::apiResource('plays.performances', PerformanceController::class)->shallow();
    Route::patch('performances/{performance}/restore', [PerformanceController::class, 'restore'])->name('performances.restore');
    Route::get('performances/{performance}/qr', [PerformanceController::class, 'qr'])->name('performances.qr');
    Route::patch('performances/{performance}/start', [PerformanceController::class, 'start'])->name('performances.start');
    Route::patch('performances/{performance}/close', [PerformanceController::class, 'close'])->name('performances.close');
    Route::get('performances/{performance}/questions', [PerformanceController::class, 'questions'])->name('performances.questions.index');
    Route::patch('performances/{performance}/questions/{question}/send', [PerformanceController::class, 'sendQuestion'])->name('performances.questions.send');
    Route::patch('performances/{performance}/questions/{question}/close', [PerformanceController::class, 'closeQuestion'])->name('performances.questions.close');
    Route::patch('performances/{performance}/questions/{question}/winner', [PerformanceController::class, 'setWinner'])->name('performances.questions.winner');
    Route::get('performances/{performance}/live', [PerformanceController::class, 'live'])->name('performances.live');
});





   
