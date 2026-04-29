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
        Schema::create('stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('distributor_id')->unique()->constrained('distributors', 'distributor_id')->cascadeOnDelete();
            $table->integer('left_points')->default(0);
            $table->integer('right_points')->default(0);
            $table->integer('carry_left')->default(0);
            $table->integer('carry_right')->default(0);
            $table->string('rank')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stats');
    }
};
