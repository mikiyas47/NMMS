<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ProspectPriority extends Model {
    protected $table = 'prospect_priority';
    public $timestamps = false;
    protected $fillable = ['prospect_id','distributor_id','priority_score','recommendation','computed_at'];
    protected $casts = ['computed_at'=>'datetime'];
}