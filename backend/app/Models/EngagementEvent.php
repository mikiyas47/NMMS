<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class EngagementEvent extends Model {
    public $timestamps = false;
    protected $fillable = ['distributor_id','prospect_id','token','event_type','source_type','source_id','watch_percent','page_reached','visitor_ip','user_agent','meta','created_at'];
    protected $casts = ['meta'=>'array','created_at'=>'datetime'];
}