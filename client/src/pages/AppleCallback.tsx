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
    // Recuperamos información de diagnóstico guardada durante el intento de autenticación
    const attemptData = sessionStorage.getItem('appleAuth_attempt_start');
    const redirectReason = sessionStorage.getItem('appleAuth_redirect_reason');
    const popupError = sessionStorage.getItem('appleAuth_popup_error');
    
    let diagnosticData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      browserUserAgent: navigator.userAgent,
      currentURL: window.location.href,
    };
    
    if (attemptData) {
      try {
        diagnosticData.attemptData = JSON.parse(attemptData);
        console.log("Datos del intento de autenticación recuperados:", diagnosticData.attemptData);
      } catch (e) {
        console.error("Error al parsear datos del intento:", e);
      }
    }
    
    if (redirectReason) {
      diagnosticData.redirectReason = redirectReason;
      console.log("Razón de redirección:", redirectReason);
    }
    
    if (popupError) {
      try {
        diagnosticData.popupError = JSON.parse(popupError);
        console.log("Error de popup previo:", diagnosticData.popupError);
      } catch (e) {
        console.error("Error al parsear error de popup:", e);
      }
    }
    
    setDiagnosticInfo(diagnosticData);
    
    // Si ya hay un usuario autenticado, redirigir a la página principal
    if (currentUser) {
      console.log("=== USUARIO YA AUTENTICADO EN APPLE CALLBACK ===");
      console.log("UID:", currentUser.uid);
      console.log("Email:", currentUser.email);
      console.log("Nombre:", currentUser.displayName);
      navigate("/");
      return;
    }

    const processAppleRedirect = async () => {
      const auth = getAuth();
      try {
        // Logs detallados para diagnóstico
        console.log("=== DIAGNÓSTICO MEJORADO DE CALLBACK APPLE ===");
        console.log("1. Iniciando procesamiento de redirección de Apple");
        console.log("2. URL completa:", window.location.href);
        console.log("3. Navegador:", navigator.userAgent);
        console.log("4. Fecha y hora UTC:", new Date().toISOString());
        
        // Verificar todos los parámetros de la URL para diagnóstico
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        
        // Construir objeto de parámetros manualmente para evitar problemas de tipos
        const paramObj: Record<string, string> = {};
        urlParams.forEach((value, key) => {
          paramObj[key] = value;
        });
        
        // También verificamos si hay parámetros en el hash (común en OAuth)
        const hashParamObj: Record<string, string> = {};
        hashParams.forEach((value, key) => {
          hashParamObj[key] = value;
        });
        
        console.log("5. Parámetros en URL:", Object.keys(paramObj).length > 0 ? paramObj : "No hay parámetros");
        console.log("6. Parámetros en hash:", Object.keys(hashParamObj).length > 0 ? hashParamObj : "No hay parámetros en hash");
        
        // Información del auth actual
        console.log("7. Estado de autenticación:", auth.currentUser ? "Hay usuario" : "No hay usuario");
        console.log("8. Auth domain configurado:", auth.app.options.authDomain);
        
        // Obtener el resultado de la redirección con manejo mejorado de errores
        console.log("9. Obteniendo resultado de redirección...");
        let result;
        try {
          result = await getRedirectResult(auth);
          console.log("10. Resultado obtenido correctamente:", result ? "Hay resultado" : "No hay resultado");
        } catch (redirectError: any) {
          console.error("Error al obtener resultado de redirección:", redirectError);
          console.error("Código:", redirectError.code);
          console.error("Mensaje:", redirectError.message);
          
          // Algunas veces getRedirectResult falla pero aún podemos recuperar información
          if (redirectError.code === "auth/credential-already-in-use") {
            console.log("11. Credencial ya en uso, pero podemos continuar");
            // El usuario ya existe, podemos considerar esto un éxito
            setSuccess(true);
            toast({
              title: "Cuenta ya existente",
              description: "Ya tienes una cuenta con este correo electrónico.",
            });
            setTimeout(() => navigate("/"), 2000);
            return;
          }
          
          if (redirectError.code === "auth/missing-or-invalid-nonce") {
            console.log("11. Nonce inválido o faltante, podríamos intentar una reconexión manual");
          }
          
          result = null;
        }
        
        // Si hay un resultado exitoso, procesamos el usuario
        if (result && result.user) {
          console.log("11. Autenticación con Apple exitosa");
          console.log("12. UID del usuario:", result.user.uid);
          console.log("13. Email del usuario:", result.user.email);
          console.log("14. Nombre:", result.user.displayName);
          
          // Limpiar datos de diagnóstico
          sessionStorage.removeItem('appleAuth_attempt_start');
          sessionStorage.removeItem('appleAuth_redirect_reason');
          sessionStorage.removeItem('appleAuth_popup_error');
          
          setSuccess(true);
          toast({
            title: "Inicio de sesión exitoso",
            description: "Has iniciado sesión correctamente con Apple.",
          });
          
          // Redirigir después de un breve momento
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          // Si no hay resultado pero estamos en esta página, analizamos más a fondo
          console.log("11. No se encontró resultado de redirección automático");
          
          // Verificar si hay errores en la URL (formato estándar OAuth)
          const errorParam = urlParams.get('error') || hashParams.get('error');
          
          if (errorParam) {
            console.log("12. Error encontrado en parámetros:", errorParam);
            console.log("13. Descripción:", urlParams.get('error_description') || hashParams.get('error_description') || "No hay descripción");
            
            setError(`Error de autenticación: ${errorParam}`);
            setIsProcessing(false);
          } else {
            // Verificar si tenemos un código de autorización de Apple (flujo de código)
            const codeParam = urlParams.get('code') || hashParams.get('code');
            const stateParam = urlParams.get('state') || hashParams.get('state');
            const idTokenParam = urlParams.get('id_token') || hashParams.get('id_token');
            
            // Si tenemos un código de autorización, intentamos procesar manualmente
            if ((codeParam && stateParam) || idTokenParam) {
              console.log("12. Parámetros OAuth detectados:", {
                tieneCode: !!codeParam,
                tieneState: !!stateParam,
                tieneIdToken: !!idTokenParam
              });
              
              // Intento manual con token si está disponible
              if (idTokenParam) {
                console.log("13. Intentando autenticación manual con id_token");
                try {
                  // Crear un nuevo proveedor de Apple
                  const provider = new OAuthProvider('apple.com');
                  // Crear credencial manual con el token
                  const credential = provider.credential({
                    idToken: idTokenParam,
                    // Solo incluimos el nonce si existe el stateParam
                    ...(stateParam ? { rawNonce: stateParam } : {})
                  });
                  
                  // Iniciar sesión con esta credencial
                  console.log("14. Iniciando sesión con credencial manual");
                  const manualResult = await signInWithCredential(auth, credential);
                  
                  console.log("15. Autenticación manual exitosa!");
                  console.log("16. UID:", manualResult.user.uid);
                  
                  setSuccess(true);
                  toast({
                    title: "Inicio de sesión exitoso",
                    description: "Autenticación manual con Apple completada.",
                  });
                  
                  setTimeout(() => navigate("/"), 1500);
                  return;
                } catch (credError: any) {
                  console.error("Error al intentar autenticación manual:", credError);
                  console.error("Código:", credError.code);
                  console.error("Mensaje:", credError.message);
                }
              }
              
              // Si llegamos aquí, esperamos a ver si Firebase procesa automáticamente
              console.log("13. Esperando procesamiento automático de Firebase (espera extendida)");
              
              // Esperamos por más tiempo para ver si el sistema procesa la autenticación
              setTimeout(() => {
                if (!auth.currentUser) {
                  console.log("14. No se completó la autenticación automática después de 10 segundos");
                  console.log("15. Datos completos de diagnóstico:", {
                    urlActual: window.location.href,
                    codePresente: !!codeParam,
                    statePresente: !!stateParam,
                    idTokenPresente: !!idTokenParam,
                    authDomain: auth.app.options.authDomain || "No configurado",
                    projectId: auth.app.options.projectId || "No configurado",
                    cookiesHabilitadas: navigator.cookieEnabled,
                    fechaHora: new Date().toISOString(),
                    redirectReason: diagnosticData.redirectReason || "desconocido"
                  });
                  
                  // Mensaje detallado con información de diagnóstico y recomendaciones
                  setError(
                    "La autenticación con Apple no se completó correctamente. " +
                    "Diagnóstico: Recibimos el código de Apple, pero Firebase no pudo procesar la autenticación. " +
                    "\n\nPosibles causas: " +
                    "\n1. Dominio no autorizado en la consola de desarrollador de Apple" +
                    "\n2. Problema en la configuración de Firebase (authDomain: " + 
                    (auth.app.options.authDomain || "No configurado") + ")" +
                    "\n3. Restricciones de cookies de terceros en tu navegador" +
                    "\n4. La sesión de verificación puede haber expirado" +
                    "\n\nRecomendaciones:" +
                    "\n• Intenta iniciar sesión con Google u otro método" +
                    "\n• Verifica que tu navegador permite cookies de terceros" +
                    "\n• Asegúrate de completar el proceso sin demoras excesivas"
                  );
                  
                  setIsProcessing(false);
                } else {
                  // Si ya hay un usuario, significa que el procesamiento automático funcionó con retraso
                  console.log("14. Autenticación automática completada con retraso!");
                  setSuccess(true);
                  toast({
                    title: "Inicio de sesión exitoso",
                    description: "Autenticación con Apple completada con éxito.",
                  });
                  setTimeout(() => navigate("/"), 1500);
                }
              }, 10000); // Aumentamos a 10 segundos para dar más tiempo
            } else {
              // No hay información útil, mostrar error
              console.log("12. No hay información de autenticación útil en la URL");
              
              setError(
                "No se encontró información de autenticación en la URL de redirección. " +
                "Esto puede ocurrir si:\n" +
                "• La redirección desde Apple no se completó correctamente\n" +
                "• Hay un problema de configuración en Firebase o Apple\n" +
                "• Tu navegador bloqueó cookies o redirecciones necesarias\n\n" +
                "Por favor, intenta iniciar sesión nuevamente o utiliza otro método."
              );
              setIsProcessing(false);
            }
          }
        }
      } catch (err: any) {
        console.error("=== ERROR FATAL EN CALLBACK APPLE ===");
        console.error("Error al procesar la redirección de Apple:", err);
        console.error("Código:", err.code || "No disponible");
        console.error("Mensaje:", err.message || "No disponible");
        console.error("Stack:", err.stack || "No disponible");
        
        // Preparamos un mensaje de error detallado según el tipo de error
        let errorMessage = "Error al procesar la autenticación con Apple. ";
        
        if (err.code === 'auth/invalid-credential') {
          errorMessage += "La credencial proporcionada no es válida o ha expirado. Intenta iniciar sesión nuevamente.";
        } else if (err.code === 'auth/account-exists-with-different-credential') {
          errorMessage += "Ya existe una cuenta con este correo electrónico pero asociada a otro método de inicio de sesión. Intenta iniciar sesión con otro método.";
        } else if (err.code === 'auth/internal-error') {
          errorMessage += "Se produjo un error interno en el servicio de autenticación. Esto podría deberse a una configuración incorrecta entre Firebase y Apple.";
        } else if (err.code === 'auth/popup-closed-by-user') {
          errorMessage += "La ventana de autenticación fue cerrada antes de completar el proceso. Intenta nuevamente y mantén la ventana abierta.";
        } else if (err.code === 'auth/cancelled-popup-request') {
          errorMessage += "La solicitud de autenticación fue cancelada. Esto puede ocurrir si intentas iniciar sesión múltiples veces.";
        } else if (err.code === 'auth/unauthorized-domain') {
          errorMessage += "Este dominio no está autorizado para realizar autenticación con Firebase. Contacta al administrador del sistema.";
        } else if (err.message && err.message.includes('invalid_request')) {
          errorMessage += "La solicitud a Apple ID es inválida. Esto podría ser un problema con la configuración del dominio de redirección en la consola de desarrollador de Apple.";
        } else if (err.message && err.message.includes('appleid.apple.com refused to connect')) {
          errorMessage += "No se pudo establecer conexión con los servidores de Apple. Esto puede deberse a restricciones de red o a una configuración incorrecta.";
        } else {
          errorMessage += err.message || "Se produjo un error desconocido durante el proceso de autenticación.";
        }
        
        setError(errorMessage);
        setIsProcessing(false);
        
        toast({
          variant: "destructive",
          title: "Error de autenticación con Apple",
          description: "No se pudo completar el inicio de sesión. Intenta con otro método por ahora.",
        });
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
            {isProcessing ? "Procesando tu inicio de sesión con Apple ID" : 
             success ? "Autenticación completada con éxito" : 
             "Hubo un problema con la autenticación"}
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
              <p className="text-xs text-muted-foreground/70">Este proceso puede tomar unos segundos</p>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <div className="text-destructive text-5xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-lg">Ha ocurrido un problema</h3>
              <div className="text-muted-foreground whitespace-pre-line text-left max-w-md mx-auto text-sm">
                {error}
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={() => navigate("/login")} variant="outline">
                  Volver al inicio de sesión
                </Button>
                <Button onClick={() => {
                  // Intenta nuevamente el inicio de sesión con Apple, pero limpiando el estado
                  sessionStorage.removeItem('appleAuth_attempt_start');
                  sessionStorage.removeItem('appleAuth_redirect_reason');
                  sessionStorage.removeItem('appleAuth_popup_error');
                  navigate("/login");
                }}>
                  Intentar nuevamente
                </Button>
              </div>
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
              <p className="text-muted-foreground">Serás redirigido automáticamente a la aplicación...</p>
              <Button 
                onClick={() => navigate("/")} 
                className="mt-2"
              >
                Ir al inicio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}