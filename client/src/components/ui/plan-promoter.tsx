/**
 * PLAN PROMOTER - Alternative to blocking buttons
 * Shows plan benefits WITHOUT blocking functionality
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Zap, Star, X } from 'lucide-react';

interface PlanPromoterProps {
  feature: string;
  benefitMessage: string;
  planRequired: 'Pro' | 'Premium' | 'Enterprise';
  onClose?: () => void;
}

export function PlanPromoter({ 
  feature, 
  benefitMessage, 
  planRequired, 
  onClose 
}: PlanPromoterProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onClose?.();
  };

  const planColors = {
    Pro: 'bg-blue-500',
    Premium: 'bg-purple-500', 
    Enterprise: 'bg-gold-500'
  };

  const planIcons = {
    Pro: <Zap className="h-4 w-4" />,
    Premium: <Crown className="h-4 w-4" />,
    Enterprise: <Star className="h-4 w-4" />
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-medium text-blue-800">
              ¡Mejora tu experiencia con {feature}!
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-2">
              {benefitMessage}
            </p>
            <Badge 
              variant="secondary" 
              className={`${planColors[planRequired]} text-white`}
            >
              {planIcons[planRequired]}
              <span className="ml-1">{planRequired} Plan</span>
            </Badge>
          </div>
          <Button
            size="sm"
            className="ml-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Ver Planes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * SUCCESS PROMOTER - Show after successful free usage
 */
export function SuccessPromoter({ 
  feature, 
  resultsCount, 
  onUpgrade 
}: { 
  feature: string; 
  resultsCount: number;
  onUpgrade: () => void;
}) {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800">
              ¡{feature} completado! Se generaron {resultsCount} elementos
            </h3>
            <p className="text-xs text-green-600 mt-1">
              Con planes Premium obtienes análisis más detallados, integración automática y reportes profesionales
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShow(false)}
              className="text-green-600 border-green-300"
            >
              Más tarde
            </Button>
            <Button
              size="sm"
              onClick={onUpgrade}
              className="bg-green-600 hover:bg-green-700"
            >
              Ver Premium
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * FEATURE ENHANCER - Show premium features contextually
 */
export function FeatureEnhancer({ 
  currentResults, 
  premiumFeatures 
}: { 
  currentResults: any;
  premiumFeatures: string[];
}) {
  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
      <div className="flex items-start space-x-3">
        <Crown className="h-6 w-6 text-purple-600 mt-1" />
        <div>
          <h4 className="font-medium text-purple-800 mb-2">
            ¿Necesitas más precisión? Premium incluye:
          </h4>
          <ul className="text-sm text-purple-700 space-y-1">
            {premiumFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            className="mt-3 bg-purple-600 hover:bg-purple-700"
          >
            Activar Premium - $20/mes
          </Button>
        </div>
      </div>
    </div>
  );
}