import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UpgradePrompt } from './UpgradePrompt';

interface PermissionGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDemo?: boolean;
  demoMessage?: string;
}

/**
 * Componente que controla el acceso a funcionalidades basado en permisos
 * - Si tiene acceso completo: muestra el contenido
 * - Si no tiene acceso y showDemo=true: muestra versión demo
 * - Si no tiene acceso y showDemo=false: muestra fallback o UpgradePrompt
 */
export function PermissionGate({ 
  feature, 
  children, 
  fallback,
  showDemo = false,
  demoMessage = "Esta funcionalidad está disponible en planes superiores"
}: PermissionGateProps) {
  const { hasAccess, userPlan, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const access = hasAccess(feature);

  // Si tiene acceso completo, mostrar contenido normal
  if (access) {
    return <>{children}</>;
  }

  // Si no tiene acceso pero queremos mostrar demo
  if (showDemo) {
    return (
      <div className="relative">
        {/* Contenido demo con overlay */}
        <div className="relative opacity-60 pointer-events-none">
          {children}
        </div>
        
        {/* Overlay de upgrade */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-lg">
          <UpgradePrompt 
            feature={feature}
            message={demoMessage}
            size="small"
          />
        </div>
      </div>
    );
  }

  // Mostrar fallback o UpgradePrompt por defecto
  return fallback || (
    <UpgradePrompt 
      feature={feature}
      message="Esta funcionalidad requiere un plan superior"
    />
  );
}