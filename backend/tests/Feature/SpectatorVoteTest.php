<?php

namespace Tests\Feature;

use App\Models\Performance;
use App\Models\PerformanceQuestion;
use App\Models\Play;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Vote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpectatorVoteTest extends TestCase
{
    use RefreshDatabase;

    private function createActiveQuestion(): array
    {
        $play = Play::factory()->create(['title' => 'Mi Obra']);
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['question' => '¿Quién lo hizo?']);
        $opt1 = QuestionOption::factory()->for($question)->create(['text' => 'Opción A', 'order' => 1]);
        $opt2 = QuestionOption::factory()->for($question)->create(['text' => 'Opción B', 'order' => 2]);

        $pq = PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        return compact('play', 'performance', 'question', 'opt1', 'opt2', 'pq');
    }

    public function test_spectator_can_vote_on_active_question(): void
    {
        ['performance' => $performance, 'opt1' => $opt1] = $this->createActiveQuestion();

        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-abc-123',
            'question_option_id' => $opt1->id,
            'client_vote_id' => 'client-vote-uuid-001',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['vote_id', 'question_option_id', 'message'])
            ->assertJsonFragment([
                'question_option_id' => $opt1->id,
                'message' => 'Voto registrado correctamente.',
            ]);

        $this->assertDatabaseHas('votes', [
            'question_option_id' => $opt1->id,
            'spectator_token' => 'session-abc-123',
            'client_vote_id' => 'client-vote-uuid-001',
        ]);
    }

    public function test_vote_is_idempotent_with_same_client_vote_id(): void
    {
        ['performance' => $performance, 'opt1' => $opt1, 'pq' => $pq] = $this->createActiveQuestion();

        // First vote
        Vote::create([
            'performance_question_id' => $pq->id,
            'question_option_id' => $opt1->id,
            'spectator_token' => 'session-abc-123',
            'client_vote_id' => 'client-vote-uuid-001',
        ]);

        // Retry with same client_vote_id
        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-abc-123',
            'question_option_id' => $opt1->id,
            'client_vote_id' => 'client-vote-uuid-001',
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'question_option_id' => $opt1->id,
                'message' => 'Voto ya registrado.',
            ]);

        // No duplicate in DB
        $this->assertDatabaseCount('votes', 1);
    }

    public function test_cannot_vote_twice_on_same_question_different_client_vote_id(): void
    {
        ['performance' => $performance, 'opt1' => $opt1, 'opt2' => $opt2, 'pq' => $pq] = $this->createActiveQuestion();

        // First vote
        Vote::create([
            'performance_question_id' => $pq->id,
            'question_option_id' => $opt1->id,
            'spectator_token' => 'session-abc-123',
            'client_vote_id' => 'client-vote-uuid-001',
        ]);

        // Second vote (different client_vote_id but same spectator+question)
        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-abc-123',
            'question_option_id' => $opt2->id,
            'client_vote_id' => 'client-vote-uuid-002',
        ]);

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Ya votaste en esta pregunta.'])
            ->assertJsonFragment(['question_option_id' => $opt1->id]);

        // Still only 1 vote in DB
        $this->assertDatabaseCount('votes', 1);
    }

    public function test_cannot_vote_on_closed_question(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create();
        $opt = QuestionOption::factory()->for($question)->create();

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now()->subMinutes(5),
            'closed_at' => now(),
        ]);

        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-abc-123',
            'question_option_id' => $opt->id,
            'client_vote_id' => 'client-vote-uuid-003',
        ]);

        $response->assertUnprocessable();
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_cannot_vote_on_pending_question(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create();
        $opt = QuestionOption::factory()->for($question)->create();

        // Question exists in play but was never sent
        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-abc-123',
            'question_option_id' => $opt->id,
            'client_vote_id' => 'client-vote-uuid-004',
        ]);

        $response->assertUnprocessable();
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_cannot_vote_with_option_from_different_performance(): void
    {
        ['performance' => $performance] = $this->createActiveQuestion();

        $otherPlay = Play::factory()->create();
        $otherQuestion = Question::factory()->for($otherPlay)->create();
        $otherOpt = QuestionOption::factory()->for($otherQuestion)->create();

        // Option does not belong to the same play/performance
        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-abc-123',
            'question_option_id' => $otherOpt->id,
            'client_vote_id' => 'client-vote-uuid-005',
        ]);

        $response->assertUnprocessable();
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_vote_endpoint_does_not_require_authentication(): void
    {
        ['performance' => $performance, 'opt1' => $opt1] = $this->createActiveQuestion();

        // No withKeycloakToken() — public endpoint
        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-public-test',
            'question_option_id' => $opt1->id,
            'client_vote_id' => 'client-vote-public-001',
        ]);

        $response->assertCreated();
    }

    public function test_vote_requires_all_fields(): void
    {
        $performance = Performance::factory()->create(['status' => 'live']);

        $response = $this->postJson('/api/performances/' . $performance->id . '/vote', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['spectator_session_id', 'question_option_id', 'client_vote_id']);
    }

    public function test_multiple_spectators_can_vote_on_same_question(): void
    {
        ['performance' => $performance, 'opt1' => $opt1, 'opt2' => $opt2] = $this->createActiveQuestion();

        $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-spectator-1',
            'question_option_id' => $opt1->id,
            'client_vote_id' => 'client-vote-s1-001',
        ])->assertCreated();

        $this->postJson('/api/performances/' . $performance->id . '/vote', [
            'spectator_session_id' => 'session-spectator-2',
            'question_option_id' => $opt2->id,
            'client_vote_id' => 'client-vote-s2-001',
        ])->assertCreated();

        $this->assertDatabaseCount('votes', 2);
    }
}
