<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'product_id',
        'distributor_id',
        'prospect_id',
        'leg',
        'customer_name',
        'customer_email',
        'customer_phone',
        'tx_ref',
        'amount',
        'currency',
        'quantity',
        'chapa_reference',
        'payment_url',
        'status',
        'commission_amount',
        'commission_paid',
        'webhook_verified',
        'chapa_payload',
    ];

    protected $casts = [
        'amount'            => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'commission_paid'   => 'boolean',
        'webhook_verified'  => 'boolean',
        'chapa_payload'     => 'array',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function distributor()
    {
        return $this->belongsTo(Distributor::class, 'distributor_id', 'distributor_id');
    }

    public function prospect()
    {
        return $this->belongsTo(Prospect::class, 'prospect_id', 'prospect_id');
    }
}
