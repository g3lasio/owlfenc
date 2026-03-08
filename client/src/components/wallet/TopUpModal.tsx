/**
 * TopUpModal — Modal de compra de créditos (Top-Up)
 * PAY AS YOU GROW — Mervin AI / Owl Fenc App
 * 
 * Muestra los 3 paquetes de créditos con estilo futurista.
 * Integra con Stripe Checkout via /api/wallet/top-up/checkout.
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
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Contexto opcional: qué feature se intentó usar
  requiredCredits?: number;
  featureName?: string;
  currentBalance?: number;
}

// Iconos por paquete
const PACKAGE_ICONS = [Zap, Star, Rocket];

// Colores por paquete
const PACKAGE_STYLES = [
  {
    gradient: 'from-blue-900/40 to-cyan-900/30',
    border: 'border-cyan-800/40 hover:border-cyan-600/60',
    glow: 'hover:shadow-[0_0_20px_rgba(103,232,249,0.15)]',
    iconColor: 'text-cyan-400',
    priceColor: 'text-cyan-300',
    badge: null,
  },
  {
    gradient: 'from-purple-900/40 to-blue-900/30',
    border: 'border-purple-700/50 hover:border-purple-500/70',
    glow: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]',
    iconColor: 'text-purple-400',
    priceColor: 'text-purple-300',
    badge: 'POPULAR',
  },
  {
    gradient: 'from-amber-900/30 to-orange-900/20',
    border: 'border-amber-700/40 hover:border-amber-500/60',
    glow: 'hover:shadow-[0_0_25px_rgba(251,191,36,0.15)]',
    iconColor: 'text-amber-400',
    priceColor: 'text-amber-300',
    badge: 'BEST VALUE',
  },
];

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

  // Formatear precio
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Calcular precio por crédito
  const pricePerCredit = (pkg: { priceUsdCents: number; totalCredits: number }) =>
    ((pkg.priceUsdCents / 100) / pkg.totalCredits).toFixed(3);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'max-w-2xl border border-cyan-900/40 bg-background',
          'shadow-[0_0_60px_rgba(103,232,249,0.08)]',
          'backdrop-blur-sm'
        )}
      >
        {/* Header */}
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40">
              <Zap className="h-5 w-5 text-cyan-400" fill="currentColor" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Mervin AI Credits
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Power your AI tools — estimates, contracts, permits & more
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Balance actual + contexto */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/10 border border-border/50 mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Current balance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold text-cyan-300">
              {displayBalance.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">credits</span>
          </div>
        </div>

        {/* Mensaje de contexto si viene de una feature bloqueada */}
        {requiredCredits && deficit > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-950/30 border border-amber-800/40 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              You need <strong>{requiredCredits} credits</strong> for {featureName || 'this feature'}.
              {' '}Top up <strong>{deficit} more credits</strong> to continue.
            </p>
          </div>
        )}

        {/* Paquetes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {packages.length === 0 ? (
            // Skeleton mientras carga
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-muted/10 border border-border/30 animate-pulse"
              />
            ))
          ) : (
            packages.map((pkg, index) => {
              const style = PACKAGE_STYLES[index % PACKAGE_STYLES.length];
              const Icon = PACKAGE_ICONS[index % PACKAGE_ICONS.length];
              const isSelected = selectedPackageId === pkg.id;
              const isLoading = isCheckingOut && isSelected;

              return (
                <button
                  key={pkg.id}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isCheckingOut}
                  className={cn(
                    'relative flex flex-col items-center p-4 rounded-xl border',
                    'bg-gradient-to-b transition-all duration-200 text-left',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
                    style.gradient,
                    style.border,
                    style.glow,
                    isSelected && 'ring-2 ring-cyan-500/50 scale-[1.02]'
                  )}
                >
                  {/* Badge popular/best value */}
                  {style.badge && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px] font-bold tracking-wider px-2 py-0.5',
                          index === 1
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-amber-600 text-white border-amber-500'
                        )}
                      >
                        {style.badge}
                      </Badge>
                    </div>
                  )}

                  {/* Icono */}
                  <div className={cn('mb-3 mt-1', style.iconColor)}>
                    {isLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <Icon className="h-8 w-8" />
                    )}
                  </div>

                  {/* Nombre */}
                  <h3 className="text-sm font-bold text-foreground mb-1 text-center">
                    {pkg.name.split('—')[0].trim()}
                  </h3>

                  {/* Créditos */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={cn('text-2xl font-mono font-black', style.priceColor)}>
                      {pkg.totalCredits.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">credits</span>
                  </div>

                  {/* Bonus */}
                  {pkg.bonusCredits > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span className="text-[10px] text-green-400 font-medium">
                        +{pkg.bonusCredits} bonus included
                      </span>
                    </div>
                  )}

                  {/* Equivalencia */}
                  <p className="text-[10px] text-muted-foreground text-center mb-3">
                    {pkg.equivalence.description}
                  </p>

                  {/* Precio */}
                  <div className="mt-auto w-full">
                    <div className={cn(
                      'flex items-center justify-center gap-1 py-2 px-4 rounded-lg',
                      'bg-background/30 border border-border/30'
                    )}>
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      <span className={cn('text-lg font-bold font-mono', style.priceColor)}>
                        {formatPrice(pkg.priceUsdCents)}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center mt-1">
                      ${pricePerCredit(pkg)}/credit
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secured by Stripe · Credits never expire
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
