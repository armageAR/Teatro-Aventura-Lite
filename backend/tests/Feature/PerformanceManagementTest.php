<?php

namespace Tests\Feature;

use App\Models\Performance;
use App\Models\PerformanceQuestion;
use App\Models\Play;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Vote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PerformanceManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_list_performances_for_a_play(): void
    {
        $this->withKeycloakToken();

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
        $this->withKeycloakToken();

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
        $this->withKeycloakToken();

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
                'status' => 'draft',
            ])
            ->assertJsonStructure(['uid', 'join_token']);

        $this->assertDatabaseHas('performances', [
            'play_id' => $play->id,
            'location' => 'Teatro Colón',
            'comment' => 'Función especial',
            'status' => 'draft',
        ]);

        $playResponse = $this->getJson("/api/plays/{$play->id}");
        $playResponse->assertOk()->assertJsonFragment(['performances_count' => 1]);
    }

    public function test_performance_is_created_with_draft_status_and_unique_join_token(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();

        $payload = [
            'scheduled_at' => Carbon::now()->addDays(5)->toISOString(),
            'location' => 'Teatro Colón',
        ];

        $response1 = $this->postJson("/api/plays/{$play->id}/performances", $payload);
        $response2 = $this->postJson("/api/plays/{$play->id}/performances", $payload);

        $response1->assertCreated()->assertJsonFragment(['status' => 'draft']);
        $response2->assertCreated()->assertJsonFragment(['status' => 'draft']);

        $token1 = $response1->json('join_token');
        $token2 = $response2->json('join_token');

        $this->assertNotEmpty($token1);
        $this->assertNotEmpty($token2);
        $this->assertNotEquals($token1, $token2);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();

        $response = $this->postJson("/api/plays/{$play->id}/performances", []);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['scheduled_at', 'location']);
    }

    public function test_store_validates_unique_uid_when_provided(): void
    {
        $this->withKeycloakToken();

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
        $this->withKeycloakToken();

        $performance = Performance::factory()->create();

        $response = $this->getJson("/api/performances/{$performance->id}");

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $performance->id,
                'uid' => $performance->uid,
                'status' => 'draft',
            ])
            ->assertJsonStructure(['join_token', 'play']);
    }

    public function test_authenticated_users_can_update_a_performance(): void
    {
        $this->withKeycloakToken();

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

        $this->assertDatabaseHas('performances', [
            'id' => $performance->id,
            'location' => 'Teatro Renovado',
            'comment' => 'Comentario actualizado',
        ]);
    }

    public function test_authenticated_users_can_soft_delete_a_performance(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create();

        $response = $this->deleteJson("/api/performances/{$performance->id}");

        $response->assertNoContent();

        $this->assertSoftDeleted('performances', ['id' => $performance->id]);

        $playResponse = $this->getJson("/api/plays/{$performance->play_id}");
        $playResponse->assertOk()->assertJsonFragment(['performances_count' => 0]);
    }

    public function test_authenticated_users_can_restore_a_performance(): void
    {
        $this->withKeycloakToken();

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

    public function test_authenticated_users_can_get_qr_data_for_a_performance(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create();

        $response = $this->getJson("/api/performances/{$performance->id}/qr");

        $response
            ->assertOk()
            ->assertJsonStructure(['join_url', 'join_token'])
            ->assertJsonPath('join_token', $performance->join_token);

        $joinUrl = $response->json('join_url');
        $this->assertStringContainsString($performance->join_token, $joinUrl);
        $this->assertStringContainsString('/join/', $joinUrl);
    }

    public function test_guests_cannot_access_qr_endpoint(): void
    {
        $performance = Performance::factory()->create();

        $this->getJson("/api/performances/{$performance->id}/qr")->assertUnauthorized();
    }

    public function test_authenticated_users_can_start_a_draft_performance(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create(['status' => 'draft']);

        $response = $this->patchJson("/api/performances/{$performance->id}/start");

        $response
            ->assertOk()
            ->assertJsonFragment(['status' => 'live']);

        $this->assertDatabaseHas('performances', [
            'id' => $performance->id,
            'status' => 'live',
        ]);

        $this->assertNotNull($performance->fresh()->started_at);
    }

    public function test_starting_a_live_performance_is_idempotent(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create(['status' => 'live']);

        $response = $this->patchJson("/api/performances/{$performance->id}/start");

        $response
            ->assertOk()
            ->assertJsonFragment(['status' => 'live']);
    }

    public function test_cannot_start_a_closed_performance(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create(['status' => 'closed']);

        $response = $this->patchJson("/api/performances/{$performance->id}/start");

        $response->assertStatus(422);
    }

    public function test_authenticated_users_can_close_a_live_performance(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create(['status' => 'live']);

        $response = $this->patchJson("/api/performances/{$performance->id}/close");

        $response
            ->assertOk()
            ->assertJsonFragment(['status' => 'closed']);

        $this->assertDatabaseHas('performances', [
            'id' => $performance->id,
            'status' => 'closed',
        ]);

        $this->assertNotNull($performance->fresh()->ended_at);
    }

    public function test_closing_a_closed_performance_is_idempotent(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create(['status' => 'closed']);

        $response = $this->patchJson("/api/performances/{$performance->id}/close");

        $response
            ->assertOk()
            ->assertJsonFragment(['status' => 'closed']);
    }

    public function test_cannot_close_a_draft_performance(): void
    {
        $this->withKeycloakToken();

        $performance = Performance::factory()->create(['status' => 'draft']);

        $response = $this->patchJson("/api/performances/{$performance->id}/close");

        $response->assertStatus(422);
    }

    public function test_guests_cannot_access_start_and_close_endpoints(): void
    {
        $performance = Performance::factory()->create();

        $this->patchJson("/api/performances/{$performance->id}/start")->assertUnauthorized();
        $this->patchJson("/api/performances/{$performance->id}/close")->assertUnauthorized();
    }

    public function test_authenticated_users_can_list_questions_for_a_performance(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $q1 = Question::factory()->for($play)->create(['order' => 1]);
        $q2 = Question::factory()->for($play)->create(['order' => 2]);

        // Send q1
        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $q1->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $response = $this->getJson("/api/performances/{$performance->id}/questions");

        $response
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $q1->id, 'performance_status' => 'active'])
            ->assertJsonFragment(['id' => $q2->id, 'performance_status' => 'pending']);
    }

    public function test_producer_can_send_a_question_during_live_performance(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/send");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $question->id, 'performance_status' => 'active']);

        $this->assertDatabaseHas('performance_questions', [
            'performance_id' => $performance->id,
            'question_id' => $question->id,
        ]);

        $pq = PerformanceQuestion::where([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
        ])->first();
        $this->assertNotNull($pq->sent_at);
        $this->assertNull($pq->closed_at);
    }

    public function test_sending_an_active_question_is_idempotent(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/send");

        $response
            ->assertOk()
            ->assertJsonFragment(['performance_status' => 'active']);

        // Still only one record
        $this->assertDatabaseCount('performance_questions', 1);
    }

    public function test_cannot_send_question_when_performance_is_not_live(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'draft']);
        $question = Question::factory()->for($play)->create(['order' => 1]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/send");

        $response->assertStatus(422);
    }

    public function test_cannot_send_question_that_doesnt_belong_to_play(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $otherPlay = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($otherPlay)->create(['order' => 1]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/send");

        $response->assertStatus(422);
    }

    public function test_cannot_send_second_question_while_one_is_active(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $q1 = Question::factory()->for($play)->create(['order' => 1]);
        $q2 = Question::factory()->for($play)->create(['order' => 2]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $q1->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$q2->id}/send");

        $response->assertStatus(422);
    }

    public function test_producer_can_close_an_active_question(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/close");

        $response
            ->assertOk()
            ->assertJsonFragment(['performance_status' => 'closed']);

        $pq = PerformanceQuestion::where([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
        ])->first();
        $this->assertNotNull($pq->closed_at);
    }

    public function test_closing_a_closed_question_is_idempotent(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => now(),
        ]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/close");

        $response
            ->assertOk()
            ->assertJsonFragment(['performance_status' => 'closed']);
    }

    public function test_cannot_close_question_that_hasnt_been_sent(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);

        $response = $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/close");

        $response->assertStatus(422);
    }

    public function test_guests_cannot_access_question_send_and_close_endpoints(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create();
        $question = Question::factory()->for($play)->create(['order' => 1]);

        $this->getJson("/api/performances/{$performance->id}/questions")->assertUnauthorized();
        $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/send")->assertUnauthorized();
        $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/close")->assertUnauthorized();
    }

    public function test_authenticated_users_can_get_live_results_with_no_votes(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);
        $opt2 = QuestionOption::factory()->for($question)->create(['order' => 2]);

        $pq = PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $response = $this->getJson("/api/performances/{$performance->id}/live");

        $response
            ->assertOk()
            ->assertJsonFragment(['performance_id' => $performance->id, 'status' => 'live'])
            ->assertJsonPath('questions.0.id', $question->id)
            ->assertJsonPath('questions.0.performance_status', 'active')
            ->assertJsonPath('questions.0.total_votes', 0)
            ->assertJsonPath('questions.0.options.0.vote_count', 0)
            ->assertJsonPath('questions.0.options.0.vote_percentage', 0);
    }

    public function test_live_results_shows_vote_counts_and_percentages(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);
        $opt2 = QuestionOption::factory()->for($question)->create(['order' => 2]);

        $pq = PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        // 3 votes for opt1, 1 vote for opt2 → 75% / 25%
        Vote::insert([
            ['performance_question_id' => $pq->id, 'question_option_id' => $opt1->id, 'spectator_token' => 'a', 'client_vote_id' => 'cv1', 'created_at' => now(), 'updated_at' => now()],
            ['performance_question_id' => $pq->id, 'question_option_id' => $opt1->id, 'spectator_token' => 'b', 'client_vote_id' => 'cv2', 'created_at' => now(), 'updated_at' => now()],
            ['performance_question_id' => $pq->id, 'question_option_id' => $opt1->id, 'spectator_token' => 'c', 'client_vote_id' => 'cv3', 'created_at' => now(), 'updated_at' => now()],
            ['performance_question_id' => $pq->id, 'question_option_id' => $opt2->id, 'spectator_token' => 'd', 'client_vote_id' => 'cv4', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $response = $this->getJson("/api/performances/{$performance->id}/live");

        $response->assertOk();
        $data = $response->json();

        $this->assertEquals(4, $data['questions'][0]['total_votes']);

        $options = collect($data['questions'][0]['options'])->keyBy('id');

        $this->assertEquals(3, $options[$opt1->id]['vote_count']);
        $this->assertEquals(75.0, $options[$opt1->id]['vote_percentage']);
        $this->assertEquals(1, $options[$opt2->id]['vote_count']);
        $this->assertEquals(25.0, $options[$opt2->id]['vote_percentage']);
    }

    public function test_live_results_only_includes_sent_questions(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $q1 = Question::factory()->for($play)->create(['order' => 1]);
        $q2 = Question::factory()->for($play)->create(['order' => 2]);

        // Only q1 is sent (active)
        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $q1->id,
            'sent_at' => now(),
            'closed_at' => null,
        ]);

        $response = $this->getJson("/api/performances/{$performance->id}/live");

        $response
            ->assertOk()
            ->assertJsonCount(1, 'questions')
            ->assertJsonPath('questions.0.id', $q1->id);
    }

    public function test_live_results_includes_closed_questions(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $q1 = Question::factory()->for($play)->create(['order' => 1]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $q1->id,
            'sent_at' => now()->subMinutes(5),
            'closed_at' => now(),
        ]);

        $response = $this->getJson("/api/performances/{$performance->id}/live");

        $response
            ->assertOk()
            ->assertJsonCount(1, 'questions')
            ->assertJsonPath('questions.0.performance_status', 'closed');
    }

    public function test_guests_cannot_access_live_endpoint(): void
    {
        $performance = Performance::factory()->create();

        $this->getJson("/api/performances/{$performance->id}/live")->assertUnauthorized();
    }

    public function test_producer_can_set_winner_on_closed_question(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);
        $opt2 = QuestionOption::factory()->for($question)->create(['order' => 2]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now()->subMinutes(5),
            'closed_at' => now(),
        ]);

        $response = $this->patchJson(
            "/api/performances/{$performance->id}/questions/{$question->id}/winner",
            ['answer_option_id' => $opt2->id],
        );

        $response
            ->assertOk()
            ->assertJsonFragment(['winning_answer_option_id' => $opt2->id])
            ->assertJsonFragment(['performance_status' => 'closed']);

        $this->assertDatabaseHas('performance_questions', [
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'winning_answer_option_id' => $opt2->id,
        ]);
    }

    public function test_winner_can_be_any_option_not_just_most_voted(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);
        $opt2 = QuestionOption::factory()->for($question)->create(['order' => 2]);

        $pq = PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now()->subMinutes(5),
            'closed_at' => now(),
        ]);

        // Cast 3 votes for opt1 → opt1 is the "most voted"
        Vote::insert([
            ['performance_question_id' => $pq->id, 'question_option_id' => $opt1->id, 'spectator_token' => 'a', 'client_vote_id' => 'cv1', 'created_at' => now(), 'updated_at' => now()],
            ['performance_question_id' => $pq->id, 'question_option_id' => $opt1->id, 'spectator_token' => 'b', 'client_vote_id' => 'cv2', 'created_at' => now(), 'updated_at' => now()],
            ['performance_question_id' => $pq->id, 'question_option_id' => $opt1->id, 'spectator_token' => 'c', 'client_vote_id' => 'cv3', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Producer selects opt2 (the less-voted option) as winner
        $response = $this->patchJson(
            "/api/performances/{$performance->id}/questions/{$question->id}/winner",
            ['answer_option_id' => $opt2->id],
        );

        $response
            ->assertOk()
            ->assertJsonFragment(['winning_answer_option_id' => $opt2->id]);
    }

    public function test_cannot_set_winner_on_question_that_is_not_closed(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now(),
            'closed_at' => null, // still active
        ]);

        $response = $this->patchJson(
            "/api/performances/{$performance->id}/questions/{$question->id}/winner",
            ['answer_option_id' => $opt1->id],
        );

        $response->assertStatus(422);
    }

    public function test_cannot_set_winner_on_pending_question(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);

        // No PerformanceQuestion record → question is pending
        $response = $this->patchJson(
            "/api/performances/{$performance->id}/questions/{$question->id}/winner",
            ['answer_option_id' => $opt1->id],
        );

        $response->assertStatus(422);
    }

    public function test_cannot_set_winner_with_option_from_different_question(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $otherQuestion = Question::factory()->for($play)->create(['order' => 2]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);
        $otherOpt = QuestionOption::factory()->for($otherQuestion)->create(['order' => 1]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now()->subMinutes(5),
            'closed_at' => now(),
        ]);

        $response = $this->patchJson(
            "/api/performances/{$performance->id}/questions/{$question->id}/winner",
            ['answer_option_id' => $otherOpt->id],
        );

        $response->assertStatus(422);
    }

    public function test_set_winner_is_idempotent_can_change_winner(): void
    {
        $this->withKeycloakToken();

        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create(['status' => 'live']);
        $question = Question::factory()->for($play)->create(['order' => 1]);
        $opt1 = QuestionOption::factory()->for($question)->create(['order' => 1]);
        $opt2 = QuestionOption::factory()->for($question)->create(['order' => 2]);

        PerformanceQuestion::create([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
            'sent_at' => now()->subMinutes(5),
            'closed_at' => now(),
            'winning_answer_option_id' => $opt1->id,
        ]);

        // Change winner to opt2
        $response = $this->patchJson(
            "/api/performances/{$performance->id}/questions/{$question->id}/winner",
            ['answer_option_id' => $opt2->id],
        );

        $response
            ->assertOk()
            ->assertJsonFragment(['winning_answer_option_id' => $opt2->id]);
    }

    public function test_guests_cannot_access_set_winner_endpoint(): void
    {
        $play = Play::factory()->create();
        $performance = Performance::factory()->for($play)->create();
        $question = Question::factory()->for($play)->create(['order' => 1]);

        $this->patchJson("/api/performances/{$performance->id}/questions/{$question->id}/winner", [])->assertUnauthorized();
    }
}
