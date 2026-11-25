<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = (string) $request->header('Authorization', '');

        if (! str_starts_with($header, 'Bearer ')) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. No token provided.',
            ], 401);
        }

        $payload = app(JwtService::class)->decode(substr($header, 7));

        if ($payload === null) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired token.',
            ], 403);
        }

        $request->attributes->set('auth_user', $payload);

        return $next($request);
    }
}
