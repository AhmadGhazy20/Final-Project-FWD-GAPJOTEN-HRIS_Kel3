<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\KaryawanController;
use App\Http\Controllers\Api\SharedController;
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
    Route::get('/announcements', [SharedController::class, 'announcements']);
    Route::get('/leave-requests/{id}/medical-certificate', [SharedController::class, 'downloadMedicalCertificate'])
        ->whereNumber('id');

    // Fitur role Karyawan (HRD dikecualikan / tugas rekan tim)
    Route::middleware('role:karyawan')->prefix('karyawan')->group(function (): void {
        Route::get('/dashboard', [KaryawanController::class, 'dashboard']);
        Route::get('/attendance', [KaryawanController::class, 'attendance']);
        Route::post('/attendance/clock-in', [KaryawanController::class, 'clockIn']);
        Route::post('/attendance/clock-out', [KaryawanController::class, 'clockOut']);
        Route::get('/leave-requests', [KaryawanController::class, 'leaveRequests']);
        Route::post('/leave-requests', [KaryawanController::class, 'submitLeaveRequest']);
        Route::get('/profile', [KaryawanController::class, 'profile']);
        Route::put('/profile', [KaryawanController::class, 'updateProfile']);
    });

    // Fitur role SPV (read-only tim sesuai departemennya)
    Route::middleware('role:spv')->prefix('spv')->group(function (): void {
        Route::get('/dashboard', [SpvController::class, 'dashboard']);
        Route::get('/team', [SpvController::class, 'team']);
        Route::get('/attendance/today', [SpvController::class, 'attendanceToday']);
        Route::get('/attendance/history', [SpvController::class, 'attendanceHistory']);
        Route::get('/leave-requests', [SpvController::class, 'leaveRequests']);
        Route::get('/reports', [SpvController::class, 'reports']);
        Route::get('/profile', [SpvController::class, 'profile']);
        Route::put('/profile', [SpvController::class, 'updateProfile']);
    });
});
