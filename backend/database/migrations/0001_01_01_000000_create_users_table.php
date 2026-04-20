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
        // This table is ONLY for system-level accounts: 'owner' and 'admin' roles.
        // Distributor accounts are managed in the 'distributors' table.
        Schema::create('users', function (Blueprint $table) {
            $table->id('userid');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable()->unique(); // Optional — not required for system accounts
            $table->string('password');
            $table->enum('role', ['owner', 'admin'])->default('admin'); // Restricted to owner & admin only
            $table->string('status')->default('active');
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index()->constrained('users', 'userid');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
