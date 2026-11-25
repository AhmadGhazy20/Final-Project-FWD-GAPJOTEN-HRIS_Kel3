<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApiHrisTest extends TestCase
{
    public function test_health_endpoint_returns_success(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_karyawan_can_access_dashboard_attendance_leaves_and_profile(): void
    {
        DB::beginTransaction();

        try {
            DB::table('attendances')
                ->where('employee_id', 3)
                ->whereDate('date', now()->toDateString())
                ->delete();

            DB::table('leave_requests')
                ->where('employee_id', 3)
                ->where('leave_type', 'annual')
                ->where('status', 'approved')
                ->delete();

            $login = $this->postJson('/api/auth/login', [
                'email' => 'budi@gapjoten.id',
                'password' => 'karyawan123',
            ])->assertOk();

            $token = $login->json('data.token');

            $this->withToken($token)
                ->getJson('/api/karyawan/dashboard')
                ->assertOk()
                ->assertJsonPath('data.profile.nip', 'EMP003')
                ->assertJsonCount(5, 'data.weeklyAttendance')
                ->assertJsonPath('data.monthlyStats.remainingLeaveDays', 12);

            $this->withToken($token)
                ->postJson('/api/karyawan/attendance/clock-in', [
                    'method' => 'face',
                    'liveness_passed' => false,
                ])
                ->assertStatus(422);

            $this->withToken($token)
                ->postJson('/api/karyawan/attendance/clock-in', [
                    'method' => 'face',
                    'liveness_passed' => true,
                    'notes' => 'Verifikasi wajah sukses',
                ])
                ->assertCreated()
                ->assertJsonPath('data.method', 'face');

            $this->withToken($token)
                ->postJson('/api/karyawan/attendance/clock-in')
                ->assertStatus(409);

            $this->withToken($token)
                ->postJson('/api/karyawan/attendance/clock-out', [
                    'method' => 'face',
                    'liveness_passed' => true,
                ])
                ->assertOk();

            $this->withToken($token)
                ->postJson('/api/karyawan/leave-requests', [
                    'leave_type' => 'annual',
                    'start_date' => now()->addDays(3)->toDateString(),
                    'end_date' => now()->addDays(4)->toDateString(),
                    'reason' => 'Cuti keluarga',
                ])
                ->assertCreated()
                ->assertJsonPath('data.status', 'pending');

            $this->withToken($token)
                ->putJson('/api/karyawan/profile', [
                    'full_name' => 'Budi Santoso',
                    'gender' => 'male',
                    'phone' => '081234567899',
                    'address' => 'Bekasi Selatan',
                ])
                ->assertOk()
                ->assertJsonPath('data.phone', '081234567899');

            $this->withToken($token)
                ->getJson('/api/announcements')
                ->assertOk()
                ->assertJsonPath('success', true);

            $this->withToken($token)
                ->getJson('/api/spv/dashboard')
                ->assertForbidden();
        } finally {
            DB::rollBack();
        }
    }

    public function test_karyawan_can_submit_sick_leave_with_medical_certificate(): void
    {
        Storage::fake('public');
        DB::beginTransaction();

        try {
            $login = $this->postJson('/api/auth/login', [
                'email' => 'budi@gapjoten.id',
                'password' => 'karyawan123',
            ])->assertOk();

            $token = $login->json('data.token');

            $this->withToken($token)
                ->postJson('/api/karyawan/leave-requests', [
                    'leave_type' => 'sick',
                    'start_date' => now()->toDateString(),
                    'end_date' => now()->toDateString(),
                    'reason' => 'Sakit demam',
                ])
                ->assertStatus(422);

            $file = UploadedFile::fake()->create('surat-dokter.pdf', 100, 'application/pdf');

            $response = $this->withToken($token)
                ->post('/api/karyawan/leave-requests', [
                    'leave_type' => 'sick',
                    'start_date' => now()->toDateString(),
                    'end_date' => now()->toDateString(),
                    'reason' => 'Sakit demam tinggi',
                    'medical_certificate' => $file,
                ]);

            $response->assertCreated()
                ->assertJsonPath('data.hasMedicalCertificate', true)
                ->assertJsonPath('data.status', 'pending');
        } finally {
            DB::rollBack();
        }
    }

    public function test_spv_only_sees_own_department_team_and_cannot_access_karyawan_routes(): void
    {
        $login = $this->postJson('/api/auth/login', [
            'email' => 'spv@gapjoten.id',
            'password' => 'spv123',
        ])->assertOk();

        $token = $login->json('data.token');

        $this->withToken($token)
            ->getJson('/api/spv/dashboard')
            ->assertOk()
            ->assertJsonPath('data.spv.department', 'Engineering')
            ->assertJsonPath('data.stats.totalMembers', 5);

        $team = $this->withToken($token)
            ->getJson('/api/spv/team')
            ->assertOk();

        $departments = collect($team->json('data.members'))->pluck('department')->unique()->values()->all();
        $this->assertSame(['Engineering'], $departments);

        $this->withToken($token)
            ->getJson('/api/spv/attendance/today')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/spv/attendance/history')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/spv/leave-requests?category=sakit')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/spv/reports')
            ->assertOk();

        // Cross-department medical certificate download denied (EMP008 Finance is id 6, none here; EMP006 Engineering is id 3 allowed)
        $this->withToken($token)
            ->getJson('/api/karyawan/dashboard')
            ->assertForbidden();
    }

    public function test_hrd_user_cannot_access_karyawan_or_spv_endpoints(): void
    {
        $login = $this->postJson('/api/auth/login', [
            'email' => 'hrd@gapjoten.id',
            'password' => 'hrd123',
        ])->assertOk();

        $token = $login->json('data.token');

        $this->withToken($token)->getJson('/api/karyawan/dashboard')->assertForbidden();
        $this->withToken($token)->getJson('/api/spv/dashboard')->assertForbidden();
    }

    public function test_hrd_can_manage_employees_face_registration_leaves_announcements_reports_and_settings(): void
    {
        DB::beginTransaction();

        try {
            $karyawanLogin = $this->postJson('/api/auth/login', [
                'email' => 'budi@gapjoten.id',
                'password' => 'karyawan123',
            ])->assertOk();
            $this->withToken($karyawanLogin->json('data.token'))
                ->getJson('/api/hrd/dashboard')
                ->assertForbidden();

            $spvLogin = $this->postJson('/api/auth/login', [
                'email' => 'spv@gapjoten.id',
                'password' => 'spv123',
            ])->assertOk();
            $this->withToken($spvLogin->json('data.token'))
                ->getJson('/api/hrd/employees')
                ->assertForbidden();

            $hrdLogin = $this->postJson('/api/auth/login', [
                'email' => 'hrd@gapjoten.id',
                'password' => 'hrd123',
            ])->assertOk();
            $token = $hrdLogin->json('data.token');

            // 1. Dashboard HRD
            $this->withToken($token)
                ->getJson('/api/hrd/dashboard')
                ->assertOk()
                ->assertJsonPath('success', true)
                ->assertJsonStructure([
                    'data' => [
                        'hrd',
                        'stats' => ['totalEmployees', 'presentToday', 'lateToday', 'newThisMonth', 'sickToday', 'leaveToday', 'pendingTotal', 'faceRegisteredCount'],
                        'weeklyTrend',
                        'departmentBreakdown',
                        'todayMonitor',
                        'pendingLeaves',
                    ],
                ])
                ->assertJsonCount(5, 'data.weeklyTrend');

            foreach (['total', 'present', 'late', 'leave_sick'] as $summaryType) {
                $this->withToken($token)
                    ->getJson("/api/hrd/summary-detail?type={$summaryType}")
                    ->assertOk()
                    ->assertJsonPath('data.type', $summaryType)
                    ->assertJsonStructure(['data' => ['title', 'subtitle', 'items']]);
            }

            // 2. Data Karyawan (Create, Update, List, Delete)
            $createdEmployee = $this->withToken($token)
                ->postJson('/api/hrd/employees', [
                    'full_name' => 'Rina Kartika',
                    'gender' => 'female',
                    'email' => 'rina.test@gapjoten.id',
                    'password' => 'secret123',
                    'role' => 'karyawan',
                    'department_id' => 1,
                    'position_id' => 3,
                    'phone' => '081299998888',
                    'address' => 'Jakarta Selatan',
                    'join_date' => now()->toDateString(),
                    'status' => 'active',
                ])
                ->assertCreated()
                ->assertJsonPath('data.fullName', 'Rina Kartika');

            $employeeId = $createdEmployee->json('data.id');

            $this->withToken($token)
                ->putJson("/api/hrd/employees/{$employeeId}", [
                    'nip' => $createdEmployee->json('data.nip'),
                    'full_name' => 'Rina Kartika Sari',
                    'gender' => 'female',
                    'email' => 'rina.test@gapjoten.id',
                    'role' => 'karyawan',
                    'department_id' => 1,
                    'position_id' => 2,
                    'phone' => '081299990000',
                    'address' => 'Depok',
                    'join_date' => now()->toDateString(),
                    'status' => 'probation',
                    'account_status' => 'active',
                ])
                ->assertOk()
                ->assertJsonPath('data.fullName', 'Rina Kartika Sari');

            // 3. Face Registration (wajib persetujuan + terenkripsi)
            $this->withToken($token)
                ->postJson('/api/hrd/face-registrations', [
                    'employee_id' => $employeeId,
                    'consent_given' => false,
                    'face_signature' => 'face-vec-0.12-0.45-0.88-sample',
                    'liveness_verified' => true,
                ])
                ->assertStatus(422);

            $this->withToken($token)
                ->postJson('/api/hrd/face-registrations', [
                    'employee_id' => $employeeId,
                    'consent_given' => true,
                    'face_signature' => 'face-vec-0.12-0.45-0.88-sample',
                    'liveness_verified' => true,
                    'notes' => 'Pendaftaran awal HRD',
                ])
                ->assertCreated()
                ->assertJsonPath('data.employeeId', $employeeId);

            $this->withToken($token)
                ->getJson('/api/hrd/face-registrations')
                ->assertOk()
                ->assertJsonPath('success', true);

            $this->withToken($token)
                ->deleteJson("/api/hrd/face-registrations/{$employeeId}")
                ->assertOk();

            // 4. Data Absensi & Koreksi Manual HRD
            $this->withToken($token)
                ->postJson('/api/hrd/attendance', [
                    'employee_id' => $employeeId,
                    'date' => now()->toDateString(),
                    'status' => 'present',
                    'clock_in' => '07:55',
                    'clock_out' => '17:02',
                    'method' => 'manual',
                    'notes' => 'Input absensi oleh HRD',
                ])
                ->assertOk();

            $this->withToken($token)
                ->getJson('/api/hrd/attendance')
                ->assertOk()
                ->assertJsonPath('success', true);

            // 5. Approval Pengajuan Cuti & Izin Sakit
            $leaveRes = $this->withToken($token)
                ->getJson('/api/hrd/leave-requests?status=pending')
                ->assertOk();

            $firstPendingId = $leaveRes->json('data.items.0.id');
            if ($firstPendingId !== null) {
                $this->withToken($token)
                    ->putJson("/api/hrd/leave-requests/{$firstPendingId}/decision", [
                        'status' => 'approved',
                        'decision_notes' => 'Disetujui sesuai kebijakan perusahaan',
                    ])
                    ->assertOk()
                    ->assertJsonPath('data.status', 'approved');
            }

            // 6. Informasi Perusahaan (Create, Update, Delete)
            $ann = $this->withToken($token)
                ->postJson('/api/hrd/announcements', [
                    'title' => 'Pengumuman Uji HRD',
                    'body' => 'Isi pengumuman uji coba sistem HRD.',
                ])
                ->assertCreated()
                ->assertJsonPath('data.title', 'Pengumuman Uji HRD');

            $annId = $ann->json('data.id');

            $this->withToken($token)
                ->putJson("/api/hrd/announcements/{$annId}", [
                    'title' => 'Pengumuman Uji HRD Updated',
                    'body' => 'Isi pengumuman diperbarui.',
                ])
                ->assertOk()
                ->assertJsonPath('data.title', 'Pengumuman Uji HRD Updated');

            $this->withToken($token)
                ->deleteJson("/api/hrd/announcements/{$annId}")
                ->assertOk();

            // 7. Laporan Absensi
            $this->withToken($token)
                ->getJson('/api/hrd/reports')
                ->assertOk()
                ->assertJsonStructure(['data' => ['startDate', 'endDate', 'totals', 'rows', 'dailyBreakdown']]);

            // 8. Pengaturan & Profil HRD
            $this->withToken($token)
                ->getJson('/api/hrd/settings')
                ->assertOk()
                ->assertJsonPath('data.settings.work_start', '08:00');

            $this->withToken($token)
                ->putJson('/api/hrd/settings', [
                    'company_name' => 'GAPJOTEN Technology Solutions',
                    'office_location' => 'Jakarta - Kantor Pusat',
                    'work_start' => '08:00',
                    'work_end' => '17:00',
                    'late_tolerance_minutes' => 15,
                    'annual_leave_quota' => 12,
                    'biometric_retention_days' => 365,
                    'allow_alternative_attendance' => true,
                ])
                ->assertOk();

            $this->withToken($token)
                ->getJson('/api/hrd/profile')
                ->assertOk()
                ->assertJsonPath('data.role', 'hrd');

            $this->withToken($token)
                ->deleteJson("/api/hrd/employees/{$employeeId}")
                ->assertOk();
        } finally {
            DB::rollBack();
        }
    }
}
