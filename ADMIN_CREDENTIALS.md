# Admin Website Access

## 🔑 Admin Credentials (Ready to Use)

### **Primary Admin Account:**
- **Email:** admin@nmms.com
- **Password:** Admin@123
- **Role:** Admin

**Use this account to log in to the admin website!**

---

### Other Existing Accounts:

#### Owner Accounts:
1. **Email:** miki@gmail.com  
   **Role:** Owner

2. **Email:** owner@example.com  
   **Role:** Owner

3. **Email:** mikila@gmail.com  
   **Role:** Owner

#### Admin Accounts:
1. **Email:** mikishemels@gmail.com  
   **Role:** Admin

2. **Email:** mikiadmin@gmail.com  
   **Role:** Admin

**Note:** The passwords for these accounts were set previously. Use the primary admin account above if you don't remember them.

---

## Admin Dashboard Features

The admin website now displays:

### 1. **App Users Statistics**
- **Total App Users:** Total number of distributors registered in the app
- **Active Users:** Distributors who logged in within the last 30 days
- **Paid Distributors:** Number of distributors who have paid
- **Conversion Rate:** Percentage of paid vs total distributors

### 2. **Transaction Data**
- **Total Revenue:** Sum of all successful transactions (in ETB)
- **Total Transactions:** Count of successful transactions
- **Pending Transactions:** Transactions awaiting payment
- **Failed Transactions:** Failed payment attempts

### 3. **Recent Transactions**
- Last 10 successful transactions
- Shows: Customer name, Product name, Distributor name, Amount, Date

### 4. **Product Sales Breakdown**
- Sales count per product
- Total revenue per product
- Helps identify best-selling products

### 5. **Monthly Revenue Trend**
- Revenue data for the last 6 months
- Helps track business growth

---

## How to Access

1. Go to your admin website URL (frontend deployment)
2. Click "Login"
3. Enter one of the admin/owner email addresses above
4. Enter the password
5. You'll be redirected to the Overview page with all statistics

---

## API Endpoint

The admin stats are fetched from:
```
GET /api/admin/stats
```

Response format:
```json
{
  "distributors": {
    "total": 150,
    "active": 120,
    "paid": 80
  },
  "transactions": {
    "total": 250,
    "total_revenue": 125000,
    "pending": 10,
    "failed": 5
  },
  "recent_transactions": [...],
  "product_sales": [...],
  "monthly_revenue": [...]
}
```

---

## Deployment Status

✅ Backend changes pushed to GitHub
✅ Render will auto-deploy within 2-5 minutes
✅ Frontend changes pushed to GitHub
✅ Frontend will auto-deploy within 2-5 minutes

Once deployed, log in to the admin website to see the new statistics!
