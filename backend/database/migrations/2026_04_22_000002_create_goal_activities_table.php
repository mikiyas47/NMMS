<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This table logs individual activity entries that contribute
     * towards a distributor's goal progress.
     */
    public function up(): void
    {
        Schema::create('goal_activities', function (Blueprint $table) {
            $table->id('goal_activity_id');

            // The goal this activity belongs to
            $table->unsignedBigInteger('goal_id');
            $table->foreign('goal_id')
                  ->references('goal_id')
                  ->on('goals')
                  ->onDelete('cascade');

            // The distributor who logged this activity
            $table->unsignedBigInteger('distributor_id');
            $table->foreign('distributor_id')
                  ->references('distributor_id')
                  ->on('distributors')
                  ->onDelete('cascade');

            // Activity type mirrors the goal_type enum (team, personal, income, recruitment, sales)
            // Stored as an enum here since goal_type is not a standalone table
            $table->enum('activity_type', [
                'team',        // Team-related activity
                'personal',    // Personal development activity
                'income',      // Income-generating activity
                'recruitment', // Recruitment activity (e.g. invited a new distributor)
                'sales',       // Sales activity (e.g. sold a product)
            ]);

            // The numeric value this activity contributes (e.g. amount sold, number recruited)
            $table->decimal('value', 15, 2)->default(0.00);

            // Optional note or description for this activity entry
            $table->text('note')->nullable();

            // The date the activity actually occurred
            $table->date('activity_date');

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goal_activities');
    }
};
