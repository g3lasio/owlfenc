import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, ExternalLink, RefreshCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Tipos para la respuesta de estado de cuenta de Connect
interface ConnectAccount {
  connected: boolean;
  message?: string;
  accountId?: string;
  isComplete?: boolean;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  businessType?: string;
  createdAt?: Date;
}

// Tipos para cuentas bancarias externas
interface ExternalAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  lastFour: string;
  country: string;
  currency: string;
  status: string;
  isDefault: boolean;
}

export default function BankAccountConnect() {
  // Estado para el componente
  const [isLoading, setIsLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<ConnectAccount | null>(null);
  const [bankAccounts, setBankAccounts] = useState<ExternalAccount[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar el estado de la cuenta al montar el componente
  useEffect(() => {
    fetchAccountStatus();
  }, []);

  // Función para cargar el estado de la cuenta de Stripe Connect
  const fetchAccountStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await apiRequest<ConnectAccount>("GET", "/api/payments/connect/account-status");
      setAccountStatus(response);

      // Si la cuenta está conectada, obtener las cuentas bancarias
      if (response.connected && response.isComplete) {
        fetchBankAccounts();
      }
    } catch (error) {
      console.error("Error al verificar el estado de la cuenta:", error);
      setErrorMessage("No se pudo verificar el estado de la cuenta de Stripe Connect.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Función para obtener las cuentas bancarias asociadas
  const fetchBankAccounts = async () => {
    try {
      const accounts = await apiRequest<ExternalAccount[]>("GET", "/api/payments/connect/external-accounts");
      setBankAccounts(accounts || []);
    } catch (error) {
      console.error("Error al obtener cuentas bancarias:", error);
      setErrorMessage("No se pudieron cargar las cuentas bancarias asociadas.");
    }
  };

  // Función para iniciar el proceso de onboarding
  const startOnboarding = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // URL de retorno tras completar/cancelar el flujo de onboarding
      const returnUrl = window.location.origin + '/dashboard/bank-accounts?success=true';
      const refreshUrl = window.location.origin + '/dashboard/bank-accounts?refresh=true';

      const response = await apiRequest<{ url: string }>("POST", "/api/payments/connect/create-onboarding", {
        returnUrl,
        refreshUrl
      });

      if (response?.url) {
        // Redirigir al usuario a la página de onboarding de Stripe
        window.location.href = response.url;
      } else {
        throw new Error("No se recibió una URL de onboarding válida");
      }
    } catch (error) {
      console.error("Error al iniciar el onboarding:", error);
      setErrorMessage("No se pudo iniciar el proceso de conexión bancaria. Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para abrir el dashboard de Stripe Connect
  const openDashboard = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // URL de retorno tras salir del dashboard
      const returnUrl = window.location.origin + '/dashboard/bank-accounts';

      const response = await apiRequest<{ url: string }>("POST", "/api/payments/connect/dashboard-link", {
        returnUrl
      });

      if (response?.url) {
        // Abrir el dashboard en una nueva pestaña
        window.open(response.url, '_blank');
      } else {
        throw new Error("No se recibió una URL del dashboard válida");
      }
    } catch (error) {
      console.error("Error al abrir el dashboard:", error);
      setErrorMessage("No se pudo abrir el dashboard de Stripe Connect. Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  // Comprobar el estado de la URL actual (para manejar retornos desde Stripe)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const refresh = urlParams.get('refresh');

    if (success) {
      // Actualizar estado después de un retorno exitoso
      fetchAccountStatus();
      
      // Limpiar parámetros de URL
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    } else if (refresh) {
      // Actualizar estado después de un retorno de actualización
      fetchAccountStatus();
      
      // Limpiar parámetros de URL
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  // Renderizar el componente según el estado de la cuenta
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          Configuración de cuenta bancaria
          {isRefreshing && (
            <RefreshCcw className="w-4 h-4 ml-2 animate-spin" />
          )}
        </CardTitle>
        <CardDescription>
          Conecte su cuenta bancaria para recibir pagos directamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mensaje de error */}
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Estado de la cuenta */}
        {accountStatus && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-full ${accountStatus.connected ? 'bg-green-100' : 'bg-amber-100'}`}>
                {accountStatus.connected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {accountStatus.connected
                    ? accountStatus.isComplete
                      ? "Cuenta bancaria conectada"
                      : "Configuración incompleta"
                    : "No hay cuenta bancaria conectada"}
                </p>
                {accountStatus.connected && (
                  <p className="text-sm text-muted-foreground">
                    {accountStatus.isComplete
                      ? "Su cuenta está correctamente configurada para recibir pagos."
                      : "Necesita completar la configuración de su cuenta."}
                  </p>
                )}
              </div>
            </div>

            {/* Detalles adicionales si está conectado */}
            {accountStatus.connected && (
              <div className="bg-muted p-4 rounded-md mt-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">ID de cuenta:</span>
                  <span className="font-mono text-xs truncate">{accountStatus.accountId}</span>
                  
                  <span className="text-muted-foreground">Datos enviados:</span>
                  <span>{accountStatus.detailsSubmitted ? "Sí" : "No"}</span>
                  
                  <span className="text-muted-foreground">Pagos habilitados:</span>
                  <span>{accountStatus.chargesEnabled ? "Sí" : "No"}</span>
                  
                  <span className="text-muted-foreground">Transferencias habilitadas:</span>
                  <span>{accountStatus.payoutsEnabled ? "Sí" : "No"}</span>
                  
                  {accountStatus.businessType && (
                    <>
                      <span className="text-muted-foreground">Tipo de negocio:</span>
                      <span className="capitalize">{accountStatus.businessType}</span>
                    </>
                  )}
                  
                  {accountStatus.createdAt && (
                    <>
                      <span className="text-muted-foreground">Creada el:</span>
                      <span>{new Date(accountStatus.createdAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Lista de cuentas bancarias si hay alguna */}
            {bankAccounts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Cuentas bancarias conectadas</h3>
                <div className="space-y-3">
                  {bankAccounts.map((account) => (
                    <Card key={account.id} className={`overflow-hidden ${account.isDefault ? 'border-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">
                              {account.bankName} 
                              {account.isDefault && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Predeterminada</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {account.accountHolderName} • **** {account.lastFour}
                            </p>
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                                account.status === 'new' ? 'bg-amber-500' : 
                                account.status === 'validated' ? 'bg-green-500' : 
                                account.status === 'verified' ? 'bg-green-600' : 
                                'bg-red-500'
                              }`} />
                              <span className="capitalize">{account.status}</span>
                              <span className="mx-1.5">•</span>
                              <span className="uppercase">{account.currency}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Button 
          onClick={fetchAccountStatus} 
          variant="outline"
          disabled={isRefreshing}
          className="w-full sm:w-auto"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Actualizar estado
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {(!accountStatus?.connected || !accountStatus?.isComplete) && (
            <Button 
              onClick={startOnboarding} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {accountStatus?.connected 
                ? "Completar configuración" 
                : "Conectar cuenta bancaria"}
            </Button>
          )}
          
          {accountStatus?.connected && (
            <Button 
              onClick={openDashboard} 
              variant="outline"
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Administrar cuenta
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}