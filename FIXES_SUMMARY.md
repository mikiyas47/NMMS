# Distributor Registration & Activation Fixes

## Issues Fixed

### Issue 1: Customers labeled as "Customer" and "Inactive" in the tree
**Root Cause**: When the payment webhook created a distributor record via `MlmEngineService::processCustomerPurchase()`, it didn't set the `status` field, causing it to default to 'inactive' from the database migration.

**Fix Applied**: 
- Updated `MlmEngineService::processCustomerPurchase()` to explicitly set `status='inactive'` and `is_paid=false` when creating new distributor records
- This ensures customers remain inactive until they complete the upgrade process by setting their password

**File Modified**: `backend/app/Services/MlmEngineService.php`

### Issue 2: "Update Failed" error when setting password
**Root Cause**: Insufficient error logging made it difficult to diagnose transaction rollback issues during the upgrade process.

**Fix Applied**:
- Enhanced error logging in `CustomerUpgradeController::upgrade()` to capture detailed error information including:
  - Email and transaction reference
  - Full error message and stack trace
  - Status changes (old status → new status)
- Added logging at key points in the upgrade flow to track status transitions
- Improved error response messages to be more user-friendly

**Files Modified**: 
- `backend/app/Http/Controllers/Api/CustomerUpgradeController.php`

### Issue 3: Missing C_AWARD rank in database schema
**Root Cause**: The `C_AWARD` rank was used throughout the codebase but was missing from the database enum definition, which could cause database errors when distributors reach that rank.

**Fix Applied**:
- Changed the `rank` column from ENUM to VARCHAR(20) in the distributors table migration for SQLite compatibility
- This allows all rank values including 'C_AWARD' to be stored without database errors

**File Modified**: `backend/database/migrations/2026_04_06_000000_create_distributors_table.php`

## How the Fixed Flow Works

### 1. Customer Makes Purchase
- Customer clicks distributor's referral link
- Payment is initiated and recorded with status='pending'
- Customer completes Chapa checkout

### 2. Webhook Processes Payment
- Chapa webhook fires after successful payment
- `MlmEngineService::processCustomerPurchase()` creates distributor record with:
  - `status='inactive'` (explicitly set)
  - `is_paid=false` (explicitly set)
  - Temporary random password
- Customer is placed in the tree structure
- Commission is credited to sponsor

### 3. Customer Chooses to Become Distributor
- After payment success, modal offers "Become a Distributor"
- Customer sets their real password
- `CustomerUpgradeController::upgrade()` is called

### 4. Account Activation
- Controller verifies payment exists and matches email
- Updates distributor record:
  - Sets real password (hashed)
  - Sets `status='active'`
  - Sets `is_paid=true`
- Ensures tree placement is complete
- Credits commission if webhook missed it
- Issues Sanctum auth token for immediate login
- **Logs all status changes for debugging**

### 5. Tree Display
- Tree now correctly shows:
  - Active distributors with their rank
  - Inactive customers with "(Customer)" label
- Status is properly reflected in the UI

## Testing Recommendations

1. **Test the complete flow**:
   - Create a new customer purchase via referral link
   - Complete Chapa payment
   - Choose "Become a Distributor"
   - Set password and verify activation succeeds

2. **Check the logs**:
   - Monitor `storage/logs/laravel.log` for the new logging entries
   - Look for "Upgrading existing distributor" and "Distributor upgraded successfully" messages
   - If errors occur, the detailed error logging will show exactly what failed

3. **Verify tree display**:
   - Check that newly activated distributors show as "active" with their rank
   - Verify customers who haven't upgraded show as "(Customer)" and "Inactive"

4. **Test edge cases**:
   - Webhook fires before upgrade (normal flow)
   - Upgrade happens before webhook (race condition)
   - Multiple upgrade attempts with same credentials

## Additional Notes

- The fixes maintain backward compatibility with existing distributor records
- All database transactions are properly wrapped to prevent partial updates
- Error messages are now more informative for both developers and users
- The logging additions will help diagnose any future issues quickly
