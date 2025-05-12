import { useState, useEffect } from "react";
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
import { RiMailSendLine, RiEyeLine, RiEyeOffLine, RiArrowLeftLine, RiArrowRightLine, RiUserLine } from "react-icons/ri";
import { useAuth } from "@/contexts/AuthContext";
import EmailLinkAuth from "@/components/auth/EmailLinkAuth";

// Esquema de validación para el formulario de login
const loginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// Esquema de validación para el formulario de registro
const signupSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, register: registerUser, loginWithGoogle, loginWithApple, sendEmailLoginLink, error, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "emailLink">("email");
  const [particles, setParticles] = useState<Array<{x: number, y: number, size: number, color: string, speed: number}>>([]);

  // Generar partículas para el efecto de cambio
  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      color: `hsl(${180 + Math.random() * 30}, 100%, ${40 + Math.random() * 30}%)`,
      speed: 0.5 + Math.random() * 1.5
    }));
    setParticles(newParticles);
  }, []);

  // Configurar el formulario de login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Configurar el formulario de registro
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Manejar inicio de sesión con email y contraseña
  const onLoginSubmit = async (data: LoginFormValues) => {
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

  // Manejar registro con email y contraseña
  const onSignupSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      await registerUser(data.email, data.password, data.name);

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

  // Manejar login/registro con Google
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      console.error("Error de autenticación con Google:", err);
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: err.message || "Ocurrió un error al autenticar con Google. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar login/registro con Apple
  const handleAppleAuth = async () => {
    setIsLoading(true);
    try {
      clearError();
      const result = await loginWithApple();
      
      if (result) {
        toast({
          title: "Autenticación exitosa",
          description: "Autenticación con Apple completada",
        });
        navigate("/");
      } else {
        toast({
          title: "Redirigiendo...",
          description: "Estás siendo redirigido a Apple para autenticarte",
        });
      }
    } catch (err: any) {
      console.error("Error de autenticación con Apple:", err);
      
      let errorMessage = "Error al iniciar el proceso de autenticación con Apple. Por favor, verifica tu conexión e intenta de nuevo.";
      
      if (err.message && err.message.includes('appleid.apple.com refused to connect')) {
        errorMessage = "No se puede conectar con los servidores de Apple. Esto puede deberse a: \n" +
                      "1) El dominio no está autorizado en la consola de desarrollador de Apple, \n" +
                      "2) Hay problemas con la configuración de Sign in with Apple en Firebase, o \n" +
                      "3) Existen restricciones de red que impiden la conexión. \n\n" + 
                      "Te recomendamos usar otro método de inicio de sesión mientras resolvemos este problema.";
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = "Ventana de inicio de sesión cerrada. Por favor, intenta de nuevo.";
      }
      
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle entre login y signup con efecto de partículas
  const toggleAuthMode = () => {
    // Generar nuevas partículas para el efecto
    const newParticles = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      color: `hsl(${180 + Math.random() * 30}, 100%, ${40 + Math.random() * 30}%)`,
      speed: 0.5 + Math.random() * 1.5
    }));
    setParticles(newParticles);
    
    // Cambiar entre login y signup
    setAuthMode(authMode === "login" ? "signup" : "login");
    
    // Limpiar los formularios
    loginForm.reset();
    signupForm.reset();
    setShowPassword(false);
    clearError();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Fondo con efecto de gradiente */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(180,100%,10%)_0%,hsl(0,0%,7%)_70%)]"></div>
        
        {/* Partículas estáticas */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={`static-${i}`} 
              className="particle" 
              style={{ 
                top: `${Math.random() * 100}%`, 
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: `hsl(180, 100%, ${40 + Math.random() * 30}%)`,
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-primary">Owl Fenc</h2>
          <p className="text-sm text-muted-foreground mt-1">The AI Force Crafting the Future Skyline</p>
        </div>
        
        {/* Toggle entre login y signup */}
        <div className="relative mx-auto w-28 h-11 mb-5 z-20">
          <div 
            className="absolute inset-0 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm"
          ></div>
          
          <div 
            className="absolute top-1 bottom-1 w-[48%] bg-primary rounded-full transition-all duration-500 ease-spring shadow-lg"
            style={{ 
              left: authMode === "login" ? "2px" : "calc(52% - 2px)",
              boxShadow: "0 0 15px 2px rgba(0, 255, 255, 0.5)",
              filter: "brightness(1.1)"
            }}
          >
            {particles.map((particle, i) => (
              <div 
                key={i}
                className="absolute rounded-full animate-pulse"
                style={{
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  top: `${particle.y}%`,
                  left: `${particle.x}%`,
                  opacity: 0.7,
                  transition: `transform ${0.3 + particle.speed}s ease-out`,
                  transform: authMode === "login" ? "scale(1)" : "scale(1.5)",
                  filter: "blur(1px)"
                }}
              />
            ))}
          </div>
          
          <div className="absolute inset-0 flex items-stretch">
            <button 
              className={`flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-l-full transition-colors ${
                authMode === "login" ? "text-white" : "text-muted-foreground"
              }`}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button 
              className={`flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-r-full transition-colors ${
                authMode === "signup" ? "text-white" : "text-muted-foreground"
              }`}
              onClick={() => setAuthMode("signup")}
            >
              Signup
            </button>
          </div>
        </div>
        
        {/* Tarjeta principal */}
        <Card className="border border-primary/20 shadow-xl overflow-hidden rounded-xl backdrop-blur-sm bg-card/80">
          <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-5 border-b border-primary/20">
            <CardTitle className="text-2xl font-semibold text-center">
              {authMode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {authMode === "login" ? "Accede a tu cuenta para continuar" : "Únete a nuestra comunidad"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 py-6">
            <div className="space-y-5">
              {/* Botones de proveedor */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full h-11 rounded-lg border border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all"
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  <span>Google</span>
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleAppleAuth}
                  className="w-full h-11 rounded-lg border border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all"
                >
                  <FaApple className="mr-2 h-5 w-5" />
                  <span>Apple</span>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full border-primary/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    O {authMode === "login" ? "continúa con" : "regístrate con email"}
                  </span>
                </div>
              </div>

              {/* Contenido condicional según el modo (Login o Signup) */}
              {authMode === "login" ? (
                <>
                  {/* Toggle de métodos de login */}
                  {loginMethod === "email" && (
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correo Electrónico</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="tu@email.com" 
                                  {...field} 
                                  className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loginForm.control}
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
                                    className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
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
                          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-base mt-2"
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
                        
                        <div className="text-center">
                          <Button 
                            variant="link" 
                            onClick={() => navigate("/recuperar-password")}
                            className="text-primary hover:text-primary/80"
                          >
                            ¿Olvidaste tu contraseña?
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </>
              ) : (
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Juan Pérez" 
                              {...field} 
                              className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Electrónico</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="tu@email.com" 
                              {...field} 
                              className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signupForm.control}
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
                                className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
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

                    <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="******" 
                                {...field} 
                                className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-base mt-2"
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
              )}

              {/* Mensaje de error */}
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-900/20 p-2 rounded-lg border border-red-500/20">{error}</div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center px-6 py-5 bg-muted/20 border-t border-primary/10">
            <p className="text-sm text-muted-foreground text-center">
              {authMode === "login" ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}
              {" "}
              <Button 
                variant="link" 
                className="p-0 px-1 text-primary font-medium hover:text-primary/80" 
                onClick={toggleAuthMode}
              >
                {authMode === "login" ? "Regístrate" : "Iniciar Sesión"}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}