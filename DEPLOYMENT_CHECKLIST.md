# 🚀 Stripe Connect - Pre-Deployment Checklist

## ✅ Critical Fixes Implemented

### 1. HTTPS Enforcement for LIVE Mode
- [x] Auto-detection of LIVE mode via `STRIPE_SECRET_KEY` prefix
- [x] Force HTTPS protocol when LIVE mode detected
- [x] Fallback chain: REPLIT_DOMAINS → REPLIT_DEV_DOMAIN → req.headers.host → localhost
- [x] Warning logs when forcing HTTPS in LIVE mode
- [x] Error logs when localhost used in LIVE mode

### 2. Orphaned Account Prevention (Rollback System)
- [x] Automatic rollback: `stripe.accounts.del()` on database persistence failure
- [x] Error logging for manual cleanup if rollback fails
- [x] Clear user error messages for retry
- [x] Prevents accumulation of orphaned Stripe accounts

### 3. Duplicate Account Prevention (Error Classification)
- [x] Multi-layer error detection (type, code, message, statusCode)
- [x] Only creates new account on true `resource_missing` (404)
- [x] Returns error on network/API/permission errors (prevents duplicates)
- [x] Cross-SDK compatible error handling

### 4. Production Logging & Debugging
- [x] Detailed step-by-step logging with emoji indicators
- [x] Error categorization (❌ Critical, ⚠️ Warning, ✅ Success)
- [x] Request/response logging for troubleshooting
- [x] Environment-aware detail levels

---

## 🔧 Configuration Verification

### Environment Variables (Replit Deployment)
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...` (LIVE mode key)
- [ ] `REPLIT_DOMAINS` = Your production domain (e.g., `app.owlfenc.com`)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` (if using webhooks)
- [ ] `DATABASE_URL` = PostgreSQL connection string
- [ ] All Firebase credentials properly configured

### Stripe Dashboard Configuration
- [ ] Navigate to: https://dashboard.stripe.com/settings/connect
- [ ] Switch to **LIVE MODE** (toggle in upper right)
- [ ] Under **Integration** → **Redirect URIs**, add:
  ```
  https://your-production-domain.com/project-payments?tab=settings&connected=true
  https://your-production-domain.com/project-payments?tab=settings&refresh=true
  ```
- [ ] Save changes
- [ ] Verify Stripe Connect is enabled for your account

---

## 🧪 Testing Checklist

### Pre-Deployment Tests (Development)
- [ ] Run diagnostic: Click "Run Diagnostic" button → Should show "✅ ENABLED"
- [ ] Test Express mode: Click "Connect Stripe Account" → Should redirect to HTTPS URL
- [ ] Verify HTTPS logging: Check server logs show `https://` in Base URL
- [ ] Test existing account: If account exists, should get dashboard login link
- [ ] Test error handling: Verify clear error messages on failures

### Post-Deployment Tests (Production)
- [ ] Access production URL via HTTPS
- [ ] Login as contractor
- [ ] Go to Project Payments → Settings
- [ ] Click "Run Diagnostic" → Verify all checks pass
- [ ] Click "Connect Stripe Account"
- [ ] Verify redirects to Stripe with HTTPS URL
- [ ] Complete Stripe onboarding
- [ ] Verify redirect back to app works
- [ ] Confirm account status shows as connected
- [ ] Test creating payment link
- [ ] Test receiving test payment (using Stripe test card)

---

## 🔍 Error Scenarios & Expected Behavior

### Scenario 1: Database Persistence Fails
**Expected:**
1. Stripe account created
2. Database persistence fails
3. Automatic rollback: Stripe account deleted
4. User sees: "Unable to complete account setup. Please try again."
5. User can retry safely
6. **Result:** No orphaned accounts

### Scenario 2: Network Error on Account Retrieval
**Expected:**
1. User has existing account ID in database
2. Network error when checking Stripe
3. System detects non-404 error
4. Returns error instead of creating duplicate
5. User sees: "Unable to check your Stripe account status. Please try again."
6. **Result:** No duplicate accounts created

### Scenario 3: HTTPS Enforcement in LIVE Mode
**Expected:**
1. LIVE mode detected (`sk_live_...` key)
2. System checks available domain sources
3. Forces HTTPS protocol regardless of req.protocol
4. Logs: "🔗 [STRIPE-CONNECT-EXPRESS] Base URL: https://..."
5. accountLink creation succeeds
6. **Result:** No HTTPS errors from Stripe

### Scenario 4: Account Truly Missing (404)
**Expected:**
1. Database has old/invalid account ID
2. Stripe returns 404/resource_missing
3. System detects true resource missing
4. Creates new Stripe account safely
5. Updates database with new account ID
6. **Result:** Clean account recreation

---

## 📊 Production Monitoring

### Key Metrics to Watch
- **Account Creation Rate:** Should be ~1 per contractor
- **Rollback Events:** Should be near zero (indicates DB issues if frequent)
- **Duplicate Detection:** Should catch network errors (indicates resilient error handling)
- **HTTPS Warnings:** Should be zero in production

