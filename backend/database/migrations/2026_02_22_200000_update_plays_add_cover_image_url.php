<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Make description nullable (no doctrine/dbal, use raw SQL)
        DB::statement('ALTER TABLE plays ALTER COLUMN description DROP NOT NULL');

        Schema::table('plays', function (Blueprint $table) {
            $table->string('cover_image_url', 2048)->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plays', function (Blueprint $table) {
            $table->dropColumn('cover_image_url');
        });

        DB::statement('ALTER TABLE plays ALTER COLUMN description SET NOT NULL');
    }
};
