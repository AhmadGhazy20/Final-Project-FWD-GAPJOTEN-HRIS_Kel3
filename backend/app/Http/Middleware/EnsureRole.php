<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->attributes->get('auth_user');
        $role = is_array($user) ? ($user['role'] ?? null) : null;

        if (! in_array($role, $roles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Role tidak diizinkan.',
            ], 403);
        }

        return $next($request);
    }
}
