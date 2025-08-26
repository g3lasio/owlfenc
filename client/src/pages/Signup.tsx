import { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";
// Esquema de validación para el formulario
const signupSchema = z
  .object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    nickname: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Ingresa un correo electrónico válido"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, navigate] = useLocation();
  const { register, error, clearError } =
    useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formStep, setFormStep] = useState<"personal" | "account">("personal");

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
        description:
          err.message ||
          "Ocurrió un error al registrar tu cuenta. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="flex  items-center justify-center bg-background p-4">
      <div className="absolute inset-0 ">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(180,100%,10%)_0%,hsl(0,0%,7%)_70%)]"></div>
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
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

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-primary">Owl Fenc</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The AI Force Crafting the Future Skyline
          </p>
        </div>

        <Card className="border border-primary/20 shadow-xl  rounded-xl backdrop-blur-sm bg-card/80">
          <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-6 border-b border-primary/20">
            <CardTitle className="text-2xl font-semibold text-center">
              Crear Cuenta
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Únete a nuestra comunidad
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 py-6">
            <div className="space-y-5">

              {/* Toggle para seleccionar sección de formulario */}
              <div className="rounded-lg border border-primary/20 p-1 mb-4">
                <div className="relative flex items-center rounded-md bg-muted/30 p-1 h-10">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1/2 bg-primary rounded-md transition-all shadow-lg duration-300 ease-spring"
                    style={{
                      transform:
                        formStep === "personal"
                          ? "translateX(0)"
                          : "translateX(100%)",
                      boxShadow: "0 0 15px 2px rgba(0, 255, 255, 0.3)",
                    }}
                  ></div>

                  <button
                    className={`relative z-10 flex items-center justify-center gap-1 w-1/2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      formStep === "personal"
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setFormStep("personal")}
                  >
                    <span>Datos personales</span>
                  </button>

                  <button
                    className={`relative z-10 flex items-center justify-center gap-1 w-1/2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      formStep === "account"
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setFormStep("account")}
                  >
                    <span>Cuenta</span>
                  </button>
                </div>
              </div>

              {/* Formulario de registro */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {formStep === "personal" ? (
                    <>
                      <FormField
                        control={form.control}
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
                        control={form.control}
                        name="nickname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apodo (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: El Flaco, El Pantera, El Gordo"
                                {...field}
                                className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">
                              Usa un apodo que te identifique en la comunidad
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+1 (555) 123-4567"
                                type="tel"
                                {...field}
                                className="h-11 rounded-lg border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-base mt-2"
                        onClick={() => setFormStep("account")}
                      >
                        Continuar
                      </Button>
                    </>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
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
                        control={form.control}
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

                      <div className="flex gap-3 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-11 rounded-lg border-primary/20 hover:bg-primary/10"
                          onClick={() => setFormStep("personal")}
                        >
                          Atrás
                        </Button>

                        <Button
                          type="submit"
                          className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Cargando...
                            </span>
                          ) : (
                            "Crear Cuenta"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </Form>

              {/* Mensaje de error */}
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-900/20 p-2 rounded-lg border border-red-500/20">
                  {error}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-center px-6 py-5 bg-muted/20 border-t border-primary/10">
            <p className="text-sm text-muted-foreground text-center">
              ¿Ya tienes una cuenta?{" "}
              <Button
                variant="link"
                className="p-0 px-1 text-primary font-medium hover:text-primary/80"
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
