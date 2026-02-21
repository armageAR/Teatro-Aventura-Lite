<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class KeycloakAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Token not provided'], 401);
        }

        try {
            $keys = $this->getPublicKeys();
            $decoded = JWT::decode($token, $keys);

            $realmUrl = config('keycloak.realm_url');
            if ($decoded->iss !== $realmUrl) {
                return response()->json(['error' => 'Invalid token issuer'], 401);
            }

            $request->merge(['keycloak_user' => (array) $decoded]);

            return $next($request);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid token: ' . $e->getMessage()], 401);
        }
    }

    private function getPublicKeys(): array
    {
        $jwksUrl = config('keycloak.realm_url') . '/protocol/openid-connect/certs';

        $jwks = Cache::remember('keycloak_jwks', 3600, function () use ($jwksUrl) {
            $response = Http::get($jwksUrl);
            return $response->json();
        });

        return JWK::parseKeySet($jwks);
    }
}