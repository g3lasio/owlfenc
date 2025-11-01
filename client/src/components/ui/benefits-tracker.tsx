import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BenefitUsageData {
  feature: string;
  used: number;
  limit: number;
  isUnlimited: boolean;
  percentage: number;
  status: 'safe' | 'warning' | 'critical';
}

interface BenefitsTrackerProps {
  compact?: boolean;
  showAlerts?: boolean;
}

export function BenefitsTracker({ compact = false, showAlerts = true }: BenefitsTrackerProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [benefits, setBenefits] = useState<BenefitUsageData[]>([]);
  const [planName, setPlanName] = useState<string>('');

  // Mapeo de features para display
  const featureLabels = {
    basicEstimates: 'Estimados Básicos',
    contracts: 'Contratos',
    propertyVerifications: 'Verificaciones de Propiedad',
    permitAdvisor: 'Consultas de Permisos',
    aiEstimates: 'Estimados con IA',
    projects: 'Proyectos'
  };

  // Iconos para cada feature
  const featureIcons = {
    basicEstimates: '📊',
    contracts: '📋',
    propertyVerifications: '🏠',
    permitAdvisor: '📝',
    aiEstimates: '🤖',
    projects: '🏗️'
  };

  const loadBenefitsData = async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      const features = ['basicEstimates', 'contracts', 'propertyVerifications', 'permitAdvisor'];
      const benefitsData: BenefitUsageData[] = [];
      let currentPlanName = '';

      for (const feature of features) {
        try {
          const response = await fetch(`/api/auth/can-access/${currentUser.uid}/${feature}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.usage) {
              const used = data.usage.used || 0;
              const limit = data.usage.limit || 0;
              const isUnlimited = data.usage.isUnlimited || false;
              const percentage = isUnlimited ? 0 : limit > 0 ? (used / limit) * 100 : 0;
              
              // Determinar status basado en porcentaje
              let status: 'safe' | 'warning' | 'critical' = 'safe';
              if (!isUnlimited) {
                if (percentage >= 90) status = 'critical';
                else if (percentage >= 70) status = 'warning';
              }

              benefitsData.push({
                feature,
                used,
                limit,
                isUnlimited,
                percentage,
                status
              });

              // Guardar plan name del primer response válido
              if (!currentPlanName && data.planName) {
                currentPlanName = data.planName;
              }
            }
          }
        } catch (error) {
          console.error(`Error loading ${feature} usage:`, error);
        }
      }

      setBenefits(benefitsData);
      setPlanName(currentPlanName);

      // Mostrar alertas si está habilitado
      if (showAlerts) {
        const criticalBenefits = benefitsData.filter(b => b.status === 'critical');
        const warningBenefits = benefitsData.filter(b => b.status === 'warning');

        if (criticalBenefits.length > 0) {
          toast({
            title: '🚨 Límite casi alcanzado',
            description: `Has usado más del 90% de tus ${featureLabels[criticalBenefits[0].feature as keyof typeof featureLabels]}`,
            variant: 'destructive'
          });
        } else if (warningBenefits.length > 0) {
          toast({
            title: '⚠️ Acercándote al límite',
            description: `Has usado más del 70% de tus ${featureLabels[warningBenefits[0].feature as keyof typeof featureLabels]}`,
          });
        }
      }

    } catch (error) {
      console.error('Error loading benefits data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBenefitsData();
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso de Beneficios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {benefits.map((benefit) => (
          <div key={benefit.feature} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">{featureIcons[benefit.feature as keyof typeof featureIcons]}</span>
              <span className="text-sm font-medium">
                {featureLabels[benefit.feature as keyof typeof featureLabels]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(benefit.status)}
              <span className="text-sm">
                {benefit.isUnlimited ? '∞' : `${benefit.used}/${benefit.limit}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Uso de Beneficios - {planName}
        </CardTitle>
        <CardDescription>
          Seguimiento en tiempo real de tus beneficios mensuales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {benefits.map((benefit) => (
          <div key={benefit.feature} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{featureIcons[benefit.feature as keyof typeof featureIcons]}</span>
                <span className="font-medium">
                  {featureLabels[benefit.feature as keyof typeof featureLabels]}
                </span>
                {getStatusIcon(benefit.status)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {benefit.isUnlimited ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Ilimitado
                    </Badge>
                  ) : (
                    `${benefit.used} / ${benefit.limit}`
                  )}
                </span>
                {!benefit.isUnlimited && (
                  <span className="text-sm font-semibold">
                    {Math.round(benefit.percentage)}%
                  </span>
                )}
              </div>
            </div>
            
            {!benefit.isUnlimited && (
              <div className="space-y-1">
                <Progress 
                  value={benefit.percentage} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>{benefit.limit}</span>
                </div>
              </div>
            )}

            {benefit.status === 'critical' && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                ⚠️ Límite casi alcanzado. Considera actualizar tu plan.
              </div>
            )}
            {benefit.status === 'warning' && (
              <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                ⏰ Te estás acercando al límite de este beneficio.
              </div>
            )}
          </div>
        ))}

        {benefits.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No se pudieron cargar los datos de uso.
          </div>
        )}
      </CardContent>
    </Card>
  );
}