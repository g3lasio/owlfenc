import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
        <p className="text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString()}
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="lead">
          En Owl Fence, la privacidad de nuestros usuarios es extremadamente importante. Esta Política de Privacidad 
          describe cómo recopilamos, usamos, compartimos y protegemos su información personal cuando utiliza nuestra plataforma.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Información que Recopilamos</h2>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">1.1 Información que usted nos proporciona</h3>
        <p>
          Recopilamos información que usted nos proporciona directamente cuando:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Crea una cuenta en nuestra plataforma</li>
          <li>Completa formularios o campos en nuestros servicios</li>
          <li>Se comunica con nosotros o con otros usuarios a través de nuestras funciones de comunicación</li>
          <li>Comparte información sobre proyectos, clientes o estimaciones</li>
          <li>Sube documentos, fotos o cualquier otro contenido relacionado con servicios de cercado</li>
        </ul>
        
        <p>
          Esta información puede incluir:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Información de identificación personal como nombre, dirección de correo electrónico, número de teléfono y dirección postal</li>
          <li>Información de la empresa como nombre del negocio, dirección comercial, número de identificación fiscal</li>
          <li>Información de clientes que usted gestiona a través de nuestra plataforma</li>
          <li>Información de proyectos, incluyendo ubicaciones, especificaciones y costos</li>
          <li>Comunicaciones y correspondencia que mantiene con nosotros y otros usuarios</li>
        </ul>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">1.2 Información recopilada automáticamente</h3>
        <p>
          Cuando utiliza nuestra plataforma, recopilamos automáticamente cierta información, incluyendo:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Información sobre el dispositivo: tipo de dispositivo, sistema operativo, identificadores únicos de dispositivo</li>
          <li>Información de registro: detalles de cómo ha utilizado nuestros servicios, direcciones IP, páginas visitadas, tiempo de permanencia</li>
          <li>Información de ubicación: si ha permitido el acceso a los servicios de ubicación de su dispositivo</li>
          <li>Información de cookies: utilizamos cookies y tecnologías similares para recopilar información sobre cómo interactúa con nuestros servicios</li>
        </ul>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">1.3 Información de fuentes externas</h3>
        <p>
          En algunos casos, podemos obtener información de fuentes externas, como:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Proveedores de servicios de verificación de propiedad (como ATTOM Data)</li>
          <li>Integraciones con otros servicios que usted conecte a nuestra plataforma</li>
          <li>Proveedores de servicios de análisis y marketing</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Cómo Utilizamos su Información</h2>
        <p>
          Utilizamos la información que recopilamos para:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Proporcionar, mantener y mejorar nuestros servicios</li>
          <li>Crear y mantener su cuenta</li>
          <li>Procesar transacciones y enviar notificaciones relacionadas</li>
          <li>Enviar comunicaciones técnicas, actualizaciones, alertas y mensajes de soporte</li>
          <li>Responder a sus comentarios, preguntas y solicitudes</li>
          <li>Desarrollar nuevos productos y servicios</li>
          <li>Monitorear y analizar tendencias, uso y actividades en relación con nuestros servicios</li>
          <li>Personalizar y mejorar la experiencia del usuario</li>
          <li>Detectar, investigar y prevenir actividades fraudulentas y accesos no autorizados</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Cómo Compartimos su Información</h2>
        <p>
          Podemos compartir su información en las siguientes circunstancias:
        </p>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">3.1 Con proveedores de servicios</h3>
        <p>
          Compartimos información con proveedores de servicios externos que realizan servicios en nuestro nombre, como:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Procesamiento de pagos</li>
          <li>Análisis de datos</li>
          <li>Alojamiento de correo electrónico y web</li>
          <li>Servicio al cliente</li>
          <li>Servicios de verificación de propiedad inmobiliaria</li>
        </ul>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">3.2 Para cumplir con requisitos legales</h3>
        <p>
          Podemos divulgar su información si creemos de buena fe que es necesario para:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Cumplir con leyes aplicables, regulaciones, procesos legales o solicitudes gubernamentales</li>
          <li>Hacer cumplir nuestros términos de servicio y otras políticas</li>
          <li>Proteger nuestros derechos, propiedad o seguridad, o la de nuestros usuarios u otros</li>
        </ul>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">3.3 Con su consentimiento</h3>
        <p>
          Podemos compartir su información con terceros cuando nos haya dado su consentimiento para hacerlo.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Seguridad de los Datos</h2>
        <p>
          Implementamos medidas de seguridad diseñadas para proteger su información personal, incluidas:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Encriptación de datos en tránsito y en reposo</li>
          <li>Acceso restringido a información personal</li>
          <li>Monitoreo y pruebas de seguridad regulares</li>
          <li>Políticas y procedimientos internos de seguridad</li>
        </ul>
        <p>
          Sin embargo, ningún sistema de seguridad es impenetrable y no podemos garantizar la seguridad absoluta de su información.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Sus Derechos y Opciones</h2>
        <p>
          Dependiendo de su ubicación, puede tener ciertos derechos con respecto a su información personal, que incluyen:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Acceder a su información personal</li>
          <li>Corregir información inexacta o incompleta</li>
          <li>Eliminar su información personal</li>
          <li>Restringir u oponerse al procesamiento de sus datos</li>
          <li>Obtener una copia de su información personal en un formato estructurado y legible por máquina</li>
          <li>Retirar su consentimiento en cualquier momento (cuando el procesamiento se base en el consentimiento)</li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, contáctenos a través de los datos proporcionados al final de esta política.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Retención de Datos</h2>
        <p>
          Conservamos su información personal mientras sea necesario para proporcionar los servicios que ha solicitado,
          cumplir con nuestras obligaciones legales, resolver disputas y hacer cumplir nuestros acuerdos. Los criterios
          utilizados para determinar nuestros períodos de retención incluyen:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>La duración de nuestra relación con usted</li>
          <li>Obligaciones legales a las que estamos sujetos</li>
          <li>Estatutos de limitaciones aplicables</li>
          <li>Disputas potenciales</li>
          <li>Directrices emitidas por autoridades de protección de datos relevantes</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Transferencias Internacionales de Datos</h2>
        <p>
          Nuestra plataforma opera globalmente, lo que significa que su información puede ser transferida, almacenada
          y procesada en países distintos al suyo, incluidos los Estados Unidos, donde pueden existir leyes de protección
          de datos diferentes. Al utilizar nuestros servicios, usted consiente la transferencia de su información a estos países.
        </p>
        <p>
          Tomamos medidas para garantizar que sus datos reciban un nivel adecuado de protección en los países donde los procesamos.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Cambios a esta Política</h2>
        <p>
          Podemos actualizar esta Política de Privacidad de vez en cuando. La versión más reciente siempre estará
          disponible en nuestra plataforma. Le notificaremos sobre cualquier cambio material a esta política mediante
          un aviso destacado en nuestra plataforma o enviándole un correo electrónico directamente.
        </p>
        <p>
          Le recomendamos que revise periódicamente esta política para mantenerse informado sobre cómo protegemos su información.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Contacto</h2>
        <p>
          Si tiene alguna pregunta, inquietud o solicitud relacionada con esta Política de Privacidad o el procesamiento
          de su información personal, contáctenos a:
        </p>
        <p className="my-2">
          <strong>Correo Electrónico:</strong> <a href="mailto:privacy@owlfenc.com" className="text-primary hover:underline">privacy@owlfenc.com</a>
        </p>
        <p className="my-2">
          <strong>Dirección:</strong> [Dirección física de la empresa]
        </p>
      </div>
      
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <Link href="/legal-policy">
          <Button variant="outline">Ver Políticas Legales</Button>
        </Link>
        <Link href="/">
          <Button>Volver al Inicio</Button>
        </Link>
      </div>
    </div>
  );
}