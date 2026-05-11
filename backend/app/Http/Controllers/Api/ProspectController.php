<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Prospect;
use App\Models\ProspectActivity;
use App\Models\Followup;
use App\Models\ClosingAttempt;
use Carbon\Carbon;

class ProspectController extends Controller
{
    private function distId(Request $request): int
    {
        $u = $request->user();
        return (int)($u->distributor_id ?? $u->id);
    }

    // â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET /api/prospects/dashboard
     * Returns pipeline counts, hot leads, overdue follow-ups, etc.
     */
    public function dashboard(Request $request)
    {
        try {
        $distId = $this->distId($request);
        $today  = Carbon::today();

        $all = Prospect::where('distributor_id', $distId)->get();

        // Stage counts
        $stageCounts = [];
        foreach (Prospect::STAGES as $stage) {
            $stageCounts[$stage] = $all->where('stage', $stage)->count();
        }

        $nonActive = ['Joined', 'Rejected', 'Inactive'];

        // Hot leads (score >= 70 and not joined/rejected)
        $hotLeads = $all->filter(fn($p) =>
            ((int)($p->interest_score ?? 0)) >= 70 &&
            !in_array($p->stage, $nonActive)
        )->sortByDesc('interest_score')->take(5)->values();

        // Follow-ups due today
        $followUpsDue = $all->filter(function ($p) use ($today) {
            if (!$p->next_action_date) return false;
            try {
                return Carbon::parse($p->next_action_date)->isSameDay($today) &&
                       !in_array($p->stage, ['Joined', 'Rejected']);
            } catch (\Exception $e) { return false; }
        })->values();

        // Overdue follow-ups
        $overdue = $all->filter(function ($p) use ($today) {
            if (!$p->next_action_date) return false;
            try {
                $d = Carbon::parse($p->next_action_date);
                return $d->lt($today) && !$d->isSameDay($today) &&
                       !in_array($p->stage, ['Joined', 'Rejected']);
            } catch (\Exception $e) { return false; }
        })->values();

        // Presentations scheduled today
        $presentationsToday = $all->filter(function ($p) use ($today) {
            if ($p->stage !== 'Presentation Scheduled' || !$p->next_action_date) return false;
            try { return Carbon::parse($p->next_action_date)->isSameDay($today); }
            catch (\Exception $e) { return false; }
        })->values();

        // Closing opportunities
        $closingOpps = $all->where('stage', 'Closing')->values();

        // Newly joined (last 7 days)
        $newlyJoined = $all->filter(function ($p) {
            if ($p->stage !== 'Joined' || !$p->joined_at) return false;
            try { return Carbon::parse($p->joined_at)->gte(Carbon::now()->subDays(7)); }
            catch (\Exception $e) { return false; }
        })->values();

        // Analytics
        $total    = $all->count();
        $joined   = $all->where('stage', 'Joined')->count();
        $convRate = $total > 0 ? round(($joined / $total) * 100) : 0;
        $avgScore = $total > 0 ? round($all->avg('interest_score') ?? 0) : 0;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'stage_counts'         => $stageCounts,
                'hot_leads'            => $hotLeads,
                'follow_ups_due'       => $followUpsDue,
                'overdue'              => $overdue,
                'presentations_today'  => $presentationsToday,
                'closing_opps'         => $closingOpps,
                'newly_joined'         => $newlyJoined,
                'analytics'            => [
                    'total'            => $total,
                    'joined'           => $joined,
                    'conversion_rate'  => $convRate,
                    'avg_score'        => $avgScore,
                    'hot_count'        => $all->where('interest_level', 'hot')->count(),
                    'warm_count'       => $all->where('interest_level', 'warm')->count(),
                    'cold_count'       => $all->where('interest_level', 'cold')->count(),
                    'overdue_count'    => $overdue->count(),
                ],
            ],
        ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Prospect dashboard error: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'file'    => basename($e->getFile()),
                'line'    => $e->getLine(),
            ], 500);
        }
    }

    // â”€â”€ CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** GET /api/prospects */
    public function index(Request $request)
    {
        $distId = $this->distId($request);
        $stage  = $request->query('stage');
        $level  = $request->query('interest_level');
        $search = $request->query('search');

        $query = Prospect::where('distributor_id', $distId)
            ->withCount(['followups', 'closingAttempts']);

        if ($stage)  $query->where('stage', $stage);
        if ($level)  $query->where('interest_level', $level);
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $prospects = $query->orderByDesc('interest_score')
                           ->orderBy('next_action_date')
                           ->get();

        return response()->json(['status' => 'success', 'data' => $prospects]);
    }

    /** POST /api/prospects */
    public function store(Request $request)
    {
        $distId = $this->distId($request);

        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'phone'            => 'required|string|max:50',
            'email'            => 'nullable|email|max:255',
            'source'           => 'nullable|string|max:50',
            'relationship'     => 'nullable|string|max:50',
            'stage'            => 'nullable|string|max:60',
            'interest_level'   => 'nullable|in:cold,warm,hot',
            'next_action'      => 'nullable|string|max:255',
            'next_action_date' => 'nullable|date',
            'occupation'       => 'nullable|string|max:100',
            'location'         => 'nullable|string|max:100',
            'age_range'        => 'nullable|string|max:20',
            'telegram'         => 'nullable|string|max:100',
            'whatsapp'         => 'nullable|string|max:50',
            'tags'             => 'nullable|array',
            'notes'            => 'nullable|string',
            'priority'         => 'nullable|in:low,normal,high,urgent',
        ]);

        $data['distributor_id'] = $distId;
        $data['stage']          = $data['stage'] ?? 'New Lead';
        $data['status']         = $data['stage'];
        $data['stage_updated_at'] = now();

        $prospect = Prospect::create($data);

        // Log activity
        ProspectActivity::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'activity_type'  => 'created',
            'title'          => 'Prospect added',
            'description'    => "Added to pipeline as {$prospect->stage}",
            'created_at'     => now(),
        ]);

        return response()->json(['status' => 'success', 'data' => $prospect], 201);
    }

    /** GET /api/prospects/{id} */
    public function show(Request $request, $id)
    {
        $distId = $this->distId($request);

        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->with(['followups', 'closingAttempts', 'activities'])
            ->firstOrFail();

        return response()->json(['status' => 'success', 'data' => $prospect]);
    }

    /** PUT /api/prospects/{id} */
    public function update(Request $request, $id)
    {
        $distId   = $this->distId($request);
        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail();

        $data = $request->validate([
            'name'             => 'sometimes|required|string|max:255',
            'phone'            => 'sometimes|required|string|max:50',
            'email'            => 'nullable|email|max:255',
            'source'           => 'nullable|string|max:50',
            'relationship'     => 'nullable|string|max:50',
            'stage'            => 'nullable|string|max:60',
            'interest_level'   => 'nullable|in:cold,warm,hot',
            'interest_score'   => 'nullable|integer|min:0|max:100',
            'next_action'      => 'nullable|string|max:255',
            'next_action_date' => 'nullable|date',
            'occupation'       => 'nullable|string|max:100',
            'location'         => 'nullable|string|max:100',
            'age_range'        => 'nullable|string|max:20',
            'telegram'         => 'nullable|string|max:100',
            'whatsapp'         => 'nullable|string|max:50',
            'tags'             => 'nullable|array',
            'notes'            => 'nullable|string',
            'priority'         => 'nullable|in:low,normal,high,urgent',
        ]);

        // Track stage change
        if (isset($data['stage']) && $data['stage'] !== $prospect->stage) {
            $oldStage = $prospect->stage;
            $newStage = $data['stage'];
            $data['stage_updated_at'] = now();
            $data['status'] = $newStage;

            if ($newStage === 'Joined') {
                $data['joined_at'] = now();
            }

            ProspectActivity::create([
                'prospect_id'    => $prospect->prospect_id,
                'distributor_id' => $distId,
                'activity_type'  => 'stage_change',
                'title'          => "Moved to {$newStage}",
                'description'    => "Stage changed from {$oldStage} to {$newStage}",
                'meta'           => ['old_stage' => $oldStage, 'new_stage' => $newStage],
                'created_at'     => now(),
            ]);
        }

        $prospect->update($data);
        $prospect->recalculateScore();

        return response()->json(['status' => 'success', 'data' => $prospect->fresh()]);
    }

    /** DELETE /api/prospects/{id} */
    public function destroy(Request $request, $id)
    {
        $distId = $this->distId($request);
        Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail()
            ->delete();

        return response()->json(['status' => 'success', 'message' => 'Prospect deleted']);
    }

    // â”€â”€ Stage move â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** PATCH /api/prospects/{id}/stage */
    public function moveStage(Request $request, $id)
    {
        $distId   = $this->distId($request);
        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail();

        $data = $request->validate([
            'stage'            => 'required|string|max:60',
            'next_action'      => 'nullable|string|max:255',
            'next_action_date' => 'nullable|date',
            'notes'            => 'nullable|string',
        ]);

        $oldStage = $prospect->stage;
        $newStage = $data['stage'];

        $prospect->stage            = $newStage;
        $prospect->status           = $newStage;
        $prospect->stage_updated_at = now();

        if (isset($data['next_action']))      $prospect->next_action      = $data['next_action'];
        if (isset($data['next_action_date'])) $prospect->next_action_date = $data['next_action_date'];
        if ($newStage === 'Joined')           $prospect->joined_at        = now();

        $prospect->save();

        ProspectActivity::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'activity_type'  => 'stage_change',
            'title'          => "Moved to {$newStage}",
            'description'    => $data['notes'] ?? "Stage changed from {$oldStage} to {$newStage}",
            'meta'           => ['old_stage' => $oldStage, 'new_stage' => $newStage],
            'created_at'     => now(),
        ]);

        $prospect->recalculateScore();

        return response()->json(['status' => 'success', 'data' => $prospect->fresh()]);
    }

    // â”€â”€ Follow-up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** POST /api/prospects/{id}/followups */
    public function storeFollowup(Request $request, $id)
    {
        $distId   = $this->distId($request);
        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail();

        $data = $request->validate([
            'followup_type'    => 'nullable|string|max:50',
            'method'           => 'nullable|string|max:50',
            'outcome'          => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
            'next_action'      => 'nullable|string|max:255',
            'next_action_date' => 'nullable|date',
        ]);

        $followup = Followup::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'followup_type'  => $data['followup_type'] ?? null,
            'method'         => $data['method'] ?? null,
            'outcome'        => $data['outcome'] ?? null,
            'notes'          => $data['notes'] ?? null,
        ]);

        // Update next action if provided
        if (!empty($data['next_action'])) {
            $prospect->next_action      = $data['next_action'];
            $prospect->next_action_date = $data['next_action_date'] ?? null;
            $prospect->save();
        }

        // Auto-advance stage if needed
        if ($prospect->stage === 'New Lead' || $prospect->stage === 'Contacted') {
            $prospect->stage  = 'Follow-Up Needed';
            $prospect->status = 'Follow-Up Needed';
            $prospect->save();
        }

        // Log activity
        ProspectActivity::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'activity_type'  => 'followup',
            'title'          => "Follow-up logged ({$data['followup_type']})",
            'description'    => $data['notes'] ?? $data['outcome'] ?? '',
            'meta'           => ['outcome' => $data['outcome'] ?? null, 'method' => $data['method'] ?? null],
            'created_at'     => now(),
        ]);

        $prospect->recalculateScore();

        return response()->json(['status' => 'success', 'data' => $followup], 201);
    }

    // â”€â”€ Closing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** POST /api/prospects/{id}/closings */
    public function storeClosing(Request $request, $id)
    {
        $distId   = $this->distId($request);
        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail();

        $data = $request->validate([
            'closing_method'   => 'nullable|string|max:50',
            'outcome'          => 'nullable|string|max:50',
            'notes'            => 'nullable|string',
            'objections'       => 'nullable|array',
        ]);

        $closing = ClosingAttempt::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'closing_method' => $data['closing_method'] ?? null,
            'outcome'        => $data['outcome'] ?? null,
            'notes'          => $data['notes'] ?? null,
        ]);

        // Auto-advance to Closing stage
        if (!in_array($prospect->stage, ['Closing', 'Joined', 'Rejected'])) {
            $prospect->stage  = 'Closing';
            $prospect->status = 'Closing';
            $prospect->save();
        }

        // If outcome is Closed/Positive â†’ move to Joined
        if (in_array($data['outcome'] ?? '', ['Closed', 'Positive', 'Joined'])) {
            $prospect->stage     = 'Joined';
            $prospect->status    = 'Joined';
            $prospect->joined_at = now();
            $prospect->save();
        }

        ProspectActivity::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'activity_type'  => 'closing',
            'title'          => "Closing attempt ({$data['outcome']})",
            'description'    => $data['notes'] ?? '',
            'meta'           => [
                'outcome'    => $data['outcome'] ?? null,
                'method'     => $data['closing_method'] ?? null,
                'objections' => $data['objections'] ?? [],
            ],
            'created_at'     => now(),
        ]);

        $prospect->recalculateScore();

        return response()->json(['status' => 'success', 'data' => $closing], 201);
    }

    // â”€â”€ Activity timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** GET /api/prospects/{id}/activities */
    public function activities(Request $request, $id)
    {
        $distId   = $this->distId($request);
        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail();

        $activities = ProspectActivity::where('prospect_id', $prospect->prospect_id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['status' => 'success', 'data' => $activities]);
    }

    // â”€â”€ Note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** POST /api/prospects/{id}/notes */
    public function addNote(Request $request, $id)
    {
        $distId   = $this->distId($request);
        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail();

        $data = $request->validate(['note' => 'required|string']);

        // Append to notes
        $existing = $prospect->notes ?? '';
        $prospect->notes = $existing
            ? $existing . "\n\n[" . now()->format('d M Y') . "] " . $data['note']
            : "[" . now()->format('d M Y') . "] " . $data['note'];
        $prospect->save();

        ProspectActivity::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'activity_type'  => 'note',
            'title'          => 'Note added',
            'description'    => $data['note'],
            'created_at'     => now(),
        ]);

        return response()->json(['status' => 'success', 'data' => $prospect->fresh()]);
    }

    // â”€â”€ Convert contact to prospect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** POST /api/contacts/{id}/convert */
    public function convertContact(Request $request, $id)
    {
        $distId   = $this->distId($request);
        $prospect = Prospect::where('prospect_id', $id)
            ->where('distributor_id', $distId)
            ->firstOrFail();

        $data = $request->validate([
            'stage'            => 'nullable|string|max:60',
            'next_action'      => 'nullable|string|max:255',
            'next_action_date' => 'nullable|date',
        ]);

        $prospect->stage            = $data['stage'] ?? 'Contacted';
        $prospect->status           = $prospect->stage;
        $prospect->next_action      = $data['next_action'] ?? 'Follow up';
        $prospect->next_action_date = $data['next_action_date'] ?? now()->addDay()->toDateString();
        $prospect->stage_updated_at = now();
        $prospect->save();

        ProspectActivity::create([
            'prospect_id'    => $prospect->prospect_id,
            'distributor_id' => $distId,
            'activity_type'  => 'converted',
            'title'          => 'Converted to prospect',
            'description'    => "Moved into pipeline at stage: {$prospect->stage}",
            'created_at'     => now(),
        ]);

        return response()->json(['status' => 'success', 'data' => $prospect->fresh()]);
    }

    // â”€â”€ Pipeline board (kanban) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** GET /api/prospects/pipeline */
    public function pipeline(Request $request)
    {
        $distId = $this->distId($request);

        $prospects = Prospect::where('distributor_id', $distId)
            ->withCount(['followups', 'closingAttempts'])
            ->orderByDesc('interest_score')
            ->get();

        $board = [];
        foreach (Prospect::STAGES as $stage) {
            $board[$stage] = $prospects->where('stage', $stage)->values();
        }

        return response()->json(['status' => 'success', 'data' => $board]);
    }
}

