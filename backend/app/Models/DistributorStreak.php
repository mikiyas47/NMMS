<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DistributorStreak extends Model {
    protected $fillable = ['distributor_id','current_streak','longest_streak','last_completed_date'];
    protected $casts = ['last_completed_date'=>'date'];
}