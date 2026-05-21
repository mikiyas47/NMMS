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

        $this->call(PlaybookSeeder::class);

        // Create admin user for production access
        $this->call(AdminUserSeeder::class);

        // Ensure owner account exists with correct password
        User::updateOrCreate(
            ['email' => 'miki@gmail.com'],
            [
                'name'     => 'Miki Owner',
                'phone'    => '0000000000',
                'password' => \Hash::make('miki#123'),
                'role'     => 'owner',
                'status'   => 'active',
            ]
        );

        try {
            User::updateOrCreate(
                ['email' => 'mikiadmin@gmail.com'],
                [
                    'name'     => 'Mikiyas',
                    'phone'    => '0947482468_admin',
                    'password' => \Hash::make('Mikiyas7'),
                    'role'     => 'admin',
                    'status'   => 'active',
                ]
            );
        } catch (\Exception $e) {
            // Ignore unique constraint violation to prevent deployment crash
        }

        // Additional owner account
        User::updateOrCreate(
            ['email' => 'mikila@gmail.com'],
            [
                'name'     => 'Owner',
                'password' => \Hash::make('mikiyas'),
                'role'     => 'owner',
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
            ]
        );

        $this->call(ProductUpdateSeeder::class);
    }
}
