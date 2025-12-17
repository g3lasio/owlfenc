import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { contractHistoryService, ContractHistoryEntry, SignatureRequirement } from '@/services/contractHistoryService';
import { auth } from '@/lib/firebase';
import { useMemo } from 'react';

interface NormalizedContract extends ContractHistoryEntry {
  source: 'contractHistory' | 'dualSignature';
  isArchived?: boolean;
  archivedAt?: Date;
  archivedReason?: string;
  // Template-aware fields
  templateId?: string;
  requiredSigners?: SignatureRequirement;
  // Compatibility fields for legacy UI
  totalAmount?: number;
  completionDate?: Date | string | null;
}

// Template display names for UI chips
// ✅ FIXED: Added 'unknown' for contracts without defined type
const TEMPLATE_DISPLAY_NAMES: Record<string, string> = {
  'unknown': 'Contract',
  'independent-contractor': 'Independent Contractor',
  'change-order': 'Change Order',
  'contract-addendum': 'Addendum',
  'work-order': 'Work Order',
  'lien-waiver': 'Lien Waiver',
  'lien-waiver-partial': 'Lien Waiver – Partial',
  'lien-waiver-final': 'Lien Waiver – Final',
  'certificate-completion': 'Completion Cert',
  'warranty-agreement': 'Warranty',
};

// Template badge configuration for consistent styling across UI
export interface TemplateBadgeConfig {
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
}

export const TEMPLATE_BADGE_CONFIGS: Record<string, TemplateBadgeConfig> = {
  'unknown': {
    label: 'Contract',
    shortLabel: 'DOC',
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    icon: 'File',
  },
  'independent-contractor': {
    label: 'Independent Contractor',
    shortLabel: 'ICA',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    icon: 'FileText',
  },
  'change-order': {
    label: 'Change Order',
    shortLabel: 'CO',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: 'FileEdit',
  },
  'contract-addendum': {
    label: 'Addendum',
    shortLabel: 'ADD',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: 'FilePlus',
  },
  'work-order': {
    label: 'Work Order',
    shortLabel: 'WO',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: 'Clipboard',
  },
  'lien-waiver': {
    label: 'Lien Waiver',
    shortLabel: 'LW',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: 'FileCheck',
  },
  'lien-waiver-partial': {
    label: 'Lien Waiver – Partial',
    shortLabel: 'LW-P',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: 'FileCheck',
  },
  'lien-waiver-final': {
    label: 'Lien Waiver – Final',
    shortLabel: 'LW-F',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: 'FileCheck2',
  },
  'certificate-completion': {
    label: 'Completion Cert',
    shortLabel: 'CC',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: 'Award',
  },
  'warranty-agreement': {
    label: 'Warranty',
    shortLabel: 'WAR',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: 'Shield',
  },
};

// Helper to get display name for template
// ✅ FIXED: No longer assumes "Independent Contractor" for unknown templates
export function getTemplateDisplayName(templateId?: string): string {
  if (!templateId) return 'Contract'; // Generic fallback for unknown types
  return TEMPLATE_DISPLAY_NAMES[templateId] || 'Contract';
}

// Helper to get detailed template ID including lien waiver type
// ✅ FIXED: Returns 'unknown' for missing templateId instead of assuming ICA
export function getDetailedTemplateId(templateId?: string, contractData?: any): string {
  // No templateId = unknown type, don't guess
  if (!templateId) return 'unknown';
  
  // Verify it's a known template before returning it
  const knownTemplates = [
    'independent-contractor',
    'change-order', 
    'contract-addendum',
    'work-order',
    'lien-waiver',
    'certificate-completion',
    'warranty-agreement'
  ];
  
  // Check if this is a lien waiver and extract the type
  if (templateId === 'lien-waiver') {
    const waiverType = contractData?.lienWaiver?.waiverType || 
                       contractData?.formFields?.waiverType ||
                       contractData?.waiverType;
    if (waiverType === 'partial') return 'lien-waiver-partial';
    if (waiverType === 'final') return 'lien-waiver-final';
    return 'lien-waiver'; // Generic lien waiver if type not specified
  }
  
  // Only return templateId if it's a known type
  if (knownTemplates.includes(templateId)) {
    return templateId;
  }
  
  // Unknown template type - return 'unknown' to avoid mislabeling
  return 'unknown';
}

