import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Crown, User, Zap, Star } from 'lucide-react';

/**
 * Componente de desarrollo para cambiar planes de usuario y probar permisos
 * SOLO para uso en desarrollo/testing
 */
export function UserPlanSwitcher() {
  const { toast } = useToast();

  const plans = [
    {
      id: 'free-trial',
      name: 'Prueba Gratis',
      icon: User,
      color: 'bg-gray-100 text-gray-700',
      description: '14 días gratis con acceso completo'
    },
    {
      id: 'primo-chambeador',
      name: 'Primo Chambeador',
      icon: Zap,
      color: 'bg-blue-100 text-blue-700',
      description: '$29/mes - Para empezar'
    },
    {
      id: 'mero-patron',
      name: 'Mero Patrón',
      icon: Star,
      color: 'bg-green-100 text-green-700',
      description: '$79/mes - El más popular'
    },
    {
      id: 'emperador-del-negocio',
      name: 'Emperador del Negocio',
      icon: Crown,
      color: 'bg-purple-100 text-purple-700',
      description: '$149/mes - Todo incluido'
    }
  ];

  const simulatePlan = async (planId: string, planName: string) => {
    try {
      // En desarrollo, usar localStorage para simular cambios de plan
      const mockUserData = {
        currentPlan: planId,
        planName: planName,
        simulatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('dev_user_plan_simulation', JSON.stringify(mockUserData));
      
      toast({
        title: "Plan simulado",
        description: `Ahora estás probando como usuario de plan: ${planName}`,
      });
      
      // Forzar recarga del contexto de permisos sin refrescar toda la página
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error simulando plan:', error);
      toast({
        title: "Error",
        description: "No se pudo simular el plan de usuario",
        variant: "destructive",
      });
    }
  };

  const resetToRealPlan = () => {
    localStorage.removeItem('dev_user_plan_simulation');
    toast({
      title: "Simulación reiniciada",
      description: "Volviste a tu plan real de usuario",
    });
    window.location.reload();
  };

  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const currentSimulation = localStorage.getItem('dev_user_plan_simulation');
  const isSimulating = !!currentSimulation;

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Crown className="h-5 w-5" />
          🧪 Panel de Testing de Permisos (Solo Desarrollo)
        </CardTitle>
        {isSimulating && (
          <Badge variant="secondary" className="w-fit">
            Simulando: {JSON.parse(currentSimulation).planName}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-orange-700 mb-4">
          Cambia temporalmente tu plan para probar diferentes perspectivas de permisos:
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Button
                key={plan.id}
                onClick={() => simulatePlan(plan.id, plan.name)}
                variant="outline"
                size="sm"
                className="flex flex-col items-center p-3 h-auto space-y-2"
              >
                <div className={`p-2 rounded-full ${plan.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xs text-center">
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-gray-600">{plan.description}</div>
                </div>
              </Button>
            );
          })}
        </div>

        {isSimulating && (
          <div className="flex justify-center">
            <Button 
              onClick={resetToRealPlan}
              variant="destructive"
              size="sm"
            >
              🔄 Volver a mi plan real
            </Button>
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <strong>Nota:</strong> Esta herramienta solo funciona en desarrollo. Los cambios son temporales y se reinician al refrescar.
        </div>
      </CardContent>
    </Card>
  );
}