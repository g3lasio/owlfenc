#!/usr/bin/env node

/**
 * CRITICAL: API KEY ROTATION SCRIPT
 * Automated rotation of exposed production API keys
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

console.log('🚨 CRITICAL API KEY ROTATION STARTING...');

// Generate secure session secret
const generateSessionSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Create new .env with secure placeholders
const createSecureEnv = () => {
  const newSessionSecret = generateSessionSecret();
  
  const secureEnvTemplate = `# 🛡️ SECURE ENVIRONMENT CONFIGURATION
# Generated: ${new Date().toISOString()}
# Status: SECURITY ROTATION COMPLETE

# 🔐 DATABASE CONFIGURATION (ROTATED)
DATABASE_URL="postgresql://[NEW_USER]:[NEW_PASSWORD]@[HOST]/[DATABASE]?sslmode=require"
PGHOST="[ROTATE_HOST_IF_NEEDED]"
PGPORT="5432"
PGUSER="[NEW_USERNAME]"
PGPASSWORD="[NEW_SECURE_PASSWORD]"
PGDATABASE="[DATABASE_NAME]"

# 🔑 SESSION SECURITY (ROTATED)
SESSION_SECRET="${newSessionSecret}"

# 💳 STRIPE CONFIGURATION (CRITICAL - ROTATED)
STRIPE_API_KEY="sk_live_[NEW_STRIPE_LIVE_KEY_HERE]"
STRIPE_WEBHOOK_SECRET="whsec_[NEW_WEBHOOK_SECRET]"
STRIPE_PUBLISHABLE_KEY="pk_live_[NEW_PUBLISHABLE_KEY]"

# 🤖 AI SERVICE KEYS (ROTATED)
OPENAI_API_KEY="sk-[NEW_OPENAI_KEY]"
ANTHROPIC_API_KEY="sk-ant-api03-[NEW_ANTHROPIC_KEY]"
VITE_ANTHROPIC_API_KEY="sk-ant-api03-[NEW_CLIENT_ANTHROPIC_KEY]"

# 🗺️ MAPPING SERVICES (ADD RESTRICTIONS)
VITE_GOOGLE_MAPS_API_KEY="AIza[NEW_RESTRICTED_GOOGLE_KEY]"
GOOGLE_API_KEY="AIza[NEW_SERVER_GOOGLE_KEY]"
MAPBOX_PUBLIC_KEY="pk.eyJ1[NEW_MAPBOX_KEY]"
VITE_MAPBOX_ACCESS_TOKEN="pk.eyJ1[NEW_MAPBOX_TOKEN]"

# 🏠 PROPERTY DATA (ROTATED)
ATTOM_API_KEY="[NEW_ATTOM_API_KEY]"

# 📧 EMAIL SERVICE
RESEND_API_KEY="re_[CURRENT_RESEND_KEY_OK]"

# 📱 SMS SERVICE  
TWILIO_ACCOUNT_SID="[CURRENT_TWILIO_SID_OK]"
TWILIO_AUTH_TOKEN="[CURRENT_TWILIO_TOKEN_OK]"
TWILIO_PHONE_NUMBER="+17073092221"

# 🔥 FIREBASE CONFIGURATION (SECURE)
FIREBASE_PROJECT_ID="[YOUR_PROJECT_ID]"
FIREBASE_API_KEY="[RESTRICTED_FIREBASE_KEY]"
FIREBASE_AUTH_DOMAIN="[PROJECT].firebaseapp.com"
FIREBASE_STORAGE_BUCKET="[PROJECT].appspot.com"
FIREBASE_MESSAGING_SENDER_ID="[SENDER_ID]"
FIREBASE_APP_ID="[APP_ID]"

# 🚀 DEPLOYMENT
NODE_ENV="production"
PORT="5000"
ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# 📊 MONITORING
SENTRY_DSN="[OPTIONAL_SENTRY_DSN]"
ANALYTICS_ID="[OPTIONAL_ANALYTICS_ID]"
`;

  // Write secure template
  fs.writeFileSync('.env.secure-template', secureEnvTemplate);
  
  console.log('✅ Secure .env template created: .env.secure-template');
  console.log('🔐 New session secret generated');
  console.log('📋 Manual steps required:');
  console.log('   1. Generate new Stripe keys in dashboard');
  console.log('   2. Update database password');
  console.log('   3. Rotate AI service keys');
  console.log('   4. Add domain restrictions to mapping APIs');
  console.log('   5. Copy .env.secure-template to production environment');
  console.log('   6. Remove old API keys from providers');
};

// Log current exposed keys (for audit trail)
const logExposedKeys = () => {
  const exposedKeys = {
    stripe: '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',
    database_password: 'npg_ZT0PokJOevI4',
    session_secret: 'FgZpo1EKZnbuGLBv9sdE9Ww8SkhKhw4RLADU5Zu2zCk/AGHlRCrzawbn6XegjgsKZ5CFivyZDyIIoYk30RjYGA==',
    anthropic: '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',
    attom: '9f1f98ff1c5e9d1187f29f4d57a613fd'
  };

  const auditLog = `# 🚨 API KEY EXPOSURE AUDIT LOG
Date: ${new Date().toISOString()}
Status: CRITICAL - KEYS COMPROMISED

## EXPOSED KEYS (REQUIRE IMMEDIATE ROTATION):
${Object.entries(exposedKeys).map(([service, key]) => 
  `${service.toUpperCase()}: ${key.substring(0, 8)}...${key.substring(-8)} (COMPROMISED)`
).join('\n')}

## ACTION STATUS:
- [x] Keys identified and documented
- [x] Secure replacement template generated
- [ ] New keys generated at providers
- [ ] Production environment updated
- [ ] Old keys revoked
- [ ] Security monitoring activated

## SECURITY INCIDENT TIMELINE:
1. ${new Date().toISOString()}: Exposed keys identified in repository
2. ${new Date().toISOString()}: Rotation script executed
3. [PENDING]: Manual key rotation at provider dashboards
4. [PENDING]: Production deployment with new keys
5. [PENDING]: Old key revocation
`;

  fs.writeFileSync('docs/api-key-exposure-audit.md', auditLog);
  console.log('📋 Audit log created: docs/api-key-exposure-audit.md');
};

// Main execution
try {
  logExposedKeys();
  createSecureEnv();
  
  console.log('\n🛡️ API KEY ROTATION PREPARATION COMPLETE');
  console.log('⚠️  CRITICAL: Manual provider rotation required');
  console.log('🔗 Follow provider-specific rotation guides in docs/');
  
} catch (error) {
  console.error('❌ Rotation script failed:', error);
  process.exit(1);
}