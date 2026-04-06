<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AddProspectUser extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if user already exists
        $existingUser = DB::table('users')->where('email', 'miki@gmail.com')->first();
        
        if (!$existingUser) {
            DB::table('users')->insert([
                'name' => 'Miki Prospect',
                'email' => 'miki@gmail.com',
                'phone' => '0912345678',
                'password' => Hash::make('mikiyas'),
                'role' => 'user',
                'status' => 'active',
                'isPaid' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            echo "✅ Prospect user created successfully!\n";
            echo "Email: miki@gmail.com\n";
            echo "Password: mikiyas\n";
        } else {
            echo "⚠️ User already exists in database.\n";
        }
    }
}
