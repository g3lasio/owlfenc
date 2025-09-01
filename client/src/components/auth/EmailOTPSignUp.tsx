/**
 * 📧 CLERK EMAIL OTP SIGN-UP COMPONENT
 * Implementación robusta de registro con verificación de email
 */

import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Shield, ArrowRight, CheckCircle } from 'lucide-react';

interface EmailOTPSignUpProps {
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
}

export default function EmailOTPSignUp({ onSuccess, onSwitchToSignIn }: EmailOTPSignUpProps) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle initial sign-up form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 [CLERK-SIGNUP] Iniciando registro con email:', emailAddress);

      // Start sign-up process using email and password
      await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName,
      });

      // Send verification email with OTP code
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      console.log('✅ [CLERK-SIGNUP] Email de verificación enviado');
      
      // Switch to verification form
      setVerifying(true);
      startResendCooldown();
    } catch (err: any) {
      console.error('❌ [CLERK-SIGNUP] Error:', err);
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
      console.log('🔐 [CLERK-SIGNUP] Verificando código OTP:', code);

      // Attempt to verify the email address with the provided code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        console.log('✅ [CLERK-SIGNUP] Verificación exitosa');
        
        // Set the created session as active
        await setActive({ session: completeSignUp.createdSessionId });
        
        // Call success callback
        onSuccess?.();
      } else {
        console.error('❌ [CLERK-SIGNUP] Verificación incompleta:', completeSignUp);
        setError('Verificación incompleta. Intenta nuevamente.');
      }
    } catch (err: any) {
      console.error('❌ [CLERK-SIGNUP] Error de verificación:', err);
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
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
      
      console.log('✅ [CLERK-SIGNUP] Email de verificación reenviado');
      startResendCooldown();
    } catch (err: any) {
      console.error('❌ [CLERK-SIGNUP] Error al reenviar:', err);
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

  // Show verification form after initial sign-up
  if (verifying) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Verifica tu email</CardTitle>
          <CardDescription>
            Enviamos un código de 6 dígitos a <strong>{emailAddress}</strong>
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
              <Label htmlFor="code">Código de verificación</Label>
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
                  <span>Verificar</span>
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
          
          <div className="text-center">
            <Button variant="ghost" onClick={() => setVerifying(false)}>
              ← Regresar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial sign-up form
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
        <CardDescription>
          Únete a nuestra plataforma con verificación segura por email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Tu apellido"
                required
              />
            </div>
          </div>
          
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
          
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading || !isLoaded}>
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creando cuenta...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Crear cuenta</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Button variant="ghost" onClick={onSwitchToSignIn} className="text-blue-600 hover:text-blue-800 p-0 h-auto">
              Iniciar sesión
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}