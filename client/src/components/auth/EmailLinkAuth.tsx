/**
 * 🔗 EMAIL LINK AUTHENTICATION COMPONENT
 * Passwordless authentication with magic links
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnhancedAuth } from './EnhancedAuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const EmailLinkAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { sendMagicLink } = useEnhancedAuth();
  const { toast } = useToast();

  // Check if user is completing email link sign-in
  useEffect(() => {
    const handleEmailLinkSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        try {
          setIsLoading(true);
          
          // Get email from localStorage or prompt user
          let emailForSignIn = window.localStorage.getItem('emailForSignIn');
          
          if (!emailForSignIn) {
            emailForSignIn = window.prompt(
              'Please provide your email for confirmation'
            );
          }

          if (emailForSignIn) {
            // Complete the sign-in - this is handled by the auth provider
            // The provider will handle the actual signInWithEmailLink call
            toast({
              title: "Completing Sign-in",
              description: "Processing your magic link...",
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Error completing email link sign-in:', error);
          toast({
            title: "Sign-in Error",
            description: "Unable to complete magic link sign-in. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleEmailLinkSignIn();
  }, [toast]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await sendMagicLink(email);
      setEmailSent(true);
    } catch (error: any) {
      console.error('Magic link error:', error);
      // Error handling is done in the provider
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLink = async () => {
    if (email) {
      await handleSendMagicLink({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>Magic Link Sent!</CardTitle>
          <CardDescription>
            We've sent a secure sign-in link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            <p>Check your email and click the link to sign in.</p>
            <p className="mt-2">The link will expire in 24 hours for security.</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleResendLink}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Magic Link
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              className="w-full"
            >
              Use Different Email
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Sign in with Magic Link</CardTitle>
        <CardDescription>
          Enter your email to receive a secure sign-in link. No password required.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSendMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Magic Link...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Magic Link
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-xs text-center text-gray-500">
          <p>🔒 Magic links are secure and expire after 24 hours</p>
          <p>Check your spam folder if you don't see the email</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailLinkAuth;