import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, ArrowUp, Sparkles } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'card' | 'inline' | 'modal';
}

const featureMessages = {
  invoices: {
    title: "¡Gestiona tus pagos como un profesional!",
    message: "Crea facturas, rastrea pagos y automatiza recordatorios.",
    benefits: ["Facturas ilimitadas", "Recordatorios automáticos", "Reportes avanzados"]
  },
  paymentTracking: {
    title: "¡Rastrea todos tus pagos!",
    message: "Monitorea el estado de tus proyectos y pagos pendientes.",
    benefits: ["Tracking en tiempo real", "Alertas automáticas", "Dashboard avanzado"]
  },
  aiEstimates: {
    title: "¡Alcanzaste tu límite de estimados IA!",
    message: "Genera estimados ilimitados con IA avanzada.",
    benefits: ["Estimados IA ilimitados", "Sin marcas de agua", "Precisión premium"]
  },
  contracts: {
    title: "¡Crea contratos profesionales!",
    message: "Genera contratos ilimitados sin marcas de agua.",
    benefits: ["Contratos ilimitados", "Sin marcas de agua", "Plantillas premium"]
  },
  propertyVerifications: {
    title: "¡Verifica más propiedades!",
    message: "Acceso ilimitado al verificador de propiedades.",
    benefits: ["Verificaciones ilimitadas", "Datos actualizados", "Reportes detallados"]
  },
  permitAdvisor: {
    title: "¡Asesor de permisos premium!",
    message: "Consultas ilimitadas sobre permisos de construcción.",
    benefits: ["Consultas ilimitadas", "Actualizaciones en tiempo real", "Soporte experto"]
  },
  deepsearch: {
    title: "¡Búsquedas súper potentes desbloqueadas!",
    message: "IA avanzada que analiza materiales y costos con precisión profesional.",
    benefits: ["Búsquedas ilimitadas", "Precisión profesional", "Sin errores de presupuesto"]
  }
};

export function UpgradePrompt({ 
  feature, 
  message,
  size = 'medium',
  variant = 'card'
}: UpgradePromptProps) {
  const { showUpgradeModal, userPlan } = usePermissions();
  
  const featureInfo = featureMessages[feature as keyof typeof featureMessages] || {
    title: "¡Desbloquea esta funcionalidad!",
    message: message || "Esta funcionalidad está disponible en planes superiores.",
    benefits: ["Acceso completo", "Sin limitaciones", "Soporte premium"]
  };

  const handleUpgradeClick = () => {
    showUpgradeModal(feature, featureInfo.message);
  };

  const getRecommendedPlan = () => {
    // Recomendar plan basado en la funcionalidad
    if (['invoices', 'paymentTracking'].includes(feature)) {
      return 'Mero Patrón';
    }
    if (['projects'].includes(feature) && userPlan?.id === 1) {
      return 'Mero Patrón';
    }
    return 'Master Contractor';
  };

  const sizeClasses = {
    small: 'p-3 text-sm',
    medium: 'p-4',
    large: 'p-6 text-lg'
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
        <Crown className="h-4 w-4 text-orange-600" />
        <span className="text-sm text-orange-700">{featureInfo.message}</span>
        <Button size="sm" variant="outline" onClick={handleUpgradeClick}>
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className={`border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 ${sizeClasses[size]}`}>
      <CardContent className="text-center">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-orange-100 rounded-full">
            <Crown className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-2">
          {featureInfo.title}
        </h3>
        
        <p className="text-gray-600 mb-4 text-sm">
          {featureInfo.message}
        </p>

        {size !== 'small' && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2">Incluido en {getRecommendedPlan()}:</div>
            <div className="flex flex-wrap justify-center gap-1">
              {featureInfo.benefits.map((benefit, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                >
                  <Sparkles className="h-3 w-3" />
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={handleUpgradeClick}
          className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
          size={size === 'small' ? 'sm' : 'default'}
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          Ver Planes
        </Button>
      </CardContent>
    </Card>
  );
}