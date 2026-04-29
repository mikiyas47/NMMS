<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Node extends Model
{
    protected $fillable = [
        'parent_id',
        'leg',
        'distributor_id',
    ];

    public function parent()
    {
        return $this->belongsTo(Node::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Node::class, 'parent_id');
    }

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }
}
