import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook to detect when user returns from Stripe onboarding
 * and automatically refresh Stripe account status
 */
export function useStripeReturnHandler() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const hasHandledReturn = useRef(false);

  useEffect(() => {
    // Only run once per mount
    if (hasHandledReturn.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    
    // Check if user is returning from Stripe
    // Stripe sends these params: ?stripe_account=acct_xxx&stripe_onboarding=completed (or similar)
    const stripeAccount = searchParams.get('stripe_account');
    const stripeOnboarding = searchParams.get('stripe_onboarding');
    const fromStripe = searchParams.get('from');

    const isReturningFromStripe = Boolean(
      stripeAccount || 
      stripeOnboarding || 
      fromStripe === 'stripe'
    );

    if (isReturningFromStripe) {
      console.log('✅ [STRIPE-RETURN] User returned from Stripe onboarding', {
        stripeAccount,
        stripeOnboarding,
        fromStripe,
      });

      hasHandledReturn.current = true;

      // Show loading toast
      const loadingToast = toast({
        title: "Verificando cuenta Stripe",
        description: "Actualizando estado de tu cuenta...",
        duration: Infinity, // Keep it visible until we update it
      });

      // Handle the refetch asynchronously
      (async () => {
        try {
          // Wait a moment for Stripe to process account updates
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Invalidate and refetch to get the latest status
          await queryClient.invalidateQueries({
            queryKey: ["/api/contractor-payments/stripe/account-status"],
          });

          // Get the fresh data directly from refetch
          const result = await queryClient.fetchQuery({
            queryKey: ["/api/contractor-payments/stripe/account-status"],
          }) as any;

          console.log('✅ [STRIPE-RETURN] Fresh status received:', result);

          // Dismiss the loading toast
          loadingToast.dismiss?.();

          // Show appropriate message based on standardized contract
          if (result?.hasStripeAccount) {
            const isFullyActive = result?.isActive;
            const needsOnboarding = result?.needsOnboarding;
            const hasRequirements = result?.requirements?.currently_due?.length > 0 ||
                                   result?.requirements?.past_due?.length > 0;

            // Three states: Active, Incomplete, or Error
            if (isFullyActive) {
              toast({
                title: "✅ Cuenta Activa",
                description: "Tu cuenta está completamente configurada y lista para recibir pagos",
                variant: "default",
              });
            } else if (needsOnboarding && hasRequirements) {
              toast({
                title: "🔄 Configuración Pendiente",
                description: "Stripe requiere información adicional. Ve al dashboard para completar tu configuración.",
                variant: "secondary",
              });
            } else {
              toast({
                title: "⏳ Procesando Cuenta",
                description: "Tu cuenta se está configurando. Esto puede tomar unos momentos.",
                variant: "secondary",
              });
            }
          } else {
            toast({
              title: "⚠️ Cuenta No Conectada",
              description: "No detectamos una cuenta de Stripe. Intenta conectar nuevamente.",
              variant: "secondary",
            });
          }
        } catch (error) {
          console.error('❌ [STRIPE-RETURN] Error fetching status:', error);
          
          // Dismiss the loading toast
          loadingToast.dismiss?.();
          
          toast({
            title: "Error al verificar",
            description: "No se pudo verificar el estado de la cuenta. Intenta refrescar manualmente.",
            variant: "destructive",
          });
        } finally {
          // Clean URL params
          const url = new URL(window.location.href);
          url.searchParams.delete('stripe_account');
          url.searchParams.delete('stripe_onboarding');
          url.searchParams.delete('from');
          window.history.replaceState({}, '', url.toString());
        }
      })();
    }
  }, [queryClient, toast]);

  return { isHandlingStripeReturn: hasHandledReturn.current };
}
