<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nodes', function (Blueprint $table) {
            // Each node tracks its own rank independently.
            // A distributor with 3 accounts has 3 nodes, each with its own rank.
            // Only the main node (first account) can achieve ranks through normal progression.
            // Secondary nodes (doubled accounts) start at CT and must earn their own rank.
            $table->string('rank', 20)->default('CT')->after('leg');
        });
    }

    public function down(): void
    {
        Schema::table('nodes', function (Blueprint $table) {
            $table->dropColumn('rank');
        });
    }
};
