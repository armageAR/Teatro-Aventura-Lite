<?php

namespace Tests\Feature;

use App\Models\Performance;
use App\Models\Play;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PerformanceManagementTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_authenticated_users_can_list_performances_for_a_play(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();
        Performance::factory()
            ->count(3)
            ->for($play)
            ->sequence(
                ['scheduled_at' => Carbon::now()->addDay(), 'uid' => 'PERF000001'],
                ['scheduled_at' => Carbon::now()->addDays(2), 'uid' => 'PERF000002'],
                ['scheduled_at' => Carbon::now()->addDays(3), 'uid' => 'PERF000003'],
            )
            ->create();

        $response = $this->getJson("/api/plays/{$play->id}/performances");

        $response
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.uid', 'PERF000001')
            ->assertJsonPath('1.uid', 'PERF000002');
    }

    public function test_guests_cannot_access_performance_endpoints(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->create();

        $this->getJson("/api/plays/{$play->id}/performances")->assertUnauthorized();
        $this->postJson("/api/plays/{$play->id}/performances", [])->assertUnauthorized();
        $this->getJson("/api/performances/{$performance->id}")->assertUnauthorized();
        $this->patchJson("/api/performances/{$performance->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/performances/{$performance->id}")->assertUnauthorized();
        $this->patchJson("/api/performances/{$performance->id}/restore")->assertUnauthorized();
    }

    public function test_index_can_include_soft_deleted_performances(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();
        $activePerformance = Performance::factory()->for($play)->create();
        $deletedPerformance = Performance::factory()->for($play)->create();
        $deletedPerformance->delete();

        $response = $this->getJson("/api/plays/{$play->id}/performances?with_trashed=1");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $activePerformance->id])
            ->assertJsonFragment(['id' => $deletedPerformance->id]);
    }

    public function test_authenticated_users_can_create_a_performance(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();

        $payload = [
            'scheduled_at' => Carbon::now()->addDays(5)->toISOString(),
            'location' => 'Teatro Colón',
            'comment' => 'Función especial',
        ];

        $response = $this->postJson("/api/plays/{$play->id}/performances", $payload);

        $response
            ->assertCreated()
            ->assertJsonFragment([
                'location' => 'Teatro Colón',
                'comment' => 'Función especial',
            ])
            ->assertJsonStructure(['uid']);

        $this->assertDatabaseHas('performances', [
            'play_id' => $play->id,
            'location' => 'Teatro Colón',
            'comment' => 'Función especial',
        ]);

        $playResponse = $this->getJson("/api/plays/{$play->id}");
        $playResponse->assertOk()->assertJsonFragment(['performances_count' => 1]);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();

        $response = $this->postJson("/api/plays/{$play->id}/performances", []);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['scheduled_at', 'location']);
    }

    public function test_store_validates_unique_uid_when_provided(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();
        Performance::factory()->for($play)->create(['uid' => 'EXISTINGUID']);

        $response = $this->postJson("/api/plays/{$play->id}/performances", [
            'uid' => 'EXISTINGUID',
            'scheduled_at' => Carbon::now()->addDays(3)->toISOString(),
            'location' => 'Sala Mayor',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['uid']);
    }

    public function test_authenticated_users_can_view_a_performance(): void
    {
        $this->authenticate();

        $performance = Performance::factory()->create();

        $response = $this->getJson("/api/performances/{$performance->id}");

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $performance->id,
                'uid' => $performance->uid,
            ]);
    }

    public function test_authenticated_users_can_update_a_performance(): void
    {
        $this->authenticate();

        $performance = Performance::factory()->create([
            'comment' => 'Sin comentarios',
        ]);

        $payload = [
            'location' => 'Teatro Renovado',
            'comment' => 'Comentario actualizado',
            'started_at' => Carbon::now()->toISOString(),
        ];

        $response = $this->patchJson("/api/performances/{$performance->id}", $payload);

        $response
            ->assertOk()
            ->assertJsonFragment([
                'location' => 'Teatro Renovado',
                'comment' => 'Comentario actualizado',
            ]);

        $this->assertDatabaseHas('performances', array_merge(['id' => $performance->id], $payload));
    }

    public function test_authenticated_users_can_soft_delete_a_performance(): void
    {
        $this->authenticate();

        $performance = Performance::factory()->create();

        $response = $this->deleteJson("/api/performances/{$performance->id}");

        $response->assertNoContent();

        $this->assertSoftDeleted('performances', ['id' => $performance->id]);

        $playResponse = $this->getJson("/api/plays/{$performance->play_id}");
        $playResponse->assertOk()->assertJsonFragment(['performances_count' => 0]);
    }

    public function test_authenticated_users_can_restore_a_performance(): void
    {
        $this->authenticate();

        $performance = Performance::factory()->create();
        $performance->delete();

        $response = $this->patchJson("/api/performances/{$performance->id}/restore");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $performance->id]);

        $this->assertDatabaseHas('performances', [
            'id' => $performance->id,
            'deleted_at' => null,
        ]);

        $playResponse = $this->getJson("/api/plays/{$performance->play_id}");
        $playResponse->assertOk()->assertJsonFragment(['performances_count' => 1]);
    }
}
