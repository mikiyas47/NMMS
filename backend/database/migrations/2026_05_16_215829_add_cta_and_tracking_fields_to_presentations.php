<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('presentations', function (Blueprint $table) {
            $table->string('cta_type', 50)->nullable()->after('external_url');
            $table->string('cta_text', 100)->nullable()->after('cta_type');
            $table->text('cta_link')->nullable()->after('cta_text');
        });

        Schema::table('presentation_assignments', function (Blueprint $table) {
            $table->integer('rewatch_count')->default(0)->after('watch_percent');
            $table->timestamp('cta_clicked_at')->nullable()->after('completed_at');
            $table->string('device_type', 50)->nullable()->after('engagement_score');
            $table->string('location', 255)->nullable()->after('device_type');
            $table->string('classification', 50)->default('Cold')->after('location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('presentations', function (Blueprint $table) {
            //
        });
    }
};
