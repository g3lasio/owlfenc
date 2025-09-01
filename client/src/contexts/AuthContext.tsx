/**
 * 🔄 COMPATIBILITY LAYER - AuthContext to Clerk Migration
 * This is a temporary adapter to make existing components work with Clerk
 * TODO: Replace all imports of this with direct Clerk usage
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

// Firebase-compatible interface for backward compatibility
interface AuthUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  error: string | null;
  // Legacy methods - will return errors encouraging migration
  login?: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  register?: (email: string, password: string, displayName: string) => Promise<AuthUser>;
  logout?: () => Promise<boolean>;
  sendPasswordResetEmail?: (email: string) => Promise<boolean>;
  sendEmailLoginLink?: (email: string) => Promise<boolean>;
  registerBiometricCredential?: () => Promise<boolean>;
  clearError?: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();

  // Convert Clerk user to Firebase-compatible format
  const currentUser: AuthUser | null = user ? {
    uid: user.id,
    email: user.primaryEmailAddress?.emailAddress || null,
    displayName: user.fullName || user.firstName || null,
    photoURL: user.imageUrl || null,
    phoneNumber: user.primaryPhoneNumber?.phoneNumber || null,
    emailVerified: user.primaryEmailAddress?.verification?.status === 'verified',
    getIdToken: async () => {
      console.warn('🔄 MIGRATION: getIdToken called on Clerk user - implement token retrieval');
      return user.id; // Temporary fallback
    }
  } : null;

  const value: AuthContextType = {
    currentUser: isSignedIn ? currentUser : null,
    loading: !isLoaded,
    error: null, // Clerk handles errors differently
    
    // Legacy methods - show migration message
    login: async (email: string, password: string, rememberMe?: boolean) => {
      console.warn('🔄 MIGRATION: Use Clerk SignIn component instead of login method');
      throw new Error('Legacy auth method deprecated - use Clerk components');
    },
    register: async (email: string, password: string, displayName: string) => {
      console.warn('🔄 MIGRATION: Use Clerk SignUp component instead of register method');
      throw new Error('Legacy auth method deprecated - use Clerk components');
    },
    logout: async () => {
      console.warn('🔄 MIGRATION: Use Clerk signOut method instead of logout');
      throw new Error('Legacy auth method deprecated - use Clerk components');
    },
    sendPasswordResetEmail: async (email: string) => {
      console.warn('🔄 MIGRATION: Password reset handled by Clerk');
      throw new Error('Password reset handled by Clerk - use Clerk components');
    },
    sendEmailLoginLink: async (email: string) => {
      console.warn('🔄 MIGRATION: Email login handled by Clerk');
      throw new Error('Email login handled by Clerk - use Clerk components');
    },
    registerBiometricCredential: async () => {
      console.warn('🔄 MIGRATION: Biometric auth needs Clerk integration');
      throw new Error('Biometric auth needs Clerk integration');
    },
    clearError: () => {
      // No-op for now
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;