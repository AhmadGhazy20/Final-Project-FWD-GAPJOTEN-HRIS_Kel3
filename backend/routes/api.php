<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\SpvController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::get('/health', function (): JsonResponse {
    return response()->json([
        'success' => true,
        'message' => 'GAPJOTEN HRIS Laravel API siap digunakan',
        'database' => config('database.default'),
    ]);
});

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

Route::middleware('jwt')->group(function (): void {
    Route::get('/auth/profile', [AuthController::class, 'profile']);

    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::get('/employees/{id}', [EmployeeController::class, 'show'])->whereNumber('id');
    Route::put('/employees/{id}', [EmployeeController::class, 'update'])->whereNumber('id');
    Route::delete('/employees/{id}', [EmployeeController::class, 'destroy'])->whereNumber('id');

    Route::middleware('role:spv')->prefix('spv')->group(function (): void {
        Route::get('/dashboard', [SpvController::class, 'dashboard']);
        Route::get('/team', [SpvController::class, 'team']);
        Route::get('/my-attendance', [AttendanceController::class, 'myAttendance']);
        Route::post('/my-attendance/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/my-attendance/check-out', [AttendanceController::class, 'checkOut']);
        Route::get('/attendance', [SpvController::class, 'attendance']);
        Route::get('/late-employees', [SpvController::class, 'lateEmployees']);
        Route::get('/leave-requests', [SpvController::class, 'leaveRequests']);
    });
});
