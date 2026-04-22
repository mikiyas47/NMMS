<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GoalMilestone extends Model
{
    use HasFactory;

    protected $primaryKey = 'milestone_id';

    public $timestamps = false;

    protected $fillable = [
        'goal_id',
        'target_value',
        'reached',
        'reached_at',
    ];

    protected function casts(): array
    {
        return [
            'target_value' => 'decimal:2',
            'reached'      => 'boolean',
            'reached_at'   => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────

    public function goal()
    {
        return $this->belongsTo(Goal::class, 'goal_id', 'goal_id');
    }
}
