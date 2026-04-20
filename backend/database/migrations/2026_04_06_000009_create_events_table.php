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
        Schema::create('events', function (Blueprint $table) {
            $table->id('event_id');
            $table->unsignedBigInteger('distributor_id'); // FK → distributors.distributor_id
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->dateTime('event_datetime');
            $table->string('location', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
