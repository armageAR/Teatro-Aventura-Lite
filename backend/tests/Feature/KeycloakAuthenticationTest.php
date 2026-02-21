<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KeycloakAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_requests_without_token_are_rejected(): void
    {
        $response = $this->getJson('/api/plays');

        $response
            ->assertUnauthorized()
            ->assertJson(['error' => 'Token not provided']);
    }

    public function test_requests_with_valid_token_are_accepted(): void
    {
        $this->withKeycloakToken();

        $response = $this->getJson('/api/plays');

        $response->assertOk();
    }

    public function test_me_endpoint_returns_user_info(): void
    {
        $this->withKeycloakToken([
            'sub' => 'user-123',
            'email' => 'john@example.com',
            'name' => 'John Doe',
            'preferred_username' => 'johndoe',
        ]);

        $response = $this->getJson('/api/me');

        $response
            ->assertOk()
            ->assertJson([
                'sub' => 'user-123',
                'email' => 'john@example.com',
                'name' => 'John Doe',
                'preferred_username' => 'johndoe',
            ]);
    }

    public function test_authenticated_requests_include_keycloak_user_data(): void
    {
        $this->withKeycloakToken([
            'sub' => 'custom-user-id',
            'email' => 'custom@example.com',
        ]);

        $response = $this->getJson('/api/me');

        $response
            ->assertOk()
            ->assertJsonFragment(['sub' => 'custom-user-id'])
            ->assertJsonFragment(['email' => 'custom@example.com']);
    }
}
