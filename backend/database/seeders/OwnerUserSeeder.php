<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class OwnerUserSeeder extends Seeder
{
    public function run(): void
    {
        $owners = [
            [
                'name'       => 'Owner',
                'email'      => 'mikila@gmail.com',
                'password'   => Hash::make('mikiyas'),
                'role'       => 'owner',
                'status'     => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($owners as $owner) {
            $existing = DB::table('users')->where('email', $owner['email'])->first();
            if ($existing) {
                // Ensure password and role are correct
                DB::table('users')->where('email', $owner['email'])->update([
                    'password'   => $owner['password'],
                    'role'       => 'owner',
                    'status'     => 'active',
                    'updated_at' => now(),
                ]);
                $this->command->info("Updated existing user: {$owner['email']}");
            } else {
                DB::table('users')->insert($owner);
                $this->command->info("Created owner user: {$owner['email']}");
            }
        }
    }
}
