<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('presentation_assignments', function (Blueprint $table) {
            if (!Schema::hasColumn('presentation_assignments', 'is_watching')) {
                $table->boolean('is_watching')->default(false)->after('status');
            }
            if (!Schema::hasColumn('presentation_assignments', 'last_heartbeat_at')) {
                $table->timestamp('last_heartbeat_at')->nullable()->after('is_watching');
            }
        });
    }

    public function down(): void
    {
        Schema::table('presentation_assignments', function (Blueprint $table) {
            $table->dropColumnIfExists('is_watching');
            $table->dropColumnIfExists('last_heartbeat_at');
        });
    }
};
