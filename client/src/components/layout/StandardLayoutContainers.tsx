import React from 'react';
import { cn } from '@/lib/utils';

// Contenedor principal que ocupa toda la altura disponible
interface FullHeightContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const FullHeightContainer: React.FC<FullHeightContainerProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col h-full w-full overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
};

// Header fijo que no hace scroll
interface FixedHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const FixedHeader: React.FC<FixedHeaderProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "flex-shrink-0 w-full",
        className
      )}
    >
      {children}
    </div>
  );
};

// Contenedor de contenido con scroll automático
interface ScrollableContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const ScrollableContent: React.FC<ScrollableContentProps> = ({ 
  children, 
  className,
  padding = true
}) => {
  return (
    <div 
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden custom-scroll",
        padding && "p-4",
        className
      )}
      style={{ minHeight: 0 }} // Crucial para flex containers
    >
      {children}
    </div>
  );
};

// Footer fijo que no hace scroll
interface FixedFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const FixedFooter: React.FC<FixedFooterProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "flex-shrink-0 w-full",
        className
      )}
    >
      {children}
    </div>
  );
};

// Contenedor de diálogo estandarizado
interface DialogContainerProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const DialogContainer: React.FC<DialogContainerProps> = ({ 
  children, 
  className,
  maxHeight = "98vh"
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col overflow-hidden bg-gray-900 border-cyan-400/30 shadow-[0_0_50px_rgba(6,182,212,0.3)]",
        className
      )}
      style={{ 
        maxHeight,
        height: maxHeight 
      }}
    >
      {children}
    </div>
  );
};

// Contenedor de pestañas con contenido scrolleable
interface TabContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const TabContainer: React.FC<TabContainerProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "flex-1 flex flex-col overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
};

// Navegación de pestañas fija
interface TabNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "flex-shrink-0 mb-4",
        className
      )}
    >
      {children}
    </div>
  );
};

// Contenido de pestaña con scroll
interface TabContentProps {
  children: React.ReactNode;
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden custom-scroll p-4",
        className
      )}
      style={{ minHeight: 0 }}
    >
      {children}
    </div>
  );
};

// Grid de cards responsivo sin scroll propio
interface CardGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export const CardGrid: React.FC<CardGridProps> = ({ 
  children, 
  className,
  cols = { default: 1, md: 2, lg: 3 }
}) => {
  const gridCols = `grid-cols-${cols.default || 1} ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''} ${cols.md ? `md:grid-cols-${cols.md}` : ''} ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''} ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}`.trim();
  
  return (
    <div 
      className={cn(
        "grid gap-4",
        gridCols,
        className
      )}
    >
      {children}
    </div>
  );
};

// Contenedor para formularios con espaciado consistente
interface FormContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const FormContainer: React.FC<FormContainerProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "space-y-6 w-full max-w-full",
        className
      )}
    >
      {children}
    </div>
  );
};