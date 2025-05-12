import { useState, useEffect, useRef } from "react";
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
import { RiMailSendLine, RiEyeLine, RiEyeOffLine, RiArrowLeftLine, RiArrowRightLine, RiUserLine, RiShieldKeyholeLine, RiCheckboxCircleLine } from "react-icons/ri";
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

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

  // Mostrar efecto de congratulación después de login exitoso
  const showSuccessEffect = () => {
    setShowSuccess(true);
    
    // Reproducir sonido de éxito con tono Iron Man/Stark Industries
    const audio = new Audio();
    audio.volume = 0.3;
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAKhQCFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3Z2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2fT09PT09PT09PT09PT09PT09PT0//////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAZqAAAAAAAACoXOVK+FAAAAAAD/+xDEAAAKTEVv9BSAIrLHrj81gFBMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+xDEGQANQJV3+aQAI1QpqP81hARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+xDEPgAUZfl//msAo3glLvnNMARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+xDEWAAUTHVH+awAo5Qirfz3gBFMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+0DEggAAAZYFAAAIAAADSAAAAQAAANIAAAAAAAAA0gAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
    
    // Reproducir el audio
    audio.play().catch(e => console.log("Audio play prevented: ", e));
    
    // Ocultar el efecto después de 3 segundos
    setTimeout(() => {
      setShowSuccess(false);
      navigate("/");
    }, 3000);
  };

  // Manejar inicio de sesión con email y contraseña
  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      if (loginMethod === "email") {
        await login(data.email, data.password);
        showSuccessEffect();
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
      
      showSuccessEffect();
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
      showSuccessEffect();
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
        showSuccessEffect();
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

  // Toggle entre login y signup con efecto de escaneo Stark Tech
  const toggleAuthMode = () => {
    // Activar la transición
    setIsTransitioning(true);
    
    // Efecto de escaneo holográfico estilo Jarvis/Friday
    if (cardRef.current) {
      // Aplicar efecto de escaneo 
      cardRef.current.classList.add('stark-scan-effect');
      
      // Reproducir sonido de transición tipo UI de Iron Man (sutil)
      const audio = new Audio();
      audio.volume = 0.2;
      audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFDgCenp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6e//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAVBAAAAAAAABQ5+7pVfAAAA//tAxAAABIQTe3UQAAJ4QW/84YAkAEAQBAEAfB8H3/ggCAIB8EAQdwfggGCD4IBgg7g+D4Pg+D4IAgf///CLveKAgCAIZO4IAgCAIAgH///uCH///wnPggCAJleKAgCAIf/hAEAQ/8Jz4PwQBAMP/hAEAQBAEP////CLu4PggCAf/8IBggyvoIBggydzBB8HwfggCAf/+EAQBAEDnwQDCh4QZUuCX+DIEzSK1u4WPyuNIpNLqPQ5HBMZCcdhELhgkCpLig2CZFcUzBCt3DtAYRRJlgliYRFZ4qF2UJuJg5BoCpALShTAoO0fTdBxGwaNr5e8iFQEEGxTMjl8yrtvCJZQGPh0TyeQzcl9sbUMvcvVDTpYnCcvvgOFRsIhfE/DT3W1e+MvkNWOzHyrfOCKyxzEVWtjIm5lmYu/qpurKWaS6vIZw5LdfL53K7qqtbqVYysJV8L2pM1pLuXc3Fn8xbxE3nsZTN5qljUutm/17Ln6Rltq2/2b//tAxLEAE/YdW9mMAJOkPqz7N7ADU+26plSqVLc2qiuWwsz8rmsPSllbK6W+6mqJVy2XFspRKZvMzJXMg3i0aXy2P4vL622K8nBvFuvVktlJt9aQdI1P4rE/FVUPQVRHbEf/+lEITv9oCQIAUD/9/pv/AAD8UGACRbv6BRR//8gA//+h9//WTIIAEL0BkKFGaGdl7fxfLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLaVJZm5fy/l7Y4EEBBCwQIz+X9jgQQEEDfxTLZvKkmQAAAAAAA4c8X///////xz///////////8c////////+DP6A';
      
      // Reproducir el audio
      audio.play().catch(e => console.log("Audio play prevented: ", e));
    }
    
    // Retraso para cambiar de modo
    setTimeout(() => {
      // Cambiar entre login y signup
      setAuthMode(authMode === "login" ? "signup" : "login");
      
      // Limpiar los formularios
      loginForm.reset();
      signupForm.reset();
      setShowPassword(false);
      clearError();
      
      // Desactivar la transición después de completarla
      setTimeout(() => {
        setIsTransitioning(false);
        if (cardRef.current) {
          cardRef.current.classList.remove('stark-scan-effect');
        }
      }, 600);
    }, 400);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Fondo con efecto de gradiente */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(180,100%,10%)_0%,hsl(0,0%,7%)_70%)]"></div>
      </div>

      {/* Efecto de congratulación cuando se completa login/signup */}
      {showSuccess && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          ref={successRef}
        >
          <div className="success-container relative">
            {/* Círculos concéntricos con animación para efecto holográfico */}
            <div className="success-circle absolute inset-0 rounded-full border-2 border-primary animate-ping" style={{opacity: 0.3}}></div>
            <div className="success-circle absolute inset-0 rounded-full border border-primary animate-ping" style={{animationDelay: '0.5s', opacity: 0.4}}></div>
            <div className="success-circle absolute inset-0 rounded-full border border-primary animate-ping" style={{animationDelay: '1s', opacity: 0.5}}></div>
            
            {/* Icono y mensaje de éxito */}
            <div className="success-content w-64 h-64 flex flex-col items-center justify-center bg-black/50 rounded-full border border-primary/20 backdrop-blur-md shadow-lg">
              <RiCheckboxCircleLine className="text-primary w-20 h-20" />
              <h2 className="text-xl font-bold text-primary mt-4">¡Autenticación Exitosa!</h2>
              <p className="text-center text-muted-foreground text-sm mt-2">Redirigiendo al panel...</p>
            </div>
          </div>
        </div>
      )}

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
          ></div>
          
          <div className="absolute inset-0 flex items-stretch">
            <button 
              className={`flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-l-full transition-colors ${
                authMode === "login" ? "text-white" : "text-muted-foreground"
              }`}
              onClick={() => authMode !== "login" && toggleAuthMode()}
            >
              Login
            </button>
            <button 
              className={`flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-r-full transition-colors ${
                authMode === "signup" ? "text-white" : "text-muted-foreground"
              }`}
              onClick={() => authMode !== "signup" && toggleAuthMode()}
            >
              Signup
            </button>
          </div>
        </div>
        
        {/* Tarjeta principal con estilo Stark Industries/Iron Man */}
        <Card 
          ref={cardRef}
          className={`relative border border-primary/20 shadow-xl overflow-hidden rounded-xl backdrop-blur-sm bg-card/80 transition-all duration-500 ${
            isTransitioning ? 'stark-card-transitioning' : ''
          }`}
        >
          {/* Cabecera con efecto futurista */}
          <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-5 border-b border-primary/20 relative">
            {/* Línea de escaneo para efecto Jarvis */}
            <div className={`absolute inset-0 stark-scan-line pointer-events-none ${isTransitioning ? 'scanning' : ''}`}></div>
            
            <CardTitle className="text-2xl font-semibold text-center stark-text-glow">
              {authMode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {authMode === "login" ? "Accede a tu cuenta para continuar" : "Únete a nuestra comunidad"}
            </CardDescription>
            
            {/* Icono de estado en la esquina */}
            <div className="absolute top-4 right-4">
              {authMode === "login" ? (
                <RiShieldKeyholeLine className="h-5 w-5 text-primary stark-icon-pulse" />
              ) : (
                <RiUserLine className="h-5 w-5 text-primary stark-icon-pulse" />
              )}
            </div>
          </CardHeader>
          
          <CardContent className="px-6 py-6">
            <div className="space-y-5">
              {/* Botones de proveedor */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex items-center justify-center gap-2 border-muted-foreground/30 hover:bg-primary/10"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                >
                  <FcGoogle className="h-5 w-5" />
                  <span>Google</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex items-center justify-center gap-2 border-muted-foreground/30 hover:bg-primary/10"
                  onClick={handleAppleAuth}
                  disabled={isLoading}
                >
                  <FaApple className="h-5 w-5" />
                  <span>Apple</span>
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1 bg-muted-foreground/30" />
                <span className="text-sm text-muted-foreground">o</span>
                <Separator className="flex-1 bg-muted-foreground/30" />
              </div>

              {/* Formulario */}
              {authMode === "login" ? (
                loginMethod === "email" ? (
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="tu@email.com"
                                className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary"
                                {...field}
                                disabled={isLoading}
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
                            <div className="flex items-center justify-between">
                              <FormLabel>Contraseña</FormLabel>
                              <button
                                type="button"
                                className="text-xs text-primary/80 hover:text-primary"
                                onClick={() => navigate("/forgot-password")}
                              >
                                ¿Olvidaste tu contraseña?
                              </button>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary pr-10"
                                  {...field}
                                  disabled={isLoading}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <RiEyeOffLine className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <RiEyeLine className="h-5 w-5 text-muted-foreground" />
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
                        className="w-full h-10 bg-primary hover:bg-primary/80 text-black font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <EmailLinkAuth onToggle={() => setLoginMethod("email")} />
                )
              ) : (
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Tu nombre"
                              className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary"
                              {...field}
                              disabled={isLoading}
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
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="tu@email.com"
                              className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary"
                              {...field}
                              disabled={isLoading}
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
                                placeholder="••••••••"
                                className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary pr-10"
                                {...field}
                                disabled={isLoading}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <RiEyeOffLine className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <RiEyeLine className="h-5 w-5 text-muted-foreground" />
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
                          <FormLabel>Confirmar contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary pr-10"
                                {...field}
                                disabled={isLoading}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-10 bg-primary hover:bg-primary/80 text-black font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? "Registrando..." : "Crear cuenta"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </CardContent>

          <CardFooter className="px-6 py-4 flex items-center justify-between border-t border-primary/20 bg-muted/10">
            {authMode === "login" ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary/80"
                    onClick={() => setLoginMethod(loginMethod === "email" ? "emailLink" : "email")}
                  >
                    {loginMethod === "email" ? (
                      <>
                        <RiMailSendLine className="h-4 w-4" />
                        <span>Link mágico</span>
                      </>
                    ) : (
                      <>
                        <HiMail className="h-4 w-4" />
                        <span>Contraseña</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div></div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}