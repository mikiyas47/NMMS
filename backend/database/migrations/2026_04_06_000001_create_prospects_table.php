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
        Schema::create('prospects', function (Blueprint $table) {
            $table->id('prospect_id');
            $table->unsignedBigInteger('distributor_id'); // FK → distributors.distributor_id
            $table->string('name', 255);
            $table->string('phone', 50);
            $table->string('email', 255)->nullable();
            $table->string('source', 50)->nullable();
            $table->string('status', 50)->default('New');
            $table->string('relationship', 50)->nullable();
            $table->dateTime('created_at')->useCurrent();           // Timestamp when the prospect was added
            $table->dateTime('updated_at')->useCurrentOnUpdate()->nullable(); // Last update timestamp

            $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prospects');
    }
};
