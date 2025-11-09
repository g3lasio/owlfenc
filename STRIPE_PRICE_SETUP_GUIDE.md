# 🔧 **STRIPE PRICE SETUP GUIDE**

**Purpose**: Configure Stripe Price IDs for subscription plans  
**Requirement**: Must be completed before deploying to production  
**Time**: ~15 minutes

---

## 🚨 **CRITICAL: Why This Matters**

The Price Registry system requires **real Stripe Price IDs** for paid plans. Without them:
- ❌ Production deployment will be **blocked** (startup validation fails)
- ❌ Subscription checkout will **throw errors**
- ❌ Users cannot purchase paid plans

Current status from logs:
```
❌ Plan 6 (Master Contractor) has placeholder Price IDs
❌ Plan 9 (Mero Patrón) has placeholder Price IDs
```

---

## 📋 **Step-by-Step Setup**

### **1. Create Products in Stripe Dashboard**

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**

#### **Product 1: Mero Patrón**
- **Name**: Mero Patrón
- **Description**: Para contratistas profesionales
- **Pricing Model**: Recurring
- Click **"Add pricing"** twice (one for monthly, one for yearly)

**Monthly Price:**
- **Price**: $49.99
- **Billing period**: Monthly
- **Currency**: USD
- Click **"Save pricing"**
- ✅ Copy the **Price ID** (starts with `price_...`)

**Yearly Price:**
- **Price**: $509.88  (15% discount from $599.88)
- **Billing period**: Yearly
- **Currency**: USD
- Click **"Save pricing"**
- ✅ Copy the **Price ID** (starts with `price_...`)

#### **Product 2: Master Contractor**
- **Name**: Master Contractor
- **Description**: Sin límites para profesionales
- **Pricing Model**: Recurring
- Click **"Add pricing"** twice

**Monthly Price:**
- **Price**: $99.99
- **Billing period**: Monthly
- **Currency**: USD
- Click **"Save pricing"**
- ✅ Copy the **Price ID** (starts with `price_...`)

**Yearly Price:**
- **Price**: $1,019.89  (15% discount from $1,199.88)
- **Billing period**: Yearly
- **Currency**: USD
- Click **"Save pricing"**
- ✅ Copy the **Price ID** (starts with `price_...`)

---

### **2. Update Environment Variables**

Add these variables to your Replit Secrets:

#### **LIVE MODE (Production)**
```bash
STRIPE_PRICE_MERO_PATRON_MONTHLY=price_xxxxxxxxxxxxx     # Replace with real ID
STRIPE_PRICE_MERO_PATRON_YEARLY=price_yyyyyyyyyyyyyyy   # Replace with real ID
STRIPE_PRICE_MASTER_MONTHLY=price_zzzzzzzzzzzzzzz      # Replace with real ID
STRIPE_PRICE_MASTER_YEARLY=price_aaaaaaaaaaaaaaaa      # Replace with real ID
```

#### **TEST MODE (Development/Staging)**
1. Switch Stripe Dashboard to **Test Mode** (toggle in top-right)
2. Repeat Product/Price creation process
3. Add TEST mode Price IDs:

```bash
STRIPE_TEST_PRICE_MERO_PATRON_MONTHLY=price_test_xxxxx
STRIPE_TEST_PRICE_MERO_PATRON_YEARLY=price_test_yyyyy
STRIPE_TEST_PRICE_MASTER_MONTHLY=price_test_zzzzz
STRIPE_TEST_PRICE_MASTER_YEARLY=price_test_aaaaa
```

---

### **3. Verify Configuration**

1. Restart the application
2. Check startup logs for:

```
✅ [STRIPE-STARTUP] Price Registry validated successfully
✅ [PRICE-REGISTRY] Plan 6 monthly: price_xxxx ($99.99)
✅ [PRICE-REGISTRY] Plan 6 yearly: price_yyyy ($1019.89)
✅ [PRICE-REGISTRY] Plan 9 monthly: price_zzzz ($49.99)
✅ [PRICE-REGISTRY] Plan 9 yearly: price_aaaa ($509.88)
```

If you see validation errors:
- ❌ Price IDs are incorrect or missing
- ❌ Mode mismatch (test key with live prices or vice versa)
- ❌ Check Replit Secrets are set correctly

---

### **4. Test Subscription Checkout**

1. Navigate to `/subscription` page
2. Select **"Mero Patrón"** plan
3. Choose **Monthly** billing
4. Click **"Subscribe"**
5. Verify Stripe Checkout opens with correct price ($49.99)
6. **Do NOT complete payment** (unless testing with real card)
7. Cancel and test yearly billing ($509.88)
8. Repeat for **Master Contractor** plan

Expected behavior:
- ✅ Checkout opens with correct price
- ✅ No errors in console
- ✅ Price matches plan selection

---

## 🔄 **Updating Price IDs (Rotation)**

If you need to change prices or rotate Price IDs:

### **Option A: Environment Variables (Recommended)**
1. Create new Prices in Stripe Dashboard
2. Update environment variables in Replit Secrets
3. Restart application
4. Old prices remain valid for existing subscribers

### **Option B: Registry File Update**
1. Edit `server/config/stripePriceRegistry.ts`
2. Update default Price IDs in LIVE_PRICE_MAP or TEST_PRICE_MAP
3. Commit and deploy
4. Environment variables override registry defaults

---

## 🛡️ **Security Best Practices**

1. **Never commit Price IDs to code** - Always use environment variables
2. **Keep Test and Live IDs separate** - Prevents accidental charges
3. **Rotate IDs periodically** - If compromised or pricing changes
4. **Validate before production** - Ensure all 4 Price IDs are set

---

## ❓ **Troubleshooting**

### **Error: "Price ID not configured"**
**Cause**: Missing environment variable or placeholder not replaced  
**Fix**: Check Replit Secrets have all 4 Price IDs set

### **Error: "Failed to fetch price"**
**Cause**: Price ID doesn't exist in Stripe or mode mismatch  
**Fix**: Verify Price ID exists in correct mode (test vs live)

### **Error: "Currency mismatch"**
**Cause**: Price not in USD  
**Fix**: Recreate Price with USD currency

### **Error: "Interval mismatch"**
**Cause**: Monthly price has yearly interval or vice versa  
**Fix**: Recreate Price with correct billing period

---

## 📊 **Price Summary Table**

| Plan | Monthly Price | Yearly Price | Annual Savings |
|------|--------------|--------------|---------------|
| **Primo Chambeador** | $0 (Free) | $0 (Free) | - |
| **Mero Patrón** | $49.99/mo | $509.88/yr | $89.88 (15%) |
| **Master Contractor** | $99.99/mo | $1,019.89/yr | $179.89 (15%) |

---

## ✅ **Completion Checklist**

Before deploying to production:

- [ ] Created 2 Products in Stripe (Mero Patrón, Master Contractor)
- [ ] Created 4 Prices total (2 monthly + 2 yearly)
- [ ] Added 4 LIVE environment variables to Replit Secrets
- [ ] Added 4 TEST environment variables (if using test mode)
- [ ] Restarted application successfully
- [ ] Verified startup logs show successful Price Registry validation
- [ ] Tested checkout flow for both plans
- [ ] Tested both monthly and yearly billing
- [ ] No errors in console or logs

**Status**: ✅ Ready for production deployment  
**Last Updated**: November 9, 2025

---

## 🔗 **Additional Resources**

- [Stripe Products Documentation](https://stripe.com/docs/products-prices/overview)
- [Stripe Prices API Reference](https://stripe.com/docs/api/prices)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Replit Secrets Management](https://docs.replit.com/programming-ide/workspace-features/secrets)
