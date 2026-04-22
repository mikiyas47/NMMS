<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Goal extends Model
{
    use HasFactory;

    protected $primaryKey = 'goal_id';

    // Only created_at is managed — no updated_at on this table
    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = [
        'distributor_id',
        'goal_title',
        'goal_description',
        'goal_type',
        'target_value',
        'current_value',
        'start_date',
        'end_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'target_value'  => 'decimal:2',
            'current_value' => 'decimal:2',
            'start_date'    => 'date',
            'end_date'      => 'date',
            'created_at'    => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }

    public function activities()
    {
        return $this->hasMany(GoalActivity::class, 'goal_id', 'goal_id');
    }

    public function milestones()
    {
        return $this->hasMany(GoalMilestone::class, 'goal_id', 'goal_id')
                    ->orderBy('target_value');
    }

    // ─── Computed helpers ─────────────────────────────────────────────

    /**
     * Progress percentage (0–100), capped at 100.
     */
    public function getProgressPercentAttribute(): float
    {
        if ($this->target_value <= 0) return 0;
        return min(round(($this->current_value / $this->target_value) * 100, 1), 100);
    }

    protected $appends = ['progress_percent'];
}
