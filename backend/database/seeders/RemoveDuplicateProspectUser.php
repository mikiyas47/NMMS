<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RemoveDuplicateProspectUser extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Remove the duplicate prospect user from distributors table
        $deleted = DB::table('distributors')->where('email', 'miki@gmail.com')->delete();
        
        if ($deleted) {
            echo "✅ Successfully removed distributor user with email 'miki@gmail.com' from the database.\n";
        } else {
            echo "⚠️ No distributor user found with email 'miki@gmail.com'.\n";
        }
    }
}
