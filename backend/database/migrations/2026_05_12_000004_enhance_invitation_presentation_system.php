<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Enhances the invitation and presentation system with:
 * - Custom script templates
 * - Presentation versioning, expiry, access control
 * - In-app message threads
 * - Bulk operation logs
 * - A/B test tracking
 * - Audit trail
 * - Consent management
 * - Engagement notifications queue
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── script_templates ──────────────────────────────────────────────────
        if (!Schema::hasTable('script_templates')) {
            Schema::create('script_templates', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->string('name', 255);
                $table->string('invitation_type', 50); // zoom, webinar, etc. or 'custom'
                $table->text('body'); // template with {prospect_name}, {distributor_name} placeholders
                $table->integer('use_count')->default(0);
                $table->integer('conversion_count')->default(0); // times this script led to acceptance
                $table->string('variant_label', 20)->nullable(); // 'A', 'B' for A/B testing
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->index(['distributor_id', 'invitation_type']);
            });
        }

        // ── presentation_versions ─────────────────────────────────────────────
        if (!Schema::hasTable('presentation_versions')) {
            Schema::create('presentation_versions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('presentation_id');
                $table->integer('version_number')->default(1);
                $table->text('file_url')->nullable();
                $table->text('external_url')->nullable();
                $table->text('change_notes')->nullable();
                $table->boolean('is_current')->default(true);
                $table->timestamp('created_at')->useCurrent();
                $table->foreign('presentation_id')->references('id')->on('presentations')->onDelete('cascade');
                $table->index(['presentation_id', 'is_current']);
            });
        }

        // ── Add expiry, access control, branding, consent fields ─────────────
        Schema::table('presentations', function (Blueprint $table) {
            if (!Schema::hasColumn('presentations', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('is_active');
            }
            if (!Schema::hasColumn('presentations', 'is_revoked')) {
                $table->boolean('is_revoked')->default(false)->after('expires_at');
            }
            if (!Schema::hasColumn('presentations', 'version_number')) {
                $table->integer('version_number')->default(1)->after('is_revoked');
            }
            if (!Schema::hasColumn('presentations', 'category')) {
                $table->string('category', 60)->nullable()->after('version_number'); // product, opportunity, training, testimonial
            }
            if (!Schema::hasColumn('presentations', 'brand_color')) {
                $table->string('brand_color', 10)->nullable()->after('category');
            }
            if (!Schema::hasColumn('presentations', 'shared_with_downline')) {
                $table->boolean('shared_with_downline')->default(false)->after('brand_color');
            }
            if (!Schema::hasColumn('presentations', 'slides')) {
                $table->json('slides')->nullable()->after('shared_with_downline'); // built-in slide builder
            }
        });

        // ── Add consent, smart scheduling to prospects ────────────────────────
        Schema::table('prospects', function (Blueprint $table) {
            if (!Schema::hasColumn('prospects', 'consent_given')) {
                $table->boolean('consent_given')->default(false)->after('joined_at');
            }
            if (!Schema::hasColumn('prospects', 'consent_at')) {
                $table->timestamp('consent_at')->nullable()->after('consent_given');
            }
            if (!Schema::hasColumn('prospects', 'preferred_contact_time')) {
                $table->string('preferred_contact_time', 50)->nullable()->after('consent_at'); // morning, afternoon, evening
            }
            if (!Schema::hasColumn('prospects', 'timezone')) {
                $table->string('timezone', 60)->nullable()->after('preferred_contact_time');
            }
        });

        // ── in_app_messages ───────────────────────────────────────────────────
        if (!Schema::hasTable('in_app_messages')) {
            Schema::create('in_app_messages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->unsignedBigInteger('prospect_id');
                $table->string('direction', 10)->default('out'); // out = distributor→prospect, in = prospect→distributor
                $table->text('body');
                $table->string('message_type', 30)->default('text'); // text, voice_note, presentation_share, invite_share
                $table->json('meta')->nullable(); // e.g. linked presentation_id or invitation_id
                $table->boolean('is_read')->default(false);
                $table->timestamp('read_at')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->index(['distributor_id', 'prospect_id', 'created_at']);
            });
        }

        // ── engagement_notifications ──────────────────────────────────────────
        if (!Schema::hasTable('engagement_notifications')) {
            Schema::create('engagement_notifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->unsignedBigInteger('prospect_id')->nullable();
                $table->string('type', 60); // presentation_opened, presentation_completed, invitation_accepted, high_watch, etc.
                $table->string('title', 255);
                $table->text('body');
                $table->json('data')->nullable();
                $table->boolean('is_read')->default(false);
                $table->timestamp('read_at')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->index(['distributor_id', 'is_read', 'created_at']);
            });
        }

        // ── bulk_operations ───────────────────────────────────────────────────
        if (!Schema::hasTable('bulk_operations')) {
            Schema::create('bulk_operations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->string('operation_type', 40); // bulk_invite, bulk_assign_presentation
                $table->json('prospect_ids');
                $table->json('config'); // invitation_type, presentation_id, etc.
                $table->integer('total_count')->default(0);
                $table->integer('success_count')->default(0);
                $table->integer('fail_count')->default(0);
                $table->string('status', 20)->default('pending'); // pending, processing, completed, failed
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
            });
        }

        // ── audit_trail ───────────────────────────────────────────────────────
        if (!Schema::hasTable('audit_trail')) {
            Schema::create('audit_trail', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->string('action', 80); // presentation_viewed, invitation_sent, prospect_stage_changed, etc.
                $table->string('entity_type', 40)->nullable(); // presentation, invitation, prospect
                $table->unsignedBigInteger('entity_id')->nullable();
                $table->json('details')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index(['distributor_id', 'created_at']);
                $table->index(['entity_type', 'entity_id']);
            });
        }

        // ── smart_followup_schedules ──────────────────────────────────────────
        if (!Schema::hasTable('smart_followup_schedules')) {
            Schema::create('smart_followup_schedules', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->unsignedBigInteger('prospect_id');
                $table->string('trigger_event', 60); // presentation_opened, watch_50pct, watch_80pct, invitation_accepted
                $table->integer('delay_hours')->default(24); // hours after trigger to schedule follow-up
                $table->string('action_type', 40)->default('followup_reminder'); // followup_reminder, send_message, advance_stage
                $table->text('action_message')->nullable();
                $table->boolean('is_fired')->default(false);
                $table->timestamp('scheduled_for')->nullable();
                $table->timestamp('fired_at')->nullable();
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->index(['is_fired', 'scheduled_for']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('smart_followup_schedules');
        Schema::dropIfExists('audit_trail');
        Schema::dropIfExists('bulk_operations');
        Schema::dropIfExists('engagement_notifications');
        Schema::dropIfExists('in_app_messages');
        Schema::dropIfExists('presentation_versions');
        Schema::dropIfExists('script_templates');

        Schema::table('presentations', function (Blueprint $table) {
            foreach (['expires_at','is_revoked','version_number','category','brand_color','shared_with_downline','slides'] as $col) {
                if (Schema::hasColumn('presentations', $col)) $table->dropColumn($col);
            }
        });
        Schema::table('prospects', function (Blueprint $table) {
            foreach (['consent_given','consent_at','preferred_contact_time','timezone'] as $col) {
                if (Schema::hasColumn('prospects', $col)) $table->dropColumn($col);
            }
        });
    }
};
