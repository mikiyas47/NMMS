<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This table stores numeric milestones for a goal.
     * Each milestone is a progress checkpoint that measures
     * how far a distributor has gone towards their goal target.
     */
    public function up(): void
    {
        Schema::create('goal_milestones', function (Blueprint $table) {
            $table->id('milestone_id');

            // The goal this milestone belongs to
            $table->unsignedBigInteger('goal_id');
            $table->foreign('goal_id')
                  ->references('goal_id')
                  ->on('goals')
                  ->onDelete('cascade');

            // The numeric value that must be reached to complete this milestone
            // (e.g. 25, 50, 75 on a goal with target_value of 100)
            $table->decimal('target_value', 15, 2);

            // Whether this milestone checkpoint has been reached
            $table->boolean('reached')->default(false);

            // The timestamp when the milestone was reached (null until achieved)
            $table->timestamp('reached_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goal_milestones');
    }
};
