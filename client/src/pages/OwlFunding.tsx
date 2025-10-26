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
import { usePermissions } from "@/contexts/PermissionContext";
import { useLocation } from "wouter";
import { Lock, Sparkles, CreditCard, DollarSign, PiggyBank, ChartBar } from "lucide-react";

export default function OwlFunding() {
  const { toast } = useToast();
  const { hasAccess, userPlan, showUpgradeModal } = usePermissions();
  const [, navigate] = useLocation();
  
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  // Verificar si tiene acceso a Owl Funding (solo planes pagados)
  const hasOwlFundingAccess = userPlan?.id !== 5; // Todos excepto Primo Chambeador
  
  // Si el usuario no tiene acceso, mostrar mensaje de upgrade
  if (!hasOwlFundingAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-900/50 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 relative">
                <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-red-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Owl Funding
              </CardTitle>
              <CardDescription className="text-lg text-gray-400 mt-2">
                Financiamiento Premium - Requiere Plan Pagado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-red-900/10 to-orange-900/10 border border-red-900/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  ¿Qué incluye Owl Funding?
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Financiamiento empresarial exclusivo para contratistas con tasas preferenciales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Préstamos para equipos y maquinaria con aprobación rápida</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Financiamiento por proyecto con términos flexibles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Líneas de crédito rotativas para capital de trabajo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Asesoría financiera personalizada y planificación fiscal</span>
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <PiggyBank className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                  <p className="text-sm text-gray-400">Hasta</p>
                  <p className="text-2xl font-bold text-white">$500K</p>
                  <p className="text-xs text-gray-500">En financiamiento</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <ChartBar className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-sm text-gray-400">Desde</p>
                  <p className="text-2xl font-bold text-white">4.9%</p>
                  <p className="text-xs text-gray-500">Tasa de interés</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-sm text-gray-400">Hasta</p>
                  <p className="text-2xl font-bold text-white">24h</p>
                  <p className="text-xs text-gray-500">Aprobación</p>
                </div>
              </div>
              
              <div className="text-center space-y-4">
                <p className="text-gray-400">
                  Tu plan actual: <span className="font-semibold text-white">{userPlan?.name || 'Primo Chambeador'}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Actualiza a <span className="text-cyan-400 font-semibold">Mero Patrón</span> o <span className="text-purple-400 font-semibold">Master Contractor</span> para acceder a financiamiento exclusivo
                </p>
              </div>
              
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={() => navigate('/subscription')}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold px-6 py-3"
                  size="lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Ver Planes y Precios
                </Button>
                <Button
                  onClick={() => showUpgradeModal('owlFunding', 'Accede a financiamiento exclusivo para hacer crecer tu negocio')}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                  size="lg"
                >
                  Más Información
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

              <div className="flex flex-col items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-600 text-xl mb-2">
                  <i className="ri-group-line"></i>
                </div>
                <h3 className="font-medium text-center text-green-800">Financiamiento para Clientes</h3>
                <p className="text-sm text-center text-green-700">
                  Ahora puedes ofrecer opciones de financiamiento a tus clientes
                </p>
              </div>

              <div className="flex flex-col items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-blue-600 text-xl mb-2">
                  <i className="ri-hand-coin-line"></i>
                </div>
                <h3 className="font-medium text-center text-blue-800">Pagos Flexibles</h3>
                <p className="text-sm text-center text-blue-700">
                  Permite a tus clientes pagar en cuotas cómodas
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
                onClick={() => {
                  window.open("https://apply.0wlfunding.com/", "_blank");
                }}
              >
                <i className="ri-check-double-line"></i>
                Apply Now
              </Button>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
