<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This table stores in-app notifications for distributors,
     * such as milestone alerts, streak reminders, or goal updates.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            // The distributor this notification is addressed to
            $table->unsignedBigInteger('distributor_id');
            $table->foreign('distributor_id')
                  ->references('distributor_id')
                  ->on('distributors')
                  ->onDelete('cascade');

            // Notification content
            $table->text('message');

            // Whether the distributor has read this notification
            $table->boolean('is_read')->default(false);

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
