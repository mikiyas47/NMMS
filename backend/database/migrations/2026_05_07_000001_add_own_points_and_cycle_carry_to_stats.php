<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * own_points   — cumulative personal purchase volume (sum of distributor's own accounts × product.point)
     * cycle_carry  — leftover points that carry forward to the next cycle run (replaces carry_left/carry_right)
     */
    public function up(): void
    {
        Schema::table('stats', function (Blueprint $table) {
            $table->bigInteger('own_points')->default(0)->after('total_right_points');
            $table->bigInteger('cycle_carry')->default(0)->after('own_points');
        });

        // Back-fill own_points from accounts table
        $rows = DB::table('stats')->get();
        foreach ($rows as $row) {
            $ownPts = DB::table('accounts')
                ->join('products', 'accounts.product_id', '=', 'products.id')
                ->where('accounts.distributor_id', $row->distributor_id)
                ->sum('products.point');

            // Merge existing carry into cycle_carry
            $carry = ($row->carry_left ?? 0) + ($row->carry_right ?? 0);

            DB::table('stats')->where('id', $row->id)->update([
                'own_points'  => (int) $ownPts,
                'cycle_carry' => (int) $carry,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('stats', function (Blueprint $table) {
            $table->dropColumn(['own_points', 'cycle_carry']);
        });
    }
};
