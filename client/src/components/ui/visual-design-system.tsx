import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Definición de colores del sistema unificado
export const designSystem = {
  colors: {
    primary: {
      main: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
      50: 'rgb(239 246 255)',
      100: 'rgb(219 234 254)',
      500: 'rgb(59 130 246)',
      600: 'rgb(37 99 235)',
      700: 'rgb(29 78 216)',
    },
    success: {
      main: 'rgb(34 197 94)',
      light: 'rgb(134 239 172)',
      dark: 'rgb(21 128 61)',
      bg: 'rgb(240 253 244)',
    },
    warning: {
      main: 'rgb(245 158 11)',
      light: 'rgb(254 215 170)',
      dark: 'rgb(180 83 9)',
      bg: 'rgb(255 251 235)',
    },
    danger: {
      main: 'rgb(239 68 68)',
      light: 'rgb(252 165 165)',
      dark: 'rgb(185 28 28)',
      bg: 'rgb(254 242 242)',
    },
    billing: {
      main: 'rgb(34 197 94)',
      accent: 'rgb(16 185 129)',
      bg: 'rgb(240 253 244)',
    },
    subscription: {
      main: 'rgb(59 130 246)',
      accent: 'rgb(99 102 241)',
      bg: 'rgb(239 246 255)',
    },
    alerts: {
      main: 'rgb(245 158 11)',
      accent: 'rgb(251 191 36)',
      bg: 'rgb(255 251 235)',
    }
  },
  animations: {
    fadeIn: 'animate-in fade-in duration-300',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
    slideDown: 'animate-in slide-in-from-top-4 duration-300',
    scale: 'animate-in zoom-in-95 duration-300',
    hover: 'transition-all duration-200 hover:scale-105',
    gentle: 'transition-all duration-300 ease-in-out',
  },
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    glow: 'shadow-lg shadow-primary/25',
    colored: {
      success: 'shadow-lg shadow-green-500/25',
      warning: 'shadow-lg shadow-yellow-500/25',
      danger: 'shadow-lg shadow-red-500/25',
    }
  },
  spacing: {
    section: 'space-y-6',
    card: 'space-y-4',
    tight: 'space-y-2',
    loose: 'space-y-8',
  }
};

// Componente de contenedor unificado
interface UnifiedContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'billing' | 'subscription' | 'alerts';
}

export function UnifiedContainer({ children, className, variant = 'default' }: UnifiedContainerProps) {
  const variantStyles = {
    default: '',
    billing: 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20',
    subscription: 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20',
    alerts: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20',
  };

  return (
    <div className={cn(
      'container p-4 max-w-5xl mx-auto py-6',
      designSystem.spacing.section,
      designSystem.animations.fadeIn,
      variantStyles[variant],
      className
    )}>
      {children}
    </div>
  );
}

// Card unificada con variantes
interface UnifiedCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'billing' | 'subscription';
  className?: string;
  animated?: boolean;
  glowing?: boolean;
}

export function UnifiedCard({ 
  children, 
  title, 
  description, 
  variant = 'default', 
  className,
  animated = true,
  glowing = false 
}: UnifiedCardProps) {
  const variantStyles = {
    default: '',
    success: 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20',
    warning: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20',
    danger: 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
    billing: 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:bg-gradient-to-br dark:from-green-950/20 dark:to-emerald-950/20',
    subscription: 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:bg-gradient-to-br dark:from-blue-950/20 dark:to-indigo-950/20',
  };

  const shadowStyle = glowing ? designSystem.shadows.colored[variant as keyof typeof designSystem.shadows.colored] || designSystem.shadows.glow : designSystem.shadows.md;

  return (
    <Card className={cn(
      variantStyles[variant],
      shadowStyle,
      animated && designSystem.animations.gentle,
      animated && 'hover:shadow-lg',
      className
    )}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

// Badge unificado con iconos
interface UnifiedBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon?: ReactNode;
  className?: string;
}

export function UnifiedBadge({ children, variant = 'default', icon, className }: UnifiedBadgeProps) {
  const variantStyles = {
    default: '',
    success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
  };

  return (
    <Badge variant="outline" className={cn(
      variantStyles[variant],
      'inline-flex items-center gap-1',
      className
    )}>
      {icon}
      {children}
    </Badge>
  );
}

// Button unificado con variantes
interface UnifiedButtonProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'billing' | 'subscription';
  size?: 'sm' | 'default' | 'lg';
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function UnifiedButton({ 
  children, 
  variant = 'default', 
  size = 'default',
  icon, 
  className,
  disabled,
  onClick 
}: UnifiedButtonProps) {
  const variantStyles = {
    default: '',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700',
    billing: 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 shadow-green-500/25',
    subscription: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 shadow-blue-500/25',
  };

  return (
    <Button
      variant={variant === 'default' ? 'default' : 'outline'}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        variantStyles[variant],
        designSystem.animations.gentle,
        'inline-flex items-center gap-2',
        className
      )}
    >
      {icon}
      {children}
    </Button>
  );
}

// Hook para obtener colores del sistema
export function useDesignSystem() {
  return {
    colors: designSystem.colors,
    animations: designSystem.animations,
    shadows: designSystem.shadows,
    spacing: designSystem.spacing,
  };
}

// Utilidades de animación
export const animationClasses = {
  ...designSystem.animations,
  staggerChildren: 'animate-stagger-in',
  float: 'animate-float',
  pulse: 'animate-pulse-gentle',
  bounce: 'animate-bounce-subtle',
};

// Constantes de iconografía unificada
export const unifiedIcons = {
  billing: {
    main: '💳',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
  },
  subscription: {
    main: '📊',
    upgrade: '🚀',
    downgrade: '📉',
    pause: '⏸️',
    resume: '▶️',
  },
  alerts: {
    critical: '🚨',
    warning: '⚠️',
    info: '💡',
    success: '🎉',
  },
  features: {
    estimates: '📊',
    contracts: '📋',
    properties: '🏠',
    permits: '📝',
    ai: '🤖',
    projects: '🏗️',
  }
};

// CSS personalizado para animaciones avanzadas
export const customAnimations = `
  @keyframes stagger-in {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes pulse-gentle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  
  .animate-stagger-in { animation: stagger-in 0.3s ease-out; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-pulse-gentle { animation: pulse-gentle 2s ease-in-out infinite; }
  .animate-bounce-subtle { animation: bounce-subtle 1s ease-in-out infinite; }
`;