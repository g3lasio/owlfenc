/**
 * 🔐 CLERK EMAIL OTP SIGN-IN COMPONENT
 * Implementación robusta de inicio de sesión con OTP por email
 */

import React, { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Shield, ArrowRight, CheckCircle, Lock } from 'lucide-react';

interface EmailOTPSignInProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onSwitchToPassword?: () => void;
}

export default function EmailOTPSignIn({ onSuccess, onSwitchToSignUp, onSwitchToPassword }: EmailOTPSignInProps) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle initial sign-in form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 [CLERK-SIGNIN] Iniciando sesión con email:', emailAddress);

      // Start sign-in process using email
      const { supportedFirstFactors } = await signIn.create({
        identifier: emailAddress,
      });

      // Find email_code factor
      const emailCodeFactor = supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code'
      );

      if (emailCodeFactor) {
        console.log('✅ [CLERK-SIGNIN] Factor email_code encontrado');
        
        // Prepare first factor verification (send OTP email)
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailCodeFactor.emailAddressId,
        });

        console.log('✅ [CLERK-SIGNIN] Email OTP enviado');
        
        // Switch to verification form
        setVerifying(true);
        startResendCooldown();
      } else {
        console.warn('⚠️ [CLERK-SIGNIN] No hay factor email_code disponible');
        setError('El email no está configurado para OTP. Usa contraseña o regístrate.');
      }
    } catch (err: any) {
      console.error('❌ [CLERK-SIGNIN] Error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 [CLERK-SIGNIN] Verificando código OTP:', code);

      // Attempt to verify with the provided code
      const attemptResponse = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });

      if (attemptResponse.status === 'complete') {
        console.log('✅ [CLERK-SIGNIN] Verificación exitosa');
        
        // Set the created session as active
        await setActive({ session: attemptResponse.createdSessionId });
        
        // Call success callback
        onSuccess?.();
      } else {
        console.warn('⚠️ [CLERK-SIGNIN] Verificación incompleta:', attemptResponse);
        setError('Verificación incompleta. Intenta nuevamente.');
      }
    } catch (err: any) {
      console.error('❌ [CLERK-SIGNIN] Error de verificación:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResend = async () => {
    if (!isLoaded || loading || resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      const { supportedFirstFactors } = await signIn.create({
        identifier: emailAddress,
      });

      const emailCodeFactor = supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code'
      );

      if (emailCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailCodeFactor.emailAddressId,
        });
        
        console.log('✅ [CLERK-SIGNIN] Email OTP reenviado');
        startResendCooldown();
      }
    } catch (err: any) {
      console.error('❌ [CLERK-SIGNIN] Error al reenviar:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Start cooldown for resend button
  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Get user-friendly error message
  const getErrorMessage = (err: any): string => {
    if (err?.errors?.[0]?.message) {
      return err.errors[0].message;
    }
    if (err?.message) {
      return err.message;
    }
    return 'Ocurrió un error inesperado. Intenta nuevamente.';
  };

  // Show verification form
  if (verifying) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Revisa tu email</CardTitle>
          <CardDescription>
            Enviamos un código de acceso a <strong>{emailAddress}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Label htmlFor="code">Código de acceso</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verificando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Iniciar sesión</span>
                </div>
              )}
            </Button>
          </form>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">¿No recibiste el código?</p>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="text-blue-600 hover:text-blue-800"
            >
              {resendCooldown > 0 
                ? `Reenviar en ${resendCooldown}s` 
                : 'Reenviar código'
              }
            </Button>
          </div>
          
          <div className="text-center space-y-2">
            <Button variant="ghost" onClick={() => setVerifying(false)}>
              ← Regresar
            </Button>
            {onSwitchToPassword && (
              <Button variant="ghost" onClick={onSwitchToPassword} className="text-gray-600">
                <Lock className="w-4 h-4 mr-2" />
                Usar contraseña
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial sign-in form
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
        <CardDescription>
          Accede con un código seguro enviado a tu email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="tu@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading || !isLoaded}>
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando código...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Enviar código</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        </form>
        
        <div className="text-center space-y-2">
          {onSwitchToPassword && (
            <Button variant="ghost" onClick={onSwitchToPassword} className="text-gray-600">
              <Lock className="w-4 h-4 mr-2" />
              Usar contraseña
            </Button>
          )}
          
          <p className="text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Button variant="ghost" onClick={onSwitchToSignUp} className="text-blue-600 hover:text-blue-800 p-0 h-auto">
              Crear cuenta
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}