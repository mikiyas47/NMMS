<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClosingAttempt extends Model
{
    protected $primaryKey = 'closing_id';

    // only created_at column exists
    const UPDATED_AT = null;

    protected $fillable = [
        'prospect_id',
        'user_id',
        'closing_method',
        'outcome',
        'notes',
    ];

    public function prospect()
    {
        return $this->belongsTo(Prospect::class, 'prospect_id', 'prospect_id');
    }
}
