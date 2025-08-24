/**
 * 🔐 ENHANCED AUTHENTICATION PROVIDER
 * Complete OAuth, Email, Phone authentication with security hardening
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { enhancedAuth } from '@/lib/firebase-auth-enhanced';
import { useToast } from '@/hooks/use-toast';

// 🏷️ AUTHENTICATION CONTEXT TYPES
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmailVerified: boolean;
  
  // 🌐 OAuth Methods
  signInWithGoogle: () => Promise<void>;
  
  // 📧 Email Methods
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string, displayName?: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  
  // 🔗 Magic Link Methods
  sendMagicLink: (email: string) => Promise<void>;
  
  // 📱 Phone Methods
  sendPhoneVerification: (phoneNumber: string, recaptchaElementId: string) => Promise<string>;
  verifyPhoneCode: (verificationId: string, code: string) => Promise<void>;
  
  // 🔄 Password Reset
  sendPasswordReset: (email: string) => Promise<void>;
  
  // 🔐 Security Methods
  reauthenticate: (password: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // 🚪 Sign Out
  signOut: () => Promise<void>;
  
  // 🔍 Utility
  getCurrentToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 🎯 ENHANCED AUTH PROVIDER COMPONENT
export const EnhancedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const { toast } = useToast();

  // 🔄 Authentication state management
  useEffect(() => {
    const unsubscribe = enhancedAuth.onAuthStateChange(async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // Check email verification status
        const verified = await enhancedAuth.isEmailVerified();
        setIsEmailVerified(verified);
        
        // Show verification prompt if needed
        if (!verified && user.email) {
          toast({
            title: "Email Verification Required",
            description: "Please verify your email address to access all features.",
            variant: "default",
            duration: 5000,
          });
        }
      } else {
        setIsEmailVerified(false);
      }
    });

    return unsubscribe;
  }, [toast]);

  // 🌐 OAuth Authentication
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await enhancedAuth.signInWithGoogle();
      
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Sign-in Failed",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 📧 Email Authentication
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      await enhancedAuth.signInWithEmail(email, password);
      
      toast({
        title: "Welcome Back!",
        description: "Successfully signed in.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Sign-in Failed", 
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
      throw error; // Re-throw for form handling
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true);
      await enhancedAuth.createAccount(email, password, displayName);
      
      toast({
        title: "Account Created!",
        description: "Please check your email for verification instructions.",
        variant: "default",
        duration: 7000,
      });
    } catch (error: any) {
      toast({
        title: "Account Creation Failed",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      await enhancedAuth.sendVerificationEmail();
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and click the verification link.",
        variant: "default",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send Verification",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
    }
  };

  // 🔗 Magic Link Authentication
  const sendMagicLink = async (email: string) => {
    try {
      await enhancedAuth.sendMagicLink(email);
      
      toast({
        title: "Magic Link Sent",
        description: "Check your email for the sign-in link.",
        variant: "default",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send Magic Link",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
    }
  };

  // 📱 Phone Authentication
  const sendPhoneVerification = async (phoneNumber: string, recaptchaElementId: string) => {
    try {
      const verificationId = await enhancedAuth.sendPhoneVerification(phoneNumber, recaptchaElementId);
      
      toast({
        title: "Verification Code Sent",
        description: "Please enter the code sent to your phone.",
        variant: "default",
      });
      
      return verificationId;
    } catch (error: any) {
      toast({
        title: "Phone Verification Failed",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
      throw error;
    }
  };

  const verifyPhoneCode = async (verificationId: string, code: string) => {
    try {
      await enhancedAuth.verifyPhoneCode(verificationId, code);
      
      toast({
        title: "Phone Verified",
        description: "Your phone number has been successfully verified.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // 🔄 Password Reset
  const sendPasswordReset = async (email: string) => {
    try {
      await enhancedAuth.sendPasswordResetEmail(email);
      
      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions.",
        variant: "default",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
    }
  };

  // 🔐 Security Methods
  const reauthenticate = async (password: string) => {
    try {
      await enhancedAuth.reauthenticate(password);
      
      toast({
        title: "Identity Confirmed",
        description: "You can now proceed with sensitive operations.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Re-authentication Failed",
        description: "Please check your password and try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      await enhancedAuth.getCurrentUserToken(true);
    } catch (error: any) {
      console.debug('🔧 [TOKEN-REFRESH] Token refresh failed but continuing session:', error?.code || 'network');
      // SOLUCION: NO hacer logout automático - permitir que el usuario continúe
      // El logout automático estaba causando que users fueran deslogueados al acceder estimates
      // Solo loggear el error para debugging sin afectar la experiencia del usuario
    }
  };

  // 🚪 Sign Out
  const signOut = async () => {
    try {
      await enhancedAuth.signOut();
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Sign-out Error",
        description: "There was an issue signing you out.",
        variant: "destructive",
      });
    }
  };

  // 🔍 Utility Methods
  const getCurrentToken = async (forceRefresh = false) => {
    return enhancedAuth.getCurrentUserToken(forceRefresh);
  };

  // 📝 Error Message Mapping
  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account already exists with this email address.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
      'auth/cancelled-popup-request': 'Only one sign-in popup allowed at a time.',
      'auth/invalid-verification-code': 'Invalid verification code. Please try again.',
      'auth/invalid-phone-number': 'Please enter a valid phone number.',
      'auth/quota-exceeded': 'SMS quota exceeded. Please try again later.',
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  };

  const value: AuthContextType = {
    user,
    loading,
    isEmailVerified,
    signInWithGoogle,
    signInWithEmail,
    createAccount,
    sendVerificationEmail,
    sendMagicLink,
    sendPhoneVerification,
    verifyPhoneCode,
    sendPasswordReset,
    reauthenticate,
    refreshToken,
    signOut,
    getCurrentToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 🎯 CUSTOM HOOK
export const useEnhancedAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};