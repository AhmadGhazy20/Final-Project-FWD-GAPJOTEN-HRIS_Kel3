<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SpvController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        $today = now()->toDateString();

        $totalMembers = (int) $this->teamQuery($spv->department_id)->count();

        $attendanceCounts = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->join('users', 'users.employee_id', '=', 'employees.id')
            ->where('employees.department_id', $spv->department_id)
            ->where('users.role', 'karyawan')
            ->where('attendances.date', $today)
            ->selectRaw('attendances.status, COUNT(*) AS total')
            ->groupBy('attendances.status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $leaveCounts = DB::table('leave_requests')
            ->join('employees', 'employees.id', '=', 'leave_requests.employee_id')
            ->join('users', 'users.employee_id', '=', 'employees.id')
            ->where('employees.department_id', $spv->department_id)
            ->where('users.role', 'karyawan')
            ->selectRaw('leave_requests.status, COUNT(*) AS total')
            ->groupBy('leave_requests.status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $todayTeamAttendance = $this->todayMonitoringQuery($spv->department_id)
            ->limit(6)
            ->get()
            ->map(fn ($row) => $this->formatMonitoringRow($row))
            ->values();

        $pendingLeaves = $this->teamLeaveQuery($spv->department_id)
            ->where('leave_requests.status', 'pending')
            ->orderByDesc('leave_requests.created_at')
            ->limit(4)
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

        $presentCount = ($attendanceCounts['present'] ?? 0) + ($attendanceCounts['late'] ?? 0);

        return response()->json([
            'success' => true,
            'data' => [
                'spv' => [
                    'name' => $spv->full_name,
                    'departmentId' => (int) $spv->department_id,
                    'department' => $spv->department_name,
                    'position' => $spv->position_name,
                ],
                'stats' => [
                    'totalMembers' => $totalMembers,
                    'presentToday' => $presentCount,
                    'lateToday' => $attendanceCounts['late'] ?? 0,
                    'sickOrLeaveToday' => ($attendanceCounts['sick'] ?? 0) + ($attendanceCounts['leave'] ?? 0),
                    'pendingLeaves' => $leaveCounts['pending'] ?? 0,
                ],
                'attendanceSummary' => [
                    'present' => $attendanceCounts['present'] ?? 0,
                    'late' => $attendanceCounts['late'] ?? 0,
                    'sick' => $attendanceCounts['sick'] ?? 0,
                    'leave' => $attendanceCounts['leave'] ?? 0,
                    'absent' => $attendanceCounts['absent'] ?? 0,
                ],
                'leaveSummary' => [
                    'pending' => $leaveCounts['pending'] ?? 0,
                    'approved' => $leaveCounts['approved'] ?? 0,
                    'rejected' => $leaveCounts['rejected'] ?? 0,
                ],
                'todayTeamAttendance' => $todayTeamAttendance,
                'pendingLeaves' => $pendingLeaves,
                'announcements' => $announcements,
            ],
        ]);
    }

    public function team(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        $members = $this->teamQuery($spv->department_id)
            ->orderBy('employees.full_name')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'nip' => $row->nip,
                'fullName' => $row->full_name,
                'gender' => $row->gender,
                'email' => $row->email,
                'phone' => $row->phone,
                'position' => $row->position,
                'department' => $row->department,
                'joinDate' => $row->join_date,
                'status' => $row->status,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'department' => $spv->department_name,
                'members' => $members,
            ],
        ]);
    }

    public function attendanceToday(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        $rows = $this->todayMonitoringQuery($spv->department_id)
            ->get()
            ->map(fn ($row) => $this->formatMonitoringRow($row))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function attendanceHistory(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $employeeId = $request->query('employee_id');
        $status = $request->query('status');

        $query = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->join('users', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->where('employees.department_id', $spv->department_id)
            ->where('users.role', 'karyawan')
            ->select(
                'attendances.id',
                'attendances.employee_id',
                'attendances.date',
                'attendances.clock_in',
                'attendances.clock_out',
                'attendances.status',
                'attendances.method',
                'attendances.liveness_passed',
                'attendances.notes',
                'employees.nip',
                'employees.full_name',
                'positions.name as position'
            );

        if ($startDate) {
            $query->whereDate('attendances.date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('attendances.date', '<=', $endDate);
        }
        if ($employeeId) {
            $query->where('attendances.employee_id', (int) $employeeId);
        }
        if (in_array($status, ['present', 'late', 'sick', 'leave', 'absent'], true)) {
            $query->where('attendances.status', $status);
        }

        $rows = $query->orderByDesc('attendances.date')
            ->orderBy('employees.full_name')
            ->limit(150)
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'employeeId' => (int) $row->employee_id,
                'nip' => $row->nip,
                'fullName' => $row->full_name,
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

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function leaveRequests(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        $category = $request->query('category');
        $status = $request->query('status');

        $query = $this->teamLeaveQuery($spv->department_id);

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
            ->map(fn ($row) => $this->formatLeaveRow($row))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function reports(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        $startDate = $request->query('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        $members = $this->teamQuery($spv->department_id)
            ->orderBy('employees.full_name')
            ->get();

        $records = DB::table('attendances')
            ->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->where('employees.department_id', $spv->department_id)
            ->whereBetween('attendances.date', [$startDate, $endDate])
            ->select('attendances.employee_id', 'attendances.status', 'attendances.method')
            ->get()
            ->groupBy('employee_id');

        $summary = $members->map(function ($member) use ($records): array {
            $items = $records->get($member->id, collect());

            return [
                'employeeId' => (int) $member->id,
                'nip' => $member->nip,
                'fullName' => $member->full_name,
                'position' => $member->position,
                'totalDays' => $items->count(),
                'present' => $items->where('status', 'present')->count(),
                'late' => $items->where('status', 'late')->count(),
                'sick' => $items->where('status', 'sick')->count(),
                'leave' => $items->where('status', 'leave')->count(),
                'absent' => $items->where('status', 'absent')->count(),
                'faceCount' => $items->where('method', 'face')->count(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'department' => $spv->department_name,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'rows' => $summary,
            ],
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (int) $spv->id,
                'nip' => $spv->nip,
                'fullName' => $spv->full_name,
                'gender' => $spv->gender,
                'email' => $spv->email,
                'phone' => $spv->phone,
                'address' => $spv->address,
                'department' => $spv->department_name,
                'position' => $spv->position_name,
                'joinDate' => $spv->join_date,
                'status' => $spv->status,
                'role' => $spv->role,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $spv = $this->spvScope($request);
        if ($spv === null) {
            return $this->missingSpvResponse();
        }

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'string', 'in:male,female'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        DB::table('employees')->where('id', $spv->id)->update([
            'full_name' => $data['full_name'],
            'gender' => $data['gender'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'updated_at' => now(),
        ]);

        return $this->profile($request);
    }

    private function spvScope(Request $request): ?object
    {
        $authUser = $request->attributes->get('auth_user');
        $userId = is_array($authUser) ? (int) ($authUser['id'] ?? 0) : 0;

        return DB::table('users')
            ->join('employees', 'employees.id', '=', 'users.employee_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->where('users.id', $userId)
            ->whereNotNull('employees.department_id')
            ->select(
                'employees.*',
                'users.email',
                'users.role',
                'departments.name as department_name',
                'positions.name as position_name'
            )
            ->first();
    }

    private function teamQuery(int $departmentId)
    {
        return DB::table('employees')
            ->join('users', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->where('employees.department_id', $departmentId)
            ->where('users.role', 'karyawan')
            ->whereIn('employees.status', ['active', 'probation'])
            ->select(
                'employees.id',
                'employees.nip',
                'employees.full_name',
                'employees.gender',
                'employees.phone',
                'employees.join_date',
                'employees.status',
                'users.email',
                'departments.name as department',
                'positions.name as position'
            );
    }

    private function todayMonitoringQuery(int $departmentId)
    {
        $today = now()->toDateString();

        return DB::table('employees')
            ->join('users', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('attendances', function ($join) use ($today): void {
                $join->on('attendances.employee_id', '=', 'employees.id')
                    ->where('attendances.date', '=', $today);
            })
            ->where('employees.department_id', $departmentId)
            ->where('users.role', 'karyawan')
            ->whereIn('employees.status', ['active', 'probation'])
            ->select(
                'employees.id as employee_id',
                'employees.nip',
                'employees.full_name',
                'positions.name as position',
                'attendances.date',
                'attendances.clock_in',
                'attendances.clock_out',
                'attendances.status',
                'attendances.method',
                'attendances.liveness_passed',
                'attendances.notes'
            )
            ->orderBy('employees.full_name');
    }

    private function teamLeaveQuery(int $departmentId)
    {
        return DB::table('leave_requests')
            ->join('employees', 'employees.id', '=', 'leave_requests.employee_id')
            ->join('users', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->leftJoin('users as approvers', 'approvers.id', '=', 'leave_requests.approved_by')
            ->leftJoin('employees as approver_emp', 'approver_emp.id', '=', 'approvers.employee_id')
            ->where('employees.department_id', $departmentId)
            ->where('users.role', 'karyawan')
            ->select(
                'leave_requests.*',
                'employees.nip',
                'employees.full_name',
                'positions.name as position',
                'approver_emp.full_name as approver_name'
            );
    }

    private function formatMonitoringRow(object $row): array
    {
        return [
            'employeeId' => (int) $row->employee_id,
            'nip' => $row->nip,
            'fullName' => $row->full_name,
            'position' => $row->position,
            'date' => $row->date ?: now()->toDateString(),
            'clockIn' => $row->clock_in,
            'clockOut' => $row->clock_out,
            'status' => $row->status ?: 'not_checked_in',
            'method' => $row->method,
            'livenessPassed' => $row->liveness_passed !== null ? (bool) $row->liveness_passed : null,
            'notes' => $row->notes,
        ];
    }

    private function formatLeaveRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'employeeId' => (int) $row->employee_id,
            'nip' => $row->nip,
            'fullName' => $row->full_name,
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
        ];
    }

    private function missingSpvResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data divisi SPV tidak ditemukan.',
        ], 404);
    }
}
