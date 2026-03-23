/**
 * WalletPage — Página de gestión de créditos
 * PAY AS YOU GROW — Mervin AI / Owl Fenc App
 * 
 * Muestra:
 * - Balance actual con indicadores visuales
 * - Historial de transacciones
 * - Paquetes de top-up disponibles
 * - Estado de billing del usuario
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  Shield,
  Star,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWallet, type WalletTransaction } from '@/hooks/useWallet';
import { useWalletContext } from '@/contexts/WalletContext';
import { TopUpModal } from '@/components/wallet/TopUpModal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ================================
// TRANSACTION ICON
// ================================
function TransactionIcon({ type }: { type: WalletTransaction['type'] }) {
  switch (type) {
    case 'subscription_grant':
      return <Star className="h-4 w-4 text-purple-400" />;
    case 'topup_purchase':
      return <CreditCard className="h-4 w-4 text-green-400" />;
    case 'feature_usage':
      return <Zap className="h-4 w-4 text-cyan-400" />;
    case 'admin_adjustment':
      return <Shield className="h-4 w-4 text-blue-400" />;
    case 'refund':
      return <RefreshCw className="h-4 w-4 text-green-400" />;
    default:
      return <Zap className="h-4 w-4 text-muted-foreground" />;
  }
}

// ================================
// TRANSACTION ROW
// ================================
function TransactionRow({ tx }: { tx: WalletTransaction }) {
  // Defensive: handle null/undefined amountCredits from legacy or raw SQL rows
  const amount = tx.amountCredits ?? 0;
  // Use direction field if available (DB stores amountCredits always positive).
  // Fall back to type-based detection for legacy records without direction field.
  const isCredit = tx.direction
    ? tx.direction === 'credit'
    : (tx.type === 'subscription_grant' || tx.type === 'topup_purchase' || tx.type === 'refund');
  const dateValue = tx.createdAt ? new Date(tx.createdAt) : new Date();
  const date = dateValue.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
      <div className={cn(
        'p-2 rounded-lg flex-shrink-0',
        isCredit ? 'bg-green-950/30' : 'bg-red-950/20'
      )}>
        <TransactionIcon type={tx.type} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground">{date}</span>
          {tx.featureName && (
            <>
              <span className="text-muted-foreground">·</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                {tx.featureName}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className={cn(
        'text-sm font-mono font-bold flex-shrink-0',
        isCredit ? 'text-green-400' : 'text-red-400'
      )}>
        {isCredit ? '+' : '-'}{amount.toLocaleString()}
      </div>
    </div>
  );
}

// ================================
// MAIN PAGE
// ================================
// Named export for embedded use in Billing.tsx
export function WalletPage({ embedded = false }: { embedded?: boolean }) {
  const [, setLocation] = useLocation();
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [fullHistory, setFullHistory] = useState<WalletTransaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Use global context for balance/walletData — keeps header badge and this page in sync
  const { balance, walletData, isLoading, refreshBalance } = useWalletContext();
  // Use local hook only for billing-specific fields not in global context
  const {
    billingStatus,
    packages,
    initiateTopUp,
    isCheckingOut,
  } = useWallet();

  // Open Stripe Customer Portal
  const handleManageSubscription = async () => {
    if (!currentUser) return;
    setIsPortalLoading(true);
    try {
      let token: string | null = null;
      try { token = await currentUser.getIdToken(true); } catch {}
      if (!token) { try { token = await currentUser.getIdToken(false); } catch {} }
      if (!token) token = localStorage.getItem('firebase_id_token');
      if (!token) throw new Error('No auth token available');

      const response = await fetch('/api/subscription/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ successUrl: window.location.origin + '/wallet' }),
      });
      const data = await response.json();
      if (data?.url) {
        const win = window.open(data.url, '_blank');
        if (!win) {
          toast({ title: 'Popup blocked', description: 'Please allow popups for this site and try again.', variant: 'destructive' });
        }
      } else {
        throw new Error('No portal URL received');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not open billing portal.', variant: 'destructive' });
    } finally {
      setIsPortalLoading(false);
    }
  };

  // Verificar si viene de un top-up exitoso
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
      // Verificar el estado del pago
      fetch(`/api/wallet/top-up/status?session_id=${sessionId}`, {
        credentials: 'include',
      })
        .then(r => r.json())
        .then(data => {
          if (data.paymentStatus === 'paid') {
            refreshBalance();
            // Limpiar la URL
            window.history.replaceState({}, '', '/wallet');
          }
        })
        .catch(console.warn);
    }
  }, [refreshBalance]);

  // Cargar historial completo
  const loadFullHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetchWithAuth('/api/wallet/history?limit=50');
      const data = await response.json();
      if (data.success) {
        setFullHistory(data.transactions);
      }
    } catch (err) {
      console.warn('[WalletPage] Error loading history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const transactions = fullHistory.length > 0
    ? fullHistory
    : (walletData?.recentTransactions || []);

  // Plan display
  const planBadge = billingStatus?.planName
    ? billingStatus.planName
    : billingStatus?.mode === 'payg'
      ? 'Pay as You Grow'
      : 'Free';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Mervin AI Credits
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your AI credits and purchase history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshBalance}
              className="gap-2 border-border/50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
              className="gap-2 border-cyan-800/40 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300"
            >
              {isPortalLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage Subscription
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <div className={cn(
          'relative overflow-hidden rounded-2xl border p-6',
          'bg-gradient-to-br from-cyan-950/30 via-blue-950/20 to-purple-950/20',
          'border-cyan-800/30 shadow-[0_0_40px_rgba(103,232,249,0.08)]'
        )}>
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Available Credits
                </p>
                <div className="flex items-baseline gap-2">
                  {isLoading ? (
                    <div className="h-12 w-32 bg-muted/20 rounded-lg animate-pulse" />
                  ) : (
                    <>
                      <span className="text-5xl font-black font-mono text-cyan-300 tabular-nums">
                        {(balance ?? 0).toLocaleString()}
                      </span>
                      <span className="text-lg text-muted-foreground font-medium">credits</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge
                  variant="outline"
                  className="border-cyan-800/40 text-cyan-400 bg-cyan-950/20 text-xs"
                >
                  {planBadge}
                </Badge>
                {billingStatus?.monthlyCreditsGrant > 0 && (
                  <span className="text-xs text-muted-foreground">
                    +{billingStatus.monthlyCreditsGrant}/month
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/20 border border-border/20">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Total earned</p>
                  <p className="text-sm font-mono font-bold text-green-400">
                    +{(walletData?.totalEarned ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/20 border border-border/20">
                <TrendingDown className="h-4 w-4 text-cyan-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Total used</p>
                  <p className="text-sm font-mono font-bold text-cyan-400">
                    -{(walletData?.totalSpent ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Stripe Connect status */}
            {/* Only show to payg users (no subscription) — subscribers already have access or are on a plan */}
            {billingStatus && billingStatus.canUseStripeConnect && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-green-950/20 border border-green-800/30 text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Stripe Connect enabled — collect payments from clients</span>
              </div>
            )}
            {billingStatus && !billingStatus.canUseStripeConnect && billingStatus.mode === 'payg' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-muted/10 border border-border/30 text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Spend $20+ to unlock Stripe Connect payment collection</span>
              </div>
            )}

            {/* CTA */}
            <Button
              onClick={() => setShowTopUpModal(true)}
              className={cn(
                'w-full mt-4 gap-2 font-semibold',
                'bg-gradient-to-r from-cyan-600 to-blue-600',
                'hover:from-cyan-500 hover:to-blue-500',
                'border-0 text-white shadow-[0_0_20px_rgba(103,232,249,0.2)]'
              )}
            >
              <Zap className="h-4 w-4" fill="currentColor" />
              Comprar Créditos
            </Button>
          </div>
        </div>

        {/* Feature Costs Reference */}
        {billingStatus?.featureCosts && (
          <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Credit Costs per Feature
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(billingStatus.featureCosts)
                .filter(([, cost]) => (cost as number) > 0)
                .map(([feature, cost]) => (
                  <div
                    key={feature}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/30 border border-border/20"
                  >
                    <span className="text-xs text-muted-foreground capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5 text-cyan-400" fill="currentColor" />
                      <span className="text-xs font-mono font-bold text-cyan-300">{cost as number}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Transaction History
            </h3>
            {fullHistory.length === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadFullHistory}
                disabled={isLoadingHistory}
                className="text-xs gap-1"
              >
                {isLoadingHistory ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Load all
              </Button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs mt-1">Your credit history will appear here</p>
            </div>
          ) : (
            <div>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Comprar Créditos Modal */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={() => {
          setShowTopUpModal(false);
          refreshBalance();
        }}
      />
    </div>
  );
}

// Default export for the standalone /wallet route
export default WalletPage;
