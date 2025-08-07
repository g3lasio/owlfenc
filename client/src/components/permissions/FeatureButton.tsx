import React from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  feature: string;
  children: React.ReactNode;
  upgradeMessage?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLockIcon?: boolean;
  className?: string;
}

/**
 * Botón que respeta permisos de usuario y muestra upgrade prompt cuando es necesario
 */
export function FeatureButton({
  feature,
  children,
  upgradeMessage,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'default',
  showLockIcon = true,
  className,
  ...props
}: FeatureButtonProps) {
  const { canUse, hasAccess, showUpgradeModal, isLimitReached, getRemainingUsage } = usePermissions();

  const canUseFeature = canUse(feature);
  const hasFeatureAccess = hasAccess(feature);
  const limitReached = isLimitReached(feature);
  const remaining = getRemainingUsage(feature);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!hasFeatureAccess || !canUseFeature) {
      // Mostrar modal de upgrade
      const message = upgradeMessage || getDefaultUpgradeMessage(feature, limitReached, remaining);
      showUpgradeModal(feature, message);
      return;
    }

    if (onClick) {
      onClick(e);
    }
  };

  const getDefaultUpgradeMessage = (feature: string, limitReached: boolean, remaining: number): string => {
    if (limitReached) {
      return `Has alcanzado el límite mensual para ${feature}. Upgrade para acceso ilimitado.`;
    }
    
    if (!hasFeatureAccess) {
      return `Esta funcionalidad está disponible en planes superiores.`;
    }
    
    if (remaining < 3) {
      return `Te quedan ${remaining} usos de ${feature} este mes. Considera hacer upgrade.`;
    }
    
    return `Upgrade para acceso ilimitado a ${feature}.`;
  };

  const getButtonState = () => {
    if (!hasFeatureAccess) {
      return {
        disabled: true,
        showPremiumBadge: true,
        message: 'Función premium'
      };
    }
    
    if (limitReached) {
      return {
        disabled: true,
        showPremiumBadge: true,
        message: 'Límite alcanzado'
      };
    }
    
    if (remaining <= 3 && remaining > 0) {
      return {
        disabled: false,
        showWarning: true,
        message: `${remaining} restantes`
      };
    }
    
    return {
      disabled: false,
      showPremiumBadge: false,
      showWarning: false
    };
  };

  const buttonState = getButtonState();
  const isDisabled = disabled || buttonState.disabled;

  return (
    <div className="relative inline-block">
      <Button
        {...props}
        variant={variant}
        size={size}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(
          'relative',
          isDisabled && hasFeatureAccess === false && 'bg-gray-100 text-gray-400 cursor-not-allowed',
          buttonState.showWarning && 'border-orange-300 bg-orange-50 hover:bg-orange-100',
          className
        )}
      >
        {/* Icono de lock para funciones premium */}
        {buttonState.showPremiumBadge && showLockIcon && (
          <Crown className="h-4 w-4 mr-2 text-orange-500" />
        )}
        
        {children}
        
        {/* Badge de estado */}
        {buttonState.showWarning && (
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-200 text-orange-700 rounded">
            {buttonState.message}
          </span>
        )}
      </Button>

      {/* Badge premium flotante */}
      {buttonState.showPremiumBadge && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-orange-400 to-yellow-400 text-white text-xs rounded-full flex items-center gap-1">
          <Crown className="h-3 w-3" />
          <span>PRO</span>
        </div>
      )}

      {/* Tooltip con información */}
      {(buttonState.showPremiumBadge || buttonState.showWarning) && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {buttonState.message}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}