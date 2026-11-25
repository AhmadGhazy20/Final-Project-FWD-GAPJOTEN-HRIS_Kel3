<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JwtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        if ($user === null || ! $user->is_active || ! hash_equals((string) $user->password_hash, hash('sha256', $credentials['password']))) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah',
            ], 401);
        }

        DB::table('users')->where('id', $user->id)->update(['last_login_at' => now()]);

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
        ]);

        $exists = DB::table('users')->where('email', $data['email'])->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Email sudah terdaftar',
            ], 409);
        }

        $userId = DB::transaction(function () use ($data): int {
            $userId = (int) DB::table('users')->insertGetId([
                'email' => $data['email'],
                'password_hash' => hash('sha256', $data['password']),
                'role' => 'karyawan',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $nextNumber = (int) DB::table('employees')
                ->selectRaw('COALESCE(MAX(CAST(SUBSTRING(nip, 4) AS UNSIGNED)), 0) + 1 AS next_number')
                ->value('next_number');

            DB::table('employees')->insert([
                'user_id' => $userId,
                'nip' => 'EMP'.str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT),
                'full_name' => $data['name'],
                'email' => $data['email'],
                'position' => 'Staff',
                'join_date' => now()->toDateString(),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $userId;
        });

        $publicUser = [
            'id' => $userId,
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => 'karyawan',
            'position' => 'Staff',
            'division' => null,
        ];

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => $publicUser,
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

    private function findUser()
    {
        return DB::table('users')
            ->leftJoin('employees', 'employees.user_id', '=', 'users.id')
            ->leftJoin('divisions', 'divisions.id', '=', 'employees.division_id')
            ->select(
                'users.id',
                'users.email',
                'users.password_hash',
                'users.role',
                'users.is_active',
                'employees.full_name as name',
                'employees.position',
                'divisions.name as division'
            );
    }

    private function toPublicUser(object $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name ?: $user->email,
            'email' => $user->email,
            'role' => $user->role,
            'position' => $user->position,
            'division' => $user->division,
        ];
    }
}
