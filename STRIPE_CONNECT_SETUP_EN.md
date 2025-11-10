# Stripe Connect Setup Guide - Production

## ✅ Implemented Fixes

I have completely improved the Stripe Connect system with:

### 1. **Robust Error Handling**
- ✅ Detailed logging at every step of the process
- ✅ Specific error messages for debugging
- ✅ Granular try-catch to identify exactly where it fails
- ✅ Environment variable validation before proceeding
- ✅ Separate error handling for Stripe API calls
- ✅ **CRITICAL FIX:** Fatal error if account ID cannot be persisted (prevents orphaned accounts)
- ✅ **CRITICAL FIX:** Distinguishes between account not found vs network errors (prevents duplicates)

### 2. **Implemented Validations**
- ✅ Verifies STRIPE_SECRET_KEY is configured
- ✅ Verifies user exists in Firebase
- ✅ Verifies user exists in PostgreSQL database
- ✅ Correctly handles existing accounts
- ✅ Only recreates account if truly missing (not on transient errors)

### 3. **Improved Logging**
You will now see detailed logs like:
```
🔐 [STRIPE-CONNECT-EXPRESS] Starting payment setup
📧 [STRIPE-CONNECT-EXPRESS] User: owl@chyrris.com
✅ [STRIPE-CONNECT-EXPRESS] Database user ID: 1
✅ [STRIPE-CONNECT-EXPRESS] User found: owl@chyrris.com
🔗 [STRIPE-CONNECT-EXPRESS] Base URL: https://your-app.replit.app
🆕 [STRIPE-CONNECT] Creating new Stripe Express account
✅ [STRIPE-CONNECT] Account created: acct_xxxxx
✅ [STRIPE-CONNECT] Onboarding link created
```

---

## 🔧 Required Configuration

### 1. **Verify REPLIT_DOMAINS in Production**

In your Replit deployment, ensure the `REPLIT_DOMAINS` environment variable is correctly configured:

```bash
# In production it should be something like:
REPLIT_DOMAINS=your-app-name.replit.app

# Or if you have a custom domain:
REPLIT_DOMAINS=app.owlfenc.com
```

**How to verify:**
- Go to **Deployments** → **Settings** → **Environment Variables**
- Look for `REPLIT_DOMAINS`
- It should contain your production domain

### 2. **Configure Redirect URLs in Stripe Dashboard**

⚠️ **IMPORTANT:** Stripe requires redirect URLs to be authorized in your dashboard.

**Steps:**

1. **Go to your Stripe Dashboard:**
   - https://dashboard.stripe.com
   - Switch to LIVE mode (toggle in upper right corner)

2. **Navigate to Connect Settings:**
   - **Settings** → **Connect** → **Integration**

3. **Add your redirect URLs:**
   - In the "Redirect URIs" section, add:
     ```
     https://your-app-name.replit.app/project-payments?tab=settings&connected=true
     https://your-app-name.replit.app/project-payments?tab=settings&refresh=true
     ```
   - If using custom domain:
     ```
     https://app.owlfenc.com/project-payments?tab=settings&connected=true
     https://app.owlfenc.com/project-payments?tab=settings&refresh=true
     ```

4. **Save changes**

### 3. **Enable Stripe Connect**

If you haven't done so yet, you must activate Stripe Connect in your account:

1. **Go to:** https://dashboard.stripe.com/settings/connect
2. **Click "Get Started"** or "Enable Connect"
3. **Complete the** Stripe Connect onboarding
4. **Accept the** terms of service

---

## 🧪 How to Test

### 1. **Test with Diagnostic Button**

In the interface:
1. Go to **Project Payments** → **Settings**
2. Click **"Run Diagnostic"** (yellow button with shield)
3. You should see:
   ```
   Stripe Connect: ✅ ENABLED
   Account: your-account@email.com
   Environment: LIVE MODE
   ✓ Ready to accept payments
   ```

### 2. **Try to Connect Account**

1. Click **"Connect Stripe Account"** (large blue button)
2. Observe logs in the server console
3. If there's an error, logs will tell you exactly what failed:

**Common Errors and Solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| `STRIPE_SECRET_KEY not configured` | Missing Stripe key | Add STRIPE_SECRET_KEY in Secrets |
| `Failed to map user account` | User mapping error | Verify user has active session |
| `User profile not found` | User doesn't exist in DB | Verify Firebase → PostgreSQL integration |
| `Failed to create Stripe account` | Stripe API error | Check logs for specific message |
| `Failed to create onboarding link` | URLs not authorized | Add URLs in Stripe Dashboard |
| `Failed to save account connection` | Database error | **CRITICAL:** Account created but not saved - contact support |
| `Failed to verify existing account` | Network/API error | Retry in a moment - prevents duplicate accounts |

### 3. **View Detailed Logs**

Look for lines in server logs starting with:
- `❌ [STRIPE-CONNECT]` = Critical error
- `⚠️ [STRIPE-CONNECT-EXPRESS]` = Warning
- `✅ [STRIPE-CONNECT]` = Success

---

## 📊 Complete Flow

```
User clicks "Connect Stripe Account"
    ↓
Frontend sends POST /api/contractor-payments/stripe/connect
    ↓
Backend verifies:
    ✓ User authenticated (Firebase)
    ✓ STRIPE_SECRET_KEY configured
    ✓ User exists in PostgreSQL DB
    ↓
Does user have Stripe account?
    YES → Create login link → Redirect to Stripe Dashboard
    NO → Continue below
    ↓
Create new Stripe Express account
    ↓
Save account.id in PostgreSQL (CRITICAL - must succeed)
    ↓
Create accountLink for onboarding
    ↓
Return URL to frontend
    ↓
Frontend redirects to Stripe onboarding
    ↓
User completes setup in Stripe
    ↓
Stripe redirects to: /project-payments?tab=settings&connected=true
    ↓
✅ Account connected!
```

---

## 🔒 Production Safety Features

### 1. **Prevents Orphaned Accounts**
If the database cannot save the Stripe account ID, the system will return an error instead of success. This prevents creating Stripe accounts that the platform loses track of.

### 2. **Prevents Duplicate Accounts**
The system now distinguishes between:
- **Account not found** (safe to create new) 
- **Network/API errors** (retry, don't create duplicate)

This prevents creating multiple Stripe accounts for the same user due to transient errors.

---

## 🔍 Production Debugging

If you continue having HTTP problems, run these commands in the server console:

```javascript
// 1. Verify environment variables
console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');

// 2. Test Stripe connection
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.accounts.list({ limit: 1 })
  .then(() => console.log('✅ Stripe API works'))
  .catch(err => console.error('❌ Stripe error:', err.message));
```

---

## 🆘 Support Contact

If after following these steps you still have problems:

1. **Copy complete logs** from server when trying to connect
2. **Take screenshot** of browser error
3. **Verify** you're in LIVE mode in Stripe
4. **Confirm** redirect URLs are in Stripe dashboard

The logs are now much more detailed and will tell you exactly where the process is failing.

---

## ✨ Included Improvements

- 🔍 **Detailed logging at every step**
- 🛡️ **Robust configuration validation**
- 🔄 **Intelligent handling of existing accounts**
- 📊 **Specific error messages**
- 🚨 **Early alerts for incorrect configuration**
- ✅ **Visual confirmation of each successful step**
- 🔒 **Protection against orphaned accounts**
- 🎯 **Prevention of duplicate account creation**
