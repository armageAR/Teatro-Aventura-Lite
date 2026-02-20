<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionOptionManagementTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_authenticated_users_can_list_options_for_a_question(): void
    {
        $this->authenticate();

        $question = Question::factory()->create();
        QuestionOption::factory()
            ->count(3)
            ->for($question)
            ->sequence(
                ['order' => 1],
                ['order' => 2],
                ['order' => 3],
            )
            ->create();

        $response = $this->getJson("/api/questions/{$question->id}/options");

        $response
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.order', 1)
            ->assertJsonPath('1.order', 2);
    }

    public function test_guests_cannot_access_question_option_endpoints(): void
    {
        $question = Question::factory()->create();
        $option = QuestionOption::factory()->for($question)->create();

        $this->getJson("/api/questions/{$question->id}/options")->assertUnauthorized();
        $this->postJson("/api/questions/{$question->id}/options", [])->assertUnauthorized();
        $this->getJson("/api/options/{$option->id}")->assertUnauthorized();
        $this->patchJson("/api/options/{$option->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/options/{$option->id}")->assertUnauthorized();
        $this->patchJson("/api/options/{$option->id}/restore")->assertUnauthorized();
    }

    public function test_index_can_include_soft_deleted_options(): void
    {
        $this->authenticate();

        $question = Question::factory()->create();
        $activeOption = QuestionOption::factory()->for($question)->create(['order' => 1]);
        $deletedOption = QuestionOption::factory()->for($question)->create(['order' => 2]);
        $deletedOption->delete();

        $response = $this->getJson("/api/questions/{$question->id}/options?with_trashed=1");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $activeOption->id])
            ->assertJsonFragment(['id' => $deletedOption->id]);
    }

    public function test_authenticated_users_can_create_an_option(): void
    {
        $this->authenticate();

        $question = Question::factory()->create();
        $nextQuestion = Question::factory()->create();

        $payload = [
            'text' => 'Sí, continuar con la historia',
            'order' => 1,
            'notes' => 'Lleva a un clímax anticipado',
            'next_question_id' => $nextQuestion->id,
        ];

        $response = $this->postJson("/api/questions/{$question->id}/options", $payload);

        $response
            ->assertCreated()
            ->assertJsonFragment($payload)
            ->assertJsonFragment(['question_id' => $question->id]);

        $this->assertDatabaseHas('question_options', array_merge($payload, ['question_id' => $question->id]));

        $questionResponse = $this->getJson("/api/questions/{$question->id}");
        $questionResponse->assertOk()->assertJsonFragment(['options_count' => 1]);
    }

    public function test_store_validates_unique_order_per_question(): void
    {
        $this->authenticate();

        $question = Question::factory()->create();
        QuestionOption::factory()->for($question)->create(['order' => 1]);

        $response = $this->postJson("/api/questions/{$question->id}/options", [
            'text' => 'Opción repetida',
            'order' => 1,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['order']);
    }

    public function test_authenticated_users_can_view_an_option(): void
    {
        $this->authenticate();

        $option = QuestionOption::factory()->create(['order' => 1]);

        $response = $this->getJson("/api/options/{$option->id}");

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $option->id,
                'text' => $option->text,
            ]);
    }

    public function test_authenticated_users_can_update_an_option(): void
    {
        $this->authenticate();

        $option = QuestionOption::factory()->create(['order' => 1]);
        $nextQuestion = Question::factory()->create();

        $payload = [
            'text' => 'Opción actualizada',
            'notes' => 'Notas nuevas',
            'next_question_id' => $nextQuestion->id,
            'order' => 2,
        ];

        $response = $this->patchJson("/api/options/{$option->id}", $payload);

        $response
            ->assertOk()
            ->assertJsonFragment($payload);

        $this->assertDatabaseHas('question_options', array_merge(['id' => $option->id], $payload));
    }

    public function test_authenticated_users_can_soft_delete_an_option(): void
    {
        $this->authenticate();

        $option = QuestionOption::factory()->create();

        $response = $this->deleteJson("/api/options/{$option->id}");

        $response->assertNoContent();

        $this->assertSoftDeleted('question_options', ['id' => $option->id]);

        $questionResponse = $this->getJson("/api/questions/{$option->question_id}");
        $questionResponse->assertOk()->assertJsonFragment(['options_count' => 0]);
    }

    public function test_authenticated_users_can_restore_an_option(): void
    {
        $this->authenticate();

        $option = QuestionOption::factory()->create();
        $option->delete();

        $response = $this->patchJson("/api/options/{$option->id}/restore");

        $response
            ->assertOk()
            ->assertJsonFragment(['id' => $option->id]);

        $this->assertDatabaseHas('question_options', [
            'id' => $option->id,
            'deleted_at' => null,
        ]);

        $questionResponse = $this->getJson("/api/questions/{$option->question_id}");
        $questionResponse->assertOk()->assertJsonFragment(['options_count' => 1]);
    }
}
