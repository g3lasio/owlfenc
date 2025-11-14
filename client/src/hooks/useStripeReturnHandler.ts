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
      toast({
        title: "Verificando cuenta Stripe",
        description: "Actualizando estado de tu cuenta...",
      });

      // Wait a moment for Stripe to process account updates
      setTimeout(async () => {
        // Invalidate Stripe status query to force refresh
        await queryClient.invalidateQueries({
          queryKey: ["/api/contractor-payments/stripe/account-status"],
        });

        // After refetch completes, check the status and show appropriate message
        setTimeout(() => {
          const stripeStatusData = queryClient.getQueryData([
            "/api/contractor-payments/stripe/account-status",
          ]) as any;

          if (stripeStatusData?.hasStripeAccount) {
            const isFullyActive = stripeStatusData.accountDetails?.chargesEnabled && 
                                 stripeStatusData.accountDetails?.payoutsEnabled;
            
            toast({
              title: isFullyActive ? "✅ Cuenta Stripe Conectada" : "🔄 Configuración en Proceso",
              description: isFullyActive
                ? "Tu cuenta está lista para recibir pagos"
                : "Completa la configuración de tu cuenta para activar pagos",
              variant: isFullyActive ? "default" : "secondary",
            });
          } else {
            toast({
              title: "⚠️ Verificación Pendiente",
              description: "La cuenta aún no está activa. Intenta refrescar en unos momentos.",
              variant: "secondary",
            });
          }

          // Clean URL params
          const url = new URL(window.location.href);
          url.searchParams.delete('stripe_account');
          url.searchParams.delete('stripe_onboarding');
          url.searchParams.delete('from');
          window.history.replaceState({}, '', url.toString());
        }, 1500); // Wait for query to complete
      }, 1000); // Wait for Stripe to process
    }
  }, [queryClient, toast]);

  return { isHandlingStripeReturn: hasHandledReturn.current };
}
