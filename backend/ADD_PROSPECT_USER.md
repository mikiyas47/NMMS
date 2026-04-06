# Add Prospect User to Production Database

## 🎯 Quick Solution: Register Through the App

The easiest way to add the prospect user to your **deployed backend** is to register through your app:

### Steps:

1. **Open your app** in Expo Go
2. **Go to Registration Screen** (tap "Join the Network")
3. **Enter these details:**
   - Full Name: `Miki Prospect`
   - Email Address: `miki@gmail.com`
   - Phone Number: `0912345678`
   - Create Password: `mikiyas`
4. **Tap "REGISTER NOW"**
5. After successful registration, login with:
   - Email: `miki@gmail.com`
   - Password: `mikiyas`

---

## 🔧 Option 2: Run Seeder on Render.com

If you prefer to add the user via database seeder, you need to:

### Step 1: Push the seeder to your repository
The seeder file `AddProspectUser.php` has been created in:
```
backend/database/seeders/AddProspectUser.php
```

### Step 2: Deploy to Render.com
Push your changes to Git and Render will auto-deploy:
```bash
cd backend
git add .
git commit -m "Add prospect user seeder"
git push
```

### Step 3: Run Seeder on Render
After deployment, access your Render.com server via SSH or use the Render dashboard to run:
```bash
php artisan db:seed --class=AddProspectUser
```

---

## 🌐 Option 3: Use Render.com Database Direct Access

If you have database access through Render.com dashboard:

1. Go to your Render.com dashboard
2. Access your database
3. Run this SQL query:

```sql
INSERT INTO users (name, email, phone, password, role, status, "isPaid", created_at, updated_at)
VALUES (
  'Miki Prospect',
  'miki@gmail.com',
  '0912345678',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'user',
  'active',
  true,
  NOW(),
  NOW()
);
```

**Note:** The password hash above is for `mikiyas`

---

## ✅ Recommended: Use Option 1 (Registration)

This is the safest and easiest method. The registration endpoint is already working on your deployed backend at:
```
POST https://nmms-backend.onrender.com/api/register
```

After registration, you can login with the credentials!

---

## 🔍 Verify User Was Created

After adding the user, you can test the login by making a request to:
```
POST https://nmms-backend.onrender.com/api/login

Body:
{
  "email": "miki@gmail.com",
  "password": "mikiyas"
}
```

Expected response:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "user": {
    "userid": ...,
    "name": "Miki Prospect",
    "email": "miki@gmail.com",
    "role": "user",
    ...
  }
}
```
