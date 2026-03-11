/**
 * useWallet — Hook para el sistema PAY AS YOU GROW
 * Mervin AI / Owl Fenc App
 * 
 * Provee:
 * - Balance de créditos en tiempo real
 * - Historial de transacciones
 * - Paquetes de top-up disponibles
 * - Estado de billing del usuario
 * - Función para iniciar un top-up
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';

// ================================
// TIPOS
// ================================

export interface WalletTransaction {
  id: number;
  type: 'subscription_grant' | 'topup_purchase' | 'feature_usage' | 'admin_adjustment' | 'referral_bonus' | 'refund';
  direction?: 'credit' | 'debit'; // 'credit' = incoming, 'debit' = outgoing
  amountCredits: number;
  description: string;
  featureName?: string;
  resourceId?: string;
  createdAt: string;
}

export interface WalletBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isLocked: boolean;
  recentTransactions: WalletTransaction[];
}

export interface CreditPackage {
  id: number;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceUsdCents: number;
  stripePriceId: string | null;
  isPopular?: boolean; // Opcional: puede no venir del backend (no está en la tabla DB)
  equivalence: {
    aiEstimates: number;
    contracts: number;
    description: string;
  };
}

export interface BillingStatus {
  mode: 'free' | 'payg' | 'subscriber';
  planId: number | null;
  planName: string | null;
  monthlyCreditsGrant: number;
  currentBalance: number;
  canUseStripeConnect: boolean;
  hasActiveSubscription: boolean;
  featureCosts: Record<string, number>;
}

export interface UseWalletReturn {
  // Estado
  balance: number | null;
  walletData: WalletBalance | null;
  packages: CreditPackage[];
  billingStatus: BillingStatus | null;
  isLoading: boolean;
  error: string | null;

  // Acciones
  refreshBalance: () => Promise<void>;
  initiateTopUp: (packageId: number) => Promise<void>;
  getFeatureCost: (featureName: string) => number;
  canAfford: (featureName: string) => boolean;

  // Estado del top-up
  isCheckingOut: boolean;
}

// ================================
// FEATURE COSTS (mirror del backend)
// ================================
const FEATURE_COSTS: Record<string, number> = {
  aiEstimate: 5,
  contract: 3,
  invoice: 2,
  permitAdvisor: 3,
  propertyVerifier: 4,
  paymentLink: 1,
  aiChat: 1,
  deepSearch: 2,
};

// ================================
// FALLBACK PACKAGES (cuando el endpoint falla o la DB no está lista)
// Garantiza que el TopUpModal siempre muestre los 3 paquetes
// ================================
const FALLBACK_PACKAGES: CreditPackage[] = [
  {
    id: 1,
    name: 'Starter Pack — 50 credits',
    credits: 50,
    bonusCredits: 0,
    totalCredits: 50,
    priceUsdCents: 1000,
    stripePriceId: null,
    isPopular: false,
    equivalence: { aiEstimates: 6, contracts: 4, description: '~6 AI estimates or 10 invoices' },
  },
  {
    id: 2,
    name: 'Pro Pack — 200 + 25 bonus',
    credits: 200,
    bonusCredits: 25,
    totalCredits: 225,
    priceUsdCents: 3000,
    stripePriceId: null,
    isPopular: true,
    equivalence: { aiEstimates: 28, contracts: 18, description: '~28 estimates or 18 contracts' },
  },
  {
    id: 3,
    name: 'Power Pack — 600 + 100 bonus',
    credits: 600,
    bonusCredits: 100,
    totalCredits: 700,
    priceUsdCents: 7500,
    stripePriceId: null,
    isPopular: false,
    equivalence: { aiEstimates: 87, contracts: 58, description: '~87 estimates · 58 contracts · 140 invoices' },
  },
];

// ================================
// HOOK
// ================================

export function useWallet(): UseWalletReturn {
  const { user } = useAuth();
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const hasFetched = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/wallet/balance', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) return; // No autenticado aún
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setWalletData({
          balance: data.balance,
          totalEarned: data.totalEarned,
          totalSpent: data.totalSpent,
          isLocked: data.isLocked,
          recentTransactions: data.recentTransactions || [],
        });
      }
    } catch (err) {
      // Silenciar errores de balance para no interrumpir la UX
      console.warn('[useWallet] Error fetching balance:', err);
    }
  }, [user]);

  const fetchPackages = useCallback(async () => {
    try {
      const response = await fetch('/api/wallet/packages', {
        credentials: 'include',
      });

      if (!response.ok) {
        // Fallback: mostrar paquetes hardcodeados si el endpoint falla
        // Esto garantiza que el TopUpModal nunca quede en blanco
        console.warn('[useWallet] /packages endpoint failed, using fallback data');
        setPackages(FALLBACK_PACKAGES);
        return;
      }

      const data = await response.json();
      if (data.success && data.packages?.length > 0) {
        setPackages(data.packages);
      } else {
        // Si el endpoint retorna vacío, usar fallback
        setPackages(FALLBACK_PACKAGES);
      }
    } catch (err) {
      console.warn('[useWallet] Error fetching packages, using fallback:', err);
      setPackages(FALLBACK_PACKAGES);
    }
  }, []);

  const fetchBillingStatus = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/wallet/billing-status', {
        credentials: 'include',
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setBillingStatus(data);
      }
    } catch (err) {
      console.warn('[useWallet] Error fetching billing status:', err);
    }
  }, [user]);

  // Carga inicial
  useEffect(() => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;

    setIsLoading(true);
    Promise.all([fetchBalance(), fetchPackages(), fetchBillingStatus()])
      .catch(console.warn)
      .finally(() => setIsLoading(false));
  }, [user, fetchBalance, fetchPackages, fetchBillingStatus]);

  // Refresh cuando el usuario cambia
  useEffect(() => {
    if (!user) {
      hasFetched.current = false;
      setWalletData(null);
      setBillingStatus(null);
    }
  }, [user]);

  // 🔄 Refresh balance automatically when any feature spends credits
  // Any page/component dispatches 'wallet-credits-spent' after a successful deduction
  // This ensures the header badge and wallet page update without a manual page refresh
  useEffect(() => {
    const handleCreditsSpent = () => {
      console.log('[useWallet] 🔄 wallet-credits-spent event received — refreshing balance');
      fetchBalance().catch(console.warn);
    };
    window.addEventListener('wallet-credits-spent', handleCreditsSpent);
    return () => window.removeEventListener('wallet-credits-spent', handleCreditsSpent);
  }, [fetchBalance]);

  const refreshBalance = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchBillingStatus()]);
  }, [fetchBalance, fetchBillingStatus]);

  /**
   * Helper para manejar errores 402 (Insufficient Credits) de la API
   */
  const handleCreditError = useCallback((error: any) => {
    if (error?.status === 402 || error?.message?.includes('INSUFFICIENT_CREDITS')) {
      window.dispatchEvent(new CustomEvent('open-wallet-topup'));
      return true;
    }
    return false;
  }, []);

  const initiateTopUp = useCallback(async (packageId: number) => {
    if (!user) {
      setError('Authentication required');
      return;
    }

    setIsCheckingOut(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/top-up/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.checkoutUrl) {
        // Redirigir a Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate top-up';
      setError(message);
      console.error('[useWallet] Error initiating top-up:', err);
    } finally {
      setIsCheckingOut(false);
    }
  }, [user]);

  const getFeatureCost = useCallback((featureName: string): number => {
    if (billingStatus?.featureCosts) {
      return billingStatus.featureCosts[featureName] ?? FEATURE_COSTS[featureName] ?? 1;
    }
    return FEATURE_COSTS[featureName] ?? 1;
  }, [billingStatus]);

  const canAfford = useCallback((featureName: string): boolean => {
    const cost = getFeatureCost(featureName);
    const balance = walletData?.balance ?? 0;
    return balance >= cost;
  }, [walletData, getFeatureCost]);

  return {
    balance: walletData?.balance ?? null,
    walletData,
    packages,
    billingStatus,
    isLoading,
    error,
    refreshBalance,
    initiateTopUp,
    handleCreditError,
    getFeatureCost,
    canAfford,
    isCheckingOut,
  };
}

/**
 * Helper global para abrir el modal de Top Up desde cualquier lugar
 * sin necesidad de estar dentro de un componente React (ej: interceptores de fetch)
 */
export function openTopUpModal() {
  window.dispatchEvent(new CustomEvent('open-wallet-topup'));
}

/**
 * Helper global para notificar que se gastaron créditos.
 * Llamar después de cualquier operación exitosa que deduzca créditos.
 * Esto actualiza el badge del header y la página de wallet automáticamente.
 * 
 * Uso: import { notifyCreditsSpent } from '@/hooks/useWallet';
 *      notifyCreditsSpent(); // después de generar contrato, invoice, etc.
 */
export function notifyCreditsSpent() {
  window.dispatchEvent(new CustomEvent('wallet-credits-spent'));
}
