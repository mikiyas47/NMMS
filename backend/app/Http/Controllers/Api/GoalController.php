<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Goal;
use App\Models\GoalActivity;
use App\Models\GoalMilestone;
use Carbon\Carbon;

class GoalController extends Controller
{
    // ── Goals ────────────────────────────────────────────────────────

    /** GET /api/goals — list all goals for the authenticated distributor */
    public function index()
    {
        $goals = Goal::where('distributor_id', Auth::id())
            ->with(['milestones', 'activities' => fn($q) => $q->orderBy('activity_date', 'desc')->limit(5)])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $goals]);
    }

    /** POST /api/goals — create a new goal */
    public function store(Request $request)
    {
        $data = $request->validate([
            'goal_title'       => 'required|string|max:255',
            'goal_description' => 'nullable|string',
            'goal_type'        => 'required|in:team,personal,income,recruitment,sales',
            'target_value'     => 'required|numeric|min:0',
            'start_date'       => 'required|date',
            'end_date'         => 'required|date|after_or_equal:start_date',
        ]);

        $data['distributor_id'] = Auth::id();
        $data['current_value']  = 0;
        $data['status']         = 'active';
        $data['created_at']     = now();

        $goal = Goal::create($data);

        return response()->json(['status' => 'success', 'data' => $goal->load('milestones')], 201);
    }

    /** GET /api/goals/{id} — single goal with full details */
    public function show($id)
    {
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', Auth::id())
            ->with(['milestones', 'activities'])
            ->firstOrFail();

        return response()->json(['status' => 'success', 'data' => $goal]);
    }

    /** PUT /api/goals/{id} — update a goal */
    public function update(Request $request, $id)
    {
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', Auth::id())
            ->firstOrFail();

        $data = $request->validate([
            'goal_title'       => 'sometimes|required|string|max:255',
            'goal_description' => 'nullable|string',
            'goal_type'        => 'sometimes|required|in:team,personal,income,recruitment,sales',
            'target_value'     => 'sometimes|required|numeric|min:0',
            'current_value'    => 'sometimes|numeric|min:0',
            'start_date'       => 'sometimes|required|date',
            'end_date'         => 'sometimes|required|date',
            'status'           => 'sometimes|required|in:active,completed,failed,cancelled',
        ]);

        $goal->update($data);

        // Auto-complete goal if current_value >= target_value
        if ($goal->current_value >= $goal->target_value && $goal->status === 'active') {
            $goal->update(['status' => 'completed']);
        }

        // Check milestones that should be marked as reached
        $this->checkMilestones($goal);

        return response()->json(['status' => 'success', 'data' => $goal->load('milestones')]);
    }

    /** DELETE /api/goals/{id} */
    public function destroy($id)
    {
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', Auth::id())
            ->firstOrFail();

        $goal->delete();

        return response()->json(['status' => 'success', 'message' => 'Goal deleted']);
    }

    // ── Goal Activities ──────────────────────────────────────────────

    /** GET /api/goals/{id}/activities */
    public function activities($id)
    {
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', Auth::id())
            ->firstOrFail();

        $activities = GoalActivity::where('goal_id', $goal->goal_id)
            ->orderBy('activity_date', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $activities]);
    }

    /** POST /api/goals/{id}/activities — log an activity and update current_value */
    public function storeActivity(Request $request, $id)
    {
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', Auth::id())
            ->firstOrFail();

        $data = $request->validate([
            'activity_type' => 'required|in:team,personal,income,recruitment,sales',
            'value'         => 'required|numeric|min:0',
            'note'          => 'nullable|string',
            'activity_date' => 'required|date',
        ]);

        $data['goal_id']        = $goal->goal_id;
        $data['distributor_id'] = Auth::id();
        $data['created_at']     = now();

        $activity = GoalActivity::create($data);

        // Update the goal's current_value by adding this activity's value
        $newValue = $goal->current_value + $data['value'];
        $goal->update(['current_value' => $newValue]);

        // Auto-complete if target reached
        if ($goal->current_value >= $goal->target_value && $goal->status === 'active') {
            $goal->update(['status' => 'completed']);
        }

        // Check milestones
        $this->checkMilestones($goal->fresh());

        return response()->json(['status' => 'success', 'data' => $activity, 'goal' => $goal->fresh()->load('milestones')], 201);
    }

    // ── Goal Milestones ──────────────────────────────────────────────

    /** POST /api/goals/{id}/milestones — add a milestone to a goal */
    public function storeMilestone(Request $request, $id)
    {
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', Auth::id())
            ->firstOrFail();

        $data = $request->validate([
            'target_value' => 'required|numeric|min:0',
        ]);

        $data['goal_id'] = $goal->goal_id;
        $data['reached'] = $goal->current_value >= $data['target_value'];
        $data['reached_at'] = $data['reached'] ? now() : null;

        $milestone = GoalMilestone::create($data);

        return response()->json(['status' => 'success', 'data' => $milestone], 201);
    }

    // ── Private helpers ──────────────────────────────────────────────

    /**
     * Mark any unmet milestones as reached if the goal's current_value has passed them.
     */
    private function checkMilestones(Goal $goal): void
    {
        GoalMilestone::where('goal_id', $goal->goal_id)
            ->where('reached', false)
            ->where('target_value', '<=', $goal->current_value)
            ->update(['reached' => true, 'reached_at' => now()]);
    }
}
