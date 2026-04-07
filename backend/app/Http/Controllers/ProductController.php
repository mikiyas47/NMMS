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
                // base64 approach (from mobile)
                'image_base64' => 'nullable|string',
                'image_mime'   => 'nullable|string',
                // legacy file upload approach (kept for future web admin)
                'image'        => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            $validatedData['stock'] = $validatedData['stock'] ?? 0;

            // ── Handle base64 image (sent by mobile app) ──────────────────────
            if ($request->filled('image_base64')) {
                $base64   = $request->input('image_base64');
                $mime     = $request->input('image_mime', 'image/jpeg');
                $ext      = explode('/', $mime)[1] ?? 'jpg';
                $ext      = ($ext === 'jpeg') ? 'jpg' : $ext;
                $filename = 'products/' . uniqid('img_', true) . '.' . $ext;

                $decoded = base64_decode($base64, true);
                if ($decoded === false) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Invalid image data',
                    ], 422);
                }

                Storage::disk('public')->put($filename, $decoded);
                $validatedData['image'] = url('storage/' . $filename);
            }
            // ── Handle classic file upload ────────────────────────────────────
            elseif ($request->hasFile('image')) {
                $path = $request->file('image')->store('products', 'public');
                $validatedData['image'] = url('storage/' . $path);
            }

            // Remove helper fields before insert
            unset($validatedData['image_base64'], $validatedData['image_mime']);

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
                // base64 approach
                'image_base64' => 'nullable|string',
                'image_mime'   => 'nullable|string',
                // legacy
                'image'        => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            if (isset($validatedData['stock']) && $validatedData['stock'] === null) {
                $validatedData['stock'] = 0;
            }

            // ── Handle base64 image ───────────────────────────────────────
            if ($request->filled('image_base64')) {
                $base64   = $request->input('image_base64');
                $mime     = $request->input('image_mime', 'image/jpeg');
                $ext      = explode('/', $mime)[1] ?? 'jpg';
                $ext      = ($ext === 'jpeg') ? 'jpg' : $ext;
                $filename = 'products/' . uniqid('img_', true) . '.' . $ext;

                $decoded = base64_decode($base64, true);
                if ($decoded !== false) {
                    Storage::disk('public')->put($filename, $decoded);
                    $validatedData['image'] = url('storage/' . $filename);
                }
            }
            // ── Handle classic file upload ────────────────────────────────
            elseif ($request->hasFile('image')) {
                $path = $request->file('image')->store('products', 'public');
                $validatedData['image'] = url('storage/' . $path);
            }

            unset($validatedData['image_base64'], $validatedData['image_mime']);

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
}
