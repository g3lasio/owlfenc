import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutOwlFence() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Acerca de Owl Fenc</h1>
      <p className="text-muted-foreground mb-8">
        Del campo de trabajo a la vanguardia tecnológica
      </p>

      <div className="grid grid-cols-1 gap-6">
        {/* Sección 1: Nuestra Historia */}
        <Card>
          <CardHeader>
            <CardTitle>Forjado en el Trabajo, Construido para el Progreso</CardTitle>
            <CardDescription>
              Una historia de determinación y tecnología
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Owl Fenc no nació en una sala de juntas corporativa. Nació del sudor, la tierra y la determinación 
              de un padre y su hijo, trabajadores campesinos de origen indígena mexicano en los campos de California. 
              Como contratistas, enfrentamos los mismos desafíos que tú: las largas noches preparando estimados, 
              la frustración de perder trabajos por falta de herramientas rápidas y la lucha constante por competir 
              en un mercado exigente.
            </p>
            <p className="text-muted-foreground">
              Nuestra misión es simple y poderosa: <strong>democratizar el acceso a tecnología de punta para los 
              verdaderos trabajadores de la construcción</strong>. Creamos Owl Fenc para que cada contratista, 
              sin importar su especialidad, tenga el poder de la inteligencia artificial en sus manos. Esta es una 
              plataforma construida por trabajadores, para trabajadores.
            </p>
          </CardContent>
        </Card>

        {/* Sección 2: De las Cercas a Toda la Construcción */}
        <Card>
          <CardHeader>
            <CardTitle>Más Allá de las Cercas: Una Solución para Toda la Construcción</CardTitle>
            <CardDescription>
              Evolucionamos para servir a toda la industria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Lo que comenzó como una solución para optimizar nuestro propio negocio de cercas (fencing) ha 
              evolucionado hasta convertirse en una plataforma integral para toda la industria de la construcción. 
              Entendimos que los desafíos de un "fencero" son los mismos que los de un "techero" (roofer), 
              un plomero (plumber), un concretero o un contratista general.
            </p>
            <p className="text-muted-foreground mb-4">
              Hoy, Owl Fenc está diseñado para servir a una amplia gama de especialidades. Ya sea que estés 
              instalando un techo, colocando cimientos de concreto, gestionando un proyecto de plomería o 
              construyendo una casa desde cero, nuestra plataforma te proporciona las herramientas para generar 
              estimados precisos, crear contratos legales y gestionar tus proyectos con una eficiencia sin precedentes.
            </p>
            
            {/* Lista de Especialidades */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-foreground">Especialidades Soportadas:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-muted-foreground">Techadores (Roofing)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-muted-foreground">Plomeros (Plumbing)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-muted-foreground">Concreteros (Concrete)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-muted-foreground">Contratistas Generales</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-muted-foreground">Cercas (Fencing)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary mr-2">✓</span>
                  <span className="text-muted-foreground">Y muchas más...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección 3: Características Principales */}
        <Card>
          <CardHeader>
            <CardTitle>Herramientas Profesionales al Alcance de tu Mano</CardTitle>
            <CardDescription>
              Todo lo que necesitas para gestionar tu negocio de construcción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium text-foreground mb-1">Estimador Inteligente con IA</h4>
                <p className="text-sm text-muted-foreground">
                  Genera estimaciones precisas en minutos para cualquier tipo de proyecto de construcción, 
                  con cálculos automáticos de materiales y mano de obra.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium text-foreground mb-1">Generador de Contratos Legales</h4>
                <p className="text-sm text-muted-foreground">
                  Crea documentos profesionales y legalmente sólidos adaptados a tu proyecto específico, 
                  listos para firma digital.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium text-foreground mb-1">Mervin AI - Tu Asistente y Agente</h4>
                <p className="text-sm text-muted-foreground">
                  Inteligencia artificial que responde preguntas, ejecuta tareas y te ayuda con cada aspecto 
                  de tu negocio, disponible 24/7.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium text-foreground mb-1">Verificación de Propiedad</h4>
                <p className="text-sm text-muted-foreground">
                  Confirma la propiedad legítima del inmueble antes de comenzar el trabajo, evitando 
                  problemas legales y estafas.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium text-foreground mb-1">Asesor de Permisos</h4>
                <p className="text-sm text-muted-foreground">
                  Investiga y comprende los requisitos de permisos locales para tu proyecto con ayuda de IA.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium text-foreground mb-1">Gestión Completa de Proyectos</h4>
                <p className="text-sm text-muted-foreground">
                  Seguimiento de proyectos, clientes, facturas y pagos, todo en un solo lugar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección 4: Nuestra Visión */}
        <Card>
          <CardHeader>
            <CardTitle>Construyendo el Futuro, Honrando Nuestras Raíces</CardTitle>
            <CardDescription>
              Nuestra visión y compromiso con la comunidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Nuestra visión es un futuro donde la tecnología no sea una barrera, sino un puente para el éxito 
              de la comunidad trabajadora. Somos la prueba de que la innovación puede surgir de cualquier lugar, 
              impulsada por la necesidad y la pasión. La plataforma es co-creada por un joven de 16 años, Mervin, 
              quien junto a su padre, combinó la sabiduría del trabajo manual con el poder del código.
            </p>
            <p className="text-muted-foreground">
              Estamos comprometidos a mejorar continuamente Owl Fenc, manteniéndonos fieles a nuestros valores 
              de trabajo duro, integridad y comunidad. Queremos que cada contratista en California y más allá 
              sienta el orgullo y la confianza de tener las mejores herramientas a su disposición, herramientas 
              que entienden su idioma, su cultura y sus desafíos diarios.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Llamada a la Acción */}
      <div className="mt-8 p-6 bg-muted rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-2">¿Necesitas Ayuda?</h3>
        <p className="mb-4 text-muted-foreground">
          Nuestro equipo, nuestra familia, está aquí para ayudarte. Hablamos tu idioma.
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
