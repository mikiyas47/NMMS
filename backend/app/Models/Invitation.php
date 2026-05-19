<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Invitation extends Model {
    protected $primaryKey = 'invitation_id';
    const UPDATED_AT = null;
    protected $fillable = ['distributor_id','prospect_id','invitation_type','token','status','scheduled_at','opened_at','responded_at','script_used','notes','invitation_method','outcome','material_shared','sent_at','smart_check_at','response_minutes','prospect_value','meeting_details'];
    protected $casts = ['scheduled_at'=>'datetime','opened_at'=>'datetime','responded_at'=>'datetime','sent_at'=>'datetime','smart_check_at'=>'datetime','meeting_details'=>'array'];
    public function prospect() { return $this->belongsTo(Prospect::class,'prospect_id','prospect_id'); }
    public function distributor() { return $this->belongsTo(Distributor::class,'distributor_id','distributor_id'); }
}