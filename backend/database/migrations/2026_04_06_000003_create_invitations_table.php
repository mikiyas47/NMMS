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
        Schema::create('invitations', function (Blueprint $table) {
            $table->id('invitation_id');
            $table->unsignedBigInteger('prospect_id');
            $table->unsignedBigInteger('distributor_id'); // FK → distributors.distributor_id
            $table->string('invitation_type', 50)->nullable();
            $table->text('script_used')->nullable();
            $table->string('material_shared', 255)->nullable();
            $table->string('invitation_method', 50)->nullable();
            $table->string('outcome', 50)->nullable();
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
        Schema::dropIfExists('invitations');
    }
};
