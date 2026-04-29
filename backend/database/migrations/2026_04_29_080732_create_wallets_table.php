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
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('distributor_id')->unique()->constrained('distributors', 'distributor_id')->cascadeOnDelete();
            $table->decimal('balance', 15, 2)->default(0);
            $table->decimal('weekly_earnings', 15, 2)->default(0);
            $table->decimal('total_earned', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
