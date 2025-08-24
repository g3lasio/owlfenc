import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, Zap, ArrowUp, Clock, Target } from 'lucide-react';
import { Link } from 'wouter';

interface UsageAlert {
  feature: string;
  used: number;
  limit: number;
  percentage: number;
  alertLevel: 'warning' | 'critical' | 'suggestion';
  message: string;
  actionText: string;
  actionUrl: string;
}

interface IntelligentAlertsProps {
  onUpgradeClick?: () => void;
  showOnlyHigh?: boolean;
  compact?: boolean;
}

export function IntelligentAlerts({ onUpgradeClick, showOnlyHigh = false, compact = false }: IntelligentAlertsProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectedUsage, setProjectedUsage] = useState<any>(null);

  const featureLabels = {
    basicEstimates: 'Estimados Básicos',
    contracts: 'Contratos',
    propertyVerifications: 'Verificaciones de Propiedad',
    permitAdvisor: 'Consultas de Permisos',
    aiEstimates: 'Estimados con IA',
    projects: 'Proyectos'
  };

  const analyzeUsagePatterns = async () => {
    if (!currentUser?.uid) return;

    try {
      const features = ['basicEstimates', 'contracts', 'propertyVerifications', 'permitAdvisor'];
      const usageAlerts: UsageAlert[] = [];
      let totalUsage = 0;
      let totalLimits = 0;

      for (const feature of features) {
        try {
          const response = await fetch(`/api/auth/can-access/${currentUser.uid}/${feature}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.usage && !data.usage.isUnlimited) {
              const used = data.usage.used || 0;
              const limit = data.usage.limit || 0;
              const percentage = limit > 0 ? (used / limit) * 100 : 0;

              totalUsage += used;
              totalLimits += limit;

              // Generar alertas basadas en porcentajes
              if (percentage >= 90) {
                usageAlerts.push({
                  feature,
                  used,
                  limit,
                  percentage,
                  alertLevel: 'critical',
                  message: `¡Límite casi alcanzado! Has usado ${used} de ${limit} ${featureLabels[feature as keyof typeof featureLabels]}.`,
                  actionText: 'Upgrade Ahora',
                  actionUrl: '/subscription'
                });
              } else if (percentage >= 70) {
                usageAlerts.push({
                  feature,
                  used,
                  limit,
                  percentage,
                  alertLevel: 'warning',
                  message: `Te estás acercando al límite. ${used}/${limit} ${featureLabels[feature as keyof typeof featureLabels]} usados.`,
                  actionText: 'Ver Planes',
                  actionUrl: '/subscription'
                });
              } else if (percentage >= 50) {
                usageAlerts.push({
                  feature,
                  used,
                  limit,
                  percentage,
                  alertLevel: 'suggestion',
                  message: `Buen ritmo de uso. ${used}/${limit} ${featureLabels[feature as keyof typeof featureLabels]} utilizados.`,
                  actionText: 'Optimizar Plan',
                  actionUrl: '/billing?tab=benefits'
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error analyzing usage for ${feature}:`, error);
        }
      }

      // Calcular proyección de uso
      const overallPercentage = totalLimits > 0 ? (totalUsage / totalLimits) * 100 : 0;
      
      if (overallPercentage > 60) {
        const daysRemaining = 30 - new Date().getDate();
        const projectedOverage = overallPercentage > 80 ? 'Muy probable' : 'Posible';
        
        setProjectedUsage({
          overallPercentage,
          daysRemaining,
          projectedOverage,
          recommendation: overallPercentage > 80 ? 
            'Considera upgrading antes de fin de mes' : 
            'Monitorea tu uso durante las próximas semanas'
        });
      }

      setAlerts(usageAlerts);

      // Mostrar notificaciones automáticas para alertas críticas
      const criticalAlerts = usageAlerts.filter(alert => alert.alertLevel === 'critical');
      if (criticalAlerts.length > 0 && !localStorage.getItem(`alert-shown-${currentUser.uid}-${new Date().getDate()}`)) {
        toast({
          title: '🚨 Límite Crítico Alcanzado',
          description: criticalAlerts[0].message,
          variant: 'destructive',
          action: (
            <Link href={criticalAlerts[0].actionUrl}>
              <Button variant="outline" size="sm">
                {criticalAlerts[0].actionText}
              </Button>
            </Link>
          )
        });
        
        // Marcar como mostrado para evitar spam
        localStorage.setItem(`alert-shown-${currentUser.uid}-${new Date().getDate()}`, 'true');
      }

    } catch (error) {
      console.error('Error analyzing usage patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeUsagePatterns();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(analyzeUsagePatterns, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.uid]);

  if (loading) {
    return compact ? (
      <div className="animate-pulse bg-muted/50 rounded-lg h-16"></div>
    ) : (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const displayAlerts = showOnlyHigh ? 
    alerts.filter(alert => alert.alertLevel === 'critical' || alert.alertLevel === 'warning') : 
    alerts;

  if (displayAlerts.length === 0 && !projectedUsage) {
    return compact ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Target className="h-5 w-5" />
            Estado Óptimo
          </CardTitle>
          <CardDescription>
            Tu uso actual está dentro de límites saludables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Zap className="h-4 w-4" />
            <span>Todos tus beneficios están en uso normal</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <TrendingUp className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'critical': return 'border-red-500/50 bg-red-50 dark:bg-red-950/50';
      case 'warning': return 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/50';
      default: return 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/50';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {displayAlerts.slice(0, 2).map((alert, index) => (
          <Alert key={index} className={getAlertStyle(alert.alertLevel)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getAlertIcon(alert.alertLevel)}
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
              <Link href={alert.actionUrl}>
                <Button size="sm" variant="outline" className="text-xs">
                  {alert.actionText}
                </Button>
              </Link>
            </div>
          </Alert>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertas Inteligentes
        </CardTitle>
        <CardDescription>
          Monitoreo en tiempo real de tu uso y recomendaciones personalizadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alertas de uso */}
        <div className="space-y-3">
          {displayAlerts.map((alert, index) => (
            <Alert key={index} className={getAlertStyle(alert.alertLevel)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.alertLevel)}
                  <div className="space-y-1">
                    <AlertDescription className="font-medium">
                      {alert.message}
                    </AlertDescription>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(alert.percentage)}% usado
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {featureLabels[alert.feature as keyof typeof featureLabels]}
                      </span>
                    </div>
                  </div>
                </div>
                <Link href={alert.actionUrl}>
                  <Button 
                    size="sm" 
                    variant={alert.alertLevel === 'critical' ? 'default' : 'outline'}
                    className="shrink-0"
                  >
                    <ArrowUp className="h-3 w-3 mr-1" />
                    {alert.actionText}
                  </Button>
                </Link>
              </div>
            </Alert>
          ))}
        </div>

        {/* Proyección de uso */}
        {projectedUsage && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Proyección de Uso
            </h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Uso general este mes:</span>
                <Badge variant="outline">
                  {Math.round(projectedUsage.overallPercentage)}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Días restantes:</span>
                <span className="text-sm font-medium">{projectedUsage.daysRemaining}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Sobrepaso probable:</span>
                <span className="text-sm font-medium">{projectedUsage.projectedOverage}</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 {projectedUsage.recommendation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de acción principal */}
        {displayAlerts.length > 0 && (
          <div className="pt-4 border-t">
            <Link href="/subscription">
              <Button className="w-full" onClick={onUpgradeClick}>
                <Zap className="h-4 w-4 mr-2" />
                Ver Planes de Upgrade
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}