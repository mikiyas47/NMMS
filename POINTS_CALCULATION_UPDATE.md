# Points Calculation & Cycle Engine Update

## Summary of Changes

This update modifies the MLM system to:
1. **Calculate total points correctly** by summing ALL accounts in the entire tree (not just left/right propagated points)
2. **Disable automatic cycle engine execution** — distributors must manually click "Run Cycle Engine" button
3. **Remove team points display** from the tree visualization

---

## 1. Total Points Calculation

### Previous Behavior
Total points were calculated as:
```
total_points = own_points + total_left_points + total_right_points
```

This meant if a distributor had 4 golden accounts (4 × 800 = 3,200 points), their total would show 3,200 + network points.

### New Behavior
Total points are now calculated by **summing every account's own_points in the entire subtree**:
```php
$totalPoints = $this->getSubtreeVolume($node->id);
```

This correctly accounts for:
- **Multiple accounts per distributor** (single, double, triple, quadruple golden)
- **All downline accounts** recursively
- **No double-counting** — each account is counted exactly once

### Example
If a distributor has:
- 4 golden accounts (4 × 800 = 3,200 points)
- Sells 3 orange products to customers (3 × 200 = 600 points added to network)

**Total points = 3,200 + 600 = 3,800 points**

### Files Changed
- `backend/app/Http/Controllers/Api/WalletController.php` — Updated `show()` method
- `backend/app/Services/MlmEngineService.php` — Updated `runRankCheck()` method

---

## 2. Cycle Engine Manual Trigger

### Previous Behavior
The cycle engine ran **automatically** after:
- Customer purchases (via payment webhook)
- Distributor joins the network
- Payment verification

### New Behavior
The cycle engine **only runs** when:
- Distributor clicks "Run Cycle Engine" button in the Earnings screen
- Weekly scheduled cron job (admin automation)

### Why This Change?
- Gives distributors **control** over when to collect cycle earnings
- Prevents **unexpected balance changes** during transactions
- Allows distributors to **accumulate points** before triggering cycles

### Files Changed
- `backend/app/Http/Controllers/Api/PaymentController.php` — Removed `runCycleEngine()` calls from webhook and verification
- `backend/app/Http/Controllers/Api/DistributorJoinController.php` — Removed `runCycleEngine()` call from join process

### How to Run Cycle Engine
Distributors must:
1. Go to **Earnings** screen in the app
2. View the "Earning Cycle Engine" section
3. Click **"Run Cycle Engine"** button
4. Confirm the action

---

## 3. Team Points Display Removed

### Previous Behavior
Tree nodes showed:
```
Own: 800 PTS
Team: 3,200 PTS  ← This line
CT
```

### New Behavior
Tree nodes now show:
```
Own: 800 PTS
CT
```

### Why This Change?
- **Simplifies the tree view** — focuses on individual account points
- **Reduces confusion** — "team points" was ambiguous (subtree volume vs. network points)
- **Cleaner UI** — less visual clutter

### Files Changed
- `APP/src/screens/distributor/TreeScreen.js` — Removed team points line from node display

---

## Testing Checklist

### Backend Testing
- [ ] Verify total points calculation includes all accounts in subtree
- [ ] Confirm cycle engine does NOT run after customer purchase
- [ ] Confirm cycle engine does NOT run after distributor join
- [ ] Verify manual "Run Cycle Engine" button works correctly
- [ ] Test rank advancement with new total points calculation

### Frontend Testing
- [ ] Verify Earnings screen shows correct total points
- [ ] Verify tree nodes no longer show "Team: X PTS"
- [ ] Verify "Run Cycle Engine" button is visible and functional
- [ ] Test cycle calculation preview (before running)
- [ ] Verify points update after running cycle engine

### Example Test Case
1. Create distributor with 4 golden accounts (3,200 points)
2. Sell 3 orange products to customers (600 points)
3. **Expected total points: 3,800**
4. Verify cycle engine does NOT run automatically
5. Click "Run Cycle Engine" button
6. Verify cycles are calculated and earnings credited

---

## Deployment Notes

1. **Database**: No schema changes required
2. **Cache**: Clear application cache after deployment
3. **Cron Jobs**: Weekly cycle automation still runs (unchanged)
4. **Mobile App**: Users should update to latest version to see UI changes

---

## Rollback Plan

If issues arise, revert these commits:
1. WalletController total points calculation
2. MlmEngineService runRankCheck total points
3. PaymentController cycle engine removal
4. DistributorJoinController cycle engine removal
5. TreeScreen team points display removal

All changes are isolated and can be reverted independently.
