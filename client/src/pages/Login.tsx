import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { RiSendPlaneFill } from "react-icons/ri";
import { HiMail, HiPhone } from "react-icons/hi";
import { useAuth } from "@/contexts/AuthContext";
import PhoneAuth from "@/components/auth/PhoneAuth";
import EmailLinkAuth from "@/components/auth/EmailLinkAuth";

// Esquema de validación para el formulario
const loginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { login, loginWithGoogle, loginWithApple, loginWithMicrosoft, sendEmailLoginLink, error, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "emailLink" | "phone">("email");

  // Configurar el formulario
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Manejar inicio de sesión con email y contraseña
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      if (loginMethod === "email") {
        await login(data.email, data.password);
        navigate("/");
      } else if (loginMethod === "emailLink") {
        await sendEmailLoginLink(data.email);
        toast({
          title: "Enlace enviado",
          description: "Hemos enviado un enlace de inicio de sesión a tu correo electrónico.",
        });
      }
    } catch (err: any) {
      console.error("Error de inicio de sesión:", err);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: err.message || "Ocurrió un error al iniciar sesión. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar inicio de sesión con Google
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      console.error("Error de inicio de sesión con Google:", err);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: err.message || "Ocurrió un error al iniciar sesión con Google. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar inicio de sesión con Apple
  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithApple();
      navigate("/");
    } catch (err: any) {
      console.error("Error de inicio de sesión con Apple:", err);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: err.message || "Ocurrió un error al iniciar sesión con Apple. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="container mx-auto max-w-md px-4 py-8 md:py-12">
      <Card className="w-full overflow-hidden">
        <CardHeader className="px-4 py-5 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Accede a tu cuenta de Mervin
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-5 sm:px-6">
          <div className="space-y-5">
            {/* Botones de inicio de sesión con proveedores */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                type="button"
                disabled={true}
                title="Próximamente"
                className="px-4 py-2 h-auto"
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                <span>Google</span>
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={true}
                title="Próximamente"
                className="px-4 py-2 h-auto"
              >
                <FaApple className="mr-2 h-5 w-5" />
                <span>Apple</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  O continúa con
                </span>
              </div>
            </div>

            {/* Selector de método de inicio de sesión */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant={loginMethod === "email" ? "default" : "outline"}
                type="button"
                onClick={() => setLoginMethod("email")}
                className="w-full justify-start sm:justify-center"
              >
                <HiMail className="mr-2 h-4 w-4" />
                <span className="text-sm">Email y Contraseña</span>
              </Button>
              <Button
                variant={loginMethod === "emailLink" ? "default" : "outline"}
                type="button"
                onClick={() => setLoginMethod("emailLink")}
                className="w-full justify-start sm:justify-center"
              >
                <RiSendPlaneFill className="mr-2 h-4 w-4" />
                <span className="text-sm">Enlace por Email</span>
              </Button>
              <Button
                variant={loginMethod === "phone" ? "default" : "outline"}
                type="button"
                onClick={() => setLoginMethod("phone")}
                className="w-full justify-start sm:justify-center"
              >
                <HiPhone className="mr-2 h-4 w-4" />
                <span className="text-sm">Teléfono</span>
              </Button>
            </div>

            {/* Formulario de inicio de sesión */}
            {loginMethod === "email" && (
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
                      "Iniciar Sesión"
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {loginMethod === "emailLink" && (
              <div className="mt-4">
                <EmailLinkAuth 
                  onSuccess={() => {
                    toast({
                      title: "Enlace enviado",
                      description: "Se ha enviado un enlace a tu correo electrónico. Por favor, revisa tu bandeja de entrada."
                    });
                  }}
                />
              </div>
            )}

            {loginMethod === "phone" && (
              <div className="mt-4">
                <PhoneAuth 
                  onSuccess={() => navigate("/")}
                />
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            {/* Recuperación de contraseña */}
            {loginMethod === "email" && (
              <div className="text-center">
                <Button variant="link" onClick={() => navigate("/recuperar-password")}>
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center px-4 py-5 sm:px-6">
          <p className="text-sm text-muted-foreground text-center">
            ¿No tienes una cuenta?{" "}
            <Button variant="link" className="p-0 px-1" onClick={() => navigate("/signup")}>
              Regístrate
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}