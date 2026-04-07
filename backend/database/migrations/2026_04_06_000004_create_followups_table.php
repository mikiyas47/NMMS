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
        Schema::create('followups', function (Blueprint $table) {
            $table->id('followup_id');
            $table->unsignedBigInteger('prospect_id');
            $table->unsignedBigInteger('user_id');
            $table->string('followup_type', 50)->nullable();
            $table->string('method', 50)->nullable();
            $table->text('script_used')->nullable();
            $table->string('outcome', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
            $table->foreign('user_id')->references('userid')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('followups');
    }
};
