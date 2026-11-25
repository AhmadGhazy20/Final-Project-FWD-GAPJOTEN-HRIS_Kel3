<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function myAttendance(Request $request): JsonResponse
    {
        $employeeId = $this->employeeId($request);
        $today = $this->todayAttendance($employeeId);
        $history = DB::table('attendances')
            ->where('employee_id', $employeeId)
            ->orderByDesc('attendance_date')
            ->limit(7)
            ->get()
            ->map(fn ($row) => $this->format($row))
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Absensi saya berhasil diambil',
            'data' => [
                'today' => $this->format($today),
                'history' => $history,
                'settings' => [
                    'workStart' => $this->setting('work_start', '08:00'),
                    'lateToleranceMinutes' => (int) $this->setting('late_tolerance_minutes', 15),
                ],
            ],
        ]);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'method' => ['sometimes', 'string', 'in:face,manual'],
            'liveness_passed' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $employeeId = $this->employeeId($request);
        $today = $this->todayAttendance($employeeId);

        if ($today !== null && $today->clock_in !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah melakukan absensi masuk hari ini.',
            ], 409);
        }

        $method = $data['method'] ?? 'face';
        $livenessPassed = (bool) ($data['liveness_passed'] ?? true);
        $status = now()->greaterThan($this->lateDeadline()) ? 'telat' : 'hadir';
        $now = now();

        if ($today === null) {
            $attendanceId = DB::table('attendances')->insertGetId([
                'employee_id' => $employeeId,
                'attendance_date' => $now->toDateString(),
                'clock_in' => $now,
                'status' => $status,
                'method' => $method,
                'liveness_passed' => $livenessPassed ? 1 : 0,
                'notes' => $data['notes'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            $attendanceId = $today->id;
            DB::table('attendances')->where('id', $today->id)->update([
                'clock_in' => $now,
                'status' => $status,
                'method' => $method,
                'liveness_passed' => $livenessPassed ? 1 : 0,
                'notes' => $data['notes'] ?? null,
                'updated_at' => $now,
            ]);
        }

        $this->audit($attendanceId, $employeeId, 'check_in', null, [
            'clock_in' => (string) $now,
            'status' => $status,
            'method' => $method,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Absensi masuk berhasil dicatat.',
            'data' => $this->format($this->todayAttendance($employeeId)),
        ], 201);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $employeeId = $this->employeeId($request);
        $today = $this->todayAttendance($employeeId);

        if ($today === null || $today->clock_in === null) {
            return response()->json([
                'success' => false,
                'message' => 'Anda belum melakukan absensi masuk hari ini.',
            ], 409);
        }

        if ($today->clock_out !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah melakukan absensi pulang hari ini.',
            ], 409);
        }

        $now = now();
        DB::table('attendances')->where('id', $today->id)->update([
            'clock_out' => $now,
            'notes' => $data['notes'] ?? $today->notes,
            'updated_at' => $now,
        ]);

        $this->audit($today->id, $employeeId, 'check_out', [
            'clock_out' => $today->clock_out,
        ], [
            'clock_out' => (string) $now,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Absensi pulang berhasil dicatat.',
            'data' => $this->format($this->todayAttendance($employeeId)),
        ]);
    }

    private function employeeId(Request $request): int
    {
        $authUser = $request->attributes->get('auth_user');

        return (int) DB::table('employees')
            ->where('user_id', is_array($authUser) ? ($authUser['id'] ?? 0) : 0)
            ->value('id');
    }

    private function todayAttendance(int $employeeId): ?object
    {
        return DB::table('attendances')
            ->where('employee_id', $employeeId)
            ->where('attendance_date', now()->toDateString())
            ->first();
    }

    private function format(?object $row): array
    {
        if ($row === null) {
            return [
                'id' => null,
                'date' => now()->toDateString(),
                'clockIn' => null,
                'clockOut' => null,
                'status' => 'belum_absen',
                'method' => null,
                'livenessPassed' => null,
                'notes' => null,
            ];
        }

        return [
            'id' => $row->id,
            'date' => $row->attendance_date,
            'clockIn' => $row->clock_in,
            'clockOut' => $row->clock_out,
            'status' => $row->status,
            'method' => $row->method,
            'livenessPassed' => (bool) $row->liveness_passed,
            'notes' => $row->notes,
        ];
    }

    private function lateDeadline(): Carbon
    {
        return Carbon::createFromTimeString($this->setting('work_start', '08:00'))
            ->addMinutes((int) $this->setting('late_tolerance_minutes', 15));
    }

    private function setting(string $key, string $default): string
    {
        $value = DB::table('system_settings')->where('setting_key', $key)->value('setting_value');

        return $value === null ? $default : (string) $value;
    }

    private function audit(int $attendanceId, int $actorId, string $action, ?array $oldValue, array $newValue): void
    {
        DB::table('attendance_audit_logs')->insert([
            'attendance_id' => $attendanceId,
            'actor_id' => $actorId,
            'action' => $action,
            'old_value' => $oldValue === null ? null : json_encode($oldValue, JSON_THROW_ON_ERROR),
            'new_value' => json_encode($newValue, JSON_THROW_ON_ERROR),
            'created_at' => now(),
        ]);
    }
}
