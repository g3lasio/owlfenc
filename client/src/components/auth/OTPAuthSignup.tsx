/**
 * 🔐 OTP REGISTRATION COMPONENT
 * Sistema independiente de registro vía OTP cuando Clerk falla
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle, ArrowLeft, Timer, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OTPAuthSignupProps {
  onSuccess: (userId: string) => void;
  onBack?: () => void;
}

const OTPAuthSignup: React.FC<OTPAuthSignupProps> = ({ onSuccess, onBack }) => {
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

  // Send OTP for new user registration
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
          isNewUser: true // ✅ CRITICAL: Indica que es registro de usuario nuevo
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOtpSent(true);
        setTimeLeft(900); // 15 minutes in seconds
        setCanResend(false);
        
        toast({
          title: "Código de registro enviado",
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
      console.error('Error sending registration OTP:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo enviar el código. Verifica tu conexión e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSend(false);
    }
  };

  // Verify OTP and create new user
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
          createNewUser: true // ✅ CRITICAL: Indica que debe crear usuario nuevo
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: result.newUser ? "¡Cuenta creada!" : "Verificación exitosa",
          description: result.message,
        });
        
        onSuccess(result.userId);
      } else {
        toast({
          title: "Error de verificación",
          description: result.message,
          variant: "destructive",
        });
        
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Error verifying registration OTP:', error);
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
    
    setIsLoadingSend(true);
    setCanResend(false);
    
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          isNewUser: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTimeLeft(900); // Reset timer
        toast({
          title: "Código reenviado",
          description: "Se ha enviado un nuevo código a tu correo.",
        });
      } else {
        toast({
          title: "Error al reenviar",
          description: result.message,
          variant: "destructive",
        });
        setCanResend(true);
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo reenviar el código.",
        variant: "destructive",
      });
      setCanResend(true);
    } finally {
      setIsLoadingSend(false);
    }
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-xl font-semibold">
          {otpSent ? 'Verificar Código' : 'Crear Cuenta'}
        </CardTitle>
        <CardDescription>
          {otpSent 
            ? `Ingresa el código de 6 dígitos enviado a ${email}`
            : 'Sistema de registro independiente por email'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          {!otpSent ? (
            // Email input form
            <motion.form
              key="email-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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
                  autoFocus
                  className="w-full"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoadingSend || !email.trim()}
              >
                {isLoadingSend ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar código de registro
                  </>
                )}
              </Button>
            </motion.form>
          ) : (
            // OTP verification form
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label>Código de Verificación</Label>
                  <div className="flex justify-center space-x-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        className="w-12 h-12 text-center text-lg font-semibold"
                        disabled={isLoadingVerify}
                      />
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoadingVerify || otp.join('').length !== 6}
                >
                  {isLoadingVerify ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Crear cuenta
                    </>
                  )}
                </Button>
              </form>

              {/* Timer and resend */}
              <div className="text-center space-y-2">
                {timeLeft > 0 ? (
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Timer className="w-4 h-4" />
                    <span>Código válido por {formatTime(timeLeft)}</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendOTP}
                    disabled={isLoadingSend || !canResend}
                    className="text-sm"
                  >
                    {isLoadingSend ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Reenviando...
                      </>
                    ) : (
                      'Reenviar código'
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back button */}
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="w-full"
            disabled={isLoadingSend || isLoadingVerify}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OTPAuthSignup;