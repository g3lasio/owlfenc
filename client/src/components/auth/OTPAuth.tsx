/**
 * 🔐 OTP AUTHENTICATION COMPONENT
 * 6-digit email OTP authentication with 15-minute expiration
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle, ArrowLeft, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OTPAuthProps {
  onSuccess: (userId: string) => void;
  onBack?: () => void;
}

const OTPAuth: React.FC<OTPAuthProps> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoadingSend, setIsLoadingSend] = useState(false);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();
  
  // Refs for OTP inputs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP expiration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Auto-focus next input
  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.slice(0, 6);
      const newOtp = [...otp];
      
      for (let i = 0; i < pastedData.length && index + i < 6; i++) {
        newOtp[index + i] = pastedData[i];
      }
      
      setOtp(newOtp);
      
      // Focus last filled input or next empty one
      const nextIndex = Math.min(index + pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      
      return;
    }

    // Single character input
    if (/^[0-9]$/.test(value) || value === '') {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email requerido",
        description: "Por favor ingresa tu correo electrónico.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingSend(true);
    
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          isNewUser: false // 🔐 SECURITY: Explicitly mark as login, not registration
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOtpSent(true);
        setTimeLeft(900); // 15 minutes in seconds
        setCanResend(false);
        
        toast({
          title: "Código enviado",
          description: result.message,
        });

        // Focus first OTP input
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else {
        toast({
          title: "Error al enviar código",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo enviar el código. Verifica tu conexión e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSend(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Por favor ingresa los 6 dígitos del código.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingVerify(true);
    
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          code: otpCode,
          createNewUser: false // 🔐 SECURITY: This is login, not registration
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Autenticación exitosa",
          description: result.message,
        });
        
        onSuccess(result.userId);
      } else {
        toast({
          title: "Código inválido",
          description: result.message,
          variant: "destructive",
        });
        
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar el código. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVerify(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setOtp(['', '', '', '', '', '']);
    setCanResend(false);
    await handleSendOTP({ preventDefault: () => {} } as React.FormEvent);
  };

  // Format time left
  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Card className="w-full">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-xl sm:text-2xl">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
            Autenticación por Email
          </CardTitle>
          <CardDescription>
            {!otpSent 
              ? "Ingresa tu correo para recibir un código de acceso"
              : "Ingresa el código de 6 dígitos enviado a tu correo"
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-6 px-4 sm:px-6">
          <AnimatePresence mode="wait">
          {!otpSent ? (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendOTP}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoadingSend}
                  className="text-center"
                />
              </div>

              <div className="flex gap-2">
                {onBack && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    disabled={isLoadingSend}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                  </Button>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoadingSend || !email.trim()}
                  className="flex-1"
                >
                  {isLoadingSend ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar Código
                    </>
                  )}
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Código enviado a:
                </p>
                <p className="font-medium text-cyan-500">{email}</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4 w-full">
                <div className="space-y-3">
                  <Label className="text-center block text-sm font-medium">Código de 6 dígitos</Label>
                  <div className="flex gap-1.5 sm:gap-2 justify-center px-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => inputRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        className="w-8 h-10 sm:w-12 sm:h-12 text-center text-base sm:text-lg font-bold flex-shrink-0"
                        disabled={isLoadingVerify}
                      />
                    ))}
                  </div>
                </div>

                {timeLeft > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Timer className="w-4 h-4" />
                      Código expira en: {formatTimeLeft(timeLeft)}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 w-full px-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOtpSent(false)}
                    disabled={isLoadingVerify}
                    className="flex-1 h-10 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Cambiar Email</span>
                    <span className="sm:hidden">Cambiar</span>
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isLoadingVerify || otp.join('').length !== 6}
                    className="flex-1 h-10 text-sm"
                  >
                    {isLoadingVerify ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                        <span className="hidden sm:inline">Verificando...</span>
                        <span className="sm:hidden">Verificando</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
                        Verificar
                      </>
                    )}
                  </Button>
                </div>

                {canResend && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center px-2"
                  >
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleResendOTP}
                      disabled={isLoadingSend}
                      className="text-cyan-500 hover:text-cyan-400 text-xs sm:text-sm"
                    >
                      {isLoadingSend ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                          <span className="hidden sm:inline">Reenviando...</span>
                          <span className="sm:hidden">Reenviando</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">¿No recibiste el código? Reenviar</span>
                          <span className="sm:hidden">Reenviar código</span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </form>
            </motion.div>
          )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default OTPAuth;