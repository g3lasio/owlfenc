import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Smartphone, ShieldCheck } from "lucide-react";
import { initPhoneLogin, verifyPhoneCode } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// Esquema para formulario de número de teléfono
const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .min(8, "El número de teléfono debe tener al menos 8 dígitos")
    .regex(/^\+?[0-9\s-()]+$/, "Formato de teléfono inválido"),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

// Esquema para formulario de código de verificación
const codeSchema = z.object({
  code: z
    .string()
    .min(6, "El código debe tener al menos 6 dígitos")
    .max(6, "El código no debe exceder 6 dígitos")
    .regex(/^[0-9]+$/, "El código solo debe contener números"),
});

type CodeFormValues = z.infer<typeof codeSchema>;

interface PhoneAuthProps {
  onSuccess?: () => void;
  mode?: "login" | "enroll"; // Modo de funcionamiento: login o inscripción MFA
}

export default function PhoneAuth({ onSuccess, mode = "login" }: PhoneAuthProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const confirmationResultRef = useRef<any>(null);
  const verificationIdRef = useRef<string | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Form para teléfono
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  // Form para código
  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
    },
  });

  // Limpiar el container de reCAPTCHA cuando el componente se desmonte
  useEffect(() => {
    return () => {
      // Aquí podríamos hacer limpieza adicional si es necesario
    };
  }, []);

  // Formatear el número de teléfono para asegurar que tenga formato internacional
  const formatPhoneNumber = (phone: string): string => {
    let formattedPhone = phone.trim();
    
    // Eliminar espacios, guiones y paréntesis
    formattedPhone = formattedPhone.replace(/[\s-()]/g, '');
    
    // Asegurarse de que comience con +
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = `+${formattedPhone}`;
    }
    
    return formattedPhone;
  };

  // Enviar código SMS
  const handleSendCode = async (data: PhoneFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Formatear el número de teléfono
      const formattedPhone = formatPhoneNumber(data.phoneNumber);
      setPhoneNumber(formattedPhone);
      
      // Validar que el contenedor de reCAPTCHA esté disponible
      if (!recaptchaContainerRef.current) {
        throw new Error("El contenedor de reCAPTCHA no está disponible");
      }
      
      // Iniciar el proceso de login o inscripción MFA con teléfono
      if (mode === "login") {
        console.log(`Iniciando login con teléfono: ${formattedPhone}`);
        const confirmationResult = await initPhoneLogin(formattedPhone, "recaptcha-container");
        confirmationResultRef.current = confirmationResult;
        
        toast({
          title: "Código enviado",
          description: `Se ha enviado un código de verificación a ${formattedPhone}`,
        });
      } else if (mode === "enroll" && currentUser) {
        // Lógica para inscripción MFA (se implementará cuando sea necesario)
        console.log("Modo de inscripción MFA aún no implementado completamente");
        toast({
          title: "Función en desarrollo",
          description: "La inscripción MFA estará disponible próximamente",
        });
        return;
      }
      
      // Pasar al siguiente paso
      setStep("code");
    } catch (err: any) {
      console.error("Error al enviar el código:", err);
      
      // Mensaje de error personalizado según el código de error
      let errorMessage = err.message || "Error al enviar el código de verificación";
      
      // Personalizar el mensaje según el tipo de error
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = "El número de teléfono no es válido. Por favor, verifica e intenta de nuevo.";
      } else if (err.code === 'auth/missing-phone-number') {
        errorMessage = "Debes proporcionar un número de teléfono.";
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = "Se ha excedido el límite de mensajes SMS. Por favor, intenta más tarde.";
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = "Esta cuenta de usuario ha sido deshabilitada.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = "La autenticación por teléfono no está habilitada para este proyecto.";
      }
      
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error al enviar código",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar el código SMS
  const handleVerifyCode = async (data: CodeFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (mode === "login") {
        // Verificar para login
        if (!confirmationResultRef.current) {
          throw new Error("No hay un proceso de verificación activo");
        }
        
        await verifyPhoneCode(confirmationResultRef.current, data.code);
        
        // Mostrar mensaje de éxito
        setSuccess(true);
        toast({
          title: "Verificación exitosa",
          description: "Tu número de teléfono ha sido verificado correctamente",
        });
      } else if (mode === "enroll" && currentUser) {
        // Lógica para verificación en inscripción MFA (se implementará cuando sea necesario)
        console.log("Verificación para inscripción MFA no implementada aún");
      }
      
      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error al verificar el código:", err);
      
      // Mensaje de error personalizado según el código de error
      let errorMessage = err.message || "Error al verificar el código";
      
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = "El código de verificación ingresado no es válido.";
      } else if (err.code === 'auth/code-expired') {
        errorMessage = "El código de verificación ha expirado. Por favor, solicita uno nuevo.";
      } else if (err.code === 'auth/missing-verification-code') {
        errorMessage = "Debes proporcionar un código de verificación.";
      }
      
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error de verificación",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Solicitar un nuevo código SMS
  const handleResendCode = async () => {
    setStep("phone");
    setError(null);
    
    if (phoneNumber) {
      // Rellenar el formulario con el número anterior
      phoneForm.setValue("phoneNumber", phoneNumber);
    }
  };

  return (
    <div className="space-y-4">
      {success ? (
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Verificación exitosa</h2>
          <p className="text-muted-foreground mb-6">
            Tu número de teléfono ha sido verificado correctamente
          </p>
        </div>
      ) : step === "phone" ? (
        <div>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2 text-center">
            {mode === "login" ? "Iniciar sesión con teléfono" : "Añadir teléfono como segundo factor"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 text-center">
            Te enviaremos un código de verificación por SMS
          </p>
          
          {/* Contenedor para el reCAPTCHA */}
          <div 
            id="recaptcha-container" 
            ref={recaptchaContainerRef} 
            className="my-6 flex justify-center"
          ></div>
          
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(handleSendCode)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de teléfono</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+52 123 456 7890" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Ingresa el número con código de país (ej: +52 para México)
                    </p>
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
                  "Enviar código"
                )}
              </Button>
            </form>
          </Form>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2 text-center">Verificar código</h2>
          <p className="text-muted-foreground text-sm mb-6 text-center">
            Ingresa el código de verificación enviado a<br />
            <span className="font-medium">{phoneNumber}</span>
          </p>
          
          <Form {...codeForm}>
            <form onSubmit={codeForm.handleSubmit(handleVerifyCode)} className="space-y-4">
              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de verificación</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123456" 
                        {...field} 
                        maxLength={6}
                        className="text-center text-lg tracking-widest"
                      />
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
              
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleResendCode}
                  disabled={isLoading}
                >
                  Cambiar número
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    "Verificar"
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                ¿No recibiste el código? 
                <Button 
                  variant="link" 
                  className="p-0 px-1 h-auto" 
                  onClick={() => handleSendCode(phoneForm.getValues())}
                  disabled={isLoading}
                >
                  Reenviar código
                </Button>
              </p>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}