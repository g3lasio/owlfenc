import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { applyActionCode, reload, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { CheckCircle, XCircle, Loader2, Mail, ShieldCheck } from "lucide-react";

export default function EmailVerificationCallback() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationMode, setVerificationMode] = useState<'email' | 'emailLink' | 'unknown'>('unknown');

  useEffect(() => {
    const processVerification = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');
        const verified = urlParams.get('verified');
        
        console.log('📧 [EMAIL-VERIFY] Processing verification callback:', {
          mode,
          hasOobCode: !!oobCode,
          verified,
          fullUrl: window.location.href
        });

        if (isSignInWithEmailLink(auth, window.location.href)) {
          setVerificationMode('emailLink');
          
          let email = localStorage.getItem("emailForSignIn");
          
          if (!email) {
            email = window.prompt("Please enter your email to confirm verification:");
            if (!email) {
              throw new Error("Email is required to complete verification");
            }
          }
          
          await signInWithEmailLink(auth, email, window.location.href);
          localStorage.removeItem("emailForSignIn");
          
          setSuccess(true);
          toast({
            title: "Email Verified Successfully",
            description: "Your email has been verified. You can now enable 2FA.",
          });
          
          setTimeout(() => {
            navigate("/profile?tab=settings");
          }, 2000);
          return;
        }

        if (mode === 'verifyEmail' && oobCode) {
          setVerificationMode('email');
          
          console.log('📧 [EMAIL-VERIFY] Applying action code for email verification...');
          await applyActionCode(auth, oobCode);
          
          if (auth.currentUser) {
            console.log('📧 [EMAIL-VERIFY] Reloading user to update emailVerified status...');
            await reload(auth.currentUser);
          }
          
          setSuccess(true);
          toast({
            title: "Email Verified Successfully",
            description: "Your email has been verified. You can now enable Two-Factor Authentication.",
          });
          
          setTimeout(() => {
            navigate("/profile?tab=settings&emailVerified=true");
          }, 2000);
          return;
        }

        if (verified === 'true') {
          if (auth.currentUser) {
            await reload(auth.currentUser);
            
            if (auth.currentUser.emailVerified) {
              setSuccess(true);
              toast({
                title: "Email Already Verified",
                description: "Your email is verified. You can now enable 2FA.",
              });
              setTimeout(() => {
                navigate("/profile?tab=settings");
              }, 2000);
              return;
            }
          }
        }

        const otherModes = ['resetPassword', 'recoverEmail', 'revertSecondFactorAddition'];
        if (mode && otherModes.includes(mode)) {
          console.log(`📧 [EMAIL-VERIFY] Redirecting to appropriate handler for mode: ${mode}`);
          if (mode === 'resetPassword') {
            navigate(`/reset-password?oobCode=${oobCode}`);
          } else {
            setError(`This action type (${mode}) is not supported here.`);
          }
          return;
        }

        setError("Invalid verification link. The link may have expired or already been used.");
        
      } catch (err: any) {
        console.error("📧 [EMAIL-VERIFY] Error processing verification:", err);
        
        let errorMessage = "An error occurred during verification.";
        
        if (err.code === 'auth/invalid-action-code') {
          errorMessage = "This verification link is invalid or has expired. Please request a new verification email.";
        } else if (err.code === 'auth/expired-action-code') {
          errorMessage = "This verification link has expired. Please request a new verification email.";
        } else if (err.code === 'auth/user-disabled') {
          errorMessage = "Your account has been disabled. Please contact support.";
        } else if (err.code === 'auth/user-not-found') {
          errorMessage = "No account found. Please sign up first.";
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        
        toast({
          variant: "destructive",
          title: "Verification Error",
          description: errorMessage,
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processVerification();
  }, [navigate, toast]);

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be signed in to resend verification email.",
      });
      navigate("/login");
      return;
    }

    try {
      const { sendEmailVerification } = await import('firebase/auth');
      
      const actionCodeSettings = {
        url: `${window.location.origin}/email-verification-callback?verified=true`,
        handleCodeInApp: true,
      };
      
      await sendEmailVerification(auth.currentUser, actionCodeSettings);
      
      toast({
        title: "Verification Email Sent",
        description: "A new verification email has been sent. Please check your inbox.",
      });
    } catch (err: any) {
      console.error("Error resending verification:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to send verification email.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
            {isProcessing && (
              <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-full w-16 h-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            )}
            {success && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-full w-16 h-16 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            )}
            {error && !isProcessing && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-full w-16 h-16 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-2xl text-white">
            {isProcessing && "Verifying Email..."}
            {success && "Email Verified!"}
            {error && !isProcessing && "Verification Failed"}
          </CardTitle>
          
          <CardDescription className="text-gray-400">
            {isProcessing && "Please wait while we verify your email address."}
            {success && verificationMode === 'email' && "Your email has been verified. You can now enable Two-Factor Authentication."}
            {success && verificationMode === 'emailLink' && "Your email has been verified successfully."}
            {error && !isProcessing && "There was a problem verifying your email."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isProcessing && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="flex items-center space-x-2 text-gray-400">
                <Mail className="w-5 h-5" />
                <span>Processing your verification...</span>
              </div>
            </div>
          )}

          {success && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 text-green-400">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-medium">Verification Complete</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Redirecting to your profile settings...
                </p>
              </div>
              
              <Button
                onClick={() => navigate("/profile?tab=settings")}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-go-to-profile"
              >
                Go to Profile Settings
              </Button>
            </div>
          )}

          {error && !isProcessing && (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={handleResendVerification}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                  data-testid="button-resend-verification"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => navigate("/profile?tab=settings")}
                  className="w-full text-gray-400 hover:text-white"
                  data-testid="button-go-to-profile-settings"
                >
                  Go to Profile Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
