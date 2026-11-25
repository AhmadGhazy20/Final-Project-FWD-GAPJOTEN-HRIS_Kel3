<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SharedController extends Controller
{
    public function announcements(): JsonResponse
    {
        $rows = DB::table('company_announcements')
            ->leftJoin('users', 'users.id', '=', 'company_announcements.created_by')
            ->leftJoin('employees', 'employees.id', '=', 'users.employee_id')
            ->select(
                'company_announcements.id',
                'company_announcements.title',
                'company_announcements.body',
                'company_announcements.published_at',
                'employees.full_name as author_name'
            )
            ->orderByDesc('company_announcements.published_at')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'title' => $row->title,
                'body' => $row->body,
                'publishedAt' => $row->published_at,
                'authorName' => $row->author_name ?: 'HRD',
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function downloadMedicalCertificate(Request $request, int $id): BinaryFileResponse|JsonResponse
    {
        $leave = DB::table('leave_requests')
            ->join('employees', 'employees.id', '=', 'leave_requests.employee_id')
            ->where('leave_requests.id', $id)
            ->select('leave_requests.employee_id', 'leave_requests.medical_certificate_path', 'employees.department_id')
            ->first();

        if ($leave === null || empty($leave->medical_certificate_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Dokumen surat dokter tidak ditemukan.',
            ], 404);
        }

        $authUser = $request->attributes->get('auth_user');
        $userId = is_array($authUser) ? (int) ($authUser['id'] ?? 0) : 0;
        $role = is_array($authUser) ? (string) ($authUser['role'] ?? '') : '';

        $viewer = DB::table('users')
            ->leftJoin('employees', 'employees.id', '=', 'users.employee_id')
            ->where('users.id', $userId)
            ->select('users.employee_id', 'employees.department_id')
            ->first();

        $allowed = $role === 'hrd'
            || ($role === 'karyawan' && $viewer !== null && (int) $viewer->employee_id === (int) $leave->employee_id)
            || ($role === 'spv' && $viewer !== null && (int) $viewer->department_id === (int) $leave->department_id);

        if (! $allowed) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak berhak mengakses dokumen ini.',
            ], 403);
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($leave->medical_certificate_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File surat dokter tidak ditemukan di server.',
            ], 404);
        }

        return response()->download($disk->path($leave->medical_certificate_path));
    }
}
