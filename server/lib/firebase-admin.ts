/**
 * FIREBASE ADMIN SDK CONFIGURATION
 * Serverless backend integration for contract management
 * 
 * CRITICAL FIX: Using Firebase Admin SDK for server-side operations
 * This ensures proper transaction handling and prevents multiple instance errors
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin only once
let adminApp: admin.app.App;
let firestore: admin.firestore.Firestore;

// Check if Firebase Admin is already initialized
try {
  // Try to get the default app
  adminApp = admin.app();
  console.log('✅ Firebase Admin SDK already initialized, reusing instance');
} catch (error) {
  // Initialize without service account (uses Application Default Credentials in production)
  adminApp = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'owl-fenc',
  });
  console.log('✅ Firebase Admin SDK initialized for contract management');
}

// Get Firestore instance
firestore = adminApp.firestore();

console.log('✅ Firebase initialized for contract management');

// Export Firestore directly as db
export const db = firestore;

// Export Firebase Admin utilities
export { admin };

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