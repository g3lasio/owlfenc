# Profile Data Consistency Fix

## Problem Summary

The application had **two separate Firebase collections** storing user profile data:

1. **`userProfiles`** - Used by Settings page (Profile.tsx)
2. **`companyProfiles`** - Used by Estimates and Contracts PDF generation

When users updated their company information (name, logo, address, etc.) in Settings, the changes were saved to `userProfiles`. However, when generating Estimates or Contracts PDFs, the system read from `companyProfiles`, which contained old or empty data.

**Result:** Profile changes were not reflected in generated PDFs.

### Why Invoices Worked Correctly

Invoices received profile data directly from the frontend (which uses `userProfiles`), so they always showed current information.

## Solution Implemented

### 1. Unified Data Source

All systems now use the **`userProfiles`** collection as the single source of truth:

- ✅ Settings page → `userProfiles`
- ✅ Estimates PDF → `userProfiles`
- ✅ Contracts PDF → `userProfiles`
- ✅ Invoices → `userProfiles` (via frontend)

### 2. Files Modified

#### Backend:
- **`server/services/CompanyProfileService.ts`**
  - Changed collection from `'companyProfiles'` to `'userProfiles'`
  - Added comments explaining the fix

#### Frontend:
- **`client/src/lib/firebase.ts`**
  - Updated `getUserProfile()` to read from `userProfiles`
  - Updated `saveUserProfile()` to write to `userProfiles`
  - Updated all log messages to reflect correct collection name

### 3. Migration Script

Created **`server/scripts/migrate-company-profiles.ts`** to copy existing data from `companyProfiles` to `userProfiles`.

## Deployment Instructions

### Step 1: Deploy Code Changes

```bash
# Commit and push changes
git add .
git commit -m "Fix: Unify profile data to userProfiles collection"
git push origin main
```

### Step 2: Run Migration Script (ONE TIME ONLY)

```bash
# Navigate to server directory
cd server

# Install dependencies if needed
npm install

# Run migration script
npx ts-node scripts/migrate-company-profiles.ts
```

**Expected output:**
```
🚀 Starting migration from companyProfiles to userProfiles...
📊 Found X profiles to migrate
✅ Migrated uid1 - Company Name 1
✅ Migrated uid2 - Company Name 2
...
📊 Migration Summary:
   ✅ Successfully migrated: X
   ⏭️  Skipped (already exists): Y
   ❌ Errors: 0
```

### Step 3: Verify Everything Works

1. **Test Settings Page:**
   - Log in to the application
   - Go to Profile/Settings page
   - Update company name, logo, or address
   - Save changes

2. **Test Estimates PDF:**
   - Generate a new estimate
   - Download PDF
   - Verify that the PDF shows the updated company information

3. **Test Contracts PDF:**
   - Generate a new contract
   - Download PDF
   - Verify that the PDF shows the updated company information

4. **Test Invoices:**
   - Generate a new invoice
   - Verify that it still works correctly (should continue working as before)

### Step 4: Clean Up (Optional)

After verifying everything works for at least 1-2 weeks:

```javascript
// You can manually delete the old companyProfiles collection
// from Firebase Console if you're confident everything is working
```

## Technical Details

### Data Flow Before Fix:

```
Settings Page → userProfiles (Firebase)
                     ↓
                (NOT SYNCED)
                     ↓
Estimates/Contracts PDF ← companyProfiles (Firebase) [OLD DATA]
```

### Data Flow After Fix:

```
Settings Page → userProfiles (Firebase)
                     ↓
                (SYNCED)
                     ↓
Estimates/Contracts PDF ← userProfiles (Firebase) [CURRENT DATA]
```

### Field Mapping

The system handles both field name conventions for backward compatibility:

- **Frontend** uses: `company` (string)
- **Backend** uses: `companyName` (string)

Both fields are kept in sync automatically:
```typescript
{
  company: "ABC Construction LLC",      // Frontend field
  companyName: "ABC Construction LLC",  // Backend field
  // ... other fields
}
```

## Benefits

1. ✅ **Immediate reflection** of profile changes in all PDFs
2. ✅ **Single source of truth** for user profile data
3. ✅ **No data duplication** or inconsistency
4. ✅ **Backward compatible** with existing code
5. ✅ **Safe migration** without data loss

## Rollback Plan

If issues arise, you can temporarily revert by:

1. Restore the old code from git history
2. The migration script does NOT delete `companyProfiles`, so old data is preserved
3. Re-deploy the previous version

However, any profile changes made after the fix will only exist in `userProfiles`.

## Support

If you encounter any issues after deployment:

1. Check Firebase Console → Firestore → `userProfiles` collection
2. Verify that user profiles exist with correct data
3. Check server logs for any errors related to profile fetching
4. Ensure the migration script ran successfully

---

**Date Fixed:** December 31, 2024  
**Fixed By:** Manus AI Agent  
**Issue:** Profile data inconsistency between Settings and PDF generation
