<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prospect extends Model
{
    protected $primaryKey = 'prospect_id';

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'source',
        'status',
        'relationship',
    ];

    public function followups()
    {
        return $this->hasMany(Followup::class, 'prospect_id', 'prospect_id');
    }

    public function closingAttempts()
    {
        return $this->hasMany(ClosingAttempt::class, 'prospect_id', 'prospect_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'userid');
    }
}
