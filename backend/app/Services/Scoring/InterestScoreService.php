<?php
namespace App\Services\Scoring;

use App\Models\Prospect;

/**
 * Computes the combined Interest Score from all engagement sources.
 *
 * Score = InvitationScore + PresentationScore + FollowUpScore
 * Clamped to 0–100.
 *
 * Classifications (per spec):
 *  0–20   → Cold          (weak engagement)
 *  21–40  → Warm          (moderate curiosity)
 *  41–60  → Interested    (active engagement)
 *  61–80  → High Intent   (strong buying interest)
 *  81–100 → Closing Ready (likely to convert)
 */
class InterestScoreService
{
    protected InvitationScoreService    $invitationScoreService;
    protected PresentationScoreService  $presentationScoreService;
    protected FollowUpScoreService      $followUpScoreService;

    public function __construct(
        InvitationScoreService   $invitationScoreService,
        PresentationScoreService $presentationScoreService,
        FollowUpScoreService     $followUpScoreService
    ) {
        $this->invitationScoreService   = $invitationScoreService;
        $this->presentationScoreService = $presentationScoreService;
        $this->followUpScoreService     = $followUpScoreService;
    }

    public function calculate(Prospect $prospect): array
    {
        $invResult  = $this->invitationScoreService->calculate($prospect);
        $presResult = $this->presentationScoreService->calculate($prospect);
        $fuResult   = $this->followUpScoreService->calculate($prospect);

        $invScore  = $invResult['total'];
        $presScore = $presResult['total'];
        $fuScore   = $fuResult['total'];

        // Direct sum — no weighting
        $finalScore = max(0, min(100, $invScore + $presScore + $fuScore));

        [$classification, $level] = $this->classify($finalScore);

        return [
            'final_score'    => $finalScore,
            'classification' => $classification,
            'level'          => $level,
            'invitation'     => ['score' => $invScore,  'breakdown' => $invResult['breakdown']],
            'presentation'   => ['score' => $presScore, 'breakdown' => $presResult['breakdown']],
            'followup'       => ['score' => $fuScore,   'breakdown' => $fuResult['breakdown']],
        ];
    }

    public static function classify(int $score): array
    {
        if ($score >= 81) return ['Closing Ready', 'hot'];
        if ($score >= 61) return ['High Intent',   'hot'];
        if ($score >= 41) return ['Interested',    'warm'];
        if ($score >= 21) return ['Warm',          'warm'];
        return ['Cold', 'cold'];
    }

    /**
     * Derive the automatic pipeline stage from the interest score.
     * Called after every score update to keep stage in sync.
     */
    public static function stageFromScore(int $score, string $currentStage): string
    {
        // Never downgrade from terminal stages
        if (in_array($currentStage, ['Joined', 'Rejected', 'Inactive'])) {
            return $currentStage;
        }
        if ($score >= 81) return 'Closing';
        if ($score >= 61) return 'Follow-Up Needed';
        if ($score >= 41) return 'Presentation Scheduled';
        if ($score >= 21) return 'Invited';
        return $currentStage; // keep current for cold
    }
}
