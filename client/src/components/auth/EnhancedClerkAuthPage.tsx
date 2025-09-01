/**
 * 🔐 ENHANCED CLERK AUTHENTICATION PAGE
 * Página moderna con opciones de email OTP y métodos tradicionales
 */

import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, Shield, Smartphone, Apple, Chrome } from 'lucide-react';
import EmailOTPSignIn from './EmailOTPSignIn';
import EmailOTPSignUp from './EmailOTPSignUp';

type AuthMode = 'signin' | 'signup';
type AuthMethod = 'otp-email' | 'traditional' | 'social';

interface EnhancedClerkAuthPageProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

const EnhancedClerkAuthPage: React.FC<EnhancedClerkAuthPageProps> = ({ 
  initialMode = 'signin',
  onSuccess 
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('otp-email');

  const handleSuccess = () => {
    console.log('✅ [CLERK-AUTH] Autenticación exitosa');
    onSuccess?.();
  };

  const handleSwitchMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Owl Fenc AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {authMode === 'signin' 
              ? 'Accede a tu cuenta de manera segura' 
              : 'Únete a nuestra plataforma inteligente'
            }
          </p>
        </div>

        {/* Authentication Method Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-lg">
              {authMode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </CardTitle>
            <CardDescription className="text-center">
              Elige tu método preferido de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMethod} onValueChange={(value) => setAuthMethod(value as AuthMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="otp-email" className="text-xs">
                  <Mail className="w-4 h-4 mr-1" />
                  Email OTP
                </TabsTrigger>
                <TabsTrigger value="traditional" className="text-xs">
                  <Lock className="w-4 h-4 mr-1" />
                  Contraseña
                </TabsTrigger>
                <TabsTrigger value="social" className="text-xs">
                  <Smartphone className="w-4 h-4 mr-1" />
                  Social
                </TabsTrigger>
              </TabsList>

              {/* Email OTP Method */}
              <TabsContent value="otp-email" className="mt-4">
                {authMode === 'signin' ? (
                  <EmailOTPSignIn
                    onSuccess={handleSuccess}
                    onSwitchToSignUp={handleSwitchMode}
                    onSwitchToPassword={() => setAuthMethod('traditional')}
                  />
                ) : (
                  <EmailOTPSignUp
                    onSuccess={handleSuccess}
                    onSwitchToSignIn={handleSwitchMode}
                  />
                )}
              </TabsContent>

              {/* Traditional Method (Clerk components) */}
              <TabsContent value="traditional" className="mt-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                      <Lock className="w-5 h-5" />
                      <span className="font-medium">Método Tradicional</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Usa email y contraseña con todas las funciones de Clerk
                    </p>
                  </div>
                  
                  {authMode === 'signin' ? (
                    <SignIn
                      routing="hash"
                      appearance={{
                        elements: {
                          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                          card: "shadow-none border-0 bg-transparent",
                          rootBox: "w-full",
                          headerTitle: "hidden",
                          headerSubtitle: "hidden",
                        }
                      }}
                    />
                  ) : (
                    <SignUp
                      routing="hash"
                      appearance={{
                        elements: {
                          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                          card: "shadow-none border-0 bg-transparent",
                          rootBox: "w-full",
                          headerTitle: "hidden",
                          headerSubtitle: "hidden",
                        }
                      }}
                    />
                  )}
                  
                  <div className="text-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => setAuthMethod('otp-email')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Usar Email OTP en su lugar
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Social Login */}
              <TabsContent value="social" className="mt-4">
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                      <Smartphone className="w-5 h-5" />
                      <span className="font-medium">Acceso Social & Biométrico</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Google, Apple ID, y autenticación biométrica disponibles
                    </p>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-12"
                      onClick={() => {
                        console.log('🔐 [CLERK-AUTH] Google OAuth iniciado');
                        // Clerk handles this automatically via SignIn/SignUp components
                      }}
                    >
                      <Chrome className="w-5 h-5 mr-2" />
                      Google
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-12"
                      onClick={() => {
                        console.log('🔐 [CLERK-AUTH] Apple ID iniciado');
                        // Clerk handles this automatically
                      }}
                    >
                      <Apple className="w-5 h-5 mr-2" />
                      Apple ID
                    </Button>
                  </div>

                  {/* Clerk Social Components */}
                  <div className="border-t pt-4">
                    {authMode === 'signin' ? (
                      <SignIn
                        routing="hash"
                        appearance={{
                          elements: {
                            formButtonPrimary: "hidden", // Hide email/password form
                            card: "shadow-none border-0 bg-transparent",
                            rootBox: "w-full",
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                            socialButtonsBlockButton: "w-full h-12 border border-gray-300 hover:bg-gray-50",
                          }
                        }}
                      />
                    ) : (
                      <SignUp
                        routing="hash"
                        appearance={{
                          elements: {
                            formButtonPrimary: "hidden", // Hide email/password form
                            card: "shadow-none border-0 bg-transparent",
                            rootBox: "w-full",
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                            socialButtonsBlockButton: "w-full h-12 border border-gray-300 hover:bg-gray-50",
                          }
                        }}
                      />
                    )}
                  </div>

                  <div className="text-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => setAuthMethod('otp-email')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Usar Email OTP
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Mode Switch */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {authMode === 'signin' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                {' '}
                <Button 
                  variant="ghost" 
                  onClick={handleSwitchMode}
                  className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium"
                >
                  {authMode === 'signin' ? 'Crear cuenta' : 'Iniciar sesión'}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>🔒 Protegido por Clerk - Autenticación empresarial</p>
          <p>✅ Email OTP • 🔐 Biométrico • 🛡️ Multi-factor</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedClerkAuthPage;