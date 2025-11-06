import { usePermissions as usePermissionsContext } from '@/contexts/PermissionContext';
import { PLAN_IDS } from '@shared/permissions-config';

// Re-export del hook desde el contexto para consistencia
export { usePermissions } from '@/contexts/PermissionContext';

// Hook auxiliar para verificaciones específicas de features
export function useFeatureAccess() {
  const { hasAccess, canUse, getRemainingUsage, isLimitReached, showUpgradeModal } = usePermissionsContext();

  return {
    // Estimados
    canCreateBasicEstimate: () => canUse('basicEstimates'),
    canCreateAIEstimate: () => canUse('aiEstimates'),
    remainingBasicEstimates: () => getRemainingUsage('basicEstimates'),
    remainingAIEstimates: () => getRemainingUsage('aiEstimates'),
    
    // Deepsearch
    canUseDeepsearch: () => canUse('deepsearch'),
    hasDeepsearchAccess: () => hasAccess('deepsearch'),
    remainingDeepsearch: () => getRemainingUsage('deepsearch'),
    
    // Contratos
    canCreateContract: () => canUse('contracts'),
    remainingContracts: () => getRemainingUsage('contracts'),
    
    // Herramientas premium
    canUsePropertyVerifier: () => canUse('propertyVerifications'),
    canUsePermitAdvisor: () => canUse('permitAdvisor'),
    
    // Sistema financiero
    hasInvoiceAccess: () => hasAccess('invoices'),
    hasPaymentTrackingAccess: () => hasAccess('paymentTracking'),
    
    // Utilidades
    showEstimateUpgrade: () => showUpgradeModal('aiEstimates', 'Genera estimados ilimitados con IA avanzada'),
    showContractUpgrade: () => showUpgradeModal('contracts', 'Crea contratos profesionales sin límites'),
    showInvoiceUpgrade: () => showUpgradeModal('invoices', 'Gestiona tus pagos como un profesional'),
    showProjectUpgrade: () => showUpgradeModal('projects', 'Administra proyectos con IA avanzada'),
    showDeepsearchUpgrade: () => showUpgradeModal('deepsearch', '¡Búsquedas súper potentes para estimados perfectos!'),
  };
}

// Hook para obtener información de marcas de agua
export function useWatermark() {
  const { userPlan } = usePermissionsContext();
  
  const shouldShowWatermark = (feature: 'estimates' | 'contracts'): boolean => {
    if (!userPlan) return true;
    
    // Plan gratuito PRIMO CHAMBEADOR siempre tiene marca de agua
    // ✅ MIGRADO: Usa constante centralizada en lugar de ID hardcoded
    if (userPlan.id === PLAN_IDS.PRIMO_CHAMBEADOR) return true;
    
    // Trial y planes pagados no tienen marca de agua
    return false;
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