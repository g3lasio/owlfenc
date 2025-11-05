/**
 * 📱 PHONE MULTI-FACTOR AUTHENTICATION COMPONENT
 * Firebase MFA enrollment for two-factor authentication
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, MessageSquare, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { auth } from '@/lib/firebase';
import {
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  sendEmailVerification,
} from 'firebase/auth';

interface PhoneAuthMFAProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PhoneAuthMFA: React.FC<PhoneAuthMFAProps> = ({ onSuccess, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  
  const { toast } = useToast();

  // Check email verification status on mount
  React.useEffect(() => {
    if (auth.currentUser) {
      setEmailVerified(auth.currentUser.emailVerified);
    }
  }, []);

  const handleSendEmailVerification = async () => {
    if (!auth.currentUser) return;
    
    try {
      setIsLoading(true);
      await sendEmailVerification(auth.currentUser);
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and click the verification link. Then refresh this page.",
      });
    } catch (error: any) {
      console.error('Email verification error:', error);
      toast({
        title: "Error Sending Email",
        description: error.message || "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+1${digits.slice(-10)}`;
    }
    return `+1${digits}`;
  };

  const initializeRecaptcha = () => {
    if (!recaptchaVerifier) {
      try {
        // Ensure the container exists
        let container = document.getElementById('recaptcha-container-mfa');
        if (!container) {
          container = document.createElement('div');
          container.id = 'recaptcha-container-mfa';
          document.body.appendChild(container);
        }

        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-mfa', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
        
        setRecaptchaVerifier(verifier);
        return verifier;
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize security verification. Please refresh the page.",
          variant: "destructive",
        });
        return null;
      }
    }
    return recaptchaVerifier;
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!/^\+1\d{10}$/.test(formattedPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid US phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!auth.currentUser) {
      toast({
        title: "Authentication Required",
        description: "You must be signed in to enable 2FA.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const verifier = initializeRecaptcha();
      if (!verifier) {
        throw new Error('Failed to initialize reCAPTCHA');
      }

      const multiFactorSession = await multiFactor(auth.currentUser).getSession();
      
      const phoneInfoOptions = {
        phoneNumber: formattedPhone,
        session: multiFactorSession,
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        verifier
      );

      setVerificationId(verificationId);
      setStep('verify');
      
      toast({
        title: "Code Sent",
        description: `Verification code sent to ${formattedPhone}`,
      });
      
    } catch (error: any) {
      console.error('Phone verification error:', error);
      
      let errorTitle = "Verification Error";
      let errorMessage = "Failed to send verification code. Please try again.";
      
      if (error.code === 'auth/unverified-email') {
        errorTitle = "Email Verification Required";
        errorMessage = "You must verify your email address before enabling Two-Factor Authentication. Please check your inbox for a verification email.";
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "Invalid phone number format. Please use a valid US number.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please wait a moment before trying again.";
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = "SMS quota exceeded. Please try again later.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorTitle = "Re-authentication Required";
        errorMessage = "For security, please sign out and sign back in before enabling 2FA.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      toast({
        title: "Verification Code Required",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    if (!auth.currentUser) {
      toast({
        title: "Authentication Required",
        description: "Session expired. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

      await multiFactor(auth.currentUser).enroll(
        multiFactorAssertion,
        'Primary Phone'
      );
      
      toast({
        title: "2FA Enabled Successfully",
        description: "Two-factor authentication has been configured for your account.",
      });

      onSuccess?.();
      
    } catch (error: any) {
      console.error('Code verification error:', error);
      
      let errorMessage = "Invalid verification code. Please try again.";
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = "The verification code is incorrect. Please check and try again.";
      } else if (error.code === 'auth/code-expired') {
        errorMessage = "The verification code has expired. Please request a new code.";
      } else if (error.code === 'auth/second-factor-already-enrolled') {
        errorMessage = "Two-factor authentication is already enabled for this account.";
      }
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    try {
      setIsLoading(true);
      
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const verifier = initializeRecaptcha();
      if (!verifier) {
        throw new Error('Failed to initialize reCAPTCHA');
      }

      const multiFactorSession = await multiFactor(auth.currentUser).getSession();
      
      const phoneInfoOptions = {
        phoneNumber: formattedPhone,
        session: multiFactorSession,
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const newVerificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        verifier
      );
      
      setVerificationId(newVerificationId);
      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your phone.",
      });
    } catch (error) {
      toast({
        title: "Resend Failed",
        description: "Could not resend code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-cyan-400">Enter Verification Code</h3>
          <p className="text-sm text-gray-400 mt-2">
            We sent a 6-digit code to {formatPhoneNumber(phoneNumber)}
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-gray-300">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              required
              disabled={isLoading}
              className="w-full text-center text-lg tracking-widest bg-gray-800 border-gray-600 text-white"
              maxLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Enable 2FA
              </>
            )}
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleResendCode}
            disabled={isLoading}
            className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </>
            ) : (
              'Resend Code'
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setStep('phone');
              setVerificationCode('');
            }}
            className="w-full text-gray-400 hover:text-white"
          >
            Use Different Number
          </Button>
        </div>

        <div className="text-xs text-center text-gray-500 space-y-1">
          <p>🔒 Code expires in 5 minutes</p>
          <p>Check that you entered the correct phone number</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mb-4">
          <Phone className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-cyan-400">Add Phone Number</h3>
        <p className="text-sm text-gray-400 mt-2">
          Enter your phone number to receive verification codes via SMS
        </p>
      </div>

      {!emailVerified && (
        <Alert variant="destructive" className="border-yellow-600 bg-yellow-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Email Verification Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>You must verify your email address before enabling Two-Factor Authentication.</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSendEmailVerification}
              disabled={isLoading}
              className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-3 w-3" />
                  Send Verification Email
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSendVerification} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              +1
            </span>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                let formatted = value;
                
                if (value.length >= 6) {
                  formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                } else if (value.length >= 3) {
                  formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                }
                
                setPhoneNumber(formatted);
              }}
              required
              disabled={isLoading}
              className="w-full pl-10 bg-gray-800 border-gray-600 text-white"
              maxLength={14}
            />
          </div>
          <p className="text-xs text-gray-500">
            US numbers only. Standard SMS rates may apply.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isLoading || phoneNumber.replace(/\D/g, '').length !== 10}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Code...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Verification Code
            </>
          )}
        </Button>
      </form>

      <div className="text-xs text-center text-gray-500 space-y-1">
        <p>🔒 We'll never share your phone number</p>
        <p>By continuing, you agree to receive SMS verification codes</p>
      </div>
    </div>
  );
};

export default PhoneAuthMFA;
