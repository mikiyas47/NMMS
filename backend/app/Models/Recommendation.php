<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Recommendation extends Model {
    protected $fillable = ['distributor_id','prospect_id','type','signal','suggestion','read_at'];
    protected $casts = ['read_at'=>'datetime'];
    public function prospect() { return $this->belongsTo(Prospect::class,'prospect_id','prospect_id'); }
}