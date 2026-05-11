<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates all tables for the MLM Distributor Performance Operating System:
 * presentations, presentation_assignments, invitations, automation_rules,
 * automation_logs, engagement_events, recommendations, badges,
 * distributor_streaks, onboarding_progress, playbooks, funnel_snapshots
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── presentations ─────────────────────────────────────────────────────
        if (!Schema::hasTable('presentations')) {
            Schema::create('presentations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->string('title', 255)->nullable();
                $table->string('content_type', 50); // video, pdf, compensation_plan, testimonial, webinar_replay, explainer_video
                $table->text('file_url')->nullable();
                $table->text('external_url')->nullable();
                $table->text('thumbnail_url')->nullable();
                $table->text('description')->nullable();
                $table->integer('total_pages')->nullable(); // for PDFs
                $table->integer('duration_seconds')->nullable(); // for videos
                $table->decimal('conversion_rate', 5, 2)->default(0);
                $table->decimal('avg_engagement_score', 5, 2)->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->index(['distributor_id', 'content_type']);
            });
        }

        // ── presentation_assignments ──────────────────────────────────────────
        if (!Schema::hasTable('presentation_assignments')) {
            Schema::create('presentation_assignments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('presentation_id');
                $table->unsignedBigInteger('prospect_id');
                $table->unsignedBigInteger('distributor_id');
                $table->string('token', 64)->unique();
                $table->string('status', 30)->default('sent'); // sent, opened, in_progress, completed
                $table->integer('watch_percent')->default(0);
                $table->integer('page_reached')->default(0);
                $table->integer('time_spent_seconds')->default(0);
                $table->decimal('engagement_score', 5, 2)->default(0);
                $table->timestamp('opened_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
                $table->foreign('presentation_id')->references('id')->on('presentations')->onDelete('cascade');
                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->index(['distributor_id', 'prospect_id']);
                $table->index('token');
            });
        }

        // ── invitations ───────────────────────────────────────────────────────
        if (!Schema::hasTable('invitations')) {
            Schema::create('invitations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->unsignedBigInteger('prospect_id');
                $table->string('invitation_type', 50); // zoom, webinar, hotel_event, product_demo, compensation_plan_session, one_on_one_call, live_stream
                $table->string('token', 64)->unique();
                $table->string('status', 30)->default('sent'); // sent, opened, accepted, declined, ignored
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('opened_at')->nullable();
                $table->timestamp('responded_at')->nullable();
                $table->text('script_used')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->index(['distributor_id', 'prospect_id']);
                $table->index('token');
            });
        }

        // ── automation_rules ──────────────────────────────────────────────────
        if (!Schema::hasTable('automation_rules')) {
            Schema::create('automation_rules', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->string('name', 255);
                $table->string('trigger_type', 60); // presentation_watch_percent_reached, invitation_status_changed, no_response_days, webinar_attended, stage_changed, interest_score_changed
                $table->json('trigger_config')->nullable(); // e.g. {"watch_percent": 80}
                $table->json('condition')->nullable(); // optional extra condition
                $table->string('action_type', 60); // set_interest_level, add_interest_score, create_followup_reminder, advance_stage, send_push_notification, add_tag
                $table->json('action_config')->nullable(); // e.g. {"level": "hot"} or {"score_delta": 20}
                $table->boolean('is_active')->default(true);
                $table->boolean('is_default')->default(false);
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->index(['distributor_id', 'is_active']);
            });
        }

        // ── automation_logs ───────────────────────────────────────────────────
        if (!Schema::hasTable('automation_logs')) {
            Schema::create('automation_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('rule_id');
                $table->unsignedBigInteger('prospect_id');
                $table->unsignedBigInteger('distributor_id');
                $table->string('trigger_event', 60);
                $table->string('action_taken', 60);
                $table->json('details')->nullable();
                $table->boolean('success')->default(true);
                $table->text('error_message')->nullable();
                $table->timestamp('executed_at')->useCurrent();
                $table->foreign('rule_id')->references('id')->on('automation_rules')->onDelete('cascade');
                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->index(['distributor_id', 'executed_at']);
            });
        }

        // ── engagement_events ─────────────────────────────────────────────────
        if (!Schema::hasTable('engagement_events')) {
            Schema::create('engagement_events', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->unsignedBigInteger('prospect_id')->nullable();
                $table->string('token', 64)->nullable(); // tracked link token
                $table->string('event_type', 60); // page_visit, opened, watch_progress, pdf_page, completed, lead_captured, accepted, declined
                $table->string('source_type', 30)->nullable(); // presentation, invitation
                $table->unsignedBigInteger('source_id')->nullable();
                $table->integer('watch_percent')->nullable();
                $table->integer('page_reached')->nullable();
                $table->string('visitor_ip', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->json('meta')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index(['distributor_id', 'prospect_id', 'created_at']);
                $table->index('token');
            });
        }

        // ── recommendations ───────────────────────────────────────────────────
        if (!Schema::hasTable('recommendations')) {
            Schema::create('recommendations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->unsignedBigInteger('prospect_id');
                $table->string('type', 30); // high_intent, disengagement
                $table->string('signal', 60); // what triggered it
                $table->text('suggestion'); // human-readable action
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->index(['distributor_id', 'read_at']);
            });
        }

        // ── badges ────────────────────────────────────────────────────────────
        if (!Schema::hasTable('badges')) {
            Schema::create('badges', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->string('badge_type', 60); // first_daily_complete, streak_3, streak_7, streak_30, first_invite, first_presentation, first_recruit, pipeline_10, first_closing, onboarding_complete, first_10_challenge, weekly_goal
                $table->timestamp('earned_at')->useCurrent();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
                $table->unique(['distributor_id', 'badge_type']);
                $table->index('distributor_id');
            });
        }

        // ── distributor_streaks ───────────────────────────────────────────────
        if (!Schema::hasTable('distributor_streaks')) {
            Schema::create('distributor_streaks', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id')->unique();
                $table->integer('current_streak')->default(0);
                $table->integer('longest_streak')->default(0);
                $table->date('last_completed_date')->nullable();
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
            });
        }

        // ── onboarding_progress ───────────────────────────────────────────────
        if (!Schema::hasTable('onboarding_progress')) {
            Schema::create('onboarding_progress', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id')->unique();
                $table->boolean('first_invite_sent')->default(false);
                $table->boolean('first_presentation_assigned')->default(false);
                $table->boolean('first_prospect_added')->default(false);
                $table->boolean('first_recruit_joined')->default(false);
                $table->boolean('checklist_completed')->default(false);
                $table->boolean('onboarding_complete')->default(false);
                $table->integer('contacts_added_count')->default(0);
                $table->boolean('first_10_challenge_complete')->default(false);
                $table->timestamps();
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
            });
        }

        // ── playbooks ─────────────────────────────────────────────────────────
        if (!Schema::hasTable('playbooks')) {
            Schema::create('playbooks', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id')->nullable(); // null = global
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->json('steps'); // ordered array of instruction strings
                $table->string('category', 40); // invitation, presentation, closing, objection_handling
                $table->string('visibility', 20)->default('global'); // global, personal
                $table->timestamps();
                $table->index(['visibility', 'category']);
                $table->index('distributor_id');
            });
        }

        // ── prospect_priority ─────────────────────────────────────────────────
        // Stores computed priority scores separately to avoid bloating prospects table
        if (!Schema::hasTable('prospect_priority')) {
            Schema::create('prospect_priority', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('prospect_id')->unique();
                $table->unsignedBigInteger('distributor_id');
                $table->integer('priority_score')->default(0);
                $table->text('recommendation')->nullable();
                $table->timestamp('computed_at')->useCurrent();
                $table->foreign('prospect_id')->references('prospect_id')->on('prospects')->onDelete('cascade');
                $table->index(['distributor_id', 'priority_score']);
            });
        }

        // ── weekly_goals ──────────────────────────────────────────────────────
        if (!Schema::hasTable('weekly_goals')) {
            Schema::create('weekly_goals', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('distributor_id');
                $table->date('week_start'); // Monday of the week
                $table->integer('prospects_target')->default(5);
                $table->integer('invitations_target')->default(10);
                $table->integer('presentations_target')->default(5);
                $table->integer('prospects_actual')->default(0);
                $table->integer('invitations_actual')->default(0);
                $table->integer('presentations_actual')->default(0);
                $table->boolean('goal_achieved')->default(false);
                $table->timestamps();
                $table->unique(['distributor_id', 'week_start']);
                $table->foreign('distributor_id')->references('distributor_id')->on('distributors')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_goals');
        Schema::dropIfExists('prospect_priority');
        Schema::dropIfExists('playbooks');
        Schema::dropIfExists('onboarding_progress');
        Schema::dropIfExists('distributor_streaks');
        Schema::dropIfExists('badges');
        Schema::dropIfExists('recommendations');
        Schema::dropIfExists('engagement_events');
        Schema::dropIfExists('automation_logs');
        Schema::dropIfExists('automation_rules');
        Schema::dropIfExists('invitations');
        Schema::dropIfExists('presentation_assignments');
        Schema::dropIfExists('presentations');
    }
};
