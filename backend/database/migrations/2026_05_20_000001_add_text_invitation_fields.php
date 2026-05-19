<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            // Response timer: when the text was sent (for tracking response speed)
            if (!Schema::hasColumn('invitations', 'sent_at')) {
                $table->timestamp('sent_at')->nullable()->after('created_at');
            }
            // When the system should next check for a response (smart follow-up)
            if (!Schema::hasColumn('invitations', 'smart_check_at')) {
                $table->timestamp('smart_check_at')->nullable()->after('sent_at');
            }
            // Response time in minutes (computed when response arrives)
            if (!Schema::hasColumn('invitations', 'response_minutes')) {
                $table->integer('response_minutes')->nullable()->after('smart_check_at');
            }
            // Prospect value at time of invitation (hot/warm/cold) for reminder timing
            if (!Schema::hasColumn('invitations', 'prospect_value')) {
                $table->string('prospect_value', 10)->nullable()->after('response_minutes');
            }
            // Meeting details for "Interested - In Person" outcome
            if (!Schema::hasColumn('invitations', 'meeting_details')) {
                $table->json('meeting_details')->nullable()->after('prospect_value');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn(['sent_at', 'smart_check_at', 'response_minutes', 'prospect_value', 'meeting_details']);
        });
    }
};
