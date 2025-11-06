import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutOwlFence() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Acerca de Owl Fenc App</h1>
      <p className="text-muted-foreground mb-8">
        Una herramienta de estimación y gestión profesional para contratistas de cercas
      </p>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nuestra Misión</CardTitle>
            <CardDescription>
              Transformando la industria de cercas con tecnología avanzada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Owl Fenc App está diseñada específicamente para contratistas de cercas, 
              ofreciendo una suite completa de herramientas para simplificar y mejorar cada 
              aspecto de su negocio.
            </p>
            <p className="text-muted-foreground mb-4">
              Nuestra plataforma combina IA avanzada con conocimiento específico de la industria 
              para automatizar las estimaciones, generar contratos profesionales, y ayudar a los 
              contratistas a ganar más trabajos con menos esfuerzo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Características Principales</CardTitle>
            <CardDescription>
              Herramientas diseñadas para ayudar a su negocio de cercas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc pl-6">
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Estimador Inteligente:</span> Generación automática de estimaciones precisas para cercas de madera, vinilo y enlace de cadena
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Generador de Contratos:</span> Creación de documentos profesionales y legalmente sólidos con un solo clic
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Asistente de IA:</span> Responde preguntas, sugiere mejoras y ayuda con la comunicación con los clientes
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Verificación de Propiedad:</span> Confirma la propiedad legítima para evitar problemas legales y estafas
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Gestión de Proyectos:</span> Seguimiento completo de proyectos desde la estimación hasta la finalización
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acerca de Owl Fenc</CardTitle>
            <CardDescription>
              Nuestra historia y visión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Owl Fenc fue fundada por contratistas de cercas experimentados que entendieron los desafíos 
              únicos que enfrentan los profesionales en esta industria. Nuestra misión es proporcionar 
              herramientas tecnológicas que permitan a los contratistas de cercas competir efectivamente 
              en el mercado actual.
            </p>
            <p className="text-muted-foreground">
              Con un equipo de expertos en tecnología y construcción, estamos constantemente mejorando 
              nuestra plataforma para ofrecer las soluciones más innovadoras y prácticas para el 
              sector de contratistas de cercas.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-muted rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-2">¿Necesitas Ayuda?</h3>
        <p className="mb-4 text-muted-foreground">
          Nuestro equipo está disponible para ayudarte con cualquier pregunta o problema
        </p>
        <a 
          href="mailto:mervin@owlfenc.com" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Contactar Soporte
        </a>
      </div>
    </div>
  );
}