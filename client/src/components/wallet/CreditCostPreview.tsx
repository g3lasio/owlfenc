/**
 * CreditCostPreview — Indicador de costo de créditos antes de ejecutar una feature
 * PAY AS YOU GROW — Mervin AI / Owl Fenc App
 * 
 * Muestra cuántos créditos costará una acción y si el usuario puede pagarla.
 * Se usa junto a botones de acción en Estimates, Contracts, Permits, etc.
 * 
 * Ejemplo de uso:
 * <CreditCostPreview featureName="aiEstimate" />
 * <Button onClick={generateEstimate}>Generate Estimate</Button>
 */

import { useState } from 'react';
import { Zap, AlertTriangle, Info } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { TopUpModal } from './TopUpModal';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Nombres amigables de features
const FEATURE_LABELS: Record<string, string> = {
  aiEstimate: 'AI Estimate',
  contract: 'Contract',
  invoice: 'Invoice',
  permitAdvisor: 'Permit Advisor',
  propertyVerifier: 'Property Verifier',
  paymentLink: 'Payment Link',
  aiChat: 'AI Chat',
  deepSearch: 'Deep Search',
};

interface CreditCostPreviewProps {
  featureName: string;
  className?: string;
  // Si true, muestra un botón de top-up cuando no hay suficientes créditos
  showTopUpButton?: boolean;
  // Variante visual
  variant?: 'inline' | 'badge' | 'banner';
}

export function CreditCostPreview({
  featureName,
  className,
  showTopUpButton = true,
  variant = 'inline',
}: CreditCostPreviewProps) {
  const { getFeatureCost, canAfford, balance, isLoading } = useWallet();
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  if (isLoading) return null;

  const cost = getFeatureCost(featureName);
  const affordable = canAfford(featureName);
  const featureLabel = FEATURE_LABELS[featureName] || featureName;

  if (cost === 0) return null; // Feature gratuita, no mostrar

  // ================================
  // VARIANTE: INLINE (default)
  // Pequeño indicador junto al botón
  // ================================
  if (variant === 'inline') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                  'border cursor-help transition-colors',
                  affordable
                    ? 'bg-cyan-950/20 border-cyan-800/30 text-cyan-400'
                    : 'bg-red-950/20 border-red-800/30 text-red-400',
                  className
                )}
              >
                <Zap className="h-3 w-3" fill="currentColor" />
                <span className="font-mono">{cost}</span>
                {!affordable && <AlertTriangle className="h-3 w-3" />}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {affordable ? (
                <p>This action costs <strong>{cost} credits</strong>. You have {balance}.</p>
              ) : (
                <p>
                  You need <strong>{cost} credits</strong> but only have {balance}.
                  {showTopUpButton && ' Click to top up.'}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {showTopUpModal && (
          <TopUpModal
            isOpen={showTopUpModal}
            onClose={() => setShowTopUpModal(false)}
            requiredCredits={cost}
            featureName={featureLabel}
            currentBalance={balance ?? 0}
          />
        )}
      </>
    );
  }

  // ================================
  // VARIANTE: BADGE
  // Badge más visible con texto
  // ================================
  if (variant === 'badge') {
    return (
      <>
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
            'border transition-all',
            affordable
              ? 'bg-cyan-950/30 border-cyan-700/40 text-cyan-300'
              : 'bg-red-950/30 border-red-700/40 text-red-300 cursor-pointer hover:bg-red-900/40',
            className
          )}
          onClick={!affordable && showTopUpButton ? () => setShowTopUpModal(true) : undefined}
        >
          <Zap className="h-3 w-3" fill="currentColor" />
          <span>{cost} credits</span>
          {!affordable && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-red-400">
                {showTopUpButton ? 'Top up ↗' : 'Insufficient'}
              </span>
            </>
          )}
        </div>

        {showTopUpModal && (
          <TopUpModal
            isOpen={showTopUpModal}
            onClose={() => setShowTopUpModal(false)}
            requiredCredits={cost}
            featureName={featureLabel}
            currentBalance={balance ?? 0}
          />
        )}
      </>
    );
  }

  // ================================
  // VARIANTE: BANNER
  // Banner completo cuando no hay créditos suficientes
  // Solo se muestra si NO puede pagar
  // ================================
  if (variant === 'banner') {
    if (affordable) {
      // Solo mostrar el costo como info sutil
      return (
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-cyan-950/15 border border-cyan-900/30 text-xs text-cyan-400/80',
          className
        )}>
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>This action will use <strong className="text-cyan-300">{cost} credits</strong>. Balance: {balance}</span>
        </div>
      );
    }

    return (
      <>
        <div className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-lg',
          'bg-amber-950/30 border border-amber-800/40',
          className
        )}>
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">
              Insufficient credits
            </p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {featureLabel} requires <strong>{cost} credits</strong>.
              You have <strong>{balance}</strong>.
              {' '}You need <strong>{cost - (balance ?? 0)} more</strong>.
            </p>
          </div>
          {showTopUpButton && (
            <button
              onClick={() => setShowTopUpModal(true)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
                'bg-amber-600/80 hover:bg-amber-500/80 text-white border border-amber-500/50',
                'transition-all hover:scale-105 active:scale-95'
              )}
            >
              <Zap className="h-3 w-3" />
              Top Up
            </button>
          )}
        </div>

        {showTopUpModal && (
          <TopUpModal
            isOpen={showTopUpModal}
            onClose={() => setShowTopUpModal(false)}
            requiredCredits={cost}
            featureName={featureLabel}
            currentBalance={balance ?? 0}
          />
        )}
      </>
    );
  }

  return null;
}