// Helper to get template badge config (with lien waiver type detection)
// ✅ FIXED: Falls back to 'unknown' badge instead of assuming ICA
export function getTemplateBadgeConfig(templateId?: string, contractData?: any): TemplateBadgeConfig {
  const detailedId = getDetailedTemplateId(templateId, contractData);
  return TEMPLATE_BADGE_CONFIGS[detailedId] || TEMPLATE_BADGE_CONFIGS['unknown'];
}

// Signature requirement mapping from templateId
const TEMPLATE_SIGNATURE_MAP: Record<string, SignatureRequirement> = {
  'independent-contractor': 'dual',
  'change-order': 'dual',
  'contract-addendum': 'dual',
  'work-order': 'dual',
  'lien-waiver': 'single',
  'certificate-completion': 'single',
  'warranty-agreement': 'dual',
};

// Helper to infer requiredSigners from templateId (for legacy documents)
// ✅ FIX: Check explicit requiredSigners first, then templateId, then fallback
export function inferRequiredSigners(templateId?: string, explicitRequiredSigners?: SignatureRequirement): SignatureRequirement {
  // First priority: explicit requiredSigners field
  if (explicitRequiredSigners && ['none', 'single', 'dual'].includes(explicitRequiredSigners)) {
    return explicitRequiredSigners;
  }
  // Second priority: infer from templateId
  if (templateId && TEMPLATE_SIGNATURE_MAP[templateId]) {
    return TEMPLATE_SIGNATURE_MAP[templateId];
  }
  // Default fallback for legacy contracts (pre-multi-template era)
  return 'dual';
}

// ✅ Helper to get effective required signers from a contract (handles all edge cases)
function getEffectiveRequiredSigners(contract: NormalizedContract): SignatureRequirement {
  return inferRequiredSigners(contract.templateId, contract.requiredSigners);
}

