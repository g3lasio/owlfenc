/**
 * WalletContext — Global wallet state shared across all components.
 *
 * This context provides a SINGLE source of truth for the wallet balance.
 * All components (WalletBadge, WalletPage, etc.) consume this context
 * instead of creating independent hook instances.
 *
 * Key behaviors:
 * - Balance is fetched once when the user authenticates
 * - Uses fetchWithAuth to always include the Firebase Bearer token so the
 *   wallet loads correctly on NEW DEVICES where the __session cookie has not
 *   been set yet (race condition fix).
 * - RETRY: If the first fetch fails (cold start / 500 error), retries up to
 *   3 times with exponential backoff (2s, 4s, 8s) before giving up.
 * - The 'wallet-credits-spent' event triggers an immediate re-fetch
 * - All consumers see the updated balance simultaneously (no stale data)
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

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

// ─── Retry helper ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000; // 2s, 4s, 8s

async function fetchBalanceWithRetry(
  attempt: number = 0
): Promise<{ balance: number; totalEarned: number; totalSpent: number; isLocked: boolean; recentTransactions: any[] } | null> {
  try {
    const response = await fetchWithAuth('/api/wallet/balance');

    if (!response.ok) {
      if (response.status === 401) return null; // Not authenticated — don't retry
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      return {
        balance: data.balance ?? 0,
        totalEarned: data.totalEarned ?? 0,
        totalSpent: data.totalSpent ?? 0,
        isLocked: data.isLocked ?? false,
        recentTransactions: data.recentTransactions ?? [],
      };
    }
    throw new Error('Response success=false');
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt); // 2s, 4s, 8s
      console.warn(`[WalletContext] Fetch failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchBalanceWithRetry(attempt + 1);
    }
    console.error('[WalletContext] All retry attempts exhausted:', err);
    throw err;
  }
}

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
      const data = await fetchBalanceWithRetry(0);
      if (data) {
        setWalletData(data);
        setError(null);
        console.log(`[WalletContext] ✅ Balance loaded: ${data.balance} credits`);
      }
    } catch (err) {
      console.warn('[WalletContext] Error fetching balance (all retries failed):', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      // Reset hasFetched so next user interaction can trigger a fresh attempt
      hasFetched.current = false;
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

  // Listen for manual refresh requests (e.g., after onboarding welcome bonus)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[WalletContext] 🔄 wallet-refresh-requested — refreshing balance');
      hasFetched.current = false;
      fetchBalance();
    };
    window.addEventListener('wallet-refresh-requested', handleRefresh);
    return () => window.removeEventListener('wallet-refresh-requested', handleRefresh);
  }, [fetchBalance]);

  const refreshBalance = useCallback(async () => {
    hasFetched.current = false;
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
