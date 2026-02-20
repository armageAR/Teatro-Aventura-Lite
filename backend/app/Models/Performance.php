<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Performance extends Model
{
    use HasFactory;
    use SoftDeletes;

    /**
     * Allow mass assignment for these attributes.
     */
    protected $fillable = [
        'play_id',
        'uid',
        'scheduled_at',
        'location',
        'comment',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Performance $performance) {
            if (empty($performance->uid)) {
                $performance->uid = Str::upper(Str::random(12));
            }
        });
    }

    public function play(): BelongsTo
    {
        return $this->belongsTo(Play::class);
    }
}
