<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GoalActivity extends Model
{
    use HasFactory;

    protected $primaryKey = 'goal_activity_id';

    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = [
        'goal_id',
        'distributor_id',
        'activity_type',
        'value',
        'note',
        'activity_date',
    ];

    protected function casts(): array
    {
        return [
            'value'         => 'decimal:2',
            'activity_date' => 'date',
            'created_at'    => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────

    public function goal()
    {
        return $this->belongsTo(Goal::class, 'goal_id', 'goal_id');
    }

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }
}
