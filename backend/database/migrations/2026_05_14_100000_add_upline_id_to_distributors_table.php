<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Only add upline_id if it doesn't already exist (safe for both local and production)
        if (!Schema::hasColumn('distributors', 'upline_id')) {
            Schema::table('distributors', function (Blueprint $table) {
                $table->unsignedBigInteger('upline_id')->nullable()->after('password');
                // SQLite doesn't support adding foreign keys to existing tables,
                // so we skip the foreign key constraint here.
                // On PostgreSQL (production), the constraint is handled by the ORM.
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('distributors', 'upline_id')) {
            Schema::table('distributors', function (Blueprint $table) {
                $table->dropColumn('upline_id');
            });
        }
    }
};
