<?php

namespace App\Services;

class PresentationNextBestActionService
{
    public function generate(int $score, int $watchPct, ?string $ctaType, bool $isExit): array
    {
        $action = 'Keep nurturing';
        $urgency = 'Low';
        $ctaRecommendation = 'Send more content';
        $timing = '2 days';

        if ($ctaType === 'Become Distributor' || $ctaType === 'Talk to Distributor') {
            $action = 'Immediate follow-up required. Push closing flow.';
            $urgency = 'Critical';
            $ctaRecommendation = 'Send Registration Link';
            $timing = 'Immediate';
        } elseif ($isExit) {
            if ($watchPct < 30) {
                $action = 'Send re-engagement content';
                $urgency = 'Low';
                $ctaRecommendation = 'Offer a different video/script';
                $timing = '48 hours';
            } elseif ($watchPct <= 70) {
                $action = 'Follow-up on specific objections';
                $urgency = 'Medium';
                $ctaRecommendation = 'Ask what they liked so far';
                $timing = '24 hours';
            } else {
                $action = 'Send closing message or call now';
                $urgency = 'High';
                $ctaRecommendation = 'Invite to 3-way call or closing';
                $timing = 'Within 1 hour';
            }
        } elseif ($watchPct >= 100) {
            $action = 'Send closing message or call now';
            $urgency = 'High';
            $ctaRecommendation = 'Discuss starter packages';
            $timing = 'Immediate';
        } elseif ($score > 60) {
            $action = 'Follow-up urgently';
            $urgency = 'High';
            $ctaRecommendation = 'Address questions';
            $timing = 'Today';
        }

        return [
            'recommended_action' => $action,
            'recommended_cta' => $ctaRecommendation,
            'urgency' => $urgency,
            'followup_timing' => $timing,
            'closing_readiness' => $score >= 80 || in_array($ctaType, ['Become Distributor', 'Talk to Distributor'])
        ];
    }
}
