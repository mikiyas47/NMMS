<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Upgrade the existing invitations table with tracking fields needed
 * by the Performance Operating System.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            if (!Schema::hasColumn('invitations', 'token')) {
                $table->string('token', 64)->nullable()->after('distributor_id');
            }
            if (!Schema::hasColumn('invitations', 'status')) {
                $table->string('status', 30)->default('sent')->after('token');
            }
            if (!Schema::hasColumn('invitations', 'scheduled_at')) {
                $table->timestamp('scheduled_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('invitations', 'opened_at')) {
                $table->timestamp('opened_at')->nullable()->after('scheduled_at');
            }
            if (!Schema::hasColumn('invitations', 'responded_at')) {
                $table->timestamp('responded_at')->nullable()->after('opened_at');
            }
            if (!Schema::hasColumn('invitations', 'notes')) {
                $table->text('notes')->nullable()->after('responded_at');
            }
        });

        // Add unique index on token if not exists
        try {
            Schema::table('invitations', function (Blueprint $table) {
                $table->unique('token', 'invitations_token_unique');
            });
        } catch (\Throwable $e) {
            // Index may already exist
        }
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            foreach (['token','status','scheduled_at','opened_at','responded_at','notes'] as $col) {
                if (Schema::hasColumn('invitations', $col)) $table->dropColumn($col);
            }
        });
    }
};
