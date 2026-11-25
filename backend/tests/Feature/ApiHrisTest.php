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
}
