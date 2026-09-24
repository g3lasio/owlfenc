/**
 * TopUpModal — Modal de compra de créditos (Top-Up)
 * PAY AS YOU GROW — Mervin AI / Owl Fenc App
 *
 * Diseño compacto y scrollable. Cada paquete en fila horizontal.
 * No muestra $/crédito — muestra equivalencias en acciones concretas.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Star,
  Rocket,
  CheckCircle2,
  Loader2,
  CreditCard,
  TrendingUp,
  Shield,
  FileText,
  ScrollText,
  ClipboardList,
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  requiredCredits?: number;
  featureName?: string;
  currentBalance?: number;
}

const PACKAGE_ICONS = [Zap, Star, Rocket];

const PACKAGE_STYLES = [
  {
    accent: 'border-cyan-700/50 hover:border-cyan-500/70',
    glow: 'hover:shadow-[0_0_16px_rgba(103,232,249,0.12)]',
    iconColor: 'text-cyan-400',
    creditsColor: 'text-cyan-300',
    priceColor: 'text-cyan-300',
    badge: null,
    badgeClass: '',
  },
  {
    accent: 'border-purple-700/60 hover:border-purple-500/80',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.18)]',
    iconColor: 'text-purple-400',
    creditsColor: 'text-purple-300',
    priceColor: 'text-purple-300',
    badge: 'POPULAR',
    badgeClass: 'bg-purple-600 text-white',
  },
  {
    accent: 'border-amber-700/50 hover:border-amber-500/70',
    glow: 'hover:shadow-[0_0_16px_rgba(251,191,36,0.12)]',
    iconColor: 'text-amber-400',
    creditsColor: 'text-amber-300',
    priceColor: 'text-amber-300',
    badge: 'BEST VALUE',
    badgeClass: 'bg-amber-600 text-white',
  },
];

const CREDIT_COSTS = [
  { icon: FileText,    label: 'AI Estimate',  cost: 8  },
  { icon: ScrollText,  label: 'Contract',     cost: 12 },
  { icon: ClipboardList, label: 'Invoice',    cost: 5  },
  { icon: Zap,         label: 'Permit',       cost: 15 },
  { icon: Shield,      label: 'Prop. Verify', cost: 15 },
  { icon: Star,        label: 'Signature',    cost: 8  },
];

function getActionEquivalent(totalCredits: number): string {
  const estimates = Math.floor(totalCredits / 8);
  const contracts = Math.floor(totalCredits / 12);
  const invoices  = Math.floor(totalCredits / 5);
  if (totalCredits <= 60)  return `~${estimates} estimates or ${invoices} invoices`;
  if (totalCredits <= 250) return `~${estimates} estimates or ${contracts} contracts`;
  return `~${estimates} estimates · ${contracts} contracts`;
}

export function TopUpModal({
  isOpen,
  onClose,
  onSuccess,
  requiredCredits,
  featureName,
  currentBalance,
}: TopUpModalProps) {
  const { packages, balance, initiateTopUp, isCheckingOut } = useWallet();
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  const displayBalance = currentBalance ?? balance ?? 0;
  const deficit = requiredCredits ? Math.max(0, requiredCredits - displayBalance) : 0;

  const handlePurchase = async (packageId: number) => {
    setSelectedPackageId(packageId);
    await initiateTopUp(packageId);
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'max-w-md w-full border border-cyan-900/40 bg-background p-0',
          'shadow-[0_0_50px_rgba(103,232,249,0.07)]',
          'max-h-[90vh] flex flex-col'
        )}
      >
        {/* ── Header (fixed) ── */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border/30 flex-shrink-0">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40">
            <Zap className="h-4 w-4 text-cyan-400" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight">
              Comprar Créditos
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-tight">
              Recarga tus créditos AI — pago único, sin suscripción
            </DialogDescription>
          </div>
          {/* Balance pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/30 flex-shrink-0">
            <span className="text-sm font-mono font-bold text-cyan-300">{displayBalance.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">cr</span>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* Context alert */}
          {requiredCredits && deficit > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/40">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-snug">
                <strong>{requiredCredits} credits</strong> needed for {featureName || 'this feature'}.
                {' '}Compra <strong>{deficit}+</strong> créditos para continuar.
              </p>
            </div>
          )}

          {/* Package cards — stacked vertically, compact */}
          <div className="space-y-2">
            {packages.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted/10 border border-border/30 animate-pulse" />
                ))
              : packages.map((pkg, index) => {
                  const style = PACKAGE_STYLES[index % PACKAGE_STYLES.length];
                  const Icon  = PACKAGE_ICONS[index % PACKAGE_ICONS.length];
                  const isSelected = selectedPackageId === pkg.id;
                  const isLoading  = isCheckingOut && isSelected;
                  const totalCredits = pkg.totalCredits ?? (pkg.credits + pkg.bonusCredits);
                  const actionEq     = getActionEquivalent(totalCredits);

                  return (
                    <button
                      key={pkg.id}
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={isCheckingOut}
                      className={cn(
                        'relative w-full flex items-center gap-3 px-4 py-3 rounded-xl border',
                        'bg-background/40 transition-all duration-150 text-left',
                        'hover:bg-background/70 active:scale-[0.99]',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        style.accent,
                        style.glow,
                        isSelected && 'ring-1 ring-cyan-500/60'
                      )}
                    >
                      {/* Badge */}
                      {style.badge && (
                        <span className={cn(
                          'absolute -top-2 right-3 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full',
                          style.badgeClass
                        )}>
                          {style.badge}
                        </span>
                      )}

                      {/* Icon */}
                      <div className={cn('flex-shrink-0', style.iconColor)}>
                        {isLoading
                          ? <Loader2 className="h-5 w-5 animate-spin" />
                          : <Icon className="h-5 w-5" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold text-foreground">
                            {pkg.name.replace(/\s*—.*/, '').trim()}
                          </span>
                          <span className={cn('text-base font-mono font-black', style.creditsColor)}>
                            {totalCredits.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">cr</span>
                          {pkg.bonusCredits > 0 && (
                            <span className="text-[9px] text-green-400 font-medium">
                              +{pkg.bonusCredits} bonus
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{actionEq}</p>
                      </div>

                      {/* Price */}
                      <div className="flex-shrink-0 text-right">
                        <div className={cn('text-lg font-bold font-mono', style.priceColor)}>
                          {formatPrice(pkg.priceUsdCents)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">pago único</div>
                      </div>
                    </button>
                  );
                })
            }
          </div>

          {/* Credit cost reference */}
          <div className="rounded-lg bg-muted/5 border border-border/20 px-3 py-2.5">
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">
              Credit costs per action
            </p>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
              {CREDIT_COSTS.map(({ icon: Icon, label, cost }) => (
                <div key={label} className="flex items-center gap-1">
                  <Icon className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-[9px] text-muted-foreground truncate">{label}</span>
                  <span className="text-[9px] text-cyan-400 font-mono ml-auto flex-shrink-0">{cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer (fixed) ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Pago seguro con Stripe · Créditos sin vencimiento
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-3"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
