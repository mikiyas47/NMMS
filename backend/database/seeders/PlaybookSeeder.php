<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\Playbook;

class PlaybookSeeder extends Seeder {
    public function run(): void {
        $playbooks = [
            ['title'=>'The Perfect Invitation','category'=>'invitation','steps'=>['Identify your prospect\'s pain point or goal','Choose the right invitation type (Zoom, webinar, etc.)','Use the script template — personalize with their name','Send the tracked invitation link','Follow up within 24 hours if no response','Log the outcome in the system']],
            ['title'=>'Presentation Mastery','category'=>'presentation','steps'=>['Assign the right presentation type for the prospect\'s stage','Send the tracked link with a personal message','Follow up 24 hours after sending','Ask: What resonated most with you?','Address any questions immediately','Move to closing if interest is high']],
            ['title'=>'The Closing Blueprint','category'=>'closing','steps'=>['Confirm the prospect watched the presentation','Ask: On a scale of 1-10, how interested are you?','Address the top objection directly','Use the assumptive close: When would you like to start?','If hesitant, offer a trial or testimonial','Set a firm follow-up date if not closing today']],
            ['title'=>'Objection Handling Scripts','category'=>'objection_handling','steps'=>['Too expensive: Show the ROI and payment plan options','No time: Ask what they would do with extra income','Pyramid scheme concern: Explain the product-first model','Need to think: Ask what specific concern they have','Spouse objection: Invite both to the next presentation','Not interested: Ask what would make it interesting for them']],
        ];
        foreach ($playbooks as $pb) {
            Playbook::firstOrCreate(['title'=>$pb['title'],'visibility'=>'global'],array_merge($pb,['visibility'=>'global','distributor_id'=>null]));
        }
    }
}