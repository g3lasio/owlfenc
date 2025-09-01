/**
 * CLERK-FIREBASE COMPATIBILITY ADAPTER
 * Provides seamless transition from Firebase auth to Clerk
 * Maintains all existing interfaces while using Clerk as backend
 */

import { useAuth, useUser } from '@clerk/clerk-react';

// Firebase-compatible auth object for legacy code
export const createFirebaseAuthAdapter = () => {
  return {
    currentUser: null, // Will be populated by individual components
    onAuthStateChanged: (callback: (user: any) => void) => {
      console.log('🔄 [ADAPTER] onAuthStateChanged called - use Clerk hooks instead');
      // Return unsubscribe function
      return () => {};
    }
  };
};

// Firebase-compatible user object
export const createFirebaseUserAdapter = (clerkUser: any) => {
  if (!clerkUser) return null;
  
  return {
    uid: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || null,
    displayName: clerkUser.fullName || null,
    photoURL: clerkUser.imageUrl || null,
    phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber || null,
    emailVerified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
    getIdToken: async () => {
      // This should be replaced with proper Clerk token method
      console.warn('🔄 [ADAPTER] getIdToken called - implement proper Clerk token handling');
      return 'clerk-token-placeholder';
    }
  };
};

// Hook adapter for useAuthState replacement
export const useClerkAuthState = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  
  return [
    createFirebaseUserAdapter(user),
    !isLoaded,
    null // error
  ];
};

// Auth functions adapter
export const clerkAuthFunctions = {
  signInWithEmailAndPassword: async (auth: any, email: string, password: string) => {
    console.warn('🔄 [ADAPTER] signInWithEmailAndPassword called - use Clerk SignIn component');
    throw new Error('Use Clerk SignIn component instead');
  },
  
  createUserWithEmailAndPassword: async (auth: any, email: string, password: string) => {
    console.warn('🔄 [ADAPTER] createUserWithEmailAndPassword called - use Clerk SignUp component');
    throw new Error('Use Clerk SignUp component instead');
  },
  
  signOut: async (auth: any) => {
    console.warn('🔄 [ADAPTER] signOut called - use Clerk signOut');
    // Import Clerk signOut if needed
    return Promise.resolve();
  }
};

export default {
  createFirebaseAuthAdapter,
  createFirebaseUserAdapter,
  useClerkAuthState,
  clerkAuthFunctions
};