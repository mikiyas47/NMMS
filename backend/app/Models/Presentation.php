<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Presentation extends Model {
    protected $fillable = [
        'distributor_id','title','content_type','file_url','external_url',
        'thumbnail_url','description','total_pages','duration_seconds',
        'conversion_rate','avg_engagement_score','is_active',
        'is_global','uploaded_by_owner','comp_plan_data','file_size','mime_type',
    ];
    protected $casts = [
        'is_active'=>'boolean',
        'is_global'=>'boolean',
        'uploaded_by_owner'=>'boolean',
        'conversion_rate'=>'decimal:2',
        'avg_engagement_score'=>'decimal:2',
        'comp_plan_data'=>'array',
    ];
    public function assignments() { return $this->hasMany(PresentationAssignment::class); }
    public function distributor() { return $this->belongsTo(Distributor::class,'distributor_id','distributor_id'); }
}