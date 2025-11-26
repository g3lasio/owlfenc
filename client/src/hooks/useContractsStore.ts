import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { contractHistoryService, ContractHistoryEntry } from '@/services/contractHistoryService';
import { auth } from '@/lib/firebase';
import { useMemo } from 'react';

interface NormalizedContract extends ContractHistoryEntry {
  source: 'contractHistory' | 'dualSignature';
  isArchived?: boolean;
  archivedAt?: Date;
  archivedReason?: string;
  // Compatibility fields for legacy UI
  totalAmount?: number;
  completionDate?: Date | string | null;
}

interface ContractsStore {
  drafts: NormalizedContract[];
  inProgress: NormalizedContract[];
  completed: NormalizedContract[];
  archived: NormalizedContract[];
  isLoading: boolean;
  error: Error | null;
  archiveContract: (contractId: string, reason: string) => Promise<void>;
  unarchiveContract: (contractId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const DRAFT_STATUSES = ['draft'];
const IN_PROGRESS_STATUSES = ['in_progress', 'contractor_signed', 'client_signed', 'processing', 'error'];
const COMPLETED_STATUSES = ['completed', 'both_signed'];

export function useContractsStore(): ContractsStore {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.currentUser?.uid;

  // Unified query for all contracts
  const { data: contracts = [], isLoading, error, refetch } = useQuery<NormalizedContract[]>({
    queryKey: ['contracts', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get auth headers for API calls
      let authHeaders: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          authHeaders['Authorization'] = `Bearer ${token}`;
        } catch (err) {
          console.warn('⚠️ Could not get Firebase token:', err);
        }
      }

      // Load from three sources in parallel: contractHistory (non-archived), dualSignature completed (non-archived), and archived
      const [historyResponse, dualSignatureResponse, archivedResponse] = await Promise.allSettled([
        contractHistoryService.getContractHistory(userId),
        fetch(`/api/dual-signature/completed/${userId}`, {
          method: 'GET',
          headers: authHeaders,
          credentials: 'include'
        }).then(async (res) => {
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              return { contracts: [] };
            }
            throw new Error(`API returned ${res.status}`);
          }
          return res.json();
        }),
        fetch(`/api/contracts/archived`, {
          method: 'GET',
          headers: authHeaders,
          credentials: 'include'
        }).then(async (res) => {
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              return [];
            }
            throw new Error(`API returned ${res.status}`);
          }
          return res.json();
        })
      ]);

      // Normalize contracts from both sources
      const normalized: NormalizedContract[] = [];
      
      // Add contractHistory contracts
      if (historyResponse.status === 'fulfilled') {
        historyResponse.value.forEach((contract: ContractHistoryEntry) => {
          normalized.push({
            ...contract,
            source: 'contractHistory',
            isArchived: (contract as any).isArchived || false,
            archivedAt: (contract as any).archivedAt,
            archivedReason: (contract as any).archivedReason,
            totalAmount: contract.contractData?.financials?.total || contract.contractData?.financials?.displayTotal || 0,
            completionDate: (contract.contractData?.formFields as any)?.completionDate || null
          });
        });
      }

      // Add dualSignature contracts (avoid duplicates)
      if (dualSignatureResponse.status === 'fulfilled') {
        const dualContracts = dualSignatureResponse.value.contracts || [];
        dualContracts.forEach((contract: any) => {
          // Only add if not already present from contractHistory
          if (!normalized.find(c => c.contractId === contract.contractId)) {
            // ✅ CRITICAL FIX: Use Firestore document ID (id or docId) not contractId
            // The API should return the document ID as 'id' or 'docId'
            normalized.push({
              id: contract.id || contract.docId || contract.contractId,
              userId: contract.userId,
              contractId: contract.contractId,
              clientName: contract.clientName,
              projectType: contract.projectType || 'Unknown',
              status: contract.status || 'completed',
              createdAt: contract.createdAt ? new Date(contract.createdAt) : new Date(),
              updatedAt: contract.updatedAt ? new Date(contract.updatedAt) : new Date(),
              contractData: contract.contractData || {},
              source: 'dualSignature',
              isArchived: contract.isArchived || false,
              archivedAt: contract.archivedAt,
              archivedReason: contract.archivedReason,
              totalAmount: contract.totalAmount || 0,
              completionDate: contract.completionDate || null
            } as NormalizedContract);
          }
        });
      }

      // Add archived contracts (avoid duplicates)
      if (archivedResponse.status === 'fulfilled') {
        const archivedContracts = Array.isArray(archivedResponse.value) ? archivedResponse.value : [];
        archivedContracts.forEach((contract: any) => {
          // Only add if not already present
          if (!normalized.find(c => c.contractId === contract.contractId)) {
            // ✅ CRITICAL FIX: Use Firestore document ID (id or docId) not contractId
            normalized.push({
              id: contract.id || contract.docId || contract.contractId,
              userId: contract.userId || userId,
              contractId: contract.contractId,
              clientName: contract.clientName,
              projectType: contract.projectType || contract.projectDescription || 'Unknown',
              status: contract.status || 'completed',
              createdAt: contract.createdAt ? new Date(contract.createdAt) : new Date(),
              updatedAt: contract.updatedAt ? new Date(contract.updatedAt) : new Date(),
              contractData: contract.contractData || {},
              source: contract.source === 'contractHistory' ? 'contractHistory' : 'dualSignature',
              isArchived: true,
              archivedAt: contract.archivedAt ? new Date(contract.archivedAt) : undefined,
              archivedReason: contract.archivedReason,
              totalAmount: contract.totalAmount || (contract.contractData?.financials?.total) || 0,
              completionDate: contract.completionDate || null
            } as NormalizedContract);
          }
        });
      }

      return normalized;
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Memoized selectors for each tab
  const drafts = useMemo(
    () => contracts.filter(c => !c.isArchived && DRAFT_STATUSES.includes(c.status)),
    [contracts]
  );

  const inProgress = useMemo(
    () => contracts.filter(c => !c.isArchived && IN_PROGRESS_STATUSES.includes(c.status)),
    [contracts]
  );

  const completed = useMemo(
    () => contracts.filter(c => !c.isArchived && COMPLETED_STATUSES.includes(c.status)),
    [contracts]
  );

  const archived = useMemo(
    () => contracts.filter(c => c.isArchived === true),
    [contracts]
  );

  // Optimistic archive mutation - uses document ID for API calls
  const archiveMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      console.log(`📁 [ARCHIVE] Archiving contract with document ID: ${documentId}`);
      
      let authHeaders: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          authHeaders['Authorization'] = `Bearer ${token}`;
        } catch (err) {
          console.warn('⚠️ Could not get Firebase token:', err);
        }
      }
      
      const response = await fetch(`/api/contracts/${documentId}/archive`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [ARCHIVE] Failed to archive: ${errorText}`);
        throw new Error(`Failed to archive contract: ${errorText}`);
      }
      
      console.log(`✅ [ARCHIVE] Successfully archived contract ${documentId}`);
      return response.json();
    },
    onMutate: async ({ documentId, reason }) => {
      console.log(`📁 [ARCHIVE] Optimistically updating cache for: ${documentId}`);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['contracts', userId] });

      // Snapshot previous value
      const previousContracts = queryClient.getQueryData<NormalizedContract[]>(['contracts', userId]);

      // Optimistically update cache - match by both id and contractId
      queryClient.setQueryData<NormalizedContract[]>(['contracts', userId], (old = []) => {
        return old.map(contract => 
          (contract.id === documentId || contract.contractId === documentId)
            ? { ...contract, isArchived: true, archivedAt: new Date(), archivedReason: reason }
            : contract
        );
      });

      return { previousContracts };
    },
    onError: (err, _variables, context) => {
      console.error('❌ [ARCHIVE] Error, rolling back:', err);
      // Rollback on error
      if (context?.previousContracts) {
        queryClient.setQueryData(['contracts', userId], context.previousContracts);
      }
    },
    onSettled: () => {
      console.log('📁 [ARCHIVE] Refetching contracts after archive operation');
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
    }
  });

  // Optimistic unarchive mutation - uses document ID for API calls
  const unarchiveMutation = useMutation({
    mutationFn: async (documentId: string) => {
      console.log(`📂 [UNARCHIVE] Restoring contract with document ID: ${documentId}`);
      
      let authHeaders: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          authHeaders['Authorization'] = `Bearer ${token}`;
        } catch (err) {
          console.warn('⚠️ Could not get Firebase token:', err);
        }
      }
      
      const response = await fetch(`/api/contracts/${documentId}/unarchive`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [UNARCHIVE] Failed to restore: ${errorText}`);
        throw new Error(`Failed to unarchive contract: ${errorText}`);
      }
      
      console.log(`✅ [UNARCHIVE] Successfully restored contract ${documentId}`);
      return response.json();
    },
    onMutate: async (documentId) => {
      console.log(`📂 [UNARCHIVE] Optimistically updating cache for: ${documentId}`);
      
      await queryClient.cancelQueries({ queryKey: ['contracts', userId] });

      const previousContracts = queryClient.getQueryData<NormalizedContract[]>(['contracts', userId]);

      // Match by both id and contractId
      queryClient.setQueryData<NormalizedContract[]>(['contracts', userId], (old = []) => {
        return old.map(contract => 
          (contract.id === documentId || contract.contractId === documentId)
            ? { ...contract, isArchived: false, archivedAt: undefined, archivedReason: undefined }
            : contract
        );
      });

      return { previousContracts };
    },
    onError: (err, _variables, context) => {
      console.error('❌ [UNARCHIVE] Error, rolling back:', err);
      if (context?.previousContracts) {
        queryClient.setQueryData(['contracts', userId], context.previousContracts);
      }
    },
    onSettled: () => {
      console.log('📂 [UNARCHIVE] Refetching contracts after restore operation');
      queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
    }
  });

  return {
    drafts,
    inProgress,
    completed,
    archived,
    isLoading,
    error: error as Error | null,
    archiveContract: async (documentId: string, reason: string) => {
      // documentId should be the Firestore document ID (contract.id), not contractId
      console.log(`📁 [STORE] archiveContract called with ID: ${documentId}`);
      await archiveMutation.mutateAsync({ documentId, reason });
    },
    unarchiveContract: async (documentId: string) => {
      // documentId should be the Firestore document ID (contract.id), not contractId
      console.log(`📂 [STORE] unarchiveContract called with ID: ${documentId}`);
      await unarchiveMutation.mutateAsync(documentId);
    },
    refetch: async () => {
      await refetch();
    }
  };
}
