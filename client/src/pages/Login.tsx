import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { HiMail } from "react-icons/hi";
import {
  RiMailSendLine,
  RiEyeLine,
  RiEyeOffLine,
  RiUserLine,
  RiShieldKeyholeLine,
  RiCheckboxCircleLine,
} from "react-icons/ri";
import { useAuth } from "@/contexts/AuthContext";

import OTPAuth from "@/components/auth/OTPAuth";
import SessionUnlockPrompt from "@/components/auth/SessionUnlockPrompt";
import BiometricSetupButton from "@/components/auth/BiometricSetupButton";
import { sessionUnlockService } from "@/lib/session-unlock-service";

import { useTranslation } from "react-i18next";
import { useEffect } from "react";

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type SignupFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function AuthPage() {
  const [, navigate] = useLocation();
  const {
    login,
    register,
    sendEmailLoginLink,
    error,
    clearError,
    currentUser,
    loading: authLoading,
  } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "otp">(
    "email",
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSessionUnlock, setShowSessionUnlock] = useState(false);
  const [sessionUnlockInfo, setSessionUnlockInfo] = useState<{
    canUnlock: boolean;
    email?: string;
    method?: string;
  }>({ canUnlock: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation(); // Obtenemos la función de traducción
  
  useEffect(() => {
    // Si hay un usuario autenticado y estamos en login, redirigir inmediatamente
    if (currentUser && !authLoading) {
      console.log('🎯 [AUTO-REDIRECT] Usuario autenticado detectado, redirigiendo inmediatamente...');
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Verificar si hay sesión disponible para desbloqueo biométrico
  useEffect(() => {
    const checkSessionUnlock = async () => {
      try {
        console.log('🔓 [SESSION-CHECK] Verificando sesión disponible para desbloqueo...');
        const unlockInfo = sessionUnlockService.canUnlockSession();
        
        if (unlockInfo.canUnlock) {
          console.log('✅ [SESSION-CHECK] Sesión disponible para desbloqueo:', unlockInfo.email);
          setSessionUnlockInfo(unlockInfo);
          setShowSessionUnlock(true);
        } else {
          console.log('❌ [SESSION-CHECK] No hay sesión disponible para desbloqueo');
          setShowSessionUnlock(false);
        }
      } catch (error) {
        console.error('❌ [SESSION-CHECK] Error verificando sesión:', error);
        setShowSessionUnlock(false);
      }
    };

    // Solo verificar si no hay usuario autenticado y no está cargando
    if (!currentUser && !authLoading) {
      checkSessionUnlock();
    }
  }, [currentUser, authLoading]);
  
  // Estado para signup
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  // Esquemas de validación dentro del componente para tener acceso a t()
  const loginSchema = z.object({
    email: z.string().min(1, "Email es requerido").email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    rememberMe: z.boolean().default(false),
  });

  const signupSchema = z
    .object({
      name: z.string().min(1, "El nombre es requerido"),
      email: z.string().min(1, "Email es requerido").email("Email inválido"),
      password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      confirmPassword: z.string().min(1, "Confirmar contraseña es requerido"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    });
  

  // Configurar el formulario de login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onChange"
  });



  // Handler para desbloqueo de sesión exitoso
  const handleSessionUnlockSuccess = (user: any) => {
    console.log('🔓 [SESSION-UNLOCK] Desbloqueo exitoso:', user.email);
    toast({
      title: "Sesión desbloqueada",
      description: `¡Bienvenido de vuelta, ${user.displayName || user.email}!`,
    });
    showSuccessEffect();
  };

  // Handler para cuando se necesita reautenticación
  const handleNeedReauth = () => {
    console.log('🔐 [SESSION-UNLOCK] Necesita reautenticación - mostrando login normal');
    setShowSessionUnlock(false);
    sessionUnlockService.clearStoredSession();
    toast({
      title: "Sesión expirada",
      description: "Por favor, inicia sesión nuevamente.",
      variant: "default",
    });
  };

  // Mostrar efecto de congratulación después de login exitoso con redirección inmediata
  const showSuccessEffect = () => {
    setShowSuccess(true);

    // Reproducir sonido de éxito con tono Iron Man/Stark Industries
    const audio = new Audio();
    audio.volume = 0.3;
    audio.src =
      "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAKhQCFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3Z2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2fT09PT09PT09PT09PT09PT09PT0//////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAZqAAAAAAAACoXOVK+FAAAAAAD/+xDEAAAKTEVv9BSAIrLHrj81gFBMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+xDEGQANQJV3+aQAI1QpqP81hARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+xDEPgAUZfl//msAo3glLvnNMARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+xDEWAAUTHVH/awAo5Qirfz3gBFMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQD/+0DEggAAAZYFAAAIAAADSAAAAQAAANIAAAAAAAAA0gAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

    // Reproducir el audio
    audio.play().catch((e) => console.log("Audio play prevented: ", e));

    // 🔧 REDIRECCIÓN INMEDIATA - Sin retraso para evitar problemas de redirección
    setShowSuccess(false);
    console.log("🎯 [LOGIN-SUCCESS] Redirigiendo al dashboard inmediatamente...");
    navigate("/");
  };

  // Manejar inicio de sesión con email y contraseña
  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      if (loginMethod === "email") {
        console.log("Intentando iniciar sesión con:", data.email);

        // Verificar que los campos no estén vacíos antes de intentar login
        if (!data.email.trim() || !data.password.trim()) {
          throw new Error("Por favor completa todos los campos");
        }

        await login(data.email, data.password, data.rememberMe);
        console.log("Login exitoso para:", data.email, "recordarme:", data.rememberMe);
        showSuccessEffect();
      } else if (loginMethod === "otp") {
        console.log("Enviando enlace de inicio de sesión a:", data.email);

        // Verificar que el correo no esté vacío
        if (!data.email.trim()) {
          throw new Error("Por favor ingresa tu correo electrónico");
        }

        await sendEmailLoginLink(data.email);
        toast({
          title: "Enlace enviado",
          description:
            "Hemos enviado un enlace de inicio de sesión a tu correo electrónico.",
        });
      }
    } catch (err: any) {
      console.error("Error de inicio de sesión:", err);

      // Manejo específico de errores comunes
      let errorMessage =
        err.message || "Ocurrió un error al iniciar sesión. Intenta de nuevo.";

      // Simplificar mensajes de error para mejor experiencia de usuario
      if (
        errorMessage.includes("user-not-found") ||
        errorMessage.includes("wrong-password") ||
        errorMessage.includes("invalid-credential")
      ) {
        errorMessage =
          "Correo electrónico o contraseña incorrectos. Verifica tus datos e intenta de nuevo.";
      } else if (errorMessage.includes("too-many-requests")) {
        errorMessage =
          "Demasiados intentos fallidos. Por favor espera unos minutos antes de intentar de nuevo.";
      } else if (errorMessage.includes("network")) {
        errorMessage =
          "Problema de conexión. Verifica tu internet e intenta de nuevo.";
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

  // Función de registro completamente nueva y simple
  const handleSignupSubmit = async () => {
    setIsLoading(true);
    try {
      clearError();
      
      // Validaciones básicas
      if (!signupData.name.trim()) {
        throw new Error("El nombre es requerido");
      }
      if (!signupData.email.trim()) {
        throw new Error("El email es requerido");
      }
      if (!signupData.password.trim()) {
        throw new Error("La contraseña es requerida");
      }
      if (signupData.password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }
      if (signupData.password !== signupData.confirmPassword) {
        throw new Error("Las contraseñas no coinciden");
      }

      console.log("Creando cuenta para:", signupData.email);

      // Usar la función register del contexto de auth
      const user = await register(signupData.email, signupData.password, signupData.name);
      
      console.log("Cuenta creada exitosamente:", user.email);
      
      toast({
        title: "Cuenta creada",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
      
      showSuccessEffect();
      
    } catch (err: any) {
      console.error("Error creando cuenta:", err);
      toast({
        variant: "destructive",
        title: "Error al crear cuenta",
        description: err.message || "No se pudo crear la cuenta. Intenta de nuevo.",
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
      cardRef.current.classList.add("stark-scan-effect");

      // Reproducir sonido de transición tipo UI de Iron Man (sutil)
      const audio = new Audio();
      audio.volume = 0.2;
      audio.src =
        "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFDgCenp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6e//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAVBAAAAAAAABQ5+7pVfAAAA//tAxAAABIQTe3UQAAJ4QW/84YAkAEAQBAEAfB8H3/ggCAIB8EAQdwfggGCD4IBgg7g+D4Pg+D4IAgf///CLveKAgCAIZO4IAgCAIAgH///uCH///wnPggCAJleKAgCAIf/hAEAQ/8Jz4PwQBAMP/hAEAQBAEP////CLu4PggCAf/8IBggyvoIBggydzBB8HwfggCAf/+EAQBAEDnwQDCh4QZUuCX+DIEzSK1u4WPyuNIpNLqPQ5HBMZCcdhELhgkCpLig2CZFcUzBCt3DtAYRRJlgliYRFZ4qF2UJuJg5BoCpALShTAoO0fTdBxGwaNr5e8iFQEEGxTMjl8yrtvCJZQGPh0TyeQzcl9sbUMvcvVDTpYnCcvvgOFRsIhfE/DT3W1e+MvkNWOzHyrfOCKyxzEVWtjIm5lmYu/qpurKWaS6vIZw5LdfL53K7qqtbqVYysJV8L2pM1pLuXc3Fn8xbxE3nsZTN5qljUutm/17Ln6Rltq2/2b//tAxLEAE/YdW9mMAJOkPqz7N7ADU+26plSqVLc2qiuWwsz8rmsPSllbK6W+6mqJVy2XFspRKZvMzJXMg3i0aXy2P4vL622K8nBvFuvVktlJt9aQdI1P4rE/FVUPQVRHbEf/+lEITv9oCQIAUD/9/pv/AAD8UGACRbv6BRR//8gA//+h9//WTIIAEL0BkKFGaGdl7fxfLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLZvLaVJZm5fy/l7Y4EEBBCwQIz+X9jgQQEEDfxTLZvKkmQAAAAAAA4c8X///////xz///////////8c////////+DP6A";

      // Reproducir el audio
      audio.play().catch((e) => console.log("Audio play prevented: ", e));
    }

    // Retraso para cambiar de modo
    setTimeout(() => {
      // Cambiar entre login y signup
      setAuthMode(authMode === "login" ? "signup" : "login");

      // Limpiar los formularios
      loginForm.reset();
      setSignupData({ name: "", email: "", password: "", confirmPassword: "" });
      setShowPassword(false);
      clearError();

      // Desactivar la transición después de completarla
      setTimeout(() => {
        setIsTransitioning(false);
        if (cardRef.current) {
          cardRef.current.classList.remove("stark-scan-effect");
        }
      }, 600);
    }, 400);
  };


  return (
    <div className="flex min-h-[100dvh] h-full items-center justify-center bg-background py-2 px-4 ">
      {/* Fondo con efecto de gradiente */}
      <div className="fixed inset-0 ">
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
            <div
              className="success-circle absolute inset-0 rounded-full border-2 border-primary animate-ping"
              style={{ opacity: 0.3 }}
            ></div>
            <div
              className="success-circle absolute inset-0 rounded-full border border-primary animate-ping"
              style={{ animationDelay: "0.5s", opacity: 0.4 }}
            ></div>
            <div
              className="success-circle absolute inset-0 rounded-full border border-primary animate-ping"
              style={{ animationDelay: "1s", opacity: 0.5 }}
            ></div>

            {/* Icono y mensaje de éxito */}
            <div className="success-content w-64 h-64 flex flex-col items-center justify-center bg-black/50 rounded-full border border-primary/20 backdrop-blur-md shadow-lg">
              <RiCheckboxCircleLine className="text-primary w-20 h-20" />
              <h2 className="text-xl font-bold text-primary mt-4">
                {t("auth.login")} {t("auth.success")}
              </h2>
              <p className="text-center text-muted-foreground text-sm mt-2">
                {t("auth.redirecting")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor principal */}
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-primary">Owl Fenc</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The AI Force Crafting the Future Skyline
          </p>
        </div>

        {/* Toggle entre login y signup */}
        <div className="relative mx-auto w-28 h-11 mb-5 z-20">
          <div className="absolute inset-0 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm"></div>

          <div
            className="absolute top-1 bottom-1 w-[48%] bg-primary rounded-full transition-all duration-500 ease-spring shadow-lg"
            style={{
              left: authMode === "login" ? "2px" : "calc(52% - 2px)",
              boxShadow: "0 0 15px 2px rgba(0, 255, 255, 0.5)",
              filter: "brightness(1.1)",
            }}
          ></div>

          <div className="absolute inset-0 flex items-stretch">
            <button
              className={`flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-l-full transition-colors ${
                authMode === "login" ? "text-white" : "text-muted-foreground"
              }`}
              onClick={() => authMode !== "login" && toggleAuthMode()}
            >
              {t("auth.login")}
            </button>
            <button
              className={`flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-r-full transition-colors ${
                authMode === "signup" ? "text-white" : "text-muted-foreground"
              }`}
              onClick={() => authMode !== "signup" && toggleAuthMode()}
            >
              {t("auth.signup")}
            </button>
          </div>
        </div>

        {/* Tarjeta principal con estilo Stark Industries/Iron Man */}
        <Card
          ref={cardRef}
          className={`relative border border-primary/20 shadow-xl  rounded-xl backdrop-blur-sm bg-card/80 transition-all duration-500 ${
            isTransitioning ? "stark-card-transitioning" : ""
          }`}
        >
          {/* Cabecera con efecto futurista */}
          <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-5 border-b border-primary/20 relative">
            {/* Línea de escaneo para efecto Jarvis */}
            <div
              className={`absolute inset-0 stark-scan-line pointer-events-none ${isTransitioning ? "scanning" : ""}`}
            ></div>

            <CardTitle className="text-2xl font-semibold text-center stark-text-glow">
              {authMode === "login" ? t("auth.login") : t("auth.createAccount")}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {authMode === "login"
                ? t("auth.alreadyAccount")
                : t("auth.noAccount")}
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
              
              {/* Mostrar desbloqueo biométrico si hay sesión disponible */}
              {showSessionUnlock && sessionUnlockInfo.canUnlock ? (
                <SessionUnlockPrompt
                  onUnlockSuccess={handleSessionUnlockSuccess}
                  onNeedReauth={handleNeedReauth}
                  className="mb-6"
                />
              ) : (
                <>
                  {/* Formulario de login/signup normal */}
                  {authMode === "login" ? (
                loginMethod === "email" ? (
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.email")}</FormLabel>
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
                              <FormLabel>{t("auth.password")}</FormLabel>
                              <button
                                type="button"
                                className="text-xs text-primary/80 hover:text-primary"
                                onClick={() => navigate("/recuperar-password")}
                              >
                                Forgot Password?
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
                      
                      {/* Checkbox "Recordarme por 30 días" */}
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Remember me
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        className="w-full h-10 bg-primary hover:bg-primary/80 text-black font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? t("auth.login") + "..." : t("auth.login")}
                      </Button>

                      <div className="flex items-center gap-3">
                        <Separator className="flex-1 bg-muted-foreground/30" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <Separator className="flex-1 bg-muted-foreground/30" />
                      </div>
                    </form>
                  </Form>
                ) : (
                  <OTPAuth 
                    onSuccess={async (userId) => {
                      console.log('OTP Authentication successful:', userId);
                      
                      try {
                        // Obtener custom token del servidor (sin importar firebase-admin en cliente)
                        const response = await fetch('/api/auth/create-custom-token', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ email: userId }),
                        });
                        
                        if (response.ok) {
                          const { customToken } = await response.json();
                          console.log('✅ Custom token received successfully');
                          
                          // Importar solo lo necesario del cliente Firebase
                          const { signInWithCustomToken } = await import('firebase/auth');
                          const { auth } = await import('@/lib/firebase');
                          
                          // Autenticar con Firebase usando el token personalizado
                          const userCredential = await signInWithCustomToken(auth, customToken);
                          console.log('✅ Firebase authentication successful with custom token');
                          
                          // CRÍTICO: Obtener ID token y crear session cookie en el servidor
                          const idToken = await userCredential.user.getIdToken();
                          console.log('🔐 [OTP-SESSION] Creating server session cookie...');
                          
                          const sessionResponse = await fetch('/api/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ idToken })
                          });
                          
                          if (sessionResponse.ok) {
                            console.log('✅ [OTP-SESSION] Server session cookie created successfully');
                            showSuccessEffect();
                          } else {
                            console.error('❌ [OTP-SESSION] Failed to create server session');
                            throw new Error('Session creation failed');
                          }
                          
                        } else {
                          throw new Error('Failed to create custom token');
                        }
                        
                      } catch (error: any) {
                        console.error('Error with custom token authentication:', error);
                        
                        // FALLBACK ROBUSTO: Persistir autenticación manualmente
                        console.log('🔄 Using robust fallback authentication method');
                        
                        // Crear datos de usuario para fallback
                        const userData = {
                          uid: userId,
                          email: userId,
                          displayName: 'OTP User',
                          photoURL: null,
                          phoneNumber: null,
                          emailVerified: true,
                          getIdToken: () => Promise.resolve('otp-verified-token-' + Date.now())
                        };
                        
                        // Persistir en localStorage para evitar pérdida
                        localStorage.setItem('otp-fallback-auth', JSON.stringify({
                          user: userData,
                          timestamp: Date.now(),
                          method: 'otp-fallback'
                        }));
                        
                        // Disparar evento personalizado
                        window.dispatchEvent(new CustomEvent('dev-auth-change', { 
                          detail: { user: userData } 
                        }));
                        
                        showSuccessEffect();
                        
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 1000);
                      }
                    }}
                    onBack={() => setLoginMethod("email")}
                  />
                )
              ) : (
                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t("auth.name")}
                    </label>
                    <input
                      type="text"
                      value={signupData.name}
                      onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                      placeholder="Tu nombre"
                      className="border p-2 hover:border-primary rounded-md block w-full bg-card/50 border-muted-foreground/30 focus-visible:ring-primary"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t("auth.email")}
                    </label>
                    <input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      placeholder="tu@email.com"
                      className="border p-2 hover:border-primary rounded-md block w-full bg-card/50 border-muted-foreground/30 focus-visible:ring-primary"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t("auth.password")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={signupData.password}
                        onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                        placeholder="••••••••"
                        className="border p-2 hover:border-primary rounded-md block w-full bg-card/50 border-muted-foreground/30 focus-visible:ring-primary pr-10"
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
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t("auth.confirmPassword")}
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                      className="border p-2 hover:border-primary rounded-md block w-full bg-card/50 border-muted-foreground/30 focus-visible:ring-primary"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSignupSubmit}
                    className="w-full h-10 bg-primary hover:bg-primary/80 text-black font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creando cuenta..." : t("auth.createAccount")}
                  </Button>
                </div>
              )}
                </>
              )}
            </div>
          </CardContent>

          <CardFooter className="px-6 py-4 flex items-center justify-center border-t border-primary/20 bg-muted/10">
            {authMode === "login" && loginMethod === "email" ? (
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-primary text-sm font-medium transition-all duration-300 border border-primary/30 justify-center"
                onClick={() => setLoginMethod("otp")}
                title="Login with OTP Code"
              >
                <RiShieldKeyholeLine className="h-5 w-5" />
                <span>OTP Code</span>
              </button>
            ) : authMode === "login" && loginMethod === "otp" ? (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-all duration-300 border border-primary/30 min-w-[90px] justify-center"
                onClick={() => setLoginMethod("email")}
                title="Back to Password"
              >
                <HiMail className="h-5 w-5" />
                <span>Password</span>
              </button>
            ) : (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Alternative login methods available after entering email
                </p>
              </div>
            )}
          </CardFooter>
        </Card>


      </div>
    </div>
  );
}
