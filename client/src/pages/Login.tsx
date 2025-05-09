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
import { FaApple } from "react-icons/fa";
import { HiMail } from "react-icons/hi";
import { RiMailSendLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailLinkAuth from "@/components/auth/EmailLinkAuth";

// Esquema de validación para el formulario
const loginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { login, loginWithGoogle, loginWithApple, sendEmailLoginLink, error, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "emailLink">("email");

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
      const result = await loginWithApple();
      
      // Si tenemos un resultado inmediato (poco probable con redirección)
      if (result) {
        toast({
          title: "Inicio de sesión exitoso",
          description: "Inicio de sesión con Apple completado",
        });
        navigate("/");
      } else {
        // Si no hay resultado, significa que se está redirigiendo
        // Mostramos un mensaje informativo
        toast({
          title: "Redirigiendo...",
          description: "Estás siendo redirigido a Apple para iniciar sesión",
        });
        // No hacemos nada más, la redirección ocurrirá automáticamente
      }
    } catch (err: any) {
      console.error("Error de inicio de sesión con Apple:", err);
      
      let errorMessage = "Error al iniciar el proceso de autenticación con Apple. Por favor, verifica tu conexión e intenta de nuevo.";
      
      // Personalizar el mensaje según el tipo de error
      if (err.message && err.message.includes('appleid.apple.com refused to connect')) {
        errorMessage = "No se puede conectar con los servidores de Apple. Esto puede deberse a: \n" +
                      "1) El dominio no está autorizado en la consola de desarrollador de Apple, \n" +
                      "2) Hay problemas con la configuración de Sign in with Apple en Firebase, o \n" +
                      "3) Existen restricciones de red que impiden la conexión. \n\n" + 
                      "Te recomendamos usar otro método de inicio de sesión mientras resolvemos este problema.";
      } else if (err.message && err.message.includes('invalid_request')) {
        errorMessage = "Error en la configuración de la autenticación con Apple. Contacta al soporte técnico.";
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = "Ventana de inicio de sesión cerrada. Por favor, intenta de nuevo.";
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = "Tu navegador bloqueó la ventana emergente. Activa las ventanas emergentes y vuelve a intentarlo.";
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = "Este dominio no está autorizado para autenticación con Apple. Contacta al soporte técnico.";
      } else if (err.code === 'auth/internal-error') {
        errorMessage = "Error interno de autenticación. Prueba usando otro método de inicio de sesión como Google o Email.";
      }
      
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="container mx-auto max-w-md px-4 py-8 md:py-12">
      <Card className="w-full overflow-hidden">
        <CardHeader className="px-4 py-5 sm:px-6">
          <CardTitle className="text-2xl sm:text-3xl text-center font-bold">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center text-lg">
            Accede a tu cuenta de Owl Fenc
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-5 sm:px-6">
          <div className="space-y-5">
            {/* Botones de inicio de sesión con proveedores */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                type="button"
                onClick={handleGoogleLogin}
                className="px-4 py-2 h-auto"
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                <span>Google</span>
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={handleAppleLogin}
                className="px-4 py-2 h-auto"
              >
                <FaApple className="mr-2 h-5 w-5" />
                <span>Iniciar con Apple</span>
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

            {/* Tabs para seleccionar método de inicio de sesión */}
            <Tabs 
              value={loginMethod} 
              onValueChange={(value) => setLoginMethod(value as "email" | "emailLink")}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="email" className="flex items-center gap-1">
                  <HiMail className="h-4 w-4" />
                  <span className="hidden sm:inline">Email y contraseña</span>
                  <span className="sm:hidden">Email</span>
                </TabsTrigger>
                <TabsTrigger value="emailLink" className="flex items-center gap-1">
                  <RiMailSendLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Sin contraseña</span>
                  <span className="sm:hidden">Link</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
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
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="******" 
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showPassword ? (
                                  <RiEyeOffLine className="h-4 w-4" />
                                ) : (
                                  <RiEyeLine className="h-4 w-4" />
                                )}
                              </button>
                            </div>
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
              </TabsContent>

              <TabsContent value="emailLink">
                <EmailLinkAuth 
                  onSuccess={() => {
                    toast({
                      title: "Enlace enviado",
                      description: "Se ha enviado un enlace a tu correo electrónico. Por favor, revisa tu bandeja de entrada."
                    });
                  }}
                />
              </TabsContent>
            </Tabs>

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