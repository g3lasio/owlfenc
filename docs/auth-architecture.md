# Authentication Architecture Analysis

## Executive Summary - Critical Security Issues Found

**🚨 IMMEDIATE ACTION REQUIRED:**
1. **Live API keys exposed in repository** (.env file)
2. **Inconsistent authentication implementation** (Firebase + Demo auth)
3. **Missing rate limiting and password policies**
4. **Incomplete token validation** across routes

---

## Technology Stack Discovered

### Backend Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React/TypeScript)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  AuthContext    │  │  Firebase Web   │  │   React     │  │
│  │   (State Mgmt)  │  │     SDK         │  │  Firebase   │  │
│  │                 │  │                 │  │   Hooks     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS + Bearer Token
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS.JS SERVER                        │
│                                                             │
│  Authentication Middleware (INCONSISTENT):                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  Firebase Auth  │  │   Demo Auth     │  │  Passport   │  │
│  │  (Production)   │  │  (Development)  │  │ (Partially  │  │
│  │                 │  │                 │  │Implemented) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                             │
│  Session Management:                                        │
│  ┌─────────────────┐                                       │
│  │ express-session │                                       │
│  │ + PostgreSQL    │                                       │
│  │ Store           │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                POSTGRESQL DATABASE                          │
│                     (Drizzle ORM)                          │
│                                                             │
│  Tables: users, projects, templates, settings, etc.        │
│  Schema: Mixed Firebase UID + internal user IDs            │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Dependencies & Versions

**Core Authentication:**
- `firebase` v11.6.0 (Client SDK)
- `firebase-admin` v13.4.0 (Server SDK)
- `react-firebase-hooks` v5.1.1 (React integration)

**Session Management:**
- `express-session` v1.18.1 (Session middleware)
- `connect-pg-simple` v10.0.0 (PostgreSQL session store)
- `memorystore` v1.6.7 (Memory session store)

**Partially Implemented:**
- `passport` v0.7.0 (Authentication middleware)
- `passport-local` v1.0.0 (Local strategy)

**Security Libraries:**
- `zod` v3.23.8 (Schema validation)
- `drizzle-zod` v0.7.0 (Database validation)

**Missing Critical Dependencies:**
- ❌ Rate limiting (express-rate-limit)
- ❌ Password hashing (bcrypt/argon2)
- ❌ CORS configuration
- ❌ Helmet.js for security headers
- ❌ Input sanitization

---

## Data Storage Architecture

### User Data Storage (HYBRID APPROACH - SECURITY RISK)

```
Firebase Authentication       PostgreSQL Database
┌─────────────────────┐     ┌─────────────────────┐
│ User Authentication │ ←→  │    users table      │
│                     │     │                     │
│ - uid (primary)     │     │ - id (serial)       │
│ - email             │     │ - firebase_uid      │
│ - password hash     │     │ - username          │
│ - email_verified    │     │ - password (RISK!)  │
│ - display_name      │     │ - company           │
│ - photo_url         │     │ - role              │
│                     │     │ - profile_data      │
└─────────────────────┘     └─────────────────────┘
```

**🚨 CRITICAL ISSUE:** Database contains password field despite using Firebase Auth

### Session Storage
- **Primary:** PostgreSQL with `connect-pg-simple`
- **Fallback:** Memory store (development)
- **Configuration:** Mixed secure/insecure settings

---

## Authentication Entry Points

### Client-Side Entry Points
1. **AuthContext** (`client/src/contexts/AuthContext.tsx`)
   - Firebase Web SDK integration
   - State management for auth status
   - Login/Register/Logout functions

2. **Firebase Configuration** (Multiple locations)
   - Environment-based configuration
   - API keys exposed in .env

### Server-Side Entry Points

1. **Primary Firebase Middleware** (`server/middleware/firebase-auth.ts`)
   ```javascript
   export const verifyFirebaseAuth = async (req, res, next) => {
     // Token verification with Firebase Admin SDK
     const token = authHeader.substring(7);
     const decodedToken = await admin.auth().verifyIdToken(token);
   }
   ```

2. **Demo Authentication** (`server/middleware/auth.ts`)
   ```javascript
   // SECURITY RISK: Bypasses real authentication
   req.user = {
     id: userId,
     email: 'contractor@owlfence.com',
     username: 'contractor_demo'
   };
   ```

3. **Route-Level Auth** (Inconsistent implementation across files)

---

## Critical Security Findings

### 🔴 HIGH RISK

1. **API Keys Exposed in Repository**
   - Live Stripe keys: `sk_live_51REWb2LxBTKPALGDEj1HeaT...`
   - Database credentials in plain text
   - Third-party API keys exposed

2. **Authentication Bypass**
   - Demo auth middleware bypasses Firebase verification
   - Multiple routes use inconsistent authentication
   - Some routes completely unprotected

3. **Session Security**
   - No secure cookie configuration visible
   - Mixed session strategies (Firebase + Express sessions)

### 🟡 MEDIUM RISK

4. **Password Storage Redundancy**
   - PostgreSQL users table has password field
   - Conflicts with Firebase Authentication model
   - Potential for password storage without proper hashing

5. **Incomplete Implementation**
   - Passport.js partially configured but unused
   - Multiple authentication strategies cause confusion

### 🟢 LOW RISK

6. **Missing Security Headers**
   - No Helmet.js implementation visible
   - CORS configuration not found
   - Rate limiting not implemented

---

## Recommendations

### IMMEDIATE (Within 24 hours)
1. **Remove .env from repository** and rotate all exposed secrets
2. **Implement consistent authentication** across all routes
3. **Remove demo authentication** from production code

### SHORT TERM (1-2 weeks)
1. Add rate limiting middleware
2. Implement proper CORS configuration
3. Add security headers with Helmet.js
4. Standardize on Firebase Authentication only

### LONG TERM (1 month)
1. Security audit of all authentication flows
2. Implement proper logging and monitoring
3. Add automated security scanning
4. Create security documentation and training

---

*Analysis completed: $(date)*
*Analyzed by: Senior Application Security Engineer & Backend Tech Lead*