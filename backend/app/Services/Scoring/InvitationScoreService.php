<?php
namespace App\Services\Scoring;

use App\Models\Prospect;
use App\Models\Invitation;

/**
 * Scores based on invitation engagement (text + call).
 *
 * Text invitation:  +5 sent, +3 text method
 * Call invitation:  +5 sent, +5 call method
 * Outcomes: Interested +20, Asked Questions +25, Maybe +5, Not Interested -25
 * Fast response (<30 min): +15
 * Call outcomes: Successful +25, Call Later +5, No Answer -5, Wrong Number -20
 * Inactivity decay: -5 after prolonged inactivity (72h+)
 */
class InvitationScoreService
{
    public function calculate(Prospect $prospect): array
    {
        $score     = 0;
        $breakdown = [];

        $invitations = Invitation::where('prospect_id', $prospect->prospect_id)->get();

        if ($invitations->isEmpty()) {
            return ['total' => 0, 'breakdown' => []];
        }

        foreach ($invitations as $inv) {
            $method  = strtolower($inv->invitation_method ?? $inv->invitation_type ?? '');
            $outcome = strtolower($inv->outcome ?? '');
            $isCall  = str_contains($method, 'call') || str_contains($method, 'zoom') || str_contains($method, 'one_on_one');

            // Base: invitation sent
            $score += 5;
            $breakdown[] = ['label' => 'Invitation Sent', 'value' => 5];

            // Method bonus
            if ($isCall) {
                $score += 5;
                $breakdown[] = ['label' => 'Call Invitation Started', 'value' => 5];
            } else {
                $score += 3;
                $breakdown[] = ['label' => 'Text Invitation Used', 'value' => 3];
            }

            // ── Text invitation outcomes ──────────────────────────────────
            if (!$isCall) {
                if ($outcome === 'interested') {
                    $score += 20;
                    $breakdown[] = ['label' => 'Prospect showed interest after invitation', 'value' => 20];
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
                // Fast response bonus
                if ($inv->response_minutes !== null && $inv->response_minutes <= 30
                    && !in_array($outcome, ['no_response', '', null])) {
                    $score += 15;
                    $breakdown[] = ['label' => "Fast response ({$inv->response_minutes} min)", 'value' => 15];
                }
            }

            // ── Call invitation outcomes ──────────────────────────────────
            if ($isCall) {
                if (in_array($outcome, ['success', 'invitation_successful'])) {
                    $score += 25;
                    $breakdown[] = ['label' => 'Call invitation successful', 'value' => 25];
                } elseif (in_array($outcome, ['call_later', 'asked_to_call_later'])) {
                    $score += 5;
                    $breakdown[] = ['label' => 'Asked to call later', 'value' => 5];
                } elseif (in_array($outcome, ['no_answer', 'did_not_answer'])) {
                    $score -= 5;
                    $breakdown[] = ['label' => 'Did not answer', 'value' => -5];
                } elseif (in_array($outcome, ['wrong_number'])) {
                    $score -= 20;
                    $breakdown[] = ['label' => 'Wrong number', 'value' => -20];
                }
            }
        }

        // Inactivity decay — only after 72h+ with no response
        $latestInv = $invitations->sortByDesc('created_at')->first();
        if ($latestInv && in_array($latestInv->outcome, ['no_response', null, ''])) {
            $hours = $latestInv->created_at->diffInHours(now());
            if ($hours >= 72) {
                $score -= 5;
                $breakdown[] = ['label' => 'Long inactivity decay (72h+)', 'value' => -5];
            }
        }

        return [
            'total'     => max(0, $score),
            'breakdown' => $breakdown,
        ];
    }
}
