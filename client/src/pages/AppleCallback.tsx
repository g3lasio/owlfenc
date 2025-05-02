import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getAuth, getRedirectResult, OAuthProvider, signInWithCredential } from "firebase/auth";

export default function AppleCallback() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    // Si ya hay un usuario autenticado, redirigir a la página principal
    if (currentUser) {
      console.log("Usuario ya autenticado, redirigiendo a inicio", currentUser);
      navigate("/");
      return;
    }

    const processAppleRedirect = async () => {
      const auth = getAuth();
      try {
        // Logs detallados para diagnóstico
        console.log("=== DIAGNÓSTICO DE CALLBACK APPLE ===");
        console.log("1. Iniciando procesamiento de redirección de Apple");
        console.log("2. URL completa:", window.location.href);
        
        // Verificar todos los parámetros de la URL para diagnóstico
        const urlParams = new URLSearchParams(window.location.search);
        
        // Construir objeto de parámetros manualmente para evitar problemas de tipos
        const paramObj: Record<string, string> = {};
        urlParams.forEach((value, key) => {
          paramObj[key] = value;
        });
        
        console.log("3. Parámetros en URL:", Object.keys(paramObj).length > 0 ? paramObj : "No hay parámetros");
        
        // Información del auth actual
        console.log("4. Estado de autenticación:", auth.currentUser ? "Hay usuario" : "No hay usuario");
        
        // Obtener el resultado de la redirección
        console.log("5. Obteniendo resultado de redirección...");
        const result = await getRedirectResult(auth).catch(error => {
          console.error("Error procesando resultado de redirección:", error);
          return null;
        });
        
        console.log("6. Resultado de redirección:", result ? "Obtenido" : "No hay resultado");
        
        // Si hay un resultado, significa que la autenticación fue exitosa
        if (result && result.user) {
          console.log("7. Autenticación con Apple exitosa", result.user);
          console.log("8. UID del usuario:", result.user.uid);
          console.log("9. Email del usuario:", result.user.email);
          console.log("10. Nombre del usuario:", result.user.displayName);
          
          setSuccess(true);
          toast({
            title: "Inicio de sesión exitoso",
            description: "Has iniciado sesión correctamente con Apple.",
          });
          
          // Esperar un segundo y redirigir
          setTimeout(() => {
            navigate("/");
          }, 1000);
        } else {
          // Si no hay resultado pero estamos en esta página, puede haber pasado algo
          console.log("7. No se encontró resultado de redirección");
          
          // Verificar si hay errores en la URL
          const errorParam = urlParams.get('error');
          
          if (errorParam) {
            console.log("8. Error encontrado en URL:", errorParam);
            setError(`Error de autenticación: ${errorParam}`);
          } else {
            // Verificar si tenemos un código de autorización de Apple
            const codeParam = urlParams.get('code');
            const stateParam = urlParams.get('state');
            
            if (codeParam && stateParam) {
              console.log("8. Código de autorización detectado:", { 
                code: codeParam.substring(0, 10) + "...", 
                state: stateParam 
              });
              
              // Intentar procesar la autenticación manualmente 
              console.log("9. Esperando procesamiento automático de Firebase");
              
              // Esperamos un momento más para ver si el sistema procesa la autenticación
              setTimeout(() => {
                // Si después de 5 segundos seguimos sin usuario, intentamos diagnosticar más a fondo
                if (!auth.currentUser) {
                  console.log("10. No se completó la autenticación automática después de 5 segundos");
                  console.log("11. Estado de la URL de redirección:", {
                    urlActual: window.location.href,
                    codePresente: !!codeParam,
                    statePresente: !!stateParam,
                    authDomain: auth.app.options.authDomain || "No configurado",
                    projectId: auth.app.options.projectId || "No configurado"
                  });
                  
                  // Mensaje detallado con información de diagnóstico
                  setError(
                    "La autenticación con Apple no se completó correctamente. " +
                    "Diagnóstico: Recibimos el código de Apple, pero Firebase no procesa la autenticación. " +
                    "\n\nPosibles causas: " +
                    "\n1. Dominio no autorizado en la consola de Apple Developer" +
                    "\n2. Problema en la configuración de Firebase (verificar authDomain: " + 
                    (auth.app.options.authDomain || "No configurado") + ")" +
                    "\n3. Firewall o restricción de red que impide la comunicación entre servicios" +
                    "\n\nPor favor, usa otro método de inicio de sesión mientras trabajamos en resolver este problema."
                  );
                  setTimeout(() => {
                    navigate("/login");
                  }, 2000);
                }
              }, 5000);
            } else {
              // No hay información útil, redirigir al login
              console.log("8. No hay información de autenticación");
              console.log("9. Parámetros en URL:", paramObj);
              
              setError("No se encontró información de autenticación en la URL de redirección.");
              setTimeout(() => {
                navigate("/login");
              }, 2000);
            }
          }
        }
      } catch (err: any) {
        console.error("=== ERROR EN CALLBACK APPLE ===");
        console.error("Error al procesar la redirección de Apple:", err);
        console.error("Código de error:", err.code);
        console.error("Mensaje de error:", err.message);
        console.error("Error completo:", JSON.stringify(err, null, 2));
        
        setError(err.message || "Error al procesar la autenticación con Apple");
        
        // Mensajes específicos para errores comunes
        if (err.code === 'auth/invalid-credential') {
          setError("Credencial inválida. Por favor, intenta nuevamente.");
        } else if (err.code === 'auth/account-exists-with-different-credential') {
          setError("Ya existe una cuenta con este email pero con un método de inicio de sesión diferente.");
        } else if (err.code === 'auth/internal-error') {
          setError(`Error interno de autenticación (${err.code}). Es posible que la configuración de Apple ID en Firebase sea incorrecta.`);
        } else if (err.message && err.message.includes('invalid_request')) {
          setError("La solicitud a Apple ID es inválida. Esto podría ser un problema con la configuración del dominio de redirección.");
        }
        
        toast({
          variant: "destructive",
          title: "Error de autenticación con Apple",
          description: err.message || "Error al procesar la autenticación. Intenta de nuevo.",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processAppleRedirect();
  }, [currentUser, navigate, toast]);

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Autenticación con Apple</CardTitle>
          <CardDescription className="text-center">
            Procesando tu inicio de sesión con Apple ID
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          {isProcessing && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-muted-foreground">Verificando tu autenticación con Apple...</p>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <div className="text-destructive text-5xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-lg">Ha ocurrido un error</h3>
              <div className="text-muted-foreground whitespace-pre-line text-left max-w-md mx-auto">
                {error}
              </div>
              <Button onClick={() => navigate("/login")} className="mt-4">
                Volver al inicio de sesión
              </Button>
            </div>
          )}

          {success && (
            <div className="text-center space-y-4">
              <div className="text-green-500 text-5xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-medium text-lg">¡Autenticación exitosa!</h3>
              <p className="text-muted-foreground">Tu inicio de sesión con Apple ha sido verificado correctamente.</p>
              <p className="text-muted-foreground">Serás redirigido automáticamente...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}