<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spectator_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('performance_id')->constrained('performances')->onDelete('cascade');
            $table->uuid('spectator_session_id')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spectator_sessions');
    }
};
