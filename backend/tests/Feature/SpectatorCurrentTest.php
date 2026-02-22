<?php

namespace Tests\Feature;

use App\Models\Performance;
use App\Models\PerformanceQuestion;
use App\Models\Play;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\SpectatorSession;
use App\Models\Vote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpectatorCurrentTest extends TestCase
{
    use RefreshDatabase;

    public function test_spectator_can_get_current_state_of_draft_performance(): void
    {
        $play = Play::factory()->create(['title' => 'Mi Obra']);
        $performance = Performance::factory()->for($play)->create(['status' => 'draft']);

        $response = $this->getJson('/api/performances/' . $performance->id . '/current');

        $response->assertOk()
            ->assertJsonStructure(['performance_id', 'status', 'play_title', 'active_question'])
            ->assertJsonFragment([
                'performance_id' => $performance->id,
                'status' => 'draft',
                'play_title' => 'Mi Obra',
                'active_question' => null,
            ]);
    }

    public function test_spectator_can_get_current_state_of_live_performance_without_active_question(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);

        $response = $this->getJson('/api/performances/' . $performance->id . '/current');

        $response->assertOk()
            ->assertJsonFragment(['status' => 'live', 'active_question' => null]);
    }

    public function test_current_shows_active_question_with_options(): void
    {
        $play = Play::factory()->create(['title' => 'Obra Activa']);
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['question' => '¿Quién es el asesino?']);
        $opt1 = QuestionOption::factory()->for($question)->create(['text' => 'El mayordomo', 'order' => 1]);
        $opt2 = QuestionOption::factory()->for($question)->create(['text' => 'La condesa', 'order' => 2]);

        // Mark question as active
        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $response = $this->getJson('/api/performances/' . $performance->id . '/current');

        $response->assertOk();
        $response->assertJsonPath('active_question.id', $question->id);
        $response->assertJsonPath('active_question.question', '¿Quién es el asesino?');
        $response->assertJsonPath('active_question.has_voted', false);
        $response->assertJsonPath('active_question.voted_option_id', null);

        $options = $response->json('active_question.options');
        $this->assertCount(2, $options);
        $optionTexts = array_column($options, 'text');
        $this->assertContains('El mayordomo', $optionTexts);
        $this->assertContains('La condesa', $optionTexts);
    }

    public function test_current_shows_has_voted_when_spectator_voted(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create();
        $opt = QuestionOption::factory()->for($question)->create();

        $pq = PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $sessionId = 'test-session-uuid-1234';

        Vote::create([
            'performance_question_id' => $pq->id,
            'question_option_id' => $opt->id,
            'spectator_token' => $sessionId,
            'client_vote_id' => 'client-vote-uuid-5678',
        ]);

        $response = $this->getJson(
            '/api/performances/' . $performance->id . '/current?spectator_session_id=' . $sessionId
        );

        $response->assertOk();
        $response->assertJsonPath('active_question.has_voted', true);
        $response->assertJsonPath('active_question.voted_option_id', $opt->id);
    }

    public function test_current_shows_has_voted_false_when_no_spectator_session_provided(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create();
        $opt = QuestionOption::factory()->for($question)->create();

        $pq = PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        Vote::create([
            'performance_question_id' => $pq->id,
            'question_option_id' => $opt->id,
            'spectator_token' => 'some-other-session',
            'client_vote_id' => 'some-vote-id',
        ]);

        // No spectator_session_id query param
        $response = $this->getJson('/api/performances/' . $performance->id . '/current');

        $response->assertOk();
        $response->assertJsonPath('active_question.has_voted', false);
        $response->assertJsonPath('active_question.voted_option_id', null);
    }

    public function test_current_shows_no_active_question_when_question_is_closed(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create();

        // Question is closed (not active)
        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now()->subMinutes(5),
            'closed_at' => now(),
        ]);

        $response = $this->getJson('/api/performances/' . $performance->id . '/current');

        $response->assertOk()
            ->assertJsonFragment(['active_question' => null]);
    }

    public function test_current_endpoint_does_not_require_authentication(): void
    {
        // No withKeycloakToken() call - public endpoint
        $performance = Performance::factory()->create(['status' => 'live']);

        $response = $this->getJson('/api/performances/' . $performance->id . '/current');

        $response->assertOk();
    }

    public function test_current_returns_404_for_nonexistent_performance(): void
    {
        $response = $this->getJson('/api/performances/99999/current');

        $response->assertNotFound();
    }

    public function test_current_response_includes_updated_at(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);

        $response = $this->getJson('/api/performances/' . $performance->id . '/current');

        $response->assertOk()
            ->assertJsonStructure(['performance_id', 'status', 'play_title', 'updated_at', 'active_question']);

        $this->assertNotNull($response->json('updated_at'));
        // Should be a valid ISO 8601 datetime string
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/',
            $response->json('updated_at')
        );
    }
}
