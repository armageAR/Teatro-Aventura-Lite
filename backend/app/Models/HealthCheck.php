<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthCheck extends Model
{
    protected $fillable = [
        'counter',
        'last_checked_at',
        'last_checked_by',
    ];

    protected $casts = [
        'last_checked_at' => 'datetime',
    ];
}
