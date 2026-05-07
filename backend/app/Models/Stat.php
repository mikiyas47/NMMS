<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stat extends Model
{
    protected $fillable = [
        'distributor_id',
        'left_points',
        'right_points',
        'total_left_points',
        'total_right_points',
        'carry_left',
        'carry_right',
        'own_points',
        'cycle_carry',
        'rank',
    ];

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }
}
