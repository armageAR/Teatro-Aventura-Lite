<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Play extends Model
{
    use HasFactory;
    use SoftDeletes;

    /**
     * Always eager load aggregated counts for responses.
     */
    protected $withCount = ['questions', 'performances'];

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'title',
        'description',
    ];

    /**
     * A play contains many questions.
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('order');
    }

    /**
     * A play schedules many performances.
     */
    public function performances(): HasMany
    {
        return $this->hasMany(Performance::class)->orderBy('scheduled_at');
    }
}
