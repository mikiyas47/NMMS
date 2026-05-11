<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class WeeklyGoal extends Model {
    protected $fillable = ['distributor_id','week_start','prospects_target','invitations_target','presentations_target','prospects_actual','invitations_actual','presentations_actual','goal_achieved'];
    protected $casts = ['week_start'=>'date','goal_achieved'=>'boolean'];
}