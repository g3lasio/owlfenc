
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { auth, createAppleProvider, devMode } from "@/lib/firebase";
import { signInWithPopup, OAuthProvider } from "firebase/auth";

export default function AppleAuthDiagnostic() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<Record<string, any>>({});
  const [testResults, setTestResults] = useState<{
    status: "idle" | "running" | "success" | "error";
    message: string;
    details?: string;
  }>({ status: "idle", message: "" });

  useEffect(() => {
    loadDiagnosticInfo();
  }, []);

  const loadDiagnosticInfo = () => {
    // Recopilar toda la información de diagnóstico
    const diagnosticKeys = Object.keys(sessionStorage).filter(key => 
      key.startsWith('appleAuth_')
    );
    
    const info: Record<string, any> = {
      // Información básica del entorno
      timestamp: new Date().toISOString(),
      hostname: window.location.hostname,
      url: window.location.href,
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      devMode: devMode,
      
      // Configuración de Firebase
      firebaseConfig: {
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
        apiKey: auth.app.options.apiKey?.substring(0, 10) + "...",
      },
      
      // Usuario actual
      currentUser: currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName
      } : null,
      
      // Datos de sessionStorage relacionados con Apple Auth
      sessionData: {}
    };
    
    // Recuperar datos de sessionStorage
    diagnosticKeys.forEach(key => {
      try {
        const value = sessionStorage.getItem(key);
        if (value) {
          try {
            info.sessionData[key] = JSON.parse(value);
          } catch {
            info.sessionData[key] = value;
          }
        }
      } catch (e) {
        console.error(`Error procesando clave ${key}:`, e);
      }
    });
    
    setDiagnosticInfo(info);
  };

  const runAppleAuthTest = async () => {
    setIsLoading(true);
    setTestResults({ status: "running", message: "Iniciando prueba de Apple Auth..." });
    
    try {
      console.log("=== INICIANDO PRUEBA DE APPLE AUTH ===");
      
      // Guardar información del intento
      sessionStorage.setItem('appleAuth_diagnostic_test', JSON.stringify({
        timestamp: Date.now(),
        url: window.location.href
      }));
      
      // Crear proveedor de Apple
      console.log("1. Creando proveedor de Apple...");
      const appleProvider = createAppleProvider();
      
      // Configurar parámetros de test
      const testParams = {
        prompt: 'select_account',
        locale: 'es_ES',
        state: `apple-test-${Date.now()}`
      };
      
      appleProvider.setCustomParameters(testParams);
      console.log("2. Proveedor configurado con parámetros:", testParams);
      
      // Intentar autenticación con popup (para test)
      console.log("3. Intentando popup de prueba...");
      
      try {
        const result = await signInWithPopup(auth, appleProvider);
        
        setTestResults({ 
          status: "success", 
          message: "¡Prueba exitosa! Apple Auth funciona correctamente.",
          details: `Usuario autenticado: ${result.user.email} (${result.user.uid})`
        });
        
        toast({
          title: "Test exitoso",
          description: "Apple Auth funciona correctamente en tu entorno.",
        });
        
      } catch (error: any) {
        console.error("Error en prueba de Apple Auth:", error);
        
        let errorAnalysis = "Análisis del error:\n\n";
        
        if (error.code === 'auth/internal-error') {
          errorAnalysis += "• ERROR INTERNO DE FIREBASE\n";
          errorAnalysis += "• Esto indica un problema de configuración\n";
          errorAnalysis += "• Posibles causas:\n";
          errorAnalysis += "  - Configuración incorrecta en Firebase Console\n";
          errorAnalysis += "  - Apple Developer configuración problemática\n";
          errorAnalysis += "  - Dominio no autorizado correctamente\n";
          errorAnalysis += "  - Problema de red o cookies\n\n";
          errorAnalysis += "• Recomendaciones:\n";
          errorAnalysis += "  1. Verificar configuración en Firebase Console\n";
          errorAnalysis += "  2. Revisar Apple Developer Console\n";
          errorAnalysis += "  3. Comprobar dominios autorizados\n";
          errorAnalysis += "  4. Verificar configuración de cookies";
        } else if (error.code === 'auth/popup-blocked') {
          errorAnalysis += "• POPUP BLOQUEADO\n";
          errorAnalysis += "• Tu navegador está bloqueando ventanas emergentes\n";
          errorAnalysis += "• Solución: Permitir popups para este sitio";
        } else if (error.code === 'auth/popup-closed-by-user') {
          errorAnalysis += "• POPUP CERRADO POR USUARIO\n";
          errorAnalysis += "• La ventana de autenticación fue cerrada\n";
          errorAnalysis += "• Esto es normal si cerraste la ventana manualmente";
        } else if (error.code === 'auth/unauthorized-domain') {
          errorAnalysis += "• DOMINIO NO AUTORIZADO\n";
          errorAnalysis += `• El dominio '${window.location.hostname}' no está autorizado\n`;
          errorAnalysis += "• Debe agregarse en Firebase Console > Authentication > Authorized domains";
        } else {
          errorAnalysis += `• CÓDIGO DE ERROR: ${error.code || 'desconocido'}\n`;
          errorAnalysis += `• MENSAJE: ${error.message || 'No disponible'}\n`;
          errorAnalysis += "• Este es un error no catalogado específicamente";
        }
        
        setTestResults({ 
          status: "error", 
          message: `Error en la prueba: ${error.code || 'unknown'}`,
          details: errorAnalysis
        });
        
        // Guardar error para análisis
        sessionStorage.setItem('appleAuth_test_error', JSON.stringify({
          timestamp: Date.now(),
          code: error.code,
          message: error.message,
          name: error.name
        }));
      }
      
    } catch (err: any) {
      console.error("Error crítico en prueba:", err);
      setTestResults({ 
        status: "error", 
        message: "Error crítico durante la prueba",
        details: `Error: ${err.message}`
      });
    } finally {
      setIsLoading(false);
      // Recargar información de diagnóstico
      loadDiagnosticInfo();
    }
  };

  const clearDiagnosticData = () => {
    // Limpiar todos los datos de Apple Auth del sessionStorage
    const keysToRemove = Object.keys(sessionStorage).filter(key => 
      key.startsWith('appleAuth_')
    );
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    toast({
      title: "Datos limpiados",
      description: "Se han eliminado todos los datos de diagnóstico de Apple Auth.",
    });
    
    // Recargar información
    loadDiagnosticInfo();
    setTestResults({ status: "idle", message: "" });
  };

  const copyDiagnosticInfo = () => {
    const diagnosticText = JSON.stringify(diagnosticInfo, null, 2);
    navigator.clipboard.writeText(diagnosticText).then(() => {
      toast({
        title: "Información copiada",
        description: "La información de diagnóstico se ha copiado al portapapeles.",
      });
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar la información al portapapeles.",
      });
    });
  };

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/login")}
          className="mb-4"
        >
          ← Volver al login
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de Apple Auth</h1>
        <p className="text-muted-foreground">
          Herramientas para diagnosticar problemas con la autenticación de Apple
        </p>
      </div>

      <div className="grid gap-6">
        {/* Estado actual */}
        <Card>
          <CardHeader>
            <CardTitle>Estado Actual</CardTitle>
            <CardDescription>
              Información básica del sistema y usuario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Usuario actual:</label>
                <div className="text-sm">
                  {currentUser ? (
                    <Badge variant="secondary">
                      {currentUser.email} ({currentUser.uid.substring(0, 8)}...)
                    </Badge>
                  ) : (
                    <Badge variant="outline">No autenticado</Badge>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Modo de desarrollo:</label>
                <div className="text-sm">
                  <Badge variant={devMode ? "destructive" : "secondary"}>
                    {devMode ? "Desarrollo" : "Producción"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Dominio:</label>
                <div className="text-sm font-mono">{diagnosticInfo.hostname}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Cookies:</label>
                <div className="text-sm">
                  <Badge variant={diagnosticInfo.cookiesEnabled ? "secondary" : "destructive"}>
                    {diagnosticInfo.cookiesEnabled ? "Habilitadas" : "Deshabilitadas"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Firebase */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Firebase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Auth Domain:</strong> {diagnosticInfo.firebaseConfig?.authDomain}
              </div>
              <div>
                <strong>Project ID:</strong> {diagnosticInfo.firebaseConfig?.projectId}
              </div>
              <div>
                <strong>API Key:</strong> {diagnosticInfo.firebaseConfig?.apiKey}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos de sesión */}
        {Object.keys(diagnosticInfo.sessionData || {}).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Datos de Sesión de Apple Auth</CardTitle>
              <CardDescription>
                Información almacenada durante intentos de autenticación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(diagnosticInfo.sessionData || {}).map(([key, value]) => (
                  <div key={key} className="border-l-2 border-primary pl-4">
                    <div className="font-medium text-sm">{key}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prueba de Apple Auth */}
        <Card>
          <CardHeader>
            <CardTitle>Prueba de Apple Auth</CardTitle>
            <CardDescription>
              Ejecutar una prueba de autenticación con Apple para diagnosticar problemas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.status === "idle" && (
              <Alert>
                <AlertDescription>
                  Esta prueba intentará una autenticación real con Apple. Tendrás que autorizar el acceso si la prueba es exitosa.
                </AlertDescription>
              </Alert>
            )}
            
            {testResults.status === "running" && (
              <Alert>
                <AlertDescription>{testResults.message}</AlertDescription>
              </Alert>
            )}
            
            {testResults.status === "success" && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription>
                  <div className="font-semibold text-green-800">{testResults.message}</div>
                  {testResults.details && (
                    <div className="text-green-700 mt-2">{testResults.details}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {testResults.status === "error" && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription>
                  <div className="font-semibold text-red-800">{testResults.message}</div>
                  {testResults.details && (
                    <div className="text-red-700 mt-2 whitespace-pre-line">{testResults.details}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button 
              onClick={runAppleAuthTest}
              disabled={isLoading}
            >
              {isLoading ? "Ejecutando prueba..." : "Ejecutar prueba"}
            </Button>
          </CardFooter>
        </Card>

        {/* Acciones */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={copyDiagnosticInfo}
            >
              Copiar información de diagnóstico
            </Button>
            <Button 
              variant="outline" 
              onClick={clearDiagnosticData}
            >
              Limpiar datos de diagnóstico
            </Button>
            <Button 
              variant="outline" 
              onClick={loadDiagnosticInfo}
            >
              Recargar información
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
