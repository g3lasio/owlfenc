# Google Cloud OAuth Configuration Guide

## Current Issue
Google OAuth is failing with unauthorized domain errors because the Replit domain is not authorized in Google Cloud Console.

## Required Configuration Steps

### Step 1: Google Cloud Console Setup

**Navigate to**: [Google Cloud Console](https://console.cloud.google.com/)
1. Select your project (should match Firebase project)
2. Go to **APIs & Services** > **Credentials**
3. Find your **OAuth 2.0 Client ID** (Web application)

### Step 2: Configure Authorized Domains

**Add these to "Authorized JavaScript origins":**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
https://owl-fenc.firebaseapp.com
```

**Add these to "Authorized redirect URIs":**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/__/auth/handler
https://owl-fenc.firebaseapp.com/__/auth/handler
```

### Step 3: Firebase Console Verification

**Navigate to**: [Firebase Console](https://console.firebase.google.com/)
1. Select your project: **owl-fenc**
2. Go to **Authentication** > **Sign-in method**
3. Click **Google** provider
4. Verify **Web SDK configuration** matches Google Cloud Console
5. Add to **Authorized domains**:
   ```
   4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
   owl-fenc.firebaseapp.com
   owl-fenc.web.app
   ```

## Current Domain Information

**Current Replit Domain:**
```
4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
```

**Firebase Auth Domain:**
```
owl-fenc.firebaseapp.com
```

## Testing After Configuration

Once configured, the following should work:
1. Click "Sign in with Google" button
2. Popup should open (not redirect)
3. Google OAuth should complete successfully
4. No "unauthorized domain" errors

## Error Messages Resolved

**Before Configuration:**
- "auth/unauthorized-domain"
- "refuse to connect" in iframe

**After Configuration:**
- Successful Google authentication
- Clean popup-based authentication flow

## Implementation Notes

The current implementation uses `signInWithPopup` exclusively to avoid third-party storage issues in modern browsers (Chrome 115+, Safari 16.1+, Firefox 109+).

**No redirect-based authentication is used** - only popup-based authentication for compatibility with current browser security policies.