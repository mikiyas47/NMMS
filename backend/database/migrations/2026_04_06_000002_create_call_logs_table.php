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
        Schema::create('call_logs', function (Blueprint $table) {
            $table->id('call_id');
            $table->unsignedBigInteger('prospect_id');
            $table->unsignedBigInteger('distributor_id'); // FK → distributors.distributor_id
            $table->string('call_reason', 50)->nullable();
            $table->dateTime('call_start_time')->nullable();
            $table->dateTime('call_end_time')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->string('call_outcome', 50)->nullable();
            $table->text('user_notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
            $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_logs');
    }
};
