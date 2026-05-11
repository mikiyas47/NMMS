<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Upgrade the prospects table with full CRM fields
 * and add the prospect_activities table for timeline tracking.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Upgrade prospects table ───────────────────────────────────────────
        Schema::table('prospects', function (Blueprint $table) {
            // Pipeline stage (replaces simple status)
            if (!Schema::hasColumn('prospects', 'stage')) {
                $table->string('stage', 60)->default('New Lead')->after('status');
            }
            // Interest level: cold / warm / hot
            if (!Schema::hasColumn('prospects', 'interest_level')) {
                $table->string('interest_level', 20)->default('cold')->after('stage');
            }
            // Numeric interest score 0-100
            if (!Schema::hasColumn('prospects', 'interest_score')) {
                $table->unsignedTinyInteger('interest_score')->default(0)->after('interest_level');
            }
            // Next action fields
            if (!Schema::hasColumn('prospects', 'next_action')) {
                $table->string('next_action', 255)->nullable()->after('interest_score');
            }
            if (!Schema::hasColumn('prospects', 'next_action_date')) {
                $table->date('next_action_date')->nullable()->after('next_action');
            }
            // Extra profile fields
            if (!Schema::hasColumn('prospects', 'occupation')) {
                $table->string('occupation', 100)->nullable()->after('next_action_date');
            }
            if (!Schema::hasColumn('prospects', 'location')) {
                $table->string('location', 100)->nullable()->after('occupation');
            }
            if (!Schema::hasColumn('prospects', 'age_range')) {
                $table->string('age_range', 20)->nullable()->after('location');
            }
            if (!Schema::hasColumn('prospects', 'telegram')) {
                $table->string('telegram', 100)->nullable()->after('age_range');
            }
            if (!Schema::hasColumn('prospects', 'whatsapp')) {
                $table->string('whatsapp', 50)->nullable()->after('telegram');
            }
            if (!Schema::hasColumn('prospects', 'tags')) {
                $table->json('tags')->nullable()->after('whatsapp');
            }
            if (!Schema::hasColumn('prospects', 'notes')) {
                $table->text('notes')->nullable()->after('tags');
            }
            if (!Schema::hasColumn('prospects', 'priority')) {
                $table->string('priority', 20)->default('normal')->after('notes'); // low/normal/high/urgent
            }
            if (!Schema::hasColumn('prospects', 'stage_updated_at')) {
                $table->timestamp('stage_updated_at')->nullable()->after('priority');
            }
            if (!Schema::hasColumn('prospects', 'joined_at')) {
                $table->timestamp('joined_at')->nullable()->after('stage_updated_at');
            }
        });

        // ── prospect_activities table (timeline) ──────────────────────────────
        if (!Schema::hasTable('prospect_activities')) {
            Schema::create('prospect_activities', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('prospect_id');
                $table->unsignedBigInteger('distributor_id');
                $table->string('activity_type', 60); // stage_change, followup, note, call, message, closing, joined
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->json('meta')->nullable(); // extra data (old_stage, new_stage, outcome, etc.)
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->index(['prospect_id', 'created_at']);
            });
        }

        // ── prospect_tags table ───────────────────────────────────────────────
        if (!Schema::hasTable('prospect_tags')) {
            Schema::create('prospect_tags', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->string('name', 60);
                $table->string('color', 20)->default('#6366F1');
                $table->timestamps();

                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->unique(['distributor_id', 'name']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('prospect_tags');
        Schema::dropIfExists('prospect_activities');

        Schema::table('prospects', function (Blueprint $table) {
            $cols = ['stage','interest_level','interest_score','next_action','next_action_date',
                     'occupation','location','age_range','telegram','whatsapp','tags','notes',
                     'priority','stage_updated_at','joined_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('prospects', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
