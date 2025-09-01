/**
 * 🔄 FIREBASE-CLERK COMPATIBILITY ADAPTER
 * 
 * This file provides compatibility exports for legacy Firebase-dependent code
 * while using Clerk as the actual authentication backend
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

console.log('🔄 [AUTH-CONFIG] Firebase-Clerk compatibility adapter loaded');

// Firebase config for legacy compatibility
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase for compatibility
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Legacy compatibility functions
export const sendVerificationEmail = async () => {
  console.warn('🔄 [CLERK-ADAPTER] sendVerificationEmail - use Clerk verification instead');
  return { success: false, message: 'Use Clerk for email verification' };
};

export const checkEmailVerification = async () => {
  console.warn('🔄 [CLERK-ADAPTER] checkEmailVerification - use Clerk verification instead');
  return { verified: false, message: 'Use Clerk for email verification' };
};

// Profile management functions for compatibility
export const getUserProfile = async (uid: string) => {
  console.warn('🔄 [FIREBASE-ADAPTER] getUserProfile called - implement Clerk profile handling');
  return null; // Return empty profile for now
};

export const saveUserProfile = async (uid: string, profile: any) => {
  console.warn('🔄 [FIREBASE-ADAPTER] saveUserProfile called - implement Clerk profile handling');
  return { success: false, message: 'Use Clerk for profile management' };
};

export const getProjects = async (uid: string) => {
  console.warn('🔄 [FIREBASE-ADAPTER] getProjects called - implement Clerk project handling');
  return []; // Return empty projects array for now
};

// Additional Firebase exports for compatibility
export { app };
export default app;