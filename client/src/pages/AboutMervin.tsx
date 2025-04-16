import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutMervin() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Acerca de Mervin AI</h1>
      <p className="text-muted-foreground mb-8">
        Tu asistente inteligente especializado en la industria de cercas
      </p>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>¿Quién es Mervin?</CardTitle>
            <CardDescription>
              Tu asistente especializado en cercas con IA avanzada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Mervin es un asistente de inteligencia artificial especialmente entrenado 
              para la industria de cercas. Diseñado para ayudar a contratistas como tú, 
              Mervin combina el conocimiento específico de la industria con tecnología 
              avanzada de IA para proporcionar asistencia útil y precisa.
            </p>
            <p className="text-muted-foreground">
              Con Mervin, puedes generar estimaciones precisas, crear contratos profesionales, 
              y obtener respuestas a tus preguntas sobre materiales, técnicas de instalación, 
              o cualquier otro aspecto relacionado con tu negocio de cercas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacidades de Mervin</CardTitle>
            <CardDescription>
              Lo que Mervin puede hacer por tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc pl-6">
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Estimaciones Precisas:</span> Genera estimaciones detalladas para diferentes tipos de cercas y condiciones
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Generación de Contratos:</span> Crea documentos profesionales adaptados a tus necesidades específicas
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Conversación Natural:</span> Comunícate naturalmente para obtener respuestas y asistencia
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Conocimiento Especializado:</span> Accede a información detallada sobre materiales, técnicas y mejores prácticas
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Aprendizaje Continuo:</span> Mervin mejora constantemente con cada interacción y retroalimentación
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tecnología Detrás de Mervin</CardTitle>
            <CardDescription>
              IA avanzada al servicio de tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Mervin utiliza modelos avanzados de lenguaje combinados con datos específicos 
              de la industria de cercas. Esta combinación permite a Mervin entender tus 
              necesidades específicas y proporcionar respuestas relevantes y precisas.
            </p>
            <p className="text-muted-foreground">
              Entrenado con miles de proyectos de cercas reales, conocimiento de materiales, 
              técnicas de instalación y requisitos locales, Mervin tiene la experiencia 
              necesaria para ayudarte a ofrecer mejores servicios a tus clientes.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-muted rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-2">¿Tienes Sugerencias para Mervin?</h3>
        <p className="mb-4 text-muted-foreground">
          Nos encantaría escuchar tus ideas sobre cómo mejorar a Mervin
        </p>
        <a 
          href="mailto:mervin@owlfenc.com" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Enviar Sugerencias
        </a>
      </div>
    </div>
  );
}