<?php
namespace App\Services\Scoring;

use App\Models\Prospect;
use App\Models\Invitation;

class InvitationScoreService
{
    public function calculate(Prospect $prospect): array
    {
        $score = 0;
        $breakdown = [];

        // Read directly from the invitations table — the correct source of truth.
        // (prospect_activities has no 'notes' or 'outcome' columns)
        $invitations = Invitation::where('prospect_id', $prospect->prospect_id)->get();

        if ($invitations->isEmpty()) {
            return ['total' => 0, 'breakdown' => []];
        }

        $hasInvitation = false;

        foreach ($invitations as $inv) {
            $hasInvitation = true;

            // +5 per invitation sent
            $score += 5;
            $breakdown[] = ['label' => 'Invitation Sent', 'value' => 5];

            // Method bonus
            $method = strtolower($inv->invitation_method ?? $inv->invitation_type ?? '');
            if (str_contains($method, 'call') || str_contains($method, 'zoom') || str_contains($method, 'one_on_one')) {
                $score += 5;
                $breakdown[] = ['label' => 'Call/Live Method', 'value' => 5];
            } else {
                $score += 3;
                $breakdown[] = ['label' => 'Text/Digital Method', 'value' => 3];
            }

            // Status-based scoring
            $status = strtolower($inv->status ?? '');
            if ($status === 'accepted') {
                $score += 20;
                $breakdown[] = ['label' => 'Prospect showed interest', 'value' => 20];
            } elseif ($status === 'declined') {
                $score -= 25;
                $breakdown[] = ['label' => 'Prospect not interested', 'value' => -25];
            } elseif ($status === 'opened') {
                $score += 5;
                $breakdown[] = ['label' => 'Invitation opened', 'value' => 5];
            }

            // Outcome-based scoring (from the response workflow)
            $outcome = strtolower($inv->outcome ?? '');
            if ($outcome === 'interested') {
                $score += 20;
                $breakdown[] = ['label' => 'Prospect showed interest', 'value' => 20];
            } elseif ($outcome === 'asked_questions') {
                $score += 25;
                $breakdown[] = ['label' => 'Prospect asked questions (strong engagement)', 'value' => 25];
            } elseif ($outcome === 'maybe_another_time') {
                $score += 5;
                $breakdown[] = ['label' => 'Prospect open but not ready yet', 'value' => 5];
            } elseif ($outcome === 'not_interested') {
                $score -= 25;
                $breakdown[] = ['label' => 'Prospect not interested', 'value' => -25];
            }

            // Fast response bonus (responded within 30 minutes)
            if ($inv->response_minutes !== null && $inv->response_minutes <= 30 && $inv->outcome !== 'no_response') {
                $score += 15;
                $breakdown[] = ['label' => "Fast response ({$inv->response_minutes} min)", 'value' => 15];
            }
        }

        // Inactivity decay — based on most recent invitation
        if ($hasInvitation) {
            $latestInv = $invitations->sortByDesc('created_at')->first();
            if ($latestInv) {
                $hours = $latestInv->created_at->diffInHours(now());
                if ($hours >= 72) {
                    $score -= 10;
                    $breakdown[] = ['label' => '72h Inactivity Decay', 'value' => -10];
                } elseif ($hours >= 48) {
                    $score -= 5;
                    $breakdown[] = ['label' => '48h Inactivity Decay', 'value' => -5];
                } elseif ($hours >= 24) {
                    $score -= 3;
                    $breakdown[] = ['label' => '24h Inactivity Decay', 'value' => -3];
                }
            }
        }

        return [
            'total' => max(0, $score),
            'breakdown' => $breakdown,
        ];
    }
}
