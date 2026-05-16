<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EngagementNotification extends Model
{
    public $timestamps = false;
    protected $fillable = [
        'distributor_id', 'prospect_id', 'type', 'title', 'body', 'data', 'is_read', 'read_at', 'created_at'
    ];
    
    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?: now();
        });
    }
}
