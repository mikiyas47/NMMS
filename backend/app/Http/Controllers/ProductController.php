<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    public function index()
    {
        try {
            $products = \App\Models\Product::orderBy('created_at', 'desc')->get();
            return response()->json([
                'status' => 'success',
                'data'   => $products,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to fetch products',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'name'         => 'required|string|max:255',
                'price'        => 'required|numeric',
                'category'     => 'required|string',
                'stock'        => 'nullable|integer',
                'description'  => 'nullable|string',
                // File upload approach (supports images and videos)
                'image'        => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,avi,mkv|max:102400',
            ]);

            $validatedData['stock'] = $validatedData['stock'] ?? 0;

            // ── Handle file upload ────────────────────────────────────
            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('products', 'public');
                $validatedData['image'] = secure_url('storage/' . $path);
            }

            $newProduct = \App\Models\Product::create($validatedData);

            return response()->json([
                'status'  => 'success',
                'message' => 'Product created successfully',
                'data'    => $newProduct,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Validation failed',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Product creation error: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to create product: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, \App\Models\Product $product)
    {
        try {
            $validatedData = $request->validate([
                'name'         => 'sometimes|required|string|max:255',
                'price'        => 'sometimes|required|numeric',
                'category'     => 'sometimes|required|string',
                'stock'        => 'nullable|integer',
                'description'  => 'nullable|string',
                // File upload approach (supports images and videos)
                'image'        => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,avi,mkv|max:102400',
            ]);

            if (isset($validatedData['stock']) && $validatedData['stock'] === null) {
                $validatedData['stock'] = 0;
            }

            // ── Handle file upload ────────────────────────────────────
            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('products', 'public');
                $validatedData['image'] = secure_url('storage/' . $path);
            }

            $product->update($validatedData);

            return response()->json([
                'status'  => 'success',
                'message' => 'Product updated successfully',
                'data'    => $product,
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Validation failed',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Product update error: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to update product: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(\App\Models\Product $product)
    {
        try {
            // Delete the associated file from storage if it exists
            if ($product->image) {
                // Extract the path after /storage/
                $relativePath = ltrim(parse_url($product->image, PHP_URL_PATH), '/');
                // Remove the leading 'storage/' to get the disk path
                $diskPath = preg_replace('#^storage/#', '', $relativePath);
                \Illuminate\Support\Facades\Storage::disk('public')->delete($diskPath);
            }

            $product->delete();

            return response()->json([
                'status'  => 'success',
                'message' => 'Product deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Product delete error: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to delete product: ' . $e->getMessage(),
            ], 500);
        }
    }
}
