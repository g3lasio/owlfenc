/**
 * 🔄 CLERK LOADING WRAPPER
 * Maneja estados de carga y timeouts para Clerk
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, AlertTriangle, RefreshCw } from 'lucide-react';

interface ClerkLoadingWrapperProps {
  children: ReactNode;
  timeout?: number; // Timeout en milisegundos
}

const ClerkLoadingWrapper: React.FC<ClerkLoadingWrapperProps> = ({ 
  children, 
  timeout = 15000 // 15 segundos por defecto
}) => {
  const clerk = useClerk();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Timer para timeout
    const timeoutTimer = setTimeout(() => {
      if (!clerk.loaded) {
        console.warn('⏰ [CLERK-LOADING] Timeout esperando a Clerk');
        setHasTimedOut(true);
      }
    }, timeout);

    // Verificar si Clerk ya está cargado
    if (clerk.loaded) {
      setIsLoaded(true);
      clearTimeout(timeoutTimer);
    } else {
      // Esperar a que Clerk se cargue
      const checkLoaded = setInterval(() => {
        if (clerk.loaded) {
          console.log('✅ [CLERK-LOADING] Clerk cargado exitosamente');
          setIsLoaded(true);
          clearInterval(checkLoaded);
          clearTimeout(timeoutTimer);
        }
      }, 100);

      return () => {
        clearInterval(checkLoaded);
        clearTimeout(timeoutTimer);
      };
    }

    return () => clearTimeout(timeoutTimer);
  }, [clerk.loaded, timeout, retryCount]);

  const handleRetry = () => {
    console.log('🔄 [CLERK-LOADING] Reintentando carga de Clerk...');
    setHasTimedOut(false);
    setIsLoaded(false);
    setRetryCount(prev => prev + 1);
    
    // Forzar recarga si han fallado muchos intentos
    if (retryCount >= 2) {
      window.location.reload();
    }
  };

  // Mostrar error si hay timeout
  if (hasTimedOut && !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-xl text-yellow-600 dark:text-yellow-400">
              Carga Lenta
            </CardTitle>
            <CardDescription>
              El sistema de autenticación está tardando más de lo esperado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <strong>Problema:</strong> Clerk no respondió en {timeout/1000} segundos
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleRetry}
                className="w-full"
                variant={retryCount >= 2 ? "destructive" : "default"}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {retryCount >= 2 ? 'Recargar Página' : 'Reintentar'}
              </Button>
              
              <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                Intento #{retryCount + 1} de 3
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div>• Conexión lenta detectada</div>
                <div>• Espera unos segundos más</div>
                <div>• Prueba recargar si persiste</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mostrar loading mientras se carga
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl text-blue-600 dark:text-blue-400">
              Owl Fenc AI
            </CardTitle>
            <CardDescription>
              Inicializando sistema de autenticación seguro...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Cargando Clerk...
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 animate-pulse"
                style={{ width: `${Math.min(100, (retryCount + 1) * 33)}%` }}
              />
            </div>
            
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              Configurando autenticación empresarial...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render normal cuando está cargado
  return <>{children}</>;
};

export default ClerkLoadingWrapper;