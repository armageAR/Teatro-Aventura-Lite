<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceQuestion extends Model
{
    protected $fillable = [
        'performance_id',
        'question_id',
        'sent_at',
        'closed_at',
        'winning_answer_option_id',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function performance(): BelongsTo
    {
        return $this->belongsTo(Performance::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
