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
        Schema::create('reminders', function (Blueprint $table) {
            $table->id('reminder_id');
            $table->unsignedBigInteger('prospect_id');
            $table->unsignedBigInteger('user_id');
            $table->dateTime('reminder_date');
            $table->string('reminder_reason', 50)->nullable();
            $table->string('status', 50)->default('Pending');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
