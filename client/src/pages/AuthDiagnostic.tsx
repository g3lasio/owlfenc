
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
// Firebase imports removed - using Clerk now
import { AlertCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthDiagnostic() {
  const { currentUser, login, register, logout } = useAuth();
  // Firebase config removed - using Clerk now
  const [testEmail, setTestEmail] = useState("test@example.com");
  const [testPassword, setTestPassword] = useState("password123");
  const [testName, setTestName] = useState("Usuario Prueba");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<"success" | "error" | "pending">("pending");
  const [errorMessage, setErrorMessage] = useState("");
  // Firebase mode removed - using Clerk now
  const { toast } = useToast();

  useEffect(() => {
    // Clerk auth status
    setIsAuthenticated(!!currentUser);
  }, [currentUser]);

  const handleTestLogin = async () => {
    setIsLoading(true);
    setAuthStatus("pending");
    setErrorMessage("");
    
    try {
      await login(testEmail, testPassword);
      setAuthStatus("success");
      setIsAuthenticated(true);
      toast({
        title: "Login exitoso",
        description: "Te has autenticado correctamente"
      });
    } catch (error: any) {
      console.error("Error en prueba de login:", error);
      setAuthStatus("error");
      setErrorMessage(error.message || "Error desconocido");
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: error.message || "Hubo un error al intentar autenticarte"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRegister = async () => {
    setIsLoading(true);
    setAuthStatus("pending");
    setErrorMessage("");
    
    try {
      await register(testEmail, testPassword, testName);
      setAuthStatus("success");
      setIsAuthenticated(true);
      toast({
        title: "Registro exitoso",
        description: "Te has registrado correctamente"
      });
    } catch (error: any) {
      console.error("Error en prueba de registro:", error);
      setAuthStatus("error");
      setErrorMessage(error.message || "Error desconocido");
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: error.message || "Hubo un error al intentar registrarte"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestGoogle = async () => {
    setIsLoading(true);
    setAuthStatus("pending");
    setErrorMessage("");
    
    try {
      await loginWithGoogle();
      setAuthStatus("success");
      setIsAuthenticated(true);
      toast({
        title: "Login con Google exitoso",
        description: "Te has autenticado correctamente con Google"
      });
    } catch (error: any) {
      console.error("Error en prueba de Google:", error);
      setAuthStatus("error");
      setErrorMessage(error.message || "Error desconocido");
      toast({
        variant: "destructive",
        title: "Error de autenticación con Google",
        description: error.message || "Hubo un error al intentar autenticarte con Google"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setIsAuthenticated(false);
      setAuthStatus("pending");
      toast({
        title: "Cierre de sesión exitoso",
        description: "Has cerrado sesión correctamente"
      });
    } catch (error: any) {
      console.error("Error en cierre de sesión:", error);
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: error.message || "Hubo un error al intentar cerrar sesión"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFirebaseMode = () => {
    toggleFirebaseMode();
    setUsingRealFirebase(!usingRealFirebase);
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Diagnóstico de Autenticación</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Firebase</CardTitle>
            <CardDescription>
              Estado actual de la configuración de Firebase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Modo:</span>
                <span className={`px-2 py-1 rounded text-sm ${usingRealFirebase ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                  {usingRealFirebase ? "Firebase Real" : "Desarrollo (Simulado)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">API Key:</span>
                <span className="text-muted-foreground">Clerk (Firebase disabled)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Auth Domain:</span>
                <span className="text-muted-foreground">Clerk (Firebase disabled)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Project ID:</span>
                <span className="text-muted-foreground">Clerk (Firebase disabled)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Usuario actual:</span>
                <span className="text-muted-foreground">{currentUser?.email || "No autenticado"}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                id="firebase-mode" 
                checked={usingRealFirebase}
                onCheckedChange={handleToggleFirebaseMode}
              />
              <label htmlFor="firebase-mode" className="text-sm font-medium">
                Usar Firebase Real (en lugar de simulación)
              </label>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Estado de Autenticación</CardTitle>
            <CardDescription>
              Estado actual de la sesión
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAuthenticated ? (
              <div className="space-y-4">
                <Alert className="bg-green-500/20 border-green-500/50">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle>Autenticado</AlertTitle>
                  <AlertDescription>
                    Estás autenticado como: <strong>{currentUser?.email}</strong>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium">ID de Usuario:</p>
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{currentUser?.uid}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nombre:</p>
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{currentUser?.displayName || "No disponible"}</p>
                </div>
                
                <Button variant="destructive" onClick={handleLogout} disabled={isLoading}>
                  {isLoading ? "Cerrando sesión..." : "Cerrar Sesión"}
                </Button>
              </div>
            ) : (
              <Alert className="bg-yellow-500/20 border-yellow-500/50">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertTitle>No autenticado</AlertTitle>
                <AlertDescription>
                  No has iniciado sesión. Usa las pruebas de autenticación para iniciar sesión.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pruebas de Autenticación</CardTitle>
          <CardDescription>
            Realiza pruebas de autenticación para verificar la conexión con Firebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de prueba</label>
              <input 
                type="email" 
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña de prueba</label>
              <input 
                type="password" 
                value={testPassword} 
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de prueba</label>
              <input 
                type="text" 
                value={testName} 
                onChange={(e) => setTestName(e.target.value)}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
          </div>
          
          {authStatus === "error" && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de autenticación</AlertTitle>
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="gap-4 flex flex-wrap">
          <Button onClick={handleTestLogin} disabled={isLoading}>
            {isLoading ? "Probando..." : "Probar Login"}
          </Button>
          <Button onClick={handleTestRegister} disabled={isLoading}>
            {isLoading ? "Probando..." : "Probar Registro"}
          </Button>
          <Button onClick={handleTestGoogle} disabled={isLoading}>
            {isLoading ? "Probando..." : "Probar Google"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
