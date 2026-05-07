<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Remove all cycle-related and left/right point columns from stats and products.
 * Total points are now calculated live by walking the tree — nothing is stored.
 * Only own_points (personal package total) and rank are kept in stats.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── stats table ──────────────────────────────────────────────────────
        Schema::table('stats', function (Blueprint $table) {
            $columns = [
                'left_points',
                'right_points',
                'total_left_points',
                'total_right_points',
                'carry_left',
                'carry_right',
                'cycle_carry',
            ];
            foreach ($columns as $col) {
                if (Schema::hasColumn('stats', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        // ── products table ───────────────────────────────────────────────────
        Schema::table('products', function (Blueprint $table) {
            $columns = ['cycle_rate', 'weekly_cap'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }

    public function down(): void
    {
        // Restore stats columns
        Schema::table('stats', function (Blueprint $table) {
            $table->integer('left_points')->default(0);
            $table->integer('right_points')->default(0);
            $table->integer('total_left_points')->default(0);
            $table->integer('total_right_points')->default(0);
            $table->integer('carry_left')->default(0);
            $table->integer('carry_right')->default(0);
            $table->bigInteger('cycle_carry')->default(0);
        });

        // Restore products columns
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cycle_rate', 5, 2)->default(0);
            $table->decimal('weekly_cap', 10, 2)->default(0);
        });
    }
};
