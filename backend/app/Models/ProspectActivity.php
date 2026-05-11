<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProspectActivity extends Model
{
    public $timestamps = false;

    protected $table = 'prospect_activities';

    protected $fillable = [
        'prospect_id',
        'distributor_id',
        'activity_type',
        'title',
        'description',
        'meta',
        'created_at',
    ];

    protected $casts = [
        'meta'       => 'array',
        'created_at' => 'datetime',
    ];

    public function prospect()
    {
        return $this->belongsTo(Prospect::class, 'prospect_id', 'prospect_id');
    }
}
