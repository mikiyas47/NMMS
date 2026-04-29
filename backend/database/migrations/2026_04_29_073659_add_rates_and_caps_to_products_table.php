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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('referral_rate', 5, 2)->default(0);
            $table->decimal('cycle_rate', 5, 2)->default(0);
            $table->decimal('weekly_cap', 10, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['referral_rate', 'cycle_rate', 'weekly_cap']);
        });
    }
};
