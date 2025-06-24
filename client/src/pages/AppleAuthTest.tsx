import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signInWithPopup, signInWithRedirect, OAuthProvider } from "firebase/auth";
import { FaApple } from "react-icons/fa";

export default function AppleAuthTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const auth = getAuth();

  const addTestResult = (step: string, status: 'success' | 'error' | 'info', message: string, details?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { step, status, message, details, timestamp }]);
  };

  const createAppleProvider = () => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return provider;
  };

  const testApplePopup = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addTestResult("1", "info", "Iniciando prueba de autenticación con Apple (Popup)", {
        domain: window.location.hostname,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100) + "..."
      });

      const provider = createAppleProvider();
      addTestResult("2", "success", "Proveedor de Apple creado correctamente");

      addTestResult("3", "info", "Intentando abrir popup de Apple...");
      
      const result = await signInWithPopup(auth, provider);
      
      addTestResult("4", "success", "¡Popup de Apple funcionó correctamente!", {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName
      });

      toast({
        title: "¡Éxito!",
        description: "La autenticación con Apple popup funciona correctamente"
      });

    } catch (error: any) {
      addTestResult("4", "error", `Error en popup: ${error.code || 'UNKNOWN'}`, {
        code: error.code,
        message: error.message,
        fullError: error.toString()
      });

      console.error("Error completo en popup:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAppleRedirect = async () => {
    setIsLoading(true);
    
    try {
      addTestResult("1", "info", "Iniciando prueba de autenticación con Apple (Redirección)");

      const provider = createAppleProvider();
      addTestResult("2", "success", "Proveedor de Apple creado para redirección");

      // Guardar información de diagnóstico antes de la redirección
      sessionStorage.setItem('appleAuth_test_redirect', JSON.stringify({
        timestamp: Date.now(),
        url: window.location.href,
        testType: 'redirect'
      }));

      addTestResult("3", "info", "Iniciando redirección a Apple... (La página se redirigirá)");
      
      await signInWithRedirect(auth, provider);
      
    } catch (error: any) {
      addTestResult("3", "error", `Error en redirección: ${error.code || 'UNKNOWN'}`, {
        code: error.code,
        message: error.message
      });

      setIsLoading(false);
    }
  };

  const testConfiguration = () => {
    addTestResult("CONFIG", "info", "Verificando configuración de Firebase");
    
    const config = {
      apiKey: auth.app.options.apiKey?.substring(0, 10) + "...",
      authDomain: auth.app.options.authDomain,
      projectId: auth.app.options.projectId,
      currentUser: auth.currentUser ? "Sí" : "No"
    };

    addTestResult("CONFIG", "success", "Configuración de Firebase obtenida", config);

    // Verificar entorno
    const environment = {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isReplit: window.location.hostname.includes('.replit.dev'),
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };

    addTestResult("ENV", "info", "Información del entorno", environment);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaApple className="h-6 w-6" />
            Diagnóstico de Autenticación con Apple
          </CardTitle>
          <CardDescription>
            Herramienta para probar y diagnosticar problemas con la autenticación de Apple ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Button 
              onClick={testConfiguration}
              variant="outline"
              className="w-full"
            >
              Verificar Configuración
            </Button>
            
            <Button 
              onClick={testApplePopup}
              disabled={isLoading}
              className="w-full"
            >
              Probar Popup
            </Button>
            
            <Button 
              onClick={testAppleRedirect}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              Probar Redirección
            </Button>
            
            <Button 
              onClick={clearResults}
              variant="destructive"
              className="w-full"
            >
              Limpiar Resultados
            </Button>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-gray-600">Procesando prueba...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de las Pruebas</CardTitle>
            <CardDescription>
              Resultados detallados de cada paso del proceso de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                      <span className="font-medium">Paso {result.step}</span>
                      <span className="text-sm text-gray-500">{result.timestamp}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        Ver detalles técnicos
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded ">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}