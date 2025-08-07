import { UserLimits, UserUsage } from '@/contexts/PermissionContext';

/**
 * Utilidades para el sistema de permisos
 */

// Mapear nombres de funcionalidades a claves más amigables
export const featureDisplayNames: Record<string, string> = {
  basicEstimates: 'Estimados Básicos',
  aiEstimates: 'Estimados con IA',
  contracts: 'Contratos',
  propertyVerifications: 'Verificación de Propiedades',
  permitAdvisor: 'Asesor de Permisos',
  projects: 'Gestión de Proyectos',
  invoices: 'Facturación',
  paymentTracking: 'Seguimiento de Pagos'
};

// Obtener el nombre amigable de una funcionalidad
export function getFeatureDisplayName(feature: string): string {
  return featureDisplayNames[feature] || feature;
}

// Calcular el porcentaje de uso de una funcionalidad
export function getUsagePercentage(
  feature: string,
  limits: UserLimits,
  usage: UserUsage
): number {
  const limit = limits[feature as keyof UserLimits];
  const used = usage[feature as keyof UserUsage] || 0;

  if (limit === -1) return 0; // Ilimitado
  if (limit === 0) return 100; // Sin acceso
  
  return Math.min(100, (used / limit) * 100);
}

// Obtener el estado de uso de una funcionalidad
export function getUsageStatus(
  feature: string,
  limits: UserLimits,
  usage: UserUsage
): 'unlimited' | 'available' | 'warning' | 'exceeded' | 'blocked' {
  const limit = limits[feature as keyof UserLimits];
  const used = usage[feature as keyof UserUsage] || 0;

  if (limit === -1) return 'unlimited';
  if (limit === 0) return 'blocked';
  
  const remaining = limit - used;
  
  if (remaining <= 0) return 'exceeded';
  if (remaining <= Math.ceil(limit * 0.2)) return 'warning'; // 20% o menos
  
  return 'available';
}

// Generar mensaje de estado para una funcionalidad
export function getUsageStatusMessage(
  feature: string,
  limits: UserLimits,
  usage: UserUsage
): string {
  const status = getUsageStatus(feature, limits, usage);
  const displayName = getFeatureDisplayName(feature);
  const limit = limits[feature as keyof UserLimits];
  const used = usage[feature as keyof UserUsage] || 0;
  const remaining = limit === -1 ? -1 : limit - used;

  switch (status) {
    case 'unlimited':
      return `${displayName}: Ilimitado`;
    case 'blocked':
      return `${displayName}: No disponible en tu plan`;
    case 'exceeded':
      return `${displayName}: Límite alcanzado (${used}/${limit})`;
    case 'warning':
      return `${displayName}: ${remaining} restantes de ${limit}`;
    case 'available':
      return `${displayName}: ${remaining} disponibles`;
    default:
      return `${displayName}: Estado desconocido`;
  }
}

// Obtener color para el estado de uso
export function getUsageStatusColor(status: string): string {
  switch (status) {
    case 'unlimited':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'available':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'warning':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'exceeded':
    case 'blocked':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// Obtener icono para el estado de uso
export function getUsageStatusIcon(status: string): string {
  switch (status) {
    case 'unlimited':
      return '∞';
    case 'available':
      return '✓';
    case 'warning':
      return '⚠️';
    case 'exceeded':
      return '❌';
    case 'blocked':
      return '🔒';
    default:
      return '?';
  }
}

// Calcular días restantes en el período actual
export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  
  return Math.ceil((lastDay.getTime() - now.getTime()) / msPerDay);
}

// Generar recomendaciones de upgrade basadas en uso
export function getUpgradeRecommendation(
  limits: UserLimits,
  usage: UserUsage
): {
  shouldUpgrade: boolean;
  reason: string;
  recommendedPlan: string;
  features: string[];
} {
  const excededFeatures: string[] = [];
  const warningFeatures: string[] = [];

  // Verificar cada funcionalidad
  Object.keys(limits).forEach(feature => {
    const status = getUsageStatus(feature, limits, usage);
    if (status === 'exceeded') {
      excededFeatures.push(feature);
    } else if (status === 'warning') {
      warningFeatures.push(feature);
    }
  });

  if (excededFeatures.length > 0) {
    return {
      shouldUpgrade: true,
      reason: `Has alcanzado el límite en: ${excededFeatures.map(f => getFeatureDisplayName(f)).join(', ')}`,
      recommendedPlan: 'Mero Patrón',
      features: excededFeatures
    };
  }

  if (warningFeatures.length >= 2) {
    return {
      shouldUpgrade: true,
      reason: `Estás cerca del límite en múltiples funcionalidades`,
      recommendedPlan: 'Mero Patrón',
      features: warningFeatures
    };
  }

  return {
    shouldUpgrade: false,
    reason: 'Tu uso actual está dentro de los límites de tu plan',
    recommendedPlan: '',
    features: []
  };
}

// Obtener el mejor plan para un patrón de uso específico
export function getRecommendedPlanForUsage(
  projectedUsage: Partial<UserUsage>
): {
  planId: number;
  planName: string;
  reason: string;
} {
  const { basicEstimates = 0, aiEstimates = 0, contracts = 0 } = projectedUsage;

  // Si necesita muchos estimados IA o contratos, recomendar Master
  if (aiEstimates > 50 || contracts > 10) {
    return {
      planId: 3,
      planName: 'Master Contractor',
      reason: 'Para uso intensivo y funcionalidades avanzadas'
    };
  }

  // Si excede los límites del plan gratuito pero no necesita tanto
  if (basicEstimates > 10 || aiEstimates > 3 || contracts > 3) {
    return {
      planId: 2,
      planName: 'Mero Patrón',
      reason: 'Para superar las limitaciones del plan gratuito'
    };
  }

  return {
    planId: 1,
    planName: 'Primo Chambeador',
    reason: 'Tu uso actual encaja bien con el plan gratuito'
  };
}