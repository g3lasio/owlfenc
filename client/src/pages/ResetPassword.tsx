import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { confirmReset } from "@/lib/firebase";

// Esquema de validación para el formulario
const resetPasswordSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  // Obtener el código de acción de la URL
  useEffect(() => {
    // Extraer el código de la URL que Firebase añade automáticamente
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    
    if (oobCode) {
      setCode(oobCode);
    } else {
      setError("No se encontró un código válido en la URL");
    }
  }, []);

  // Configurar el formulario
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Manejar restablecimiento de contraseña
  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!code) {
      setError("No hay un código de restablecimiento válido");
      return;
    }

    setIsLoading(true);
    try {
      setError(null);
      await confirmReset(code, data.password);
      
      setResetComplete(true);
      
      toast({
        title: "Contraseña restablecida",
        description: "Tu contraseña ha sido restablecida correctamente.",
      });
    } catch (err: any) {
      console.error("Error al restablecer contraseña:", err);
      setError(err.message || "Error al restablecer la contraseña. Intenta de nuevo.");
      
      toast({
        variant: "destructive",
        title: "Error al restablecer contraseña",
        description: err.message || "Ocurrió un error al restablecer tu contraseña. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Restablecer Contraseña</CardTitle>
          <CardDescription className="text-center">
            Crea una nueva contraseña para tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetComplete ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Contraseña restablecida</AlertTitle>
                <AlertDescription>
                  Tu contraseña ha sido cambiada correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
                </AlertDescription>
              </Alert>
              
              <div className="text-center mt-6">
                <Button onClick={() => navigate("/login")}>
                  Ir a Iniciar Sesión
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!code ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    El enlace de restablecimiento no es válido o ha expirado.
                  </p>
                  <Button 
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/recuperar-password")}
                  >
                    Solicitar nuevo enlace
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cambiando contraseña...
                        </span>
                      ) : (
                        "Cambiar Contraseña"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            <Button variant="link" className="p-0" onClick={() => navigate("/login")}>
              Volver a Iniciar Sesión
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}