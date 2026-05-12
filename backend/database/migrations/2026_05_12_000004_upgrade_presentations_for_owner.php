<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('presentations', function (Blueprint $table) {
            // Owner-uploaded global presentations visible to all distributors
            if (!Schema::hasColumn('presentations', 'is_global')) {
                $table->boolean('is_global')->default(false)->after('is_active');
            }
            // Uploaded by owner (user_id from users table)
            if (!Schema::hasColumn('presentations', 'uploaded_by_owner')) {
                $table->boolean('uploaded_by_owner')->default(false)->after('is_global');
            }
            // Compensation plan structured data (JSON)
            if (!Schema::hasColumn('presentations', 'comp_plan_data')) {
                $table->json('comp_plan_data')->nullable()->after('uploaded_by_owner');
            }
            // File size in bytes
            if (!Schema::hasColumn('presentations', 'file_size')) {
                $table->unsignedBigInteger('file_size')->nullable()->after('comp_plan_data');
            }
            // MIME type
            if (!Schema::hasColumn('presentations', 'mime_type')) {
                $table->string('mime_type', 100)->nullable()->after('file_size');
            }
        });
    }
    public function down(): void {
        Schema::table('presentations', function (Blueprint $table) {
            foreach (['is_global','uploaded_by_owner','comp_plan_data','file_size','mime_type'] as $col) {
                if (Schema::hasColumn('presentations', $col)) $table->dropColumn($col);
            }
        });
    }
};
