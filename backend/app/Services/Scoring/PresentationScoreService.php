<?php
namespace App\Services\Scoring;

use App\Models\Prospect;
use App\Models\PresentationAssignment;

/**
 * Scores based on presentation engagement.
 *
 * Per assignment:
 *   Presentation Sent = +10
 *   Watch milestones (ONLY highest applies per assignment):
 *     25% = +10, 50% = +20, 75% = +30, 100% = +40
 *   Rewatch Bonus = +15 (once per assignment)
 *
 * Multiple assignments are scored independently and summed.
 */
class PresentationScoreService
{
    public function calculate(Prospect $prospect): array
    {
        $score     = 0;
        $breakdown = [];

        $assignments = PresentationAssignment::where('prospect_id', $prospect->prospect_id)->get();

        if ($assignments->isEmpty()) {
            return ['total' => 0, 'breakdown' => []];
        }

        foreach ($assignments as $assignment) {
            // Presentation sent / link opened
            $score += 10;
            $breakdown[] = ['label' => 'Presentation Sent', 'value' => 10];

            $pct = (int) $assignment->watch_percent;

            // ONLY apply the HIGHEST watch milestone reached (no stacking)
            if ($pct >= 100 || $assignment->status === 'completed') {
                $score += 40;
                $breakdown[] = ['label' => 'Watched 100%', 'value' => 40];
            } elseif ($pct >= 75) {
                $score += 30;
                $breakdown[] = ['label' => "Watched 75% ({$pct}%)", 'value' => 30];
            } elseif ($pct >= 50) {
                $score += 20;
                $breakdown[] = ['label' => "Watched 50% ({$pct}%)", 'value' => 20];
            } elseif ($pct >= 25) {
                $score += 10;
                $breakdown[] = ['label' => "Watched 25% ({$pct}%)", 'value' => 10];
            }

            // Rewatch bonus (once per assignment)
            if ($assignment->rewatch_count > 0) {
                $score += 15;
                $breakdown[] = ['label' => "Rewatched presentation", 'value' => 15];
            }
        }

        // CTA clicks from activities
        $activities = $prospect->activities()->where('activity_type', 'presentation')->get();
        foreach ($activities as $act) {
            $desc = $act->description ?? '';
            if (str_contains($desc, 'clicked the Call to Action')) {
                if (str_contains($desc, 'Become Distributor')) {
                    $score += 60;
                    $breakdown[] = ['label' => 'CTA: Become Distributor clicked', 'value' => 60];
                } elseif (str_contains($desc, 'Talk to Distributor')) {
                    $score += 40;
                    $breakdown[] = ['label' => 'CTA: Talk to Distributor clicked', 'value' => 40];
                } elseif (str_contains($desc, 'Ask Questions')) {
                    $score += 25;
                    $breakdown[] = ['label' => 'CTA: Ask Questions clicked', 'value' => 25];
                } elseif (str_contains($desc, 'Learn More')) {
                    $score += 15;
                    $breakdown[] = ['label' => 'CTA: Learn More clicked', 'value' => 15];
                } else {
                    $score += 5;
                    $breakdown[] = ['label' => 'CTA clicked', 'value' => 5];
                }
            }
        }

        return [
            'total'     => max(0, $score),
            'breakdown' => $breakdown,
        ];
    }
}
