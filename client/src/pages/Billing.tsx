import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Info, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CardForm } from "@/components/payments/CardForm";
import { Link } from "wouter";

// Interfaces para tipos de datos
interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  amount_paid: number;
  created: number; // timestamp
  invoice_pdf: string;
}

interface UserSubscription {
  id?: number;
  status: string;
  planId?: number;
  billingCycle?: string;
  nextBillingDate?: string;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
}

export default function Billing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activePaymentMethodId, setActivePaymentMethodId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Obtener métodos de pago
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useQuery<
    PaymentMethod[]
  >({
    queryKey: ["/api/subscription/payment-methods"],
    throwOnError: false,
  });

  // Obtener historial de pagos
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/subscription/payment-history"],
    throwOnError: false,
  });

  // Obtener información de suscripción
  const { data: userSubscription, isLoading: isLoadingSubscription } =
    useQuery<UserSubscription>({
      queryKey: ["/api/subscription/user-subscription"],
      throwOnError: false,
    });

  // Obtener planes disponibles
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
    throwOnError: false,
  });

  // Mutación para crear sesión de actualización de pago
  const createPaymentUpdateSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/subscription/update-payment-method",
        {},
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo iniciar la sesión de actualización de pago.",
      });
    },
  });

  // Mutación para crear portal de cliente
  const createCustomerPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/subscription/create-portal",
        {
          successUrl: window.location.origin + "/billing?success=true",
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el portal de gestión de suscripción.",
      });
    },
  });

  // Función para formatear fecha de un timestamp
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  // Función para formatear precio en dólares estadounidenses
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  // Obtener el nombre del plan actual
  const getCurrentPlanName = (): string => {
    if (!userSubscription || !plans || !Array.isArray(plans)) {
      return "Plan Básico";
    }

    if (userSubscription.status === "active" && userSubscription.planId) {
      const currentPlan = plans.find(
        (plan) => plan.id === userSubscription.planId,
      );
      return currentPlan ? currentPlan.name : "Plan Básico";
    }

    return "Plan Básico";
  };

  // Obtener la fecha de renovación formateada
  const getNextBillingDate = (): string => {
    if (!userSubscription || !userSubscription.nextBillingDate) {
      return "No disponible";
    }

    const date = new Date(userSubscription.nextBillingDate);
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  // Manejar actualización de método de pago
  const handleUpdatePaymentMethod = () => {
    createPaymentUpdateSessionMutation.mutate();
  };

  // Manejar apertura del portal de Stripe
  const handleOpenStripePortal = () => {
    createCustomerPortalMutation.mutate();
  };

  // Verificar si hay redirección desde Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get("success") === "true";

    if (isSuccess) {
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Invalidar consultas para refrescar datos
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/payment-methods"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/payment-history"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/user-subscription"],
      });

      toast({
        title: "Actualización exitosa",
        description:
          "Tu información de pago ha sido actualizada correctamente.",
      });
    }
  }, []);

  // Mostrar método de pago predeterminado
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      setActivePaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods]);

  return (
    <div className="container p-4 max-w-5xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturación y Pagos</h1>
        <p className="text-muted-foreground">
          Administra tu información de pago y revisa tu historial de facturación
        </p>
      </div>

      <Tabs defaultValue="payment-methods" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full gap-2 px-2">
            <TabsTrigger value="payment-methods" className="whitespace-nowrap">
              Métodos de Pago
            </TabsTrigger>
            <TabsTrigger value="billing-history" className="whitespace-nowrap">
              Historial de Facturación
            </TabsTrigger>
            <TabsTrigger value="subscription" className="whitespace-nowrap">
              Suscripción
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB: MÉTODOS DE PAGO */}
        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>
                Administra tus tarjetas y métodos de pago para facturación
                automática
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingPaymentMethods ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : paymentMethods && paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 mr-2 text-muted-foreground" />
                          <span className="font-medium capitalize">
                            {method.card?.brand || "Tarjeta"}
                          </span>
                          {method.id === activePaymentMethodId && (
                            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Predeterminado
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          •••• •••• •••• {method.card?.last4 || "****"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Expira: {method.card?.exp_month}/
                          {method.card?.exp_year}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-lg">
                  <div className="mb-2 flex justify-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No tienes métodos de pago registrados
                  </p>

                  <div className="mx-auto max-w-md px-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Agregar tarjeta de crédito o débito
                    </h3>
                    <div className="mt-4">
                      <div id="payment-form">
                        <CardForm
                          onSuccess={() => {
                            queryClient.invalidateQueries({
                              queryKey: ["/api/subscription/payment-methods"],
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleUpdatePaymentMethod}
                disabled={createPaymentUpdateSessionMutation.isPending}
              >
                {createPaymentUpdateSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>Actualizar método de pago</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* TAB: HISTORIAL DE FACTURACIÓN */}
        <TabsContent value="billing-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Facturación</CardTitle>
              <CardDescription>Tus facturas y pagos recientes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="rounded-md border">
                  <div className="grid grid-cols-5 border-b bg-muted/50 p-3 text-sm font-medium">
                    <div>Número</div>
                    <div>Fecha</div>
                    <div>Monto</div>
                    <div>Estado</div>
                    <div className="text-right">Acciones</div>
                  </div>
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="grid grid-cols-5 p-3 text-sm"
                    >
                      <div>{invoice.number}</div>
                      <div>{formatDate(invoice.created)}</div>
                      <div>{formatAmount(invoice.amount_paid)}</div>
                      <div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {invoice.status === "paid" ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="text-right">
                        <a
                          href={invoice.invoice_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Descargar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border rounded-lg">
                  <div className="mb-2 flex justify-center">
                    <Info className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    No hay facturas disponibles
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SUSCRIPCIÓN */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de Suscripción</CardTitle>
              <CardDescription>
                Información sobre tu plan actual y opciones de suscripción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSubscription ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="text-lg font-medium">Plan Actual</h3>
                      <p className="text-2xl font-bold mt-1">
                        {getCurrentPlanName()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {userSubscription?.status === "active"
                          ? "Suscripción activa"
                          : "Suscripción inactiva"}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">
                        Próxima Renovación
                      </h3>
                      <p className="text-2xl font-bold mt-1">
                        {getNextBillingDate()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Ciclo de facturación:{" "}
                        {userSubscription?.billingCycle === "yearly"
                          ? "Anual"
                          : "Mensual"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Beneficios de tu plan</h3>
                    {plans && userSubscription?.planId && (
                      <ul className="space-y-2">
                        {plans
                          .find((plan) => plan.id === userSubscription.planId)
                          ?.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-600 mr-2">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col md:flex-row gap-4 md:justify-between">
              <div className="text-sm text-muted-foreground">
                <p>
                  Puedes cambiar de plan o cancelar tu suscripción en cualquier
                  momento.
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={handleOpenStripePortal}
                  disabled={createCustomerPortalMutation.isPending}
                >
                  {createCustomerPortalMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>Gestionar Suscripción</>
                  )}
                </Button>
                <Link href="/subscription">
                  <Button variant="default" className="w-full">
                    Ver Planes Disponibles
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