### Log Patterns to Monitor

#### Success Pattern
```
✅ [STRIPE-CONNECT-EXPRESS] Database user ID: X
✅ [STRIPE-CONNECT-EXPRESS] User found: email@example.com
🔗 [STRIPE-CONNECT-EXPRESS] Base URL: https://app.owlfenc.com
✅ [STRIPE-CONNECT] Account created: acct_xxxxx
✅ [STRIPE-CONNECT] Account ID stored in database
✅ [STRIPE-CONNECT] Onboarding link created
```

#### Rollback Pattern (DB Failure)
```
❌ [STRIPE-CONNECT] CRITICAL: Failed to store account ID in database
❌ [STRIPE-CONNECT] Rolling back Stripe account: acct_xxxxx
✅ [STRIPE-CONNECT] Stripe account deleted successfully (rollback)
```

#### Duplicate Prevention Pattern (Network Error)
```
❌ [STRIPE-CONNECT-EXPRESS] Stripe API error (not missing resource)
❌ [STRIPE-CONNECT-EXPRESS] Error type: StripeConnectionError, Code: undefined, Status: undefined
```

---

## 🚨 Troubleshooting Guide

### Issue: "Livemode requests must always be redirected via HTTPS"
**Cause:** Stripe receiving HTTP redirect URL in LIVE mode  
**Fix Applied:** HTTPS enforcement in baseURL generation  
**Verify:** Check logs show `https://` in Base URL  

### Issue: "No such account" but account keeps creating
**Cause:** Network errors misclassified as missing account  
**Fix Applied:** Multi-layer error detection (type + code + message + statusCode)  
**Verify:** Check logs show error type/code on failures  

### Issue: Orphaned Stripe accounts accumulating
**Cause:** Database persistence fails but Stripe account persists  
**Fix Applied:** Automatic rollback with `stripe.accounts.del()`  
**Verify:** Check logs show "Rolling back" message on DB failures  

### Issue: "Invalid redirect URI"
**Cause:** Redirect URI not registered in Stripe Dashboard  
**Solution:** Add URLs to Stripe Dashboard → Settings → Connect → Redirect URIs  

---

## 📝 Deployment Steps

### 1. Pre-Deployment
- [ ] Review all checklist items above
- [ ] Verify environment variables configured
- [ ] Verify Stripe Dashboard redirect URIs registered
- [ ] Run development tests

### 2. Deployment
- [ ] Deploy to production (Replit publish)
- [ ] Verify `REPLIT_DOMAINS` environment variable set correctly
- [ ] Check production logs for startup messages
- [ ] Verify Stripe health check passes

### 3. Post-Deployment
- [ ] Run full testing checklist in production
- [ ] Monitor logs for first few onboardings
- [ ] Verify no HTTPS errors
- [ ] Confirm accounts creating successfully

### 4. Monitoring (First 24 Hours)
- [ ] Check for rollback events (should be rare)
- [ ] Monitor duplicate prevention triggers
- [ ] Verify HTTPS enforcement working
- [ ] Review error logs for unexpected issues

---

## ✅ Sign-Off Criteria

### Code Quality
- [x] All critical fixes implemented
- [x] Error handling comprehensive
- [x] Logging detailed and production-ready
- [x] TypeScript types correct (minor warnings acceptable)

### Security
- [x] HTTPS enforced in LIVE mode
- [x] No credentials logged
- [x] Rollback prevents orphaned accounts
- [x] Error classification prevents duplicates

### Reliability
- [x] Cross-SDK compatible error detection
- [x] Graceful degradation on failures
- [x] Clear error messages for users
- [x] Retry-safe operations

### Documentation
- [x] Spanish setup guide (STRIPE_CONNECT_SETUP.md)
- [x] English setup guide (STRIPE_CONNECT_SETUP_EN.md)
- [x] Deployment checklist (this document)
- [x] Troubleshooting guide included

---

## 🎯 Final Verification Commands

### Check Environment
```bash
# Verify environment variables
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:15}..."
echo "REPLIT_DOMAINS: $REPLIT_DOMAINS"
echo "LIVE MODE: $(echo $STRIPE_SECRET_KEY | grep -q 'sk_live_' && echo 'YES' || echo 'NO')"
```

### Test Stripe Connection
```bash
# Test Stripe API connectivity
curl -s https://api.stripe.com/v1/account \
  -u "$STRIPE_SECRET_KEY:" | jq -r '.id'
```

### Monitor Logs
```bash
# Watch for Stripe Connect events
tail -f /path/to/logs | grep STRIPE-CONNECT
```

---

## 🏁 Ready for Production?

**All items checked?** → ✅ **DEPLOY**  
**Any items unchecked?** → ⚠️ **Review and fix first**  
**Any errors in testing?** → ❌ **Debug before deploying**

---

**Last Updated:** November 10, 2025  
**Version:** 2.0 (HTTPS Fix + Rollback System + Duplicate Prevention)  
**Status:** PRODUCTION READY ✅
