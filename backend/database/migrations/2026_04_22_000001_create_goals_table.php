<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This table stores goals set by distributors.
     * Goals can be personal, team, income, recruitment, or sales targets.
     */
    public function up(): void
    {
        Schema::create('goals', function (Blueprint $table) {
            $table->id('goal_id');

            // Distributor who owns this goal
            $table->unsignedBigInteger('distributor_id');
            $table->foreign('distributor_id')
                  ->references('distributor_id')
                  ->on('distributors')
                  ->onDelete('cascade');

            // Goal details
            $table->string('goal_title', 255);
            $table->text('goal_description')->nullable();

            // Goal classification
            $table->enum('goal_type', [
                'team',        // Team-level goal
                'personal',    // Personal achievement goal
                'income',      // Income/earnings goal
                'recruitment', // Recruiting new distributors
                'sales',       // Sales volume goal
            ]);

            // Progress tracking
            $table->decimal('target_value', 15, 2);               // What the distributor aims to reach
            $table->decimal('current_value', 15, 2)->default(0.00); // Tracked progress so far

            // Timeline
            $table->date('start_date');
            $table->date('end_date');

            // Lifecycle status
            $table->enum('status', [
                'active',
                'completed',
                'failed',
                'cancelled',
            ])->default('active');

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goals');
    }
};
