<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class KaryawanController extends Controller
{
    private const WORK_START = '08:00';
    private const LATE_TOLERANCE_MINUTES = 15;

    public function dashboard(Request $request): JsonResponse
    {
        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $yearStart = now()->startOfYear()->toDateString();
        $weekStart = now()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->addDays(4);

        $todayAttendance = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        $monthCounts = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->whereBetween('date', [$monthStart, $today])
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $approvedAnnualLeaves = DB::table('leave_requests')
            ->where('employee_id', $employee->id)
            ->where('leave_type', 'annual')
            ->where('status', 'approved')
            ->whereDate('start_date', '>=', $yearStart)
            ->get(['start_date', 'end_date']);

        $usedLeaveDays = $approvedAnnualLeaves->sum(function ($row): int {
            return Carbon::parse($row->start_date)->diffInDays(Carbon::parse($row->end_date)) + 1;
        });
        $annualQuota = $this->annualLeaveQuota();
        $remainingLeaveDays = max($annualQuota - $usedLeaveDays, 0);

        $weekRecords = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get()
            ->keyBy('date');

        $dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'];
        $weeklyAttendance = collect(range(0, 4))->map(function (int $offset) use ($weekStart, $weekRecords, $today, $dayNames): array {
            $current = $weekStart->copy()->addDays($offset);
            $dateStr = $current->toDateString();
            $record = $weekRecords->get($dateStr);

            return [
                'dayLabel' => $dayNames[$offset].' '.$current->format('j'),
                'date' => $dateStr,
                'clockIn' => $record?->clock_in ? substr((string) $record->clock_in, 0, 5) : null,
                'clockOut' => $record?->clock_out ? substr((string) $record->clock_out, 0, 5) : null,
                'status' => $record?->status,
                'isToday' => $dateStr === $today,
                'isFuture' => $dateStr > $today,
            ];
        })->values();

        $leaveCounts = DB::table('leave_requests')
            ->where('employee_id', $employee->id)
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $recentAttendance = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->orderByDesc('date')
            ->limit(5)
            ->get()
            ->map(fn ($row) => $this->formatAttendance($row))
            ->values();

        $recentLeaves = DB::table('leave_requests')
            ->where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(fn ($row) => $this->formatLeave($row))
            ->values();

        $announcements = DB::table('company_announcements')
            ->orderByDesc('published_at')
            ->limit(3)
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'title' => $row->title,
                'body' => $row->body,
                'publishedAt' => $row->published_at,
            ])
            ->values();

        $elapsedMinutes = null;
        if ($todayAttendance !== null && $todayAttendance->clock_in !== null) {
            $start = Carbon::createFromTimeString((string) $todayAttendance->clock_in);
            $end = $todayAttendance->clock_out !== null
                ? Carbon::createFromTimeString((string) $todayAttendance->clock_out)
                : now();
            $elapsedMinutes = max((int) $start->diffInMinutes($end, false), 0);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'profile' => $this->formatProfile($employee),
                'todayAttendance' => array_merge($this->formatAttendance($todayAttendance), [
                    'elapsedMinutes' => $elapsedMinutes,
                ]),
                'weeklyAttendance' => $weeklyAttendance,
                'monthlyStats' => [
                    'present' => $monthCounts['present'] ?? 0,
                    'late' => $monthCounts['late'] ?? 0,
                    'sick' => $monthCounts['sick'] ?? 0,
                    'leave' => $monthCounts['leave'] ?? 0,
                    'absent' => $monthCounts['absent'] ?? 0,
                    'remainingLeaveDays' => $remainingLeaveDays,
                ],
                'leaveStats' => [
                    'pending' => $leaveCounts['pending'] ?? 0,
                    'approved' => $leaveCounts['approved'] ?? 0,
                    'rejected' => $leaveCounts['rejected'] ?? 0,
                ],
                'recentAttendance' => $recentAttendance,
                'recentLeaves' => $recentLeaves,
                'announcements' => $announcements,
            ],
        ]);
    }

    public function attendance(Request $request): JsonResponse
    {
        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $today = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->where('date', now()->toDateString())
            ->first();

        $query = DB::table('attendances')->where('employee_id', $employee->id);
        if ($startDate) {
            $query->whereDate('date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('date', '<=', $endDate);
        }

        $history = $query->orderByDesc('date')
            ->limit(60)
            ->get()
            ->map(fn ($row) => $this->formatAttendance($row))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'today' => $this->formatAttendance($today),
                'history' => $history,
                'settings' => [
                    'workStart' => $this->workStartSetting(),
                    'lateToleranceMinutes' => $this->lateToleranceSetting(),
                ],
            ],
        ]);
    }

    public function clockIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'method' => ['sometimes', 'string', 'in:face,manual'],
            'liveness_passed' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        $method = $data['method'] ?? 'face';
        $livenessPassed = (bool) ($data['liveness_passed'] ?? ($method === 'face'));

        if ($method === 'face' && ! $livenessPassed) {
            return response()->json([
                'success' => false,
                'message' => 'Verifikasi keaslian wajah (liveness) gagal. Silakan ulangi atau gunakan prosedur alternatif.',
            ], 422);
        }

        $todayDate = now()->toDateString();
        $existing = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->where('date', $todayDate)
            ->first();

        if ($existing !== null && $existing->clock_in !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah melakukan Clock In hari ini.',
            ], 409);
        }

        $now = now();
        $status = $now->greaterThan($this->lateDeadline()) ? 'late' : 'present';
        $notes = $data['notes'] ?? ($method === 'manual' ? 'Absensi alternatif tanpa kamera' : null);

        if ($existing === null) {
            DB::table('attendances')->insert([
                'employee_id' => $employee->id,
                'date' => $todayDate,
                'clock_in' => $now->format('H:i:s'),
                'status' => $status,
                'method' => $method,
                'liveness_passed' => $livenessPassed ? 1 : 0,
                'notes' => $notes,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            DB::table('attendances')->where('id', $existing->id)->update([
                'clock_in' => $now->format('H:i:s'),
                'status' => $status,
                'method' => $method,
                'liveness_passed' => $livenessPassed ? 1 : 0,
                'notes' => $notes,
                'updated_at' => $now,
            ]);
        }

        $saved = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->where('date', $todayDate)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Clock In berhasil dicatat oleh server.',
            'data' => $this->formatAttendance($saved),
        ], 201);
    }

    public function clockOut(Request $request): JsonResponse
    {
        $data = $request->validate([
            'method' => ['sometimes', 'string', 'in:face,manual'],
            'liveness_passed' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        $method = $data['method'] ?? 'face';
        $livenessPassed = (bool) ($data['liveness_passed'] ?? ($method === 'face'));

        if ($method === 'face' && ! $livenessPassed) {
            return response()->json([
                'success' => false,
                'message' => 'Verifikasi keaslian wajah (liveness) gagal untuk Clock Out.',
            ], 422);
        }

        $todayDate = now()->toDateString();
        $existing = DB::table('attendances')
            ->where('employee_id', $employee->id)
            ->where('date', $todayDate)
            ->first();

        if ($existing === null || $existing->clock_in === null) {
            return response()->json([
                'success' => false,
                'message' => 'Anda belum melakukan Clock In hari ini.',
            ], 409);
        }

        if ($existing->clock_out !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah melakukan Clock Out hari ini.',
            ], 409);
        }

        $now = now();
        DB::table('attendances')->where('id', $existing->id)->update([
            'clock_out' => $now->format('H:i:s'),
            'notes' => $data['notes'] ?? $existing->notes,
            'updated_at' => $now,
        ]);

        $saved = DB::table('attendances')->where('id', $existing->id)->first();

        return response()->json([
            'success' => true,
            'message' => 'Clock Out berhasil dicatat oleh server.',
            'data' => $this->formatAttendance($saved),
        ]);
    }

    public function leaveRequests(Request $request): JsonResponse
    {
        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        $category = $request->query('category');
        $status = $request->query('status');

        $query = DB::table('leave_requests')
            ->leftJoin('users as approvers', 'approvers.id', '=', 'leave_requests.approved_by')
            ->leftJoin('employees as approver_emp', 'approver_emp.id', '=', 'approvers.employee_id')
            ->where('leave_requests.employee_id', $employee->id)
            ->select(
                'leave_requests.*',
                'approver_emp.full_name as approver_name'
            );

        if ($category === 'sakit') {
            $query->where('leave_requests.leave_type', 'sick');
        } elseif ($category === 'cuti') {
            $query->whereIn('leave_requests.leave_type', ['annual', 'maternity', 'unpaid']);
        }

        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('leave_requests.status', $status);
        }

        $rows = $query->orderByDesc('leave_requests.created_at')
            ->get()
            ->map(fn ($row) => $this->formatLeave($row))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function submitLeaveRequest(Request $request): JsonResponse
    {
        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        $data = $request->validate([
            'leave_type' => ['required', 'string', 'in:annual,sick,maternity,unpaid'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:500'],
            'medical_certificate' => [
                $request->input('leave_type') === 'sick' ? 'required' : 'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:2048',
            ],
        ]);

        $certificatePath = null;
        if ($request->hasFile('medical_certificate')) {
            $certificatePath = Storage::disk('public')->putFile('medical-certificates', $request->file('medical_certificate'));
        }

        $now = now();
        $id = (int) DB::table('leave_requests')->insertGetId([
            'employee_id' => $employee->id,
            'leave_type' => $data['leave_type'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'reason' => $data['reason'],
            'medical_certificate_path' => $certificatePath,
            'status' => 'pending',
            'approved_by' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $saved = DB::table('leave_requests')->where('id', $id)->first();

        return response()->json([
            'success' => true,
            'message' => $data['leave_type'] === 'sick'
                ? 'Pengajuan izin sakit beserta surat dokter berhasil dikirim dengan status Menunggu.'
                : 'Pengajuan cuti berhasil dikirim dengan status Menunggu.',
            'data' => $this->formatLeave($saved),
        ], 201);
    }

    public function profile(Request $request): JsonResponse
    {
        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatProfile($employee),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $employee = $this->karyawanProfile($request);
        if ($employee === null) {
            return $this->missingEmployeeResponse();
        }

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'string', 'in:male,female'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        DB::table('employees')->where('id', $employee->id)->update([
            'full_name' => $data['full_name'],
            'gender' => $data['gender'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'updated_at' => now(),
        ]);

        $updated = $this->karyawanProfile($request);

        return response()->json([
            'success' => true,
            'message' => 'Profil pribadi berhasil diperbarui.',
            'data' => $this->formatProfile($updated),
        ]);
    }

    private function karyawanProfile(Request $request): ?object
    {
        $authUser = $request->attributes->get('auth_user');
        $userId = is_array($authUser) ? (int) ($authUser['id'] ?? 0) : 0;

        return DB::table('users')
            ->join('employees', 'employees.id', '=', 'users.employee_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->where('users.id', $userId)
            ->select(
                'employees.*',
                'users.email',
                'users.role',
                'departments.name as department',
                'positions.name as position'
            )
            ->first();
    }

    private function missingEmployeeResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data karyawan tidak ditemukan.',
        ], 404);
    }

    private function formatProfile(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'nip' => $row->nip,
            'fullName' => $row->full_name,
            'gender' => $row->gender,
            'email' => $row->email,
            'phone' => $row->phone,
            'address' => $row->address,
            'department' => $row->department,
            'position' => $row->position,
            'joinDate' => $row->join_date,
            'status' => $row->status,
            'role' => $row->role,
        ];
    }

    private function formatAttendance(?object $row): array
    {
        if ($row === null) {
            return [
                'id' => null,
                'date' => now()->toDateString(),
                'clockIn' => null,
                'clockOut' => null,
                'status' => 'not_checked_in',
                'method' => null,
                'livenessPassed' => null,
                'notes' => null,
            ];
        }

        return [
            'id' => (int) $row->id,
            'date' => $row->date,
            'clockIn' => $row->clock_in,
            'clockOut' => $row->clock_out,
            'status' => $row->status,
            'method' => $row->method,
            'livenessPassed' => (bool) $row->liveness_passed,
            'notes' => $row->notes,
        ];
    }

    private function formatLeave(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'leaveType' => $row->leave_type,
            'startDate' => $row->start_date,
            'endDate' => $row->end_date,
            'reason' => $row->reason,
            'hasMedicalCertificate' => ! empty($row->medical_certificate_path),
            'status' => $row->status,
            'approverName' => $row->approver_name ?? null,
            'decisionNotes' => $row->decision_notes ?? null,
            'createdAt' => $row->created_at,
        ];
    }

    private function lateDeadline(): Carbon
    {
        return Carbon::createFromTimeString($this->workStartSetting())
            ->addMinutes($this->lateToleranceSetting());
    }

    private function workStartSetting(): string
    {
        $val = DB::table('system_settings')->where('setting_key', 'work_start')->value('setting_value');

        return is_string($val) && preg_match('/^\d{2}:\d{2}$/', $val) ? $val : self::WORK_START;
    }

    private function lateToleranceSetting(): int
    {
        $val = DB::table('system_settings')->where('setting_key', 'late_tolerance_minutes')->value('setting_value');

        return is_numeric($val) ? (int) $val : self::LATE_TOLERANCE_MINUTES;
    }

    private function annualLeaveQuota(): int
    {
        $val = DB::table('system_settings')->where('setting_key', 'annual_leave_quota')->value('setting_value');

        return is_numeric($val) ? max((int) $val, 1) : 12;
    }
}
