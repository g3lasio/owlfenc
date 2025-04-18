import { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { initPhoneLogin, verifyPhoneCode } from "@/lib/firebase";

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
    .regex(/^[0-9]+$/, "El código solo debe contener números"),
});

type CodeFormValues = z.infer<typeof codeSchema>;

interface PhoneAuthProps {
  onSuccess?: () => void;
}

export default function PhoneAuth({ onSuccess }: PhoneAuthProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const confirmationResultRef = useRef<any>(null);
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

  // Enviar código SMS
  const handleSendCode = async (data: PhoneFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Asegurarse de que el número tenga formato internacional
      let formattedPhone = data.phoneNumber;
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+${formattedPhone}`;
      }
      
      setPhoneNumber(formattedPhone);
      
      // Iniciar el proceso de login con teléfono
      if (!recaptchaContainerRef.current) {
        throw new Error("El contenedor de reCAPTCHA no está disponible");
      }
      
      const confirmationResult = await initPhoneLogin(formattedPhone, "recaptcha-container");
      confirmationResultRef.current = confirmationResult;
      
      toast({
        title: "Código enviado",
        description: `Se ha enviado un código de verificación a ${formattedPhone}`,
      });
      
      setStep("code");
    } catch (err: any) {
      console.error("Error al enviar el código:", err);
      setError(err.message || "Error al enviar el código de verificación");
      
      toast({
        variant: "destructive",
        title: "Error al enviar código",
        description: err.message || "No se pudo enviar el código. Intenta de nuevo.",
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
      if (!confirmationResultRef.current) {
        throw new Error("No hay un proceso de verificación activo");
      }
      
      await verifyPhoneCode(confirmationResultRef.current, data.code);
      
      toast({
        title: "Verificación exitosa",
        description: "Tu número de teléfono ha sido verificado correctamente",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error al verificar el código:", err);
      setError(err.message || "Error al verificar el código");
      
      toast({
        variant: "destructive",
        title: "Error de verificación",
        description: err.message || "Código inválido. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {step === "phone" ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">Ingresa tu número de teléfono</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Te enviaremos un código de verificación por SMS
          </p>
          
          {/* Contenedor para el reCAPTCHA */}
          <div 
            id="recaptcha-container" 
            ref={recaptchaContainerRef} 
            className="my-4"
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
          <h2 className="text-xl font-semibold mb-2">Verificar código</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Ingresa el código de verificación enviado a {phoneNumber}
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
              
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("phone")}
                  disabled={isLoading}
                >
                  Volver
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
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}