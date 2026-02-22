<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('performances', function (Blueprint $table) {
            $table->string('status', 20)->default('draft')->after('play_id');
            $table->uuid('join_token')->unique()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('performances', function (Blueprint $table) {
            $table->dropColumn(['status', 'join_token']);
        });
    }
};
