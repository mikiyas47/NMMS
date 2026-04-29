<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'price',
        'category',
        'description',
        'image',
        'point',
        'referral_rate',
        'cycle_rate',
        'weekly_cap',
    ];
}
