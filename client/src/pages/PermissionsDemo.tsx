import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions, useFeatureAccess, useWatermark } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { FeatureButton } from '@/components/permissions/FeatureButton';
import { UpgradePrompt } from '@/components/permissions/UpgradePrompt';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Calculator, 
  Home, 
  CreditCard, 
  Crown,
  CheckCircle,
  AlertTriangle,
  Lock,
  Plus
} from 'lucide-react';

/**
 * Página de demostración del sistema de permisos con "soft paywall"
 * Muestra cómo funciona el sistema en diferentes escenarios
 */
export default function PermissionsDemo() {
  const { 
    userPlan, 
    userUsage, 
    loading, 
    canUse, 
    getRemainingUsage, 
    incrementUsage 
  } = usePermissions();
  
  const {
    canCreateBasicEstimate,
    canCreateAIEstimate,
    canCreateContract,
    remainingBasicEstimates,
    remainingAIEstimates,
    remainingContracts,
    hasInvoiceAccess,
    showEstimateUpgrade,
    showContractUpgrade,
    showInvoiceUpgrade
  } = useFeatureAccess();
  
  const { shouldShowWatermark } = useWatermark();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleCreateBasicEstimate = async () => {
    if (canCreateBasicEstimate()) {
      await incrementUsage('basicEstimates');
      console.log('Estimado básico creado!');
    }
  };

  const handleCreateAIEstimate = async () => {
    if (canCreateAIEstimate()) {
      await incrementUsage('aiEstimates'); 
      console.log('Estimado IA creado!');
    }
  };

  const handleCreateContract = async () => {
    if (canCreateContract()) {
      await incrementUsage('contracts');
      console.log('Contrato creado!');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header con información del plan */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Sistema de Permisos - Demo</h1>
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-orange-500" />
                <span className="font-semibold">{userPlan?.name}</span>
                <Badge variant="secondary">${(userPlan?.price || 0) / 100}/mes</Badge>
              </div>
              <p className="text-sm text-gray-600 italic">
                "{userPlan?.motto}"
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Panel de uso mensual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Uso Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Estimados Básicos */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Estimados Básicos</span>
                <span>{userUsage?.basicEstimates || 0}/{userPlan?.limits.basicEstimates === -1 ? '∞' : userPlan?.limits.basicEstimates}</span>
              </div>
              <Progress 
                value={userPlan?.limits.basicEstimates === -1 ? 0 : ((userUsage?.basicEstimates || 0) / (userPlan?.limits.basicEstimates || 1)) * 100} 
                className="h-2" 
              />
              <Badge variant={canCreateBasicEstimate() ? "secondary" : "destructive"} className="text-xs">
                {canCreateBasicEstimate() ? `${remainingBasicEstimates()} disponibles` : 'Límite alcanzado'}
              </Badge>
            </div>

            {/* Estimados IA */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Estimados IA</span>
                <span>{userUsage?.aiEstimates || 0}/{userPlan?.limits.aiEstimates === -1 ? '∞' : userPlan?.limits.aiEstimates}</span>
              </div>
              <Progress 
                value={userPlan?.limits.aiEstimates === -1 ? 0 : ((userUsage?.aiEstimates || 0) / (userPlan?.limits.aiEstimates || 1)) * 100} 
                className="h-2" 
              />
              <Badge variant={canCreateAIEstimate() ? "secondary" : "destructive"} className="text-xs">
                {canCreateAIEstimate() ? `${remainingAIEstimates()} disponibles` : 'Límite alcanzado'}
              </Badge>
            </div>

            {/* Contratos */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Contratos</span>
                <span>{userUsage?.contracts || 0}/{userPlan?.limits.contracts === -1 ? '∞' : userPlan?.limits.contracts}</span>
              </div>
              <Progress 
                value={userPlan?.limits.contracts === -1 ? 0 : ((userUsage?.contracts || 0) / (userPlan?.limits.contracts || 1)) * 100} 
                className="h-2" 
              />
              <Badge variant={canCreateContract() ? "secondary" : "destructive"} className="text-xs">
                {canCreateContract() ? `${remainingContracts()} disponibles` : 'Límite alcanzado'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplos de FeatureButton */}
      <Card>
        <CardHeader>
          <CardTitle>Botones Inteligentes con Permisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <FeatureButton
              feature="basicEstimates"
              onClick={handleCreateBasicEstimate}
              className="w-full"
              upgradeMessage="Genera estimados básicos ilimitados sin marcas de agua"
            >
              <FileText className="h-4 w-4 mr-2" />
              Crear Estimado Básico
            </FeatureButton>

            <FeatureButton
              feature="aiEstimates"
              onClick={handleCreateAIEstimate}
              className="w-full"
              upgradeMessage="Accede a estimados con IA avanzada ilimitados"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Crear Estimado IA
            </FeatureButton>

            <FeatureButton
              feature="contracts"
              onClick={handleCreateContract}
              className="w-full"
              upgradeMessage="Genera contratos profesionales sin límites"
            >
              <FileText className="h-4 w-4 mr-2" />
              Crear Contrato
            </FeatureButton>
          </div>

          {/* Información sobre marcas de agua */}
          {shouldShowWatermark('estimates') && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">Marca de agua incluida</span>
              </div>
              <p className="text-sm text-orange-700">
                Los documentos generados incluirán una marca de agua. Upgrade a un plan pagado para eliminarla.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ejemplo de PermissionGate con "soft paywall" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sistema de Facturación - Acceso Completo o Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Sistema de Facturación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PermissionGate 
              feature="invoices" 
              showDemo={true}
              demoMessage="Vista demo del sistema de facturación"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Facturas pendientes</span>
                  <Badge>5</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pagos este mes</span>
                  <span className="font-semibold">$15,420</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Clientes activos</span>
                  <Badge variant="secondary">23</Badge>
                </div>
                <Button className="w-full">
                  Nueva Factura
                </Button>
              </div>
            </PermissionGate>
          </CardContent>
        </Card>

        {/* Gestión de Proyectos - Solo con acceso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Project Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PermissionGate feature="projects">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Proyectos activos</span>
                  <Badge>3</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>En progreso</span>
                  <Progress value={65} className="w-20" />
                </div>
                <Button className="w-full">
                  Nuevo Proyecto IA
                </Button>
              </div>
            </PermissionGate>
          </CardContent>
        </Card>
      </div>

      {/* Prompts de upgrade individuales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UpgradePrompt 
          feature="aiEstimates" 
          size="small"
        />
        <UpgradePrompt 
          feature="contracts" 
          size="small"
        />
        <UpgradePrompt 
          feature="invoices" 
          size="small"
        />
      </div>

      {/* Debug info (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <pre className="overflow-auto">
              {JSON.stringify({
                userPlan: userPlan?.name,
                planLimits: userPlan?.limits,
                usage: userUsage,
                canCreateBasicEstimate: canCreateBasicEstimate(),
                canCreateAIEstimate: canCreateAIEstimate(),
                hasInvoiceAccess: hasInvoiceAccess(),
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}