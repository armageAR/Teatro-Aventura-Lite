<?php

namespace Database\Factories;

use App\Models\Performance;
use App\Models\Play;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Performance>
 */
class PerformanceFactory extends Factory
{
    protected $model = Performance::class;

    public function definition(): array
    {
        $scheduled = $this->faker->dateTimeBetween('+1 day', '+1 month');

        return [
            'play_id' => Play::factory(),
            'uid' => Str::upper(Str::random(12)),
            'scheduled_at' => $scheduled,
            'location' => $this->faker->city(),
            'comment' => $this->faker->optional()->sentence(10),
            'started_at' => null,
            'ended_at' => null,
        ];
    }
}
