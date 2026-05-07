<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add cumulative point columns that are never deducted.
     * - total_left_points  / total_right_points  → displayed on dashboard & used for rank
     * - left_points / right_points               → cycle-working balance (reset after cycle)
     * - carry_left  / carry_right                → leftover carry-forward after a cycle
     */
    public function up(): void
    {
        Schema::table('stats', function (Blueprint $table) {
            // Cumulative totals — never decremented
            $table->integer('total_left_points')->default(0)->after('right_points');
            $table->integer('total_right_points')->default(0)->after('total_left_points');
        });

        // Back-fill existing rows: seed total columns from current left/right + carry
        DB::table('stats')->get()->each(function ($row) {
            DB::table('stats')->where('id', $row->id)->update([
                'total_left_points'  => $row->left_points  + $row->carry_left,
                'total_right_points' => $row->right_points + $row->carry_right,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('stats', function (Blueprint $table) {
            $table->dropColumn(['total_left_points', 'total_right_points']);
        });
    }
};
