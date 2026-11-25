<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JwtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private readonly JwtService $jwtService) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = $this->findUser()->where('users.email', $credentials['email'])->first();

        if ($user === null || $user->status !== 'active' || ! $this->verifyPassword($credentials['password'], (string) $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah atau akun nonaktif',
            ], 401);
        }

        $publicUser = $this->toPublicUser($user);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $publicUser,
                'token' => $this->jwtService->encode($publicUser),
            ],
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'password' => ['required', 'string', 'min:6'],
            'gender' => ['sometimes', 'string', 'in:male,female'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        if (DB::table('users')->where('email', $data['email'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Email sudah terdaftar',
            ], 409);
        }

        $result = DB::transaction(function () use ($data): array {
            $nextNumber = (int) DB::table('employees')
                ->selectRaw('COALESCE(MAX(CAST(SUBSTRING(nip, 4) AS UNSIGNED)), 0) + 1 AS next_number')
                ->value('next_number');

            $nip = 'EMP'.str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);

            $employeeId = (int) DB::table('employees')->insertGetId([
                'nip' => $nip,
                'full_name' => $data['name'],
                'gender' => $data['gender'] ?? 'male',
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'department_id' => 1,
                'position_id' => 2,
                'join_date' => now()->toDateString(),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $userId = (int) DB::table('users')->insertGetId([
                'employee_id' => $employeeId,
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'role' => 'karyawan',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return ['user_id' => $userId, 'employee_id' => $employeeId, 'nip' => $nip];
        });

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => [
                'id' => $result['user_id'],
                'employeeId' => $result['employee_id'],
                'nip' => $result['nip'],
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => 'karyawan',
                'status' => 'active',
                'departmentId' => 1,
                'department' => 'Engineering',
                'position' => 'Senior Frontend Dev',
            ],
        ], 201);
    }

    public function profile(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('auth_user');
        $user = is_array($authUser)
            ? $this->findUser()->where('users.id', $authUser['id'] ?? 0)->first()
            : null;

        return response()->json([
            'success' => true,
            'message' => 'Profile retrieved',
            'data' => [
                'user' => $user !== null ? $this->toPublicUser($user) : $authUser,
            ],
        ]);
    }

    private function verifyPassword(string $plain, string $storedHash): bool
    {
        if (password_verify($plain, $storedHash)) {
            return true;
        }

        return hash_equals($storedHash, hash('sha256', $plain));
    }

    private function findUser()
    {
        return DB::table('users')
            ->leftJoin('employees', 'employees.id', '=', 'users.employee_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->select(
                'users.id',
                'users.employee_id',
                'users.email',
                'users.password_hash',
                'users.role',
                'users.status',
                'employees.nip',
                'employees.full_name as name',
                'employees.gender',
                'employees.phone',
                'employees.address',
                'employees.department_id',
                'employees.join_date',
                'employees.status as employee_status',
                'departments.name as department',
                'positions.name as position'
            );
    }

    private function toPublicUser(object $user): array
    {
        return [
            'id' => (int) $user->id,
            'employeeId' => $user->employee_id !== null ? (int) $user->employee_id : null,
            'nip' => $user->nip,
            'name' => $user->name ?: $user->email,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'gender' => $user->gender,
            'phone' => $user->phone,
            'address' => $user->address,
            'departmentId' => $user->department_id !== null ? (int) $user->department_id : null,
            'department' => $user->department,
            'position' => $user->position,
            'joinDate' => $user->join_date,
            'employeeStatus' => $user->employee_status,
        ];
    }
}
