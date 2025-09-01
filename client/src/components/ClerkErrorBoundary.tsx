/**
 * 🛡️ CLERK ERROR BOUNDARY
 * Maneja errores de carga de Clerk con fallbacks robustos
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import SimpleClerkAuth from './SimpleClerkAuth';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
  useFallback: boolean;
}

class ClerkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      useFallback: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Detectar errores específicos de inicialización de Clerk
    const isClerkInitError = error.message.includes('ClerkJS') || 
                           error.message.includes('Something went wrong initializing');
    
    return {
      hasError: true,
      error,
      retryCount: 0,
      useFallback: isClerkInitError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [CLERK-ERROR-BOUNDARY] Error capturado:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1,
      useFallback: false
    }));
    
    // Forzar recarga completa si ya han fallado varios intentos
    if (this.state.retryCount >= 2) {
      window.location.reload();
    }
  };

  handleUseFallback = () => {
    this.setState({
      hasError: false,
      useFallback: true
    });
  };

  render() {
    // Usar fallback para errores de inicialización
    if (this.state.useFallback) {
      return <SimpleClerkAuth onAuthSuccess={() => this.setState({ useFallback: false })} />;
    }

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl text-red-600 dark:text-red-400">
                Error de Autenticación
              </CardTitle>
              <CardDescription>
                Hubo un problema cargando el sistema de autenticación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <strong>Error:</strong> {this.state.error?.message || 'Error desconocido'}
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant={this.state.retryCount >= 2 ? "destructive" : "default"}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {this.state.retryCount >= 2 ? 'Recargar Página' : 'Reintentar'}
                </Button>
                
                {this.state.error?.message.includes('ClerkJS') && (
                  <Button 
                    onClick={this.handleUseFallback}
                    className="w-full"
                    variant="outline"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Usar Sistema Alternativo
                  </Button>
                )}
                
                <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Intento #{this.state.retryCount + 1} de 3
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>• Verifica tu conexión a internet</div>
                  <div>• El problema puede ser temporal</div>
                  <div>• Contacta soporte si persiste</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ClerkErrorBoundary;