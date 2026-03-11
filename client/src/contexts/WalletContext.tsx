/**
 * WalletContext — Global wallet state shared across all components.
 * 
 * This context provides a SINGLE source of truth for the wallet balance.
 * All components (WalletBadge, WalletPage, etc.) consume this context
 * instead of creating independent hook instances.
 * 
 * Key behaviors:
 * - Balance is fetched once when the user authenticates
 * - The 'wallet-credits-spent' event triggers an immediate re-fetch
 * - All consumers see the updated balance simultaneously (no stale data)
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletTransaction {
  id: number;
  type: string;
  description: string;
  amountCredits: number;
  direction: 'credit' | 'debit';
  featureName?: string;
  createdAt: string;
}

export interface WalletBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isLocked: boolean;
  recentTransactions: WalletTransaction[];
}

interface WalletContextValue {
  balance: number | null;
  walletData: WalletBalance | null;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const isFetching = useRef(false); // Prevent concurrent fetches

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    // Prevent concurrent fetches (e.g., rapid event firing)
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const response = await fetch('/api/wallet/balance', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          setWalletData(null);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setWalletData({
          balance: data.balance ?? 0,
          totalEarned: data.totalEarned ?? 0,
          totalSpent: data.totalSpent ?? 0,
          isLocked: data.isLocked ?? false,
          recentTransactions: data.recentTransactions ?? [],
        });
        setError(null);
      }
    } catch (err) {
      console.warn('[WalletContext] Error fetching balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      isFetching.current = false;
    }
  }, [user]);

  // Initial load when user authenticates
  useEffect(() => {
    if (!user) {
      hasFetched.current = false;
      isFetching.current = false;
      setWalletData(null);
      setError(null);
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;
    setIsLoading(true);
    fetchBalance().finally(() => setIsLoading(false));
  }, [user, fetchBalance]);

  // Listen for credit-spending events from any feature page
  // Any component calls notifyCreditsSpent() after a successful deduction
  useEffect(() => {
    const handleCreditsSpent = () => {
      console.log('[WalletContext] 🔄 wallet-credits-spent — refreshing balance');
      fetchBalance();
    };
    window.addEventListener('wallet-credits-spent', handleCreditsSpent);
    return () => window.removeEventListener('wallet-credits-spent', handleCreditsSpent);
  }, [fetchBalance]);

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  return (
    <WalletContext.Provider
      value={{
        balance: walletData?.balance ?? null,
        walletData,
        isLoading,
        error,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Consumer hook ─────────────────────────────────────────────────────────────

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWalletContext must be used inside <WalletProvider>');
  }
  return ctx;
}
