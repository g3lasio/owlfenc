import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function LegalPolicy() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Políticas Legales</h1>
        <p className="text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString()}
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h2 className="text-2xl font-semibold mt-6 mb-4">1. Términos de Servicio</h2>
        <p>
          Estos Términos de Servicio ("Términos") rigen su acceso y uso de la plataforma Owl Fence, 
          incluyendo cualquier contenido, funcionalidad y servicios ofrecidos en o a través de nuestra 
          plataforma. Al utilizar nuestros servicios, usted acepta estar sujeto a estos Términos.
        </p>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">1.1 Uso Aceptable</h3>
        <p>
          Usted acepta utilizar nuestra plataforma solo para fines lícitos y de acuerdo con estos Términos. 
          No utilizará nuestra plataforma:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>De cualquier manera que viole cualquier ley o regulación aplicable</li>
          <li>Para enviar, recibir, cargar, descargar o utilizar cualquier contenido que sea ilegal, dañino o fraudulento</li>
          <li>Para transmitir cualquier material que contenga virus de software o cualquier otro código informático diseñado para interferir con la funcionalidad de nuestros sistemas</li>
          <li>Para recopilar o rastrear información personal de otros usuarios</li>
        </ul>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">1.2 Cuentas de Usuario</h3>
        <p>
          Al crear una cuenta con nosotros, usted garantiza que:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Toda la información que proporcione es verdadera, precisa, actual y completa</li>
          <li>Mantendrá la precisión de dicha información y la actualizará según sea necesario</li>
          <li>Protegerá la seguridad de su cuenta y contraseña</li>
          <li>Aceptará la responsabilidad por todas las actividades que ocurran en su cuenta</li>
        </ul>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">1.3 Cambios en los Servicios</h3>
        <p>
          Nos reservamos el derecho de modificar o discontinuar, temporal o permanentemente, nuestros servicios 
          (o cualquier parte de ellos) con o sin previo aviso. No seremos responsables ante usted ni ante terceros 
          por cualquier modificación, suspensión o interrupción de los servicios.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Propiedad Intelectual</h2>
        <p>
          El servicio y todo su contenido, características y funcionalidad, incluidos pero no limitados a 
          texto, gráficos, logotipos, imágenes, software, así como la compilación de los mismos, son propiedad 
          de Owl Fence, sus licenciantes u otros proveedores de dicho material y están protegidos por leyes 
          de derechos de autor, marcas registradas, patentes, secretos comerciales y otras leyes de propiedad intelectual.
        </p>
        
        <h3 className="text-xl font-semibold mt-5 mb-3">2.1 Licencia Limitada</h3>
        <p>
          Se le concede una licencia limitada, no exclusiva y no transferible para acceder y utilizar nuestra 
          plataforma para su uso personal o profesional. Esta licencia no incluye:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>La reventa o uso comercial de nuestra plataforma o su contenido</li>
          <li>La reproducción, duplicación, copia o explotación de la plataforma con fines comerciales</li>
          <li>El uso de técnicas de minería de datos, robots o métodos similares de recopilación de datos</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Limitación de Responsabilidad</h2>
        <p>
          En ningún caso Owl Fence, sus directores, empleados, socios, agentes, proveedores o afiliados 
          serán responsables por daños indirectos, incidentales, especiales, consecuentes o punitivos, 
          incluidos, entre otros, la pérdida de ganancias, datos, uso, buena voluntad u otras pérdidas 
          intangibles, resultantes de:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Su acceso o uso o incapacidad para acceder o usar el servicio</li>
          <li>Cualquier conducta o contenido de terceros en el servicio</li>
          <li>Cualquier contenido obtenido del servicio</li>
          <li>Acceso no autorizado, uso o alteración de sus transmisiones o contenido</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Indemnización</h2>
        <p>
          Usted acepta defender, indemnizar y eximir de responsabilidad a Owl Fence y a sus licenciantes, 
          proveedores de servicios, empleados, agentes, funcionarios y directores de cualquier reclamo o 
          demanda, incluidos los honorarios razonables de abogados, realizados por cualquier tercero debido 
          a o como resultado de su incumplimiento de estos Términos o los documentos que incorporan por 
          referencia, o su violación de cualquier ley o los derechos de un tercero.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Ley Aplicable</h2>
        <p>
          Estos Términos se regirán e interpretarán de acuerdo con las leyes del Estado donde está registrada 
          nuestra empresa, sin dar efecto a ningún principio de conflictos de leyes. Cualquier acción legal 
          o procedimiento que surja bajo estos Términos será llevado exclusivamente en los tribunales federales 
          o estatales ubicados en dicho Estado.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Cambios en los Términos</h2>
        <p>
          Nos reservamos el derecho, a nuestro exclusivo criterio, de modificar o reemplazar estos Términos 
          en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso de al menos 
          30 días antes de que los nuevos términos entren en vigor. Lo que constituye un cambio material será 
          determinado a nuestro exclusivo criterio.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contacto</h2>
        <p>
          Si tiene alguna pregunta sobre estos Términos, por favor contáctenos a:
        </p>
        <p className="my-2">
          <strong>Correo Electrónico:</strong> <a href="mailto:legal@owlfenc.com" className="text-primary hover:underline">legal@owlfenc.com</a>
        </p>
      </div>
      
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <Link href="/privacy-policy">
          <Button variant="outline">Ver Política de Privacidad</Button>
        </Link>
        <Link href="/">
          <Button>Volver al Inicio</Button>
        </Link>
      </div>
    </div>
  );
}