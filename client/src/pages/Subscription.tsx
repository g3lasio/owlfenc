import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PricingToggle } from "@/components/ui/pricing-toggle";
import { PricingCard } from "@/components/ui/pricing-card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  motto: string;
  code: string;
  isActive: boolean;
}

export default function Subscription() {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const userEmail = currentUser?.email || "";

  // Obtenemos los planes disponibles
  const {
    data: plans,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
    throwOnError: false,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    retry: 3,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      if (!data || data.length === 0) {
        console.warn("No se encontraron planes disponibles");
        toast({
          title: "Planes no disponibles",
          description:
            "No hay planes de suscripción disponibles en este momento.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Error cargando planes:", error);
      toast({
        title: "Error al cargar planes",
        description:
          "Por favor, actualice la página o contacte a soporte si el problema persiste.",
        variant: "destructive",
      });
    },
  });

  // Obtenemos la información de la suscripción actual del usuario
  const { data: userSubscription, isLoading: isLoadingUserSubscription } =
    useQuery({
      queryKey: ["/api/subscription/user-subscription"],
      throwOnError: false,
    });

  // Manual subscription update function
  const manualUpdateSubscription = async (planId: number) => {
    console.log("Iniciando actualización manual de suscripción para plan:", planId);
    setIsLoading(true);

    try {
      const response = await fetch('/api/subscription/manual-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          planId: planId
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: "Suscripción actualizada",
        description: `Tu suscripción ha sido actualizada manualmente al plan ${planId}`,
        variant: "default",
      });

      // Invalidar y refrescar las consultas
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/user-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] });

      console.log("Actualización manual exitosa:", result);
      
    } catch (error) {
      console.error("Error en actualización manual:", error);
      toast({
        title: "Error en actualización manual",
        description: "No se pudo actualizar la suscripción manualmente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Crea sesión de checkout para un plan seleccionado
  const createCheckoutSession = async (planId: number) => {
    console.log("Iniciando creación de sesión de checkout para plan:", planId);
    setIsLoading(true);

    try {
      // Construir los parámetros para la solicitud
      const params = {
        userEmail,
        planId,
        billingCycle: isYearly ? "yearly" : "monthly",
        successUrl: window.location.origin + "/subscription?success=true",
        cancelUrl: window.location.origin + "/subscription?canceled=true",
      };

      if (!userEmail.includes("@")) {
        throw new Error("El correo electrónico del usuario no es válido");
      }

      console.log(
        "Enviando solicitud a Stripe con parámetros:",
        JSON.stringify(params),
      );

      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${errorData.message || response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Respuesta recibida del servidor:", data);

      // Redireccionar al checkout de Stripe
      if (data && data.url) {
        console.log("Redirigiendo a URL de Stripe:", data.url);

        // Abrir en una nueva pestaña para evitar problemas de redirección
        const stripeWindow = window.open(data.url, "_blank");

        // Verificar si se pudo abrir la ventana
        if (!stripeWindow) {
          console.error(
            "No se pudo abrir la ventana de Stripe. Es posible que esté bloqueado por el navegador.",
          );
          toast({
            title: "Error en la redirección",
            description:
              "No se pudo abrir la página de pago. Por favor, permita ventanas emergentes para este sitio y vuelva a intentarlo.",
            variant: "destructive",
          });
        }

        // Siempre restablecer el estado de carga
        setIsLoading(false);
      } else {
        throw new Error("No se recibió URL de checkout válida");
      }
    } catch (error) {
      console.error("Error detallado al crear sesión de checkout:", error);
      toast({
        title: "Error en la redirección",
        description:
          "No se pudo procesar la solicitud de suscripción. Por favor, intente de nuevo o contacte a soporte.",
        variant: "destructive",
      });
    } finally {
      // Asegurar que siempre se restablezca el estado de carga
      setIsLoading(false);
    }
  };

  // Crear portal de cliente para gestionar la suscripción
  const createCustomerPortal = async () => {
    console.log("Iniciando creación de portal de cliente");
    setIsLoading(true);

    try {
      const params = {
        successUrl: window.location.origin + "/subscription",
      };

      console.log("Enviando solicitud para crear portal de cliente");

      const response = await fetch("/api/subscription/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${errorData.message || response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Respuesta recibida para portal de cliente:", data);

      // Redireccionar al portal de cliente de Stripe
      if (data && data.url) {
        console.log("Redirigiendo a URL del portal de cliente:", data.url);

        // Abrir en una nueva pestaña para evitar problemas de redirección
        const stripeWindow = window.open(data.url, "_blank");

        // Verificar si se pudo abrir la ventana
        if (!stripeWindow) {
          console.error(
            "No se pudo abrir la ventana del portal de cliente. Es posible que esté bloqueado por el navegador.",
          );
          toast({
            title: "Error en la redirección",
            description:
              "No se pudo abrir el portal de cliente. Por favor, permita ventanas emergentes para este sitio y vuelva a intentarlo.",
            variant: "destructive",
          });
        }

        // Siempre restablecer el estado de carga
        setIsLoading(false);
      } else {
        throw new Error("No se recibió URL válida del portal de cliente");
      }
    } catch (error) {
      console.error("Error detallado al crear portal de cliente:", error);
      toast({
        title: "Error en la redirección",
        description:
          "No se pudo acceder al portal de cliente. Por favor, intente de nuevo o contacte a soporte.",
        variant: "destructive",
      });
    } finally {
      // Asegurar que siempre se restablezca el estado de carga
      setIsLoading(false);
    }
  };

  // Comprueba si la redirección es de un checkout exitoso o cancelado
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get("success") === "true";
    const isCanceled = urlParams.get("canceled") === "true";

    // Solo procesar si hay parámetros de éxito o cancelación
    if (isSuccess || isCanceled) {
      console.log("Detectados parámetros de redirección:", {
        isSuccess,
        isCanceled,
      });

      // Limpiar parámetros de URL inmediatamente
      try {
        const newUrl = window.location.pathname;
        window.history.pushState({}, document.title, newUrl);
        console.log("Parámetros de URL limpiados");
      } catch (error) {
        console.error("Error al limpiar parámetros de URL:", error);
      }

      // Procesar resultado después de un breve retraso para permitir que la interfaz se renderice
      setTimeout(() => {
        if (isSuccess) {
          console.log("Procesando redirección exitosa");
          toast({
            title: "¡Suscripción exitosa!",
            description: "Tu suscripción ha sido procesada correctamente.",
          });

          // Actualizar los datos de la suscripción
          queryClient.invalidateQueries({
            queryKey: ["/api/subscription/user-subscription"],
          });
          console.log("Datos de suscripción actualizados");
        } else if (isCanceled) {
          console.log("Procesando redirección cancelada");
          toast({
            title: "Suscripción cancelada",
            description: "Has cancelado el proceso de suscripción.",
            variant: "destructive",
          });
        }
      }, 100);
    }
  }, [toast, queryClient]);

  // Determinar cuál plan marcar como el más popular (El Mero Patrón)
  const getIsMostPopular = (planCode: string) => planCode === "mero_patron";

  const isLoadingData = isLoadingPlans || isLoadingUserSubscription;
  const hasError =
    plansError || (!isLoadingPlans && (!plans || plans.length === 0));

  if (isLoadingData) {
    return (
      <div className="container max-w-6xl mx-auto py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            Cargando planes de suscripción...
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <div className="text-red-500 mb-4">
            <i className="ri-error-warning-line text-4xl"></i>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            Error al cargar los planes
          </h2>
          <p className="text-muted-foreground">
            No se pudieron cargar los planes de suscripción.
          </p>
        </div>
      </div>
    );
  }

  // Obtener el plan activo del usuario
  const getActivePlanId = () => {
    if (userSubscription?.active && userSubscription?.subscription?.planId) {
      return userSubscription.subscription.planId;
    }
    return 1; // Plan gratuito por defecto
  };

  // Obtener fecha de expiración
  const getExpirationDate = () => {
    if (userSubscription?.subscription?.currentPeriodEnd) {
      return new Date(userSubscription.subscription.currentPeriodEnd);
    }
    return null;
  };

  const activePlanId = getActivePlanId();
  const expirationDate = getExpirationDate();

  return (
    <div className="container max-w-6xl p-4 mx-auto py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Planes de Suscripción
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Elige el plan perfecto para tu negocio. Todos los planes incluyen
          acceso completo a Mervin, tu asistente personal para contratistas.
        </p>
      </div>

      {/* Toggle entre facturación mensual y anual */}
      <div className="flex justify-center mb-10">
        <PricingToggle
          isYearly={isYearly}
          onToggle={setIsYearly}
          className="mb-6"
        />
      </div>

      {/* Manual Update Debug Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-10 text-center">
        <h3 className="text-lg font-medium mb-2 text-red-800">🔧 Manual Subscription Update</h3>
        <p className="text-red-700 mb-4">
          If you purchased a plan but it's not showing as active, use this manual update button:
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => manualUpdateSubscription(2)}
            disabled={isLoading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Activate Mero Patrón
          </button>
          <button
            onClick={() => manualUpdateSubscription(3)}
            disabled={isLoading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Activate Master Contractor
          </button>
        </div>
      </div>

      {/* Mostrar información de la suscripción actual si no es gratuita */}
      {activePlanId !== 1 && (
        <div className="bg-muted/50 rounded-lg p-6 mb-10 text-center">
          <h3 className="text-lg font-medium mb-2">Suscripción Actual</h3>
          <p className="mb-4">
            Actualmente tienes el plan{" "}
            <span className="font-bold">
              {plans?.find((p) => p.id === activePlanId)?.name || "Desconocido"}
            </span>
            {expirationDate && (
              <>
                {" "}válido hasta el{" "}
                <span className="font-bold">
                  {expirationDate.toLocaleDateString()}
                </span>
              </>
            )}
          </p>
          <button
            onClick={createCustomerPortal}
            disabled={isLoading}
            className="text-primary hover:underline font-medium"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Administrar suscripción
          </button>
        </div>
      )}

      {/* Mostrar las tarjetas de planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-10">
        {plans
          ?.filter((plan) => plan.isActive)
          .map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              description={plan.description}
              price={plan.price}
              yearlyPrice={plan.yearlyPrice}
              features={plan.features as string[]}
              isYearly={isYearly}
              motto={plan.motto}
              isMostPopular={getIsMostPopular(plan.code)}
              onSelectPlan={createCheckoutSession}
              planId={plan.id}
              isLoading={isLoading}
              code={plan.code}
              isActive={plan.id === activePlanId}
              expirationDate={plan.id === activePlanId ? expirationDate : undefined}
            />
          ))}
      </div>

      {/* Información adicional */}
      <div className="mt-16 text-center">
        <h3 className="text-xl font-bold mb-3">
          ¿Necesitas ayuda para elegir?
        </h3>
        <p className="text-muted-foreground">
          Contacta con nuestro equipo de ventas para obtener más información
          sobre qué plan se ajusta mejor a tus necesidades.
        </p>
        <div className="mt-4">
          <a
            href="mailto:ventas@owlfence.com"
            className="text-primary hover:underline font-medium"
          >
            ventas@owlfence.com
          </a>
        </div>
      </div>
    </div>
  );
}
