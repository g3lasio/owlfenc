/**
 * 🔐 SIMPLE CLERK AUTH FALLBACK
 * Implementación simple como fallback para errores de inicialización
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, AlertCircle } from 'lucide-react';

interface SimpleClerkAuthProps {
  onAuthSuccess?: () => void;
}

const SimpleClerkAuth: React.FC<SimpleClerkAuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simular autenticación por email
      console.log('🔧 [SIMPLE-AUTH] Intentando autenticación por email:', email);
      
      // En una implementación real, aquí haríamos la llamada a la API
      // Por ahora, simulamos éxito después de 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ [SIMPLE-AUTH] Autenticación simulada exitosa');
      onAuthSuccess?.();
      
    } catch (err) {
      console.error('❌ [SIMPLE-AUTH] Error en autenticación:', err);
      setError('Error en la autenticación. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-xl text-orange-600 dark:text-orange-400">
            Modo Fallback
          </CardTitle>
          <CardDescription>
            Sistema de autenticación alternativo activado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-6">
            <strong>Aviso:</strong> Clerk tuvo problemas inicializándose. Usando sistema alternativo.
          </div>
          
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Autenticando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Acceder con Email
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>• Sistema alternativo activado</div>
              <div>• Funcionalidad básica disponible</div>
              <div>• Contacta soporte si persiste</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleClerkAuth;