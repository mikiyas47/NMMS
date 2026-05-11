<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OnboardingProgress extends Model {
    protected $fillable = ['distributor_id','first_invite_sent','first_presentation_assigned','first_prospect_added','first_recruit_joined','checklist_completed','onboarding_complete','contacts_added_count','first_10_challenge_complete'];
    protected $casts = ['first_invite_sent'=>'boolean','first_presentation_assigned'=>'boolean','first_prospect_added'=>'boolean','first_recruit_joined'=>'boolean','checklist_completed'=>'boolean','onboarding_complete'=>'boolean','first_10_challenge_complete'=>'boolean'];
}