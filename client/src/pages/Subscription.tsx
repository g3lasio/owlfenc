import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PricingToggle } from "@/components/ui/pricing-toggle";
import { PricingCard } from "@/components/ui/pricing-card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Obtenemos los planes disponibles
  const { data: plans, isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
    throwOnError: false,
  });

  // Obtenemos la información de la suscripción actual del usuario
  const { data: userSubscription, isLoading: isLoadingUserSubscription } = useQuery({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  // Crea sesión de checkout para un plan seleccionado
  const createCheckoutSession = async (planId: number) => {
    setIsLoading(true);

    try {
      const { url } = await apiRequest("/api/subscription/create-checkout", {
        method: "POST",
        body: {
          planId,
          billingCycle: isYearly ? "yearly" : "monthly",
          successUrl: window.location.origin + "/subscription?success=true",
          cancelUrl: window.location.origin + "/subscription?canceled=true",
        },
      });

      // Redireccionar al checkout de Stripe
      window.location.href = url;
    } catch (error) {
      console.error("Error al crear sesión de checkout:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la sesión de checkout. Inténtelo de nuevo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Crear portal de cliente para gestionar la suscripción
  const createCustomerPortal = async () => {
    setIsLoading(true);

    try {
      const { url } = await apiRequest("/api/subscription/create-portal", {
        method: "POST",
        body: {
          successUrl: window.location.origin + "/subscription",
        },
      });

      // Redireccionar al portal de cliente de Stripe
      window.location.href = url;
    } catch (error) {
      console.error("Error al crear portal de cliente:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el portal de cliente. Inténtelo de nuevo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Comprueba si la redirección es de un checkout exitoso o cancelado
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get("success") === "true") {
      toast({
        title: "¡Suscripción exitosa!",
        description: "Tu suscripción ha sido procesada correctamente.",
      });
      
      // Eliminar el parámetro de la URL sin recargar la página
      const newUrl = window.location.pathname;
      window.history.pushState({}, document.title, newUrl);
      
      // Actualizar los datos de la suscripción
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/user-subscription"] });
    } else if (urlParams.get("canceled") === "true") {
      toast({
        title: "Suscripción cancelada",
        description: "Has cancelado el proceso de suscripción.",
        variant: "destructive",
      });
      
      // Eliminar el parámetro de la URL sin recargar la página
      const newUrl = window.location.pathname;
      window.history.pushState({}, document.title, newUrl);
    }
  }, [toast, queryClient]);

  // Determinar cuál plan marcar como el más popular (El Mero Patrón)
  const getIsMostPopular = (planCode: string) => planCode === "mero_patron";

  if (isLoadingPlans || isLoadingUserSubscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando planes de suscripción...</p>
      </div>
    );
  }

  // Comprobar si el usuario ya tiene una suscripción activa
  const hasActiveSubscription = userSubscription && 
    ["active", "trialing"].includes(userSubscription.status);

  return (
    <div className="container max-w-6xl py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Planes de Suscripción
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Elige el plan perfecto para tu negocio. Todos los planes incluyen acceso completo a Mervin, tu asistente personal para contratistas.
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

      {/* Mostrar información de la suscripción actual si existe */}
      {hasActiveSubscription && (
        <div className="bg-muted/50 rounded-lg p-6 mb-10 text-center">
          <h3 className="text-lg font-medium mb-2">Suscripción Actual</h3>
          <p className="mb-4">
            Actualmente tienes el plan{" "}
            <span className="font-bold">
              {plans?.find(p => p.id === userSubscription.planId)?.name || "Desconocido"}
            </span>{" "}
            con renovación{" "}
            {userSubscription.billingCycle === "yearly" ? "anual" : "mensual"}.
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
        {plans?.filter(plan => plan.isActive).map((plan) => (
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
          />
        ))}
      </div>

      {/* Información adicional */}
      <div className="mt-16 text-center">
        <h3 className="text-xl font-bold mb-3">¿Necesitas ayuda para elegir?</h3>
        <p className="text-muted-foreground">
          Contacta con nuestro equipo de ventas para obtener más información sobre qué plan se ajusta mejor a tus necesidades.
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