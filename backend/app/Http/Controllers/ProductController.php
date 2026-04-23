<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

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
                'point'        => 'nullable|integer',
                // File upload approach (supports images and videos)
                'image'        => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,avi,mkv|max:102400',
            ]);

            $validatedData['stock'] = $validatedData['stock'] ?? 0;
            $validatedData['point'] = $validatedData['point'] ?? 0;

            // ── Handle file upload ────────────────────────────────────
            if ($request->hasFile('image')) {
                // Upload to Cloudinary using the correct method
                $uploadedFile = $request->file('image');
                $result = Cloudinary::upload($uploadedFile->getRealPath(), [
                    'folder' => 'products',
                    'resource_type' => 'auto', // Auto-detect image or video
                ]);
                $validatedData['image'] = $result->getSecurePath();
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
                'point'        => 'nullable|integer',
                // File upload approach (supports images and videos)
                'image'        => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,avi,mkv|max:102400',
            ]);

            if (isset($validatedData['stock']) && $validatedData['stock'] === null) {
                $validatedData['stock'] = 0;
            }
            if (isset($validatedData['point']) && $validatedData['point'] === null) {
                $validatedData['point'] = 0;
            }

            // ── Handle file upload ────────────────────────────────────
            if ($request->hasFile('image')) {
                // Upload to Cloudinary using the correct method
                $uploadedFile = $request->file('image');
                $result = Cloudinary::upload($uploadedFile->getRealPath(), [
                    'folder' => 'products',
                    'resource_type' => 'auto', // Auto-detect image or video
                ]);
                $validatedData['image'] = $result->getSecurePath();
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
            // Cloudinary manages the files, no need to delete from local storage.
            // If you wish to delete from Cloudinary, you would use cloudinary()->destroy(public_id)
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
