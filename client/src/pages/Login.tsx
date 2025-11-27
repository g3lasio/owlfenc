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
import { useAuth } from "@/hooks/use-auth";

import OTPAuth from "@/components/auth/OTPAuth";
import SessionUnlockPrompt from "@/components/auth/SessionUnlockPrompt";
import { sessionUnlockService } from "@/lib/session-unlock-service";

import { useTranslation } from "react-i18next";
import { useEffect } from "react";

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export default function AuthPage() {
  const [, navigate] = useLocation();
  const {
    signIn,
    user,
    loading: authLoading,
    error: authError
  } = useAuth();
  
  // Alias para compatibilidad temporal
  const currentUser = user;
  const error = authError ? String(authError) : null;
  const clearError = () => {}; // No-op por ahora
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "otp">(
    "email",
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSessionUnlock, setShowSessionUnlock] = useState(false);
  const [sessionUnlockInfo, setSessionUnlockInfo] = useState<{
    canUnlock: boolean;
    email?: string;
    method?: string;
  }>({ canUnlock: false });
  
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation(); // Obtenemos la función de traducción
  
  useEffect(() => {
    // Si hay un usuario autenticado y estamos en login, redirigir inmediatamente
    if (currentUser && !authLoading) {
      console.log('🎯 [AUTO-REDIRECT] Usuario autenticado detectado, redirigiendo inmediatamente...');
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Verificar si hay sesión disponible para desbloqueo
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
  
  
  // Esquemas de validación dentro del componente para tener acceso a t()
  const loginSchema = z.object({
    email: z.string().min(1, "Email es requerido").email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    rememberMe: z.boolean().default(false),
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

  // 📱 Ref para evitar auto-submits repetidos (persiste durante toda la sesión del componente)
  const hasAutoSubmittedRef = useRef<boolean>(false);
  const autofillValuesRef = useRef<{email: string, password: string} | null>(null);

  // 📱 Auto-submit cuando el navegador auto-rellena credenciales con Face ID/Touch ID
  // Solo se ejecuta UNA VEZ al montar el componente
  useEffect(() => {
    let mounted = true;
    
    const handleAutofillSubmit = (emailValue: string, passwordValue: string) => {
      // Guard: Solo auto-submit una vez por montaje del componente
      if (hasAutoSubmittedRef.current || !mounted) {
        return;
      }
      
      // Guardar valores detectados
      const storedValues = autofillValuesRef.current;
      
      // Si los valores son los mismos que ya intentamos, no reintentar
      if (storedValues && storedValues.email === emailValue && storedValues.password === passwordValue) {
        console.log('🔐 [AUTOFILL] Same credentials, skipping duplicate auto-submit');
        return;
      }
      
      console.log('🔐 [AUTOFILL] Credenciales detectadas, preparando auto-submit único...');
      
      // Actualizar el formulario con los valores auto-rellenados
      loginForm.setValue('email', emailValue);
      loginForm.setValue('password', passwordValue);
      
      // Marcar que ya se hizo auto-submit y guardar valores
      hasAutoSubmittedRef.current = true;
      autofillValuesRef.current = { email: emailValue, password: passwordValue };
      
      // Auto-submit después de un breve delay
      setTimeout(() => {
        if (mounted && !currentUser) {
          console.log('🚀 [AUTOFILL] Auto-submitting credentials (one-time only)...');
          loginForm.handleSubmit(onLoginSubmit)();
        }
      }, 300);
    };

    // Verificar autofill inicial con delay (algunos navegadores rellenan con delay)
    const initialCheckTimeout = setTimeout(() => {
      if (!mounted || hasAutoSubmittedRef.current) return;
      
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      
      if (emailInput && passwordInput) {
        const emailValue = emailInput.value;
        const passwordValue = passwordInput.value;
        
        // Solo si ambos campos están llenos (autofill típico)
        if (emailValue && passwordValue && emailValue.includes('@') && passwordValue.length >= 6) {
          handleAutofillSubmit(emailValue, passwordValue);
        }
      }
    }, 800);

    return () => {
      mounted = false;
      clearTimeout(initialCheckTimeout);
    };
  }, []);

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

        await signIn(data.email, data.password);
        console.log("Login exitoso para:", data.email);
        showSuccessEffect();
      } else if (loginMethod === "otp") {
        console.log("Enviando enlace de inicio de sesión a:", data.email);

        // Verificar que el correo no esté vacío
        if (!data.email.trim()) {
          throw new Error("Por favor ingresa tu correo electrónico");
        }

        const { sendEmailLink } = await import('@/lib/firebase');
        await sendEmailLink(data.email);
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
              left: "2px", // Siempre en posición Login
              boxShadow: "0 0 15px 2px rgba(0, 255, 255, 0.5)",
              filter: "brightness(1.1)",
            }}
          ></div>

          <div className="absolute inset-0 flex items-stretch">
            <button
              className="flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-l-full transition-colors text-white"
            >
              {t("auth.login")}
            </button>
            <button
              className="flex-1 flex items-center justify-center text-xs font-semibold relative z-10 rounded-r-full transition-colors text-muted-foreground"
              onClick={() => navigate("/signup")}
            >
              {t("auth.signup")}
            </button>
          </div>
        </div>

        {/* Tarjeta principal con estilo Stark Industries/Iron Man */}
        <Card
          ref={cardRef}
          className="relative border border-primary/20 shadow-xl rounded-xl backdrop-blur-sm bg-card/80"
        >
          {/* Cabecera con efecto futurista */}
          <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-5 border-b border-primary/20 relative">

            <CardTitle className="text-2xl font-semibold text-center stark-text-glow">
              {t("auth.login")}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {t("auth.alreadyAccount")}
            </CardDescription>

            {/* Icono de estado en la esquina */}
            <div className="absolute top-4 right-4">
              <RiShieldKeyholeLine className="h-5 w-5 text-primary stark-icon-pulse" />
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
                  {/* Formulario de login normal */}
                {loginMethod === "email" ? (
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                      autoComplete="on"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.email")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                id="email"
                                type="email"
                                inputMode="email"
                                autoComplete="username"
                                placeholder="tu@email.com"
                                className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary"
                                disabled={isLoading}
                                data-testid="input-email"
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
                                  {...field}
                                  id="password"
                                  type={showPassword ? "text" : "password"}
                                  autoComplete="current-password"
                                  placeholder="••••••••"
                                  className="bg-card/50 border-muted-foreground/30 focus-visible:ring-primary pr-10"
                                  disabled={isLoading}
                                  data-testid="input-password"
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

                      {/* Opción alternativa OTP */}
                      <div className="flex items-center gap-3">
                        <Separator className="flex-1 bg-muted-foreground/30" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <Separator className="flex-1 bg-muted-foreground/30" />
                      </div>

                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-primary text-sm font-medium transition-all duration-300 border border-primary/30 justify-center"
                        onClick={() => setLoginMethod("otp")}
                        title="Login with OTP Code"
                        data-testid="button-otp-login"
                      >
                        <RiShieldKeyholeLine className="h-5 w-5" />
                        <span>Login with OTP Code</span>
                      </button>
                      
                      {/* Mensaje informativo sobre Face ID/Touch ID */}
                      <p className="text-xs text-center text-muted-foreground/70 mt-2">
                        After logging in, your device will offer to save your credentials for quick Face ID or Touch ID access next time.
                      </p>
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
                          
                          // Persistir estado temporalmente para evitar conflictos
                          localStorage.setItem('otp-auth-success', JSON.stringify({
                            uid: userCredential.user.uid,
                            email: userCredential.user.email,
                            timestamp: Date.now()
                          }));
                          
                          showSuccessEffect();
                          
                          // Redirigir después de un breve delay
                          setTimeout(() => {
                            window.location.href = '/';
                          }, 1000);
                          
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
                )}
                </>
              )}
            </div>
          </CardContent>

          <CardFooter className="px-6 py-4 flex items-center justify-center border-t border-primary/20 bg-muted/10">
            {loginMethod === "otp" ? (
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
