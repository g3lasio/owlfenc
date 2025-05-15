import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import BankAccountConnect from '@/components/payments/BankAccountConnect';
import { Separator } from '@/components/ui/separator';

export default function BankAccounts() {
  // Verificar si se ha vuelto de Stripe con mensajes de éxito/error
  useEffect(() => {
    // Verificando resultado de redirección
    console.log("Verificando resultado de redirección...");
    
    // Comprobar parámetros en la URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('success')) {
      console.log("Redirección exitosa desde Stripe Connect");
    } else if (params.has('error')) {
      console.error("Error en la redirección desde Stripe Connect:", params.get('error'));
    }
  }, []);

  return (
    <div className="container py-6 space-y-6 max-w-5xl mx-auto">
      <Helmet>
        <title>Configuración de cuentas bancarias</title>
      </Helmet>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuentas bancarias</h1>
        <p className="text-muted-foreground mt-2">
          Configure sus cuentas bancarias para recibir pagos de sus clientes directamente en su cuenta.
        </p>
      </div>

      <Separator />

      <div className="space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <BankAccountConnect />
          </div>
          <div>
            <div className="bg-muted rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-2">¿Qué es Stripe Connect?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Stripe Connect es un servicio seguro que permite conectar su cuenta bancaria para recibir pagos directamente de sus clientes.
              </p>

              <h4 className="font-medium text-sm mb-1">Beneficios</h4>
              <ul className="text-sm text-muted-foreground list-disc pl-5 mb-4">
                <li>Reciba pagos directamente en su cuenta bancaria</li>
                <li>Todos los datos bancarios se almacenan de forma segura en Stripe</li>
                <li>Procesamiento automatizado de depósitos y pagos finales</li>
                <li>Evite tener que introducir manualmente los datos de pago</li>
              </ul>

              <h4 className="font-medium text-sm mb-1">Requisitos</h4>
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                <li>Cuenta bancaria a su nombre o de su empresa</li>
                <li>Documento de identidad para verificación</li>
                <li>Datos fiscales válidos</li>
                <li>Información básica de su negocio</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}