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

        User::firstOrCreate(
            ['email' => 'mikishemels@gmail.com'],
            [
                'name'     => 'Mikiyas',
                'phone'    => '0947482468',
                'password' => \Hash::make('Mikiyas7'),
                'role'     => 'admin',
                'status'   => 'active',
            ]
        );

        \App\Models\Distributor::firstOrCreate(
            ['email' => 'ab@gmail.com'],
            [
                'name'     => 'Abebe Distributor',
                'phone'    => '0912345678',
                'password' => \Hash::make('Abebe'),
                'rank'     => 'CT',
                'is_paid'  => true,
        );

        $this->call(ProductUpdateSeeder::class);
    }
}
