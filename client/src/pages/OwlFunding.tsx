import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { UpgradePrompt } from "@/components/permissions/UpgradePrompt";
import { Lock } from "lucide-react";
import { UserPlanSwitcher } from "@/components/dev/UserPlanSwitcher";

export default function OwlFunding() {
  const { toast } = useToast();
  const { userPlan } = usePermissions();
  
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  // Verificar si es plan básico (Primo Chambeador)
  const isPrimoChambeador = userPlan?.id === 1 || userPlan?.id === 'primo-chambeador'; // Plan ID 1 = Primo Chambeador
  const isFreeTrial = userPlan?.id === 'free-trial';
  
  // Los usuarios pagados (no primo chambeador) o en prueba gratis tienen acceso completo
  const hasFullAccess = !isPrimoChambeador;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setContactFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Validación básica
      if (
        !contactFormData.name ||
        !contactFormData.email ||
        !contactFormData.message
      ) {
        toast({
          title: "Error en el formulario",
          description: "Por favor completa todos los campos.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Enviar los datos al servidor
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactFormData),
      });

      const data = await response.json();

      if (response.ok) {
        // Mostrar confirmación de éxito
        toast({
          title: "Mensaje enviado",
          description: "Nos pondremos en contacto contigo pronto.",
        });

        // Limpiar el formulario
        setContactFormData({
          name: "",
          email: "",
          message: "",
        });
      } else {
        // Mostrar error
        toast({
          title: "Error al enviar",
          description:
            data.message ||
            "Ha ocurrido un error. Por favor intenta más tarde.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error enviando formulario:", error);
      toast({
        title: "Error de conexión",
        description:
          "No pudimos procesar tu solicitud. Comprueba tu conexión e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container pb-40 mx-auto p-6 flex flex-col items-center">
      {/* Panel de testing solo en desarrollo */}
      <div className="w-full max-w-4xl">
        <UserPlanSwitcher />
      </div>
      
      <div className="flex flex-col items-center justify-center mb-8 text-center">
        <img
          src="/images/owl-funding-logo-white.png"
          alt="Owl Funding Logo"
          className="h-32 mb-4"
        />
        <p className="text-muted-foreground max-w-2xl">
          Soluciones de financiamiento exclusivas para contratistas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <Card>
          <CardHeader>
            <CardTitle>Financiamiento para Contratistas</CardTitle>
            <CardDescription>
              Opciones financieras diseñadas específicamente para tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              Owl Funding ofrece soluciones de financiamiento flexibles y
              accesibles para contratistas que buscan expandir su negocio,
              adquirir maquinaria o financiar proyectos específicos. Nuestros
              productos financieros están diseñados para las necesidades únicas
              de la industria de la construcción.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-building-line"></i>
                </div>
                <h3 className="font-medium text-center">
                  Financiamiento Empresarial
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  Expande tu negocio
                </p>
              </div>

              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-tools-line"></i>
                </div>
                <h3 className="font-medium text-center">
                  Equipos y Maquinaria
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  Moderniza tu operación
                </p>
              </div>

              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-building-4-line"></i>
                </div>
                <h3 className="font-medium text-center">Proyectos</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Financiamiento por proyecto
                </p>
              </div>

              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-money-dollar-circle-line"></i>
                </div>
                <h3 className="font-medium text-center">Capital de Trabajo</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Flujo de efectivo flexible
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => window.open("https://0wlfunding.com/", "_blank")}
              >
                <i className="ri-information-line"></i>
                Learn More
              </Button>

              <Button
                className="flex items-center gap-2"
                disabled={isPrimoChambeador}
                onClick={() => {
                  if (isPrimoChambeador) {
                    toast({
                      title: "Acceso Restringido",
                      description: "Actualiza tu plan para acceder al proceso de solicitud de financiamiento.",
                      variant: "destructive",
                    });
                    return;
                  }
                  window.open("https://apply.0wlfunding.com/", "_blank");
                }}
              >
                <i className="ri-check-double-line"></i>
                Apply Now
                {isPrimoChambeador && <Lock className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>

{/* Formulario de contacto - Solo para usuarios con acceso completo */}
        {hasFullAccess ? (
          <Card>
            <CardHeader>
              <CardTitle>Contacta con Nuestro Equipo</CardTitle>
              <CardDescription>
                ¿Tienes preguntas específicas? Nuestro equipo está aquí para
                ayudarte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nombre
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Tu nombre"
                    value={contactFormData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={contactFormData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Mensaje
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Describe tu necesidad de financiamiento..."
                    rows={4}
                    value={contactFormData.message}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar Consulta"}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-medium mb-2">
                  También puedes contactarnos directamente:
                </h3>
                <div className="space-y-2">
                  <p className="text-sm flex items-center gap-2">
                    <i className="ri-mail-line text-primary"></i>
                    <a
                      href="mailto:info@0wlfunding.com"
                      className="hover:underline"
                    >
                      info@0wlfunding.com
                    </a>
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <i className="ri-phone-line text-primary"></i>
                    <a href="tel:+12025493519" className="hover:underline">
                      (202) 549-3519
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Card de acceso restringido para Primo Chambeador
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Lock className="h-5 w-5" />
                Información de Contacto Restringida
              </CardTitle>
              <CardDescription className="text-orange-700">
                Actualiza tu plan para acceder a la información de contacto directo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-sm text-orange-700 mb-4">
                  Para mayor seguridad, la información de contacto está disponible solo para usuarios de planes superiores.
                </p>
                <UpgradePrompt 
                  feature="owlFundingContact"
                  size="small"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mensaje de acceso restringido para Primo Chambeador */}
      {isPrimoChambeador && (
        <div className="max-w-4xl w-full mt-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="text-center py-6">
              <Lock className="h-8 w-8 mx-auto mb-3 text-orange-600" />
              <h3 className="font-semibold text-orange-800 mb-2">
                Funcionalidad de Solicitud Restringida
              </h3>
              <p className="text-sm text-orange-700 mb-4">
                Actualiza tu plan para acceder al proceso completo de solicitud de financiamiento y información de contacto directo.
              </p>
              <UpgradePrompt 
                feature="owlFundingAccess"
                size="small"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
