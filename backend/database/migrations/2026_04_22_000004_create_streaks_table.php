<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This table tracks activity consistency per distributor.
     * It belongs to the distributor (not to a specific goal)
     * and measures how often the user shows up and stays active.
     */
    public function up(): void
    {
        Schema::create('streaks', function (Blueprint $table) {
            $table->id('streak_id');

            // The distributor this streak belongs to (one streak record per distributor)
            $table->unsignedBigInteger('distributor_id')->unique();
            $table->foreign('distributor_id')
                  ->references('distributor_id')
                  ->on('distributors')
                  ->onDelete('cascade');

            // Number of consecutive active days/periods
            $table->unsignedInteger('current_streak')->default(0);

            // The date of the most recent logged activity
            // Used to determine if the streak should increment or reset
            $table->date('last_activity_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('streaks');
    }
};
