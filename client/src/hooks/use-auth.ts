import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

export function useAuth() {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();

  return {
    user: user ? {
      uid: user.id,
      email: user.primaryEmailAddress?.emailAddress || null,
      displayName: user.fullName || null,
      photoURL: user.imageUrl || null,
      emailVerified: user.primaryEmailAddress?.verification?.status === 'verified'
    } : null,
    loading: !isLoaded,
    error: null,
    isAuthenticated: isSignedIn
  };
}