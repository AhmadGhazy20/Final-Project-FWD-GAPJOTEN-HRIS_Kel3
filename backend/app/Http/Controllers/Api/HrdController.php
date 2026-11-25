<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class HrdController extends Controller
{
    private const DEFAULT_SETTINGS = [
        'company_name' => 'GAPJOTEN Technology Solutions',
        'office_location' => 'Jakarta - Kantor Pusat',
        'work_start' => '08:00',
        'work_end' => '17:00',
        'late_tolerance_minutes' => '15',
        'annual_leave_quota' => '12',
        'biometric_retention_days' => '365',
        'allow_alternative_attendance' => '1',
    ];

    public function dashboard(Request $request): JsonResponse
    {
        $hrd = $this->hrdProfile($request);
        $today = now()->toDateString();

        $employeeStatusCounts = DB::table('employees')
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $activeHeadcount = ($employeeStatusCounts['active'] ?? 0) + ($employeeStatusCounts['probation'] ?? 0);

        $todayAttendanceCounts = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->whereIn('employees.status', ['active', 'probation'])
            ->where('attendances.date', $today)
            ->selectRaw('attendances.status, COUNT(*) AS total')
            ->groupBy('attendances.status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $recordedToday = array_sum($todayAttendanceCounts);
        $notCheckedInToday = max($activeHeadcount - $recordedToday, 0);

        $yesterday = now()->subDay()->toDateString();
        $yesterdayLate = (int) DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->whereIn('employees.status', ['active', 'probation'])
            ->where('attendances.date', $yesterday)
            ->where('attendances.status', 'late')
            ->count();

        $newThisMonth = (int) DB::table('employees')
            ->whereBetween('join_date', [now()->startOfMonth()->toDateString(), $today])
            ->count();

        $weekStart = now()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->addDays(4);
        $weekRows = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->whereIn('employees.status', ['active', 'probation'])
            ->whereBetween('attendances.date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->select(
                'attendances.date',
                DB::raw("SUM(CASE WHEN attendances.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_count"),
                DB::raw("SUM(CASE WHEN attendances.status = 'late' THEN 1 ELSE 0 END) AS late_count")
            )
            ->groupBy('attendances.date')
            ->get()
            ->keyBy('date');

        $dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'];
        $weeklyTrend = collect(range(0, 4))->map(function (int $offset) use ($weekStart, $weekRows, $activeHeadcount, $today, $dayLabels): array {
            $dateObj = $weekStart->copy()->addDays($offset);
            $dateStr = $dateObj->toDateString();
            $row = $weekRows->get($dateStr);
            $presentCount = (int) ($row->present_count ?? 0);
            $lateCount = (int) ($row->late_count ?? 0);

            return [
                'day' => $dayLabels[$offset],
                'date' => $dateStr,
                'presentCount' => $presentCount,
                'lateCount' => $lateCount,
                'attendanceRate' => $activeHeadcount > 0 ? round(($presentCount / $activeHeadcount) * 100, 1) : 0.0,
                'lateRate' => $activeHeadcount > 0 ? round(($lateCount / $activeHeadcount) * 100, 1) : 0.0,
                'isToday' => $dateStr === $today,
                'isFuture' => $dateStr > $today,
            ];
        })->values();

        $pendingLeaveCount = (int) DB::table('leave_requests')
            ->where('status', 'pending')
            ->whereIn('leave_type', ['annual', 'maternity', 'unpaid'])
            ->count();

        $pendingSickCount = (int) DB::table('leave_requests')
            ->where('status', 'pending')
            ->where('leave_type', 'sick')
            ->count();

        $faceRegisteredCount = (int) DB::table('face_registrations')
            ->join('employees', 'employees.id', '=', 'face_registrations.employee_id')
            ->where('face_registrations.status', 'active')
            ->whereIn('employees.status', ['active', 'probation'])
            ->count();

        $departmentBreakdown = DB::table('departments')
            ->leftJoin('employees', function ($join): void {
                $join->on('employees.department_id', '=', 'departments.id')
                    ->whereIn('employees.status', ['active', 'probation']);
            })
            ->leftJoin('attendances', function ($join) use ($today): void {
                $join->on('attendances.employee_id', '=', 'employees.id')
                    ->where('attendances.date', '=', $today);
            })
            ->groupBy('departments.id', 'departments.name', 'departments.code')
            ->orderBy('departments.name')
            ->select(
                'departments.id',
                'departments.name',
                'departments.code',
                DB::raw('COUNT(DISTINCT employees.id) AS employee_count'),
                DB::raw("SUM(CASE WHEN attendances.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_today"),
                DB::raw("SUM(CASE WHEN attendances.status = 'late' THEN 1 ELSE 0 END) AS late_today")
            )
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'code' => $row->code,
                'employeeCount' => (int) $row->employee_count,
                'presentToday' => (int) $row->present_today,
                'lateToday' => (int) $row->late_today,
            ])
            ->values();

        $todayMonitor = DB::table('employees')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('attendances', function ($join) use ($today): void {
                $join->on('attendances.employee_id', '=', 'employees.id')
                    ->where('attendances.date', '=', $today);
            })
            ->whereIn('employees.status', ['active', 'probation'])
            ->orderByRaw("CASE WHEN attendances.clock_in IS NOT NULL THEN 0 WHEN attendances.status IS NOT NULL THEN 1 ELSE 2 END")
            ->orderByDesc('attendances.clock_in')
            ->orderBy('employees.full_name')
            ->limit(6)
            ->select(
                'employees.id as employee_id',
                'employees.nip',
                'employees.full_name',
                'departments.name as department',
                'positions.name as position',
                'attendances.clock_in',
                'attendances.clock_out',
                'attendances.status',
                'attendances.method',
                'attendances.notes'
            )
            ->get()
            ->map(fn ($row) => [
                'employeeId' => (int) $row->employee_id,
                'nip' => $row->nip,
                'fullName' => $row->full_name,
                'department' => $row->department,
                'position' => $row->position,
                'clockIn' => $row->clock_in,
                'clockOut' => $row->clock_out,
                'status' => $row->status ?: 'not_checked_in',
                'method' => $row->method,
                'notes' => $row->notes,
            ])
            ->values();

        $pendingLeaves = $this->leaveQuery()
            ->where('leave_requests.status', 'pending')
            ->orderByDesc('leave_requests.created_at')
            ->limit(6)
            ->get()
            ->map(fn ($row) => $this->formatLeaveRow($row))
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

        $presentToday = ($todayAttendanceCounts['present'] ?? 0) + ($todayAttendanceCounts['late'] ?? 0);

        return response()->json([
            'success' => true,
            'data' => [
                'hrd' => [
                    'name' => $hrd?->full_name ?? 'Admin HRD',
                    'department' => $hrd?->department_name ?? 'Human Resources',
                    'position' => $hrd?->position_name ?? 'HRD Manager',
                ],
                'stats' => [
                    'totalEmployees' => $activeHeadcount,
                    'activeEmployees' => $employeeStatusCounts['active'] ?? 0,
                    'probationEmployees' => $employeeStatusCounts['probation'] ?? 0,
                    'resignedEmployees' => $employeeStatusCounts['resigned'] ?? 0,
                    'presentToday' => $presentToday,
                    'onTimeToday' => $todayAttendanceCounts['present'] ?? 0,
                    'lateToday' => $todayAttendanceCounts['late'] ?? 0,
                    'yesterdayLate' => $yesterdayLate,
                    'newThisMonth' => $newThisMonth,
                    'sickToday' => $todayAttendanceCounts['sick'] ?? 0,
                    'leaveToday' => $todayAttendanceCounts['leave'] ?? 0,
                    'sickOrLeaveToday' => ($todayAttendanceCounts['sick'] ?? 0) + ($todayAttendanceCounts['leave'] ?? 0),
                    'notCheckedInToday' => $notCheckedInToday,
                    'pendingLeaves' => $pendingLeaveCount,
                    'pendingSickLeaves' => $pendingSickCount,
                    'pendingTotal' => $pendingLeaveCount + $pendingSickCount,
                    'faceRegisteredCount' => $faceRegisteredCount,
                ],
                'weeklyTrend' => $weeklyTrend,
                'departmentBreakdown' => $departmentBreakdown,
                'todayMonitor' => $todayMonitor,
                'pendingLeaves' => $pendingLeaves,
                'announcements' => $announcements,
                'settings' => $this->loadSettingsMap(),
            ],
        ]);
    }

    public function employees(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $departmentId = $request->query('department_id');
        $status = $request->query('status');
        $role = $request->query('role');

        $query = DB::table('employees')
            ->leftJoin('users', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('face_registrations', 'face_registrations.employee_id', '=', 'employees.id')
            ->select(
                'employees.*',
                'users.id as user_id',
                'users.email',
                'users.role',
                'users.status as account_status',
                'departments.name as department_name',
                'positions.name as position_name',
                'face_registrations.status as face_status',
                'face_registrations.consent_at as face_consent_at'
            );

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($sub) use ($like): void {
                $sub->where('employees.full_name', 'like', $like)
                    ->orWhere('employees.nip', 'like', $like)
                    ->orWhere('users.email', 'like', $like);
            });
        }

        if ($departmentId) {
            $query->where('employees.department_id', (int) $departmentId);
        }

        if (in_array($status, ['active', 'probation', 'resigned'], true)) {
            $query->where('employees.status', $status);
        }

        if (in_array($role, ['hrd', 'spv', 'karyawan'], true)) {
            $query->where('users.role', $role);
        }

        $rows = $query->orderBy('employees.nip')
            ->get()
            ->map(fn ($row) => $this->formatEmployeeRow($row))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'employees' => $rows,
                'departments' => $this->departmentOptions(),
                'positions' => $this->positionOptions(),
            ],
        ]);
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nip' => ['nullable', 'string', 'max:50', 'unique:employees,nip'],
            'full_name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'string', 'in:male,female'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'string', 'in:hrd,spv,karyawan'],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'join_date' => ['required', 'date'],
            'status' => ['required', 'string', 'in:active,probation,resigned'],
            'account_status' => ['sometimes', 'string', 'in:active,inactive'],
        ]);

        $employeeId = DB::transaction(function () use ($data): int {
            $nip = trim((string) ($data['nip'] ?? ''));
            if ($nip === '') {
                $nextNumber = (int) DB::table('employees')
                    ->selectRaw('COALESCE(MAX(CAST(SUBSTRING(nip, 4) AS UNSIGNED)), 0) + 1 AS next_number')
                    ->value('next_number');
                $nip = 'EMP'.str_pad((string) max($nextNumber, 1), 3, '0', STR_PAD_LEFT);
            }

            $now = now();
            $empId = (int) DB::table('employees')->insertGetId([
                'nip' => $nip,
                'full_name' => $data['full_name'],
                'gender' => $data['gender'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'department_id' => (int) $data['department_id'],
                'position_id' => isset($data['position_id']) ? (int) $data['position_id'] : null,
                'join_date' => $data['join_date'],
                'status' => $data['status'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('users')->insert([
                'employee_id' => $empId,
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'role' => $data['role'],
                'status' => $data['account_status'] ?? 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return $empId;
        });

        $created = $this->findEmployeeById($employeeId);

        return response()->json([
            'success' => true,
            'message' => 'Data karyawan berhasil ditambahkan.',
            'data' => $this->formatEmployeeRow($created),
        ], 201);
    }

    public function updateEmployee(Request $request, int $id): JsonResponse
    {
        $existing = DB::table('employees')
            ->leftJoin('users', 'users.employee_id', '=', 'employees.id')
            ->where('employees.id', $id)
            ->select('employees.*', 'users.id as user_id', 'users.role as current_role', 'users.status as current_account_status')
            ->first();

        if ($existing === null) {
            return response()->json([
                'success' => false,
                'message' => 'Data karyawan tidak ditemukan.',
            ], 404);
        }

        $data = $request->validate([
            'nip' => ['required', 'string', 'max:50', Rule::unique('employees', 'nip')->ignore($id)],
            'full_name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'string', 'in:male,female'],
            'email' => [
                'required',
                'email',
                'max:150',
                $existing->user_id ? Rule::unique('users', 'email')->ignore((int) $existing->user_id) : 'unique:users,email',
            ],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', 'string', 'in:hrd,spv,karyawan'],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'join_date' => ['required', 'date'],
            'status' => ['required', 'string', 'in:active,probation,resigned'],
            'account_status' => ['required', 'string', 'in:active,inactive'],
        ]);

        $authUserId = $this->authUserId($request);
        if ((int) ($existing->user_id ?? 0) === $authUserId) {
            if ($data['role'] !== 'hrd' || $data['account_status'] !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak dapat menurunkan role atau menonaktifkan akun HRD yang sedang digunakan.',
                ], 422);
            }
        }

        DB::transaction(function () use ($id, $existing, $data): void {
            $now = now();

            DB::table('employees')->where('id', $id)->update([
                'nip' => $data['nip'],
                'full_name' => $data['full_name'],
                'gender' => $data['gender'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'department_id' => (int) $data['department_id'],
                'position_id' => isset($data['position_id']) ? (int) $data['position_id'] : null,
                'join_date' => $data['join_date'],
                'status' => $data['status'],
                'updated_at' => $now,
            ]);

            if ($existing->user_id !== null) {
                $userUpdate = [
                    'email' => $data['email'],
                    'role' => $data['role'],
                    'status' => $data['account_status'],
                    'updated_at' => $now,
                ];
                if (! empty($data['password'])) {
                    $userUpdate['password_hash'] = Hash::make($data['password']);
                }
                DB::table('users')->where('id', (int) $existing->user_id)->update($userUpdate);
            } else {
                DB::table('users')->insert([
                    'employee_id' => $id,
                    'email' => $data['email'],
                    'password_hash' => Hash::make($data['password'] ?: 'gapjoten123'),
                    'role' => $data['role'],
                    'status' => $data['account_status'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        });

        $updated = $this->findEmployeeById($id);

        return response()->json([
            'success' => true,
            'message' => 'Data karyawan berhasil diperbarui.',
            'data' => $this->formatEmployeeRow($updated),
        ]);
    }

    public function deleteEmployee(Request $request, int $id): JsonResponse
    {
        $existing = DB::table('employees')
            ->leftJoin('users', 'users.employee_id', '=', 'employees.id')
            ->where('employees.id', $id)
            ->select('employees.id', 'employees.full_name', 'users.id as user_id')
            ->first();

        if ($existing === null) {
            return response()->json([
                'success' => false,
                'message' => 'Data karyawan tidak ditemukan.',
            ], 404);
        }

        if ((int) ($existing->user_id ?? 0) === $this->authUserId($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus akun HRD yang sedang login.',
            ], 422);
        }

        DB::transaction(function () use ($id, $existing): void {
            if ($existing->user_id !== null) {
                DB::table('users')->where('id', (int) $existing->user_id)->delete();
            }
            DB::table('employees')->where('id', $id)->delete();
        });

        return response()->json([
            'success' => true,
            'message' => "Data karyawan {$existing->full_name} berhasil dihapus.",
        ]);
    }

    public function faceRegistrations(): JsonResponse
    {
        $rows = DB::table('employees')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('face_registrations', 'face_registrations.employee_id', '=', 'employees.id')
            ->leftJoin('users as registrars', 'registrars.id', '=', 'face_registrations.registered_by')
            ->leftJoin('employees as registrar_emp', 'registrar_emp.id', '=', 'registrars.employee_id')
            ->whereIn('employees.status', ['active', 'probation'])
            ->orderBy('employees.nip')
            ->select(
                'employees.id as employee_id',
                'employees.nip',
                'employees.full_name',
                'employees.status as employee_status',
                'departments.name as department',
                'positions.name as position',
                'face_registrations.id as registration_id',
                'face_registrations.template_hash',
                'face_registrations.consent_given',
                'face_registrations.consent_at',
                'face_registrations.liveness_verified',
                'face_registrations.retention_until',
                'face_registrations.status as face_status',
                'face_registrations.notes',
                'face_registrations.updated_at as registered_updated_at',
                'registrar_emp.full_name as registered_by_name'
            )
            ->get()
            ->map(fn ($row) => [
                'employeeId' => (int) $row->employee_id,
                'nip' => $row->nip,
                'fullName' => $row->full_name,
                'employeeStatus' => $row->employee_status,
                'department' => $row->department,
                'position' => $row->position,
                'isRegistered' => $row->registration_id !== null && $row->face_status === 'active',
                'faceStatus' => $row->face_status ?: 'unregistered',
                'templateFingerprint' => $row->template_hash ? substr((string) $row->template_hash, 0, 12).'...' : null,
                'consentGiven' => (bool) $row->consent_given,
                'consentAt' => $row->consent_at,
                'livenessVerified' => (bool) $row->liveness_verified,
                'retentionUntil' => $row->retention_until,
                'registeredByName' => $row->registered_by_name,
                'notes' => $row->notes,
                'updatedAt' => $row->registered_updated_at,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $rows,
                'retentionDays' => (int) ($this->loadSettingsMap()['biometric_retention_days'] ?? 365),
            ],
        ]);
    }

    public function storeFaceRegistration(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'consent_given' => ['required', 'accepted'],
            'face_signature' => ['required', 'string', 'min:12', 'max:20000'],
            'liveness_verified' => ['required', 'boolean'],
            'retention_days' => ['sometimes', 'integer', 'min:30', 'max:1825'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        if (! $data['liveness_verified']) {
            return response()->json([
                'success' => false,
                'message' => 'Pemeriksaan keaslian wajah (liveness) harus terpenuhi sebelum menyimpan referensi biometrik.',
            ], 422);
        }

        $settings = $this->loadSettingsMap();
        $retentionDays = (int) ($data['retention_days'] ?? $settings['biometric_retention_days'] ?? 365);
        $now = now();

        $templatePayload = json_encode([
            'employee_id' => (int) $data['employee_id'],
            'descriptor' => $data['face_signature'],
            'captured_at' => $now->toIso8601String(),
        ], JSON_THROW_ON_ERROR);

        $encryptedTemplate = Crypt::encryptString($templatePayload);
        $templateHash = hash('sha256', (string) $data['face_signature']);

        DB::table('face_registrations')->updateOrInsert(
            ['employee_id' => (int) $data['employee_id']],
            [
                'biometric_template_enc' => $encryptedTemplate,
                'template_hash' => $templateHash,
                'consent_given' => 1,
                'consent_at' => $now,
                'liveness_verified' => 1,
                'registered_by' => $this->authUserId($request),
                'retention_until' => $now->copy()->addDays($retentionDays)->toDateString(),
                'status' => 'active',
                'notes' => $data['notes'] ?? 'Pendaftaran wajah terenkripsi oleh HRD',
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Referensi data wajah karyawan berhasil disimpan secara terenkripsi dengan persetujuan karyawan.',
            'data' => [
                'employeeId' => (int) $data['employee_id'],
                'templateFingerprint' => substr($templateHash, 0, 12).'...',
                'retentionUntil' => $now->copy()->addDays($retentionDays)->toDateString(),
            ],
        ], 201);
    }

    public function deleteFaceRegistration(int $employeeId): JsonResponse
    {
        $deleted = DB::table('face_registrations')
            ->where('employee_id', $employeeId)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Data pendaftaran wajah karyawan tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data biometrik wajah karyawan berhasil dihapus secara permanen.',
        ]);
    }

    public function attendance(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $departmentId = $request->query('department_id');
        $employeeId = $request->query('employee_id');
        $status = $request->query('status');
        $method = $request->query('method');
        $today = now()->toDateString();

        $query = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->select(
                'attendances.*',
                'employees.nip',
                'employees.full_name',
                'departments.id as department_id',
                'departments.name as department',
                'positions.name as position'
            );

        if ($startDate) {
            $query->whereDate('attendances.date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('attendances.date', '<=', $endDate);
        }
        if ($departmentId) {
            $query->where('employees.department_id', (int) $departmentId);
        }
        if ($employeeId) {
            $query->where('attendances.employee_id', (int) $employeeId);
        }
        if (in_array($status, ['present', 'late', 'sick', 'leave', 'absent'], true)) {
            $query->where('attendances.status', $status);
        }
        if (in_array($method, ['face', 'manual'], true)) {
            $query->where('attendances.method', $method);
        }

        $records = $query->orderByDesc('attendances.date')
            ->orderBy('employees.full_name')
            ->limit(250)
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'employeeId' => (int) $row->employee_id,
                'nip' => $row->nip,
                'fullName' => $row->full_name,
                'departmentId' => $row->department_id !== null ? (int) $row->department_id : null,
                'department' => $row->department,
                'position' => $row->position,
                'date' => $row->date,
                'clockIn' => $row->clock_in,
                'clockOut' => $row->clock_out,
                'status' => $row->status,
                'method' => $row->method,
                'livenessPassed' => (bool) $row->liveness_passed,
                'notes' => $row->notes,
            ])
            ->values();

        $todayQuery = DB::table('employees')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('attendances', function ($join) use ($today): void {
                $join->on('attendances.employee_id', '=', 'employees.id')
                    ->where('attendances.date', '=', $today);
            })
            ->whereIn('employees.status', ['active', 'probation']);

        if ($departmentId) {
            $todayQuery->where('employees.department_id', (int) $departmentId);
        }

        $todayMonitoring = $todayQuery
            ->orderBy('employees.full_name')
            ->select(
                'employees.id as employee_id',
                'employees.nip',
                'employees.full_name',
                'departments.name as department',
                'positions.name as position',
                'attendances.date',
                'attendances.clock_in',
                'attendances.clock_out',
                'attendances.status',
                'attendances.method',
                'attendances.notes'
            )
            ->get()
            ->map(fn ($row) => [
                'employeeId' => (int) $row->employee_id,
                'nip' => $row->nip,
                'fullName' => $row->full_name,
                'department' => $row->department,
                'position' => $row->position,
                'date' => $row->date ?: $today,
                'clockIn' => $row->clock_in,
                'clockOut' => $row->clock_out,
                'status' => $row->status ?: 'not_checked_in',
                'method' => $row->method,
                'notes' => $row->notes,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'records' => $records,
                'todayMonitoring' => $todayMonitoring,
                'departments' => $this->departmentOptions(),
                'employees' => DB::table('employees')
                    ->whereIn('status', ['active', 'probation'])
                    ->orderBy('full_name')
                    ->get(['id', 'nip', 'full_name'])
                    ->map(fn ($e) => [
                        'id' => (int) $e->id,
                        'nip' => $e->nip,
                        'fullName' => $e->full_name,
                    ])
                    ->values(),
            ],
        ]);
    }

    public function upsertAttendance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'date' => ['required', 'date'],
            'status' => ['required', 'string', 'in:present,late,sick,leave,absent'],
            'clock_in' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'clock_out' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'method' => ['sometimes', 'string', 'in:face,manual'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $normalizeTime = static function (?string $value): ?string {
            if ($value === null || $value === '') {
                return null;
            }

            return strlen($value) === 5 ? $value.':00' : $value;
        };

        $now = now();
        $clockIn = $normalizeTime($data['clock_in'] ?? null);
        $clockOut = $normalizeTime($data['clock_out'] ?? null);

        $existing = DB::table('attendances')
            ->where('employee_id', (int) $data['employee_id'])
            ->where('date', $data['date'])
            ->first();

        $payload = [
            'clock_in' => $clockIn,
            'clock_out' => $clockOut,
            'status' => $data['status'],
            'method' => $data['method'] ?? 'manual',
            'liveness_passed' => ($data['method'] ?? 'manual') === 'face' ? 1 : 0,
            'notes' => $data['notes'] ?? 'Dicatat/dikoreksi oleh HRD',
            'updated_at' => $now,
        ];

        if ($existing === null) {
            DB::table('attendances')->insert(array_merge($payload, [
                'employee_id' => (int) $data['employee_id'],
                'date' => $data['date'],
                'created_at' => $now,
            ]));
        } else {
            DB::table('attendances')->where('id', $existing->id)->update($payload);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data absensi berhasil disimpan oleh HRD.',
        ]);
    }

    public function leaveRequests(Request $request): JsonResponse
    {
        $category = $request->query('category');
        $status = $request->query('status');
        $departmentId = $request->query('department_id');
        $search = trim((string) $request->query('search', ''));

        $query = $this->leaveQuery();

        if ($category === 'sakit') {
            $query->where('leave_requests.leave_type', 'sick');
        } elseif ($category === 'cuti') {
            $query->whereIn('leave_requests.leave_type', ['annual', 'maternity', 'unpaid']);
        }

        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('leave_requests.status', $status);
        }

        if ($departmentId) {
            $query->where('employees.department_id', (int) $departmentId);
        }

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($sub) use ($like): void {
                $sub->where('employees.full_name', 'like', $like)
                    ->orWhere('employees.nip', 'like', $like);
            });
        }

        $rows = $query->orderByRaw("CASE WHEN leave_requests.status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('leave_requests.created_at')
            ->get()
            ->map(fn ($row) => $this->formatLeaveRow($row))
            ->values();

        $summaryQuery = DB::table('leave_requests');
        if ($category === 'sakit') {
            $summaryQuery->where('leave_type', 'sick');
        } elseif ($category === 'cuti') {
            $summaryQuery->whereIn('leave_type', ['annual', 'maternity', 'unpaid']);
        }

        $summary = $summaryQuery
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $rows,
                'summary' => [
                    'pending' => $summary['pending'] ?? 0,
                    'approved' => $summary['approved'] ?? 0,
                    'rejected' => $summary['rejected'] ?? 0,
                ],
                'departments' => $this->departmentOptions(),
            ],
        ]);
    }

    public function decideLeaveRequest(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected'],
            'decision_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $leave = DB::table('leave_requests')->where('id', $id)->first();
        if ($leave === null) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan cuti/izin tidak ditemukan.',
            ], 404);
        }

        $approverId = $this->authUserId($request);
        $now = now();

        DB::transaction(function () use ($id, $leave, $data, $approverId, $now): void {
            DB::table('leave_requests')->where('id', $id)->update([
                'status' => $data['status'],
                'approved_by' => $approverId,
                'decision_notes' => $data['decision_notes'] ?? null,
                'updated_at' => $now,
            ]);

            if ($data['status'] === 'approved') {
                $targetStatus = $leave->leave_type === 'sick' ? 'sick' : 'leave';
                $cursor = Carbon::parse($leave->start_date);
                $end = Carbon::parse($leave->end_date);
                $daysProcessed = 0;

                while ($cursor->lessThanOrEqualTo($end) && $daysProcessed < 60) {
                    $dateStr = $cursor->toDateString();
                    $existingAtt = DB::table('attendances')
                        ->where('employee_id', $leave->employee_id)
                        ->where('date', $dateStr)
                        ->first();

                    if ($existingAtt === null) {
                        DB::table('attendances')->insert([
                            'employee_id' => $leave->employee_id,
                            'date' => $dateStr,
                            'clock_in' => null,
                            'clock_out' => null,
                            'status' => $targetStatus,
                            'method' => 'manual',
                            'liveness_passed' => 0,
                            'notes' => $leave->reason,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    } elseif ($existingAtt->status === 'absent') {
                        DB::table('attendances')->where('id', $existingAtt->id)->update([
                            'status' => $targetStatus,
                            'notes' => $leave->reason,
                            'updated_at' => $now,
                        ]);
                    }

                    $cursor->addDay();
                    $daysProcessed++;
                }
            }
        });

        $updated = $this->leaveQuery()->where('leave_requests.id', $id)->first();

        return response()->json([
            'success' => true,
            'message' => $data['status'] === 'approved'
                ? 'Pengajuan berhasil disetujui oleh HRD.'
                : 'Pengajuan berhasil ditolak oleh HRD.',
            'data' => $this->formatLeaveRow($updated),
        ]);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:5000'],
            'published_at' => ['nullable', 'date'],
        ]);

        $now = now();
        $id = (int) DB::table('company_announcements')->insertGetId([
            'title' => $data['title'],
            'body' => $data['body'],
            'created_by' => $this->authUserId($request),
            'published_at' => isset($data['published_at']) ? Carbon::parse($data['published_at']) : $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $created = $this->findAnnouncementById($id);

        return response()->json([
            'success' => true,
            'message' => 'Informasi perusahaan berhasil diterbitkan.',
            'data' => $created,
        ], 201);
    }

    public function updateAnnouncement(Request $request, int $id): JsonResponse
    {
        $existing = DB::table('company_announcements')->where('id', $id)->first();
        if ($existing === null) {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman tidak ditemukan.',
            ], 404);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:5000'],
            'published_at' => ['nullable', 'date'],
        ]);

        DB::table('company_announcements')->where('id', $id)->update([
            'title' => $data['title'],
            'body' => $data['body'],
            'published_at' => isset($data['published_at']) ? Carbon::parse($data['published_at']) : $existing->published_at,
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Informasi perusahaan berhasil diperbarui.',
            'data' => $this->findAnnouncementById($id),
        ]);
    }

    public function deleteAnnouncement(int $id): JsonResponse
    {
        $deleted = DB::table('company_announcements')->where('id', $id)->delete();
        if ($deleted === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Informasi perusahaan berhasil dihapus.',
        ]);
    }

    public function reports(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        $departmentId = $request->query('department_id');

        $employeesQuery = DB::table('employees')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->whereIn('employees.status', ['active', 'probation'])
            ->orderBy('departments.name')
            ->orderBy('employees.full_name')
            ->select(
                'employees.id',
                'employees.nip',
                'employees.full_name',
                'departments.name as department',
                'positions.name as position'
            );

        if ($departmentId) {
            $employeesQuery->where('employees.department_id', (int) $departmentId);
        }

        $employees = $employeesQuery->get();

        $recordsQuery = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->whereBetween('attendances.date', [$startDate, $endDate]);

        if ($departmentId) {
            $recordsQuery->where('employees.department_id', (int) $departmentId);
        }

        $allRecords = $recordsQuery->get([
            'attendances.employee_id',
            'attendances.date',
            'attendances.status',
            'attendances.method',
        ]);

        $groupedByEmployee = $allRecords->groupBy('employee_id');

        $rows = $employees->map(function ($member) use ($groupedByEmployee): array {
            $items = $groupedByEmployee->get($member->id, collect());

            return [
                'employeeId' => (int) $member->id,
                'nip' => $member->nip,
                'fullName' => $member->full_name,
                'department' => $member->department,
                'position' => $member->position,
                'totalDays' => $items->count(),
                'present' => $items->where('status', 'present')->count(),
                'late' => $items->where('status', 'late')->count(),
                'sick' => $items->where('status', 'sick')->count(),
                'leave' => $items->where('status', 'leave')->count(),
                'absent' => $items->where('status', 'absent')->count(),
                'faceCount' => $items->where('method', 'face')->count(),
                'manualCount' => $items->where('method', 'manual')->count(),
            ];
        })->values();

        $dailyBreakdown = $allRecords->groupBy('date')
            ->sortKeysDesc()
            ->map(function ($items, $date): array {
                return [
                    'date' => $date,
                    'total' => $items->count(),
                    'present' => $items->where('status', 'present')->count(),
                    'late' => $items->where('status', 'late')->count(),
                    'sick' => $items->where('status', 'sick')->count(),
                    'leave' => $items->where('status', 'leave')->count(),
                    'absent' => $items->where('status', 'absent')->count(),
                ];
            })
            ->values();

        $totals = [
            'employees' => $rows->count(),
            'totalRecords' => $allRecords->count(),
            'present' => $allRecords->where('status', 'present')->count(),
            'late' => $allRecords->where('status', 'late')->count(),
            'sick' => $allRecords->where('status', 'sick')->count(),
            'leave' => $allRecords->where('status', 'leave')->count(),
            'absent' => $allRecords->where('status', 'absent')->count(),
            'faceCount' => $allRecords->where('method', 'face')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'startDate' => $startDate,
                'endDate' => $endDate,
                'totals' => $totals,
                'rows' => $rows,
                'dailyBreakdown' => $dailyBreakdown,
                'departments' => $this->departmentOptions(),
            ],
        ]);
    }

    public function settings(): JsonResponse
    {
        $accounts = DB::table('users')
            ->leftJoin('employees', 'employees.id', '=', 'users.employee_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->orderBy('users.id')
            ->select(
                'users.id',
                'users.employee_id',
                'users.email',
                'users.role',
                'users.status',
                'employees.nip',
                'employees.full_name',
                'departments.name as department'
            )
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'employeeId' => $row->employee_id !== null ? (int) $row->employee_id : null,
                'nip' => $row->nip,
                'fullName' => $row->full_name ?: $row->email,
                'department' => $row->department,
                'email' => $row->email,
                'role' => $row->role,
                'status' => $row->status,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'settings' => $this->loadSettingsMap(),
                'departments' => $this->departmentOptions(),
                'positions' => $this->positionOptions(),
                'accounts' => $accounts,
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:150'],
            'office_location' => ['required', 'string', 'max:150'],
            'work_start' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'work_end' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'late_tolerance_minutes' => ['required', 'integer', 'min:0', 'max:120'],
            'annual_leave_quota' => ['required', 'integer', 'min:1', 'max:60'],
            'biometric_retention_days' => ['required', 'integer', 'min:30', 'max:1825'],
            'allow_alternative_attendance' => ['required', 'boolean'],
        ]);

        $descriptions = [
            'company_name' => 'Nama resmi perusahaan',
            'office_location' => 'Lokasi kantor operasional utama',
            'work_start' => 'Jam masuk kerja standar (WIB)',
            'work_end' => 'Jam pulang kerja standar (WIB)',
            'late_tolerance_minutes' => 'Batas toleransi keterlambatan (menit)',
            'annual_leave_quota' => 'Jatah cuti tahunan per karyawan (hari)',
            'biometric_retention_days' => 'Masa retensi data referensi wajah (hari)',
            'allow_alternative_attendance' => 'Izinkan prosedur alternatif saat kamera terkendala',
        ];

        $userId = $this->authUserId($request);
        $now = now();

        foreach ($descriptions as $key => $description) {
            $value = $key === 'allow_alternative_attendance'
                ? ($data[$key] ? '1' : '0')
                : (string) $data[$key];

            DB::table('system_settings')->updateOrInsert(
                ['setting_key' => $key],
                [
                    'setting_value' => $value,
                    'description' => $description,
                    'updated_by' => $userId,
                    'updated_at' => $now,
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan sistem berhasil disimpan.',
            'data' => $this->loadSettingsMap(),
        ]);
    }

    public function storeDepartment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:20', 'unique:departments,code'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $now = now();
        $id = (int) DB::table('departments')->insertGetId([
            'name' => $data['name'],
            'code' => strtoupper(trim($data['code'])),
            'description' => $data['description'] ?? null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Departemen baru berhasil ditambahkan.',
            'data' => ['id' => $id],
        ], 201);
    }

    public function storePosition(Request $request): JsonResponse
    {
        $data = $request->validate([
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'name' => ['required', 'string', 'max:100'],
        ]);

        $now = now();
        $id = (int) DB::table('positions')->insertGetId([
            'department_id' => (int) $data['department_id'],
            'name' => $data['name'],
            'base_salary' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Jabatan baru berhasil ditambahkan.',
            'data' => ['id' => $id],
        ], 201);
    }

    public function updateAccount(Request $request, int $id): JsonResponse
    {
        $user = DB::table('users')->where('id', $id)->first();
        if ($user === null) {
            return response()->json([
                'success' => false,
                'message' => 'Akun pengguna tidak ditemukan.',
            ], 404);
        }

        $data = $request->validate([
            'role' => ['required', 'string', 'in:hrd,spv,karyawan'],
            'status' => ['required', 'string', 'in:active,inactive'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        if ($id === $this->authUserId($request) && ($data['role'] !== 'hrd' || $data['status'] !== 'active')) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat menonaktifkan atau mengubah role akun HRD yang sedang aktif.',
            ], 422);
        }

        $update = [
            'role' => $data['role'],
            'status' => $data['status'],
            'updated_at' => now(),
        ];

        if (! empty($data['password'])) {
            $update['password_hash'] = Hash::make($data['password']);
        }

        DB::table('users')->where('id', $id)->update($update);

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan akun pengguna berhasil diperbarui.',
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        $hrd = $this->hrdProfile($request);
        if ($hrd === null) {
            return response()->json([
                'success' => false,
                'message' => 'Data profil HRD tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (int) $hrd->id,
                'nip' => $hrd->nip,
                'fullName' => $hrd->full_name,
                'gender' => $hrd->gender,
                'email' => $hrd->email,
                'phone' => $hrd->phone,
                'address' => $hrd->address,
                'department' => $hrd->department_name,
                'position' => $hrd->position_name,
                'joinDate' => $hrd->join_date,
                'status' => $hrd->status,
                'role' => $hrd->role,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $hrd = $this->hrdProfile($request);
        if ($hrd === null) {
            return response()->json([
                'success' => false,
                'message' => 'Data profil HRD tidak ditemukan.',
            ], 404);
        }

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'string', 'in:male,female'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        DB::table('employees')->where('id', $hrd->id)->update([
            'full_name' => $data['full_name'],
            'gender' => $data['gender'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'updated_at' => now(),
        ]);

        return $this->profile($request);
    }

    private function authUserId(Request $request): int
    {
        $authUser = $request->attributes->get('auth_user');

        return is_array($authUser) ? (int) ($authUser['id'] ?? 0) : 0;
    }

    private function hrdProfile(Request $request): ?object
    {
        return DB::table('users')
            ->join('employees', 'employees.id', '=', 'users.employee_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->where('users.id', $this->authUserId($request))
            ->select(
                'employees.*',
                'users.email',
                'users.role',
                'departments.name as department_name',
                'positions.name as position_name'
            )
            ->first();
    }

    private function findEmployeeById(int $id): ?object
    {
        return DB::table('employees')
            ->leftJoin('users', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('face_registrations', 'face_registrations.employee_id', '=', 'employees.id')
            ->where('employees.id', $id)
            ->select(
                'employees.*',
                'users.id as user_id',
                'users.email',
                'users.role',
                'users.status as account_status',
                'departments.name as department_name',
                'positions.name as position_name',
                'face_registrations.status as face_status',
                'face_registrations.consent_at as face_consent_at'
            )
            ->first();
    }

    private function formatEmployeeRow(?object $row): array
    {
        if ($row === null) {
            return [];
        }

        return [
            'id' => (int) $row->id,
            'userId' => $row->user_id !== null ? (int) $row->user_id : null,
            'nip' => $row->nip,
            'fullName' => $row->full_name,
            'gender' => $row->gender,
            'email' => $row->email,
            'phone' => $row->phone,
            'address' => $row->address,
            'departmentId' => $row->department_id !== null ? (int) $row->department_id : null,
            'department' => $row->department_name,
            'positionId' => $row->position_id !== null ? (int) $row->position_id : null,
            'position' => $row->position_name,
            'joinDate' => $row->join_date,
            'status' => $row->status,
            'role' => $row->role ?: 'karyawan',
            'accountStatus' => $row->account_status ?: 'active',
            'faceStatus' => $row->face_status ?: 'unregistered',
            'faceConsentAt' => $row->face_consent_at,
        ];
    }

    private function leaveQuery()
    {
        return DB::table('leave_requests')
            ->join('employees', 'employees.id', '=', 'leave_requests.employee_id')
            ->leftJoin('users', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('users as approvers', 'approvers.id', '=', 'leave_requests.approved_by')
            ->leftJoin('employees as approver_emp', 'approver_emp.id', '=', 'approvers.employee_id')
            ->select(
                'leave_requests.*',
                'employees.nip',
                'employees.full_name',
                'employees.phone',
                'employees.address',
                'users.email',
                'departments.name as department',
                'positions.name as position',
                'approver_emp.full_name as approver_name'
            );
    }

    private function formatLeaveRow(?object $row): array
    {
        if ($row === null) {
            return [];
        }

        return [
            'id' => (int) $row->id,
            'employeeId' => (int) $row->employee_id,
            'nip' => $row->nip,
            'fullName' => $row->full_name,
            'email' => $row->email ?? null,
            'phone' => $row->phone ?? null,
            'address' => $row->address ?? null,
            'department' => $row->department,
            'position' => $row->position,
            'leaveType' => $row->leave_type,
            'startDate' => $row->start_date,
            'endDate' => $row->end_date,
            'reason' => $row->reason,
            'hasMedicalCertificate' => ! empty($row->medical_certificate_path),
            'status' => $row->status,
            'approverName' => $row->approver_name,
            'decisionNotes' => $row->decision_notes ?? null,
            'createdAt' => $row->created_at,
            'updatedAt' => $row->updated_at,
        ];
    }

    private function findAnnouncementById(int $id): ?array
    {
        $row = DB::table('company_announcements')
            ->leftJoin('users', 'users.id', '=', 'company_announcements.created_by')
            ->leftJoin('employees', 'employees.id', '=', 'users.employee_id')
            ->where('company_announcements.id', $id)
            ->select(
                'company_announcements.id',
                'company_announcements.title',
                'company_announcements.body',
                'company_announcements.published_at',
                'employees.full_name as author_name'
            )
            ->first();

        if ($row === null) {
            return null;
        }

        return [
            'id' => (int) $row->id,
            'title' => $row->title,
            'body' => $row->body,
            'publishedAt' => $row->published_at,
            'authorName' => $row->author_name ?: 'HRD',
        ];
    }

    private function departmentOptions()
    {
        return DB::table('departments')
            ->leftJoin('employees', function ($join): void {
                $join->on('employees.department_id', '=', 'departments.id')
                    ->whereIn('employees.status', ['active', 'probation']);
            })
            ->groupBy('departments.id', 'departments.name', 'departments.code', 'departments.description')
            ->orderBy('departments.name')
            ->select(
                'departments.id',
                'departments.name',
                'departments.code',
                'departments.description',
                DB::raw('COUNT(employees.id) AS employee_count')
            )
            ->get()
            ->map(fn ($d) => [
                'id' => (int) $d->id,
                'name' => $d->name,
                'code' => $d->code,
                'description' => $d->description,
                'employeeCount' => (int) $d->employee_count,
            ])
            ->values();
    }

    private function positionOptions()
    {
        return DB::table('positions')
            ->join('departments', 'departments.id', '=', 'positions.department_id')
            ->orderBy('departments.name')
            ->orderBy('positions.name')
            ->select('positions.id', 'positions.department_id', 'positions.name', 'departments.name as department_name')
            ->get()
            ->map(fn ($p) => [
                'id' => (int) $p->id,
                'departmentId' => (int) $p->department_id,
                'name' => $p->name,
                'departmentName' => $p->department_name,
            ])
            ->values();
    }

    private function loadSettingsMap(): array
    {
        $rows = DB::table('system_settings')
            ->pluck('setting_value', 'setting_key')
            ->all();

        $merged = array_merge(self::DEFAULT_SETTINGS, $rows);
        $merged['late_tolerance_minutes'] = (int) $merged['late_tolerance_minutes'];
        $merged['annual_leave_quota'] = (int) $merged['annual_leave_quota'];
        $merged['biometric_retention_days'] = (int) $merged['biometric_retention_days'];
        $merged['allow_alternative_attendance'] = (string) $merged['allow_alternative_attendance'] === '1';

        return $merged;
    }

    public function summaryDetail(Request $request): JsonResponse
    {
        $type = (string) $request->query('type', 'total');
        $today = now()->toDateString();

        if ($type === 'total') {
            $items = DB::table('employees')
                ->leftJoin('users', 'users.employee_id', '=', 'employees.id')
                ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
                ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
                ->leftJoin('face_registrations', 'face_registrations.employee_id', '=', 'employees.id')
                ->whereIn('employees.status', ['active', 'probation'])
                ->orderBy('employees.nip')
                ->select(
                    'employees.id',
                    'employees.nip',
                    'employees.full_name',
                    'employees.status',
                    'employees.join_date',
                    'employees.phone',
                    'users.email',
                    'departments.name as department',
                    'positions.name as position',
                    'face_registrations.status as face_status'
                )
                ->get()
                ->map(fn ($row) => [
                    'employeeId' => (int) $row->id,
                    'nip' => $row->nip,
                    'fullName' => $row->full_name,
                    'department' => $row->department,
                    'position' => $row->position,
                    'status' => $row->status,
                    'joinDate' => $row->join_date,
                    'email' => $row->email,
                    'phone' => $row->phone,
                    'faceStatus' => $row->face_status ?: 'unregistered',
                ])
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'type' => 'total',
                    'title' => 'Detail Total Karyawan',
                    'subtitle' => 'Seluruh karyawan aktif dan probation terdaftar di perusahaan.',
                    'items' => $items,
                ],
            ]);
        }

        $query = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->whereIn('employees.status', ['active', 'probation'])
            ->where('attendances.date', $today)
            ->orderBy('employees.full_name')
            ->select(
                'employees.id as employee_id',
                'employees.nip',
                'employees.full_name',
                'departments.name as department',
                'positions.name as position',
                'attendances.clock_in',
                'attendances.clock_out',
                'attendances.status',
                'attendances.method',
                'attendances.notes'
            );

        if ($type === 'present') {
            $query->whereIn('attendances.status', ['present', 'late']);
            $title = 'Detail Hadir Hari Ini';
            $subtitle = 'Daftar karyawan yang sudah melakukan Clock In hari ini (tepat waktu & terlambat).';
        } elseif ($type === 'late') {
            $query->where('attendances.status', 'late');
            $title = 'Detail Terlambat Hari Ini';
            $subtitle = 'Daftar karyawan yang melakukan Clock In melewati batas toleransi keterlambatan.';
        } elseif ($type === 'leave_sick') {
            $query->whereIn('attendances.status', ['sick', 'leave']);
            $title = 'Detail Cuti & Izin Sakit Hari Ini';
            $subtitle = 'Daftar karyawan yang berstatus cuti atau izin sakit hari ini.';
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Tipe ringkasan tidak valid.',
            ], 422);
        }

        $items = $query->get()
            ->map(fn ($row) => [
                'employeeId' => (int) $row->employee_id,
                'nip' => $row->nip,
                'fullName' => $row->full_name,
                'department' => $row->department,
                'position' => $row->position,
                'clockIn' => $row->clock_in,
                'clockOut' => $row->clock_out,
                'status' => $row->status,
                'method' => $row->method,
                'notes' => $row->notes,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'type' => $type,
                'title' => $title,
                'subtitle' => $subtitle,
                'items' => $items,
            ],
        ]);
    }
}
