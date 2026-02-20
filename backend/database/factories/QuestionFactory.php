<?php

namespace Database\Factories;

use App\Models\Play;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Question>
 */
class QuestionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'play_id' => Play::factory(),
            'question' => $this->faker->sentence(12),
            'order' => $this->faker->unique()->numberBetween(1, 500),
            'observations' => $this->faker->optional()->sentence(10),
        ];
    }
}
