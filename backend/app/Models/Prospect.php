<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prospect extends Model
{
    protected $primaryKey = 'prospect_id';

    protected $fillable = [
        'distributor_id',
        'name', 'phone', 'email',
        'source', 'status', 'relationship',
        // Pipeline fields
        'stage', 'interest_level', 'interest_score',
        'next_action', 'next_action_date',
        // Profile fields
        'occupation', 'location', 'age_range',
        'telegram', 'whatsapp', 'tags', 'notes',
        'priority', 'stage_updated_at', 'joined_at',
    ];

    protected $casts = [
        'tags'              => 'array',
        'interest_score'    => 'integer',
        'next_action_date'  => 'date',
        'stage_updated_at'  => 'datetime',
        'joined_at'         => 'datetime',
    ];

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
    public const PRIORITIES       = ['low', 'normal', 'high', 'urgent'];

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

    /**
     * Recalculate interest score based on activity history.
     * Called whenever a significant event happens.
     */
    public function recalculateScore(): void
    {
        $score = 0;
        $activities = $this->activities()->get();

        foreach ($activities as $act) {
            switch ($act->activity_type) {
                case 'invited':          $score += 5;  break;
                case 'presentation':     $score += 20; break;
                case 'followup':
                    $meta = $act->meta ?? [];
                    if (in_array($meta['outcome'] ?? '', ['Interested', 'Replied with interest', 'Positive'])) $score += 15;
                    if (in_array($meta['outcome'] ?? '', ['Not interested', 'Negative'])) $score -= 10;
                    break;
                case 'closing':
                    $meta = $act->meta ?? [];
                    if (in_array($meta['outcome'] ?? '', ['Positive', 'Closed'])) $score += 25;
                    break;
                case 'stage_change':
                    $meta = $act->meta ?? [];
                    if (($meta['new_stage'] ?? '') === 'Joined') $score = 100;
                    if (($meta['new_stage'] ?? '') === 'Rejected') $score = max(0, $score - 20);
                    break;
                case 'inactive':         $score -= 10; break;
            }
        }

        $score = max(0, min(100, $score));
        $this->interest_score = $score;

        // Auto-set interest level from score
        if ($score >= 70)      $this->interest_level = 'hot';
        elseif ($score >= 35)  $this->interest_level = 'warm';
        else                   $this->interest_level = 'cold';

        $this->saveQuietly();
    }
}
