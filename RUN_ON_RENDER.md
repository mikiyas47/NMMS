# How to Create Admin User on Render (Production)

## Option 1: Run Seeder via Render Shell (Recommended)

1. Go to your Render dashboard: https://dashboard.render.com/
2. Click on your **backend service**
3. Click on the **"Shell"** tab at the top
4. In the shell, run this command:
   ```bash
   php artisan db:seed --class=AdminUserSeeder
   ```
5. You should see: `✅ Admin user created: admin@nmms.com / Admin@123`

## Option 2: Add to Build Command (Automatic)

1. Go to your Render dashboard
2. Click on your **backend service**
3. Go to **Settings**
4. Find **Build Command** section
5. Update the build command to include the seeder:
   ```bash
   composer install && php artisan migrate --force && php artisan db:seed --class=AdminUserSeeder --force
   ```
6. Click **Save Changes**
7. Render will redeploy and run the seeder automatically

## After Running the Seeder

You can log in with these credentials:

### **Email:** admin@nmms.com
### **Password:** Admin@123

---

## Alternative: Use Existing Admin Account

I've also reset the password for an existing admin account in your local database:

### **Email:** mikiadmin@gmail.com
### **Password:** Admin@123

**However**, this only works locally. To use this on production, you need to:

1. Go to Render Shell
2. Run:
   ```bash
   php artisan tinker
   ```
3. Then paste:
   ```php
   $user = App\Models\User::where('email', 'mikiadmin@gmail.com')->first();
   $user->password = Hash::make('Admin@123');
   $user->save();
   echo "Password reset!";
   exit
   ```

---

## Quick Test

After running the seeder, test the login:
1. Go to your admin website
2. Use: `admin@nmms.com` / `Admin@123`
3. You should see the Overview page with all statistics

---

## Troubleshooting

If you still get "Invalid login details":
1. Make sure you're on the correct website (frontend URL, not backend)
2. Check that the seeder ran successfully on Render
3. Verify the email is exactly: `admin@nmms.com` (no spaces)
4. Password is case-sensitive: `Admin@123`
