<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        $products = \App\Models\Product::orderBy('created_at', 'desc')->get();
        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric',
            'category' => 'required|string',
            'stock' => 'nullable|integer',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if (!isset($validatedData['stock'])) {
             $validatedData['stock'] = 0;
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $validatedData['image'] = url('storage/' . $path);
        }

        $newProduct = \App\Models\Product::create($validatedData);

        return response()->json([
            'status' => 'success',
            'message' => 'Product created successfully',
            'data' => $newProduct
        ], 201);
    }
}
