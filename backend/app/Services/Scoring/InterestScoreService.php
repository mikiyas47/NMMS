<?php
namespace App\Services\Scoring;

use App\Models\Prospect;

class InterestScoreService
{
    protected $invitationScoreService;
    protected $presentationScoreService;

    public function __construct(
        InvitationScoreService $invitationScoreService,
        PresentationScoreService $presentationScoreService
    ) {
        $this->invitationScoreService = $invitationScoreService;
        $this->presentationScoreService = $presentationScoreService;
    }

    public function calculate(Prospect $prospect): array
    {
        $invResult = $this->invitationScoreService->calculate($prospect);
        $presResult = $this->presentationScoreService->calculate($prospect);

        $invScore = $invResult['total'];
        $presScore = $presResult['total'];

        $finalScore = ($invScore * 0.4) + ($presScore * 0.6);
        $finalScore = max(0, min(100, round($finalScore)));

        // Classification
        if ($finalScore >= 81) {
            $classification = 'Hot / Closing Ready';
            $level = 'hot';
        } elseif ($finalScore >= 61) {
            $classification = 'High Intent';
            $level = 'hot';
        } elseif ($finalScore >= 41) {
            $classification = 'Interested';
            $level = 'warm';
        } elseif ($finalScore >= 21) {
            $classification = 'Warm';
            $level = 'warm';
        } else {
            $classification = 'Cold';
            $level = 'cold';
        }

        return [
            'final_score' => $finalScore,
            'classification' => $classification,
            'level' => $level,
            'invitation' => [
                'score' => $invScore,
                'breakdown' => $invResult['breakdown']
            ],
            'presentation' => [
                'score' => $presScore,
                'breakdown' => $presResult['breakdown']
            ]
        ];
    }
}
