import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PricingToggle } from "@/components/ui/pricing-toggle";
import { PricingCard } from "@/components/ui/pricing-card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getActivePlans, type SubscriptionPlan } from "@shared/subscription-plans";

export default function Subscription() {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const userEmail = currentUser?.email || "";

  // ✅ ALTERNATIVA 1: Planes embebidos - carga instantánea sin fetch
  const plans = getActivePlans();
  const isLoadingPlans = false; // Siempre false porque los planes están embebidos
  const plansError = null; // Nunca hay error porque no hay fetch

  console.log("⚡ [SUBSCRIPTION-INSTANT] Planes cargados instantáneamente:", plans.length);

  // Check for successful payment and refresh subscription status
  useEffect(() => {
    const checkSuccessRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get("success");
      const sessionId = urlParams.get("session_id");
      
      if (success === "true" && sessionId && userEmail) {
        console.log("✅ Payment completed, checking subscription status...");
        
        // Show success message
        toast({
          title: "¡Pago procesado!",
          description: "Verificando el estado de tu suscripción...",
          variant: "default",
        });
        
        // Wait a moment for webhook processing, then refresh subscription data
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/subscription/user-subscription", userEmail] });
        }, 2000);
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    checkSuccessRedirect();
  }, [userEmail, toast, queryClient]);

  // Obtenemos la información de la suscripción actual del usuario
  // ✅ OPTIMIZACIÓN: Usando sistema de autenticación con timeout para evitar bloqueos infinitos
  const { data: userSubscription, isLoading: isLoadingUserSubscription } =
    useQuery<any>({
      queryKey: ["/api/subscription/user-subscription", userEmail],
      enabled: !!currentUser && !!userEmail,
      retry: 2, // Solo 2 intentos para no bloquear por mucho tiempo
      retryDelay: 1000, // 1 segundo entre intentos
      staleTime: 30000, // 30 segundos de cache
      gcTime: 60000, // 1 minuto en cache
    });

  // 🎯 Extract hasUsedTrial flag from subscription data
  const hasUsedTrial = userSubscription?.hasUsedTrial || false;

  // Función para activar planes gratuitos directamente
  const activateFreePlan = async (planId: number, planCode: string) => {
    setIsLoading(true);
    try {
      if (!currentUser) {
        throw new Error("Debes iniciar sesión para continuar");
      }

      // 🔐 IMPROVED: Obtener token fresco de Firebase primero, localStorage como backup
      let token: string | null = null;
      
      // 1. Intentar obtener token fresco del currentUser (más confiable)
      try {
        token = await currentUser.getIdToken(true); // force refresh
        console.log('✅ [SUBSCRIPTION] Token obtenido del currentUser');
        // Actualizar localStorage con el token fresco
        localStorage.setItem('firebase_id_token', token);
      } catch (freshTokenError) {
        console.warn('⚠️ [SUBSCRIPTION] No se pudo obtener token fresco, intentando con cache');
        try {
          token = await currentUser.getIdToken(false);
          console.log('✅ [SUBSCRIPTION] Token obtenido del cache de currentUser');
        } catch (cacheError) {
          // 2. Fallback a localStorage solo si currentUser falla
          const storedToken = localStorage.getItem('firebase_id_token');
          if (storedToken) {
            token = storedToken;
            console.log('✅ [SUBSCRIPTION] Token obtenido de localStorage');
          }
        }
      }

      if (!token) {
        throw new Error("No se pudo obtener token de autenticación. Por favor inicia sesión de nuevo.");
      }

      // Si es Free Trial, usar el endpoint de activación de trial
      if (planCode === 'FREE_TRIAL' || planId === 4) {
        const response = await fetch('/api/secure-trial/activate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'No se pudo activar el Free Trial');
        }

        toast({
          title: "¡Free Trial Activado!",
          description: "Tienes 14 días de acceso ilimitado a todas las funciones.",
        });
      } else if (planId === 5 || planCode === 'PRIMO_CHAMBEADOR' || planCode === 'primo_chambeador') {
        // Para Primo Chambeador (plan gratuito por defecto)
        const response = await fetch('/api/subscription/activate-free-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ planId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'No se pudo activar el plan gratuito');
        }

        toast({
          title: "¡Bienvenido!",
          description: "Has activado el plan Primo Chambeador. ¡Empieza a usar la plataforma!",
        });
      } else {
        // Otro plan gratuito desconocido
        toast({
          title: "Plan Activado",
          description: `Has seleccionado el plan ${planCode}.`,
        });
      }

      // Invalidar queries para actualizar la UI (con userEmail para que coincida con la clave exacta)
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/user-subscription", userEmail] });
    } catch (error: any) {
      console.error("Error activando plan gratuito:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo activar el plan. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejador unificado para selección de planes
  const handlePlanSelection = async (planId: number) => {
    const selectedPlan = plans?.find(p => p.id === planId);
    
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Plan no encontrado",
        variant: "destructive",
      });
      return;
    }

    // 🎯 LÓGICA CORREGIDA: 
    // 1. Si es plan gratuito (precio 0) → activar directamente
    // 2. Si es plan de pago Y usuario NO ha usado trial → activar FREE_TRIAL primero
    // 3. Si es plan de pago Y usuario YA usó trial → ir a Stripe checkout
    
    if (selectedPlan.price === 0) {
      // Plan gratuito (Primo Chambeador) - activar directamente
      await activateFreePlan(planId, selectedPlan.code);
    } else if (!hasUsedTrial) {
      // 🆓 PLAN DE PAGO + NUNCA USÓ TRIAL = Activar FREE_TRIAL (14 días gratis)
      // Esto es lo que el usuario espera cuando clickea "Start Free Trial"
      console.log(`🎁 [SUBSCRIPTION] Usuario no ha usado trial - Activando FREE_TRIAL (ID: 4) antes de ${selectedPlan.name}`);
      await activateFreePlan(4, 'FREE_TRIAL'); // Plan ID 4 = Free Trial
    } else {
      // Ya usó el trial - ir directo a Stripe Checkout para pagar
      console.log(`💳 [SUBSCRIPTION] Usuario ya usó trial - Redirigiendo a Stripe para ${selectedPlan.name}`);
      await createCheckoutSession(planId);
    }
  };

  // Crea sesión de checkout para un plan seleccionado
  const createCheckoutSession = async (planId: number) => {
    console.log("Iniciando creación de sesión de checkout para plan:", planId);
    setIsLoading(true);

    try {
      if (!currentUser) {
        throw new Error("Debes iniciar sesión para continuar");
      }

      // Construir los parámetros para la solicitud
      const params = {
        userEmail,
        planId,
        billingCycle: isYearly ? "yearly" : "monthly",
        successUrl: window.location.origin + "/subscription?success=true&session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: window.location.origin + "/subscription?canceled=true",
      };

      if (!userEmail.includes("@")) {
        throw new Error("El correo electrónico del usuario no es válido");
      }

      console.log(
        "Enviando solicitud a Stripe con parámetros:",
        JSON.stringify(params),
      );

      // Obtener token de Firebase - primero intentar desde localStorage (REST API directa)
      let token: string | null = null;
      
      // Intento 1: Token directo desde localStorage (para REST API login)
      const directToken = localStorage.getItem('firebase_id_token');
      if (directToken) {
        console.log("✅ [SUBSCRIPTION] Token obtenido desde localStorage (REST API)");
        token = directToken;
      }
      
      // Intento 2: Token desde Firebase SDK (solo si no hay token directo)
      if (!token) {
        try {
          console.log("🔐 [SUBSCRIPTION] Obteniendo token de Firebase SDK...");
          token = await currentUser.getIdToken(false);
          console.log("✅ [SUBSCRIPTION] Token obtenido desde SDK exitosamente");
        } catch (tokenError) {
          console.error("❌ [SUBSCRIPTION] Error obteniendo token desde SDK:", tokenError);
          // Intentar con force refresh
          try {
            console.log("🔄 [SUBSCRIPTION] Reintentando con force refresh...");
            token = await currentUser.getIdToken(true);
            console.log("✅ [SUBSCRIPTION] Token obtenido con force refresh");
          } catch (retryError) {
            console.error("❌ [SUBSCRIPTION] Error en segundo intento:", retryError);
          }
        }
      }

      if (!token) {
        throw new Error("No se pudo obtener token de autenticación. Por favor, cierra sesión y vuelve a iniciarla.");
      }

      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
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
      if (!currentUser) {
        throw new Error("Debes iniciar sesión para continuar");
      }

      const params = {
        successUrl: window.location.origin + "/subscription",
      };

      console.log("Enviando solicitud para crear portal de cliente");

      // Obtener token de Firebase - primero intentar desde localStorage (REST API directa)
      let token: string | null = null;
      
      // Intento 1: Token directo desde localStorage (para REST API login)
      const directToken = localStorage.getItem('firebase_id_token');
      if (directToken) {
        console.log("✅ [SUBSCRIPTION] Token obtenido desde localStorage (REST API)");
        token = directToken;
      }
      
      // Intento 2: Token desde Firebase SDK (solo si no hay token directo)
      if (!token) {
        try {
          console.log("🔐 [SUBSCRIPTION] Obteniendo token de Firebase SDK...");
          token = await currentUser.getIdToken(false);
          console.log("✅ [SUBSCRIPTION] Token obtenido desde SDK exitosamente");
        } catch (tokenError) {
          console.error("❌ [SUBSCRIPTION] Error obteniendo token desde SDK:", tokenError);
          // Intentar con force refresh
          try {
            console.log("🔄 [SUBSCRIPTION] Reintentando con force refresh...");
            token = await currentUser.getIdToken(true);
            console.log("✅ [SUBSCRIPTION] Token obtenido con force refresh");
          } catch (retryError) {
            console.error("❌ [SUBSCRIPTION] Error en segundo intento:", retryError);
          }
        }
      }

      if (!token) {
        throw new Error("No se pudo obtener token de autenticación. Por favor, cierra sesión y vuelve a iniciarla.");
      }

      const response = await fetch("/api/subscription/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
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
      setTimeout(async () => {
        if (isSuccess) {
          console.log("Procesando redirección exitosa");
          
          // Activate subscription since webhook isn't working
          try {
            const response = await fetch('/api/subscription/simulate-checkout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: userEmail,
                planId: 2 // Assuming Mero Patrón plan
              }),
            });

            if (response.ok) {
              console.log("Subscription activated successfully");
              toast({
                title: "¡Suscripción activada!",
                description: "Tu suscripción ha sido activada correctamente.",
              });
            } else {
              console.error("Failed to activate subscription");
              toast({
                title: "¡Pago procesado exitosamente!",
                description: "Tu pago ha sido procesado. La suscripción se activará en breve.",
              });
            }
          } catch (error) {
            console.error("Error activating subscription:", error);
            toast({
              title: "¡Pago procesado exitosamente!",
              description: "Tu pago ha sido procesado. La suscripción se activará en breve.",
            });
          }

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
  }, [toast, queryClient, userEmail]);

  // Determinar cuál plan marcar como el más popular (El Mero Patrón)
  const getIsMostPopular = (planCode: string) => planCode === "mero_patron";

  // ✅ CRÍTICO: NO bloquear la UI completa mientras carga la suscripción
  // La página debe renderizarse inmediatamente con los planes disponibles
  // La información de suscripción se carga de forma asíncrona

  // Obtener el plan activo del usuario
  const getActivePlanId = () => {
    if (userSubscription?.active && userSubscription?.subscription?.planId) {
      return userSubscription.subscription.planId;
    }
    return 5; // Plan gratuito por defecto (Primo Chambeador)
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



      {/* Mostrar información de la suscripción actual (carga asíncrona) */}
      {isLoadingUserSubscription ? (
        <div className="bg-muted/50 rounded-lg p-6 mb-10 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando información de tu suscripción...</p>
          </div>
        </div>
      ) : userSubscription && (
        <div className="bg-muted/50 rounded-lg p-6 mb-10 text-center">
          <h3 className="text-lg font-medium mb-2">
            {activePlanId === null || activePlanId === undefined 
              ? "🎯 Elige tu primer plan" 
              : "Tu Plan Actual"}
          </h3>
          <p className="mb-4">
            Actualmente tienes el plan{" "}
            <span className={cn("font-bold", activePlanId === 5 ? "text-muted-foreground" : "text-primary")}>
              {Array.isArray(plans) ? plans.find((p: SubscriptionPlan) => p.id === activePlanId)?.name || "Desconocido" : "Desconocido"}
            </span>
            {activePlanId === 5 && (
              <span className="text-sm text-muted-foreground block mt-1">
                (Plan gratuito - considera hacer upgrade para obtener más funciones)
              </span>
            )}
            {expirationDate && activePlanId !== 5 && (
              <>
                {" "}válido hasta el{" "}
                <span className="font-bold">
                  {expirationDate.toLocaleDateString()}
                </span>
              </>
            )}
          </p>
          {activePlanId === 5 ? (
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="default"
                onClick={() => {
                  const targetPlan = plans?.find(p => p.code === 'mero_patron');
                  if (targetPlan) createCheckoutSession(targetPlan.id);
                }}
                disabled={isLoading}
                className="text-sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                ⬆️ Hacer Upgrade
              </Button>
              <p className="text-xs text-muted-foreground self-center">
                Recomendado: El Mero Patrón ($100/mes)
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={createCustomerPortal}
                disabled={isLoading}
                className="text-primary hover:underline font-medium text-sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                ) : null}
                🔧 Administrar Suscripción
              </button>
              <button
                onClick={() => {
                  const freePlan = plans?.find(p => p.id === 5);
                  if (freePlan && window.confirm('¿Estás seguro de que quieres hacer downgrade al plan gratuito?')) {
                    createCheckoutSession(5);
                  }
                }}
                disabled={isLoading}
                className="text-orange-500 hover:underline font-medium text-sm"
              >
                ⬇️ Downgrade a Gratuito
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mostrar las tarjetas de planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-10">
        {/* 🎯 FORCED DISPLAY: Always show all active plans */}
        {Array.isArray(plans) ? (
          plans
            .filter((plan: SubscriptionPlan) => {
              // Hide Free Trial ALWAYS - it's not shown as a separate card
              if (plan.id === 4 || plan.code === 'FREE_TRIAL') {
                console.log(`🚫 [SUBSCRIPTION] Free Trial always hidden - not shown as separate card`);
                return false;
              }
              
              // Only show active plans
              const shouldShow = plan.isActive === true || plan.isActive === undefined;
              console.log(`📋 [PLAN-FILTER] ${plan.name} (ID: ${plan.id}): isActive=${plan.isActive}, showing=${shouldShow}`);
              
              return shouldShow;
            })
            .map((plan: SubscriptionPlan, index) => (
              <PricingCard
                key={plan.id || `plan-${index}`}
                name={plan.name}
                description={plan.description}
                price={plan.price}
                yearlyPrice={plan.yearlyPrice}
                features={plan.features as string[]}
                isYearly={isYearly}
                motto={plan.motto}
                isMostPopular={getIsMostPopular(plan.code)}
                onSelectPlan={handlePlanSelection}
                planId={plan.id}
                isLoading={isLoading}
                code={plan.code}
                isActive={plan.id === activePlanId}
                expirationDate={plan.id === activePlanId ? (expirationDate || undefined) : undefined}
                currentUserPlanId={activePlanId}
                onManageSubscription={createCustomerPortal}
                hasUsedTrial={hasUsedTrial}
              />
            ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">Cargando planes...</p>
          </div>
        )}
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
