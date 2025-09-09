/**
 * PLAN PROMOTION HOOK
 * Smart contextual plan promotion without blocking functionality
 */
import { useState, useEffect } from 'react';

export interface PlanPromotionConfig {
  feature: string;
  showAfterSuccess?: boolean;
  showBeforeUsage?: boolean;
  showFrequency?: 'always' | 'once-per-session' | 'once-per-day';
  premiumBenefits?: string[];
}

export function usePlanPromotion(config: PlanPromotionConfig) {
  const [shouldShow, setShouldShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Check if we should show promotion based on frequency
  useEffect(() => {
    const storageKey = `plan-promo-${config.feature}`;
    const now = Date.now();
    
    switch (config.showFrequency) {
      case 'once-per-session':
        setShouldShow(!hasShown);
        break;
        
      case 'once-per-day':
        const lastShown = localStorage.getItem(storageKey);
        const dayAgo = 24 * 60 * 60 * 1000;
        setShouldShow(!lastShown || (now - parseInt(lastShown)) > dayAgo);
        break;
        
      case 'always':
      default:
        setShouldShow(true);
        break;
    }
  }, [config.feature, config.showFrequency, hasShown]);

  const showPromotion = () => {
    setShouldShow(true);
  };

  const hidePromotion = () => {
    setShouldShow(false);
    setHasShown(true);
    
    // Store timestamp for frequency control
    if (config.showFrequency === 'once-per-day') {
      const storageKey = `plan-promo-${config.feature}`;
      localStorage.setItem(storageKey, Date.now().toString());
    }
  };

  const showSuccess = (resultsCount: number) => {
    if (config.showAfterSuccess && !hasShown) {
      // Show success promotion after successful free usage
      showPromotion();
    }
  };

  return {
    shouldShow: shouldShow && config.showBeforeUsage,
    shouldShowSuccess: shouldShow && config.showAfterSuccess,
    showPromotion,
    hidePromotion,
    showSuccess
  };
}

/**
 * PREDEFINED PROMOTION CONFIGS
 */
export const planPromotions = {
  deepSearch: {
    feature: 'DeepSearch AI',
    showAfterSuccess: true,
    showFrequency: 'once-per-day' as const,
    premiumBenefits: [
      'Análisis de costos con márgenes de ganancia',
      'Integración automática con estimados',
      'Reportes profesionales en PDF',
      'Análisis regional específico',
      'Historial de proyectos ilimitado'
    ]
  },
  
  contractGeneration: {
    feature: 'Generación de Contratos',
    showAfterSuccess: true,
    showFrequency: 'once-per-session' as const,
    premiumBenefits: [
      'Contratos con cláusulas legales premium',
      'Firma digital integrada',
      'Templates personalizados',
      'Revisión legal automática'
    ]
  },

  mervinAI: {
    feature: 'Mervin AI',
    showBeforeUsage: true,
    showFrequency: 'always' as const,
    premiumBenefits: [
      'Conversaciones ilimitadas',
      'Investigación web en tiempo real',
      'Asistencia 24/7 especializada',
      'Memoria de proyectos históricos'
    ]
  }
};