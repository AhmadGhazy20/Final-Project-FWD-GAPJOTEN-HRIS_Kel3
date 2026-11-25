<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HrdController;
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

    // Fitur role HRD (administrator utama)
    Route::middleware('role:hrd')->prefix('hrd')->group(function (): void {
        Route::get('/dashboard', [HrdController::class, 'dashboard']);
        Route::get('/summary-detail', [HrdController::class, 'summaryDetail']);

        Route::get('/employees', [HrdController::class, 'employees']);
        Route::post('/employees', [HrdController::class, 'storeEmployee']);
        Route::put('/employees/{id}', [HrdController::class, 'updateEmployee'])->whereNumber('id');
        Route::delete('/employees/{id}', [HrdController::class, 'deleteEmployee'])->whereNumber('id');

        Route::get('/face-registrations', [HrdController::class, 'faceRegistrations']);
        Route::post('/face-registrations', [HrdController::class, 'storeFaceRegistration']);
        Route::delete('/face-registrations/{employeeId}', [HrdController::class, 'deleteFaceRegistration'])->whereNumber('employeeId');

        Route::get('/attendance', [HrdController::class, 'attendance']);
        Route::post('/attendance', [HrdController::class, 'upsertAttendance']);

        Route::get('/leave-requests', [HrdController::class, 'leaveRequests']);
        Route::put('/leave-requests/{id}/decision', [HrdController::class, 'decideLeaveRequest'])->whereNumber('id');

        Route::post('/announcements', [HrdController::class, 'storeAnnouncement']);
        Route::put('/announcements/{id}', [HrdController::class, 'updateAnnouncement'])->whereNumber('id');
        Route::delete('/announcements/{id}', [HrdController::class, 'deleteAnnouncement'])->whereNumber('id');

        Route::get('/reports', [HrdController::class, 'reports']);

        Route::get('/settings', [HrdController::class, 'settings']);
        Route::put('/settings', [HrdController::class, 'updateSettings']);
        Route::post('/departments', [HrdController::class, 'storeDepartment']);
        Route::post('/positions', [HrdController::class, 'storePosition']);
        Route::put('/accounts/{id}', [HrdController::class, 'updateAccount'])->whereNumber('id');

        Route::get('/profile', [HrdController::class, 'profile']);
        Route::put('/profile', [HrdController::class, 'updateProfile']);
    });
});
