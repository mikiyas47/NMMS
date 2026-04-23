# Cloudinary Configuration Guide

## ❌ Current Issue
The Cloudinary upload was failing because:
1. Wrong method was being used (`storeOnCloudinary()` doesn't exist)
2. Cloudinary credentials need to be configured

## ✅ What Was Fixed
Changed the upload method from:
```php
$result = $request->file('image')->storeOnCloudinary(); // ❌ WRONG
```

To:
```php
$result = Cloudinary::upload($uploadedFile->getRealPath(), [
    'folder' => 'products',
    'resource_type' => 'auto',
]); // ✅ CORRECT
```

## 🔧 Configuration Steps

### Step 1: Get Your Cloudinary Credentials

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Log in or create a free account
3. On the dashboard, you'll see:
   - **Cloud Name** (e.g., `docvdlgiv`)
   - **API Key** (a number like `123456789012345`)
   - **API Secret** (a long string like `abcdef1234567890`)

### Step 2: Update .env File

Open `backend/.env` and find this line:
```env
CLOUDINARY_URL=cloudinary://<your_api_key>:<your_api_secret>@docvdlgiv
```

Replace it with your actual credentials:
```env
CLOUDINARY_URL=cloudinary://123456789012345:abcdef1234567890@docvdlgiv
```

**Example** (using fake credentials):
```env
CLOUDINARY_URL=cloudinary://987654321098765:xyz789abc456def123ghi@mycloudname
```

### Step 3: Clear Laravel Config Cache

After updating .env, run these commands in the backend directory:

```bash
cd backend
php artisan config:clear
php artisan cache:clear
```

### Step 4: Test Upload

1. Restart your Laravel server if it's running
2. Go to the web frontend
3. Try adding a product with an image or video
4. It should now upload to Cloudinary successfully!

## 📋 Complete .env Example

Your .env should have these Cloudinary settings:

```env
# Cloudinary Configuration
CLOUDINARY_URL=cloudinary://YOUR_API_KEY:YOUR_API_SECRET@YOUR_CLOUD_NAME
```

Replace:
- `YOUR_API_KEY` with your actual API Key (numbers)
- `YOUR_API_SECRET` with your actual API Secret (letters and numbers)
- `YOUR_CLOUD_NAME` with your Cloud Name (e.g., `docvdlgiv`)

## 🔍 How to Verify It Works

After configuring and testing:

1. **Check the Response**: You should see "Product created successfully"
2. **Check Database**: The `image` column should have a URL like:
   ```
   https://res.cloudinary.com/docvdlgiv/image/upload/v1234567890/products/filename.jpg
   ```
   or for videos:
   ```
   https://res.cloudinary.com/docvdlgiv/video/upload/v1234567890/products/filename.mp4
   ```

3. **Check Cloudinary Dashboard**: 
   - Go to Media Library
   - You should see a `products` folder
   - Your uploaded images/videos should be there

## ❗ Troubleshooting

### Error: "Must supply cloud_name"
- Your CLOUDINARY_URL is not properly formatted
- Make sure there are no spaces in the URL
- Verify all three parts: API_KEY, API_SECRET, and CLOUD_NAME

### Error: "Invalid API Key"
- Double-check your API Key and API Secret from Cloudinary dashboard
- Make sure you copied them correctly (no extra spaces)

### Error: "Upload preset not found"
- The package should auto-create upload presets
- If needed, go to Cloudinary Settings → Upload → Add upload preset
- Name it `default` and set signing method to `Signed`

### Upload hangs or times out
- Check your internet connection
- Verify the file size isn't too large (max 100MB set in validation)
- Check Cloudinary dashboard for any account limits

## 📝 Notes

- **Cloudinary Free Tier**: Includes 25 GB storage, 25 GB bandwidth/month
- **Supported Formats**: JPG, PNG, GIF, WebP, MP4, MOV, AVI, MKV
- **Auto-detection**: The `resource_type => 'auto'` setting automatically detects if it's an image or video
- **Folder Organization**: All uploads go to the `products` folder in Cloudinary

## 🎯 What Changed in the Code

### File: `backend/app/Http/Controllers/ProductController.php`

**Added import:**
```php
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;
```

**Changed upload method (2 places - store and update):**
```php
// OLD (WRONG):
$result = $request->file('image')->storeOnCloudinary();

// NEW (CORRECT):
$uploadedFile = $request->file('image');
$result = Cloudinary::upload($uploadedFile->getRealPath(), [
    'folder' => 'products',
    'resource_type' => 'auto',
]);
```

This uses the official Cloudinary PHP SDK method which is properly supported.
