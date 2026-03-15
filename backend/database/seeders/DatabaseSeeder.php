<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::create([
            'name' => 'Mikiyas',
            'email' => 'mikishemels@gmail.com',
            'phone' => '0947482468',
            'password' => \Hash::make('Mikiyas7'),
            'role' => 'admin',
            'status' => 'active',
            'isPaid' => true,
        ]);
    }
}
