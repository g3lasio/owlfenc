import React, { createContext, useContext } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  createdAt?: Date;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  updateUserProfile?: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, signOut: clerkSignOut } = useClerkAuth() as any;

  // Convert Clerk user to AuthUser format
  const currentUser: AuthUser | null = user ? {
    uid: user.id,
    email: user.primaryEmailAddress?.emailAddress || null,
    displayName: user.fullName || user.firstName || null,
    photoURL: user.imageUrl || null,
    isAnonymous: false,
    createdAt: user.createdAt
  } : null;

  const handleSignOut = async () => {
    try {
      await clerkSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading: !isLoaded,
    error: null,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}