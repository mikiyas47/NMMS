<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductUpdateSeeder extends Seeder
{
    /**
     * Seed / restore the canonical product catalogue.
     * Images/videos point to the original Cloudinary assets.
     * Uses upsert by ID so re-running never creates duplicates.
     * Does NOT overwrite image if one is already set (owner may have updated it).
     */
    public function run(): void
    {
        $products = [
            [
                'id'            => 1,
                'name'          => 'Powerful process',
                'category'      => 'Yellow',
                'price'         => 7690,
                'point'         => 100,
                'referral_rate' => 16,
                'image'         => 'https://res.cloudinary.com/docvdlgiv/image/upload/v1777629973/products/eqrczwq2dnnqugmpzwgu.jpg',
            ],
            [
                'id'            => 2,
                'name'          => 'Habit building',
                'category'      => 'Orange',
                'price'         => 14115,
                'point'         => 200,
                'referral_rate' => 17,
                'image'         => 'https://res.cloudinary.com/docvdlgiv/video/upload/v1777630266/products/msdk1xo9nrxszjdhaopj.mp4',
            ],
            [
                'id'            => 3,
                'name'          => 'Habit building',
                'category'      => 'Orange',
                'price'         => 14115,
                'point'         => 200,
                'referral_rate' => 17,
                'image'         => 'https://res.cloudinary.com/docvdlgiv/image/upload/v1777628059/products/umordldvmu9qucua6zgl.jpg',
            ],
            [
                'id'            => 4,
                'name'          => 'Team and leadership',
                'category'      => 'Golden',
                'price'         => 52665,
                'point'         => 800,
                'referral_rate' => 19,
                'image'         => 'https://res.cloudinary.com/docvdlgiv/video/upload/v1777629868/products/jmicmkwhn0rb3nf3kdex.mp4',
            ],
            [
                'id'            => 5,
                'name'          => 'Mind programming',
                'category'      => 'Green',
                'price'         => 26965,
                'point'         => 400,
                'referral_rate' => 18,
                'image'         => 'https://res.cloudinary.com/docvdlgiv/video/upload/v1777629917/products/wmc0mc6fszehiuhc2s2t.mp4',
            ],
        ];

        foreach ($products as $data) {
            $id    = $data['id'];
            $image = $data['image'];
            unset($data['id']);

            $existing = DB::table('products')->where('id', $id)->first();

            if ($existing) {
                // Never blank out an image the owner has manually set;
                // only restore the original if still null or a placeholder SVG
                $keepImage = $existing->image &&
                    !str_contains($existing->image, 'placeholder');

                if ($keepImage) unset($data['image']);

                DB::table('products')->where('id', $id)->update(
                    array_merge($data, ['updated_at' => now()])
                );
            } else {
                DB::table('products')->insert(
                    array_merge(['id' => $id], $data, [
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])
                );
            }
        }
    }
}
