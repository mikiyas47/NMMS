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
    public function index(Request $request)
    {
        $distributorId = $request->user()->distributor_id ?? $request->user()->id;
        $goals = Goal::where('distributor_id', $distributorId)
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

        $data['distributor_id'] = $request->user()->distributor_id ?? $request->user()->id;
        $data['current_value']  = 0;
        $data['status']         = 'active';
        $data['created_at']     = now();

        $goal = Goal::create($data);

        return response()->json(['status' => 'success', 'data' => $goal->load('milestones')], 201);
    }

    /** GET /api/goals/{id} — single goal with full details */
    public function show(Request $request, $id)
    {
        $distributorId = $request->user()->distributor_id ?? $request->user()->id;
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', $distributorId)
            ->with(['milestones', 'activities'])
            ->firstOrFail();

        return response()->json(['status' => 'success', 'data' => $goal]);
    }

    /** PUT /api/goals/{id} — update a goal */
    public function update(Request $request, $id)
    {
        $distributorId = $request->user()->distributor_id ?? $request->user()->id;
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', $distributorId)
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
    public function destroy(Request $request, $id)
    {
        $distributorId = $request->user()->distributor_id ?? $request->user()->id;
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', $distributorId)
            ->firstOrFail();

        $goal->delete();

        return response()->json(['status' => 'success', 'message' => 'Goal deleted']);
    }

    // ── Goal Activities ──────────────────────────────────────────────

    /** GET /api/goals/{id}/activities */
    public function activities(Request $request, $id)
    {
        $distributorId = $request->user()->distributor_id ?? $request->user()->id;
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', $distributorId)
            ->firstOrFail();

        $activities = GoalActivity::where('goal_id', $goal->goal_id)
            ->orderBy('activity_date', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $activities]);
    }

    /** POST /api/goals/{id}/activities — log an activity and update current_value */
    public function storeActivity(Request $request, $id)
    {
        $distributorId = $request->user()->distributor_id ?? $request->user()->id;
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', $distributorId)
            ->firstOrFail();

        $data = $request->validate([
            'activity_type' => 'required|in:team,personal,income,recruitment,sales',
            'value'         => 'required|numeric|min:0',
            'note'          => 'nullable|string',
            'activity_date' => 'required|date',
        ]);

        $data['goal_id']        = $goal->goal_id;
        $data['distributor_id'] = $distributorId;
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
        $distributorId = $request->user()->distributor_id ?? $request->user()->id;
        $goal = Goal::where('goal_id', $id)
            ->where('distributor_id', $distributorId)
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

    // ── Goal Engine ──────────────────────────────────────────────────
    // GET /api/goals/engine
    // Auto-generates goals, tasks, priorities, and progress data
    // from live rank, tree, wallet, and network data.
    public function engine(Request $request)
    {
        try {
        $user          = $request->user();
        $distributorId = $user->distributor_id ?? $user->id;

        // ── Live data ────────────────────────────────────────────────
        $stat   = \App\Models\Stat::where('distributor_id', $distributorId)->first();
        $wallet = \App\Models\Wallet::where('distributor_id', $distributorId)->first();
        $mlm    = new \App\Services\MlmEngineService();

        $currentRank = $stat?->rank ?? 'CT';
        $ownPoints   = (int)($stat?->own_points ?? 0);

        $rootNode    = \App\Models\Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        $totalPoints = $rootNode ? $mlm->getSubtreeVolume($rootNode->id) : $ownPoints;

        // Direct team count
        $directCount = $rootNode ? $rootNode->children()->count() : 0;

        // Total team size (excluding self)
        $totalTeam = 0;
        if ($rootNode) {
            $totalTeam = $this->countSubtree($rootNode->id) - 1;
        }

        // Per-leg volumes (leg 1 includes own_points)
        $legPoints  = [];
        $directLegs = null;
        if ($rootNode) {
            $directLegs = \App\Models\Node::where('parent_id', $rootNode->id)->get()->keyBy('leg');
            for ($i = 1; $i <= 4; $i++) {
                $legNode       = $directLegs->get($i);
                $legPoints[$i] = $legNode ? $mlm->getSubtreeVolume($legNode->id) : 0;
            }
            $legPoints[1] = ($legPoints[1] ?? 0) + $ownPoints;
        } else {
            $legPoints = [1 => $ownPoints, 2 => 0, 3 => 0, 4 => 0];
        }

        // Rank thresholds
        $rankOrder = ['CT', 'MT', 'TT', 'NTB', 'IBB', 'GEB', 'CA', 'C_AWARD', 'AL'];
        $rankScore = ['CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8];
        $rankRequirements = [
            'MT'      => ['total' => 5000,   'legs_above' => 200,    'legs_count' => 4, 'leg_rank' => null,  'leg_rank_count' => 0],
            'TT'      => ['total' => 10000,  'legs_above' => null,   'legs_count' => 0, 'leg_rank' => 'MT',  'leg_rank_count' => 2],
            'NTB'     => ['total' => 50000,  'legs_above' => null,   'legs_count' => 0, 'leg_rank' => 'TT',  'leg_rank_count' => 4],
            'IBB'     => ['total' => 200000, 'legs_above' => null,   'legs_count' => 0, 'leg_rank' => 'NTB', 'leg_rank_count' => 4],
            'GEB'     => ['total' => 800000, 'legs_above' => null,   'legs_count' => 0, 'leg_rank' => 'IBB', 'leg_rank_count' => 4],
            'CA'      => ['total' => null,   'legs_above' => null,   'legs_count' => 0, 'leg_rank' => 'GEB', 'leg_rank_count' => 4],
            'C_AWARD' => ['total' => null,   'legs_above' => null,   'legs_count' => 0, 'leg_rank' => 'CA',  'leg_rank_count' => 2],
            'AL'      => ['total' => null,   'legs_above' => null,   'legs_count' => 0, 'leg_rank' => 'CA',  'leg_rank_count' => 4],
        ];

        // Next rank
        $currentScore = $rankScore[$currentRank] ?? 0;
        $nextRank = null;
        foreach ($rankOrder as $r) {
            if (($rankScore[$r] ?? 0) > $currentScore) { $nextRank = $r; break; }
        }

        // ── Progress toward next rank ─────────────────────────────────
        $rankProgress   = 0;
        $missingItems   = [];
        $bottleneck     = 'volume'; // default

        if ($nextRank && isset($rankRequirements[$nextRank])) {
            $req = $rankRequirements[$nextRank];
            $checks = [];

            // Total points check
            if ($req['total']) {
                $pct = min(100, round(($totalPoints / $req['total']) * 100));
                $checks[] = $pct;
                if ($totalPoints < $req['total']) {
                    $missingItems[] = [
                        'type'    => 'volume',
                        'label'   => 'Total volume',
                        'current' => $totalPoints,
                        'target'  => $req['total'],
                        'pct'     => $pct,
                    ];
                }
            }

            // Legs above threshold check (MT only)
            if ($req['legs_above'] && $req['legs_count']) {
                $legsQualified = count(array_filter($legPoints, fn($p) => $p >= $req['legs_above']));
                $pct = min(100, round(($legsQualified / $req['legs_count']) * 100));
                $checks[] = $pct;
                if ($legsQualified < $req['legs_count']) {
                    $missingItems[] = [
                        'type'    => 'legs',
                        'label'   => "Legs ≥ {$req['legs_above']} pts",
                        'current' => $legsQualified,
                        'target'  => $req['legs_count'],
                        'pct'     => $pct,
                        'weak_legs' => array_keys(array_filter($legPoints, fn($p) => $p < $req['legs_above'])),
                    ];
                }
            }

            // Leg rank check
            if ($req['leg_rank'] && $req['leg_rank_count']) {
                $qualifiedLegs = 0;
                if ($rootNode && $directLegs) {
                    for ($i = 1; $i <= 4; $i++) {
                        $legNode = $directLegs->get($i);
                        if ($legNode) {
                            $highestInLeg = $this->getHighestRankInSubtree($legNode->id);
                            if (($rankScore[$highestInLeg] ?? 0) >= ($rankScore[$req['leg_rank']] ?? 0)) {
                                $qualifiedLegs++;
                            }
                        }
                    }
                }
                $pct = min(100, round(($qualifiedLegs / $req['leg_rank_count']) * 100));
                $checks[] = $pct;
                if ($qualifiedLegs < $req['leg_rank_count']) {
                    $missingItems[] = [
                        'type'    => 'leg_rank',
                        'label'   => "Legs with {$req['leg_rank']}+",
                        'current' => $qualifiedLegs,
                        'target'  => $req['leg_rank_count'],
                        'pct'     => $pct,
                    ];
                }
            }

            $rankProgress = count($checks) > 0 ? round(array_sum($checks) / count($checks)) : 0;

            // Determine bottleneck
            if (!empty($missingItems)) {
                usort($missingItems, fn($a, $b) => $a['pct'] <=> $b['pct']);
                $bottleneck = $missingItems[0]['type'];
            } else {
                $bottleneck = 'none';
            }
        } elseif (!$nextRank) {
            $rankProgress = 100;
            $bottleneck   = 'none';
        }

        // ── Weak legs ─────────────────────────────────────────────────
        $weakLegs = [];
        foreach ($legPoints as $leg => $pts) {
            if ($pts < 200) $weakLegs[] = (int)$leg;
        }
        $weakLegs = array_values($weakLegs);

        // ── Auto-generated goals ──────────────────────────────────────
        $autoGoals = [];

        if ($nextRank) {
            // Primary goal: reach next rank
            $autoGoals[] = [
                'id'          => 'rank_' . $nextRank,
                'type'        => 'rank',
                'priority'    => 'critical',
                'title'       => "Reach {$nextRank} Rank",
                'description' => $this->rankDescription($nextRank),
                'progress'    => $rankProgress,
                'missing'     => $missingItems,
                'bottleneck'  => $bottleneck,
            ];
        }

        // Weak leg goals
        foreach ($weakLegs as $leg) {
            $pts = $legPoints[$leg] ?? 0;
            $pct = min(100, round(($pts / 200) * 100));
            $autoGoals[] = [
                'id'          => 'leg_' . $leg,
                'type'        => 'leg',
                'priority'    => 'high',
                'title'       => "Strengthen Leg {$leg}",
                'description' => "Leg {$leg} has {$pts} pts. Needs 200 pts minimum for MT qualification.",
                'progress'    => $pct,
                'current'     => $pts,
                'target'      => 200,
                'missing'     => [],
                'bottleneck'  => 'recruitment',
            ];
        }

        // Volume goal if below next rank threshold
        if ($nextRank && isset($rankRequirements[$nextRank]['total']) && $rankRequirements[$nextRank]['total']) {
            $target = $rankRequirements[$nextRank]['total'];
            if ($totalPoints < $target) {
                $pct = min(100, round(($totalPoints / $target) * 100));
                $autoGoals[] = [
                    'id'          => 'volume_' . $nextRank,
                    'type'        => 'volume',
                    'priority'    => 'high',
                    'title'       => "Build {$target} Total Points",
                    'description' => "You have {$totalPoints} pts. Need {$target} pts for {$nextRank}.",
                    'progress'    => $pct,
                    'current'     => $totalPoints,
                    'target'      => $target,
                    'missing'     => [],
                    'bottleneck'  => 'volume',
                ];
            }
        }

        // Team growth goal
        $teamTarget = max(10, $directCount + 3);
        $teamPct    = min(100, round(($directCount / $teamTarget) * 100));
        $autoGoals[] = [
            'id'          => 'team_growth',
            'type'        => 'team',
            'priority'    => 'medium',
            'title'       => "Grow Direct Team to {$teamTarget}",
            'description' => "You have {$directCount} direct recruits. Grow to {$teamTarget} to accelerate rank.",
            'progress'    => $teamPct,
            'current'     => $directCount,
            'target'      => $teamTarget,
            'missing'     => [],
            'bottleneck'  => 'recruitment',
        ];

        // ── Auto-generated daily tasks ────────────────────────────────
        $tasks = $this->generateDailyTasks($bottleneck, $currentRank, $nextRank, $weakLegs, $directCount);

        // ── Motivational coaching message ─────────────────────────────
        $coachMessage = $this->generateCoachMessage($currentRank, $nextRank, $rankProgress, $bottleneck, $totalPoints);

        // ── Weekly momentum (last 7 days of payments/recruits) ────────
        $weeklyRecruits = \App\Models\Distributor::where('upline_id', $distributorId)
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        $weeklyEarnings = \App\Models\Payment::where('distributor_id', $distributorId)
            ->where('status', 'success')
            ->where('created_at', '>=', now()->subDays(7))
            ->sum('commission_amount');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'current_rank'    => $currentRank,
                'next_rank'       => $nextRank,
                'rank_progress'   => $rankProgress,
                'own_points'      => $ownPoints,
                'total_points'    => $totalPoints,
                'direct_count'    => $directCount,
                'total_team'      => $totalTeam,
                'leg_points'      => [
                    '1' => $legPoints[1] ?? 0,
                    '2' => $legPoints[2] ?? 0,
                    '3' => $legPoints[3] ?? 0,
                    '4' => $legPoints[4] ?? 0,
                ],
                'weak_legs'       => $weakLegs,
                'bottleneck'      => $bottleneck,
                'missing_items'   => array_values($missingItems),
                'auto_goals'      => array_values($autoGoals),
                'daily_tasks'     => array_values($tasks),
                'coach_message'   => $coachMessage,
                'weekly_momentum' => [
                    'recruits' => $weeklyRecruits,
                    'earnings' => round((float)$weeklyEarnings, 2),
                ],
                'wallet_balance'  => round((float)($wallet?->balance ?? 0), 2),
            ],
        ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Goal engine error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ], 500);
        }
    }

    // ── Private helpers for engine ────────────────────────────────────

    private function countSubtree(int $nodeId): int
    {
        $node = \App\Models\Node::with('children')->find($nodeId);
        if (!$node) return 0;
        $count = 1;
        foreach ($node->children as $child) $count += $this->countSubtree($child->id);
        return $count;
    }

    private function getHighestRankInSubtree(int $nodeId): string
    {
        $rankScore   = ['CT' => 0, 'MT' => 1, 'TT' => 2, 'NTB' => 3, 'IBB' => 4, 'GEB' => 5, 'CA' => 6, 'C_AWARD' => 7, 'AL' => 8];
        $highest     = 0;
        $highestRank = 'CT';
        $queue = [$nodeId];
        while (!empty($queue)) {
            $currId = array_shift($queue);
            $node   = \App\Models\Node::with('children')->find($currId);
            if (!$node) continue;
            $stat = \App\Models\Stat::where('distributor_id', $node->distributor_id)->first();
            if ($stat && $stat->rank && isset($rankScore[$stat->rank]) && $rankScore[$stat->rank] > $highest) {
                $highest     = $rankScore[$stat->rank];
                $highestRank = $stat->rank;
            }
            foreach ($node->children as $child) $queue[] = $child->id;
        }
        return $highestRank;
    }

    private function rankDescription(string $rank): string
    {
        $desc = [
            'MT'      => 'All 4 legs need ≥200 pts and total ≥5,000 pts.',
            'TT'      => '2 legs must have MT+ rank and total ≥10,000 pts.',
            'NTB'     => '4 legs must have TT+ rank and total ≥50,000 pts.',
            'IBB'     => '4 legs must have NTB+ rank and total ≥200,000 pts.',
            'GEB'     => '4 legs must have IBB+ rank and total ≥800,000 pts.',
            'CA'      => '4 legs must have GEB rank. Earns $50,000 bonus.',
            'C_AWARD' => '2 legs must have CA rank. Earns $100,000 bonus.',
            'AL'      => '4 legs must have CA rank. Earns $500,000 bonus.',
        ];
        return $desc[$rank] ?? '';
    }

    private function generateDailyTasks(string $bottleneck, string $currentRank, ?string $nextRank, array $weakLegs, int $directCount): array
    {
        $tasks = [];

        // Always-present tasks
        $tasks[] = ['id' => 'contact_prospects',  'priority' => 'high',   'icon' => 'users',      'title' => 'Contact 10 prospects',          'description' => 'Reach out to 10 new potential recruits today.'];
        $tasks[] = ['id' => 'follow_up_leads',    'priority' => 'high',   'icon' => 'phone',      'title' => 'Follow up 5 leads',             'description' => 'Check in with 5 people who showed interest.'];
        $tasks[] = ['id' => 'post_content',       'priority' => 'medium', 'icon' => 'share',      'title' => 'Post 1 marketing content',      'description' => 'Share a product or success story on social media.'];
        $tasks[] = ['id' => 'train_downline',     'priority' => 'medium', 'icon' => 'book',       'title' => 'Train 1 downline member',       'description' => 'Help a team member understand the system or products.'];
        $tasks[] = ['id' => 'sell_product',       'priority' => 'medium', 'icon' => 'package',    'title' => 'Sell 1 product',                'description' => 'Close at least one product sale today.'];

        // Bottleneck-specific tasks
        if ($bottleneck === 'legs' && !empty($weakLegs)) {
            $leg = $weakLegs[0];
            $tasks[] = ['id' => 'strengthen_leg', 'priority' => 'critical', 'icon' => 'target', 'title' => "Recruit into Leg {$leg}", 'description' => "Leg {$leg} is your weakest. Focus all recruitment here today."];
        }

        if ($bottleneck === 'volume') {
            $tasks[] = ['id' => 'boost_volume', 'priority' => 'critical', 'icon' => 'trending-up', 'title' => 'Drive 2 new package sales', 'description' => 'Volume is your bottleneck. Push for 2 new package purchases today.'];
        }

        if ($bottleneck === 'leg_rank') {
            $tasks[] = ['id' => 'develop_leader', 'priority' => 'critical', 'icon' => 'award', 'title' => 'Develop a leg leader', 'description' => 'One of your legs needs a higher-ranked distributor. Coach your best recruit today.'];
        }

        if ($directCount < 4) {
            $tasks[] = ['id' => 'recruit_direct', 'priority' => 'high', 'icon' => 'user-plus', 'title' => 'Recruit 1 direct member', 'description' => 'You need more direct recruits to build strong legs.'];
        }

        // Sort: critical first, then high, then medium
        $order = ['critical' => 0, 'high' => 1, 'medium' => 2];
        usort($tasks, fn($a, $b) => ($order[$a['priority']] ?? 2) <=> ($order[$b['priority']] ?? 2));

        return $tasks;
    }

    private function generateCoachMessage(string $currentRank, ?string $nextRank, int $progress, string $bottleneck, int $totalPoints): array
    {
        if (!$nextRank) {
            return ['title' => 'You are at the top!', 'body' => 'You have reached Alpha Legend. Keep mentoring your team.', 'tone' => 'success'];
        }

        $remaining = 100 - $progress;

        if ($progress >= 90) {
            return ['title' => "Almost there!", 'body' => "You are {$remaining}% away from {$nextRank}. One more push and you unlock the next level.", 'tone' => 'urgent'];
        }

        if ($progress >= 70) {
            return ['title' => "Strong momentum!", 'body' => "You are {$progress}% of the way to {$nextRank}. Keep the pressure on.", 'tone' => 'positive'];
        }

        if ($bottleneck === 'legs') {
            return ['title' => 'Balance your legs', 'body' => "Your volume is strong but some legs are weak. Recruit into your weakest leg to unlock {$nextRank}.", 'tone' => 'warning'];
        }

        if ($bottleneck === 'leg_rank') {
            return ['title' => 'Develop your leaders', 'body' => "You need stronger ranked distributors in your legs to reach {$nextRank}. Focus on coaching your top recruits.", 'tone' => 'warning'];
        }

        return ['title' => "You are {$progress}% to {$nextRank}", 'body' => "Keep building your network. Every recruit and sale moves you closer to {$nextRank}.", 'tone' => 'neutral'];
    }

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
