<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Badge extends Model {
    public $timestamps = false;
    protected $fillable = ['distributor_id','badge_type','earned_at'];
    protected $casts = ['earned_at'=>'datetime'];
}