<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stat extends Model
{
    protected $fillable = [
        'distributor_id',
        'left_points',
        'right_points',
        'carry_left',
        'carry_right',
        'rank',
    ];

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }
}
