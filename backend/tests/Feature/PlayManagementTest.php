<?php

namespace Tests\Feature;

use App\Models\Play;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlayManagementTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_authenticated_users_can_list_plays(): void
    {
        $this->authenticate();

        Play::factory()->count(3)->create();

        $response = $this->getJson('/api/plays');

        $response
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonFragment(['questions_count' => 0]);
    }

    public function test_guests_cannot_access_play_endpoints(): void
    {
        $play = Play::factory()->create();

        $this->getJson('/api/plays')->assertUnauthorized();
        $this->getJson("/api/plays/{$play->id}")->assertUnauthorized();
        $this->postJson('/api/plays', [])->assertUnauthorized();
        $this->patchJson("/api/plays/{$play->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/plays/{$play->id}")->assertUnauthorized();
        $this->patchJson("/api/plays/{$play->id}/restore")->assertUnauthorized();
    }

    public function test_index_can_include_soft_deleted_records(): void
    {
        $this->authenticate();

        $activePlay = Play::factory()->create();
        $deletedPlay = Play::factory()->create();
        $deletedPlay->delete();

        $response = $this->getJson('/api/plays?with_trashed=1');

        $response
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $activePlay->id])
            ->assertJsonFragment(['id' => $deletedPlay->id]);
    }

    public function test_authenticated_users_can_create_a_play(): void
    {
        $this->authenticate();

        $payload = [
            'title' => 'Hamlet',
            'description' => 'A Shakespearean tragedy about the Prince of Denmark.',
        ];

        $response = $this->postJson('/api/plays', $payload);

        $response
            ->assertCreated()
            ->assertJsonFragment($payload)
            ->assertJsonFragment(['questions_count' => 0]);

        $this->assertDatabaseHas('plays', $payload);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/plays', []);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'description']);
    }

    public function test_authenticated_users_can_view_a_play(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();

        $response = $this->getJson("/api/plays/{$play->id}");

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $play->id,
                'title' => $play->title,
                'questions_count' => 0,
            ]);
    }

    public function test_authenticated_users_can_update_a_play(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();

        $payload = [
            'title' => 'Updated Title',
        ];

        $response = $this->patchJson("/api/plays/{$play->id}", $payload);

        $response
            ->assertOk()
            ->assertJsonFragment($payload)
            ->assertJsonFragment(['questions_count' => 0]);

        $this->assertDatabaseHas('plays', array_merge(['id' => $play->id], $payload));
    }

    public function test_authenticated_users_can_soft_delete_a_play(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();

        $response = $this->deleteJson("/api/plays/{$play->id}");

        $response->assertNoContent();

        $this->assertSoftDeleted('plays', ['id' => $play->id]);
    }

    public function test_authenticated_users_can_restore_a_play(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();
        $play->delete();

        $response = $this->patchJson("/api/plays/{$play->id}/restore");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $play->id]);

        $this->assertDatabaseHas('plays', [
            'id' => $play->id,
            'deleted_at' => null,
        ]);
    }
}
