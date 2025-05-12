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
import { useAuth } from "@/contexts/AuthContext";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";

// Esquema de validación para el formulario
const signupSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, navigate] = useLocation();
  const { register, loginWithGoogle, loginWithApple, error, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Configurar el formulario
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      nickname: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Manejar registro con email y contraseña
  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      clearError();
      await register(data.email, data.password, data.name);

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

  // Manejar registro con Google
  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      console.error("Error de registro con Google:", err);
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: err.message || "Ocurrió un error al registrarte con Google. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar registro con Apple
  const handleAppleSignup = async () => {
    setIsLoading(true);
    try {
      clearError();
      await loginWithApple();
      navigate("/");
    } catch (err: any) {
      console.error("Error de registro con Apple:", err);
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: err.message || "Ocurrió un error al registrarte con Apple. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-indigo-800">Owl Fenc</h2>
          <p className="text-sm text-slate-600">Verificación de propiedades inteligente</p>
        </div>
        
        <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-6">
            <CardTitle className="text-2xl font-semibold text-center">Crear Cuenta</CardTitle>
            <CardDescription className="text-center text-indigo-100">
              Únete a nuestra comunidad
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 py-6">
            <div className="space-y-5">
              {/* Botones de registro con proveedores */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleSignup}
                  className="w-full h-11 rounded-lg border-2 border-slate-200 hover:bg-slate-50 hover:border-indigo-200 transition-all"
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  <span>Google</span>
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleAppleSignup}
                  className="w-full h-11 rounded-lg border-2 border-slate-200 hover:bg-slate-50 hover:border-indigo-200 transition-all"
                >
                  <FaApple className="mr-2 h-5 w-5" />
                  <span>Apple</span>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">
                    O regístrate con email
                  </span>
                </div>
              </div>

              {/* Formulario de registro */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Nombre completo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Juan Pérez" 
                            {...field} 
                            className="h-11 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Apodo (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: El Flaco, El Pantera, El Gordo" 
                            {...field}
                            className="h-11 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-400" 
                          />
                        </FormControl>
                        <p className="text-xs text-slate-500 mt-1">
                          Usa un apodo que te identifique en la comunidad
                        </p>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Teléfono (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1 (555) 123-4567" 
                            type="tel" 
                            {...field} 
                            className="h-11 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="tu@email.com" 
                            {...field} 
                            className="h-11 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="******" 
                              {...field} 
                              className="h-11 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                              {showPassword ? (
                                <RiEyeOffLine className="h-4 w-4" />
                              ) : (
                                <RiEyeLine className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Confirmar Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="******" 
                              {...field} 
                              className="h-11 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                              {showPassword ? (
                                <RiEyeOffLine className="h-4 w-4" />
                              ) : (
                                <RiEyeLine className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-base mt-2"
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

              {/* Mensaje de error */}
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center px-6 py-5 bg-slate-50 border-t border-slate-100">
            <p className="text-sm text-slate-600 text-center">
              ¿Ya tienes una cuenta?{" "}
              <Button 
                variant="link" 
                className="p-0 px-1 text-indigo-600 font-medium hover:text-indigo-800" 
                onClick={() => navigate("/login")}
              >
                Iniciar Sesión
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}