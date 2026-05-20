<?php

namespace App\Services;

class PresentationIntelligenceService
{
    public function classifyIntent(int $score): string
    {
        if ($score <= 20) return 'Cold';
        if ($score <= 40) return 'Warm';
        if ($score <= 60) return 'Interested';
        if ($score <= 80) return 'High Intent';
        return 'Hot Lead';
    }

    public function classifyEngagement(int $watchPct): string
    {
        if ($watchPct <= 25) return 'Low Intent';
        if ($watchPct <= 50) return 'Curious';
        if ($watchPct <= 75) return 'Interested';
        if ($watchPct <= 90) return 'High Interest';
        return 'Hot Lead';
    }

    public function analyzeExit(int $watchPct): array
    {
        if ($watchPct < 30) {
            return ['intent' => 'Low intent', 'recommendation' => 'Re-engagement needed'];
        } elseif ($watchPct <= 70) {
            return ['intent' => 'Moderate interest', 'recommendation' => 'Follow-up required'];
        } else {
            return ['intent' => 'High intent', 'recommendation' => 'Immediate closing follow-up recommended'];
        }
    }

    public function processCta(string $ctaType): array
    {
        $boost = 0;
        $pipelineShift = null;
        switch ($ctaType) {
            case 'Watch More':
            case 'Continue':
                $boost = 5;
                break;
            case 'Learn More About Opportunity':
            case 'Learn More':
                $boost = 15;
                $pipelineShift = 'Interested';
                break;
            case 'Ask Questions':
                $boost = 25;
                $pipelineShift = 'High Intent';
                break;
            case 'Talk to Distributor':
                $boost = 40;
                $pipelineShift = 'Closing Stage Entry';
                break;
            case 'Become Distributor':
                $boost = 60;
                $pipelineShift = 'Immediate Conversion Flow';
                break;
            default:
                $boost = 10;
                break;
        }

        return [
            'boost' => $boost,
            'shift' => $pipelineShift
        ];
    }
}
