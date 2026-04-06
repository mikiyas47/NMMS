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
        Schema::create('presentation_views', function (Blueprint $table) {
            $table->id('view_id');
            $table->unsignedBigInteger('prospect_id');
            $table->unsignedBigInteger('presentation_id');
            $table->boolean('viewed')->default(false);
            $table->dateTime('viewed_at')->nullable();

            $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('presentation_views');
    }
};
