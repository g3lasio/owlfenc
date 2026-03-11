/**
 * WalletBadge — Indicador de balance de créditos para el Header
 * PAY AS YOU GROW — Mervin AI / Owl Fenc App
 * 
 * Muestra el balance de créditos en tiempo real con estilo futurista.
 * Al hacer click, abre el TopUpModal.
 */

import { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';
import { TopUpModal } from './TopUpModal';
import { cn } from '@/lib/utils';

interface WalletBadgeProps {
  className?: string;
  compact?: boolean; // Versión compacta para mobile
}

export function WalletBadge({ className, compact = false }: WalletBadgeProps) {
  const { balance, isLoading, walletData } = useWalletContext();
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Escuchar evento global para abrir el modal
  useEffect(() => {
    const handleOpenModal = () => setShowTopUpModal(true);
    window.addEventListener('open-wallet-topup', handleOpenModal);
    return () => window.removeEventListener('open-wallet-topup', handleOpenModal);
  }, []);

  // Determinar estado visual basado en el balance
  const getBalanceState = () => {
    if (balance === null) return 'loading';
    if (walletData?.isLocked) return 'locked';
    if (balance === 0) return 'empty';
    if (balance < 10) return 'low';
    if (balance < 30) return 'medium';
    return 'good';
  };

  const state = getBalanceState();

  const stateConfig = {
    loading: {
      color: 'text-muted-foreground',
      glow: '',
      bg: 'bg-muted/20',
      border: 'border-border',
      pulse: false,
    },
    locked: {
      color: 'text-red-400',
      glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
      bg: 'bg-red-950/30',
      border: 'border-red-800/50',
      pulse: true,
    },
    empty: {
      color: 'text-red-400',
      glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
      bg: 'bg-red-950/30',
      border: 'border-red-800/50',
      pulse: true,
    },
    low: {
      color: 'text-amber-400',
      glow: 'shadow-[0_0_10px_rgba(251,191,36,0.3)]',
      bg: 'bg-amber-950/30',
      border: 'border-amber-800/50',
      pulse: false,
    },
    medium: {
      color: 'text-cyan-300',
      glow: 'shadow-[0_0_8px_rgba(103,232,249,0.2)]',
      bg: 'bg-cyan-950/20',
      border: 'border-cyan-800/40',
      pulse: false,
    },
    good: {
      color: 'text-cyan-300',
      glow: 'shadow-[0_0_12px_rgba(103,232,249,0.25)]',
      bg: 'bg-cyan-950/20',
      border: 'border-cyan-700/40',
      pulse: false,
    },
  };

  const config = stateConfig[state];

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowTopUpModal(true)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md border transition-all duration-200',
            'hover:scale-105 active:scale-95 cursor-pointer',
            config.bg,
            config.border,
            config.glow,
            config.pulse && 'animate-pulse',
            className
          )}
          title="Mervin AI Credits"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Zap className={cn('h-3 w-3', config.color)} />
              <span className={cn('text-xs font-mono font-bold', config.color)}>
                {balance ?? '—'}
              </span>
            </>
          )}
        </button>

        <TopUpModal
          isOpen={showTopUpModal}
          onClose={() => setShowTopUpModal(false)}
          onSuccess={() => {
            setShowTopUpModal(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowTopUpModal(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200',
          'hover:scale-105 active:scale-95 cursor-pointer group',
          config.bg,
          config.border,
          config.glow,
          config.pulse && 'animate-pulse',
          className
        )}
        title="Mervin AI Credits — Haz clic para comprar créditos"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            {/* Icono */}
            <div className="relative">
              <Zap
                className={cn(
                  'h-4 w-4 transition-transform group-hover:scale-110',
                  config.color
                )}
                fill="currentColor"
              />
              {(state === 'empty' || state === 'locked') && (
                <AlertTriangle className="h-2.5 w-2.5 text-red-400 absolute -top-1 -right-1" />
              )}
            </div>

            {/* Balance */}
            <div className="flex flex-col items-start leading-none">
              <span className={cn('text-sm font-mono font-bold tabular-nums', config.color)}>
                {balance !== null ? balance.toLocaleString() : '—'}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                credits
              </span>
            </div>

            {/* Indicador de estado bajo */}
            {(state === 'low' || state === 'empty') && (
              <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-wide ml-1">
                {state === 'empty' ? 'OUT' : 'LOW'}
              </span>
            )}
          </>
        )}
      </button>

      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={() => {
          setShowTopUpModal(false);
        }}
      />
    </>
  );
}
