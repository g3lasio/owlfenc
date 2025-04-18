import { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

// Esquema de validación para el formulario
const resetPasswordSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function RecuperarPassword() {
  const [, navigate] = useLocation();
  const { sendPasswordResetEmail, error, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Configurar el formulario
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Manejar envío de correo de recuperación
  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      await sendPasswordResetEmail(data.email);
      
      setEmailSent(true);
      
      toast({
        title: "Correo enviado",
        description: "Hemos enviado un enlace de recuperación a tu correo electrónico.",
      });
    } catch (err: any) {
      console.error("Error al enviar correo de recuperación:", err);
      toast({
        variant: "destructive",
        title: "Error al enviar correo",
        description: err.message || "Ocurrió un error al enviar el correo de recuperación. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Recuperar Contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu correo electrónico para recuperar tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Correo enviado</AlertTitle>
              <AlertDescription>
                Hemos enviado un enlace de recuperación de contraseña a tu correo electrónico.
                Por favor revisa tu bandeja de entrada y sigue las instrucciones.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Mensaje de instrucciones */}
              <p className="text-sm text-muted-foreground">
                Te enviaremos un correo electrónico con un enlace para restablecer tu contraseña.
              </p>

              {/* Formulario de recuperación */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input placeholder="tu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

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
                        Enviando...
                      </span>
                    ) : (
                      "Enviar Correo de Recuperación"
                    )}
                  </Button>
                </form>
              </Form>
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