<?php

namespace Tests\Traits;

use App\Http\Middleware\KeycloakAuth;
use Illuminate\Http\Request;

trait MocksKeycloakAuth
{
    protected array $keycloakUser = [];

    protected function withKeycloakToken(array $claims = []): self
    {
        $defaultClaims = [
            'sub' => 'test-user-id',
            'email' => 'test@example.com',
            'name' => 'Test User',
            'preferred_username' => 'testuser',
            'iss' => config('keycloak.realm_url'),
            'aud' => 'teatro-aventura-lite',
            'exp' => time() + 3600,
            'iat' => time(),
        ];

        $this->keycloakUser = array_merge($defaultClaims, $claims);

        $this->app->bind(KeycloakAuth::class, function () {
            return new class($this->keycloakUser) {
                private array $user;

                public function __construct(array $user)
                {
                    $this->user = $user;
                }

                public function handle(Request $request, \Closure $next)
                {
                    $request->merge(['keycloak_user' => $this->user]);
                    return $next($request);
                }
            };
        });

        return $this;
    }

    protected function withoutKeycloakToken(): self
    {
        return $this;
    }
}
