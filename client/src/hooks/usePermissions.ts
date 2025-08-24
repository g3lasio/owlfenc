import { usePermissions as usePermissionsContext } from '@/contexts/PermissionContext';

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
    
    // Contratos
    canCreateContract: () => canUse('contracts'),
    remainingContracts: () => getRemainingUsage('contracts'),
    
    // Herramientas premium
    canUsePropertyVerifier: () => canUse('propertyVerifications'),
    canUsePermitAdvisor: () => canUse('permitAdvisor'),
    canUseAIProjectManager: () => hasAccess('projects'),
    
    // Sistema financiero
    hasInvoiceAccess: () => hasAccess('invoices'),
    hasPaymentTrackingAccess: () => hasAccess('paymentTracking'),
    
    // Utilidades
    showEstimateUpgrade: () => showUpgradeModal('aiEstimates', 'Genera estimados ilimitados con IA avanzada'),
    showContractUpgrade: () => showUpgradeModal('contracts', 'Crea contratos profesionales sin límites'),
    showInvoiceUpgrade: () => showUpgradeModal('invoices', 'Gestiona tus pagos como un profesional'),
    showProjectUpgrade: () => showUpgradeModal('projects', 'Administra proyectos con IA avanzada'),
  };
}

// Hook para obtener información de marcas de agua
export function useWatermark() {
  const { userPlan } = usePermissionsContext();
  
  const shouldShowWatermark = (feature: 'estimates' | 'contracts'): boolean => {
    if (!userPlan) return true;
    
    // Plan gratuito siempre tiene marca de agua
    if (userPlan.id === 1) return true;
    
    // Trial y planes pagados no tienen marca de agua
    return false;
  };

  const getWatermarkText = (feature: 'estimates' | 'contracts'): string => {
    switch (feature) {
      case 'estimates':
        return 'Generado con Owl Fence - Plan Gratuito';
      case 'contracts':
        return 'Contrato generado con Owl Fence';
      default:
        return 'Owl Fence';
    }
  };

  return {
    shouldShowWatermark,
    getWatermarkText
  };
}