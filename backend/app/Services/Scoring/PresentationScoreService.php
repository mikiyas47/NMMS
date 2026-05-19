<?php
namespace App\Services\Scoring;

use App\Models\Prospect;
use App\Models\PresentationAssignment;

class PresentationScoreService
{
    public function calculate(Prospect $prospect): array
    {
        $score = 0;
        $breakdown = [];

        $assignments = PresentationAssignment::where('prospect_id', $prospect->prospect_id)->get();
        
        if ($assignments->isEmpty()) {
            return [
                'total' => 0,
                'breakdown' => []
            ];
        }

        // We'll calculate score based on the highest engaging assignment or aggregate them.
        // Let's analyze each assignment and show the breakdown for the main one.
        foreach ($assignments as $assignment) {
            // Opened link
            $score += 5;
            $breakdown[] = ['label' => 'Link Opened', 'value' => 5];

            // Watch progress
            $pct = $assignment->watch_percent;
            if ($pct >= 90) {
                $score += 40;
                $breakdown[] = ['label' => "{$pct}% Watched", 'value' => 40];
            } elseif ($pct >= 75) {
                $score += 30;
                $breakdown[] = ['label' => "{$pct}% Watched", 'value' => 30];
            } elseif ($pct >= 50) {
                $score += 20;
                $breakdown[] = ['label' => "{$pct}% Watched", 'value' => 20];
            } elseif ($pct >= 25) {
                $score += 10;
                $breakdown[] = ['label' => "{$pct}% Watched", 'value' => 10];
            } else {
                $score += 5;
                $breakdown[] = ['label' => "{$pct}% Watched", 'value' => 5];
            }

            // Completion Bonus
            if ($pct >= 100 || $assignment->status === 'completed') {
                $score += 10;
                $breakdown[] = ['label' => 'Completion Bonus', 'value' => 10];
            }

            // Rewatch Bonus
            if ($assignment->rewatch_count > 0) {
                $rewatchVal = $assignment->rewatch_count * 20;
                $score += $rewatchVal;
                $breakdown[] = ['label' => "Rewatched {$assignment->rewatch_count}x", 'value' => $rewatchVal];
            }

            // Exit Penalty (If it was closed, watch percent dictates penalty)
            // Let's check exit conditions
            if ($pct > 0 && $pct < 100) {
                if ($pct < 30) {
                    $score -= 10;
                    $breakdown[] = ['label' => 'Exit <30% Penalty', 'value' => -10];
                } elseif ($pct <= 70) {
                    $score -= 5;
                    $breakdown[] = ['label' => 'Exit 30-70% Penalty', 'value' => -5];
                }
            }
        }

        // CTA Scoring (Scan prospect activities for clicked CTAs)
        $activities = $prospect->activities()->where('activity_type', 'presentation')->get();
        foreach ($activities as $act) {
            $desc = $act->description ?? '';
            if (str_contains($desc, 'clicked the Call to Action')) {
                // Find what CTA was clicked
                if (str_contains($desc, 'Become Distributor')) {
                    $score += 60;
                    $breakdown[] = ['label' => 'CTA Clicked (Become Distributor)', 'value' => 60];
                } elseif (str_contains($desc, 'Talk to Distributor')) {
                    $score += 40;
                    $breakdown[] = ['label' => 'CTA Clicked (Talk to Distributor)', 'value' => 40];
                } elseif (str_contains($desc, 'Ask Questions')) {
                    $score += 25;
                    $breakdown[] = ['label' => 'CTA Clicked (Ask Questions)', 'value' => 25];
                } elseif (str_contains($desc, 'Learn More')) {
                    $score += 15;
                    $breakdown[] = ['label' => 'CTA Clicked (Learn More)', 'value' => 15];
                } else {
                    $score += 5;
                    $breakdown[] = ['label' => 'CTA Clicked (Watch More)', 'value' => 5];
                }
            }
        }

        return [
            'total' => $score,
            'breakdown' => $breakdown
        ];
    }
}
