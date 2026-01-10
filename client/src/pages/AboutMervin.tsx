import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutMervin() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Acerca de Mervin AI</h1>
      <p className="text-muted-foreground mb-8">
        El corazón y cerebro de Owl Fenc: Más que una inteligencia artificial
      </p>

      <div className="grid grid-cols-1 gap-6">
        {/* Sección 1: La Historia Detrás del Nombre */}
        <Card>
          <CardHeader>
            <CardTitle>¿Quién es Mervin?</CardTitle>
            <CardDescription>
              La historia detrás del nombre y el alma de nuestra IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Mervin no es un nombre elegido al azar. <strong>Mervin es el nombre de nuestro co-fundador, 
              un joven de 16 años, hijo de nuestro fundador principal.</strong> Juntos, este dúo de padre e hijo, 
              trabajadores campesinos de origen indígena mexicano y residentes de California, son la fuerza 
              creativa detrás de Owl Fenc.
            </p>
            <p className="text-muted-foreground mb-4">
              Mervin AI lleva su nombre como un homenaje a la nueva generación de constructores: jóvenes que 
              combinan el respeto por el trabajo duro con un dominio innato de la tecnología. La IA fue construida 
              y entrenada por alguien que entiende la industria desde dos perspectivas: la del campo de trabajo, 
              a través de los ojos de su padre, y la del futuro digital.
            </p>
            <p className="text-muted-foreground">
              Por eso, Mervin AI no solo procesa datos; <strong>entiende el contexto, la cultura y las necesidades 
              reales de los contratistas de hoy</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Sección 2: Dos Modos de Operación */}
        <Card>
          <CardHeader>
            <CardTitle>Tu Copiloto y Tu Agente: Los Dos Modos de Mervin</CardTitle>
            <CardDescription>
              Dos formas de potenciar tu trabajo, según tus necesidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Mervin AI opera en dos modos distintos, diseñados para asistirte en cada etapa de tu trabajo. 
              Entendemos que a veces necesitas un consejo rápido y otras veces necesitas que alguien ejecute 
              una tarea por ti. Mervin puede hacer ambas cosas.
            </p>

            {/* Modo Assistant */}
            <div className="mb-6 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <div className="flex items-center mb-3">
                <h4 className="text-lg font-semibold text-foreground mr-2">Modo Assistant (Copiloto)</h4>
                <Badge variant="secondary">Disponible para todos</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Tu compañero de trabajo conversacional. Hazle preguntas, pide recomendaciones o resuelve dudas 
                sobre materiales y técnicas. Es tu experto de confianza disponible 24/7.
              </p>
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span className="text-sm text-muted-foreground">Responder preguntas técnicas sobre construcción</span>
                </div>
                <div className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span className="text-sm text-muted-foreground">Ofrecer consejos sobre materiales y técnicas</span>
                </div>
                <div className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span className="text-sm text-muted-foreground">Ayudar con la comunicación al cliente</span>
                </div>
                <div className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span className="text-sm text-muted-foreground">Dar recomendaciones de mejores prácticas</span>
                </div>
              </div>
            </div>

            {/* Modo Agent */}
            <div className="p-4 border-2 border-orange-500/30 rounded-lg bg-orange-500/5">
              <div className="flex items-center mb-3">
                <h4 className="text-lg font-semibold text-foreground mr-2">Modo Agent</h4>
                <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">Beta</Badge>
                <Badge variant="outline" className="ml-2">Usuarios Premium</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Tu agente personal de trabajo. Más allá de conversar, el Modo Agente ejecuta tareas reales por ti, 
                interactuando con las herramientas de Owl Fenc para ahorrarte tiempo y esfuerzo.
              </p>
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-orange-500 mr-2 mt-0.5">⚡</span>
                  <span className="text-sm text-muted-foreground">Generar estimados completos automáticamente</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-500 mr-2 mt-0.5">⚡</span>
                  <span className="text-sm text-muted-foreground">Crear contratos legales listos para firma</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-500 mr-2 mt-0.5">⚡</span>
                  <span className="text-sm text-muted-foreground">Verificar la propiedad de un inmueble</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-500 mr-2 mt-0.5">⚡</span>
                  <span className="text-sm text-muted-foreground">Investigar requisitos de permisos locales</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-500 mr-2 mt-0.5">⚡</span>
                  <span className="text-sm text-muted-foreground font-medium">
                    Y más capacidades en constante desarrollo...
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 italic">
              El Modo Agent representa el futuro de la gestión de la construcción, donde la IA no solo asiste, 
              sino que ejecuta.
            </p>
          </CardContent>
        </Card>

        {/* Sección 3: Tecnología con Propósito */}
        <Card>
          <CardHeader>
            <CardTitle>Inteligencia Artificial Entrenada en el Mundo Real</CardTitle>
            <CardDescription>
              Tecnología que entiende tu trabajo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              La tecnología de Mervin AI va más allá de los modelos de lenguaje genéricos. Ha sido meticulosamente 
              entrenada y afinada con miles de proyectos de construcción reales, abarcando una multitud de 
              especialidades como <strong>roofing, plomería, concreto, cercas y más</strong>. Esta base de 
              conocimiento práctico, combinada con su capacidad para aprender de tus propios proyectos, permite 
              a Mervin ofrecer respuestas y soluciones que son verdaderamente relevantes para tu negocio.
            </p>
            <p className="text-muted-foreground mb-4">
              Mervin no solo "sabe" de construcción; <strong>entiende el flujo de trabajo de un contratista</strong>. 
              Cuando le pides que genere un estimado, no solo llena una plantilla; utiliza el contexto de tu cliente, 
              los precios de tus materiales y las especificaciones de tu proyecto para crear un documento profesional 
              y preciso, tal como tú lo harías.
            </p>

            {/* Especialidades */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-foreground">Especialidades en las que Mervin es Experto:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-sm text-muted-foreground">Roofing</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-sm text-muted-foreground">Plumbing</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-sm text-muted-foreground">Concrete</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-sm text-muted-foreground">Fencing</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-sm text-muted-foreground">General Contracting</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-sm text-muted-foreground">Y más...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Llamada a la Acción */}
      <div className="mt-8 p-6 bg-muted rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-2">
          ¿Tienes Sugerencias para Mervin?
        </h3>
        <p className="mb-4 text-muted-foreground">
          Mervin AI, al igual que su homónimo humano, está en constante aprendizaje y crecimiento. 
          Nos encantaría escuchar tus ideas sobre cómo podemos hacerlo aún mejor.
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
