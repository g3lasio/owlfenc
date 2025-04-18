import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import { completeEmailLinkSignIn } from "@/lib/firebase";

export default function EmailLinkCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleSignIn = async () => {
      try {
        await completeEmailLinkSignIn();
        setStatus("success");
      } catch (error: any) {
        console.error("Error al completar el inicio de sesión con enlace de email:", error);
        setStatus("error");
        setErrorMessage(error.message || "Error al iniciar sesión con enlace de email");
      }
    };

    handleSignIn();
  }, []);

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {status === "loading" ? "Verificando..." : 
             status === "success" ? "¡Inicio de sesión exitoso!" : 
             "Error al iniciar sesión"}
          </CardTitle>
          <CardDescription className="text-center">
            {status === "loading" ? "Estamos procesando tu solicitud" : 
             status === "success" ? "Has iniciado sesión correctamente" : 
             "No pudimos completar el inicio de sesión"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Inicio de sesión completado</AlertTitle>
                <AlertDescription>
                  Has iniciado sesión correctamente. Ahora serás redirigido a la página principal.
                </AlertDescription>
              </Alert>
              
              <div className="text-center mt-6">
                <Button onClick={() => navigate("/")}>
                  Ir a la página principal
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error al iniciar sesión</AlertTitle>
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
              
              <div className="text-center mt-6">
                <Button onClick={() => navigate("/login")}>
                  Volver a Iniciar Sesión
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}