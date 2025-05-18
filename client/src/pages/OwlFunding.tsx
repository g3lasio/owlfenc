import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function OwlFunding() {
  const { toast } = useToast();
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // En un entorno real, aquí enviaríamos la información al equipo
    // Por ahora solo mostramos un toast de confirmación
    toast({
      title: "Mensaje enviado",
      description: "Nos pondremos en contacto contigo pronto.",
    });
    
    // Limpiamos el formulario
    setContactFormData({
      name: "",
      email: "",
      message: ""
    });
  };

  return (
    <div className="container mx-auto p-6 flex flex-col items-center">
      <div className="flex flex-col items-center justify-center mb-8 text-center">
        <img 
          src="/images/owl-funding-logo.png" 
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
              Owl Funding ofrece soluciones de financiamiento flexibles y accesibles 
              para contratistas que buscan expandir su negocio, adquirir maquinaria o 
              financiar proyectos específicos. Nuestros productos financieros están 
              diseñados para las necesidades únicas de la industria de la construcción.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-building-line"></i>
                </div>
                <h3 className="font-medium text-center">Financiamiento Empresarial</h3>
                <p className="text-sm text-center text-muted-foreground">Expande tu negocio</p>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-tools-line"></i>
                </div>
                <h3 className="font-medium text-center">Equipos y Maquinaria</h3>
                <p className="text-sm text-center text-muted-foreground">Moderniza tu operación</p>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-building-4-line"></i>
                </div>
                <h3 className="font-medium text-center">Proyectos</h3>
                <p className="text-sm text-center text-muted-foreground">Financiamiento por proyecto</p>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-money-dollar-circle-line"></i>
                </div>
                <h3 className="font-medium text-center">Capital de Trabajo</h3>
                <p className="text-sm text-center text-muted-foreground">Flujo de efectivo flexible</p>
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
                onClick={() => window.open("https://apply.0wlfunding.com/", "_blank")}
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
              ¿Tienes preguntas específicas? Nuestro equipo está aquí para ayudarte
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
              
              <Button type="submit" className="w-full">
                Enviar Consulta
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-medium mb-2">También puedes contactarnos directamente:</h3>
              <div className="space-y-2">
                <p className="text-sm flex items-center gap-2">
                  <i className="ri-mail-line text-primary"></i>
                  <a href="mailto:info@0wlfunding.com" className="hover:underline">info@0wlfunding.com</a>
                </p>
                <p className="text-sm flex items-center gap-2">
                  <i className="ri-phone-line text-primary"></i>
                  <a href="tel:+12025493519" className="hover:underline">(202) 549-3519</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}