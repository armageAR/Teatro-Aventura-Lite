<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    // =====================
    // Authentication guards
    // =====================

    public function test_guests_cannot_access_user_endpoints(): void
    {
        $user = User::factory()->create();

        $this->getJson('/api/users')->assertUnauthorized();
        $this->postJson('/api/users', [])->assertUnauthorized();
        $this->getJson("/api/users/{$user->id}")->assertUnauthorized();
        $this->patchJson("/api/users/{$user->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/users/{$user->id}")->assertUnauthorized();
    }

    public function test_non_admin_users_get_forbidden_on_user_endpoints(): void
    {
        $this->withKeycloakToken([
            'realm_access' => ['roles' => ['producer']],
        ]);

        $user = User::factory()->create();

        $this->getJson('/api/users')->assertForbidden();
        $this->postJson('/api/users', [])->assertForbidden();
        $this->getJson("/api/users/{$user->id}")->assertForbidden();
        $this->patchJson("/api/users/{$user->id}", [])->assertForbidden();
        $this->deleteJson("/api/users/{$user->id}")->assertForbidden();
    }

    // =====================
    // Index
    // =====================

    public function test_admin_can_list_users(): void
    {
        $this->withAdminToken();

        User::factory()->count(3)->create();

        $response = $this->getJson('/api/users');

        $response
            ->assertOk()
            ->assertJsonCount(3);
    }

    // =====================
    // Store
    // =====================

    public function test_admin_can_create_a_user(): void
    {
        $this->withAdminToken();

        $payload = [
            'name'  => 'Jane Doe',
            'email' => 'jane@example.com',
            'role'  => 'producer',
        ];

        $response = $this->postJson('/api/users', $payload);

        $response
            ->assertCreated()
            ->assertJsonFragment($payload);

        $this->assertDatabaseHas('users', $payload);
    }

    public function test_admin_can_create_an_admin_user(): void
    {
        $this->withAdminToken();

        $payload = [
            'name'  => 'Super Admin',
            'email' => 'superadmin@example.com',
            'role'  => 'admin',
        ];

        $response = $this->postJson('/api/users', $payload);

        $response->assertCreated()->assertJsonFragment(['role' => 'admin']);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->withAdminToken();

        $response = $this->postJson('/api/users', []);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'role']);
    }

    public function test_store_validates_email_uniqueness(): void
    {
        $this->withAdminToken();

        $existing = User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/users', [
            'name'  => 'Another',
            'email' => 'taken@example.com',
            'role'  => 'producer',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_store_validates_role_values(): void
    {
        $this->withAdminToken();

        $response = $this->postJson('/api/users', [
            'name'  => 'Someone',
            'email' => 'someone@example.com',
            'role'  => 'supervillain',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
    }

    // =====================
    // Show
    // =====================

    public function test_admin_can_view_a_user(): void
    {
        $this->withAdminToken();

        $user = User::factory()->create(['name' => 'Alice', 'email' => 'alice@example.com', 'role' => 'producer']);

        $response = $this->getJson("/api/users/{$user->id}");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $user->id, 'name' => 'Alice']);
    }

    // =====================
    // Update
    // =====================

    public function test_admin_can_update_a_user(): void
    {
        $this->withAdminToken();

        $user = User::factory()->create(['role' => 'producer']);

        $response = $this->patchJson("/api/users/{$user->id}", [
            'name' => 'Updated Name',
            'role' => 'admin',
        ]);

        $response
            ->assertOk()
            ->assertJsonFragment(['name' => 'Updated Name', 'role' => 'admin']);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated Name', 'role' => 'admin']);
    }

    public function test_update_validates_role_values(): void
    {
        $this->withAdminToken();

        $user = User::factory()->create();

        $response = $this->patchJson("/api/users/{$user->id}", ['role' => 'viewer']);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
    }

    // =====================
    // Destroy
    // =====================

    public function test_admin_can_delete_a_user(): void
    {
        $this->withAdminToken();

        $user = User::factory()->create();

        $response = $this->deleteJson("/api/users/{$user->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    // =====================
    // Helpers
    // =====================

    private function withAdminToken(): self
    {
        return $this->withKeycloakToken([
            'realm_access' => ['roles' => ['admin']],
        ]);
    }
}
