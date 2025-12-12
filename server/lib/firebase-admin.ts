/**
 * FIREBASE ADMIN SDK CONFIGURATION (SINGLETON)
 * Unified initialization for all Firebase services including Storage
 * 
 * CRITICAL: This is the ONLY place Firebase Admin should be initialized
 * All other files should import from this module
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin only once with FULL configuration
let adminApp: admin.app.App;
let firestore: admin.firestore.Firestore;
let storageBucket: admin.storage.Bucket | null = null;

// Storage bucket name
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'owl-fence-mervin.appspot.com';

// Check if Firebase Admin is already initialized
try {
  // Try to get the default app
  adminApp = admin.app();
  console.log('✅ [FIREBASE-ADMIN] SDK already initialized, reusing instance');
  
  // Verify storage bucket is configured
  if (adminApp.options.storageBucket) {
    storageBucket = admin.storage().bucket();
    console.log('✅ [FIREBASE-ADMIN] Storage bucket available:', adminApp.options.storageBucket);
  }
} catch (error) {
  // Initialize with full configuration including storage
  try {
    // Try to use service account if available (check multiple env var names)
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT || 
                              process.env.FIREBASE_ADMIN_CREDENTIALS;
    
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || 'owl-fenc',
        storageBucket: STORAGE_BUCKET,
      });
      console.log('✅ [FIREBASE-ADMIN] SDK initialized with service account credentials');
      console.log(`✅ [FIREBASE-ADMIN] Project: ${serviceAccount.project_id || 'owl-fenc'}`);
    } else {
      // Fallback to Application Default Credentials
      adminApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'owl-fenc',
        storageBucket: STORAGE_BUCKET,
      });
      console.log('✅ [FIREBASE-ADMIN] SDK initialized with default credentials');
    }
    
    // Initialize storage bucket
    storageBucket = admin.storage().bucket();
    console.log('✅ [FIREBASE-ADMIN] Storage bucket initialized:', STORAGE_BUCKET);
    
  } catch (initError: any) {
    console.error('❌ [FIREBASE-ADMIN] Failed to initialize:', initError.message);
    // Minimal fallback
    adminApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'owl-fenc',
    });
    console.warn('⚠️ [FIREBASE-ADMIN] Initialized without storage (limited functionality)');
  }
}

// Get Firestore instance
firestore = adminApp.firestore();

console.log('✅ [FIREBASE-ADMIN] Firestore initialized for contract management');

// Runtime sanity check for production
if (!storageBucket) {
  console.warn('⚠️ [FIREBASE-ADMIN] Storage bucket NOT available - PDF caching will fail');
}

// Export Firestore directly as db
export const db = firestore;

// Export Firebase Admin utilities
export { admin };

// Export storage bucket for PDF operations
export const getStorageBucket = (): admin.storage.Bucket | null => storageBucket;

// Admin auth methods (simplified for development)
export const adminAuth = {
  verifyIdToken: async (token: string) => {
    // In development, just extract user ID from token
    // In production, this should use Firebase Auth
    try {
      // Simple token validation for development
      return { uid: token.split('-')[0] || 'dev-user' };
    } catch (error) {
      console.error('Error verifying token:', error);
      return { uid: 'dev-user' };
    }
  }
};