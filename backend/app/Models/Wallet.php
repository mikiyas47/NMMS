<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    protected $fillable = [
        'distributor_id',
        'balance',
        'weekly_earnings',
        'total_earned',
    ];

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }
}
