<?php

namespace Tests\Feature;

use App\Models\Play;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionManagementTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_authenticated_users_can_list_questions_for_a_play(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();
        Question::factory()
            ->count(3)
            ->for($play)
            ->sequence(
                ['order' => 1],
                ['order' => 2],
                ['order' => 3],
            )
            ->create();

        $response = $this->getJson("/api/plays/{$play->id}/questions");

        $response
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.order', 1)
            ->assertJsonPath('1.order', 2)
            ->assertJsonFragment(['options_count' => 0]);
    }

    public function test_guests_cannot_access_question_endpoints(): void
    {
        $play = Play::factory()->create();
        $question = Question::factory()->create();

        $this->getJson("/api/plays/{$play->id}/questions")->assertUnauthorized();
        $this->postJson("/api/plays/{$play->id}/questions", [])->assertUnauthorized();
        $this->getJson("/api/questions/{$question->id}")->assertUnauthorized();
        $this->patchJson("/api/questions/{$question->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/questions/{$question->id}")->assertUnauthorized();
        $this->patchJson("/api/questions/{$question->id}/restore")->assertUnauthorized();
    }

    public function test_index_can_include_soft_deleted_questions(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();
        $activeQuestion = Question::factory()->for($play)->create(['order' => 1]);
        $deletedQuestion = Question::factory()->for($play)->create(['order' => 2]);
        $deletedQuestion->delete();

        $response = $this->getJson("/api/plays/{$play->id}/questions?with_trashed=1");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $activeQuestion->id])
            ->assertJsonFragment(['id' => $deletedQuestion->id]);
    }

    public function test_authenticated_users_can_create_a_question(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();

        $payload = [
            'question' => '¿Cuál es el conflicto principal?',
            'order' => 1,
            'observations' => 'Se responde antes del segundo acto.',
        ];

        $response = $this->postJson("/api/plays/{$play->id}/questions", $payload);

        $response
            ->assertCreated()
            ->assertJsonFragment($payload)
            ->assertJsonFragment(['play_id' => $play->id])
            ->assertJsonFragment(['options_count' => 0]);

        $this->assertDatabaseHas('questions', array_merge($payload, ['play_id' => $play->id]));

        $playResponse = $this->getJson("/api/plays/{$play->id}");
        $playResponse->assertOk()->assertJsonFragment(['questions_count' => 1]);
    }

    public function test_store_validates_unique_order_per_play(): void
    {
        $this->authenticate();

        $play = Play::factory()->create();
        Question::factory()->for($play)->create(['order' => 1]);

        $response = $this->postJson("/api/plays/{$play->id}/questions", [
            'question' => '¿Pregunta repetida?',
            'order' => 1,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['order']);
    }

    public function test_authenticated_users_can_view_a_question(): void
    {
        $this->authenticate();

        $question = Question::factory()->create(['order' => 1]);

        $response = $this->getJson("/api/questions/{$question->id}");

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $question->id,
                'question' => $question->question,
                'options_count' => 0,
            ]);
    }

    public function test_authenticated_users_can_update_a_question(): void
    {
        $this->authenticate();

        $question = Question::factory()->create(['order' => 1]);

        $payload = [
            'question' => 'Pregunta actualizada',
            'observations' => 'Observaciones nuevas',
        ];

        $response = $this->patchJson("/api/questions/{$question->id}", $payload);

        $response
            ->assertOk()
            ->assertJsonFragment($payload)
            ->assertJsonFragment(['options_count' => 0]);

        $this->assertDatabaseHas('questions', array_merge(['id' => $question->id], $payload));
    }

    public function test_authenticated_users_can_soft_delete_a_question(): void
    {
        $this->authenticate();

        $question = Question::factory()->create();

        $response = $this->deleteJson("/api/questions/{$question->id}");

        $response->assertNoContent();

        $this->assertSoftDeleted('questions', ['id' => $question->id]);

        $playResponse = $this->getJson("/api/plays/{$question->play_id}");
        $playResponse->assertOk()->assertJsonFragment(['questions_count' => 0]);
    }

    public function test_authenticated_users_can_restore_a_question(): void
    {
        $this->authenticate();

        $question = Question::factory()->create();
        $question->delete();

        $response = $this->patchJson("/api/questions/{$question->id}/restore");

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $question->id,
                'options_count' => 0,
            ]);

        $this->assertDatabaseHas('questions', [
            'id' => $question->id,
            'deleted_at' => null,
        ]);

        $playResponse = $this->getJson("/api/plays/{$question->play_id}");
        $playResponse->assertOk()->assertJsonFragment(['questions_count' => 1]);
    }
}
