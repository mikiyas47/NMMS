<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $fillable = [
        'distributor_id',
        'node_id',
        'product_id',
        'sponsor_id',
    ];

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }

    public function node()
    {
        return $this->belongsTo(Node::class, 'node_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function sponsor()
    {
        return $this->belongsTo(Distributor::class, 'sponsor_id', 'distributor_id');
    }
}
