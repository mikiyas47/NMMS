<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AutomationLog extends Model {
    public $timestamps = false;
    protected $fillable = ['rule_id','prospect_id','distributor_id','trigger_event','action_taken','details','success','error_message','executed_at'];
    protected $casts = ['details'=>'array','success'=>'boolean','executed_at'=>'datetime'];
}