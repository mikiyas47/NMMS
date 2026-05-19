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
                $score += 25;
                $breakdown[] = ['label' => 'Invitation Accepted', 'value' => 25];
            } elseif ($status === 'declined') {
                $score -= 15;
                $breakdown[] = ['label' => 'Invitation Declined', 'value' => -15];
            } elseif ($status === 'opened') {
                $score += 8;
                $breakdown[] = ['label' => 'Invitation Opened', 'value' => 8];
            }
            // 'sent' / 'ignored' = no bonus

            // Outcome-based scoring (from notes/outcome field)
            $fullText = strtolower(
                ($inv->outcome ?? '') . ' ' .
                ($inv->notes ?? '') . ' ' .
                ($inv->script_used ?? '')
            );

            if (str_contains($fullText, 'success') || str_contains($fullText, 'positive')) {
                $score += 15;
                $breakdown[] = ['label' => 'Positive Outcome', 'value' => 15];
            } elseif (str_contains($fullText, 'call later') || str_contains($fullText, 'follow up')) {
                $score += 8;
                $breakdown[] = ['label' => 'Call Later / Follow Up', 'value' => 8];
            } elseif (str_contains($fullText, 'not interested') || str_contains($fullText, 'negative')) {
                $score -= 20;
                $breakdown[] = ['label' => 'Not Interested', 'value' => -20];
            } elseif (str_contains($fullText, 'wrong number')) {
                $score -= 10;
                $breakdown[] = ['label' => 'Wrong Number', 'value' => -10];
            } elseif (str_contains($fullText, 'no answer') || str_contains($fullText, 'no reply')) {
                $breakdown[] = ['label' => 'No Answer', 'value' => 0];
            }

            // Modifiers
            if (str_contains($fullText, 'question') || str_contains($fullText, 'asked')) {
                $score += 10;
                $breakdown[] = ['label' => 'Asked Questions', 'value' => 10];
            }
            if (str_contains($fullText, 'positive tone')) {
                $score += 5;
                $breakdown[] = ['label' => 'Positive Tone', 'value' => 5];
            }
            if (str_contains($fullText, 'fast response') || str_contains($fullText, '<5 min')) {
                $score += 8;
                $breakdown[] = ['label' => 'Fast Response', 'value' => 8];
            }

            // Quick response bonus: responded within 2 hours of being sent
            if ($inv->responded_at && $inv->created_at) {
                $responseHours = $inv->created_at->diffInHours($inv->responded_at);
                if ($responseHours <= 2) {
                    $score += 8;
                    $breakdown[] = ['label' => 'Quick Response (<2h)', 'value' => 8];
                }
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
