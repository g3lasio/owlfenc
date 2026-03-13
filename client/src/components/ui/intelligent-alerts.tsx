import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Zap, ArrowUp, Target } from 'lucide-react';
import { Link } from 'wouter';
import { useWalletContext } from '@/contexts/WalletContext';

interface IntelligentAlertsProps {
  onUpgradeClick?: () => void;
  showOnlyHigh?: boolean;
  compact?: boolean;
}

export function IntelligentAlerts({ onUpgradeClick, showOnlyHigh = false, compact = false }: IntelligentAlertsProps) {
  const { currentUser } = useAuth();
  const { balance, isLoading } = useWalletContext();

  // Credit-based alert thresholds
  const LOW_CREDITS_THRESHOLD = 20;
  const CRITICAL_CREDITS_THRESHOLD = 5;

  if (!currentUser) return null;
  if (isLoading) return compact ? <div className="animate-pulse bg-muted/50 rounded-lg h-16" /> : null;

  const creditsBalance = balance ?? 0;
  const isCritical = creditsBalance <= CRITICAL_CREDITS_THRESHOLD;
  const isLow = creditsBalance <= LOW_CREDITS_THRESHOLD && !isCritical;

  // No alerts needed — user has plenty of credits
  if (!isCritical && !isLow) {
    return compact ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Target className="h-5 w-5" />
            Estado Óptimo
          </CardTitle>
          <CardDescription>
            Tu balance de créditos está en buen estado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Zap className="h-4 w-4" />
            <span>{creditsBalance} créditos disponibles — listo para trabajar</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alertLevel = isCritical ? 'critical' : 'warning';
  const alertStyle = isCritical
    ? 'border-red-500/50 bg-red-50 dark:bg-red-950/50'
    : 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/50';
  const alertIcon = isCritical
    ? <AlertTriangle className="h-4 w-4 text-red-500" />
    : <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  const message = isCritical
    ? `¡Créditos casi agotados! Solo te quedan ${creditsBalance} créditos.`
    : `Te estás quedando sin créditos. Tienes ${creditsBalance} créditos restantes.`;

  if (compact) {
    return (
      <div className="space-y-2">
        <Alert className={alertStyle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {alertIcon}
              <span className="text-sm font-medium">{message}</span>
            </div>
            <Link href="/billing">
              <Button size="sm" variant="outline" className="text-xs">
                Recargar
              </Button>
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertas de Créditos
        </CardTitle>
        <CardDescription>
          Monitoreo de tu balance de créditos AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={alertStyle}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {alertIcon}
              <div className="space-y-1">
                <AlertDescription className="font-medium">
                  {message}
                </AlertDescription>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {creditsBalance} créditos
                  </Badge>
                </div>
              </div>
            </div>
            <Link href="/billing">
              <Button
                size="sm"
                variant={alertLevel === 'critical' ? 'default' : 'outline'}
                className="shrink-0"
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Recargar Créditos
              </Button>
            </Link>
          </div>
        </Alert>
      </CardContent>
    </Card>
  );
}
