<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vote extends Model
{
    protected $fillable = [
        'performance_question_id',
        'question_option_id',
        'spectator_token',
        'client_vote_id',
    ];

    public function performanceQuestion(): BelongsTo
    {
        return $this->belongsTo(PerformanceQuestion::class);
    }

    public function questionOption(): BelongsTo
    {
        return $this->belongsTo(QuestionOption::class);
    }
}
