<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Product;

class ProductUpdateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'category' => 'yellow',
                'name' => 'Yellow Product',
                'price' => 110,
                'point' => 100,
                'referral_rate' => 16,
                'cycle_rate' => 11,
                'weekly_cap' => 1000,
            ],
            [
                'category' => 'orange',
                'name' => 'Orange Product',
                'price' => 210,
                'point' => 200,
                'referral_rate' => 17,
                'cycle_rate' => 12,
                'weekly_cap' => 2000,
            ],
            [
                'category' => 'green',
                'name' => 'Green Product',
                'price' => 410,
                'point' => 400,
                'referral_rate' => 18,
                'cycle_rate' => 14,
                'weekly_cap' => 4000,
            ],
            [
                'category' => 'golden',
                'name' => 'Golden Product',
                'price' => 810,
                'point' => 800,
                'referral_rate' => 19,
                'cycle_rate' => 15,
                'weekly_cap' => 5000,
            ],
        ];

        foreach ($products as $data) {
            Product::updateOrCreate(
                ['category' => $data['category']],
                [
                    'name' => $data['name'],
                    'price' => $data['price'],
                    'point' => $data['point'],
                    'referral_rate' => $data['referral_rate'],
                    'cycle_rate' => $data['cycle_rate'],
                    'weekly_cap' => $data['weekly_cap'],
                ]
            );
        }
    }
}
