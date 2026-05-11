<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class PresentationAssignment extends Model {
    protected $fillable = ['presentation_id','prospect_id','distributor_id','token','status','watch_percent','page_reached','time_spent_seconds','engagement_score','opened_at','completed_at'];
    protected $casts = ['opened_at'=>'datetime','completed_at'=>'datetime','engagement_score'=>'decimal:2'];
    public function presentation() { return $this->belongsTo(Presentation::class); }
    public function prospect() { return $this->belongsTo(Prospect::class,'prospect_id','prospect_id'); }
}