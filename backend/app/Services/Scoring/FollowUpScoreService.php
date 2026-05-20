<?php
namespace App\Services\Scoring;

use App\Models\Prospect;
use App\Models\Followup;

/**
 * Scores based on follow-up outcomes.
 *
 * Positive        = +15
 * Asked Questions = +10
 * Wants Pricing   = +20
 * Wants To Join   = +30
 * Needs More Time = +5
 * No Response     = -5
 * Not Interested  = -20
 */
class FollowUpScoreService
{
    private const OUTCOME_SCORES = [
        'positive'           => ['value' => 15,  'label' => 'Follow-up: Positive response'],
        'asked_questions'    => ['value' => 10,  'label' => 'Follow-up: Prospect asked more questions'],
        'wants_pricing'      => ['value' => 20,  'label' => 'Follow-up: Prospect requested pricing'],
        'wants_to_join'      => ['value' => 30,  'label' => 'Follow-up: Prospect wants to join'],
        'needs_more_time'    => ['value' => 5,   'label' => 'Follow-up: Prospect needs more time'],
        'no_response'        => ['value' => -5,  'label' => 'Follow-up: No response'],
        'not_interested'     => ['value' => -20, 'label' => 'Follow-up: Prospect not interested'],
        // Legacy outcomes from FollowupWizardContent
        'replied with interest'  => ['value' => 15, 'label' => 'Follow-up: Replied with interest'],
        'wants pricing'          => ['value' => 20, 'label' => 'Follow-up: Wants pricing'],
        'wants product details'  => ['value' => 10, 'label' => 'Follow-up: Wants product details'],
        'replied not interested' => ['value' => -20,'label' => 'Follow-up: Not interested'],
        'interested'             => ['value' => 15, 'label' => 'Follow-up: Interested'],
        'not interested'         => ['value' => -20,'label' => 'Follow-up: Not interested'],
    ];

    public function calculate(Prospect $prospect): array
    {
        $score     = 0;
        $breakdown = [];

        $followups = Followup::where('prospect_id', $prospect->prospect_id)->get();

        foreach ($followups as $fu) {
            $outcomeKey = strtolower(trim($fu->outcome ?? ''));
            if (isset(self::OUTCOME_SCORES[$outcomeKey])) {
                $entry = self::OUTCOME_SCORES[$outcomeKey];
                $score += $entry['value'];
                $breakdown[] = ['label' => $entry['label'], 'value' => $entry['value']];
            }
        }

        return [
            'total'     => $score,
            'breakdown' => $breakdown,
        ];
    }
}
