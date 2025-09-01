import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
// Firebase imports removed - using Clerk now

export default function EmailLinkCallback() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Si ya hay un usuario autenticado, redirigir a la página principal
    if (currentUser) {
      navigate("/");
      return;
    }

    const processEmailLink = async () => {
      try {
        // Email link login disabled - using Clerk now
        if (false) {
          // Obtener el correo electrónico del localStorage (guardado al enviar el enlace)
          let email = localStorage.getItem("emailForSignIn");
          
          // Si no hay un correo en localStorage, pedirlo al usuario
          if (!email) {
            email = window.prompt("Por favor, ingresa tu correo electrónico para confirmar tu inicio de sesión:");
            if (!email) {
              throw new Error("Se requiere un correo electrónico para completar el inicio de sesión");
            }
          }
          
          // Email link signin disabled with Clerk
          throw new Error("Email link signin not supported with Clerk");
          
          // Limpiar el email del localStorage
          localStorage.removeItem("emailForSignIn");
          
          // Mostrar mensaje de éxito
          setSuccess(true);
          
          toast({
            title: "Inicio de sesión exitoso",
            description: "Has iniciado sesión correctamente.",
          });
          
          // Esperar un segundo y redirigir
          setTimeout(() => {
            navigate("/");
          }, 1000);
        } else {
          setError("El enlace no es válido o ha expirado");
        }
      } catch (err: any) {
        console.error("Error al procesar el enlace de email:", err);
        setError(err.message || "Error al procesar el enlace");
        
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: err.message || "Error al procesar el enlace. Intenta de nuevo.",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processEmailLink();
  }, [currentUser, navigate, toast]);

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Verificación de correo</CardTitle>
          <CardDescription className="text-center">
            Procesando tu enlace de inicio de sesión
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
              <p className="text-muted-foreground">Verificando tu correo electrónico...</p>
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
              <p className="text-muted-foreground">{error}</p>
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
              <h3 className="font-medium text-lg">¡Verificación exitosa!</h3>
              <p className="text-muted-foreground">Tu correo ha sido verificado correctamente.</p>
              <p className="text-muted-foreground">Serás redirigido automáticamente...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}