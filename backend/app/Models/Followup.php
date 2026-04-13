<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Followup extends Model
{
    protected $primaryKey = 'followup_id';

    // The followups table only has created_at (no updated_at)
    const UPDATED_AT = null;

    protected $fillable = [
        'prospect_id',
        'user_id',
        'followup_type',
        'method',
        'script_used',
        'outcome',
        'notes',
    ];

    public function prospect()
    {
        return $this->belongsTo(Prospect::class, 'prospect_id', 'prospect_id');
    }
}