// Template-aware completion check
export function isContractCompleted(contract: NormalizedContract): boolean {
  const status = contract.status;
  const requiredSigners = getEffectiveRequiredSigners(contract);
  
  // If status is explicitly 'completed' or 'both_signed', it's completed
  if (status === 'completed' || status === 'both_signed') {
    return true;
  }
  
  // For single-signer templates, 'contractor_signed' or 'client_signed' means completed
  if (requiredSigners === 'single') {
    return status === 'contractor_signed' || status === 'client_signed';
  }
  
  // For 'none' signature requirement, check if PDF/doc was generated (has pdfUrl or permanentUrl)
  if (requiredSigners === 'none') {
    return !!(contract.pdfUrl || contract.permanentUrl);
  }
  
  return false;
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
// Note: IN_PROGRESS_STATUSES is now template-aware - single-signer templates may complete earlier
const IN_PROGRESS_STATUSES = ['in_progress', 'contractor_signed', 'client_signed', 'processing', 'error'];
const COMPLETED_STATUSES = ['completed', 'both_signed'];

// Template-aware helper: Check if contract is in "Progress" bucket
// Progress = step 3+ reached (PDF generated OR signature links created) but not yet completed
function isInProgressBucket(contract: NormalizedContract): boolean {
  const status = contract.status;
  
  // If already completed by template-aware logic, not in progress
  if (isContractCompleted(contract)) {
    return false;
  }
  
  // Never consider archived contracts as in progress
  if (contract.isArchived) {
    return false;
  }
  
  // Check if document generation or signature step was reached
  const hasPdf = !!(contract.pdfUrl || contract.permanentUrl);
  const hasSignatureLinks = !!(contract.contractorSignUrl || contract.clientSignUrl || contract.shareableLink);
  
  // ✅ Must have at least PDF or signature links to be in "Progress"
  // Documents without either belong in "Drafts"
  if (!hasPdf && !hasSignatureLinks) {
    return false;
  }
  
  // If it has PDF or signature links and is not completed, it's in progress
  // This covers: processing (with PDF), error (with PDF), contractor_signed, client_signed, etc.
  return true;
}

// ✅ UNIVERSAL: Check if contract is in "Drafts" bucket
// A draft is any document that:
// - Has NOT generated a PDF
// - Has NOT entered the signature step (no signature links)
// This applies to ALL templates, regardless of status
function isDraftBucket(contract: NormalizedContract): boolean {
  const status = contract.status;
  
  // Never consider completed contracts as drafts
  if (isContractCompleted(contract)) {
    return false;
  }
  
  // Never consider archived contracts as drafts (they have their own bucket)
  if (contract.isArchived) {
    return false;
  }
  
  // Check if document has been generated (PDF created)
  const hasPdf = !!(contract.pdfUrl || contract.permanentUrl);
  
  // Check if signature step was reached (links created)
  const hasSignatureLinks = !!(contract.contractorSignUrl || contract.clientSignUrl || contract.shareableLink);
  
  // ✅ UNIVERSAL RULE: No PDF AND no signature links = draft
  // This applies regardless of status (draft, in_progress, processing, etc.)
  if (!hasPdf && !hasSignatureLinks) {
    return true;
  }
  
  // Explicit draft status is always a draft (even if it somehow has links)
  if (DRAFT_STATUSES.includes(status)) {
    return true;
  }
  
  return false;
}

export function useContractsStore(): ContractsStore {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.currentUser?.uid;

  // Unified query for all contracts
  // ✅ FIX: Removed duplicate loading - contractHistoryService.getContractHistory() already combines both collections
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

      // ✅ SIMPLIFIED: Load from TWO sources only (contractHistoryService already combines contractHistory + dualSignatureContracts)
      const [historyResponse, archivedResponse] = await Promise.allSettled([
        contractHistoryService.getContractHistory(userId),
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

      // ✅ IMPROVED DEDUPLICATION: Use Sets to track both document ID and contractId
      const seenDocumentIds = new Set<string>();
      const seenContractIds = new Set<string>();
      const normalized: NormalizedContract[] = [];
      
      // Helper to add contract with deduplication
      const addContract = (contract: NormalizedContract) => {
        const docId = contract.id || '';
        const contractId = contract.contractId || '';
        
        // Skip if we've already seen this document ID or contractId
        if ((docId && seenDocumentIds.has(docId)) || (contractId && seenContractIds.has(contractId))) {
          console.log(`🔄 [DEDUP] Skipping duplicate: docId=${docId}, contractId=${contractId}`);
          return false;
        }
        
        // Track this contract
        if (docId) seenDocumentIds.add(docId);
        if (contractId) seenContractIds.add(contractId);
        normalized.push(contract);
        return true;
      };
      
      // Add contracts from contractHistoryService (already merged and deduplicated by service)
      if (historyResponse.status === 'fulfilled') {
        historyResponse.value.forEach((contract: ContractHistoryEntry) => {
          addContract({
            ...contract,
            source: 'contractHistory',
            isArchived: (contract as any).isArchived || false,
            archivedAt: (contract as any).archivedAt,
            archivedReason: (contract as any).archivedReason,
            totalAmount: contract.contractData?.financials?.total || contract.contractData?.financials?.displayTotal || 0,
            completionDate: (contract.contractData?.formFields as any)?.completionDate || null
          });
        });
        console.log(`✅ [CONTRACTS-STORE] Loaded ${historyResponse.value.length} contracts from history service`);
      }

      // Add archived contracts (avoid duplicates)
      if (archivedResponse.status === 'fulfilled') {
        const archivedContracts = Array.isArray(archivedResponse.value) ? archivedResponse.value : [];
        let addedCount = 0;
        archivedContracts.forEach((contract: any) => {
          const added = addContract({
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
          if (added) addedCount++;
        });
        console.log(`✅ [CONTRACTS-STORE] Loaded ${addedCount} archived contracts (${archivedContracts.length - addedCount} duplicates skipped)`);
      }

      console.log(`📊 [CONTRACTS-STORE] Total unique contracts: ${normalized.length}`);
      return normalized;
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // ✅ Helper to safely normalize any date-like value to milliseconds
  // Handles Date, string, number, Firestore Timestamp, null/undefined
  const normalizeToMillis = (val: any): number | null => {
    if (val == null) return null;
    if (typeof val === 'number') return val;
    if (val instanceof Date) return val.getTime();
    if (typeof val.toDate === 'function') {
      // Firestore Timestamp
      try { return val.toDate().getTime(); } catch { return null; }
    }
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Get the best timestamp for ordering (prefer updatedAt, fallback to createdAt)
  const getContractTimestamp = (contract: NormalizedContract): number => {
    return normalizeToMillis(contract.updatedAt) ?? normalizeToMillis(contract.createdAt) ?? 0;
  };

  // Memoized selectors for each tab
  // ✅ TEMPLATE-AWARE: Drafts are contracts stopped at step 2 (no PDF/doc generated)
  // ✅ CRITICAL FIX: Apply additional deduplication by composite key (clientName + projectType)
  // This handles legacy duplicates created by autosave race conditions
  // ✅ Also exclude drafts that have a completed/in-progress version (same client + project)
  const drafts = useMemo(() => {
    // ✅ Template-aware: Use isDraftBucket instead of simple status check
    const rawDrafts = contracts.filter(c => !c.isArchived && isDraftBucket(c));
    
    // Build set of composite keys for VISIBLE completed and in-progress contracts
    // ✅ Template-aware: Use isContractCompleted and isInProgressBucket
    const completedOrInProgressKeys = new Set<string>();
    contracts.forEach(c => {
      // Must be non-archived and in completed/in-progress bucket (template-aware)
      if (!c.isArchived && (isContractCompleted(c) || isInProgressBucket(c))) {
        const normalizedClientName = (c.clientName || '').trim().toLowerCase();
        const normalizedProjectType = (c.projectType || '').trim().toLowerCase();
        
        // Only create composite key if both fields are meaningful (non-empty)
        // This prevents false collisions like `userId||` matching multiple unrelated drafts
        if (normalizedClientName && normalizedProjectType) {
          const compositeKey = `${c.userId}|${normalizedClientName}|${normalizedProjectType}`;
          completedOrInProgressKeys.add(compositeKey);
        }
      }
    });
    
    // Filter out drafts that have a completed/in-progress equivalent
    const filteredDrafts = rawDrafts.filter(draft => {
      const normalizedClientName = (draft.clientName || '').trim().toLowerCase();
      const normalizedProjectType = (draft.projectType || '').trim().toLowerCase();
      
      // Only check for hiding if both fields are meaningful (non-empty)
      // Drafts with empty clientName or projectType are always kept
      if (normalizedClientName && normalizedProjectType) {
        const compositeKey = `${draft.userId}|${normalizedClientName}|${normalizedProjectType}`;
        
        if (completedOrInProgressKeys.has(compositeKey)) {
          console.log(`🔄 [DRAFTS-CLEANUP] Hiding draft "${draft.clientName}" - already has completed/in-progress version`);
          return false;
        }
      }
      return true;
    });
    
    // Collapse remaining duplicates by normalized composite key, keeping the most recently updated
    const draftsByCompositeKey = new Map<string, NormalizedContract>();
    
    for (const draft of filteredDrafts) {
      const normalizedClientName = (draft.clientName || '').trim().toLowerCase();
      const normalizedProjectType = (draft.projectType || '').trim().toLowerCase();
      const compositeKey = `${draft.userId}|${normalizedClientName}|${normalizedProjectType}`;
      
      const existing = draftsByCompositeKey.get(compositeKey);
      if (!existing) {
        draftsByCompositeKey.set(compositeKey, draft);
      } else {
        // Keep the one with the most recent timestamp (safe comparison)
        const existingTime = getContractTimestamp(existing);
        const draftTime = getContractTimestamp(draft);
        if (draftTime > existingTime) {
          console.log(`🔄 [DRAFTS-DEDUP] Replacing older draft (id=${existing.id}) with newer (id=${draft.id}) for "${draft.clientName}"`);
          draftsByCompositeKey.set(compositeKey, draft);
        } else {
          console.log(`🔄 [DRAFTS-DEDUP] Skipping older duplicate (id=${draft.id}) for "${draft.clientName}"`);
        }
      }
    }
    
    // Convert to array and sort by timestamp descending (most recent first)
    const uniqueDrafts = Array.from(draftsByCompositeKey.values())
      .sort((a, b) => getContractTimestamp(b) - getContractTimestamp(a));
    
    const hiddenByCompletion = rawDrafts.length - filteredDrafts.length;
    const hiddenByDedup = filteredDrafts.length - uniqueDrafts.length;
    
    if (hiddenByCompletion > 0 || hiddenByDedup > 0) {
      console.log(`✅ [DRAFTS-CLEANUP] Result: ${uniqueDrafts.length} drafts (${hiddenByCompletion} hidden by completion, ${hiddenByDedup} deduplicated)`);
    }
    
    return uniqueDrafts;
  }, [contracts]);

  // ✅ Template-aware "In Progress" bucket
  // Progress: step 3 reached + signature links/tokens created, but not yet completed per template requirements
  const inProgress = useMemo(
    () => contracts.filter(c => !c.isArchived && isInProgressBucket(c)),
    [contracts]
  );

  // ✅ Template-aware "Completed" bucket  
  // Completed: all required signers completed based on template requirements (dual vs single)
  const completed = useMemo(
    () => contracts.filter(c => !c.isArchived && isContractCompleted(c)),
    [contracts]
  );

  // Archived: soft-delete bucket (archivedAt), never removed
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
