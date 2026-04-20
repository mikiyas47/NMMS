<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This table manages all distributor accounts.
     * System-level accounts (owner, admin) are stored in the 'users' table.
     */
    public function up(): void
    {
        Schema::create('distributors', function (Blueprint $table) {
            $table->id('distributor_id');
            $table->string('name', 255);
            $table->string('phone', 50)->nullable();                  // Optional
            $table->string('email', 255)->unique();
            $table->string('password');

            // Rank progression levels
            $table->enum('rank', [
                'CT',   // Customer Trainee
                'MT',   // Market Trainee
                'TT',   // Team Trainee
                'NTB',  // National Team Builder
                'IBB',  // International Business Builder
                'GEB',  // Global Empire Builder
                'CA',   // Crown Achiever
                'AL',   // Alpha Legend
            ])->default('CT');

            // Income breakdown (stored in ETB or local currency)
            $table->decimal('income_monthly', 12, 2)->default(0.00);  // Monthly income
            $table->decimal('income_weekly', 12, 2)->default(0.00);   // Weekly income
            $table->decimal('income_yearly', 12, 2)->default(0.00);   // Yearly income

            // Payment / subscription status
            $table->boolean('is_paid')->default(false);

            // The date the distributor joined the network
            $table->date('join_date')->useCurrent();

            $table->rememberToken();
            $table->timestamps(); // created_at & updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('distributors');
    }
};
