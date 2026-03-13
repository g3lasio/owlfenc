import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

interface BenefitsTrackerProps {
  compact?: boolean;
  showAlerts?: boolean;
}

export function BenefitsTracker({ compact = false, showAlerts = true }: BenefitsTrackerProps) {
  const { currentUser } = useAuth();
  const { balance, walletData, isLoading } = useWalletContext();

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance de Créditos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const creditsBalance = balance ?? 0;
  const totalEarned = walletData?.totalEarned ?? 0;
  const totalSpent = walletData?.totalSpent ?? 0;

  // Credit-based status
  const status = creditsBalance <= 5 ? 'critical' : creditsBalance <= 20 ? 'warning' : 'safe';

  const features = [
    { icon: '📊', label: 'Estimados con IA', cost: '8 créditos' },
    { icon: '📋', label: 'Contratos Legales', cost: '12 créditos' },
    { icon: '📝', label: 'Permit Advisor', cost: '10 créditos' },
    { icon: '🏠', label: 'Property Verifier', cost: '6 créditos' },
    { icon: '💰', label: 'Invoices', cost: '5 créditos' },
  ];

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            <span className="text-sm font-medium">Créditos disponibles</span>
          </div>
          <div className="flex items-center gap-2">
            {status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            {status === 'safe' && <CheckCircle className="h-4 w-4 text-green-500" />}
            <span className="text-sm font-bold">{creditsBalance}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Balance de Créditos AI
        </CardTitle>
        <CardDescription>
          Cada acción AI consume créditos de tu wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance principal */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-sm text-muted-foreground">Créditos disponibles</p>
              <p className="text-3xl font-bold text-cyan-400">{creditsBalance}</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">Total ganado: <span className="font-medium">{totalEarned}</span></p>
            <p className="text-xs text-muted-foreground">Total usado: <span className="font-medium">{totalSpent}</span></p>
          </div>
        </div>

        {/* Estado del balance */}
        {status === 'critical' && showAlerts && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-400">Créditos casi agotados</span>
            </div>
            <Link href="/billing">
              <Button size="sm" variant="destructive" className="text-xs">Recargar</Button>
            </Link>
          </div>
        )}
        {status === 'warning' && showAlerts && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-400">Créditos bajos — considera recargar</span>
            </div>
            <Link href="/billing">
              <Button size="sm" variant="outline" className="text-xs">Recargar</Button>
            </Link>
          </div>
        )}

        {/* Costo por feature */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Costo por acción</p>
          <div className="space-y-2">
            {features.map((f) => (
              <div key={f.label} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-sm">{f.label}</span>
                </div>
                <Badge variant="outline" className="text-xs">{f.cost}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
