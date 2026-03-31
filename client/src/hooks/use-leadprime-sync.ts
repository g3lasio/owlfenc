/**
 * useLeadPrimeSync
 * Hook that automatically syncs new/updated documents from Owl Fenc to LeadPrime Network.
 * Called after any document creation/update in Estimates, Invoices, Contracts, Permits.
 */
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadPrimeDocType = "estimate" | "invoice" | "contract" | "permit" | "certificate" | "property_report";

export interface LeadPrimeSyncPayload {
  doc_type: LeadPrimeDocType;
  doc_reference: string;       // e.g. "EST-2026-0042"
  doc_title: string;           // e.g. "Bathroom Renovation - 123 Oak St"
  amount?: number;             // for estimates and invoices
  currency?: string;           // default "USD"
  project_address?: string;    // for grouping in My Projects
  pdf_url?: string;            // Firebase Storage URL if available
  preview_text?: string;       // short description shown in LeadPrime
  status?: string;             // "draft" | "sent" | "approved" | "paid" | "signed" etc.
  items?: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  metadata?: Record<string, unknown>; // any extra data
}

interface ConnectionStatus {
  connected: boolean;
  handle?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLeadPrimeSync() {
  // Check if connected — cached, refetches every 5 min
  const { data: connection } = useQuery<ConnectionStatus>({
    queryKey: ["leadprime-connection"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/leadprime-network/connection", undefined, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return { connected: false };
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });

  /**
   * syncDocument — call this after creating or updating any document.
   * It silently syncs to LeadPrime if the account is connected.
   * Errors are swallowed to never block the main flow.
   */
  const syncDocument = useCallback(
    async (payload: LeadPrimeSyncPayload): Promise<void> => {
      if (!connection?.connected) return; // not connected, skip silently

      try {
        const res = await apiRequest("POST", "/api/leadprime-network/sync-document", payload, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          console.warn("[LeadPrime Sync] Failed to sync document:", payload.doc_reference);
        }
      } catch (err) {
        // Silent fail — never block the main operation
        console.warn("[LeadPrime Sync] Network error:", err);
      }
    },
    [connection?.connected]
  );

  return {
    isConnected: connection?.connected ?? false,
    handle: connection?.handle,
    syncDocument,
  };
}
