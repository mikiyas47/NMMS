<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\Presentation;
use App\Models\PresentationAssignment;
use App\Models\Invitation;
use App\Models\AutomationRule;
use App\Models\AutomationLog;
use App\Models\EngagementEvent;
use App\Models\Recommendation;
use App\Models\Badge;
use App\Models\DistributorStreak;
use App\Models\OnboardingProgress;
use App\Models\Playbook;
use App\Models\ProspectPriority;
use App\Models\WeeklyGoal;
use App\Models\Prospect;
use App\Models\Distributor;
use App\Models\ProspectActivity;
use App\Events\PresentationEngaged;
use App\Events\ProspectVideoActivity;

class PerformanceController extends Controller
{
    private function distId(Request $r): int
    {
        $u = $r->user();
        return (int) ($u->distributor_id ?? $u->id);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRESENTATION CENTER
    // ═══════════════════════════════════════════════════════════════════

    public function listPresentations(Request $r)
    {
        $id = $this->distId($r);
        // Include the distributor's own presentations AND global owner-uploaded ones
        $items = Presentation::where(function ($q) use ($id) {
            $q->where('distributor_id', $id)
                ->orWhere('is_global', true);
        })->where('is_active', true)->orderByDesc('created_at')->get();
        return response()->json(['status' => 'success', 'data' => $items]);
    }

    public function storePresentation(Request $r)
    {
        $id = $this->distId($r);
        $data = $r->validate([
            'title' => 'nullable|string|max:255',
            'content_type' => 'required|in:video,pdf,compensation_plan,testimonial,webinar_replay,explainer_video',
            'file_url' => 'nullable|string',
            'external_url' => 'nullable|string',
            'thumbnail_url' => 'nullable|string',
            'description' => 'nullable|string',
            'total_pages' => 'nullable|integer|min:1',
            'duration_seconds' => 'nullable|integer|min:0',
        ]);
        if (empty($data['title']) && empty($data['file_url']) && empty($data['external_url'])) {
            return response()->json(['message' => 'A title and either a file or URL are required.'], 422);
        }
        $data['distributor_id'] = $id;
        $p = Presentation::create($data);
        return response()->json(['status' => 'success', 'data' => $p], 201);
    }

    public function updatePresentation(Request $r, $id)
    {
        $distId = $this->distId($r);
        $p = Presentation::where('id', $id)->where('distributor_id', $distId)->firstOrFail();
        $data = $r->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'thumbnail_url' => 'nullable|string',
            'external_url' => 'nullable|string',
        ]);
        $p->update($data);
        return response()->json(['status' => 'success', 'data' => $p->fresh()]);
    }

    public function deletePresentation(Request $r, $id)
    {
        $distId = $this->distId($r);
        Presentation::where('id', $id)->where('distributor_id', $distId)->firstOrFail()->delete();
        return response()->json(['status' => 'success', 'message' => 'Deleted']);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRESENTATION ASSIGNMENTS
    // ═══════════════════════════════════════════════════════════════════

    public function assignPresentation(Request $r)
    {
        $distId = $this->distId($r);
        $data = $r->validate([
            'presentation_id' => 'required|exists:presentations,id',
            'prospect_id' => 'required|exists:prospects,prospect_id',
        ]);
        $prospect = Prospect::where('prospect_id', $data['prospect_id'])->where('distributor_id', $distId)->firstOrFail();
        $token = Str::random(16);
        $assignment = PresentationAssignment::create([
            'presentation_id' => $data['presentation_id'],
            'prospect_id' => $data['prospect_id'],
            'distributor_id' => $distId,
            'token' => $token,
            'status' => 'sent',
        ]);
        // Log activity
        ProspectActivity::create(['prospect_id' => $data['prospect_id'], 'distributor_id' => $distId, 'activity_type' => 'presentation', 'title' => 'Presentation assigned', 'description' => 'Tracked link generated', 'created_at' => now()]);
        // Onboarding milestone
        $this->markOnboardingMilestone($distId, 'first_presentation_assigned');
        // Weekly goal
        $this->incrementWeeklyGoal($distId, 'presentations_actual');
        $link = 'https://nmms-backend.onrender.com/api/p/' . $token;
        return response()->json(['status' => 'success', 'data' => $assignment, 'tracked_link' => $link], 201);
    }

    // Log a call-based presentation outcome
    public function logPresentationCallOutcome(Request $r)
    {
        $distId = $this->distId($r);
        $data = $r->validate([
            'prospect_id' => 'required|exists:prospects,prospect_id',
            'outcome' => 'required|string|max:100',
            'notes' => 'nullable|string',
        ]);
        $prospect = Prospect::where('prospect_id', $data['prospect_id'])->where('distributor_id', $distId)->firstOrFail();

        // Log activity
        ProspectActivity::create([
            'prospect_id' => $data['prospect_id'],
            'distributor_id' => $distId,
            'activity_type' => 'presentation',
            'title' => 'Presentation call — ' . $data['outcome'],
            'description' => $data['notes'] ?? '',
            'meta' => ['outcome' => $data['outcome'], 'method' => 'call'],
            'created_at' => now(),
        ]);

        // Auto-advance stage based on outcome
        $positiveOutcomes = ['Understood Presentation', 'Interested', 'Asked About Pricing', 'Asked About Business Opportunity'];
        if (in_array($data['outcome'], $positiveOutcomes)) {
            if (!in_array($prospect->stage, ['Closing', 'Joined'])) {
                $prospect->stage = 'Follow-Up Needed';
                $prospect->status = 'Follow-Up Needed';
                $prospect->save();
            }
            // Boost interest score
            $prospect->interest_score = min(100, ($prospect->interest_score ?? 0) + 20);
            $prospect->save();
        }

        $this->recomputePriority($data['prospect_id'], $distId);
        $this->fireAutomation($distId, $data['prospect_id'], 'stage_changed', ['outcome' => $data['outcome']]);

        return response()->json(['status' => 'success', 'message' => 'Outcome logged']);
    }

    public function listAssignments(Request $r, $prospectId)
    {
        $distId = $this->distId($r);
        Prospect::where('prospect_id', $prospectId)->where('distributor_id', $distId)->firstOrFail();
        $items = PresentationAssignment::where('prospect_id', $prospectId)->where('distributor_id', $distId)->with('presentation')->orderByDesc('created_at')->get();
        return response()->json(['status' => 'success', 'data' => $items]);
    }

    // Public: track presentation engagement (no auth)
    public function trackPresentation(Request $r, $token)
    {
        $assignment = PresentationAssignment::where('token', $token)->first();
        if (!$assignment)
            return response()->json(['message' => 'Not found'], 404);

        $action = $r->input('action', 'heartbeat');
        $watchPct = (int) $r->input('watch_percent', 0);
        $timeSpent = (int) $r->input('time_spent', 0);
        $deviceType = $r->input('device_type');

        if ($deviceType && !$assignment->device_type) {
            $assignment->device_type = $deviceType;
        }

        if ($watchPct > $assignment->watch_percent) {
            $assignment->watch_percent = $watchPct;
        }
        
        if ($timeSpent > $assignment->time_spent_seconds) {
            $assignment->time_spent_seconds = $timeSpent;
        }

        // ── Real-time Watching State ──────────────────────────────
        // The mobile app polls /api/prospects/{id}/watching every 5s.
        // We track watching via DB so it works on any server (no WebSocket needed).
        if (in_array($action, ['opened', 'heartbeat'])) {
            $assignment->is_watching = true;
            $assignment->last_heartbeat_at = now();
        } elseif ($action === 'closed' || $action === 'completed') {
            $assignment->is_watching = false;
        }

        $notify = false;
        $notifyType = '';
        $notifyTitle = '';
        $notifyBody = '';
        $prospectName = Prospect::find($assignment->prospect_id)->name ?? 'A prospect';

        // Base Engagement Score Logic
        $score = 5; // Opened link
        if ($assignment->watch_percent >= 50) $score += 15;
        if ($assignment->watch_percent >= 100) $score += 40;
        if ($assignment->rewatch_count > 0) $score += 20;
        if ($assignment->cta_clicked_at) $score += 50;
        
        // Handle specific actions
        if ($action === 'cta_clicked') {
            $assignment->cta_clicked_at = now();
            $score += 50;
            $notify = true;
            $notifyType = 'cta_clicked';
            $notifyTitle = 'CTA Clicked!';
            $notifyBody = "$prospectName just clicked the Call to Action on your presentation!";
        } elseif ($action === 'completed') {
            if ($assignment->status !== 'completed') {
                $assignment->status = 'completed';
                $assignment->completed_at = now();
                $notify = true;
                $notifyType = 'presentation_completed';
                $notifyTitle = 'Presentation Completed';
                $notifyBody = "$prospectName just finished watching the presentation!";
                
                // Auto Follow-up: 100% Complete
                \App\Models\Followup::create([
                    'distributor_id' => $assignment->distributor_id,
                    'prospect_id' => $assignment->prospect_id,
                    'followup_type' => 'Auto-Generated',
                    'notes' => "Auto Reminder: $prospectName watched 100%. Suggested message: 'Glad you completed the presentation. Want me to walk you through how to get started?'",
                    'next_action' => 'Contact via WhatsApp/Call',
                    'next_action_date' => now()->toDateString(),
                    'status' => 'pending'
                ]);

            } else {
                // If it was already completed, this is a rewatch
                $assignment->rewatch_count += 1;
                $score += 20;
                $notify = true;
                $notifyType = 'presentation_rewatched';
                $notifyTitle = 'Presentation Rewatched';
                $notifyBody = "$prospectName is rewatching the presentation!";
            }
        } elseif ($action === 'closed' && $assignment->watch_percent > 0 && $assignment->watch_percent < 90) {
            // Auto Follow-up: Opened but didn't finish
            \App\Models\Followup::create([
                'distributor_id' => $assignment->distributor_id,
                'prospect_id' => $assignment->prospect_id,
                'followup_type' => 'Auto-Generated',
                'notes' => "Auto Reminder: $prospectName didn't finish the presentation. Suggested message: 'Hey, looks like you didn't finish the presentation. The last section explains the earning model clearly.'",
                'next_action' => 'Send Follow-up Message',
                'next_action_date' => now()->toDateString(),
                'status' => 'pending'
            ]);
        } elseif (str_starts_with($action, 'watched_')) {
            // e.g. watched_50_percent
            if (str_contains($action, '50_percent')) {
                $notify = true;
                $notifyType = 'presentation_50';
                $notifyTitle = '50% Milestone Reached';
                $notifyBody = "$prospectName just watched 50% of the presentation.";
            } elseif (str_contains($action, '75_percent')) {
                $notify = true;
                $notifyType = 'presentation_75';
                $notifyTitle = '75% Milestone Reached';
                $notifyBody = "$prospectName is highly engaged! They reached 75%.";
            }
        }

        $assignment->engagement_score = min(100, $score);

        // Classification
        if ($assignment->engagement_score >= 81) $assignment->classification = 'Hot Lead';
        elseif ($assignment->engagement_score >= 51) $assignment->classification = 'Interested';
        elseif ($assignment->engagement_score >= 21) $assignment->classification = 'Warm';
        else $assignment->classification = 'Cold';

        $assignment->save();

        // Record raw event
        if ($action !== 'heartbeat') {
            EngagementEvent::create([
                'distributor_id' => $assignment->distributor_id,
                'prospect_id' => $assignment->prospect_id,
                'token' => $token,
                'event_type' => $action,
                'source_type' => 'presentation',
                'source_id' => $assignment->id,
                'watch_percent' => $watchPct,
                'visitor_ip' => $r->ip(),
                'user_agent' => $r->userAgent(),
            ]);
        }

        // Send Notification
        if ($notify) {
            \App\Models\EngagementNotification::create([
                'distributor_id' => $assignment->distributor_id,
                'prospect_id' => $assignment->prospect_id,
                'type' => $notifyType,
                'title' => $notifyTitle,
                'body' => $notifyBody,
            ]);

            \App\Models\ProspectActivity::create([
                'prospect_id' => $assignment->prospect_id,
                'distributor_id' => $assignment->distributor_id,
                'activity_type' => 'presentation',
                'title' => $notifyTitle,
                'description' => $notifyBody,
                'created_at' => now(),
            ]);
        }

        // Update Prospect's interest score directly
        $prospect = Prospect::find($assignment->prospect_id);
        if ($prospect) {
            $prospect->interest_score = max($prospect->interest_score ?? 0, $assignment->engagement_score);
            if ($prospect->interest_score >= 81) $prospect->interest_level = 'hot';
            elseif ($prospect->interest_score >= 51) $prospect->interest_level = 'warm';
            elseif ($prospect->interest_score >= 21) $prospect->interest_level = 'warm'; // Keep 'warm' for both since mobile only has hot/warm/cold mostly, but wait, we can just use the score.
            else $prospect->interest_level = 'cold';
            $prospect->save();
        }

        $this->updatePresentationStats($assignment->presentation_id);
        $this->recomputePriority($assignment->prospect_id, $assignment->distributor_id);

        // Broadcast real-time event for Live Pulse
        PresentationEngaged::dispatch(
            $assignment->distributor_id, 
            $assignment->prospect_id, 
            $action, 
            $assignment->engagement_score, 
            $watchPct
        );

        return response()->json(['status' => 'success', 'score' => $assignment->engagement_score]);
    }

    private function updatePresentationStats(int $presentationId): void
    {
        $assignments = PresentationAssignment::where('presentation_id', $presentationId)->get();
        $total = $assignments->count();
        if ($total === 0)
            return;
        $completed = $assignments->where('status', 'completed')->count();
        $avgScore = $assignments->avg('engagement_score') ?? 0;
        Presentation::where('id', $presentationId)->update([
            'conversion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            'avg_engagement_score' => round($avgScore, 2),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // INVITATION SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    private const INVITE_SCRIPTS = [
        'zoom' => "Hey {prospect_name}! I'd love to connect with you on a quick Zoom call to share something exciting. Are you free this week? — {distributor_name}",
        'webinar' => "Hi {prospect_name}! I'm hosting a live webinar that I think you'll find really valuable. Would you like to join? — {distributor_name}",
        'hotel_event' => "Hey {prospect_name}! We're hosting an exclusive event at a hotel nearby. I'd love for you to be there. Can I count you in? — {distributor_name}",
        'product_demo' => "Hi {prospect_name}! I have an amazing product I'd love to show you. Can we schedule a quick demo? — {distributor_name}",
        'compensation_plan_session' => "Hey {prospect_name}! I want to walk you through how people are earning with this. It'll take 20 minutes. Are you open to it? — {distributor_name}",
        'one_on_one_call' => "Hi {prospect_name}! I'd love to have a one-on-one conversation with you about an opportunity I think fits you perfectly. When are you free? — {distributor_name}",
        'live_stream' => "Hey {prospect_name}! I'm going live soon and I think you'd love it. Can I send you the link? — {distributor_name}",
    ];

    public function createInvitation(Request $r)
    {
        $distId = $this->distId($r);
        $data = $r->validate([
            'prospect_id' => 'required|exists:prospects,prospect_id',
            'invitation_type' => 'required|in:zoom,webinar,hotel_event,product_demo,compensation_plan_session,one_on_one_call,live_stream',
            'scheduled_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);
        $prospect = Prospect::where('prospect_id', $data['prospect_id'])->where('distributor_id', $distId)->firstOrFail();
        $distributor = Distributor::where('distributor_id', $distId)->first();
        $script = str_replace(['{prospect_name}', '{distributor_name}'], [$prospect->name, $distributor->name ?? 'Your Distributor'], self::INVITE_SCRIPTS[$data['invitation_type']] ?? '');
        $token = Str::random(16);
        $invitation = Invitation::create([
            'distributor_id' => $distId,
            'prospect_id' => $data['prospect_id'],
            'invitation_type' => $data['invitation_type'],
            'token' => $token,
            'status' => 'sent',
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'script_used' => $script,
            'notes' => $data['notes'] ?? null,
        ]);
        ProspectActivity::create(['prospect_id' => $data['prospect_id'], 'distributor_id' => $distId, 'activity_type' => 'invited', 'title' => 'Invitation sent', 'description' => ucfirst(str_replace('_', ' ', $data['invitation_type'])), 'meta' => ['type' => $data['invitation_type']], 'created_at' => now()]);
        $this->markOnboardingMilestone($distId, 'first_invite_sent');
        $this->checkBadge($distId, 'first_invite');
        $this->incrementWeeklyGoal($distId, 'invitations_actual');
        $link = 'https://nmms-backend.onrender.com/api/invite/' . $token;
        return response()->json(['status' => 'success', 'data' => $invitation, 'tracked_link' => $link, 'script' => $script], 201);
    }

    public function listInvitations(Request $r, $prospectId)
    {
        $distId = $this->distId($r);
        Prospect::where('prospect_id', $prospectId)->where('distributor_id', $distId)->firstOrFail();
        $items = Invitation::where('prospect_id', $prospectId)->where('distributor_id', $distId)->orderByDesc('created_at')->get();
        return response()->json(['status' => 'success', 'data' => $items]);
    }

    public function updateInvitationStatus(Request $r, $id)
    {
        $distId = $this->distId($r);
        $inv = Invitation::where('id', $id)->where('distributor_id', $distId)->firstOrFail();
        $data = $r->validate(['status' => 'required|in:ignored']);
        $inv->update($data);
        return response()->json(['status' => 'success', 'data' => $inv->fresh()]);
    }

    // Public: track invitation engagement (no auth)
    public function trackInvitation(Request $r, $token)
    {
        $inv = Invitation::where('token', $token)->first();
        if (!$inv)
            return response()->json(['message' => 'Not found'], 404);
        $action = $r->input('action', 'open'); // open, accept, decline
        EngagementEvent::create(['distributor_id' => $inv->distributor_id, 'prospect_id' => $inv->prospect_id, 'token' => $token, 'event_type' => $action, 'source_type' => 'invitation', 'source_id' => $inv->id, 'visitor_ip' => $r->ip(), 'user_agent' => $r->userAgent()]);
        if ($action === 'open' && !$inv->opened_at) {
            $inv->status = 'opened';
            $inv->opened_at = now();
        }
        if ($action === 'accept') {
            $inv->status = 'accepted';
            $inv->responded_at = now();
            // Auto-advance stage
            try {
                $prospect = Prospect::find($inv->prospect_id);
                if ($prospect && in_array($prospect->stage, ['New Lead', 'Contacted'])) {
                    $prospect->stage = 'Invited';
                    $prospect->status = 'Invited';
                    $prospect->save();
                    ProspectActivity::create(['prospect_id' => $inv->prospect_id, 'distributor_id' => $inv->distributor_id, 'activity_type' => 'stage_change', 'title' => 'Moved to Invited', 'description' => 'Invitation accepted', 'meta' => ['old_stage' => $prospect->stage, 'new_stage' => 'Invited'], 'created_at' => now()]);
                }
            } catch (\Throwable $e) {
                Log::error('Invitation stage advance failed: ' . $e->getMessage());
            }
            $this->fireAutomation($inv->distributor_id, $inv->prospect_id, 'invitation_status_changed', ['status' => 'accepted']);
        }
        if ($action === 'decline') {
            $inv->status = 'declined';
            $inv->responded_at = now();
        }
        $inv->save();
        $this->recomputePriority($inv->prospect_id, $inv->distributor_id);
        // Return public page data
        $distributor = Distributor::where('distributor_id', $inv->distributor_id)->first();
        $prospect = Prospect::find($inv->prospect_id);
        return response()->json(['status' => 'success', 'distributor_name' => $distributor?->name, 'prospect_name' => $prospect?->name, 'invitation_type' => $inv->invitation_type, 'scheduled_at' => $inv->scheduled_at]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTOMATION ENGINE
    // ═══════════════════════════════════════════════════════════════════

    public function listAutomationRules(Request $r)
    {
        $id = $this->distId($r);
        return response()->json(['status' => 'success', 'data' => AutomationRule::where('distributor_id', $id)->get()]);
    }

    public function storeAutomationRule(Request $r)
    {
        $id = $this->distId($r);
        $data = $r->validate([
            'name' => 'required|string|max:255',
            'trigger_type' => 'required|in:presentation_watch_percent_reached,invitation_status_changed,no_response_days,webinar_attended,stage_changed,interest_score_changed',
            'trigger_config' => 'nullable|array',
            'condition' => 'nullable|array',
            'action_type' => 'required|in:set_interest_level,add_interest_score,create_followup_reminder,advance_stage,send_push_notification,add_tag',
            'action_config' => 'nullable|array',
        ]);
        $data['distributor_id'] = $id;
        $rule = AutomationRule::create($data);
        return response()->json(['status' => 'success', 'data' => $rule], 201);
    }

    public function toggleAutomationRule(Request $r, $id)
    {
        $distId = $this->distId($r);
        $rule = AutomationRule::where('id', $id)->where('distributor_id', $distId)->firstOrFail();
        $rule->is_active = !$rule->is_active;
        $rule->save();
        return response()->json(['status' => 'success', 'data' => $rule]);
    }

    public function fireAutomation(int $distId, int $prospectId, string $triggerType, array $context = []): void
    {
        $rules = AutomationRule::where('distributor_id', $distId)->where('trigger_type', $triggerType)->where('is_active', true)->get();
        foreach ($rules as $rule) {
            try {
                $this->executeAutomationAction($rule, $prospectId, $distId, $triggerType, $context);
            } catch (\Throwable $e) {
                try {
                    AutomationLog::create(['rule_id' => $rule->id, 'prospect_id' => $prospectId, 'distributor_id' => $distId, 'trigger_event' => $triggerType, 'action_taken' => $rule->action_type, 'success' => false, 'error_message' => $e->getMessage(), 'executed_at' => now()]);
                } catch (\Throwable $le) { /* logging failed, stop processing */
                    break;
                }
            }
        }
    }

    public function executeAutomationAction(AutomationRule $rule, int $prospectId, int $distId, string $trigger, array $ctx): void
    {
        $prospect = Prospect::find($prospectId);
        if (!$prospect)
            return;
        $cfg = $rule->action_config ?? [];
        switch ($rule->action_type) {
            case 'set_interest_level':
                $prospect->interest_level = $cfg['level'] ?? 'warm';
                $prospect->save();
                break;
            case 'add_interest_score':
                $delta = (int) ($cfg['score_delta'] ?? 10);
                $prospect->interest_score = min(100, max(0, ($prospect->interest_score ?? 0) + $delta));
                $prospect->save();
                $prospect->recalculateScore();
                break;
            case 'create_followup_reminder':
                $prospect->next_action = $cfg['message'] ?? 'Follow up with prospect';
                $prospect->next_action_date = now()->addDays((int) ($cfg['days'] ?? 1))->toDateString();
                $prospect->save();
                break;
            case 'advance_stage':
                $newStage = $cfg['stage'] ?? 'Follow-Up Needed';
                $prospect->stage = $newStage;
                $prospect->status = $newStage;
                $prospect->save();
                break;
            case 'add_tag':
                $tags = $prospect->tags ?? [];
                $tag = $cfg['tag'] ?? 'auto-tagged';
                if (!in_array($tag, $tags)) {
                    $tags[] = $tag;
                    $prospect->tags = $tags;
                    $prospect->save();
                }
                break;
            case 'send_push_notification':
                // Push notification placeholder — integrate with FCM when tokens are available
                Log::info("Push notification for distributor {$distId}: " . ($cfg['message'] ?? 'Automation triggered'));
                break;
        }
        AutomationLog::create(['rule_id' => $rule->id, 'prospect_id' => $prospectId, 'distributor_id' => $distId, 'trigger_event' => $trigger, 'action_taken' => $rule->action_type, 'details' => $ctx, 'success' => true, 'executed_at' => now()]);
    }

    public function seedDefaultAutomationRules(int $distId): void
    {
        $defaults = [
            ['name' => 'High Watch → Hot', 'trigger_type' => 'presentation_watch_percent_reached', 'trigger_config' => ['watch_percent' => 80], 'action_type' => 'set_interest_level', 'action_config' => ['level' => 'hot']],
            ['name' => 'No Response 3 Days → Reminder', 'trigger_type' => 'no_response_days', 'trigger_config' => ['days' => 3], 'action_type' => 'create_followup_reminder', 'action_config' => ['message' => 'Follow up — no response in 3 days', 'days' => 1]],
            ['name' => 'Webinar Attended → Score +20', 'trigger_type' => 'webinar_attended', 'trigger_config' => [], 'action_type' => 'add_interest_score', 'action_config' => ['score_delta' => 20]],
            ['name' => 'Invitation Accepted → Advance Stage', 'trigger_type' => 'invitation_status_changed', 'trigger_config' => ['status' => 'accepted'], 'action_type' => 'advance_stage', 'action_config' => ['stage' => 'Invited']],
            ['name' => 'Joined → Congratulations', 'trigger_type' => 'stage_changed', 'trigger_config' => ['stage' => 'Joined'], 'action_type' => 'send_push_notification', 'action_config' => ['message' => 'Congratulations! A new member has joined your team!']],
        ];
        foreach ($defaults as $d) {
            AutomationRule::firstOrCreate(['distributor_id' => $distId, 'name' => $d['name']], array_merge($d, ['distributor_id' => $distId, 'is_active' => true, 'is_default' => true]));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY ENGINE
    // ═══════════════════════════════════════════════════════════════════

    public function priorityLeads(Request $r)
    {
        $distId = $this->distId($r);
        $prospects = Prospect::where('distributor_id', $distId)->whereNotIn('stage', ['Joined', 'Rejected', 'Inactive'])->get();
        $results = [];
        foreach ($prospects as $p) {
            $score = $this->computePriorityScore($p, $distId);
            $rec = $this->generateRecommendation($p, $score, $distId);
            ProspectPriority::updateOrCreate(['prospect_id' => $p->prospect_id], ['distributor_id' => $distId, 'priority_score' => $score, 'recommendation' => $rec, 'computed_at' => now()]);
            $results[] = array_merge($p->toArray(), ['priority_score' => $score, 'recommendation' => $rec]);
        }
        usort($results, fn($a, $b) => $b['priority_score'] <=> $a['priority_score']);
        return response()->json(['status' => 'success', 'data' => array_slice($results, 0, 10)]);
    }

    public function recomputePriority(int $prospectId, int $distId): void
    {
        try {
            $p = Prospect::find($prospectId);
            if (!$p)
                return;
            $score = $this->computePriorityScore($p, $distId);
            $rec = $this->generateRecommendation($p, $score, $distId);
            ProspectPriority::updateOrCreate(['prospect_id' => $prospectId], ['distributor_id' => $distId, 'priority_score' => $score, 'recommendation' => $rec, 'computed_at' => now()]);
            // Sync interest_score if diff > 5
            if (abs($score - ($p->interest_score ?? 0)) > 5) {
                $p->interest_score = max(0, $score);
                $p->save();
            }
        } catch (\Throwable $e) {
            Log::error('Priority recompute failed: ' . $e->getMessage());
        }
    }

    private function computePriorityScore(Prospect $p, int $distId): int
    {
        // Engagement score (30%)
        $pp = ProspectPriority::where('prospect_id', $p->prospect_id)->first();
        $engagementScore = $pp ? min(100, $pp->priority_score) : ($p->interest_score ?? 0);
        // Recency (20%) — days since last activity
        $lastActivity = ProspectActivity::where('prospect_id', $p->prospect_id)->max('created_at');
        $daysSinceLast = $lastActivity ? Carbon::parse($lastActivity)->diffInDays(now()) : 30;
        $recencyScore = 100 / (1 + $daysSinceLast);
        // Responsiveness (20%) — ratio of responded invitations
        $totalInvites = \App\Models\Invitation::where('prospect_id', $p->prospect_id)->count();
        $responded = \App\Models\Invitation::where('prospect_id', $p->prospect_id)->whereIn('status', ['accepted', 'declined'])->count();
        $responsivenessScore = $totalInvites > 0 ? ($responded / $totalInvites) * 100 : 0;
        // Presentation completion (15%)
        $totalAssign = PresentationAssignment::where('prospect_id', $p->prospect_id)->count();
        $completed = PresentationAssignment::where('prospect_id', $p->prospect_id)->where('status', 'completed')->count();
        $presentationScore = $totalAssign > 0 ? ($completed / $totalAssign) * 100 : 0;
        // Webinar attendance (10%)
        $webinarCount = EngagementEvent::where('prospect_id', $p->prospect_id)->where('event_type', 'webinar_attended')->count();
        $webinarScore = min(100, $webinarCount * 20);
        // Follow-up gap (5%) — days since last follow-up
        $lastFollowup = \App\Models\Followup::where('prospect_id', $p->prospect_id)->max('created_at');
        $followupGap = $lastFollowup ? Carbon::parse($lastFollowup)->diffInDays(now()) : 14;
        $followupScore = 100 / (1 + $followupGap);
        $total = ($engagementScore * 0.30) + ($recencyScore * 0.20) + ($responsivenessScore * 0.20) + ($presentationScore * 0.15) + ($webinarScore * 0.10) + ($followupScore * 0.05);
        return max(0, (int) round($total));
    }

    private function generateRecommendation(Prospect $p, int $score, int $distId): string
    {
        $lastEngagement = EngagementEvent::where('prospect_id', $p->prospect_id)->max('created_at');
        $hoursSince = $lastEngagement ? Carbon::parse($lastEngagement)->diffInHours(now()) : 999;
        $daysSince = $hoursSince / 24;
        $ignoredFollowups = \App\Models\Followup::where('prospect_id', $p->prospect_id)->where('outcome', 'like', '%ignored%')->count();
        if ($score >= 80 && $hoursSince <= 24)
            return 'Highly engaged. Call now.';
        if ($score >= 60 && $daysSince >= 2)
            return 'High intent. Follow up today.';
        if ($score < 30 && $ignoredFollowups >= 3)
            return 'Pause outreach. Re-engage in 7 days.';
        if ($score < 20 && $daysSince > 14)
            return 'Low engagement. Consider removing from active pipeline.';
        return 'Keep nurturing. Stay consistent.';
    }

    // ═══════════════════════════════════════════════════════════════════
    // DAILY EXECUTION DASHBOARD
    // ═══════════════════════════════════════════════════════════════════

    public function dailyDashboard(Request $r)
    {
        $distId = $this->distId($r);
        $today = Carbon::today();
        // Follow-up tasks
        $followupTasks = Prospect::where('distributor_id', $distId)->whereNotIn('stage', ['Joined', 'Rejected', 'Inactive'])->where(function ($q) use ($today) {
            $q->whereDate('next_action_date', '<=', $today)->orWhereDate('next_action_date', $today); })->whereNotNull('next_action_date')->orderByDesc('next_action_date')->limit(5)->get()->map(fn($p) => ['type' => 'followup', 'prospect_id' => $p->prospect_id, 'prospect_name' => $p->name, 'action' => $p->next_action ?? 'Follow up', 'due_date' => $p->next_action_date, 'priority_score' => $p->interest_score ?? 0]);
        // Invitation tasks — New Lead/Contacted with no invite in 7+ days
        $invitedIds = \App\Models\Invitation::where('distributor_id', $distId)->where('created_at', '>=', now()->subDays(7))->pluck('prospect_id')->toArray();
        $inviteTasks = Prospect::where('distributor_id', $distId)->whereIn('stage', ['New Lead', 'Contacted'])->whereNotIn('prospect_id', $invitedIds)->orderByDesc('interest_score')->limit(3)->get()->map(fn($p) => ['type' => 'invite', 'prospect_id' => $p->prospect_id, 'prospect_name' => $p->name, 'action' => 'Send invitation', 'stage' => $p->stage]);
        // Presentation tasks — Invited/Awaiting Response with no presentation
        $assignedIds = PresentationAssignment::where('distributor_id', $distId)->pluck('prospect_id')->toArray();
        $presentTasks = Prospect::where('distributor_id', $distId)->whereIn('stage', ['Invited', 'Awaiting Response'])->whereNotIn('prospect_id', $assignedIds)->orderByDesc('interest_score')->limit(3)->get()->map(fn($p) => ['type' => 'presentation', 'prospect_id' => $p->prospect_id, 'prospect_name' => $p->name, 'action' => 'Send presentation', 'stage' => $p->stage]);
        // Closing tasks
        $closingTasks = Prospect::where('distributor_id', $distId)->where('stage', 'Closing')->orderByDesc('interest_score')->limit(3)->get()->map(fn($p) => ['type' => 'closing', 'prospect_id' => $p->prospect_id, 'prospect_name' => $p->name, 'action' => 'Close the deal', 'stage' => $p->stage]);
        $allTasks = array_merge($followupTasks->toArray(), $inviteTasks->toArray(), $presentTasks->toArray(), $closingTasks->toArray());
        // Streak
        $streak = DistributorStreak::firstOrCreate(['distributor_id' => $distId], ['current_streak' => 0, 'longest_streak' => 0]);
        // Badges
        $badges = Badge::where('distributor_id', $distId)->orderByDesc('earned_at')->get();
        // Motivational headline
        $fCount = count($followupTasks);
        $iCount = count($inviteTasks);
        $pCount = count($presentTasks);
        $cCount = count($closingTasks);
        $parts = [];
        if ($fCount > 0)
            $parts[] = "Follow up {$fCount} hot lead" . ($fCount > 1 ? 's' : '');
        if ($iCount > 0)
            $parts[] = "Invite {$iCount} new " . ($iCount > 1 ? 'people' : 'person');
        if ($pCount > 0)
            $parts[] = "Send {$pCount} presentation" . ($pCount > 1 ? 's' : '');
        if ($cCount > 0)
            $parts[] = "Close {$cCount} prospect" . ($cCount > 1 ? 's' : '');
        $headline = count($parts) > 0 ? implode(', ', $parts) . '.' : 'Great job! You are all caught up today.';
        return response()->json(['status' => 'success', 'data' => ['action_list' => $allTasks, 'streak' => $streak->current_streak, 'longest_streak' => $streak->longest_streak, 'badges' => $badges, 'headline' => $headline, 'total_tasks' => count($allTasks)]]);
    }

    public function completeTask(Request $r)
    {
        $distId = $this->distId($r);
        $data = $r->validate(['task_type' => 'required|string', 'prospect_id' => 'nullable|integer']);
        // Update streak
        $streak = DistributorStreak::firstOrCreate(['distributor_id' => $distId], ['current_streak' => 0, 'longest_streak' => 0]);
        $today = Carbon::today()->toDateString();
        if ($streak->last_completed_date && $streak->last_completed_date->toDateString() === $today) {
            // Already completed today, just increment
        } elseif ($streak->last_completed_date && $streak->last_completed_date->toDateString() === Carbon::yesterday()->toDateString()) {
            $streak->current_streak++;
        } else {
            $streak->current_streak = 1;
        }
        $streak->last_completed_date = $today;
        if ($streak->current_streak > $streak->longest_streak)
            $streak->longest_streak = $streak->current_streak;
        $streak->save();
        // Check streak badges
        foreach ([3 => 'streak_3', 7 => 'streak_7', 30 => 'streak_30'] as $days => $badge) {
            if ($streak->current_streak >= $days)
                $this->checkBadge($distId, $badge);
        }
        return response()->json(['status' => 'success', 'streak' => $streak->current_streak]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BEHAVIORAL INTELLIGENCE
    // ═══════════════════════════════════════════════════════════════════

    public function activeRecommendations(Request $r)
    {
        $distId = $this->distId($r);
        $recs = Recommendation::where('distributor_id', $distId)->whereNull('read_at')->with('prospect:prospect_id,name,phone,stage')->orderByDesc('created_at')->get();
        return response()->json(['status' => 'success', 'data' => $recs]);
    }

    public function prospectRecommendations(Request $r, $prospectId)
    {
        $distId = $this->distId($r);
        Prospect::where('prospect_id', $prospectId)->where('distributor_id', $distId)->firstOrFail();
        $recs = Recommendation::where('prospect_id', $prospectId)->orderByDesc('created_at')->get();
        return response()->json(['status' => 'success', 'data' => $recs]);
    }

    public function markRecommendationRead(Request $r, $id)
    {
        $distId = $this->distId($r);
        $rec = Recommendation::where('id', $id)->where('distributor_id', $distId)->firstOrFail();
        $rec->read_at = now();
        $rec->save();
        return response()->json(['status' => 'success']);
    }

    public function runBehavioralAnalysis(int $distId): void
    {
        $prospects = Prospect::where('distributor_id', $distId)->whereNotIn('stage', ['Joined', 'Rejected', 'Inactive'])->get();
        foreach ($prospects as $p) {
            $pid = $p->prospect_id;
            // High-intent signals
            $highWatchAssignment = PresentationAssignment::where('prospect_id', $pid)->where('watch_percent', '>=', 80)->exists();
            if ($highWatchAssignment)
                $this->createRecommendation($distId, $pid, 'high_intent', 'high_watch', 'Presentation watched 80%+. Call now to close.');
            $recentAccept = \App\Models\Invitation::where('prospect_id', $pid)->where('status', 'accepted')->where('responded_at', '>=', now()->subHours(2))->exists();
            if ($recentAccept)
                $this->createRecommendation($distId, $pid, 'high_intent', 'quick_accept', 'Invitation accepted within 2 hours. Strike while hot!');
            $pageVisits = EngagementEvent::where('prospect_id', $pid)->where('event_type', 'page_visit')->where('created_at', '>=', now()->subHours(24))->count();
            if ($pageVisits >= 3)
                $this->createRecommendation($distId, $pid, 'high_intent', 'multiple_page_visits', "Visited your page {$pageVisits} times today. High buying intent.");
            // Disengagement patterns
            $ignoredFollowups = \App\Models\Followup::where('prospect_id', $pid)->where('outcome', 'like', '%no answer%')->orWhere('outcome', 'like', '%ignored%')->count();
            if ($ignoredFollowups >= 3)
                $this->createRecommendation($distId, $pid, 'disengagement', 'ignored_followups', '3+ follow-ups ignored. Consider pausing outreach for 7 days.');
            $openedNotAccepted = \App\Models\Invitation::where('prospect_id', $pid)->where('status', 'opened')->where('opened_at', '<=', now()->subHours(48))->exists();
            if ($openedNotAccepted)
                $this->createRecommendation($distId, $pid, 'disengagement', 'opened_not_accepted', 'Invitation opened but not accepted in 48h. Send a gentle follow-up.');
            $notOpenedPresentation = PresentationAssignment::where('prospect_id', $pid)->where('status', 'sent')->where('created_at', '<=', now()->subHours(72))->exists();
            if ($notOpenedPresentation)
                $this->createRecommendation($distId, $pid, 'disengagement', 'presentation_not_opened', 'Presentation not opened in 72h. Try a different approach.');
        }
    }

    private function createRecommendation(int $distId, int $prospectId, string $type, string $signal, string $suggestion): void
    {
        // Avoid duplicate active recommendations for same signal
        $exists = Recommendation::where('distributor_id', $distId)->where('prospect_id', $prospectId)->where('signal', $signal)->whereNull('read_at')->exists();
        if (!$exists) {
            Recommendation::create(['distributor_id' => $distId, 'prospect_id' => $prospectId, 'type' => $type, 'signal' => $signal, 'suggestion' => $suggestion]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ONBOARDING SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    public function onboardingStatus(Request $r)
    {
        $distId = $this->distId($r);
        $progress = OnboardingProgress::firstOrCreate(['distributor_id' => $distId]);
        $badges = Badge::where('distributor_id', $distId)->get();
        $contactCount = Prospect::where('distributor_id', $distId)->count();
        return response()->json(['status' => 'success', 'data' => ['milestones' => $progress, 'contacts_added' => $contactCount, 'badges' => $badges, 'first_10_progress' => min(10, $contactCount)]]);
    }

    public function markOnboardingMilestone(int $distId, string $milestone): void
    {
        $progress = OnboardingProgress::firstOrCreate(['distributor_id' => $distId]);
        if (!$progress->$milestone) {
            $progress->$milestone = true;
            $progress->save();
            // Check if all 5 milestones complete
            if ($progress->first_invite_sent && $progress->first_presentation_assigned && $progress->first_prospect_added && $progress->first_recruit_joined && $progress->checklist_completed) {
                if (!$progress->onboarding_complete) {
                    $progress->onboarding_complete = true;
                    $progress->save();
                    $this->checkBadge($distId, 'onboarding_complete');
                    // Notify sponsor
                    $dist = Distributor::where('distributor_id', $distId)->first();
                    if ($dist && $dist->upline_id)
                        Log::info("Sponsor {$dist->upline_id} notified: distributor {$distId} completed onboarding.");
                }
            }
        }
    }

    public function checkFirstTenChallenge(int $distId): void
    {
        $progress = OnboardingProgress::firstOrCreate(['distributor_id' => $distId]);
        if ($progress->first_10_challenge_complete)
            return;
        $joinDate = Distributor::where('distributor_id', $distId)->value('join_date');
        if (!$joinDate)
            return;
        $withinWindow = Carbon::parse($joinDate)->addDays(7)->isFuture();
        if (!$withinWindow)
            return;
        $count = Prospect::where('distributor_id', $distId)->count();
        if ($count >= 10) {
            $progress->first_10_challenge_complete = true;
            $progress->save();
            $this->checkBadge($distId, 'first_10_challenge');
            $dist = Distributor::where('distributor_id', $distId)->first();
            if ($dist && $dist->upline_id)
                Log::info("Sponsor {$dist->upline_id} notified: distributor {$distId} completed First 10 Challenge.");
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DUPLICATION SYSTEM — PLAYBOOKS
    // ═══════════════════════════════════════════════════════════════════

    public function listPlaybooks(Request $r)
    {
        $distId = $this->distId($r);
        $global = Playbook::where('visibility', 'global')->get();
        $personal = Playbook::where('distributor_id', $distId)->where('visibility', 'personal')->get();
        $all = $global->concat($personal)->sortBy(['category', 'title'])->values();
        return response()->json(['status' => 'success', 'data' => $all]);
    }

    public function storePlaybook(Request $r)
    {
        $distId = $this->distId($r);
        $data = $r->validate(['title' => 'required|string|max:255', 'description' => 'nullable|string', 'steps' => 'required|array', 'category' => 'required|in:invitation,presentation,closing,objection_handling']);
        $data['distributor_id'] = $distId;
        $data['visibility'] = 'personal';
        $pb = Playbook::create($data);
        return response()->json(['status' => 'success', 'data' => $pb], 201);
    }

    public function getScript(Request $r)
    {
        $distId = $this->distId($r);
        $data = $r->validate(['invitation_type' => 'required|string', 'prospect_id' => 'required|exists:prospects,prospect_id']);
        $prospect = Prospect::where('prospect_id', $data['prospect_id'])->where('distributor_id', $distId)->firstOrFail();
        $distributor = Distributor::where('distributor_id', $distId)->first();
        $template = self::INVITE_SCRIPTS[$data['invitation_type']] ?? "Hi {prospect_name}, I have something exciting to share with you. — {distributor_name}";
        $script = str_replace(['{prospect_name}', '{distributor_name}'], [$prospect->name, $distributor->name ?? 'Your Distributor'], $template);
        return response()->json(['status' => 'success', 'script' => $script]);
    }

    public function weeklyGoals(Request $r)
    {
        $distId = $this->distId($r);
        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $goal = WeeklyGoal::firstOrCreate(['distributor_id' => $distId, 'week_start' => $weekStart], ['prospects_target' => 5, 'invitations_target' => 10, 'presentations_target' => 5]);
        $progress = [
            'prospects' => $goal->prospects_target > 0 ? round(($goal->prospects_actual / $goal->prospects_target) * 100) : 0,
            'invitations' => $goal->invitations_target > 0 ? round(($goal->invitations_actual / $goal->invitations_target) * 100) : 0,
            'presentations' => $goal->presentations_target > 0 ? round(($goal->presentations_actual / $goal->presentations_target) * 100) : 0,
        ];
        $overall = round(array_sum($progress) / 3);
        if ($overall >= 100 && !$goal->goal_achieved) {
            $goal->goal_achieved = true;
            $goal->save();
            $this->checkBadge($distId, 'weekly_goal');
            Log::info("Weekly goal push notification for distributor {$distId}");
        }
        return response()->json(['status' => 'success', 'data' => ['goal' => $goal, 'progress' => $progress, 'overall_percent' => $overall]]);
    }

    private function incrementWeeklyGoal(int $distId, string $field): void
    {
        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $goal = WeeklyGoal::firstOrCreate(['distributor_id' => $distId, 'week_start' => $weekStart], ['prospects_target' => 5, 'invitations_target' => 10, 'presentations_target' => 5]);
        $goal->increment($field);
    }

    // ═══════════════════════════════════════════════════════════════════
    // FUNNEL ANALYTICS
    // ═══════════════════════════════════════════════════════════════════

    public function funnelReport(Request $r)
    {
        $distId = $this->distId($r);
        $dateFrom = $r->query('start_date');
        $dateTo = $r->query('end_date');
        $q = fn($model) => $model::where('distributor_id', $distId);
        $pq = fn() => Prospect::where('distributor_id', $distId);
        if ($dateFrom) {
            $pq = fn() => Prospect::where('distributor_id', $distId)->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $pq = fn() => Prospect::where('distributor_id', $distId)->whereDate('created_at', '<=', $dateTo);
        }
        $contacts = Prospect::where('distributor_id', $distId)->count(); // all contacts = prospects
        $prospects = $contacts; // same table
        $invitations = \App\Models\Invitation::where('distributor_id', $distId)->count();
        $presentations = PresentationAssignment::where('distributor_id', $distId)->count();
        $followups = \App\Models\Followup::where('distributor_id', $distId)->count();
        $closings = \App\Models\ClosingAttempt::where('distributor_id', $distId)->count();
        $joined = Prospect::where('distributor_id', $distId)->where('stage', 'Joined')->count();
        $rate = fn($a, $b) => $a > 0 ? round(($b / $a) * 100, 1) : 0.0;
        $transitions = [
            'contacts_to_prospects' => $rate($contacts, $prospects),
            'prospects_to_invitations' => $rate($prospects, $invitations),
            'invitations_to_presentations' => $rate($invitations, $presentations),
            'presentations_to_followups' => $rate($presentations, $followups),
            'followups_to_closings' => $rate($followups, $closings),
            'closings_to_joined' => $rate($closings, $joined),
        ];
        // Weakest stage (exclude contacts count itself)
        $checkTransitions = array_slice($transitions, 1); // skip contacts_to_prospects
        $weakestKey = array_key_first(array_filter($checkTransitions, fn($v) => $v === min($checkTransitions)));
        $insights = [
            'prospects_to_invitations' => "Low invitation rate. Use the Invitation System to send more structured invites.",
            'invitations_to_presentations' => "Prospects aren't engaging with presentations. Try a different content type.",
            'presentations_to_followups' => "Follow-up rate is low. Set next actions immediately after every presentation.",
            'followups_to_closings' => "Weak closing rate. Review the Closing Playbook.",
            'closings_to_joined' => "Closing attempts aren't converting. Practice objection handling scripts.",
        ];
        $insight = $insights[$weakestKey] ?? "Keep improving your funnel consistency.";
        $overall = $contacts > 0 ? round(($joined / $contacts) * 100, 1) : 0.0;
        return response()->json(['status' => 'success', 'data' => ['funnel' => ['contacts' => $contacts, 'prospects' => $prospects, 'invitations' => $invitations, 'presentations' => $presentations, 'followups' => $followups, 'closings' => $closings, 'joined' => $joined], 'transitions' => $transitions, 'overall_conversion' => $overall, 'weakest_stage' => $weakestKey, 'insight' => $insight]]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BADGE SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    public function checkBadge(int $distId, string $badgeType): bool
    {
        $exists = Badge::where('distributor_id', $distId)->where('badge_type', $badgeType)->exists();
        if (!$exists) {
            Badge::create(['distributor_id' => $distId, 'badge_type' => $badgeType, 'earned_at' => now()]);
            Log::info("Badge earned: {$badgeType} for distributor {$distId}");
            return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC PAGE TRACKING
    // ═══════════════════════════════════════════════════════════════════

    public function publicInvitePage(Request $r, $token)
    {
        $inv = \App\Models\Invitation::where('token', $token)->first();
        if (!$inv)
            return response()->json(['message' => 'This link is no longer active.'], 404);
        $distributor = Distributor::where('distributor_id', $inv->distributor_id)->first();
        $prospect = Prospect::find($inv->prospect_id);
        EngagementEvent::create(['distributor_id' => $inv->distributor_id, 'prospect_id' => $inv->prospect_id, 'token' => $token, 'event_type' => 'page_visit', 'source_type' => 'invitation', 'source_id' => $inv->id, 'visitor_ip' => $r->ip(), 'user_agent' => $r->userAgent()]);
        return response()->json(['status' => 'success', 'page_type' => 'invitation', 'distributor_name' => $distributor?->name, 'prospect_name' => $prospect?->name, 'invitation_type' => $inv->invitation_type, 'scheduled_at' => $inv->scheduled_at, 'script' => $inv->script_used]);
    }

    /**
     * Mobile polling endpoint — returns whether the prospect is currently watching
     * any presentation. Considered "watching" if last heartbeat was < 30 seconds ago.
     * Called by the mobile app every 5 seconds when viewing a prospect profile.
     */
    public function watchingStatus(Request $r, $prospectId)
    {
        $distId = $this->distId($r);
        // Ensure this prospect belongs to the distributor
        Prospect::where('prospect_id', $prospectId)->where('distributor_id', $distId)->firstOrFail();

        $watching = PresentationAssignment::where('prospect_id', $prospectId)
            ->where('distributor_id', $distId)
            ->where('is_watching', true)
            ->where('last_heartbeat_at', '>=', now()->subSeconds(30))
            ->exists();

        // Also count recent closes (within last 5 mins) to show "just closed"
        $recentlyClosed = !$watching && PresentationAssignment::where('prospect_id', $prospectId)
            ->where('distributor_id', $distId)
            ->where('is_watching', false)
            ->where('last_heartbeat_at', '>=', now()->subMinutes(5))
            ->whereNotNull('last_heartbeat_at')
            ->exists();

        return response()->json([
            'status'          => 'success',
            'is_watching'     => $watching,
            'recently_closed' => $recentlyClosed,
            'checked_at'      => now()->toISOString(),
        ]);
    }

    public function publicPresentationPage(Request $r, $token)
    {
        $assignment = PresentationAssignment::where('token', $token)->with('presentation')->first();
        if (!$assignment)
            return response()->json(['message' => 'This link is no longer active.'], 404);

        $distributor = Distributor::where('distributor_id', $assignment->distributor_id)->first();
        $pres = $assignment->presentation;

        // Note: The view's JS will trigger the 'opened' event immediately, but we can also log it here if it's the first time
        if (!$assignment->opened_at) {
            $assignment->status = 'opened';
            $assignment->opened_at = now();
            $assignment->save();

            EngagementEvent::create([
                'distributor_id' => $assignment->distributor_id, 
                'prospect_id' => $assignment->prospect_id, 
                'token' => $token, 
                'event_type' => 'opened', 
                'source_type' => 'presentation', 
                'source_id' => $assignment->id, 
                'visitor_ip' => $r->ip(), 
                'user_agent' => $r->userAgent()
            ]);
            $this->recomputePriority($assignment->prospect_id, $assignment->distributor_id);
        }

        return view('presentation', [
            'assignment' => $assignment,
            'presentation' => $pres,
            'distributor' => $distributor,
            'token' => $token
        ]);
    }

    public function capturePublicLead(Request $r, $token)
    {
        $data = $r->validate(['name' => 'required|string', 'phone' => 'required|string']);
        $inv = \App\Models\Invitation::where('token', $token)->first();
        $assignment = $inv ? null : PresentationAssignment::where('token', $token)->first();
        $source = $inv ?? $assignment;
        if (!$source)
            return response()->json(['message' => 'Invalid link'], 404);
        EngagementEvent::create(['distributor_id' => $source->distributor_id, 'prospect_id' => $source->prospect_id, 'token' => $token, 'event_type' => 'lead_captured', 'visitor_ip' => $r->ip(), 'meta' => ['name' => $data['name'], 'phone' => $data['phone']]]);
        return response()->json(['status' => 'success', 'message' => 'Thank you! Your distributor will be in touch.']);
    }
}
