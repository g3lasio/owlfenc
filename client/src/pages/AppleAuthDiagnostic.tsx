
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { auth, loginWithApple, toggleFirebaseMode, devMode } from "@/lib/firebase";

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

  // Cargar información de diagnóstico al iniciar
  useEffect(() => {
    // Información básica de entorno
    const envInfo = {
      isDevelopment: window.location.hostname.includes('.replit.dev') || 
                    window.location.hostname.includes('.id.repl.co') ||
                    window.location.hostname === 'localhost',
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      devMode: devMode,
      isUserAuthenticated: !!currentUser,
      firebaseConfig: {
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
      }
    };
    
    setDiagnosticInfo(envInfo);
  }, [currentUser]);

  // Iniciar proceso de autenticación con Apple
  const startAppleAuth = async () => {
    setIsLoading(true);
    setTestResults({ status: "running", message: "Iniciando autenticación con Apple..." });
    
    try {
      // Guardar información del intento para diagnóstico
      sessionStorage.setItem('appleAuth_diagnostic_start', JSON.stringify({
        timestamp: Date.now(),
        url: window.location.href,
        devMode: devMode
      }));
      
      // Intentar autenticación
      console.log("Iniciando prueba de autenticación con Apple");
      await loginWithApple();
      
      // Si llegamos aquí en modo de desarrollo, es porque se usó el usuario simulado
      if (devMode) {
        setTestResults({ 
          status: "success", 
          message: "Autenticación simulada en modo desarrollo completada con éxito",
          details: "Se usó el usuario de desarrollo. Para probar con Apple real, desactiva el modo de desarrollo."
        });
      } else {
        // En producción, esto redireccionará a Apple y no veremos este mensaje
        setTestResults({ 
          status: "running", 
          message: "Redirigiendo a Apple para autenticación...",
          details: "Si ves este mensaje por más de unos segundos, es posible que la redirección haya fallado."
        });
      }
      
    } catch (err: any) {
      console.error("Error iniciando autenticación con Apple:", err);
      
      setTestResults({ 
        status: "error", 
        message: "Error al iniciar la autenticación con Apple", 
        details: `${err.code || ""}: ${err.message || "Error desconocido"}`
      });
      
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: err.message || "Ocurrió un error al intentar autenticar con Apple"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar entre modo de desarrollo y producción
  const toggleDevMode = () => {
    toggleFirebaseMode();
    toast({
      title: "Modo cambiado",
      description: `Cambiando a modo ${devMode ? "producción" : "desarrollo"}. La página se recargará.`
    });
  };

  return (
    <div className="container py-10">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Diagnóstico de Autenticación con Apple</CardTitle>
          <CardDescription>
            Esta herramienta te permite probar y diagnosticar problemas con la autenticación de Apple.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información del entorno */}
          <div>
            <h3 className="text-lg font-medium mb-2">Información del Entorno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center justify-between bg-card border p-3 rounded-md">
                <span className="text-sm">Modo Firebase:</span>
                <Badge variant={devMode ? "outline" : "default"}>
                  {devMode ? "Desarrollo (Simulado)" : "Producción (Firebase real)"}
                </Badge>
              </div>
              <div className="flex items-center justify-between bg-card border p-3 rounded-md">
                <span className="text-sm">Hostname:</span>
                <span className="text-xs font-mono">{diagnosticInfo.hostname}</span>
              </div>
              <div className="flex items-center justify-between bg-card border p-3 rounded-md">
                <span className="text-sm">Auth Domain:</span>
                <span className="text-xs font-mono">{diagnosticInfo.firebaseConfig?.authDomain}</span>
              </div>
              <div className="flex items-center justify-between bg-card border p-3 rounded-md">
                <span className="text-sm">Proyecto ID:</span>
                <span className="text-xs font-mono">{diagnosticInfo.firebaseConfig?.projectId}</span>
              </div>
              <div className="flex items-center justify-between bg-card border p-3 rounded-md">
                <span className="text-sm">Cookies:</span>
                <Badge variant={diagnosticInfo.cookiesEnabled ? "default" : "destructive"}>
                  {diagnosticInfo.cookiesEnabled ? "Habilitadas" : "Deshabilitadas"}
                </Badge>
              </div>
              <div className="flex items-center justify-between bg-card border p-3 rounded-md">
                <span className="text-sm">Usuario autenticado:</span>
                <Badge variant={diagnosticInfo.isUserAuthenticated ? "default" : "secondary"}>
                  {diagnosticInfo.isUserAuthenticated ? "Sí" : "No"}
                </Badge>
              </div>
            </div>
            
            {/* Alerta si hay problemas evidentes */}
            {(!diagnosticInfo.cookiesEnabled || 
              (diagnosticInfo.isDevelopment && !devMode)) && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  {!diagnosticInfo.cookiesEnabled && (
                    <p>Las cookies están deshabilitadas. La autenticación OAuth requiere cookies.</p>
                  )}
                  {(diagnosticInfo.isDevelopment && !devMode) && (
                    <p>Estás en un entorno de desarrollo pero usando Firebase real. Esto puede causar problemas de dominio. Considera activar el modo de desarrollo.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <Separator />
          
          {/* Resultados de la prueba */}
          {testResults.status !== "idle" && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Resultado de la Prueba</h3>
              <Alert variant={
                testResults.status === "success" ? "default" : 
                testResults.status === "error" ? "destructive" : 
                "default"
              }>
                <div className="flex items-center gap-2 mb-2">
                  {testResults.status === "running" && (
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
                  )}
                  <span className="font-medium">{testResults.message}</span>
                </div>
                {testResults.details && (
                  <AlertDescription>
                    <p className="text-sm whitespace-pre-line">{testResults.details}</p>
                  </AlertDescription>
                )}
              </Alert>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button 
              onClick={startAppleAuth}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                  Probando...
                </>
              ) : "Probar Autenticación con Apple"}
            </Button>
            <Button 
              variant="outline" 
              onClick={toggleDevMode}
              className="w-full sm:w-auto"
            >
              Cambiar a Modo {devMode ? "Producción" : "Desarrollo"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth-diagnostic")}>
              Ver Diagnóstico General
            </Button>
            <Button variant="default" onClick={() => navigate("/login")}>
              Ir a Login
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Información para desarrolladores */}
      {currentUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de Usuario Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
              {JSON.stringify(currentUser, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
