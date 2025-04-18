import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaMicrosoft } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";

// Esquema de validación para el formulario
const signupSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, navigate] = useLocation();
  const { register, loginWithGoogle, loginWithApple, loginWithMicrosoft, error, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Configurar el formulario
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      nickname: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Manejar registro con email y contraseña
  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      await register(data.email, data.password, data.name);

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente.",
      });

      navigate("/");
    } catch (err: any) {
      console.error("Error de registro:", err);
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: err.message || "Ocurrió un error al registrar tu cuenta. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar registro con Google
  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      console.error("Error de registro con Google:", err);
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: err.message || "Ocurrió un error al registrarte con Google. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar registro con Apple
  const handleAppleSignup = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithApple();
      navigate("/");
    } catch (err: any) {
      console.error("Error de registro con Apple:", err);
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: err.message || "Ocurrió un error al registrarte con Apple. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar registro con Microsoft
  const handleMicrosoftSignup = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithMicrosoft();
      navigate("/");
    } catch (err: any) {
      console.error("Error de registro con Microsoft:", err);
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: err.message || "Ocurrió un error al registrarte con Microsoft. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">
            Regístrate en Mervin para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Botones de registro con proveedores */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                type="button"
                disabled={true}
                title="Próximamente"
                className="w-full"
              >
                <FcGoogle className="mr-2 h-4 w-4" />
                Google
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={true}
                title="Próximamente"
                className="w-full"
              >
                <FaApple className="mr-2 h-4 w-4" />
                Apple
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  O regístrate con email
                </span>
              </div>
            </div>

            {/* Formulario de registro */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apodo (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu apodo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
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
                      Cargando...
                    </span>
                  ) : (
                    "Crear Cuenta"
                  )}
                </Button>
              </form>
            </Form>

            {/* Mensaje de error */}
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Button variant="link" className="p-0" onClick={() => navigate("/login")}>
              Iniciar Sesión
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}