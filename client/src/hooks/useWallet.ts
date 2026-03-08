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
  isPopular: boolean;
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

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.warn('[useWallet] Error fetching packages:', err);
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

  const refreshBalance = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchBillingStatus()]);
  }, [fetchBalance, fetchBillingStatus]);

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
    getFeatureCost,
    canAfford,
    isCheckingOut,
  };
}
