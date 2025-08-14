import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestPasswordReset } from "@/lib/password-reset-api";

// Esquema de validación para el formulario
const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function RecuperarPassword() {
  const [, navigate] = useLocation();
  const { sendPasswordResetEmail, error, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Configurar el formulario
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Manejar envío de correo de recuperación
  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      
      // Use new backend API instead of Firebase
      console.log('🔐 [FRONTEND] Usando nueva API de restablecimiento');
      await requestPasswordReset(data.email);
      
      setEmailSent(true);
      
      toast({
        title: "Email sent successfully",
        description: "We have sent a password recovery link to your email address via Resend. Please check your inbox (including spam folder).",
      });
    } catch (err: any) {
      console.error("Error al enviar correo de recuperación:", err);
      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: err.message || "An error occurred while sending the recovery email. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address to recover your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Email sent</AlertTitle>
              <AlertDescription>
                We have sent a password recovery link to your email address.
                Please check your inbox and follow the instructions.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Mensaje de instrucciones */}
              <p className="text-sm text-muted-foreground">
                We will send you an email with a link to reset your password.
              </p>

              {/* Formulario de recuperación */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="tu@email.com" {...field} />
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
                        Sending...
                      </span>
                    ) : (
                      "Send Recovery Email"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            <Button variant="link" className="p-0" onClick={() => navigate("/login")}>
              Back to Sign In
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}