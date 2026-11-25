<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $query = $this->employeeQuery();

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('employees.full_name', 'LIKE', "%{$search}%")
                    ->orWhere('employees.nip', 'LIKE', "%{$search}%")
                    ->orWhere('users.email', 'LIKE', "%{$search}%");
            });
        }

        $rows = $query->orderBy('employees.full_name')->get()->map(fn ($row) => $this->toArray($row));

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $row = $this->employeeQuery()->where('employees.id', $id)->first();

        if ($row === null) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->toArray($row),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nip' => ['required', 'string', 'max:20'],
            'full_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['sometimes', 'string', 'in:karyawan,spv,hrd'],
            'division_id' => ['nullable', 'integer'],
            'position' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'join_date' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ]);

        $emailExists = DB::table('users')->where('email', $data['email'])->exists();

        if ($emailExists) {
            return response()->json([
                'success' => false,
                'message' => 'Email sudah terdaftar',
            ], 409);
        }

        $employeeId = DB::transaction(function () use ($data): int {
            $userId = (int) DB::table('users')->insertGetId([
                'email' => $data['email'],
                'password_hash' => hash('sha256', $data['password']),
                'role' => $data['role'] ?? 'karyawan',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return (int) DB::table('employees')->insertGetId([
                'user_id' => $userId,
                'nip' => $data['nip'],
                'full_name' => $data['full_name'],
                'email' => $data['email'],
                'division_id' => $data['division_id'] ?? null,
                'position' => $data['position'] ?? null,
                'phone' => $data['phone'] ?? null,
                'join_date' => $data['join_date'] ?? now()->toDateString(),
                'status' => $data['status'] ?? 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        $row = $this->employeeQuery()->where('employees.id', $employeeId)->first();

        return response()->json([
            'success' => true,
            'message' => 'Employee created',
            'data' => $this->toArray($row),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $employee = DB::table('employees')->where('id', $id)->first();

        if ($employee === null) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        $data = $request->validate([
            'nip' => ['sometimes', 'required', 'string', 'max:20'],
            'full_name' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => ['sometimes', 'required', 'email', 'max:150'],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['sometimes', 'string', 'in:karyawan,spv,hrd'],
            'division_id' => ['nullable', 'integer'],
            'position' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'join_date' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ]);

        $emailExists = isset($data['email'])
            ? DB::table('users')->where('email', $data['email'])->where('id', '!=', $employee->user_id)->exists()
            : false;

        if ($emailExists) {
            return response()->json([
                'success' => false,
                'message' => 'Email sudah terdaftar',
            ], 409);
        }

        DB::transaction(function () use ($data, $employee): void {
            $userData = ['updated_at' => now()];

            if (isset($data['email'])) {
                $userData['email'] = $data['email'];
            }

            if (! empty($data['password'])) {
                $userData['password_hash'] = hash('sha256', $data['password']);
            }

            if (isset($data['role'])) {
                $userData['role'] = $data['role'];
            }

            DB::table('users')->where('id', $employee->user_id)->update($userData);

            $employeeData = ['updated_at' => now()];

            foreach (['nip', 'full_name', 'email', 'division_id', 'position', 'phone', 'join_date', 'status'] as $field) {
                if (array_key_exists($field, $data)) {
                    $employeeData[$field] = $data[$field];
                }
            }

            DB::table('employees')->where('id', $employee->id)->update($employeeData);
        });

        $row = $this->employeeQuery()->where('employees.id', $id)->first();

        return response()->json([
            'success' => true,
            'message' => 'Employee updated',
            'data' => $this->toArray($row),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $employee = DB::table('employees')->where('id', $id)->first();

        if ($employee === null) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        DB::transaction(function () use ($employee): void {
            DB::table('employees')->where('id', $employee->id)->delete();
            DB::table('users')->where('id', $employee->user_id)->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted',
        ]);
    }

    private function employeeQuery()
    {
        return DB::table('employees')
            ->leftJoin('users', 'users.id', '=', 'employees.user_id')
            ->leftJoin('divisions', 'divisions.id', '=', 'employees.division_id')
            ->select(
                'employees.id',
                'employees.user_id',
                'employees.nip',
                'employees.full_name',
                'employees.email',
                'employees.division_id',
                'employees.position',
                'employees.phone',
                'employees.join_date',
                'employees.status',
                'users.role',
                'divisions.name as division'
            );
    }

    private function toArray(?object $row): array
    {
        if ($row === null) {
            return [];
        }

        return [
            'id' => $row->id,
            'userId' => $row->user_id,
            'nip' => $row->nip,
            'fullName' => $row->full_name,
            'name' => $row->full_name,
            'email' => $row->email,
            'divisionId' => $row->division_id,
            'division' => $row->division,
            'position' => $row->position,
            'phone' => $row->phone,
            'joinDate' => $row->join_date,
            'status' => $row->status,
            'role' => $row->role,
        ];
    }
}
