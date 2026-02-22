<?php

namespace Tests\Feature;

use App\Models\Performance;
use App\Models\Play;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpectatorJoinTest extends TestCase
{
    use RefreshDatabase;

    public function test_spectator_can_join_a_live_performance_with_valid_token(): void
    {
        $play = Play::factory()->create(['title' => 'La Gran Obra']);
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);

        $response = $this->postJson('/api/performances/join', [
            'token' => $performance->join_token,
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure(['spectator_session_id', 'performance_id', 'performance_status', 'play_title'])
            ->assertJsonFragment([
                'performance_id' => $performance->id,
                'performance_status' => 'live',
                'play_title' => 'La Gran Obra',
            ]);

        $this->assertDatabaseHas('spectator_sessions', [
            'performance_id' => $performance->id,
        ]);
    }

    public function test_spectator_can_join_a_draft_performance(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'draft']);

        $response = $this->postJson('/api/performances/join', [
            'token' => $performance->join_token,
        ]);

        $response->assertCreated()->assertJsonFragment(['performance_status' => 'draft']);
    }

    public function test_spectator_can_join_a_closed_performance(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'closed']);

        $response = $this->postJson('/api/performances/join', [
            'token' => $performance->join_token,
        ]);

        $response->assertCreated()->assertJsonFragment(['performance_status' => 'closed']);
    }

    public function test_join_returns_404_for_invalid_token(): void
    {
        $response = $this->postJson('/api/performances/join', [
            'token' => 'token-invalido-que-no-existe',
        ]);

        $response->assertNotFound();
    }

    public function test_join_requires_token(): void
    {
        $response = $this->postJson('/api/performances/join', []);

        $response->assertUnprocessable();
    }

    public function test_join_does_not_require_authentication(): void
    {
        // No withKeycloakToken() call - should still work as public endpoint
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create();

        $response = $this->postJson('/api/performances/join', [
            'token' => $performance->join_token,
        ]);

        $response->assertCreated()->assertJsonStructure(['spectator_session_id']);
    }

    public function test_each_join_creates_a_new_spectator_session(): void
    {
        $performance = Performance::factory()->create();

        $response1 = $this->postJson('/api/performances/join', ['token' => $performance->join_token]);
        $response2 = $this->postJson('/api/performances/join', ['token' => $performance->join_token]);

        $response1->assertCreated();
        $response2->assertCreated();

        $this->assertNotEquals(
            $response1->json('spectator_session_id'),
            $response2->json('spectator_session_id')
        );

        $this->assertDatabaseCount('spectator_sessions', 2);
    }

    public function test_spectator_session_id_is_a_uuid(): void
    {
        $performance = Performance::factory()->create();

        $response = $this->postJson('/api/performances/join', [
            'token' => $performance->join_token,
        ]);

        $response->assertCreated();
        $sessionId = $response->json('spectator_session_id');
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $sessionId
        );
    }
}
