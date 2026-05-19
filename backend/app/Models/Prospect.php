<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prospect extends Model
{
    protected $primaryKey = 'prospect_id';

    protected $fillable = [
        'distributor_id',
        'name',
        'phone',
        'email',
        'source',
        'status',
        'relationship',
        // Pipeline fields
        'stage',
        'interest_level',
        'interest_score',
        'next_action',
        'next_action_date',
        // Profile fields
        'occupation',
        'location',
        'age_range',
        'telegram',
        'whatsapp',
        'tags',
        'notes',
        'priority',
        'stage_updated_at',
        'joined_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'interest_score' => 'integer',
        'next_action_date' => 'date',
        'stage_updated_at' => 'datetime',
        'joined_at' => 'datetime',
    ];

    protected $appends = [];

    // Pipeline stages in order
    public const STAGES = [
        'New Lead',
        'Contacted',
        'Invited',
        'Awaiting Response',
        'Presentation Scheduled',
        'Presentation Completed',
        'Follow-Up Needed',
        'Closing',
        'Joined',
        'Rejected',
        'Inactive',
    ];

    public const INTEREST_LEVELS = ['cold', 'warm', 'hot'];
    public const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    public function followups()
    {
        return $this->hasMany(Followup::class, 'prospect_id', 'prospect_id');
    }

    public function closingAttempts()
    {
        return $this->hasMany(ClosingAttempt::class, 'prospect_id', 'prospect_id');
    }

    public function activities()
    {
        return $this->hasMany(ProspectActivity::class, 'prospect_id', 'prospect_id')
            ->orderBy('created_at', 'desc');
    }

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }

    public function getScoreBreakdownAttribute(): array
    {
        return app(\App\Services\Scoring\InterestScoreService::class)->calculate($this);
    }

    /**
     * Updates interest level based on the dynamically set score.
     * Score calculation is now strictly handled by deterministic events
     * and the AI Intelligence Layer.
     */
    public function recalculateScore(): void
    {
        $breakdown = $this->score_breakdown;
        $this->interest_score = $breakdown['final_score'];
        $this->interest_level = $breakdown['level'];

        $this->saveQuietly();
    }
}
