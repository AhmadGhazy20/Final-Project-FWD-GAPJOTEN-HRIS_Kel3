<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApiSpvTest extends TestCase
{
    public function test_health_endpoint_returns_success(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_spv_can_login_and_read_dashboard(): void
    {
        $login = $this->postJson('/api/auth/login', [
            'email' => 'jonathan@gapjoten.id',
            'password' => 'spv123',
        ])->assertOk();

        $this->withToken($login->json('data.token'))
            ->getJson('/api/spv/dashboard')
            ->assertOk()
            ->assertJsonPath('data.name', 'Jonathan')
            ->assertJsonPath('data.stats.totalAnggota', 24)
            ->assertJsonPath('data.stats.hadirHariIni', 18)
            ->assertJsonPath('data.stats.menungguPersetujuan', 15);
    }

    public function test_karyawan_cannot_access_spv_dashboard(): void
    {
        $login = $this->postJson('/api/auth/login', [
            'email' => 'budi@gapjoten.id',
            'password' => 'karyawan123',
        ])->assertOk();

        $this->withToken($login->json('data.token'))
            ->getJson('/api/spv/dashboard')
            ->assertForbidden();
    }

    public function test_spv_can_check_in_and_check_out(): void
    {
        DB::beginTransaction();

        try {
            DB::table('attendances')
                ->where('employee_id', 1)
                ->whereDate('attendance_date', now()->toDateString())
                ->delete();

            $login = $this->postJson('/api/auth/login', [
                'email' => 'jonathan@gapjoten.id',
                'password' => 'spv123',
            ])->assertOk();

            $this->withToken($login->json('data.token'));

            $this->postJson('/api/spv/my-attendance/check-in', [
                'method' => 'face',
                'liveness_passed' => true,
            ])->assertCreated()->assertJsonPath('data.method', 'face');

            $this->postJson('/api/spv/my-attendance/check-in', [
                'method' => 'face',
                'liveness_passed' => true,
            ])->assertStatus(409);

            $this->postJson('/api/spv/my-attendance/check-out')
                ->assertOk()
                ->assertJsonPath('success', true);

            $attendance = $this->getJson('/api/spv/my-attendance')->assertOk();
            $this->assertNotNull($attendance->json('data.today.clockOut'));
        } finally {
            DB::rollBack();
        }
    }
}
