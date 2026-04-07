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
        Schema::create('chat_rooms', function (Blueprint $table) {
            $table->id('chat_room_id');
            $table->unsignedBigInteger('distributor_id');
            $table->unsignedBigInteger('prospect_id');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('distributor_id')->references('userid')->on('users')->onDelete('cascade');
            $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_rooms');
    }
};
