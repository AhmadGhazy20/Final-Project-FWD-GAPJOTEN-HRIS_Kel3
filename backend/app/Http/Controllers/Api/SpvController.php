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
        $spvEmployeeId = $this->spvEmployeeId($request);
        $name = $this->spvName($request);

        $totalAnggota = (int) DB::table('v_spv_dashboard')
            ->where('spv_id', $spvEmployeeId)
            ->value('total_anggota');

        $attendance = DB::table('v_spv_attendance_today')
            ->where('spv_id', $spvEmployeeId)
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($value) => (int) $value)
            ->all();

        $leave = DB::table('v_spv_leave_requests')
            ->where('spv_id', $spvEmployeeId)
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($value) => (int) $value)
            ->all();

        return response()->json([
            'success' => true,
            'message' => "Halo, {$name}! Berikut ringkasan tim Anda hari ini.",
            'data' => [
                'name' => $name,
                'greeting' => "Pak {$name}",
                'stats' => [
                    'totalAnggota' => $totalAnggota,
                    'hadirHariIni' => $attendance['hadir'] ?? 0,
                    'menungguPersetujuan' => $leave['pending'] ?? 0,
                ],
                'attendanceSummary' => [
                    'hadir' => $attendance['hadir'] ?? 0,
                    'telat' => $attendance['telat'] ?? 0,
                    'alpha' => $attendance['alpha'] ?? 0,
                    'izin' => $attendance['izin'] ?? 0,
                    'sakit' => $attendance['sakit'] ?? 0,
                ],
                'leaveSummary' => [
                    'pending' => $leave['pending'] ?? 0,
                    'approved' => $leave['approved'] ?? 0,
                    'rejected' => $leave['rejected'] ?? 0,
                ],
            ],
        ]);
    }

    public function team(Request $request): JsonResponse
    {
        $members = DB::table('v_spv_team_members')
            ->where('spv_id', $this->spvEmployeeId($request))
            ->orderBy('full_name')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->employee_id,
                'employeeId' => $row->employee_id,
                'nip' => $row->nip,
                'name' => $row->full_name,
                'fullName' => $row->full_name,
                'position' => $row->position,
                'divisionId' => $row->division_id,
                'division' => $row->division_name,
                'email' => $row->email,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $members,
        ]);
    }

    public function attendance(Request $request): JsonResponse
    {
        $rows = DB::table('v_spv_attendance_today')
            ->where('spv_id', $this->spvEmployeeId($request))
            ->orderBy('full_name')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->employee_id,
                'employeeId' => $row->employee_id,
                'nip' => $row->nip,
                'name' => $row->full_name,
                'fullName' => $row->full_name,
                'date' => $row->attendance_date,
                'clockIn' => $row->clock_in,
                'clockOut' => $row->clock_out,
                'status' => $row->status,
                'method' => $row->method,
                'livenessPassed' => (bool) $row->liveness_passed,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function lateEmployees(Request $request): JsonResponse
    {
        $rows = DB::table('v_spv_attendance_today')
            ->where('spv_id', $this->spvEmployeeId($request))
            ->where(function ($query) {
                $query->where('status', 'telat')
                    ->orWhere('clock_in', '>', DB::raw("CONCAT(CURDATE(), ' 08:15:00')"));
            })
            ->orderBy('full_name')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->employee_id,
                'employeeId' => $row->employee_id,
                'nip' => $row->nip,
                'name' => $row->full_name,
                'fullName' => $row->full_name,
                'date' => $row->attendance_date,
                'clockIn' => $row->clock_in,
                'status' => $row->status,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function leaveRequests(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $query = DB::table('v_spv_leave_requests')->where('spv_id', $this->spvEmployeeId($request));

        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('status', $status);
        }

        $rows = $query->orderByDesc('created_at')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->leave_request_id,
                'employeeId' => $row->employee_id,
                'nip' => $row->nip ?? null,
                'name' => $row->full_name,
                'fullName' => $row->full_name,
                'leaveType' => $row->type,
                'startDate' => $row->start_date,
                'endDate' => $row->end_date,
                'reason' => $row->reason,
                'status' => $row->status,
                'createdAt' => $row->created_at,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    private function spvEmployeeId(Request $request): int
    {
        $authUser = $request->attributes->get('auth_user');
        $userId = is_array($authUser) ? (int) ($authUser['id'] ?? 0) : 0;

        return (int) DB::table('employees')->where('user_id', $userId)->value('id');
    }

    private function spvName(Request $request): string
    {
        $authUser = $request->attributes->get('auth_user');

        return is_array($authUser) ? (string) ($authUser['name'] ?? 'Jonathan') : 'Jonathan';
    }
}
