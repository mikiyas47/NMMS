<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AutomationRule extends Model {
    protected $fillable = ['distributor_id','name','trigger_type','trigger_config','condition','action_type','action_config','is_active','is_default'];
    protected $casts = ['trigger_config'=>'array','condition'=>'array','action_config'=>'array','is_active'=>'boolean','is_default'=>'boolean'];
    public function logs() { return $this->hasMany(AutomationLog::class,'rule_id'); }
}