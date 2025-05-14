import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { sendEmailLink } from "@/lib/firebase";
import { useTranslation } from "react-i18next";

// Esquema para formulario de email
const emailSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface EmailLinkAuthProps {
  onSuccess?: () => void;
  onToggle?: () => void;
}

export default function EmailLinkAuth({ onSuccess, onToggle }: EmailLinkAuthProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  // Form para email
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Enviar enlace de email
  const handleSendLink = async (data: EmailFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await sendEmailLink(data.email);
      
      setSentEmail(data.email);
      setEmailSent(true);
      
      // Guardar el email en localStorage para recuperarlo luego
      localStorage.setItem('emailForSignIn', data.email);
      
      toast({
        title: "Enlace enviado",
        description: `Se ha enviado un enlace de acceso a ${data.email}`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error al enviar el enlace:", err);
      setError(err.message || "Error al enviar el enlace de acceso");
      
      toast({
        variant: "destructive",
        title: "Error al enviar enlace",
        description: err.message || "No se pudo enviar el enlace. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {emailSent ? (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Enlace enviado</AlertTitle>
          <AlertDescription>
            Hemos enviado un enlace a <strong>{sentEmail}</strong>.
            <br />
            Por favor, revisa tu bandeja de entrada y haz clic en el enlace para iniciar sesión.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="w-full">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">Acceso sin contraseña</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Te enviaremos un enlace de acceso por correo electrónico
          </p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSendLink)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="tu@email.com" 
                        type="email"
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
                  "Enviar enlace de acceso"
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}