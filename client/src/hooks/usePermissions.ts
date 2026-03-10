import { usePermissions as usePermissionsContext } from '@/contexts/PermissionContext';
import { useWallet } from '@/hooks/useWallet';

// Re-export del hook desde el contexto para consistencia
export { usePermissions } from '@/contexts/PermissionContext';

/**
 * 💳 Pure PAYG Feature Access Hook
 * 
 * All features are available to all authenticated users.
 * Access is controlled exclusively by wallet credits (enforced on the backend).
 * No more plan-based locks or monthly usage counters.
 */
export function useFeatureAccess() {
  const { walletData } = useWallet();
  const balance = walletData?.balance ?? 0;

  // Helper: user can afford a feature if they have enough credits
  const canAfford = (cost: number) => balance >= cost;

  return {
    // Estimados — always available, backend enforces credit deduction
    canCreateBasicEstimate: () => true,
    canCreateAIEstimate: () => true,
    remainingBasicEstimates: () => -1, // -1 = unlimited
    remainingAIEstimates: () => -1,

    // DeepSearch — credit-gated (10 cr partial, 20 cr full)
    canUseDeepsearch: () => true,
    hasDeepsearchAccess: () => true,
    remainingDeepsearch: () => -1,

    // DeepSearch Full Costs
    canUseDeepsearchFullCosts: () => true,
    remainingDeepsearchFullCosts: () => -1,

    // DeepSearch Material/Labor — available to ALL users (credit-gated, not plan-gated)
    canUseDeepsearchMaterialsOnly: () => true,
    canUseDeepsearchLaborOnly: () => true,

    // Contratos — always available, backend enforces credit deduction
    canCreateContract: () => true,
    remainingContracts: () => -1,

    // Premium tools — always available, backend enforces credit deduction
    canUsePropertyVerifier: () => true,
    canUsePermitAdvisor: () => true,

    // Financial system — always available
    hasInvoiceAccess: () => true,
    hasPaymentTrackingAccess: () => true,

    // Upgrade modals — now redirect to wallet top-up instead of subscription
    showEstimateUpgrade: () => {},
    showContractUpgrade: () => {},
    showInvoiceUpgrade: () => {},
    showProjectUpgrade: () => {},
    showDeepsearchUpgrade: () => {},
    showDeepsearchFullCostsUpgrade: () => {},
  };
}

// Hook para obtener información de marcas de agua
// Watermarks are now tied to subscription plan (paid plan = no watermark), not usage limits
export function useWatermark() {
  const { userPlan } = usePermissionsContext();

  const shouldShowWatermark = (feature: 'estimates' | 'contracts'): boolean => {
    if (!userPlan) return true;
    // Free plan always has watermark; paid plans do not
    return userPlan.id === 'primo_chambeador' || userPlan.id === 'free';
  };

  const getWatermarkText = (feature: 'estimates' | 'contracts'): string => {
    switch (feature) {
      case 'estimates':
        return 'Generado con Owl Fenc - Plan Gratuito';
      case 'contracts':
        return 'Contrato generado con Owl Fenc';
      default:
        return 'Owl Fenc';
    }
  };

  return {
    shouldShowWatermark,
    getWatermarkText
  };
}
