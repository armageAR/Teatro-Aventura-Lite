<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('performance_questions', function (Blueprint $table) {
            $table->foreignId('winning_answer_option_id')
                ->nullable()
                ->after('closed_at')
                ->constrained('question_options')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('performance_questions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('winning_answer_option_id');
        });
    }
};
