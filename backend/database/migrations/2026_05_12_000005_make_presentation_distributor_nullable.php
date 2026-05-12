<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('presentations', function (Blueprint $table) {
            // Allow null for global/owner-uploaded presentations
            $table->unsignedBigInteger('distributor_id')->nullable()->change();
        });
    }
    public function down(): void {
        Schema::table('presentations', function (Blueprint $table) {
            $table->unsignedBigInteger('distributor_id')->nullable(false)->change();
        });
    }
};
