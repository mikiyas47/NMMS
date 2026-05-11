<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Playbook extends Model {
    protected $fillable = ['distributor_id','title','description','steps','category','visibility'];
    protected $casts = ['steps'=>'array'];
}