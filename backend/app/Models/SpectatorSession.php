<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SpectatorSession extends Model
{
    protected $fillable = [
        'performance_id',
        'spectator_session_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (SpectatorSession $session) {
            if (empty($session->spectator_session_id)) {
                $session->spectator_session_id = Str::uuid()->toString();
            }
        });
    }

    public function performance(): BelongsTo
    {
        return $this->belongsTo(Performance::class);
    }
}
