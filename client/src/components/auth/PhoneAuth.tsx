/**
 * 📱 PHONE AUTHENTICATION COMPONENT
 * SMS-based authentication with verification codes
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnhancedAuth } from './EnhancedAuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, MessageSquare } from 'lucide-react';

const PhoneAuth: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  
  const { sendPhoneVerification, verifyPhoneCode } = useEnhancedAuth();
  const { toast } = useToast();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as US phone number
    if (digits.length >= 10) {
      return `+1${digits.slice(-10)}`;
    }
    return `+1${digits}`;
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
    
    // Basic phone validation (US format)
    if (!/^\+1\d{10}$/.test(formattedPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid US phone number.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create reCAPTCHA container if it doesn't exist
      let recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        recaptchaContainer = document.createElement('div');
        recaptchaContainer.id = 'recaptcha-container';
        document.body.appendChild(recaptchaContainer);
      }

      const verificationId = await sendPhoneVerification(formattedPhone, 'recaptcha-container');
      setVerificationId(verificationId);
      setStep('verify');
      
    } catch (error: any) {
      console.error('Phone verification error:', error);
      // Error handling is done in the provider
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

    try {
      setIsLoading(true);
      await verifyPhoneCode(verificationId, verificationCode);
      // Success handling is done in the provider
    } catch (error: any) {
      console.error('Code verification error:', error);
      // Error handling is done in the provider
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    try {
      setIsLoading(true);
      const newVerificationId = await sendPhoneVerification(formattedPhone, 'recaptcha-container');
      setVerificationId(newVerificationId);
      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your phone.",
        variant: "default",
      });
    } catch (error) {
      // Error handling is done in the provider
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>Enter Verification Code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to {formatPhoneNumber(phoneNumber)}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
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
                className="w-full text-center text-lg tracking-widest"
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
                'Verify Phone Number'
              )}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleResendCode}
              disabled={isLoading}
              className="w-full"
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
              className="w-full"
            >
              Use Different Number
            </Button>
          </div>

          <div className="mt-4 text-xs text-center text-gray-500">
            <p>🔒 Code expires in 5 minutes</p>
            <p>Check that you entered the correct phone number</p>
          </div>
        </CardContent>
        
        {/* reCAPTCHA container - hidden */}
        <div id="recaptcha-container" style={{ display: 'none' }}></div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Phone className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Sign in with Phone</CardTitle>
        <CardDescription>
          Enter your phone number to receive a verification code via SMS
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSendVerification} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
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
                className="w-full pl-10"
                maxLength={14} // (555) 123-4567
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

        <div className="mt-4 text-xs text-center text-gray-500">
          <p>🔒 We'll never share your phone number</p>
          <p>By continuing, you agree to receive SMS verification codes</p>
        </div>
      </CardContent>
      
      {/* reCAPTCHA container - will be created dynamically */}
    </Card>
  );
};

export default PhoneAuth;