import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/ui/address-autocomplete";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/contexts/PermissionContext";
import { useContractsStore } from "@/hooks/useContractsStore";
import {
  Database,
  Eye,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Shield,
  AlertCircle,
  DollarSign,
  Calendar,
  Wrench,
  FileCheck,
  Loader2,
  Brain,
  RefreshCw,
  History,
  Clock,
  UserCheck,
  Search,
  Filter,
  PenTool,
  Download,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Lock,
  Truck,
  Share2,
  ExternalLink,
  Copy,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Archive,
  ArchiveRestore,
  Calculator,
  Boxes,
  Building,
  MessageSquare,
  Home,
  Zap,
  Droplets,
  Wind,
  Square,
  Frame,
  LayoutGrid,
  Paintbrush,
  TreePine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  contractHistoryService,
  ContractHistoryEntry,
} from "@/services/contractHistoryService";
import { getClients as getFirebaseClients } from "@/services/clientService";
import DynamicTemplateConfigurator from "@/components/templates/DynamicTemplateConfigurator";
import { templateConfigRegistry } from "@/lib/templateConfigRegistry";

// Interface for completed contracts
interface CompletedContract {
  contractId: string;
  clientName: string;
  totalAmount: number;
  isCompleted: boolean;
  isDownloadable: boolean;
  contractorSigned: boolean;
  clientSigned: boolean;
  contractorSignedAt?: Date;
  clientSignedAt?: Date;
  createdAt: Date;
  signedPdfPath?: string;
}

// 🔧 DEFINITIVE CURRENCY NORMALIZATION
// ONLY converts values that are CLEARLY in cents (integer >= 10000 with no decimals)
// Values already in dollars (with decimals or < 10000) pass through unchanged
function normalizeCurrency(value: number | undefined | null): number {
  if (value == null || value === 0) return 0;
  
  // ✅ PRODUCTION FIX: All contract amounts are stored in dollars, not cents
  // The previous logic incorrectly assumed integers >= 10000 were in cents
  // This caused $45,000 to be divided by 100 → $450
  // 
  // Real-world data shows:
  // - Amounts are stored as: 45000 (dollars), NOT 4500000 (cents)
  // - Both integers (45000) and decimals (45000.00) represent dollars
  // - No legacy cent-based values exist in the system
  //
  // Therefore, we trust all stored values as dollars and return them as-is
  return value;
}

// Simple 4-step contract generator with document type routing
// Step 0: Document Type Selector (router)
// Step 1: Select source (project for Independent Contractor, contract for Change Order)
// Step 2: Configure & Customize
// Step 3: Generate & Complete
export default function SimpleContractGenerator() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Document Flow Type: determines which flow to use
  // 'independent-contractor' = legacy flow (project → configure → generate)
  // 'change-order' = new flow (contract → DynamicTemplateConfigurator → generate)
  const [documentFlowType, setDocumentFlowType] = useState<'independent-contractor' | 'change-order' | 'lien-waiver'>('independent-contractor');
  
  // Selected existing contract for Change Order flow
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);

  // History management state
  const [currentView, setCurrentView] = useState<"contracts" | "history">(
    "contracts",
  );
  const [historyTab, setHistoryTab] = useState<
    "drafts" | "in-progress" | "completed" | "archived"
  >("drafts");
  const [contractHistory, setContractHistory] = useState<
    ContractHistoryEntry[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "draft" | "completed" | "processing"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllProjects, setShowAllProjects] = useState(false);
  
  // Step 0: Document selector state
  const [docCategory, setDocCategory] = useState('contracts');
  const [docSearch, setDocSearch] = useState('');

  // ✅ MIGRATION: Using unified contractsStore for ALL contract tabs (Nov 2025)
  // REMOVED legacy state: draftContracts,  inProgressContracts, archivedContracts
  // NOW using: contractsStore.{drafts, inProgress, completed, archived}

  // Auto-save state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [currentContractId, setCurrentContractId] = useState<string | null>(
    null,
  );
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Editable fields state
  const [editableData, setEditableData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    startDate: "",
    completionDate: "",
    permitRequired: "",
    permitResponsibility: "contractor",
    warrantyYears: "1",
    projectTotal: 0, // Editable project total
    paymentMilestones: [
      { id: 1, description: "Initial deposit", percentage: 50, amount: 0 },
      { id: 2, description: "Project completion", percentage: 50, amount: 0 },
    ],
  });

  // Legal Compliance Workflow State
  const [isContractReady, setIsContractReady] = useState(false);
  const [contractHTML, setContractHTML] = useState<string>("");

  // Dual Signature State
  const [isDualSignatureActive, setIsDualSignatureActive] = useState(false);
  const [dualSignatureStatus, setDualSignatureStatus] = useState<string>("");
  const [contractorSignUrl, setContractorSignUrl] = useState<string>("");
  const [clientSignUrl, setClientSignUrl] = useState<string>("");

  // Multi-Channel Delivery State
  const [deliveryMethods, setDeliveryMethods] = useState({
    email: true,
    sms: true,
    whatsapp: false,
  });
  const [isMultiChannelActive, setIsMultiChannelActive] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string>("");

  const [suggestedClauses, setSuggestedClauses] = useState<any[]>([]);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);

  // Custom clause states
  const [customClauseText, setCustomClauseText] = useState<string>("");
  const [enhancedClauseText, setEnhancedClauseText] = useState<string>("");
  const [isEnhancingClause, setIsEnhancingClause] = useState(false);

  // Create from scratch states
  const [contractCreationMode, setContractCreationMode] = useState<"existing" | "scratch">("existing");
  const [scratchContractData, setScratchContractData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    projectDescription: "",
    projectCost: "",
    projectType: "General Construction",
  });
  const [clientSelectionMode, setClientSelectionMode] = useState<"existing" | "new">("new");
  const [existingClients, setExistingClients] = useState<any[]>([]);
  const [selectedExistingClient, setSelectedExistingClient] = useState<any>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState<string>("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // AI Enhancement states
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // Document Type Selector states (Multi-Template System)
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>(""); // dynamically set from first active template
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: string;
    subcategory?: string;
    status: string;
    signatureType: string;
    icon?: string;
  }>>([]);
  const [isDocumentTypeSelectorEnabled, setIsDocumentTypeSelectorEnabled] = useState(false);
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(false);

  // Manual total entry modal state (for corrupted legacy drafts)
  const [isManualTotalModalOpen, setIsManualTotalModalOpen] = useState(false);
  const [manualTotalInput, setManualTotalInput] = useState("");
  const [pendingContractData, setPendingContractData] = useState<{
    contract: any;
    contractDataFromHistory: any;
    projectFromHistory: any;
    paymentMilestones: any[];
  } | null>(null);

  const { currentUser } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { 
    userPlan,
    userUsage,
    incrementUsage, 
    canUse,
    hasAccess,
    isTrialUser,
    trialDaysRemaining
  } = usePermissions();
  
  // ✅ OPTIMISTIC UPDATES: Instant archive/unarchive with React Query
  const contractsStore = useContractsStore();

  // Get current plan information for UI restrictions
  const currentPlan = userPlan;
  const isFreePlan = currentPlan?.id === 8 || !currentPlan;
  const isPrimoChambeador = currentPlan?.id === 5;
  const isMeroPatron = currentPlan?.id === 9;
  const isMasterContractor = currentPlan?.id === 6;
  const isTrialMaster = currentPlan?.id === 4;
  
  // 🔧 SECURITY FIX: Use limits directly from userPlan (synced with backend)
  const contractLimit = currentPlan?.limits?.contracts ?? 0; // -1 = unlimited, 0 = no access
  const contractsUsed = userUsage?.contracts || 0;
  const hasReachedContractLimit = contractLimit !== -1 && contractLimit !== null && contractsUsed >= contractLimit;
  
  // Check if signature protocol is available (Master Contractor and Trial Master)
  const isSignatureProtocolAvailable = () => isMasterContractor || isTrialMaster || isTrialUser;
  
  // Check contract access function
  const checkContractAccess = () => {
    if (isPrimoChambeador) {
      return {
        allowed: false,
        reason: "Upgrade to Mero Patrón to unlock contract generation"
      };
    }
    // Trial Master and paid plans have full access
    return { allowed: true };
  };

  // Fetch AI-suggested legal clauses
  const fetchAISuggestedClauses = useCallback(async () => {
    if (!selectedProject) return;

    setIsLoadingClauses(true);
    try {
      const response = await fetch("/api/legal-defense/suggest-clauses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectType: selectedProject.projectType || "construction",
          projectValue:
            selectedProject.total ||
            selectedProject.totalAmount ||
            selectedProject.totalPrice ||
            selectedProject.displaySubtotal ||
            0,
          location:
            selectedProject.clientAddress || editableData.clientAddress || "",
          projectDescription: selectedProject.projectDescription || "",
        }),
      });

      if (!response.ok) throw new Error("Failed to load clause suggestions");

      const data = await response.json();
      setSuggestedClauses(data.clauses || []);
      setSelectedClauses(
        data.clauses?.filter((c: any) => c.mandatory).map((c: any) => c.id) ||
          [],
      );
    } catch (error) {
      console.error("Error loading clause suggestions:", error);
      // Use default clauses if AI fails
      const defaultClauses = [
        {
          id: "liability",
          title: "Limitation of Liability",
          description: "Limits contractor liability to contract value",
          mandatory: true,
          risk: "high",
        },
        {
          id: "indemnity",
          title: "Indemnification",
          description: "Client indemnifies contractor from third-party claims",
          mandatory: true,
          risk: "high",
        },
        {
          id: "warranty",
          title: "Warranty Terms",
          description: "Limited warranty on workmanship and materials",
          mandatory: false,
          risk: "medium",
        },
        {
          id: "payment",
          title: "Payment Terms",
          description: "Late payment penalties and collection rights",
          mandatory: true,
          risk: "medium",
        },
        {
          id: "scope",
          title: "Scope Changes",
          description: "Additional work requires written change orders",
          mandatory: false,
          risk: "low",
        },
        {
          id: "force-majeure",
          title: "Force Majeure",
          description: "Protection from unforeseeable circumstances",
          mandatory: false,
          risk: "medium",
        },
      ];

      setSuggestedClauses(defaultClauses);
      setSelectedClauses(
        defaultClauses.filter((c) => c.mandatory).map((c) => c.id),
      );
    } finally {
      setIsLoadingClauses(false);
    }
  }, [selectedProject, editableData.clientAddress]);

  // Load contract history
  const loadContractHistory = useCallback(async () => {
    // ✅ CRITICAL: Use currentUser.uid for authenticated API calls
    const effectiveUid = currentUser?.uid;
    
    // ✅ FIXED: Resilient auth check
    if (!effectiveUid) return;

    setIsLoadingHistory(true);
    try {
      console.log("📋 Loading contract history for user:", effectiveUid);
      const history = await contractHistoryService.getContractHistory(
        effectiveUid!,
      );
      setContractHistory(history);
      console.log("✅ Contract history loaded:", history.length, "contracts");
    } catch (error) {
      console.error("❌ Error loading contract history:", error);
      toast({
        title: "Error",
        description: "Failed to load contract history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentUser?.uid, toast]);

  // ✅ MIGRATION COMPLETE: All contract loading now uses contractsStore
  // Legacy functions removed: contractsStore.refetch, contractsStore.refetch, contractsStore.refetch, contractsStore.refetch
  // Data now comes from: contractsStore.{drafts, inProgress, completed, archived}

  // 📁 Archive a contract
  // ✅ OPTIMISTIC ARCHIVE: Instant UI update with rollback on error
  // ✅ NO TOAST: UI already shows change via optimistic update
  const archiveContract = useCallback(async (contractId: string, reason: string = 'user_action') => {
    if (!currentUser?.uid) return;

    try {
      await contractsStore.archiveContract(contractId, reason);
    } catch (error) {
      console.error("❌ Error archiving contract:", error);
      toast({
        title: "Error",
        description: "Failed to archive contract",
        variant: "destructive",
      });
    }
  }, [contractsStore, currentUser, toast]);

  // ✅ OPTIMISTIC UNARCHIVE: Instant UI update with rollback on error
  // ✅ NO TOAST: UI already shows change via optimistic update
  const unarchiveContract = useCallback(async (contractId: string) => {
    if (!currentUser?.uid) return;

    try {
      await contractsStore.unarchiveContract(contractId);
    } catch (error) {
      console.error("❌ Error restoring contract:", error);
      toast({
        title: "Error",
        description: "Failed to restore contract",
        variant: "destructive",
      });
    }
  }, [contractsStore, currentUser, toast]);

  // Load projects from Firebase - UNIFIED: Only load from 'estimates' collection
  const loadProjectsFromFirebase = useCallback(async () => {
    const effectiveUid = currentUser?.uid;
    
    if (!effectiveUid) {
      console.log("⏳ Waiting for Firebase Auth to initialize before loading estimates...");
      return;
    }

    try {
      setIsLoading(true);
      console.log("🔥 Loading estimates from Firebase for Legal Defense...");

      const estimatesQuery = query(
        collection(db, "estimates"),
        where("firebaseUserId", "==", effectiveUid),
      );

      const estimatesSnapshot = await getDocs(estimatesQuery);
      console.log(`📊 [LEGAL-DEFENSE] Found ${estimatesSnapshot.size} estimates`);
      
      const allEstimates = estimatesSnapshot.docs.map((doc) => {
        const data = doc.data();

        const clientName =
          data.clientInformation?.name ||
          data.clientName ||
          data.client?.name ||
          "Cliente sin nombre";

        const clientEmail =
          data.clientInformation?.email ||
          data.clientEmail ||
          data.client?.email ||
          "";

        let rawClientPhone =
          data.clientInformation?.phone ||
          data.clientPhone ||
          data.client?.phone ||
          "";

        let rawAddress =
          data.clientInformation?.address ||
          data.clientInformation?.fullAddress ||
          data.clientAddress ||
          data.client?.address ||
          data.address ||
          "";

        // 🔧 FIX: Detect and correct when phone field contains address data
        // Address indicators: street suffixes, numbers with letters, no phone-like patterns
        const addressIndicators = /\b(Ave|Avenue|St|Street|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Ct|Court|Way|Pl|Place|Cir|Circle)\b/i;
        const phonePattern = /^[\d\s\-\(\)\+\.]+$/; // Only digits and phone separators
        
        // If phone looks like an address and address is empty or short, swap them
        if (rawClientPhone && addressIndicators.test(rawClientPhone) && !phonePattern.test(rawClientPhone)) {
          console.log(`⚠️ [DATA-FIX] Detected address in phone field: "${rawClientPhone}"`);
          
          // If current address is empty, short (like just a city), or the phone looks more like an address
          if (!rawAddress || rawAddress.length < rawClientPhone.length) {
            const correctedAddress = rawClientPhone;
            const correctedPhone = rawAddress && phonePattern.test(rawAddress) ? rawAddress : "";
            
            console.log(`✅ [DATA-FIX] Correcting: phone="${correctedPhone}", address="${correctedAddress}"`);
            rawClientPhone = correctedPhone;
            rawAddress = correctedAddress;
          } else {
            // Just clear the phone since it's clearly an address
            console.log(`✅ [DATA-FIX] Clearing invalid phone, keeping address: "${rawAddress}"`);
            rawClientPhone = "";
          }
        }

        const clientPhone = rawClientPhone;
        const address = rawAddress;

        let totalValue =
          data.projectTotalCosts?.totalSummary?.finalTotal ||
          data.projectTotalCosts?.total ||
          data.total ||
          data.estimateAmount ||
          0;

        if (totalValue > 10000 && Number.isInteger(totalValue)) {
          totalValue = totalValue / 100;
        }

        const projectTitle =
          data.projectDetails?.name ||
          data.projectName ||
          data.title ||
          `Estimado para ${clientName}`;

        return {
          id: doc.id,
          estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
          title: projectTitle,
          clientName: clientName,
          clientEmail: clientEmail,
          clientPhone: clientPhone,
          totalAmount: totalValue,
          totalPrice: totalValue,
          displaySubtotal: totalValue,
          status: data.status || "estimate",
          estimateDate: data.createdAt
            ? data.createdAt.toDate?.() || new Date(data.createdAt)
            : new Date(),
          items:
            data.projectTotalCosts?.materialCosts?.items ||
            data.items ||
            [],
          projectType:
            data.projectType || data.projectDetails?.type || "fence",
          address: address,
          projectDescription:
            data.projectDescription || data.description || projectTitle,
          originalData: data,
        };
      });

      const eligibleProjects = allEstimates.filter((project) => {
        const hasRequiredData =
          project.clientName &&
          project.totalAmount > 0 &&
          (project.address || project.projectType);
        return hasRequiredData;
      });

      eligibleProjects.sort((a, b) => {
        const dateA = a.estimateDate instanceof Date ? a.estimateDate : new Date(a.estimateDate || 0);
        const dateB = b.estimateDate instanceof Date ? b.estimateDate : new Date(b.estimateDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setProjects(eligibleProjects);
      console.log(`✅ [LEGAL-DEFENSE] ${eligibleProjects.length} estimates loaded for contract generation`);
    } catch (error) {
      console.error("Error loading estimates:", error);
      toast({
        title: "Error",
        description: "Failed to load estimates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  // Resend signature links
  const resendSignatureLinks = useCallback(
    async (contractId: string, methods: string[]) => {
      try {
        console.log(
          "📱 Resending signature links for contract:",
          contractId,
          "via:",
          methods,
        );

        const response = await fetch("/api/dual-signature/resend-links", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId,
            methods,
          }),
        });

        if (!response.ok) throw new Error("Failed to resend signature links");

        const data = await response.json();

        // Show success message and handle specific delivery methods
        toast({
          title: "Links Sent Successfully",
          description: `Contract signature links sent via ${methods.join(", ")}`,
        });

        // Handle specific delivery methods that need direct user action
        if (methods.includes("sms") || methods.includes("whatsapp")) {
          data.results.forEach((result: string) => {
            if (result.includes("SMS link generated:")) {
              const smsLink = result.replace("SMS link generated: ", "");
              window.open(smsLink, "_blank");
            }
            if (result.includes("WhatsApp link generated:")) {
              const whatsappLink = result.replace(
                "WhatsApp link generated: ",
                "",
              );
              window.open(whatsappLink, "_blank");
            }
          });
        }

        return data;
      } catch (error) {
        console.error("❌ Error resending signature links:", error);
        toast({
          title: "Error",
          description: "Failed to resend signature links",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // Download signed PDF - Uses pre-generated PDF from Firebase Storage
  const downloadSignedPdf = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        console.log("📥 [PDF-DOWNLOAD] Starting download for contract:", contractId);

        if (!currentUser) {
          toast({
            title: "Authentication Required",
            description: "Please log in to download contracts",
            variant: "destructive",
          });
          return;
        }

        // Show immediate feedback
        toast({
          title: "Downloading PDF",
          description: "Fetching your signed contract...",
          variant: "default",
        });

        // ✅ OPTIMIZED: Use the pre-generated PDF from Firebase Storage
        console.log("📄 [PDF-DOWNLOAD] Fetching pre-generated PDF...");
        const pdfResponse = await fetch(
          `/api/dual-signature/download/${contractId}`,
          {
            headers: {
              "x-user-id": currentUser.uid,
            },
          },
        );

        if (!pdfResponse.ok) {
          const errorData = await pdfResponse.json().catch(() => ({}));
          console.error("❌ [PDF-DOWNLOAD] Failed to fetch PDF:", errorData);
          throw new Error(
            errorData.message || "Failed to download signed contract. The contract may not be fully signed yet.",
          );
        }

        if (pdfResponse.ok) {
          console.log("✅ [PDF-DOWNLOAD] PDF downloaded successfully");
          const pdfBlob = await pdfResponse.blob();
          const fileName = `contract_${clientName.replace(/\s+/g, "_")}_signed.pdf`;

          // Detect iOS/iPadOS - programmatic downloads don't work on Safari mobile
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          
          if (isIOS) {
            // iOS/iPadOS: Open PDF in new tab where user can save/share from browser
            console.log("📱 [PDF-DOWNLOAD] iOS detected, opening PDF in new tab...");
            const url = window.URL.createObjectURL(pdfBlob);
            const newWindow = window.open(url, '_blank');
            
            if (newWindow) {
              toast({
                title: "PDF Opened",
                description: "Tap the share button (↑) to save or share the PDF",
                variant: "default",
              });
            } else {
              // Fallback: Try the download method anyway
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              a.click();
            }
            
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
          } else {
            // Desktop: Use standard download method
            const url = window.URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }, 100);
          }

          console.log("✅ [PDF-DOWNLOAD] PDF downloaded successfully to device");
        } else {
          const errorData = await pdfResponse.json().catch(() => ({}));
          console.error("❌ [PDF-DOWNLOAD] PDF generation failed:", errorData);
          throw new Error(
            errorData.message || "Failed to generate PDF from signed contract. Please try again.",
          );
        }
      } catch (error: any) {
        console.error("❌ [PDF-DOWNLOAD] Download error:", error);
        toast({
          title: "PDF Download Error",
          description:
            error.message ||
            "Failed to download signed contract PDF. Please ensure both parties have signed the contract and try again.",
          variant: "destructive",
        });
      }
    },
    [toast, currentUser],
  );

  // View contract HTML in new window with embedded signatures
  const viewContractHtml = useCallback(
    async (contractId: string, clientName: string) => {
      // ✅ POPUP BLOCKER FIX: Open window BEFORE async fetch
      // This maintains the direct connection to user click event
      const newWindow = window.open(
        "",
        "_blank",
        "width=800,height=1000,scrollbars=yes,resizable=yes",
      );
      
      if (!newWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to view contracts",
          variant: "destructive",
        });
        return;
      }

      try {
        console.log("👀 Opening signed contract view for:", contractId);

        // Show loading message while fetching
        newWindow.document.write(`
          <html>
            <head><title>Loading Contract...</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h2>Loading signed contract...</h2>
              <p>Please wait...</p>
            </body>
          </html>
        `);

        // Prepare headers with authentication
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (currentUser?.uid) {
          headers['x-user-id'] = currentUser.uid;
        }

        const htmlResponse = await fetch(
          `/api/dual-signature/download-html/${contractId}`,
          {
            method: 'GET',
            headers
          }
        );

        if (!htmlResponse.ok) {
          const errorData = await htmlResponse.json();
          newWindow.close();
          throw new Error(errorData.message || "Failed to load contract");
        }

        const htmlContent = await htmlResponse.text();

        // Replace loading content with actual contract
        // ✅ NO TOAST: User sees the new window with contract content
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.document.title = `Signed Contract - ${clientName}`;
      } catch (error: any) {
        console.error("❌ Error viewing contract:", error);
        
        // ✅ CRITICAL FIX: Always close window on error to prevent orphaned loading windows
        if (newWindow && !newWindow.closed) {
          newWindow.close();
        }
        
        toast({
          title: "View Error",
          description:
            (error as Error).message || "Failed to view signed contract",
          variant: "destructive",
        });
      }
    },
    [toast, currentUser],
  );

  // Function to generate PDF for completed contract
  const generateContractPdf = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        toast({
          title: "Generating PDF",
          description: "Creating signed PDF document...",
          variant: "default",
        });

        const response = await fetch(
          `/api/dual-signature/regenerate-pdf/${contractId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            toast({
              title: "PDF Generated",
              description:
                "PDF generated successfully! Refreshing contract list...",
              variant: "default",
            });

            // Refresh the completed contracts list
            await contractsStore.refetch();
          } else {
            // Check if it's a Chrome dependency error
            const isChromeDependencyError =
              result.message?.includes("Chrome browser dependencies missing") ||
              result.message?.includes("libgbm.so.1") ||
              result.message?.includes("Failed to launch the browser");

            toast({
              title: isChromeDependencyError
                ? "PDF Generation Unavailable"
                : "Generation Error",
              description: isChromeDependencyError
                ? "PDF generation requires Chrome dependencies not available in Replit. Use View HTML or Share Contract instead."
                : result.message || "Failed to generate PDF",
              variant: "destructive",
            });
          }
        } else {
          const error = await response.json();
          const isChromeDependencyError =
            (error as Error).message?.includes(
              "Chrome browser dependencies missing",
            ) ||
            (error as Error).message?.includes("libgbm.so.1") ||
            (error as Error).message?.includes("Failed to launch the browser");

          toast({
            title: isChromeDependencyError
              ? "PDF Generation Unavailable"
              : "Generation Error",
            description: isChromeDependencyError
              ? "PDF generation requires Chrome dependencies not available in Replit. Use View HTML or Share Contract instead."
              : (error as Error).message || "Failed to generate PDF",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error generating PDF:", error);
        toast({
          title: "Generation Error",
          description: "Failed to connect to PDF generation service",
          variant: "destructive",
        });
      }
    },
    [toast, contractsStore.refetch],
  );

  // Copy contract link to clipboard
  // ✅ NO SUCCESS TOAST: User clicked copy, visual feedback via button state is sufficient
  const copyContractLink = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        const downloadUrl = `/api/dual-signature/download/${contractId}`;
        const fullUrl = `${window.location.origin}${downloadUrl}`;

        await navigator.clipboard.writeText(fullUrl);
        // Success - no toast needed, button state change is sufficient feedback
      } catch (error) {
        console.error("❌ Error copying link:", error);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // View contract in new window/tab - Uses pre-generated PDF from Firebase Storage
  const viewContract = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        console.log("👁️ Viewing signed contract PDF for:", contractId);

        // ✅ AUTH CHECK FIRST: Must be authenticated before any operations
        if (!currentUser) {
          toast({
            title: "Authentication Required",
            description: "Please log in to view contracts",
            variant: "destructive",
          });
          return;
        }

        // ✅ OPTIMIZED: Open the PDF directly via the download endpoint
        // This endpoint serves the pre-generated PDF from Firebase Storage
        const pdfUrl = `/api/dual-signature/download/${contractId}`;
        console.log("⚡ [VIEW] Opening PDF via optimized endpoint:", pdfUrl);
        
        // Open in new tab - the download endpoint serves inline PDF
        window.open(pdfUrl, '_blank');
        
        toast({
          title: "Opening Contract",
          description: `Opening signed contract PDF for ${clientName}`,
        });
      } catch (error: any) {
        console.error("❌ Error in viewContract:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to view contract",
          variant: "destructive",
        });
      }
    },
    [toast, currentUser],
  );

  // Share contract PDF file using native share API or download
  // ✅ OPTIMIZED: Uses pre-generated PDF from Firebase Storage
  const shareContract = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        console.log("🔗 Sharing contract PDF:", contractId);

        if (!currentUser) {
          toast({
            title: "Authentication Required",
            description: "Please log in to share contracts",
            variant: "destructive",
          });
          return;
        }

        const fileName = `${clientName.replace(/\s+/g, '_')}_Contract_Signed.pdf`;

        toast({
          title: "Preparing Share",
          description: "Loading signed contract...",
        });

        // ✅ OPTIMIZED: Use pre-generated PDF from Firebase Storage
        console.log("⚡ [SHARE] Fetching pre-generated PDF...");
        const pdfResponse = await fetch(
          `/api/dual-signature/download/${contractId}`,
          {
            headers: {
              "x-user-id": currentUser.uid,
            },
          },
        );

        if (!pdfResponse.ok) {
          const errorData = await pdfResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Failed to load signed contract",
          );
        }

        const pdfBlob = await pdfResponse.blob();

        // Try native Web Share API with file sharing
        if (navigator.share && navigator.canShare) {
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          
          // Check if file sharing is supported
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `Signed Contract - ${clientName}`,
                text: `Signed contract for ${clientName}`,
              });
              return;
            } catch (shareError: any) {
              if (shareError.name !== 'AbortError') {
                console.warn("Native share failed:", shareError);
              }
            }
          }
        }

        // Fallback: Download the PDF
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error: any) {
        console.error("❌ Error sharing contract:", error);
        toast({
          title: "Share Error",
          description: error.message || "Failed to share contract PDF",
          variant: "destructive",
        });
      }
    },
    [toast, currentUser],
  );

  // Download contract as HTML file
  const downloadContractHtml = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        console.log("📄 Downloading contract HTML:", contractId);

        if (!currentUser) {
          toast({
            title: "Authentication Required",
            description: "Please log in to download contracts",
            variant: "destructive",
          });
          return;
        }

        // Prepare headers with authentication
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (currentUser?.uid) {
          headers['x-user-id'] = currentUser.uid;
        }

        // Fetch the HTML content with authentication
        const response = await fetch(
          `/api/dual-signature/download-html/${contractId}`,
          {
            method: 'GET',
            headers
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to download contract");
        }

        // Get the HTML content
        const htmlContent = await response.text();

        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `contract_${clientName.replace(/\s+/g, "_")}_${contractId}.html`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download Started",
          description: `HTML contract for ${clientName} is downloading`,
        });
      } catch (error: any) {
        console.error("❌ Error downloading HTML:", error);
        toast({
          title: "Download Error",
          description:
            (error as Error).message || "Failed to download HTML contract",
          variant: "destructive",
        });
      }
    },
    [toast, currentUser],
  );

  // CRITICAL: Helper function to get correct project total - MALFORMED DATA DETECTION AND CORRECTION
  const getCorrectProjectTotal = useCallback((project: any) => {
    if (!project) {
      console.warn(
        "⚠️ getCorrectProjectTotal called with null/undefined project",
      );
      return 0;
    }

    console.log("💰 Financial data analysis:", {
      displaySubtotal: project.displaySubtotal,
      displayTotal: project.displayTotal,
      totalPrice: project.totalPrice,
      estimateAmount: project.estimateAmount,
      total: project.total,
      totalAmount: project.totalAmount,
    });

    // Helper function to detect and fix malformed values (stored as centavos when they should be dollars)
    const correctMalformedValue = (value: number, fieldName: string) => {
      if (!value || value <= 0) return 0;

      // ✅ FIXED: Removed faulty logic that was dividing valid dollar amounts by 100
      // Previous logic incorrectly assumed all values > 10000 that are multiples of 100 were in centavos
      // This caused $45,000 to display as $450 (and similar errors)
      // Now we trust the stored values as they are in dollars
      
      console.log(`💰 Using ${fieldName} as-is:`, value);
      return value;
    };

    // CRITICAL FIX: Extended lookup matrix for ALL legacy financial field shapes
    
    // PRIORITY 1: User-edited values (formFields - HIGHEST PRIORITY)
    if (project.formFields?.projectTotal && project.formFields.projectTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.formFields.projectTotal, "formFields.projectTotal"));
    }
    if (project.formFields?.projectDetails?.total && project.formFields.projectDetails.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.formFields.projectDetails.total, "formFields.projectDetails.total"));
    }
    if (project.formFields?.projectDetails?.totalCost && project.formFields.projectDetails.totalCost > 0) {
      return normalizeCurrency(correctMalformedValue(project.formFields.projectDetails.totalCost, "formFields.projectDetails.totalCost"));
    }
    if (project.formFields?.financials?.displaySubtotal && project.formFields.financials.displaySubtotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.formFields.financials.displaySubtotal, "formFields.financials.displaySubtotal"));
    }
    if (project.formFields?.financials?.total && project.formFields.financials.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.formFields.financials.total, "formFields.financials.total"));
    }
    if (project.formFields?.financials?.grandTotal && project.formFields.financials.grandTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.formFields.financials.grandTotal, "formFields.financials.grandTotal"));
    }
    
    // PRIORITY 2: Project cost structures (from estimates)
    if (project.projectTotalCosts?.totalSummary?.finalTotal && project.projectTotalCosts.totalSummary.finalTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.projectTotalCosts.totalSummary.finalTotal, "projectTotalCosts.totalSummary.finalTotal"));
    }
    if (project.projectTotalCosts?.totalSummary?.total && project.projectTotalCosts.totalSummary.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.projectTotalCosts.totalSummary.total, "projectTotalCosts.totalSummary.total"));
    }
    if (project.projectTotalCosts?.totalSummary?.grandTotal && project.projectTotalCosts.totalSummary.grandTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.projectTotalCosts.totalSummary.grandTotal, "projectTotalCosts.totalSummary.grandTotal"));
    }
    if (project.projectTotalCosts?.total && project.projectTotalCosts.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.projectTotalCosts.total, "projectTotalCosts.total"));
    }
    if (project.projectTotalCosts?.grandTotal && project.projectTotalCosts.grandTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.projectTotalCosts.grandTotal, "projectTotalCosts.grandTotal"));
    }
    
    // PRIORITY 3: Financial summary structures
    if (project.financialSummary?.finalTotal && project.financialSummary.finalTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialSummary.finalTotal, "financialSummary.finalTotal"));
    }
    if (project.financialSummary?.total && project.financialSummary.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialSummary.total, "financialSummary.total"));
    }
    if (project.financialSummary?.displayTotal && project.financialSummary.displayTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialSummary.displayTotal, "financialSummary.displayTotal"));
    }
    if (project.financialSummary?.grandTotal && project.financialSummary.grandTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialSummary.grandTotal, "financialSummary.grandTotal"));
    }
    
    // PRIORITY 4: Financial data structures (legacy)
    if (project.financialData?.displaySubtotal && project.financialData.displaySubtotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialData.displaySubtotal, "financialData.displaySubtotal"));
    }
    if (project.financialData?.displayTotal && project.financialData.displayTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialData.displayTotal, "financialData.displayTotal"));
    }
    if (project.financialData?.total && project.financialData.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialData.total, "financialData.total"));
    }
    if (project.financialData?.grandTotal && project.financialData.grandTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.financialData.grandTotal, "financialData.grandTotal"));
    }
    
    // PRIORITY 5: Historic estimate references
    if (project.historicEstimate?.totalAmount && project.historicEstimate.totalAmount > 0) {
      return normalizeCurrency(correctMalformedValue(project.historicEstimate.totalAmount, "historicEstimate.totalAmount"));
    }
    if (project.historicEstimate?.finalTotal && project.historicEstimate.finalTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.historicEstimate.finalTotal, "historicEstimate.finalTotal"));
    }
    if (project.historicEstimate?.total && project.historicEstimate.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.historicEstimate.total, "historicEstimate.total"));
    }
    if (project.historicEstimate?.displayTotal && project.historicEstimate.displayTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.historicEstimate.displayTotal, "historicEstimate.displayTotal"));
    }
    
    // PRIORITY 6: Top-level direct fields
    // ✅ CRITICAL FIX: Use normalizeCurrency for legacy cent-based values
    // normalizeCurrency safely detects and converts integers >= 10000 from cents to dollars
    // without affecting proper dollar amounts with decimals (e.g., $45,000.00 stays as-is)
    if (project.displaySubtotal && project.displaySubtotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.displaySubtotal, "displaySubtotal"));
    }
    if (project.displayTotal && project.displayTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.displayTotal, "displayTotal"));
    }
    if (project.totalPrice && project.totalPrice > 0) {
      return normalizeCurrency(correctMalformedValue(project.totalPrice, "totalPrice"));
    }
    if (project.estimateAmount && project.estimateAmount > 0) {
      return normalizeCurrency(correctMalformedValue(project.estimateAmount, "estimateAmount"));
    }
    if (project.total && project.total > 0) {
      return normalizeCurrency(correctMalformedValue(project.total, "total"));
    }
    if (project.totalAmount && project.totalAmount > 0) {
      return normalizeCurrency(correctMalformedValue(project.totalAmount, "totalAmount"));
    }
    if (project.contractTotal && project.contractTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.contractTotal, "contractTotal"));
    }
    if (project.projectTotal && project.projectTotal > 0) {
      return normalizeCurrency(correctMalformedValue(project.projectTotal, "projectTotal"));
    }
    if (project.totalCost && project.totalCost > 0) {
      return normalizeCurrency(correctMalformedValue(project.totalCost, "totalCost"));
    }

    console.log("💰 Final calculated total:", 0);
    return 0;
  }, []);

  // Auto-save function with debounce
  const performAutoSave = useCallback(async () => {
    // ✅ FIXED: Resilient auth check for auto-save
    if ((!currentUser?.uid && !profile?.email) || !selectedProject || !editableData.clientName) {
      console.log("🔄 Auto-save skipped: missing required data");
      return;
    }

    try {
      setIsAutoSaving(true);
      setAutoSaveStatus("saving");

      console.log("💾 [AUTO-SAVE] Starting auto-save...");

      // Build comprehensive contract data for auto-save
      const autoSaveContractData = {
        userId: currentUser!.uid,
        contractId:
          currentContractId ||
          `CNT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientName: editableData.clientName,
        projectType: selectedProject.projectType || "Construction",
        status: "draft" as const,
        contractData: {
          client: {
            name: editableData.clientName,
            email: editableData.clientEmail,
            phone: editableData.clientPhone,
            address: editableData.clientAddress,
          },
          contractor: {
            name: profile?.company || profile?.ownerName || "Company Name",
            company: profile?.company || "Company Name",
            address:
              `${profile?.address || ""} ${profile?.city || ""} ${profile?.state || ""} ${profile?.zipCode || ""}`.trim(),
            phone: profile?.phone || profile?.mobilePhone || "",
            email: profile?.email || "",
            license: profile?.license || "",
          },
          project: {
            type: selectedProject.projectType || "Construction",
            description:
              selectedProject.projectDescription ||
              selectedProject.description ||
              "",
            location:
              editableData.clientAddress || selectedProject.clientAddress || "",
            scope: selectedProject.projectDescription || "",
          },
          financials: {
            // CRITICAL FIX: Use the edited projectTotal from user input, not the original project total
            total: editableData.projectTotal || getCorrectProjectTotal(selectedProject),
            subtotal: editableData.projectTotal || getCorrectProjectTotal(selectedProject),
            tax: 0,
            materials: 0,
            labor: 0,
            permits: 0,
            other: 0,
          },
          timeline: {
            startDate: editableData.startDate,
            completionDate: editableData.completionDate,
            estimatedDuration: "As specified in project details",
          },
          protections: selectedClauses.map((clauseId) => ({
            id: clauseId,
            category: "legal",
            clause:
              suggestedClauses.find((c) => c.id === clauseId)?.title ||
              clauseId,
          })),
          formFields: {
            permitResponsibility: editableData.permitResponsibility,
            warrantyYears: editableData.warrantyYears,
            startDate: editableData.startDate,
            completionDate: editableData.completionDate,
            // CRITICAL FIX: Save the edited projectTotal so it can be restored later
            projectTotal: editableData.projectTotal,
          },
          paymentTerms: editableData.paymentMilestones as any,
          materials: selectedProject.materials || [],
          terms: {
            warranty: editableData.warrantyYears,
            permits: editableData.permitResponsibility,
          },
        },
      };

      // Save contract using existing service
      const savedContractId =
        await contractHistoryService.saveContract(autoSaveContractData);

      // Update current contract ID if this is the first save
      if (!currentContractId) {
        setCurrentContractId(savedContractId);
      }

      setLastAutoSave(new Date());
      setAutoSaveStatus("saved");

      console.log(
        "✅ [AUTO-SAVE] Contract auto-saved successfully:",
        savedContractId,
      );

      // Clear saved status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("❌ [AUTO-SAVE] Error auto-saving contract:", error);
      setAutoSaveStatus("error");

      // Clear error status after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 5000);
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    currentUser?.uid,
    selectedProject,
    editableData,
    currentContractId,
    selectedClauses,
    suggestedClauses,
    profile,
    getCorrectProjectTotal,
  ]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer for 2 seconds after the last change
    const newTimer = setTimeout(() => {
      performAutoSave();
    }, 2000);

    setAutoSaveTimer(newTimer);
  }, [autoSaveTimer, performAutoSave]);

  // REUSABLE HYDRATION HELPER: Converts contract history data into editable state
  // Used by both loadContractFromHistory and handleManualTotalConfirm
  const hydrateContractState = useCallback((
    contractDataFromHistory: any,
    contract: ContractHistoryEntry,
    contractTotal: number, // MUST be pre-normalized
    paymentMilestonesInput: any[]
  ) => {
    // Deep-clone milestones to avoid mutations
    let paymentMilestones = JSON.parse(JSON.stringify(paymentMilestonesInput));

    if (paymentMilestones.length > 0 && contractTotal > 0) {
      // 🔧 MILESTONE REHYDRATION PASS - backfill amounts from percentages
      paymentMilestones = paymentMilestones.map((milestone: any) => {
        let finalAmount: number;
        
        if (milestone.amount != null && milestone.amount !== 0) {
          // (a) Normalize any provided amount
          finalAmount = normalizeCurrency(milestone.amount);
          console.log(`💰 [MILESTONE] Using stored amount: ${milestone.amount} → ${finalAmount}`);
        } else if (milestone.percentage != null && milestone.percentage > 0) {
          // (b) Backfill from percentage using contractTotal
          finalAmount = Math.round((milestone.percentage / 100) * contractTotal * 100) / 100;
          console.log(`💰 [MILESTONE] Rehydrated from ${milestone.percentage}%: ${finalAmount}`);
        } else {
          // (c) No percentage or amount - will regenerate later
          finalAmount = 0;
          console.log(`💰 [MILESTONE] Missing data, setting to 0 for regeneration`);
        }
        
        return {
          ...milestone,
          amount: finalAmount,
        };
      });

      // Verify milestone sum matches contract total
      const milestonesSum = paymentMilestones.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
      const totalPercentage = paymentMilestones.reduce((sum: number, m: any) => sum + (m.percentage || 0), 0);
      
      // If milestones sum to 100% and have valid amounts, use that as verification
      if (totalPercentage === 100 && milestonesSum > 0) {
        const tolerance = Math.abs(contractTotal * 0.02); // 2% tolerance
        if (Math.abs(milestonesSum - contractTotal) <= tolerance) {
          console.log(`✅ [HYDRATE] Milestones sum (${milestonesSum}) matches contract total (${contractTotal})`);
        } else {
          console.log(`⚠️ [HYDRATE] Milestones sum (${milestonesSum}) differs from contract total (${contractTotal}), using milestones`);
          contractTotal = milestonesSum;
        }
      }
    } else if (paymentMilestones.length === 0 || contractTotal === 0) {
      // Regenerate default milestones if none exist or total is 0
      paymentMilestones = [
        {
          id: 1,
          description: "Initial deposit",
          percentage: 50,
          amount: contractTotal * 0.5,
        },
        {
          id: 2,
          description: "Project completion",
          percentage: 50,
          amount: contractTotal * 0.5,
        },
      ];
      console.log(`💰 [HYDRATE] Generated default milestones for total: ${contractTotal}`);
    }

    // Build editable data
    const editableData = {
      clientName: contractDataFromHistory.client?.name || contract.clientName,
      clientEmail: contractDataFromHistory.client?.email || "",
      clientPhone: contractDataFromHistory.client?.phone || "",
      clientAddress: contractDataFromHistory.client?.address || "",
      startDate: contractDataFromHistory.formFields?.startDate || contractDataFromHistory.timeline?.startDate || "",
      completionDate: contractDataFromHistory.formFields?.completionDate || contractDataFromHistory.timeline?.completionDate || "",
      permitRequired: (contractDataFromHistory as any).permitInfo?.required ? "yes" : "no",
      permitResponsibility: contractDataFromHistory.formFields?.permitResponsibility || (contractDataFromHistory as any).permitInfo?.responsibility || "contractor",
      warrantyYears: (contractDataFromHistory.formFields as any)?.warrantyYears || "1",
      projectTotal: contractTotal, // Editable project total from history
      paymentMilestones: paymentMilestones as any,
    };

    // Build clauses
    const suggestedClauses = contractDataFromHistory.protections?.map((p: any) => ({
      id: p.id,
      title: p.clause,
      category: p.category,
    })) || [];
    
    const selectedClauses = contractDataFromHistory.protections?.map((p: any) => p.id) || [];

    return { editableData, suggestedClauses, selectedClauses };
  }, [normalizeCurrency]);

  // Load contract from history and resume editing
  const loadContractFromHistory = useCallback(
    async (contract: ContractHistoryEntry) => {
      try {
        console.log("🔄 Loading contract from history:", contract.id);

        // Set current contract ID for auto-save updates
        setCurrentContractId(contract.id || null);

        // Extract contract data
        const contractDataFromHistory = contract.contractData;

        // CRITICAL FIX: Build projectFromHistory with ALL possible financial field lookups
        // This enables getCorrectProjectTotal to use its comprehensive normalization logic
        const projectFromHistory = {
          id: contract.contractId,
          clientName:
            contractDataFromHistory.client?.name || contract.clientName,
          clientEmail: contractDataFromHistory.client?.email || "",
          clientPhone: contractDataFromHistory.client?.phone || "",
          clientAddress: contractDataFromHistory.client?.address || "",
          projectType:
            contractDataFromHistory.project?.type || contract.projectType,
          projectDescription:
            contractDataFromHistory.project?.description || "",
          // Populate ALL financial fields for getCorrectProjectTotal to normalize
          displaySubtotal: contractDataFromHistory.financials?.subtotal || contractDataFromHistory.financials?.displaySubtotal || (contractDataFromHistory as any).financialData?.displaySubtotal || (contractDataFromHistory as any).displaySubtotal || 0,
          displayTotal: contractDataFromHistory.financials?.displayTotal || (contractDataFromHistory as any).financialData?.displayTotal || (contractDataFromHistory as any).displayTotal || 0,
          totalPrice: contractDataFromHistory.financials?.total || (contractDataFromHistory as any).totalPrice || 0,
          estimateAmount: (contractDataFromHistory as any).estimateAmount || (contractDataFromHistory as any).historicEstimate?.totalAmount || 0,
          total: contractDataFromHistory.financials?.total || (contractDataFromHistory as any).total || 0,
          totalAmount: contractDataFromHistory.financials?.total || (contractDataFromHistory as any).totalAmount || 0,
          // Additional nested structures for comprehensive normalization
          projectTotalCosts: (contractDataFromHistory as any).projectTotalCosts,
          formFields: contractDataFromHistory.formFields,
          project: contractDataFromHistory.project,
          financialData: (contractDataFromHistory as any).financialData,
          historicEstimate: (contractDataFromHistory as any).historicEstimate,
          materials: contractDataFromHistory.materials || [],
          originalData: contractDataFromHistory,
        };

        // Set selected project and contract data
        setSelectedProject(projectFromHistory);
        setContractData(contractDataFromHistory);

        // CRITICAL FIX: Use getCorrectProjectTotal to normalize total from ALL storage locations
        // This reuses the proven helper with malformed-value detection and comprehensive fallbacks
        let contractTotal = getCorrectProjectTotal(projectFromHistory);
        console.log(`💰 [CONTRACT-LOAD] Normalized total using getCorrectProjectTotal: ${contractTotal}`);

        // CRITICAL FIX: Check for corrupted legacy drafts (percentage-only milestones with no stored total)
        let paymentMilestones = contractDataFromHistory.paymentTerms || [];
        const hasPercentageOnlyMilestones = paymentMilestones.length > 0 && 
          paymentMilestones.some((m: any) => (m.percentage != null && m.percentage > 0) && (m.amount == null || m.amount === 0));
        
        if (contractTotal === 0 && hasPercentageOnlyMilestones) {
          console.warn(`⚠️ [CONTRACT-LOAD] CORRUPTED LEGACY DRAFT: Contract has percentage-only milestones but no stored total. Opening manual entry modal.`);
          // Store pending contract data for manual total entry
          setPendingContractData({
            contract,
            contractDataFromHistory,
            projectFromHistory,
            paymentMilestones,
          });
          setManualTotalInput("");
          setIsManualTotalModalOpen(true);
          // STOP here - modal will handle continuation
          return;
        }
        
        if (contractTotal === 0) {
          console.warn(`⚠️ [CONTRACT-LOAD] Contract total is $0 after normalization. Proceeding with zero.`);
        }
        
        // Use reusable hydration helper to build state
        const hydrated = hydrateContractState(
          contractDataFromHistory,
          contract,
          contractTotal,
          paymentMilestones
        );

        setEditableData(hydrated.editableData);
        setSuggestedClauses(hydrated.suggestedClauses);
        setSelectedClauses(hydrated.selectedClauses);

        // Switch to contract view and go to step 2 (review)
        setCurrentView("contracts");
        setCurrentStep(2);

        toast({
          title: "Contract Loaded",
          description: `Resumed contract for ${contract.clientName}`,
        });

        console.log("✅ Contract loaded from history successfully");
      } catch (error) {
        console.error("❌ Error loading contract from history:", error);
        toast({
          title: "Error",
          description: "Failed to load contract from history",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // Manual total entry confirmation handler (for corrupted legacy drafts)
  const handleManualTotalConfirm = useCallback(() => {
    if (!pendingContractData) return;

    // Validate input
    const rawManualTotal = parseFloat(manualTotalInput);
    if (isNaN(rawManualTotal) || rawManualTotal <= 0) {
      toast({
        title: "Invalid Total",
        description: "Please enter a valid positive number for the contract total.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { contract, contractDataFromHistory, projectFromHistory, paymentMilestones } = pendingContractData;
      
      console.log(`✅ [MANUAL-ENTRY] User provided total: $${rawManualTotal}`);

      // CRITICAL: Deep-clone BOTH projectFromHistory AND contractDataFromHistory to avoid mutations
      const updatedProjectFromHistory = JSON.parse(JSON.stringify(projectFromHistory));
      const updatedContractDataFromHistory = JSON.parse(JSON.stringify(contractDataFromHistory));
      
      // Temporarily update project with manual total in ONE field (enables getCorrectProjectTotal to normalize)
      updatedProjectFromHistory.totalAmount = rawManualTotal;

      // CRITICAL: RERUN getCorrectProjectTotal over updated project (applies malformed-value correction pipeline)
      const normalizedManualTotal = getCorrectProjectTotal(updatedProjectFromHistory);
      console.log(`✅ [MANUAL-ENTRY] Normalized manual total via getCorrectProjectTotal: ${rawManualTotal} → ${normalizedManualTotal}`);

      // NOW update ALL fields in project with NORMALIZED total
      updatedProjectFromHistory.totalAmount = normalizedManualTotal;
      updatedProjectFromHistory.displaySubtotal = normalizedManualTotal;
      updatedProjectFromHistory.displayTotal = normalizedManualTotal;
      updatedProjectFromHistory.totalPrice = normalizedManualTotal;
      updatedProjectFromHistory.estimateAmount = normalizedManualTotal;
      updatedProjectFromHistory.total = normalizedManualTotal;

      // Update ALL nested financial fields in contractData with NORMALIZED total
      if (!updatedContractDataFromHistory.financials) {
        updatedContractDataFromHistory.financials = {};
      }
      updatedContractDataFromHistory.financials.total = normalizedManualTotal;
      updatedContractDataFromHistory.financials.displayTotal = normalizedManualTotal;
      updatedContractDataFromHistory.financials.displaySubtotal = normalizedManualTotal;

      // Update legacy financial locations
      if (!updatedContractDataFromHistory.financialData) {
        updatedContractDataFromHistory.financialData = {};
      }
      updatedContractDataFromHistory.financialData.total = normalizedManualTotal;
      updatedContractDataFromHistory.financialData.displayTotal = normalizedManualTotal;
      updatedContractDataFromHistory.financialData.displaySubtotal = normalizedManualTotal;

      if (!updatedContractDataFromHistory.financialSummary) {
        updatedContractDataFromHistory.financialSummary = {};
      }
      updatedContractDataFromHistory.financialSummary.total = normalizedManualTotal;
      updatedContractDataFromHistory.financialSummary.displayTotal = normalizedManualTotal;

      // Update top-level total fields
      updatedContractDataFromHistory.total = normalizedManualTotal;
      updatedContractDataFromHistory.totalAmount = normalizedManualTotal;
      updatedContractDataFromHistory.displayTotal = normalizedManualTotal;
      updatedContractDataFromHistory.displaySubtotal = normalizedManualTotal;

      // Update projectTotalCosts if exists
      if (!updatedContractDataFromHistory.projectTotalCosts) {
        updatedContractDataFromHistory.projectTotalCosts = {};
      }
      updatedContractDataFromHistory.projectTotalCosts.total = normalizedManualTotal;
      updatedContractDataFromHistory.projectTotalCosts.displayTotal = normalizedManualTotal;
      updatedContractDataFromHistory.projectTotalCosts.userEditedTotal = normalizedManualTotal;

      // Update historicEstimate if exists
      if (!updatedContractDataFromHistory.historicEstimate) {
        updatedContractDataFromHistory.historicEstimate = {};
      }
      updatedContractDataFromHistory.historicEstimate.totalAmount = normalizedManualTotal;
      updatedContractDataFromHistory.historicEstimate.displayTotal = normalizedManualTotal;

      // Deep-clone paymentMilestones to avoid mutations
      const clonedMilestones = JSON.parse(JSON.stringify(paymentMilestones));

      // Use SAME hydration helper as loadContractFromHistory (reuses proven pipeline)
      const hydrated = hydrateContractState(
        updatedContractDataFromHistory,
        contract,
        normalizedManualTotal,
        clonedMilestones
      );

      // Set all states with hydrated data (SAME sequence as non-modal path)
      setSelectedProject(updatedProjectFromHistory);
      setContractData(updatedContractDataFromHistory);
      setEditableData(hydrated.editableData);
      setSuggestedClauses(hydrated.suggestedClauses);
      setSelectedClauses(hydrated.selectedClauses);
      setCurrentContractId(contract.id || null);

      // Close modal and proceed to Step 2
      setIsManualTotalModalOpen(false);
      setPendingContractData(null);
      setManualTotalInput("");
      setCurrentView("contracts");
      setCurrentStep(2);

      toast({
        title: "Contract Loaded",
        description: `Resumed contract for ${contract.clientName} with manual total: $${normalizedManualTotal.toFixed(2)}`,
      });

      console.log("✅ Contract loaded from history with manual total entry");
    } catch (error) {
      console.error("❌ Error processing manual total:", error);
      toast({
        title: "Error",
        description: "Failed to process manual total entry",
        variant: "destructive",
      });
    }
  }, [pendingContractData, manualTotalInput, toast, hydrateContractState, getCorrectProjectTotal]);

  // Filter and search contracts
  const filteredContracts = contractHistory.filter((contract) => {
    // Apply status filter
    if (historyFilter !== "all" && contract.status !== historyFilter) {
      return false;
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        contract.clientName.toLowerCase().includes(searchLower) ||
        contract.projectType.toLowerCase().includes(searchLower) ||
        (contract.contractData?.project?.description || "")
          .toLowerCase()
          .includes(searchLower)
      );
    }

    return true;
  });

  // Load projects for step 1
  const loadProjects = useCallback(async () => {
    // ✅ CRITICAL: Get effective UID from Firebase Auth OR profile
    const effectiveUid = currentUser?.uid || currentUser?.uid;
    
    // ✅ FIXED: Resilient auth check
    if (!effectiveUid && !profile?.email) return;

    setIsLoading(true);
    console.log("🔍 Loading estimates and projects for user:", effectiveUid || 'profile_user');

    try {
      // FIREBASE CONNECTION VALIDATION
      console.log("🔗 Validating Firebase connection...");
      const { collection, query, where, getDocs, orderBy } = await import(
        "firebase/firestore"
      );
      const { db } = await import("@/lib/firebase");

      // Test Firebase connection with a simple query
      try {
        const testQuery = query(
          collection(db, "estimates"),
          where("firebaseUserId", "==", effectiveUid),
        );
        console.log("✅ Firebase connection validated successfully");
      } catch (connectionError) {
        console.error("❌ Firebase connection failed:", connectionError);
        throw new Error(
          "No se pudo conectar a Firebase. Verifique su conexión a internet.",
        );
      }

      let allProjects: any[] = [];

      // 1. Load from estimates collection (primary source)
      console.log("📋 Loading from estimates collection...");
      const estimatesQuery = query(
        collection(db, "estimates"),
        where("firebaseUserId", "==", effectiveUid)
        // Note: orderBy removed to avoid composite index requirement
        // Sorting will be done client-side after data is fetched
      );

      const estimatesSnapshot = await getDocs(estimatesQuery);
      const firebaseEstimates = estimatesSnapshot.docs.map((doc) => {
        const data = doc.data();

        // Extract client information properly
        const clientName =
          data.clientName ||
          data.clientInformation?.name ||
          data.client?.name ||
          "Cliente sin nombre";

        const clientEmail =
          data.clientEmail ||
          data.clientInformation?.email ||
          data.client?.email ||
          "";

        const clientPhone =
          data.clientPhone ||
          data.clientInformation?.phone ||
          data.client?.phone ||
          "";

        // Extract project details
        const projectType =
          data.projectType ||
          data.projectDetails?.type ||
          data.fenceType ||
          "Construction";

        const projectDescription =
          data.projectDescription ||
          data.projectDetails ||
          data.description ||
          "";

        // Extract financial information - MATCH EstimatesWizard logic exactly
        let totalValue =
          data.projectTotalCosts?.totalSummary?.finalTotal ||
          data.projectTotalCosts?.total ||
          data.total ||
          data.estimateAmount ||
          0;

        // No conversion - keep original values as they are stored (matching EstimatesWizard)
        const displayTotal = totalValue;

        return {
          id: doc.id,
          estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,

          // Client information
          clientName,
          clientEmail,
          clientPhone,
          clientAddress: data.clientAddress || data.address || "",

          // Project information
          projectType,
          projectDescription,
          description: projectDescription,

          // Financial information - MATCH EstimatesWizard fields exactly
          total: displayTotal, // Primary field used in EstimatesWizard
          totalAmount: displayTotal, // Backup field for compatibility
          totalPrice: displayTotal, // Backup field for compatibility
          displaySubtotal: displayTotal, // Backup field for compatibility
          displayTotal, // Backup field for compatibility

          // Items and costs
          items:
            data.items || data.projectTotalCosts?.materialCosts?.items || [],

          // Status
          status: data.status || "estimate",
          projectProgress: "estimate_ready",

          // Metadata
          createdAt: data.createdAt || new Date(),
          source: "estimates",
          originalData: data,
        };
      });

      allProjects = firebaseEstimates;
      console.log(
        `📋 Loaded ${firebaseEstimates.length} estimates from Firebase (ESTIMATES ONLY - matching EstimateWizard History)`,
      );

      // ✅ SINGLE SOURCE OF TRUTH: Only using estimates collection (matching EstimateWizard)
      // ❌ REMOVED: projects collection loading - Legal Defense now uses ONLY estimates

      // Filter for valid estimates with comprehensive data validation
      const validProjects = allProjects.filter((project: any) => {
        // Financial validation
        const financialAmount = getCorrectProjectTotal(project);
        const hasValidAmount = financialAmount > 0;

        // Client data validation
        const hasClientName =
          project.clientName &&
          project.clientName !== "Cliente sin nombre" &&
          project.clientName.trim().length > 0;

        // Data integrity check
        const isValidProject = hasValidAmount && hasClientName;

        if (!isValidProject) {
          console.warn("⚠️ Invalid project filtered out:", {
            id: project.id,
            clientName: project.clientName,
            financialAmount,
            hasValidAmount,
            hasClientName,
          });
        }

        return isValidProject;
      });

      // Sort by createdAt descending (most recent first) - client-side sorting
      const sortedProjects = validProjects.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setProjects(sortedProjects);
      console.log(`✅ Total loaded: ${sortedProjects.length} valid projects (sorted by date)`);

      if (validProjects.length === 0) {
        console.log(
          "❌ No valid projects found. User needs to create estimates first.",
        );
        toast({
          title: "No Projects Found",
          description: "Create estimates first to generate contracts.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("❌ Error loading projects:", error);
      setProjects([]);
      toast({
        title: "Error Loading Projects",
        description:
          "Could not connect to load your projects. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  // ✅ SINGLE SOURCE OF TRUTH: Real-time listener for ESTIMATES only (matching EstimateWizard)
  useEffect(() => {
    // ✅ CRITICAL FIX: Only use currentUser.uid - don't execute if undefined
    const effectiveUid = currentUser?.uid;
    
    // ✅ FIXED: Exit early if no valid UID - prevents invalid Firebase query
    if (!effectiveUid) {
      console.log("⏳ Waiting for Firebase Auth to initialize before setting up listener...");
      return;
    }

    console.log(
      "🔄 Setting up real-time ESTIMATES listener for user:",
      effectiveUid,
      "(ESTIMATES ONLY - matching EstimateWizard History - ordered by date)",
    );

    const estimatesQuery = query(
      collection(db, "estimates"),
      where("firebaseUserId", "==", effectiveUid)
      // Note: orderBy removed to avoid composite index requirement
      // Sorting will be done client-side after data is fetched
    );

    // Real-time listener with enhanced error handling and data validation
    const unsubscribe = onSnapshot(
      estimatesQuery,
      (snapshot) => {
        try {
          console.log("🔄 Processing real-time estimates update from Firebase...");

          const allEstimates = snapshot.docs
            .map((doc) => {
              const data = doc.data();

              // Data validation for each estimate
              if (!data) {
                console.warn("⚠️ Empty estimate data detected:", doc.id);
                return null;
              }

              // Extract client information properly (matching loadProjects logic)
              const clientName =
                data.clientName ||
                data.clientInformation?.name ||
                data.client?.name ||
                "Cliente sin nombre";

              const clientEmail =
                data.clientEmail ||
                data.clientInformation?.email ||
                data.client?.email ||
                "";

              const clientPhone =
                data.clientPhone ||
                data.clientInformation?.phone ||
                data.client?.phone ||
                "";

              // Extract project details
              const projectType =
                data.projectType ||
                data.projectDetails?.type ||
                data.fenceType ||
                "Construction";

              const projectDescription =
                data.projectDescription ||
                data.projectDetails ||
                data.description ||
                "";

              // Extract financial information - MATCH EstimatesWizard logic exactly
              let totalValue =
                data.projectTotalCosts?.totalSummary?.finalTotal ||
                data.projectTotalCosts?.total ||
                data.total ||
                data.estimateAmount ||
                0;

              const displayTotal = totalValue;

              return {
                id: doc.id,
                estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
                clientName,
                clientEmail,
                clientPhone,
                clientAddress: data.clientAddress || data.address || "",
                projectType,
                projectDescription,
                description: projectDescription,
                total: displayTotal,
                totalAmount: displayTotal,
                totalPrice: displayTotal,
                displaySubtotal: displayTotal,
                displayTotal,
                items: data.items || data.projectTotalCosts?.materialCosts?.items || [],
                status: data.status || "estimate",
                projectProgress: "estimate_ready",
                createdAt: data.createdAt || new Date(),
                source: "estimates",
                timestamp: new Date().toISOString(),
              };
            })
            .filter(Boolean); // Remove null entries

          // Enhanced filtering with data integrity checks
          const approvedProjects = allEstimates.filter((project: any) => {
            // Status validation
            const hasValidStatus =
              project.status === "approved" ||
              project.status === "estimate_ready" ||
              project.status === "estimate" ||
              project.projectProgress === "approved" ||
              project.projectProgress === "client_approved" ||
              project.projectProgress === "estimate_ready" ||
              project.displaySubtotal > 0;

            // Financial data validation
            const financialAmount = getCorrectProjectTotal(project);
            const hasValidFinancials =
              financialAmount > 0 && financialAmount < 1000000; // Corruption check

            // Client data validation
            const hasValidClient =
              project.clientName &&
              project.clientName !== "Cliente sin nombre" &&
              project.clientName.trim().length > 0;

            const isValid =
              hasValidStatus && hasValidFinancials && hasValidClient;

            if (!isValid) {
              console.warn(
                "⚠️ Invalid project filtered from real-time update:",
                {
                  id: project.id,
                  hasValidStatus,
                  hasValidFinancials,
                  hasValidClient,
                  financialAmount,
                },
              );
            }

            return isValid;
          });

          // Sort by createdAt descending (most recent first) - client-side sorting
          const sortedProjects = approvedProjects.sort((a: any, b: any) => {
            const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
            const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });

          setProjects(sortedProjects);
          console.log(
            `📊 Real-time update from ESTIMATES: ${sortedProjects.length} validated estimates (matching EstimateWizard History)`,
          );
          setIsLoading(false);
        } catch (processError) {
          console.error("❌ Error processing real-time update:", processError);
          toast({
            title: "Error de Datos",
            description: "Error procesando actualización en tiempo real",
            variant: "destructive",
          });
        }
      },
      (error: any) => {
        console.error("❌ Firebase listener error:", error);
        console.error("❌ Error details:", {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        });

        // ✅ FIXED: Distinguish error types - only show connection errors to user
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          console.error("🔒 Firebase permission error - user may need to re-authenticate");
          toast({
            title: "Error de Autenticación",
            description: "Por favor, cierra sesión y vuelve a iniciar sesión.",
            variant: "destructive",
          });
        } else if (error.code === 'unavailable' || error.message?.includes('network')) {
          console.error("🌐 Firebase network error - connection issue");
          toast({
            title: "Error de Conexión",
            description: "Verifica tu conexión a internet e intenta de nuevo.",
            variant: "destructive",
          });
        } else if (error.code === 'invalid-argument') {
          console.error("⚙️ Firebase configuration error - invalid query parameter:", error.message);
          // Don't show toast for configuration errors - these should be fixed in code
        } else {
          console.error("❌ Firebase unexpected error:", error);
          toast({
            title: "Error",
            description: "Ocurrió un error al cargar los datos. Intenta recargar la página.",
            variant: "destructive",
          });
        }
        
        setIsLoading(false);
      },
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser?.uid, toast]);

  // Fetch available document types from the Multi-Template System
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      if (!currentUser?.uid) return;
      
      setIsLoadingDocumentTypes(true);
      try {
        // Get Firebase ID token for proper authentication
        const token = await auth.currentUser?.getIdToken(false).catch(() => null);
        
        const response = await fetch('/api/legal-defense/templates', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : { 'x-firebase-uid': currentUser.uid }),
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const templates = data.templates || [];
          setIsDocumentTypeSelectorEnabled(data.featureFlags?.documentTypeSelector || false);
          setAvailableDocumentTypes(templates);
          
          // Set initial selected document type to first active template, fallback to any available
          const firstActiveTemplate = templates.find((t: { status: string }) => t.status === 'active');
          const fallbackTemplate = templates[0];
          const defaultTemplate = firstActiveTemplate || fallbackTemplate;
          if (defaultTemplate) {
            setSelectedDocumentType(defaultTemplate.id);
          }
          
          console.log('📋 [MULTI-TEMPLATE] Document types loaded:', templates.length, 'Feature enabled:', data.featureFlags?.documentTypeSelector, 'Default:', firstActiveTemplate?.id);
        }
      } catch (error) {
        console.error('❌ Error fetching document types:', error);
        setIsDocumentTypeSelectorEnabled(false);
        setAvailableDocumentTypes([]);
      } finally {
        setIsLoadingDocumentTypes(false);
      }
    };
    
    fetchDocumentTypes();
  }, [currentUser?.uid]);

  // Initialize editable data when project is selected
  useEffect(() => {
    if (selectedProject) {
      const totalAmount =
        selectedProject.totalAmount ||
        selectedProject.totalPrice ||
        selectedProject.displaySubtotal ||
        0;
      setEditableData((prev) => ({
        ...prev,
        clientName:
          selectedProject.clientName ||
          selectedProject.client?.name ||
          selectedProject.client ||
          "",
        clientEmail:
          selectedProject.clientEmail || selectedProject.client?.email || "",
        clientPhone:
          selectedProject.clientPhone || selectedProject.client?.phone || "",
        clientAddress:
          selectedProject.clientAddress ||
          selectedProject.client?.address ||
          selectedProject.address ||
          "",
        projectTotal: totalAmount, // CRITICAL FIX: Initialize projectTotal from selected project
        paymentMilestones: [
          {
            id: 1,
            description: "Initial deposit",
            percentage: 50,
            amount: totalAmount * 0.5,
          },
          {
            id: 2,
            description: "Project completion",
            percentage: 50,
            amount: totalAmount * 0.5,
          },
        ],
      }));
    }
  }, [selectedProject]);

  // Step 1: Select project and move to step 2 with direct data processing
  const handleProjectSelect = useCallback(
    async (project: any) => {
      console.log("🎯 Selecting project:", project);
      setIsLoading(true);

      try {
        // Validate project data
        if (!project) {
          throw new Error("No project data provided");
        }

        // Extract client data from various possible sources with comprehensive fallbacks
        const clientName =
          project.clientName ||
          project.clientInformation?.name ||
          project.client?.name ||
          project.client ||
          "Cliente sin nombre";

        const clientEmail =
          project.clientEmail ||
          project.clientInformation?.email ||
          project.client?.email ||
          "";

        const clientPhone =
          project.clientPhone ||
          project.clientInformation?.phone ||
          project.client?.phone ||
          "";

        const clientAddress =
          project.clientAddress ||
          project.address ||
          project.clientInformation?.address ||
          project.client?.address ||
          "";

        // Extract project details
        const projectType =
          project.projectType ||
          project.projectDetails?.type ||
          project.fenceType ||
          "Construction";

        const projectDescription =
          project.projectDescription ||
          project.description ||
          project.projectDetails ||
          `${projectType} project for ${clientName}`;

        // Extract financial data - CRITICAL FIX: Use helper function for consistent calculation
        const totalAmount = getCorrectProjectTotal(project);

        // No conversion - keep original values as they are stored (matching EstimatesWizard)

        // Process project data comprehensively
        const contractData = {
          clientInfo: {
            name: clientName,
            address: clientAddress,
            email: clientEmail,
            phone: clientPhone,
          },
          projectDetails: {
            description: projectDescription,
            type: projectType,
          },
          financials: {
            total: totalAmount,
          },
          materials: project.items || project.materials || [],
          originalData: project.originalData || project,
        };

        console.log("📋 Processed contract data:", contractData);

        setSelectedProject(project);
        setContractData(contractData);

        // Initialize editable data with comprehensive project data
        const projectTotal = getCorrectProjectTotal(project);
        setEditableData({
          clientName,
          clientEmail,
          clientPhone,
          clientAddress,
          startDate: "",
          completionDate: "",
          permitRequired: "",
          permitResponsibility: "contractor",
          warrantyYears: "1",
          projectTotal, // Editable project total
          paymentMilestones: [
            {
              id: 1,
              description: "Initial deposit",
              percentage: 50,
              amount: projectTotal * 0.5,
            },
            {
              id: 2,
              description: "Project completion",
              percentage: 50,
              amount: projectTotal * 0.5,
            },
          ],
        });

        setCurrentStep(2);

        // Load AI-suggested clauses
        // Note: Suggested clauses functionality can be added in the future if needed

        toast({
          title: "Project Selected",
          description: `Ready to generate contract for ${project.clientName}`,
        });

        console.log("Project selected and processed:", {
          projectId: project.id,
          clientName: project.clientName,
          totalAmount: contractData.financials.total,
        });
      } catch (error) {
        console.error("❌ CRITICAL ERROR selecting project:", error);
        console.error("❌ Project data when error occurred:", project);
        console.error("❌ Error details:", {
          message: (error as Error).message || "Unknown error",
          stack: (error as Error).stack,
          timestamp: new Date().toISOString(),
        });

        toast({
          title: "Error de Conexión",
          description: `Error procesando datos del proyecto: ${(error as Error).message || "Error desconocido"}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser?.uid, toast],
  );

  /**
   * ✅ REGISTRY-DRIVEN PDF PAYLOAD BUILDER
   * 
   * Builds PDF payload based on template metadata from the registry.
   * This eliminates hardcoded if/else chains and makes adding new templates easy.
   * 
   * Template architects just need to:
   * 1. Register template with signatureType and dataSource in registry
   * 2. Add template-specific data fields (changeOrder, lienWaiver, etc.)
   * 3. This function automatically routes data correctly
   */
  const buildRegistryDrivenPdfPayload = useCallback((templateId: string) => {
    const dataSource = templateConfigRegistry.getDataSource(templateId);
    
    // Build contractor data from profile (shared across all templates)
    const contractorData = contractData?.contractor || {
      name: profile?.company || profile?.ownerName || "Company Name",
      company: profile?.company || "Company Name",
      address: `${profile?.address || ""} ${profile?.city || ""} ${profile?.state || ""} ${profile?.zipCode || ""}`.trim(),
      phone: profile?.phone || profile?.mobilePhone || "",
      email: profile?.email || "",
      license: profile?.license || "",
    };
    
    // For contract-based templates (change-order, lien-waiver, work-order, etc.)
    if (dataSource === 'contract' && contractData) {
      const basePayload = {
        templateId,
        templateData: {
          client: contractData.client || contractData.clientInfo,
          contractor: contractorData,
          project: contractData.project,
          financials: contractData.financials,
        },
        linkedContractId: contractData.linkedContractId,
      };
      
      // Add template-specific data dynamically using a registry-driven approach
      const templateSpecificData: Record<string, any> = {
        'change-order': contractData.changeOrder,
        'lien-waiver': contractData.lienWaiver,
        'work-order': contractData.workOrder,
        'contract-addendum': contractData.addendum,
        'certificate-completion': contractData.completion,
        'warranty-agreement': contractData.warranty,
      };
      
      const dataKey = templateId.replace(/-/g, ''); // e.g., 'change-order' -> 'changeorder'
      const specificData = templateSpecificData[templateId];
      if (specificData) {
        // Use camelCase key for the template data (e.g., changeOrder, lienWaiver)
        const camelCaseKey = templateId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        (basePayload.templateData as any)[camelCaseKey] = specificData;
      }
      
      return { payload: basePayload, useBinaryEndpoint: true, dataSource: 'contract' };
    }
    
    // For project-based templates (independent-contractor) 
    // Return metadata indicating legacy flow should be used
    return { payload: null, useBinaryEndpoint: false, dataSource };
  }, [contractData, profile]);

  /**
   * Generate filename based on template and client data
   */
  const generatePdfFilename = useCallback((templateId: string, clientName: string) => {
    const date = new Date().toISOString().split("T")[0];
    const sanitizedClient = clientName.replace(/\s+/g, "_") || 'client';
    
    const templateNames: Record<string, string> = {
      'change-order': 'Change-Order',
      'lien-waiver': `Lien-Waiver-${contractData?.lienWaiver?.waiverType || 'waiver'}`,
      'work-order': 'Work-Order',
      'contract-addendum': 'Contract-Addendum',
      'certificate-completion': 'Certificate-of-Completion',
      'warranty-agreement': 'Warranty-Agreement',
      'independent-contractor': 'Contract',
    };
    
    const prefix = templateNames[templateId] || 'Document';
    return `${prefix}-${sanitizedClient}-${date}.pdf`;
  }, [contractData?.lienWaiver?.waiverType]);

  // Direct PDF download function - uses working PDF endpoint
  const handleDownloadPDF = useCallback(async () => {
    // ✅ REGISTRY-DRIVEN: Use template registry for data routing
    const dataSource = templateConfigRegistry.getDataSource(selectedDocumentType);
    const usesContractData = dataSource === 'contract';
    
    // Validate data availability based on template's data source
    const hasContractData = usesContractData && contractData;
    const hasProjectData = !usesContractData && selectedProject;
    const isAuthenticated = !!(currentUser?.uid || profile?.email);
    
    // Early return if no data is available for the template type
    if (!hasContractData && !hasProjectData) {
      console.log(`❌ [PDF DOWNLOAD] No data available for template '${selectedDocumentType}' (dataSource: ${dataSource})`);
      return;
    }
    
    // Auth check for ALL flows (including Change Order)
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to download PDFs",
        variant: "destructive",
      });
      return;
    }

    // Check contract access permissions (Trial Master and paid plans have full access)
    if (isPrimoChambeador) {
      toast({
        title: "Upgrade Required",
        description: "Upgrade to Mero Patrón to unlock PDF downloads",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // ✅ REGISTRY-DRIVEN: Use unified payload builder for contract-based templates
      if (hasContractData) {
        const { payload, useBinaryEndpoint } = buildRegistryDrivenPdfPayload(selectedDocumentType);
        
        if (payload && useBinaryEndpoint) {
          console.log(`📄 [${selectedDocumentType.toUpperCase()}] Downloading PDF via binary endpoint...`);
          
          // Fetch as raw binary blob
          const response = await fetch('/api/generate-pdf?download=true', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser?.uid || ''}`,
            },
            body: JSON.stringify(payload),
          });
        
          if (!response.ok) {
            throw new Error(`PDF download failed: ${response.status}`);
          }
          
          // Get blob directly from response
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Downloaded PDF is empty');
          }
          
          console.log(`✅ [${selectedDocumentType.toUpperCase()}] PDF blob received: ${blob.size} bytes`);
          
          // Generate filename using registry-driven helper
          const clientName = contractData?.client?.name || contractData?.clientInfo?.name || 'client';
          const fileName = generatePdfFilename(selectedDocumentType, clientName);
          
          // Handle PDF download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
          
          // Success toast
          toast({
            title: "✅ PDF Downloaded",
            description: "Check your downloads folder",
          });
          
          setIsLoading(false);
          return;
        }
      }
      
      // ===== LEGACY FLOW: Independent Contractor (project-based) =====
      // This template uses the more complex legacy flow with selectedProject data
      // IMMEDIATE FEEDBACK for Independent Contractor flow (requires API call)
      toast({
        title: "Generando PDF...",
        description: "Espera unos segundos mientras preparamos tu contrato",
      });
      
      // Collect COMPREHENSIVE contract data - ALL fields from interface
      const projectTotal = editableData.projectTotal || getCorrectProjectTotal(selectedProject);
      const clientAddress = editableData.clientAddress ||
        contractData?.clientInfo?.address ||
        selectedProject.address ||
        selectedProject.clientAddress ||
        "";
      
      // Build legal clauses array from selected clauses
      const selectedClausesData = suggestedClauses
        .filter((c) => selectedClauses.includes(c.id))
        .map((c) => ({
          title: c.title,
          content: c.content || c.description,
        }));
      
      // Add custom enhanced clause if exists
      if (enhancedClauseText) {
        selectedClausesData.push({
          title: "Custom Clause",
          content: enhancedClauseText,
        });
      }

      const contractPayload = {
        userId: currentUser!.uid,
        client: {
          name:
            editableData.clientName ||
            contractData?.clientInfo?.name ||
            selectedProject.clientName,
          address: clientAddress,
          email:
            editableData.clientEmail ||
            contractData?.clientInfo?.email ||
            selectedProject.clientEmail ||
            "",
          phone:
            editableData.clientPhone ||
            contractData?.clientInfo?.phone ||
            selectedProject.clientPhone ||
            "",
        },
        project: {
          description:
            contractData?.projectDetails?.description ||
            selectedProject.description ||
            selectedProject.projectDescription ||
            selectedProject.projectType ||
            "",
          type: selectedProject.projectType || "Construction Project",
          total: projectTotal,
          materials: contractData?.materials || selectedProject.materials || [],
          // FIX: Add location from client address to prevent "undefined"
          location: clientAddress || "As specified in project details",
        },
        contractor: {
          name: profile?.company || profile?.ownerName || "Company Name",
          company: profile?.company || "Company Name",
          address:
            `${profile?.address || ""} ${profile?.city || ""} ${profile?.state || ""} ${profile?.zipCode || ""}`.trim(),
          phone: profile?.phone || profile?.mobilePhone || "",
          email: profile?.email || "",
          license: profile?.license || "",
        },
        financials: {
          total: projectTotal,
          subtotal: projectTotal,
          tax: 0,
          discount: 0,
          paymentMilestones: editableData.paymentMilestones,
        },
        timeline: {
          startDate:
            editableData.startDate || new Date().toISOString().split("T")[0],
          completionDate: editableData.completionDate || 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          estimatedDuration: editableData.startDate && editableData.completionDate
            ? `${Math.ceil((new Date(editableData.completionDate).getTime() - new Date(editableData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
            : "As specified in project details",
        },
        paymentTerms: editableData.paymentMilestones || [
          {
            id: 1,
            description: "Initial deposit",
            percentage: 50,
            amount: projectTotal * 0.5,
          },
          {
            id: 2,
            description: "Project completion",
            percentage: 50,
            amount: projectTotal * 0.5,
          },
        ],
        // ✅ FIX: Add permit info
        permitInfo: {
          permitsRequired: editableData.permitRequired === "yes",
          responsibility: editableData.permitRequired === "yes" 
            ? editableData.permitResponsibility 
            : "contractor",
          numbers: "",
        },
        // ✅ FIX: Add warranties
        warranties: {
          workmanship: `${editableData.warrantyYears || "1"} year${editableData.warrantyYears !== "1" ? "s" : ""}`,
          materials: "Manufacturer warranty applies to all materials",
        },
        // ✅ FIX: Add legal defense clauses (protectionClauses format for PDF)
        protections: selectedClausesData,
        selectedIntelligentClauses: selectedClausesData,
        legalClauses: {
          selected: selectedClauses,
          clauses: selectedClausesData,
        },
        // ✅ FIX: Add templateId for multi-template support (Change Order, etc.)
        templateId: selectedDocumentType !== 'independent-contractor' ? selectedDocumentType : undefined,
      };

      console.log("📄 [PDF DOWNLOAD] Complete payload with clauses:", {
        clauseCount: selectedClausesData.length,
        hasPermitInfo: !!contractPayload.permitInfo,
        hasWarranties: !!contractPayload.warranties,
        hasProtections: contractPayload.protections?.length || 0,
      });

      console.log(
        "📄 [PDF DOWNLOAD] Generating PDF with payload:",
        contractPayload,
      );

      // Call the working PDF endpoint that was confirmed in the system
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-firebase-uid": currentUser?.uid || "",
        },
        body: JSON.stringify(contractPayload),
      });

      if (response.ok) {
        // Convert response to blob 
        const blob = await response.blob();
        const fileName = `contract-${selectedProject.clientName?.replace(/\s+/g, "_") || "client"}-${new Date().toISOString().split("T")[0]}.pdf`;
        
        // Detect if user is on mobile/tablet device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window) ||
                        (navigator.maxTouchPoints > 0);
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isIPadOS = navigator.userAgent.includes('Mac') && 'ontouchend' in document;
        
        // Handle PDF based on device type - ALWAYS prioritize direct download
        if (isMobile || isIOS || isIPadOS) {
          // Mobile/Tablet: Direct download (no Web Share API to avoid share options)
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up after a delay
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
          
          toast({
            title: "✅ PDF Downloaded",
            description: "Check your downloads folder",
          });
        } else {
          // Desktop: Traditional download
          // ✅ NO TOAST: Browser shows download notification
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } else {
        const errorText = await response.text();
        console.error("❌ PDF download failed:", errorText);
        throw new Error(
          `Failed to download PDF: ${response.status} - ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("❌ Error downloading PDF:", error);
      toast({
        title: "Download Error",
        description: `Failed to download PDF: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedProject,
    currentUser?.uid,
    profile,
    editableData,
    contractData,
    getCorrectProjectTotal,
    toast,
    documentFlowType,
    isPrimoChambeador,
  ]);

  // Fallback contract creation using Firebase stored data
  const handleFallbackContractCreation = async (contractPayload: any) => {
    try {
      console.log("🔄 [FALLBACK] Attempting to retrieve contract from Firebase...");
      
      // Try to get contract HTML from Firebase if it exists
      const firebaseResponse = await fetch("/api/get-contract-from-firebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-firebase-uid": currentUser?.uid || '',
        },
        body: JSON.stringify({
          clientName: contractPayload.client?.name,
          projectDescription: contractPayload.project?.description,
          userId: currentUser?.uid
        }),
      });

      if (firebaseResponse.ok) {
        const firebaseData = await firebaseResponse.json();
        if (firebaseData.success && firebaseData.contractHTML) {
          console.log("✅ [FALLBACK] Contract HTML retrieved from Firebase");
          setContractHTML(firebaseData.contractHTML);
          setContractData(contractPayload);
          setIsContractReady(true);
          setCurrentStep(3);

          toast({
            title: "Contract Retrieved from Database",
            description: "Contract loaded from Firebase storage for signature process.",
          });
          return;
        }
      }

      // If Firebase retrieval fails, create simple contract data for signatures
      console.log("🆘 [FALLBACK] Creating minimal contract data for signatures...");
      const simpleContractHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Service Contract</h1>
          <h2>Contractor Information</h2>
          <p><strong>Company:</strong> ${contractPayload.contractor?.name || 'OWL FENC LLC'}</p>
          <p><strong>Email:</strong> ${contractPayload.contractor?.email || 'contractor@example.com'}</p>
          
          <h2>Client Information</h2>
          <p><strong>Name:</strong> ${contractPayload.client?.name}</p>
          <p><strong>Address:</strong> ${contractPayload.client?.address}</p>
          <p><strong>Email:</strong> ${contractPayload.client?.email}</p>
          
          <h2>Project Details</h2>
          <p><strong>Type:</strong> ${contractPayload.project?.type}</p>
          <p><strong>Description:</strong> ${contractPayload.project?.description}</p>
          <p><strong>Total Amount:</strong> $${contractPayload.project?.total || '0.00'}</p>
          
          <div style="margin-top: 40px;">
            <p>This contract represents a binding agreement between the parties listed above.</p>
          </div>
        </div>
      `;

      setContractHTML(simpleContractHTML);
      setContractData(contractPayload);
      setIsContractReady(true);
      setCurrentStep(3);

      toast({
        title: "Contract Ready for Signatures",
        description: "Simplified contract created for signature collection.",
      });

    } catch (error) {
      console.error("❌ [FALLBACK] Error in fallback contract creation:", error);
      toast({
        title: "Error",
        description: "Could not prepare contract for signatures. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate contract using backend API with comprehensive data (for legal workflow)
  const handleGenerateContract = useCallback(async () => {
    if (!selectedProject || !currentUser?.uid) return;

    // 🎨 DEMO MODE for Primo Chambeador - Show preview without backend call
    if (isPrimoChambeador) {
      setIsLoading(true);
      
      try {
        // Generate local demo preview (no backend call)
        const demoContractHTML = `
          <div style="position: relative; padding: 40px; font-family: Arial, sans-serif; background: white; color: black;">
            <!-- DEMO WATERMARK -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(255, 193, 7, 0.15); font-weight: bold; pointer-events: none; z-index: 999;">
              DEMO MODE
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a1a; margin-bottom: 10px;">CONSTRUCTION CONTRACT</h1>
              <p style="color: #666;">Demo Preview - Upgrade to Generate Real Contracts</p>
            </div>
            
            <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #ffc107;">
              <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">Project Details</h3>
              <p style="margin: 5px 0;"><strong>Client:</strong> ${editableData.clientName || selectedProject.clientName || 'Client Name'}</p>
              <p style="margin: 5px 0;"><strong>Project:</strong> ${selectedProject.projectType || 'Construction Project'}</p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${(editableData.projectTotal || getCorrectProjectTotal(selectedProject)).toLocaleString()}</p>
            </div>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #1a1a1a;">Contract Terms (Demo Preview)</h3>
              <p style="line-height: 1.6; color: #333;">
                This is a demo preview showing how your professional contract would appear. 
                Upgrade to <strong>Mero Patrón</strong> or higher to generate real, legally-binding contracts 
                with AI-powered legal defense clauses, dual-signature capabilities, and full customization.
              </p>
            </div>
            
            <div style="margin-top: 40px; padding: 20px; background: #fff3cd; border: 2px dashed #ffc107; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: #856404;">🔒 Upgrade to Unlock</h3>
              <p style="margin: 0; color: #856404;">Get access to real contract generation, legal defense, and dual signatures</p>
            </div>
          </div>
        `;
        
        setGeneratedContract(demoContractHTML);
        setContractHTML(demoContractHTML);
        setIsContractReady(true);
        setCurrentStep(3);
        
        toast({
          title: "📋 Demo Preview Generated",
          description: "This is a preview. Upgrade to Mero Patrón to generate real contracts.",
          variant: "default",
        });
        
      } catch (error) {
        console.error("❌ [DEMO-MODE] Error generating demo:", error);
        toast({
          title: "Error",
          description: "Could not generate demo preview",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    let contractPayload = null; // Initialize at function scope

    try {
      // Collect comprehensive contract data
      contractPayload = {
        userId: currentUser.uid,
        client: {
          name:
            editableData.clientName ||
            contractData?.clientInfo?.name ||
            selectedProject.clientName,
          address:
            editableData.clientAddress ||
            contractData?.clientInfo?.address ||
            selectedProject.address ||
            selectedProject.clientAddress ||
            "",
          email:
            editableData.clientEmail ||
            contractData?.clientInfo?.email ||
            selectedProject.clientEmail ||
            "",
          phone:
            editableData.clientPhone ||
            contractData?.clientInfo?.phone ||
            selectedProject.clientPhone ||
            "",
        },
        project: {
          description:
            contractData?.projectDetails?.description ||
            selectedProject.description ||
            selectedProject.projectDescription ||
            selectedProject.projectType ||
            "",
          type: selectedProject.projectType || "Construction Project",
          // CRITICAL FIX: Use the edited projectTotal from user input
          total: editableData.projectTotal || getCorrectProjectTotal(selectedProject),
          materials: contractData?.materials || selectedProject.materials || [],
        },
        contractor: {
          name: profile?.company || profile?.ownerName || "Contractor Name",
          company: profile?.company || "Company Name",
          address: profile?.address
            ? `${profile.address}${profile.city ? `, ${profile.city}` : ""}${profile.state ? `, ${profile.state}` : ""}${profile.zipCode ? ` ${profile.zipCode}` : ""}`
            : "Business Address",
          phone: profile?.phone || profile?.mobilePhone || "Business Phone",
          email: profile?.email || "business@email.com",
          license:
            (profile as any)?.licenseNumber ||
            (profile as any)?.license ||
            "License Number",
        },
        timeline: {
          startDate:
            editableData.startDate || new Date().toISOString().split("T")[0],
          completionDate:
            editableData.completionDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          estimatedDuration:
            editableData.startDate && editableData.completionDate
              ? `${Math.ceil((new Date(editableData.completionDate).getTime() - new Date(editableData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
              : "To be agreed",
        },
        financials: {
          // CRITICAL FIX: Use the edited projectTotal from user input
          total: editableData.projectTotal || getCorrectProjectTotal(selectedProject),
          paymentMilestones: editableData.paymentMilestones,
        },
        permitInfo: {
          required: editableData.permitRequired === "yes",
          responsibility:
            editableData.permitRequired === "yes"
              ? editableData.permitResponsibility
              : "",
          numbers: "",
        },
        warranty: {
          years: editableData.warrantyYears,
        },
        legalClauses: {
          selected: selectedClauses,
          clauses: suggestedClauses.filter((c) =>
            selectedClauses.includes(c.id),
          ),
        },
        insuranceInfo: {
          general: { required: true, amount: "$1,000,000" },
          workers: { required: true, amount: "$500,000" },
          bond: { required: false, amount: "0" },
        },
        warranties: {
          workmanship: "2 years",
          materials: "Manufacturer warranty",
        },
        additionalTerms: "",

        // Pass the complete selected project data for contractor extraction
        originalRequest: selectedProject,
        
        // Multi-Template System: Pass selected template ID (if not default)
        templateId: selectedDocumentType !== 'independent-contractor' ? selectedDocumentType : undefined,
      };

      // CRITICAL VALIDATION: Log financial data for debugging corruption issues
      const displayedTotal =
        selectedProject?.total ||
        selectedProject?.totalAmount ||
        selectedProject?.totalPrice ||
        selectedProject?.displaySubtotal ||
        0;
      console.log(
        "💰 [FRONTEND] Financial data validation before sending to backend:",
        {
          displayedInUI: displayedTotal,
          sentToBackend: contractPayload.financials.total,
          paymentMilestones: contractPayload.financials.paymentMilestones,
          dataMatches: displayedTotal === contractPayload.financials.total,
        },
      );

      console.log("Generating contract with payload:", contractPayload);
      console.log("🔍 [DEBUG] Project type:", selectedProject?.isFromScratch ? 'From Scratch' : 'Existing Project');
      console.log("📋 [MULTI-TEMPLATE] Selected document type:", selectedDocumentType, contractPayload.templateId ? `(using template: ${contractPayload.templateId})` : '(using legacy flow)');

      // First generate contract HTML for legal workflow
      const htmlResponse = await fetch("/api/generate-contract-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(contractPayload),
      });

      console.log("🔍 [DEBUG] HTML Response status:", htmlResponse.status);

      if (htmlResponse.ok) {
        const contractHTMLData = await htmlResponse.json();
        console.log("🔍 [DEBUG] HTML Data received:", {
          hasHtml: !!contractHTMLData.html,
          htmlLength: contractHTMLData.html?.length || 0,
          isFromScratch: selectedProject?.isFromScratch,
          responseKeys: Object.keys(contractHTMLData)
        });
        
        // Use the correct key from response - try both possibilities
        const contractHtmlContent = contractHTMLData.html || contractHTMLData.contractHTML || '';
        
        if (contractHtmlContent) {
          setContractHTML(contractHtmlContent);
          setContractData(contractPayload);
          setIsContractReady(true);
          setCurrentStep(3);

          console.log("🔍 [DEBUG] Contract HTML set successfully:", contractHtmlContent.length, "characters");

          toast({
            title: "Contract Ready for Legal Process",
            description: `Contract generated for ${selectedProject.clientName}. Legal compliance workflow enabled.`,
          });
        } else {
          console.error("🔍 [DEBUG] No HTML content found in response");
          // Try alternative approach: Save contract data and generate simple HTML for signatures
          await handleFallbackContractCreation(contractPayload);
        }
      } else {
        // Fallback to PDF generation if HTML endpoint fails
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.uid}`,
          },
          body: JSON.stringify(contractPayload),
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          console.log("✅ PDF Generation Response:", {
            status: response.status,
            contentType,
            headers: Object.fromEntries(response.headers.entries()),
          });

          if (contentType?.includes("application/pdf")) {
            console.log("📄 PDF content type confirmed - processing...");
          } else {
            console.log(
              "⚠️ Unexpected content type, but response is OK - proceeding...",
            );
          }

          // PDF generated successfully - create basic HTML for legal workflow
          const basicHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
              <h1>Independent Contractor Agreement</h1>
              <p><strong>Contractor:</strong> ${contractPayload.contractor.name}</p>
              <p><strong>Client:</strong> ${contractPayload.client.name}</p>
              <p><strong>Project Total:</strong> $${contractPayload.financials.total.toLocaleString()}</p>
              <p><strong>Project Description:</strong> ${contractPayload.project.description}</p>
              <p>Complete contract details have been generated. Please proceed with the legal compliance workflow.</p>
            </div>
          `;

          // Generate professional HTML for legal workflow
          try {
            const htmlResponse = await fetch("/api/generate-contract-html", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-firebase-uid": currentUser?.uid || "",
              },
              body: JSON.stringify(contractPayload),
            });

            if (htmlResponse.ok) {
              const htmlData = await htmlResponse.json();
              setContractHTML(htmlData.html);
              setIsContractReady(true);
              console.log(
                "✅ Professional contract HTML generated for legal workflow",
                { htmlLength: htmlData.html?.length, isFromScratch: selectedProject?.isFromScratch }
              );
            } else {
              console.warn(
                "⚠️ Failed to generate professional HTML, using basic fallback",
              );
              setContractHTML(basicHTML);
              setIsContractReady(true);
            }
          } catch (htmlError) {
            console.error("HTML generation error:", htmlError);
            setContractHTML(basicHTML);
            setIsContractReady(true);
          }

          setContractData(contractPayload);
          setIsContractReady(true);
          setCurrentStep(3);

          toast({
            title: "Contract Generated",
            description: `Contract ready for legal compliance workflow with ${selectedProject.clientName}`,
          });
        } else {
          const errorText = await response.text();
          console.error("❌ Contract generation failed:", {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            error: errorText,
          });
          throw new Error(
            `Failed to generate contract PDF: ${response.status} - ${response.statusText}. ${errorText}`,
          );
        }
      }
    } catch (error) {
      console.error("❌ Error generating contract:", error as Error);
      console.error("❌ Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack,
        contractPayload: contractPayload
          ? {
              clientName: contractPayload.client?.name,
              contractorName: contractPayload.contractor?.name,
              projectTotal: contractPayload.financials?.total,
            }
          : "Not created yet",
      });

      toast({
        title: "Generation Error",
        description: `Failed to generate contract: ${(error as Error).message || "Unknown error"}. Please check the console for details.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedProject,
    currentUser?.uid,
    profile,
    editableData,
    selectedClauses,
    suggestedClauses,
    getCorrectProjectTotal,
    selectedDocumentType,
    toast,
  ]);

  // Reset to start new contract
  const handleNewContract = useCallback(() => {
    setCurrentStep(1);
    setSelectedProject(null);
    setContractData(null);
    setGeneratedContract("");
    setEditableData({
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      startDate: "",
      completionDate: "",
      permitRequired: "",
      permitResponsibility: "contractor",
      warrantyYears: "1",
      projectTotal: 0, // Reset editable project total
      paymentMilestones: [
        { id: 1, description: "Initial deposit", percentage: 50, amount: 0 },
        { id: 2, description: "Project completion", percentage: 50, amount: 0 },
      ],
    });
    setSuggestedClauses([]);
    setSelectedClauses([]);
    // Reset dual signature state
    setIsDualSignatureActive(false);
    setDualSignatureStatus("");
    setContractorSignUrl("");
    setClientSignUrl("");
    // 🔧 CRITICAL FIX: Reset multi-channel state to allow fresh signature protocol
    setIsMultiChannelActive(false);
    setDeliveryStatus("");
    // Reset document type selector to default
    setSelectedDocumentType("independent-contractor");
  }, []);

  // Dual Signature Handler - Initiate dual signature workflow
  const handleDualSignature = useCallback(async () => {
    if (!selectedProject || !currentUser?.uid || !contractHTML) {
      toast({
        title: "Error",
        description:
          "Contract must be generated before initiating dual signature",
        variant: "destructive",
      });
      return;
    }

    // Check if signature protocol is available (Master Contractor only)
    if (!isSignatureProtocolAvailable()) {
      toast({
        title: "Premium Feature",
        description: "Signature Protocol is available exclusively in Master Contractor plan. Upgrade to unlock professional signature workflows.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsDualSignatureActive(true);
    setDualSignatureStatus("Initiating dual signature workflow...");

    try {
      // Prepare contract data for dual signature
      const dualSignaturePayload = {
        userId: currentUser.uid,
        contractHTML: contractHTML,
        contractData: {
          contractorName:
            profile?.company || profile?.ownerName || "Contractor Name",
          contractorEmail: profile?.email || currentUser.email || "",
          contractorPhone: profile?.phone || profile?.mobilePhone || "",
          contractorCompany: profile?.company || "Company Name",
          clientName: editableData.clientName || selectedProject.clientName,
          clientEmail:
            editableData.clientEmail || selectedProject.clientEmail || "",
          clientPhone:
            editableData.clientPhone || selectedProject.clientPhone || "",
          clientAddress:
            editableData.clientAddress || selectedProject.clientAddress || "",
          projectDescription:
            selectedProject.projectDescription ||
            selectedProject.projectType ||
            "Construction Project",
          totalAmount: getCorrectProjectTotal(selectedProject),
          startDate:
            editableData.startDate || new Date().toISOString().split("T")[0],
          completionDate:
            editableData.completionDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
        },
      };

      console.log(
        "🖊️ [DUAL-SIGNATURE] Initiating dual signature workflow:",
        dualSignaturePayload,
      );

      const response = await fetch("/api/dual-signature/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(dualSignaturePayload),
      });

      if (!response.ok) {
        // 🔐 ENTERPRISE SECURITY: Handle permission errors with upgrade CTAs
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({ message: 'Access denied' }));
          
          // Personalized upgrade message based on plan
          let upgradeMessage = "Upgrade to access contract generation";
          if (isPrimoChambeador) {
            upgradeMessage = "Upgrade to Mero Patrón ($100/mo) to generate real contracts with Legal Defense";
          } else if (isMeroPatron && errorData.message?.includes('limit reached')) {
            upgradeMessage = "You've used all 50 contracts this month. Upgrade to Master Contractor for unlimited contracts.";
          }
          
          toast({
            title: "🔒 Upgrade Required",
            description: upgradeMessage,
            variant: "destructive",
            duration: 6000,
          });
          
          throw new Error(upgradeMessage);
        }
        
        throw new Error(`Dual signature initiation failed: ${response.status}`);
      }

      const result = await response.json();

      setContractorSignUrl(result.contractorSignUrl || "");
      setClientSignUrl(result.clientSignUrl || "");
      setDualSignatureStatus("Dual signature links generated successfully");

      toast({
        title: "Dual Signature Initiated",
        description: `Contract sent to both parties. Contract ID: ${result.contractId}`,
      });
    } catch (error) {
      console.error("❌ [DUAL-SIGNATURE] Error:", error);
      setDualSignatureStatus("Failed to initiate dual signature");
      toast({
        title: "Dual Signature Error",
        description: `Failed to initiate dual signature: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedProject,
    currentUser,
    contractHTML,
    profile,
    editableData,
    getCorrectProjectTotal,
    toast,
  ]);

  // Simplified Signature Protocol Handler - Generate signature links for both parties
  // ✅ REGISTRY-DRIVEN: Uses templateConfigRegistry for template metadata
  const handleStartSignatureProtocol = useCallback(async () => {
    // 🔧 REGISTRY-DRIVEN: Use registry to determine data source instead of hardcoded checks
    const templateId = documentFlowType || 'independent-contractor';
    const dataSource = templateConfigRegistry.getDataSource(templateId);
    const usesContractData = dataSource === 'contract';
    
    // Validate based on template's data source
    if (usesContractData) {
      // Contract-based templates (change-order, lien-waiver, etc.) use contractData
      if (!contractData || !currentUser?.uid || !contractHTML) {
        const templateName = templateConfigRegistry.getTemplateConfig(templateId)?.name || 'Document';
        toast({
          title: "Error",
          description: `${templateName} must be generated before starting signature protocol`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // Project-based templates (independent-contractor) use selectedProject
      if (!selectedProject || !currentUser?.uid || !contractHTML) {
        toast({
          title: "Error",
          description: "Contract must be generated before starting signature protocol",
          variant: "destructive",
        });
        return;
      }
    }

    // Check signature requirements from template registry
    const signatureRequirement = templateConfigRegistry.getSignatureRequirement(templateId);
    if (signatureRequirement === 'none') {
      toast({
        title: "Info",
        description: "This document type does not require signatures",
      });
      return;
    }

    setIsLoading(true);
    // 🔧 CRITICAL FIX: Do NOT set isMultiChannelActive here - only set it AFTER success
    // Previously this caused the button to show "Links Generated" even when the API call failed
    setDeliveryStatus("Generating signature links...");

    try {
      // ✅ REGISTRY-DRIVEN: Build contract data based on template's data source
      const templateName = templateConfigRegistry.getTemplateConfig(templateId)?.name || 'Document';
      
      // Get client data from appropriate source
      const clientName = usesContractData 
        ? (contractData?.client?.name || contractData?.clientName || "Client Name")
        : (editableData.clientName || selectedProject?.clientName || "Client Name");
      
      const clientEmail = usesContractData
        ? (contractData?.client?.email || contractData?.clientEmail || "")
        : (editableData.clientEmail || selectedProject?.clientEmail || "");
      
      const clientPhone = usesContractData
        ? (contractData?.client?.phone || contractData?.clientPhone || "")
        : (editableData.clientPhone || selectedProject?.clientPhone || "");
      
      const clientAddress = usesContractData
        ? (contractData?.client?.address || contractData?.clientAddress || "")
        : (editableData.clientAddress || selectedProject?.clientAddress || "");
      
      // ✅ REGISTRY-DRIVEN: Build project description based on template
      const projectDescription = usesContractData
        ? `${templateName} - ${contractData?.project?.description || contractData?.projectDescription || "Project"}`
        : (selectedProject?.projectDescription || selectedProject?.projectType || "Construction Project");
      
      const totalAmount = usesContractData
        ? (contractData?.financials?.total || contractData?.totalAmount || 0)
        : getCorrectProjectTotal(selectedProject!);
      
      // Prepare contract data for signature protocol
      const secureDeliveryPayload = {
        userId: currentUser.uid,
        contractHTML: contractHTML,
        templateId, // ✅ Include templateId for backend awareness
        signatureRequirement, // ✅ Include signature requirement
        deliveryMethods: { email: false, sms: false, whatsapp: false },
        contractData: {
          contractorName: profile?.company || profile?.ownerName || "Contractor Name",
          contractorEmail: profile?.email || currentUser.email || "",
          contractorPhone: profile?.phone || profile?.mobilePhone || "",
          contractorCompany: profile?.company || "Company Name",
          clientName,
          clientEmail,
          clientPhone,
          clientAddress,
          projectDescription,
          totalAmount,
          startDate: editableData.startDate || new Date().toISOString().split("T")[0],
          completionDate: editableData.completionDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          // ✅ TEMPLATE-SPECIFIC: Include template-specific metadata for backend
          linkedContractId: contractData?.linkedContractId || null,
          templateSpecificData: {
            ...(templateId === 'lien-waiver' && {
              waiverType: contractData?.lienWaiver?.waiverType || 'partial',
            }),
          },
        },
        securityFeatures: {
          encryption: "256-bit SSL",
          verification: true,
          auditTrail: true,
          timeStamps: true,
        },
      };

      console.log(
        "✅ [SIGNATURE-SIMPLE] Starting signature protocol (session-based auth)...",
      );
      console.log(
        `📋 [SIGNATURE-TEMPLATE] Template ID: ${templateId}, Signature Requirement: ${signatureRequirement}`,
      );

      // ✅ CRITICAL FIX: Include Firebase token in Authorization header
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add Firebase token if available
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
          console.log('✅ [AUTH-TOKEN] Firebase token added to request');
        } catch (tokenError) {
          console.warn('⚠️ [AUTH-TOKEN] Could not get Firebase token:', tokenError);
        }
      }

      // Use public endpoint that doesn't require authentication
      const response = await fetch("/api/multi-channel/initiate-public", {
        method: "POST",
        headers,
        credentials: 'include', // Still include cookies if available
        body: JSON.stringify({
          ...secureDeliveryPayload,
          userId: currentUser?.uid || `guest_${Date.now()}` // Provide a userId for tracking
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Signature protocol failed: ${response.status}`;
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please refresh the page and try again.');
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      setContractorSignUrl(result.contractorSignUrl || "");
      setClientSignUrl(result.clientSignUrl || "");

      // 🔧 CRITICAL FIX: Only set isMultiChannelActive AFTER links are successfully generated
      // This ensures the button shows "Links Generated" only when links actually exist
      if (result.contractorSignUrl || result.clientSignUrl) {
        setIsMultiChannelActive(true);
      }
      
      setDeliveryStatus("Signature links generated successfully");

      toast({
        title: "Signature Protocol Started",
        description: `Secure signature links generated. Contract ID: ${result.contractId}`,
      });
    } catch (error) {
      console.error("❌ [SIGNATURE-PROTOCOL] Error:", error);
      setDeliveryStatus("Failed to generate signature links");
      setIsMultiChannelActive(false); // 🔧 CRITICAL FIX: Reset state to allow retry
      toast({
        title: "Signature Protocol Error",
        description: `Failed to generate signature links: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedProject,
    currentUser,
    contractHTML,
    profile,
    editableData,
    getCorrectProjectTotal,
    toast,
    documentFlowType, // ✅ Added for template-aware signature protocol
    contractData, // ✅ Added for Change Order support
  ]);

  // Share functionality for signature links
  const handleCopyToClipboard = useCallback(
    async (url: string, type: string) => {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link Copied",
          description: `${type} signature link copied to clipboard`,
        });
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        toast({
          title: "Copy Failed",
          description: "Failed to copy link to clipboard",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleShareLink = useCallback(
    (url: string, type: string) => {
      if (navigator.share) {
        navigator
          .share({
            title: `Contract Signature - ${type}`,
            text: `Please sign the contract using this secure link`,
            url: url,
          })
          .catch(console.error);
      } else {
        // Fallback to copying to clipboard
        handleCopyToClipboard(url, type);
      }
    },
    [handleCopyToClipboard],
  );

  const handleEmailShare = useCallback((url: string, type: string) => {
    const subject = encodeURIComponent(`Contract Signature Required - ${type}`);
    const body = encodeURIComponent(
      `Please sign the contract using this secure link: ${url}`,
    );
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, "_blank");
  }, []);

  const handleWhatsAppShare = useCallback((url: string, type: string) => {
    const text = encodeURIComponent(
      `Please sign the contract using this secure link: ${url}`,
    );
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, "_blank");
  }, []);

  const handleSMSShare = useCallback((url: string, type: string) => {
    const text = encodeURIComponent(
      `Please sign the contract using this secure link: ${url}`,
    );
    const smsUrl = `sms:?body=${text}`;
    window.open(smsUrl, "_blank");
  }, []);

  // Legal Compliance Workflow - No manual signature handlers needed
  // All signature handling is now done through LegalComplianceWorkflow component

  // Old digital signature handler removed - using LegalComplianceWorkflow instead

  // Contractor name handling moved to LegalComplianceWorkflow component

  // Auto-save trigger when editableData changes
  useEffect(() => {
    // Only trigger auto-save if we have a selected project and user is editing
    if (selectedProject && currentUser?.uid && currentStep === 2) {
      triggerAutoSave();
    }
  }, [
    editableData.clientName,
    editableData.clientEmail,
    editableData.clientPhone,
    editableData.clientAddress,
    editableData.startDate,
    editableData.completionDate,
    editableData.permitResponsibility,
    editableData.warrantyYears,
    editableData.paymentMilestones,
    selectedClauses,
    selectedProject,
    currentUser?.uid,
    currentStep,
    triggerAutoSave,
  ]);

  // Cleanup auto-save timer on component unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // ✅ MIGRATION COMPLETE: All contract data now comes from contractsStore
  // REMOVED legacy useEffect hooks that called load* functions
  // contractsStore auto-loads and auto-refreshes all contract data

  // Load projects from Firebase when component mounts
  useEffect(() => {
    if (currentUser?.uid) {
      loadProjectsFromFirebase();
    }
  }, [currentUser?.uid, loadProjectsFromFirebase]);

  const openUrl = (url: string) => {
    if (!/^https?:\/\//.test(url)) {
      url = `https://${url}`;
    }
    window.open(url, "_blank");
  };

  // AI Enhancement function for project description
  const enhanceProjectDescription = useCallback(async () => {
    if (!scratchContractData.projectDescription || scratchContractData.projectDescription.trim().length < 5) {
      toast({
        title: "Texto insuficiente",
        description: "Por favor, escribe una descripción más detallada para mejorar.",
        variant: "destructive",
      });
      return;
    }

    setIsAIProcessing(true);
    
    try {
      console.log('🤖 Starting Mervin AI enhancement...');
      
      const response = await fetch('/api/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalText: scratchContractData.projectDescription,
          projectType: scratchContractData.projectType
        }),
      });

      if (!response.ok) {
        throw new Error('Error al procesar con Mervin AI');
      }
      
      const result = await response.json();
      console.log('✅ Mervin AI Response:', result);
      
      if (result.enhancedDescription) {
        setScratchContractData(prev => ({ 
          ...prev, 
          projectDescription: result.enhancedDescription 
        }));
        
        toast({
          title: '✨ Mejorado con Mervin AI',
          description: 'La descripción del proyecto ha sido mejorada profesionalmente'
        });
      } else {
        throw new Error('No se pudo generar contenido mejorado');
      }
      
    } catch (error) {
      console.error('Error enhancing with AI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar con Mervin AI. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsAIProcessing(false);
    }
  }, [scratchContractData.projectDescription, scratchContractData.projectType, toast]);

  // Load existing clients for scratch contract creation
  const loadExistingClients = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoadingClients(true);
      const clientsData = await getFirebaseClients();
      setExistingClients(clientsData);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  }, [currentUser?.uid, toast]);

  // Handle existing client selection
  const handleExistingClientSelect = (client: any) => {
    setSelectedExistingClient(client);
    setScratchContractData(prev => ({
      ...prev,
      clientName: client.name || "",
      clientEmail: client.email || "",
      clientPhone: client.phone || "",
      clientAddress: client.address || "",
    }));
  };

  // Create virtual project from scratch data
  const createProjectFromScratch = () => {
    const cost = parseFloat(scratchContractData.projectCost) || 0;
    
    const virtualProject = {
      id: `scratch-${Date.now()}`,
      clientName: scratchContractData.clientName,
      client: scratchContractData.clientName,
      projectType: scratchContractData.projectType,
      projectDescription: scratchContractData.projectDescription,
      address: scratchContractData.clientAddress,
      clientAddress: scratchContractData.clientAddress,
      total: cost,
      totalAmount: cost,
      totalPrice: cost,
      displaySubtotal: cost,
      estimateDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      estimateNumber: `SCRATCH-${Date.now()}`,
      isFromScratch: true,
    };

    return virtualProject;
  };

  // Handle scratch contract progression to Step 2
  const handleScratchContractProceed = () => {
    // Validate required fields
    if (!scratchContractData.clientName.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre del cliente es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!scratchContractData.projectDescription.trim()) {
      toast({
        title: "Campo requerido", 
        description: "La descripción del proyecto es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (!scratchContractData.projectCost.trim() || parseFloat(scratchContractData.projectCost) <= 0) {
      toast({
        title: "Campo requerido",
        description: "El costo del proyecto debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    // Create virtual project and proceed
    const virtualProject = createProjectFromScratch();
    setSelectedProject(virtualProject);
    
    // Calculate project cost once for consistency
    const projectCost = parseFloat(scratchContractData.projectCost) || 0;
    
    // Pre-populate editable data
    setEditableData(prev => ({
      ...prev,
      clientName: scratchContractData.clientName,
      clientEmail: scratchContractData.clientEmail,
      clientPhone: scratchContractData.clientPhone,
      clientAddress: scratchContractData.clientAddress,
      projectTotal: projectCost, // CRITICAL FIX: Initialize projectTotal from scratch data
      paymentMilestones: [
        { id: 1, description: "Initial deposit", percentage: 50, amount: projectCost * 0.5 },
        { id: 2, description: "Project completion", percentage: 50, amount: projectCost * 0.5 },
      ],
    }));

    setCurrentStep(2);
    
    toast({
      title: "Contrato creado",
      description: "Proyecto creado exitosamente. Puedes revisar y personalizar los detalles.",
    });
  };

  // Load clients when switching to existing client mode
  useEffect(() => {
    if (contractCreationMode === "scratch" && clientSelectionMode === "existing") {
      loadExistingClients();
    }
  }, [contractCreationMode, clientSelectionMode, loadExistingClients]);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-cyan-400">
          Legal Defense Contract Generator
        </h1>

        {/* Usage Counter for Limited Plans */}
        {(isMeroPatron || isTrialMaster) && contractLimit !== -1 && (
          <div className="mb-6 flex justify-center">
            <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${
              hasReachedContractLimit 
                ? 'bg-red-900/20 border-red-500/50 text-red-400' 
                : contractsUsed >= contractLimit * 0.8
                  ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400'
                  : 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400'
            }`}>
              <FileCheck className="h-4 w-4" />
              <span className="text-sm font-medium">
                {contractsUsed} / {contractLimit} contracts used this month
              </span>
              {hasReachedContractLimit && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                  LIMIT REACHED
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Unlimited Badge for Master Contractor */}
        {isMasterContractor && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/50">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">
                Unlimited Contracts - Master Contractor
              </span>
            </div>
          </div>
        )}

        {/* View Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-1 flex gap-1 flex-wrap">
            <Button
              variant={currentView === "contracts" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("contracts")}
              className={`flex items-center gap-2 px-4 py-2 ${
                currentView === "contracts"
                  ? "bg-cyan-400 text-black hover:bg-cyan-300"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }`}
            >
              <FileText className="h-4 w-4" />
              New Contract
            </Button>
            <Button
              variant={currentView === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setCurrentView("history");
                loadContractHistory();
                contractsStore.refetch();
              }}
              className={`flex items-center gap-2 px-4 py-2 ${
                currentView === "history"
                  ? "bg-cyan-400 text-black hover:bg-cyan-300"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }`}
            >
              <History className="h-4 w-4" />
              History
              {(contractHistory.length > 0 ||
                contractsStore.completed.length > 0) && (
                <Badge className="bg-cyan-600 text-white ml-1 px-1.5 py-0.5 text-xs">
                  {contractHistory.length + contractsStore.completed.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Contract Generation View */}
        {currentView === "contracts" && (
          <>
            {/* Progress Steps */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`flex items-center space-x-2 ${
                      currentStep >= step ? "text-cyan-400" : "text-gray-500"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        currentStep >= step
                          ? "border-cyan-400 bg-cyan-400 text-black"
                          : "border-gray-500"
                      }`}
                    >
                      {step === 0 ? "✓" : step}
                    </div>
                    <span className="text-sm hidden md:inline">
                      {step === 0 && "Document Type"}
                      {step === 1 && (documentFlowType === 'change-order' ? "Select Contract" : "Select Project")}
                      {step === 2 && "Configure"}
                      {step === 3 && "Complete"}
                    </span>
                    {step < 3 && <div className="w-8 h-0.5 bg-gray-600"></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 0: Document Type Router - Compact Grid with Tabs */}
            {currentStep === 0 && (() => {
              // Categories represent legal document types only (no "Coming Soon" or "Commercial" tabs)
              // Commercial contracts are still contracts - residential/commercial is context, not document type
              const documentCategories = [
                { id: 'contracts', label: 'Contracts', icon: FileCheck },
                { id: 'amendments', label: 'Amendments', icon: Edit2 },
                { id: 'subcontracts', label: 'Subcontracts', icon: Truck },
              ];
              
              // All documents with "coming-soon" as a status within their category
              // Complete legal control panel - all essential documents visible
              const allDocuments = [
                // ═══════════════════════════════════════════════════════════════
                // CONTRACTS - Core contract types contractors use daily
                // ═══════════════════════════════════════════════════════════════
                { id: 'independent-contractor', name: 'Independent Contractor', description: 'New contract from estimate or scratch', category: 'contracts', status: 'active', icon: FileCheck, color: 'cyan' },
                { id: 'lump-sum-contract', name: 'Lump Sum / Fixed Price', description: 'Fixed price for defined scope of work', category: 'contracts', status: 'coming-soon', icon: DollarSign, color: 'green' },
                { id: 'time-materials-contract', name: 'Time & Materials (T&M)', description: 'Hourly labor + materials cost', category: 'contracts', status: 'coming-soon', icon: Clock, color: 'blue' },
                { id: 'cost-plus-contract', name: 'Cost-Plus Contract', description: 'Cost plus markup for evolving scope', category: 'contracts', status: 'coming-soon', icon: Calculator, color: 'purple' },
                { id: 'unit-price-contract', name: 'Unit Price Contract', description: 'Priced per unit (fencing, paving, etc.)', category: 'contracts', status: 'coming-soon', icon: Boxes, color: 'amber' },
                { id: 'commercial-contract', name: 'Commercial Contract', description: 'Commercial project agreement', category: 'contracts', status: 'coming-soon', icon: Building, color: 'emerald' },
                { id: 'lien-waiver', name: 'Lien Waiver', description: 'Release lien rights (Partial or Final)', category: 'contracts', status: 'active', icon: Shield, color: 'green' },
                { id: 'warranty-agreement', name: 'Warranty Agreement', description: 'Warranty terms and conditions', category: 'contracts', status: 'coming-soon', icon: CheckCircle, color: 'teal' },
                { id: 'certificate-completion', name: 'Certificate of Completion', description: 'Project completion certification', category: 'contracts', status: 'coming-soon', icon: FileCheck, color: 'indigo' },
                
                // ═══════════════════════════════════════════════════════════════
                // AMENDMENTS - Modify existing contracts
                // ═══════════════════════════════════════════════════════════════
                { id: 'change-order', name: 'Change Order', description: 'Modify scope, cost, or timeline', category: 'amendments', status: 'active', requiresContract: true, icon: Edit2, color: 'orange' },
                { id: 'contract-addendum', name: 'Contract Addendum', description: 'Add terms to existing contract', category: 'amendments', status: 'coming-soon', requiresContract: true, icon: FileText, color: 'yellow' },
                { id: 'work-order', name: 'Work Order', description: 'Authorize specific work tasks', category: 'amendments', status: 'coming-soon', requiresContract: true, icon: Wrench, color: 'blue' },
                { id: 'scope-clarification', name: 'Scope Clarification Notice', description: 'Document clarifications without price change', category: 'amendments', status: 'coming-soon', requiresContract: true, icon: MessageSquare, color: 'cyan' },
                
                // ═══════════════════════════════════════════════════════════════
                // SUBCONTRACTS - Trade-specific agreements
                // ═══════════════════════════════════════════════════════════════
                { id: 'general-subcontract', name: 'General Subcontractor', description: 'Standard subcontractor agreement', category: 'subcontracts', status: 'coming-soon', icon: Truck, color: 'purple' },
                { id: 'roofing-subcontract', name: 'Roofing Subcontract', description: 'Roofing trade agreement', category: 'subcontracts', status: 'coming-soon', icon: Home, color: 'red' },
                { id: 'electrical-subcontract', name: 'Electrical Subcontract', description: 'Electrical trade agreement', category: 'subcontracts', status: 'coming-soon', icon: Zap, color: 'yellow' },
                { id: 'plumbing-subcontract', name: 'Plumbing Subcontract', description: 'Plumbing trade agreement', category: 'subcontracts', status: 'coming-soon', icon: Droplets, color: 'blue' },
                { id: 'hvac-subcontract', name: 'HVAC Subcontract', description: 'HVAC trade agreement', category: 'subcontracts', status: 'coming-soon', icon: Wind, color: 'cyan' },
                { id: 'concrete-subcontract', name: 'Concrete Subcontract', description: 'Concrete trade agreement', category: 'subcontracts', status: 'coming-soon', icon: Square, color: 'gray' },
                { id: 'framing-subcontract', name: 'Framing Subcontract', description: 'Framing trade agreement', category: 'subcontracts', status: 'coming-soon', icon: Frame, color: 'amber' },
                { id: 'drywall-subcontract', name: 'Drywall Subcontract', description: 'Drywall trade agreement', category: 'subcontracts', status: 'coming-soon', icon: LayoutGrid, color: 'slate' },
                { id: 'painting-subcontract', name: 'Painting Subcontract', description: 'Painting trade agreement', category: 'subcontracts', status: 'coming-soon', icon: Paintbrush, color: 'pink' },
                { id: 'landscaping-subcontract', name: 'Landscaping Subcontract', description: 'Landscaping trade agreement', category: 'subcontracts', status: 'coming-soon', icon: TreePine, color: 'green' },
              ];
              
              // Filter shows ALL documents in a category (active + coming-soon)
              // Active documents appear first, then coming-soon
              const filteredDocs = allDocuments
                .filter(doc => {
                  const matchesCategory = doc.category === docCategory;
                  const matchesSearch = !docSearch.trim() || 
                    doc.name.toLowerCase().includes(docSearch.toLowerCase()) ||
                    doc.description.toLowerCase().includes(docSearch.toLowerCase());
                  return matchesCategory && matchesSearch;
                })
                .sort((a, b) => {
                  // Active documents first, then coming-soon
                  if (a.status === 'active' && b.status !== 'active') return -1;
                  if (a.status !== 'active' && b.status === 'active') return 1;
                  return 0;
                });
              
              const handleDocSelect = (doc: typeof allDocuments[0]) => {
                if (doc.status === 'coming-soon') return;
                // 🔧 Set documentFlowType for ALL active template types
                if (doc.id === 'independent-contractor') {
                  setDocumentFlowType('independent-contractor');
                } else if (doc.id === 'change-order') {
                  setDocumentFlowType('change-order');
                } else if (doc.id === 'lien-waiver') {
                  setDocumentFlowType('lien-waiver');
                }
                setSelectedDocumentType(doc.id);
                setCurrentStep(1);
              };
              
              const getStatusBadge = (doc: typeof allDocuments[0]) => {
                if (doc.status === 'coming-soon') {
                  return <Badge className="bg-gray-700 text-gray-400 text-[10px] px-1.5">Coming Soon</Badge>;
                }
                if (doc.requiresContract) {
                  return <Badge className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5">Requires Contract</Badge>;
                }
                return <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] px-1.5">Active</Badge>;
              };
              
              return (
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-cyan-400 text-lg">
                      <FileText className="h-5 w-5" />
                      Select Document Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search documents..."
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 h-9"
                        data-testid="input-doc-search"
                      />
                    </div>
                    
                    {/* Category Tabs - shows total docs per category (active + coming-soon) */}
                    <div className="flex flex-wrap gap-1 p-1 bg-gray-800/50 rounded-lg">
                      {documentCategories.map((cat) => {
                        const IconComponent = cat.icon;
                        const categoryDocs = allDocuments.filter(d => d.category === cat.id);
                        const totalCount = categoryDocs.length;
                        const activeCount = categoryDocs.filter(d => d.status === 'active').length;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setDocCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              docCategory === cat.id
                                ? 'bg-cyan-400 text-black'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                            data-testid={`tab-${cat.id}`}
                          >
                            <IconComponent className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{cat.label}</span>
                            <span className="text-[10px] opacity-70">
                              ({activeCount}{totalCount > activeCount ? `/${totalCount}` : ''})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Compact Document Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
                      {filteredDocs.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No documents found</p>
                        </div>
                      ) : (
                        filteredDocs.map((doc) => {
                          const IconComponent = doc.icon;
                          const isDisabled = doc.status === 'coming-soon';
                          const isSelected = (doc.id === 'independent-contractor' && documentFlowType === 'independent-contractor') ||
                                           (doc.id === 'change-order' && documentFlowType === 'change-order') ||
                                           (doc.id === 'lien-waiver' && documentFlowType === 'lien-waiver');
                          return (
                            <button
                              key={doc.id}
                              onClick={() => handleDocSelect(doc)}
                              disabled={isDisabled}
                              className={`group relative flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                                isDisabled
                                  ? 'border-gray-700/50 bg-gray-800/30 cursor-not-allowed opacity-60'
                                  : isSelected
                                    ? `border-${doc.color}-400 bg-${doc.color}-400/10`
                                    : 'border-gray-700 bg-gray-800/50 hover:border-cyan-400 hover:bg-gray-800'
                              }`}
                              data-testid={`tile-${doc.id}`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${
                                isDisabled ? 'bg-gray-700/50 text-gray-500' : `bg-${doc.color}-500/20 text-${doc.color}-400`
                              }`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className={`font-medium text-sm truncate ${isDisabled ? 'text-gray-500' : 'text-white'}`}>
                                    {doc.name}
                                  </h4>
                                  {getStatusBadge(doc)}
                                </div>
                                <p className={`text-xs mt-0.5 line-clamp-1 ${isDisabled ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {doc.description}
                                </p>
                              </div>
                              {isDisabled && (
                                <Lock className="absolute top-2 right-2 h-3 w-3 text-gray-600" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Step 1: Project Selection (Independent Contractor Flow) */}
            {currentStep === 1 && documentFlowType === 'independent-contractor' && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cyan-400">
                    <Database className="h-5 w-5" />
                    Step 1: Select Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Creation Mode Selection */}
                  <Tabs value={contractCreationMode} onValueChange={(value) => setContractCreationMode(value as "existing" | "scratch")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800 border-gray-700">
                      <TabsTrigger value="existing" className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black">
                        From Existing Project
                      </TabsTrigger>
                      <TabsTrigger value="scratch" className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black">
                        Create from Scratch
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="space-y-4">
                  {/* Search and Refresh Controls */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search projects by client name, type, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadProjectsFromFirebase}
                      disabled={isLoading}
                      className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading projects...
                        </p>
                      </div>
                    ) : projects.length > 0 ? (
                      <div className="space-y-3">
                        {(() => {
                          // Filter projects based on search term
                          const filteredProjects = projects.filter(
                            (project) => {
                              if (!searchTerm.trim()) return true;

                              const searchLower = searchTerm.toLowerCase();
                              const clientName = (
                                project.clientName || ""
                              ).toLowerCase();
                              const projectType = (
                                project.projectType || ""
                              ).toLowerCase();
                              const description = (
                                project.projectDescription || ""
                              ).toLowerCase();
                              const address = (
                                project.address || ""
                              ).toLowerCase();

                              return (
                                clientName.includes(searchLower) ||
                                projectType.includes(searchLower) ||
                                description.includes(searchLower) ||
                                address.includes(searchLower)
                              );
                            },
                          );

                          // Show only 2-3 projects by default (unless searching or showing all)
                          const displayProjects =
                            searchTerm.trim() || showAllProjects
                              ? filteredProjects
                              : filteredProjects.slice(0, 3);

                          return (
                            <>
                              {displayProjects.map((project) => (
                                <div
                                  key={project.id}
                                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-cyan-400 hover:bg-gray-800/80 cursor-pointer transition-all duration-200"
                                  onClick={() => handleProjectSelect(project)}
                                >
                                  {/* Project content */}
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-white truncate">
                                          {project.clientName ||
                                            project.client?.name ||
                                            project.client ||
                                            `Project ${project.estimateNumber || project.id}`}
                                        </h3>
                                        <p className="text-cyan-400 font-semibold text-sm mt-1">
                                          $
                                          {getCorrectProjectTotal(
                                            project,
                                          ).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </p>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                                      >
                                        Select
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="flex items-center gap-1">
                                        <Wrench className="h-3 w-3 text-gray-400" />
                                        <span className="text-gray-400">
                                          {project.projectType ||
                                            "Construction"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-gray-400" />
                                        <span className="text-gray-400">
                                          {new Date(
                                            project.estimateDate ||
                                              project.createdAt ||
                                              Date.now(),
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>

                                    {project.address && (
                                      <p className="text-xs text-gray-400 truncate">
                                        📍 {project.address}
                                      </p>
                                    )}

                                    {project.projectDescription && (
                                      <p className="text-xs text-gray-300 line-clamp-2">
                                        {project.projectDescription}
                                      </p>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {project.estimateNumber ||
                                          `EST-${project.id.slice(-6)}`}
                                      </Badge>
                                      <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <Shield className="h-3 w-3" />
                                        <span>Ready for Contract</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Show More/Less Button */}
                              {!searchTerm.trim() &&
                                filteredProjects.length > 3 && (
                                  <div className="text-center pt-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setShowAllProjects(!showAllProjects)
                                      }
                                      className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                                    >
                                      {showAllProjects ? (
                                        <>
                                          <Eye className="h-4 w-4 mr-2" />
                                          Show Less (
                                          {filteredProjects.length - 3} hidden)
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-4 w-4 mr-2" />
                                          Show All ({
                                            filteredProjects.length
                                          }{" "}
                                          total)
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}

                              {/* Search Results Info */}
                              {searchTerm.trim() && (
                                <div className="text-center py-4">
                                  <p className="text-sm text-cyan-400">
                                    {filteredProjects.length} project
                                    {filteredProjects.length !== 1
                                      ? "s"
                                      : ""}{" "}
                                    found for "{searchTerm}"
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400">
                          No approved projects found
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Create an estimate first to generate contracts
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Back Button for Existing Tab */}
                  <div className="flex justify-start pt-4 border-t border-gray-700 mt-4">
                    <Button
                      onClick={() => setCurrentStep(0)}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      data-testid="button-back-step1-existing"
                    >
                      Back
                    </Button>
                  </div>
                    </TabsContent>

                    {/* Create from Scratch Tab */}
                    <TabsContent value="scratch" className="space-y-6">
                      <div className="text-center mb-6">
                        <p className="text-gray-400">
                          Create a contract from scratch by providing basic project information
                        </p>
                      </div>

                      {/* Client Selection Mode */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-cyan-400">Client Information</h3>
                        
                        <Tabs value={clientSelectionMode} onValueChange={(value) => setClientSelectionMode(value as "existing" | "new")}>
                          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
                            <TabsTrigger value="new" className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black">
                              New Client
                            </TabsTrigger>
                            <TabsTrigger value="existing" className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black">
                              Existing Client
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="new" className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Client Name *
                                </label>
                                <Input
                                  value={scratchContractData.clientName}
                                  onChange={(e) => setScratchContractData(prev => ({ ...prev, clientName: e.target.value }))}
                                  placeholder="John Doe"
                                  className="bg-gray-800 border-gray-600 text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Email
                                </label>
                                <Input
                                  type="email"
                                  value={scratchContractData.clientEmail}
                                  onChange={(e) => setScratchContractData(prev => ({ ...prev, clientEmail: e.target.value }))}
                                  placeholder="john@example.com"
                                  className="bg-gray-800 border-gray-600 text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Phone
                                </label>
                                <Input
                                  value={scratchContractData.clientPhone}
                                  onChange={(e) => setScratchContractData(prev => ({ ...prev, clientPhone: e.target.value }))}
                                  placeholder="(555) 123-4567"
                                  className="bg-gray-800 border-gray-600 text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Address
                                </label>
                                <AddressAutocomplete
                                  value={scratchContractData.clientAddress}
                                  onChange={(address) => setScratchContractData(prev => ({ ...prev, clientAddress: address }))}
                                  placeholder="123 Main St, City, State ZIP"
                                  className="bg-gray-800 border-gray-600 text-white"
                                />
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="existing" className="space-y-4 mt-4">
                            {isLoadingClients ? (
                              <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto"></div>
                                <p className="mt-2 text-gray-400">Loading clients...</p>
                              </div>
                            ) : existingClients.length > 0 ? (
                              <>
                                {/* Search Input */}
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input
                                    type="text"
                                    placeholder="Search by name, email or phone..."
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                  />
                                </div>
                                
                                {/* Client List */}
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {existingClients
                                    .filter((client) => {
                                      if (!clientSearchTerm.trim()) return true;
                                      const searchLower = clientSearchTerm.toLowerCase();
                                      return (
                                        client.name?.toLowerCase().includes(searchLower) ||
                                        client.email?.toLowerCase().includes(searchLower) ||
                                        client.phone?.toLowerCase().includes(searchLower)
                                      );
                                    })
                                    .map((client) => (
                                      <div
                                        key={client.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                          selectedExistingClient?.id === client.id
                                            ? "border-cyan-400 bg-cyan-400/10"
                                            : "border-gray-600 hover:border-gray-500"
                                        }`}
                                        onClick={() => handleExistingClientSelect(client)}
                                      >
                                        <div className="font-medium text-cyan-400">{client.name}</div>
                                        {client.email && (
                                          <div className="text-sm text-gray-400">{client.email}</div>
                                        )}
                                        {client.phone && (
                                          <div className="text-sm text-gray-400">{client.phone}</div>
                                        )}
                                      </div>
                                    ))}
                                  
                                  {/* No results message */}
                                  {existingClients.filter((client) => {
                                    if (!clientSearchTerm.trim()) return true;
                                    const searchLower = clientSearchTerm.toLowerCase();
                                    return (
                                      client.name?.toLowerCase().includes(searchLower) ||
                                      client.email?.toLowerCase().includes(searchLower) ||
                                      client.phone?.toLowerCase().includes(searchLower)
                                    );
                                  }).length === 0 && (
                                    <div className="text-center py-4">
                                      <p className="text-gray-400">No clients match your search</p>
                                      <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-gray-400">No existing clients found</p>
                                <p className="text-sm text-gray-500 mt-1">Create your first client in the new client tab</p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>

                      {/* Project Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-cyan-400">Project Information</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Project Type *
                            </label>
                            <select
                              value={scratchContractData.projectType}
                              onChange={(e) => setScratchContractData(prev => ({ ...prev, projectType: e.target.value }))}
                              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                            >
                              {/* Fencing & Outdoor Structures */}
                              <optgroup label="🏡 Cercas y Estructuras Exteriores">
                                <option value="Fence Installation - Wood">Fence Installation - Wood</option>
                                <option value="Fence Installation - Vinyl">Fence Installation - Vinyl</option>
                                <option value="Fence Installation - Chain Link">Fence Installation - Chain Link</option>
                                <option value="Fence Installation - Aluminum">Fence Installation - Aluminum</option>
                                <option value="Fence Installation - Iron/Steel">Fence Installation - Iron/Steel</option>
                                <option value="Fence Repair & Maintenance">Fence Repair & Maintenance</option>
                                <option value="Gate Installation & Automation">Gate Installation & Automation</option>
                                <option value="Retaining Wall Construction">Retaining Wall Construction</option>
                                <option value="Privacy Screen Installation">Privacy Screen Installation</option>
                              </optgroup>

                              {/* Residential Construction */}
                              <optgroup label="🏠 Construcción Residencial">
                                <option value="New Home Construction">New Home Construction</option>
                                <option value="Home Addition">Home Addition</option>
                                <option value="ADU Construction">ADU Construction (Accessory Dwelling Unit)</option>
                                <option value="Garage Construction">Garage Construction</option>
                                <option value="Basement Finishing">Basement Finishing</option>
                                <option value="Attic Conversion">Attic Conversion</option>
                                <option value="Custom Home Building">Custom Home Building</option>
                              </optgroup>

                              {/* Commercial Construction */}
                              <optgroup label="🏢 Construcción Comercial">
                                <option value="Commercial Building Construction">Commercial Building Construction</option>
                                <option value="Office Build-Out">Office Build-Out</option>
                                <option value="Retail Space Construction">Retail Space Construction</option>
                                <option value="Restaurant Construction">Restaurant Construction</option>
                                <option value="Warehouse Construction">Warehouse Construction</option>
                                <option value="Industrial Facility Construction">Industrial Facility Construction</option>
                                <option value="Mixed-Use Development">Mixed-Use Development</option>
                              </optgroup>

                              {/* Remodeling & Renovation */}
                              <optgroup label="🔨 Remodelación y Renovación">
                                <option value="Kitchen Remodeling">Kitchen Remodeling</option>
                                <option value="Bathroom Remodeling">Bathroom Remodeling</option>
                                <option value="Whole House Renovation">Whole House Renovation</option>
                                <option value="Room Addition">Room Addition</option>
                                <option value="Interior Renovation">Interior Renovation</option>
                                <option value="Exterior Renovation">Exterior Renovation</option>
                                <option value="Historic Restoration">Historic Restoration</option>
                              </optgroup>

                              {/* Outdoor & Landscaping */}
                              <optgroup label="🌿 Exteriores y Paisajismo">
                                <option value="Deck Construction - Wood">Deck Construction - Wood</option>
                                <option value="Deck Construction - Composite">Deck Construction - Composite</option>
                                <option value="Patio Construction">Patio Construction</option>
                                <option value="Pergola Installation">Pergola Installation</option>
                                <option value="Gazebo Construction">Gazebo Construction</option>
                                <option value="Outdoor Kitchen">Outdoor Kitchen</option>
                                <option value="Pool Deck Construction">Pool Deck Construction</option>
                                <option value="Landscape Construction">Landscape Construction</option>
                                <option value="Hardscaping">Hardscaping</option>
                                <option value="Driveway Installation">Driveway Installation</option>
                                <option value="Walkway Installation">Walkway Installation</option>
                              </optgroup>

                              {/* Specialized Services */}
                              <optgroup label="⚙️ Servicios Especializados">
                                <option value="Concrete Work">Concrete Work</option>
                                <option value="Masonry Work">Masonry Work</option>
                                <option value="Stonework">Stonework</option>
                                <option value="Tile Installation">Tile Installation</option>
                                <option value="Flooring Installation">Flooring Installation</option>
                                <option value="Drywall Installation">Drywall Installation</option>
                                <option value="Insulation Installation">Insulation Installation</option>
                                <option value="Siding Installation">Siding Installation</option>
                                <option value="Windows & Doors Installation">Windows & Doors Installation</option>
                                <option value="Cabinetry Installation">Cabinetry Installation</option>
                              </optgroup>

                              {/* Roofing & Exteriors */}
                              <optgroup label="🏠 Techos y Exteriores">
                                <option value="Roof Installation">Roof Installation</option>
                                <option value="Roof Repair">Roof Repair</option>
                                <option value="Roof Replacement">Roof Replacement</option>
                                <option value="Gutter Installation">Gutter Installation</option>
                                <option value="Exterior Painting">Exterior Painting</option>
                                <option value="Pressure Washing">Pressure Washing</option>
                              </optgroup>

                              {/* Maintenance & Repair */}
                              <optgroup label="🔧 Mantenimiento y Reparación">
                                <option value="General Maintenance">General Maintenance</option>
                                <option value="Handyman Services">Handyman Services</option>
                                <option value="Property Maintenance">Property Maintenance</option>
                                <option value="Emergency Repairs">Emergency Repairs</option>
                                <option value="Preventive Maintenance">Preventive Maintenance</option>
                                <option value="Seasonal Maintenance">Seasonal Maintenance</option>
                              </optgroup>

                              {/* Cleaning Services */}
                              <optgroup label="🧹 Servicios de Limpieza">
                                <option value="Construction Cleanup">Construction Cleanup</option>
                                <option value="Post-Construction Cleaning">Post-Construction Cleaning</option>
                                <option value="Deep Cleaning Services">Deep Cleaning Services</option>
                                <option value="Move-In/Move-Out Cleaning">Move-In/Move-Out Cleaning</option>
                                <option value="Commercial Cleaning">Commercial Cleaning</option>
                                <option value="Janitorial Services">Janitorial Services</option>
                              </optgroup>

                              {/* Demolition & Site Prep */}
                              <optgroup label="💥 Demolición y Preparación">
                                <option value="Demolition Services">Demolition Services</option>
                                <option value="Site Preparation">Site Preparation</option>
                                <option value="Excavation Services">Excavation Services</option>
                                <option value="Land Clearing">Land Clearing</option>
                                <option value="Debris Removal">Debris Removal</option>
                                <option value="Junk Removal">Junk Removal</option>
                              </optgroup>

                              {/* Electrical & Plumbing */}
                              <optgroup label="⚡ Servicios Técnicos">
                                <option value="Electrical Work">Electrical Work</option>
                                <option value="Plumbing Installation">Plumbing Installation</option>
                                <option value="HVAC Installation">HVAC Installation</option>
                                <option value="Solar Panel Installation">Solar Panel Installation</option>
                                <option value="Smart Home Installation">Smart Home Installation</option>
                              </optgroup>

                              {/* Other/Custom */}
                              <optgroup label="📋 Otros">
                                <option value="General Construction">General Construction</option>
                                <option value="Custom Project">Custom Project</option>
                                <option value="Consultation Services">Consultation Services</option>
                                <option value="Project Management">Project Management</option>
                                <option value="Other">Other</option>
                              </optgroup>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Project Cost *
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={scratchContractData.projectCost}
                              onChange={(e) => setScratchContractData(prev => ({ ...prev, projectCost: e.target.value }))}
                              placeholder="2500.00"
                              className="bg-gray-800 border-gray-600 text-white"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Project Description *
                          </label>
                          <div className="relative">
                            <textarea
                              value={scratchContractData.projectDescription}
                              onChange={(e) => setScratchContractData(prev => ({ ...prev, projectDescription: e.target.value }))}
                              placeholder="Describe the project scope, materials, and work to be performed..."
                              rows={4}
                              className="w-full p-3 pr-12 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 resize-none"
                            />
                            
                            {/* AI Enhancement Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={enhanceProjectDescription}
                              disabled={isAIProcessing || !scratchContractData.projectDescription || scratchContractData.projectDescription.trim().length < 5}
                              className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300"
                              title="Enhance with Mervin AI"
                            >
                              {isAIProcessing ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                              ) : (
                                <Brain className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          
                          {/* AI Enhancement Hint */}
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Tip: Write a basic description, then click the AI button to enhance it professionally
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-between pt-4">
                        <Button
                          onClick={() => setCurrentStep(0)}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          data-testid="button-back-step1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleScratchContractProceed}
                          className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6 py-2"
                        >
                          Create Contract
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Contract Selection (Change Order Flow) */}
            {currentStep === 1 && documentFlowType === 'change-order' && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-400">
                    <FileText className="h-5 w-5" />
                    Step 1: Select Existing Contract
                  </CardTitle>
                  <p className="text-gray-400 text-sm mt-2">
                    Choose the contract you want to modify with a Change Order
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Contract Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search contracts by client name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      data-testid="input-contract-search"
                    />
                  </div>

                  {/* Contract List - Uses contractsStore.completed */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {contractsStore.isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">Loading contracts...</p>
                      </div>
                    ) : (() => {
                      // Filter completed contracts for Change Order
                      const allContracts = [
                        ...contractsStore.completed,
                        ...contractsStore.inProgress,
                      ].filter(contract => {
                        if (!searchTerm.trim()) return true;
                        const searchLower = searchTerm.toLowerCase();
                        const clientName = (contract.clientName || '').toLowerCase();
                        return clientName.includes(searchLower);
                      });

                      if (allContracts.length === 0) {
                        return (
                          <div className="text-center py-8 border border-dashed border-gray-600 rounded-lg">
                            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                            <p className="text-gray-400">No contracts found</p>
                            <p className="text-gray-500 text-sm mt-1">
                              You need to complete at least one contract before creating a Change Order
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4 border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black"
                              onClick={() => {
                                setDocumentFlowType('independent-contractor');
                                setCurrentStep(0);
                              }}
                            >
                              Create New Contract First
                            </Button>
                          </div>
                        );
                      }

                      return allContracts.map((contract: any) => (
                        <div
                          key={contract.contractId || contract.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedContract?.contractId === contract.contractId
                              ? 'border-orange-400 bg-orange-400/10'
                              : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                          }`}
                          onClick={() => setSelectedContract(contract)}
                          data-testid={`contract-item-${contract.contractId || contract.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white">{contract.clientName}</h4>
                                <Badge variant="outline" className={`text-xs ${
                                  contract.status === 'completed' 
                                    ? 'border-green-500 text-green-400' 
                                    : 'border-blue-500 text-blue-400'
                                }`}>
                                  {contract.status === 'completed' ? 'Completed' : 'In Progress'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                Contract #{(contract.contractId || contract.id || '').slice(-6)}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${(normalizeCurrency(contract.totalAmount) || 0).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {contract.createdAt 
                                    ? new Date(contract.createdAt.seconds ? contract.createdAt.seconds * 1000 : contract.createdAt).toLocaleDateString()
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            </div>
                            {selectedContract?.contractId === contract.contractId && (
                              <CheckCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-6 pt-4 border-t border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(0)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      data-testid="button-back-to-step-0"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedContract) {
                          // Prepare base data for DynamicTemplateConfigurator
                          // Client info is stored inside contractData.client, not as direct properties
                          const clientData = selectedContract.contractData?.client || {};
                          const financials = selectedContract.contractData?.financials || {};
                          
                          // Extract contract date (signedDate or createdAt)
                          const contractCreatedAt = selectedContract.createdAt?.seconds 
                            ? new Date(selectedContract.createdAt.seconds * 1000).toISOString()
                            : selectedContract.createdAt instanceof Date 
                              ? selectedContract.createdAt.toISOString()
                              : typeof selectedContract.createdAt === 'string'
                                ? selectedContract.createdAt
                                : new Date().toISOString();
                          
                          const projectData = selectedContract.contractData?.project || {};
                          
                          // Extract contractor data from the original contract or use current profile
                          const contractorData = selectedContract.contractData?.contractor || {};
                          
                          const baseData = {
                            client: {
                              name: selectedContract.clientName || clientData.name || '',
                              address: clientData.address || '',
                              email: clientData.email || '',
                              phone: clientData.phone || '',
                            },
                            contractor: {
                              name: contractorData.name || profile?.company || profile?.ownerName || 'Contractor Name',
                              company: contractorData.company || profile?.company || 'Company Name',
                              address: contractorData.address || profile?.address || '',
                              phone: contractorData.phone || profile?.phone || '',
                              email: contractorData.email || profile?.email || '',
                              license: contractorData.license || (profile as any)?.licenseNumber || '',
                            },
                            project: {
                              type: projectData.type || selectedContract.projectType || 'Construction',
                              location: projectData.location || clientData.address || '',
                            },
                            financials: {
                              total: normalizeCurrency(selectedContract.totalAmount) || normalizeCurrency(financials.total) || 0,
                            },
                            linkedContractId: selectedContract.contractId || selectedContract.id,
                            signedDate: selectedContract.signedDate || contractCreatedAt,
                            createdAt: contractCreatedAt,
                          };
                          setContractData(baseData);
                          setCurrentStep(2);
                        }
                      }}
                      disabled={!selectedContract}
                      className="bg-orange-400 text-black hover:bg-orange-300 disabled:opacity-50"
                      data-testid="button-continue-to-step-2"
                    >
                      Continue to Configure Change Order
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Contract Selection (Lien Waiver Flow) */}
            {currentStep === 1 && documentFlowType === 'lien-waiver' && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-400">
                    <Shield className="h-5 w-5" />
                    Step 1: Select Contract for Lien Waiver
                  </CardTitle>
                  <p className="text-gray-400 text-sm mt-2">
                    Choose the contract you want to release lien rights for
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Contract Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search contracts by client name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      data-testid="input-lien-waiver-contract-search"
                    />
                  </div>

                  {/* Contract List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {contractsStore.isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">Loading contracts...</p>
                      </div>
                    ) : (() => {
                      // Filter completed and in-progress contracts for Lien Waiver
                      const allContracts = [
                        ...contractsStore.completed,
                        ...contractsStore.inProgress,
                      ].filter(contract => {
                        if (!searchTerm.trim()) return true;
                        const searchLower = searchTerm.toLowerCase();
                        const clientName = (contract.clientName || '').toLowerCase();
                        return clientName.includes(searchLower);
                      });

                      if (allContracts.length === 0) {
                        return (
                          <div className="text-center py-8 border border-dashed border-gray-600 rounded-lg">
                            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                            <p className="text-gray-400">No contracts found</p>
                            <p className="text-gray-500 text-sm mt-1">
                              You need to have at least one contract before creating a Lien Waiver
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4 border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                              onClick={() => {
                                setDocumentFlowType('independent-contractor');
                                setCurrentStep(0);
                              }}
                            >
                              Create New Contract First
                            </Button>
                          </div>
                        );
                      }

                      return allContracts.map((contract: any) => (
                        <div
                          key={contract.contractId || contract.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedContract?.contractId === contract.contractId
                              ? 'border-green-400 bg-green-400/10'
                              : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                          }`}
                          onClick={() => setSelectedContract(contract)}
                          data-testid={`lien-waiver-contract-item-${contract.contractId || contract.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white">{contract.clientName}</h4>
                                <Badge variant="outline" className={`text-xs ${
                                  contract.status === 'completed' 
                                    ? 'border-green-500 text-green-400' 
                                    : 'border-blue-500 text-blue-400'
                                }`}>
                                  {contract.status === 'completed' ? 'Completed' : 'In Progress'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                Contract #{(contract.contractId || contract.id || '').slice(-6)}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${(normalizeCurrency(contract.totalAmount) || 0).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {contract.createdAt 
                                    ? new Date(contract.createdAt.seconds ? contract.createdAt.seconds * 1000 : contract.createdAt).toLocaleDateString()
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            </div>
                            {selectedContract?.contractId === contract.contractId && (
                              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-6 pt-4 border-t border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(0)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      data-testid="button-lien-waiver-back-to-step-0"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedContract) {
                          // Prepare base data for DynamicTemplateConfigurator
                          const clientData = selectedContract.contractData?.client || {};
                          const financials = selectedContract.contractData?.financials || {};
                          
                          const contractCreatedAt = selectedContract.createdAt?.seconds 
                            ? new Date(selectedContract.createdAt.seconds * 1000).toISOString()
                            : selectedContract.createdAt instanceof Date 
                              ? selectedContract.createdAt.toISOString()
                              : typeof selectedContract.createdAt === 'string'
                                ? selectedContract.createdAt
                                : new Date().toISOString();
                          
                          const projectData = selectedContract.contractData?.project || {};
                          const contractorData = selectedContract.contractData?.contractor || {};
                          
                          const baseData = {
                            client: {
                              name: selectedContract.clientName || clientData.name || '',
                              address: clientData.address || '',
                              email: clientData.email || '',
                              phone: clientData.phone || '',
                            },
                            contractor: {
                              name: contractorData.name || profile?.company || profile?.ownerName || 'Contractor Name',
                              company: contractorData.company || profile?.company || 'Company Name',
                              address: contractorData.address || profile?.address || '',
                              phone: contractorData.phone || profile?.phone || '',
                              email: contractorData.email || profile?.email || '',
                              license: contractorData.license || (profile as any)?.licenseNumber || '',
                            },
                            project: {
                              type: projectData.type || selectedContract.projectType || 'Construction',
                              location: projectData.location || clientData.address || '',
                            },
                            financials: {
                              total: normalizeCurrency(selectedContract.totalAmount) || normalizeCurrency(financials.total) || 0,
                            },
                            linkedContractId: selectedContract.contractId || selectedContract.id,
                            signedDate: selectedContract.signedDate || contractCreatedAt,
                            createdAt: contractCreatedAt,
                          };
                          setContractData(baseData);
                          setCurrentStep(2);
                        }
                      }}
                      disabled={!selectedContract}
                      className="bg-green-500 text-black hover:bg-green-400 disabled:opacity-50"
                      data-testid="button-lien-waiver-continue-to-step-2"
                    >
                      Continue to Configure Lien Waiver
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Review & Generate (Independent Contractor Flow) */}
            {currentStep === 2 && selectedProject && documentFlowType === 'independent-contractor' && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cyan-400">
                    <Eye className="h-5 w-5" />
                    Step 2: Review & Customize Contract
                  </CardTitle>

                  {/* Auto-save Status Indicator */}
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      {autoSaveStatus === "saving" && (
                        <>
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                          <span className="text-yellow-400">
                            Saving changes...
                          </span>
                        </>
                      )}
                      {autoSaveStatus === "saved" && (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-400">
                            Changes saved{" "}
                            {lastAutoSave &&
                              `at ${lastAutoSave.toLocaleTimeString()}`}
                          </span>
                        </>
                      )}
                      {autoSaveStatus === "error" && (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-400">
                            Error saving changes
                          </span>
                        </>
                      )}
                      {autoSaveStatus === "idle" && (
                        <>
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span className="text-gray-400">
                            Auto-save enabled
                          </span>
                        </>
                      )}
                    </div>
                    {currentContractId && (
                      <span className="text-xs text-gray-500 font-mono">
                        ID: {currentContractId.slice(-8)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* PARALLEL ARCHITECTURE: Dynamic templates use DynamicTemplateConfigurator */}
                  {templateConfigRegistry.needsDynamicConfig(selectedDocumentType) ? (() => {
                    // ✅ FIX: Lien waiver and change-order use contractData, not selectedProject
                    const usesContractDataSource = documentFlowType === 'lien-waiver' || documentFlowType === 'change-order';
                    const dataSource = usesContractDataSource ? contractData : selectedProject;
                    const clientFromSource = usesContractDataSource 
                      ? (contractData?.client || {})
                      : { 
                          name: selectedProject?.clientName, 
                          email: selectedProject?.clientEmail, 
                          phone: selectedProject?.clientPhone, 
                          address: selectedProject?.address 
                        };
                    const projectFromSource = usesContractDataSource
                      ? (contractData?.project || {})
                      : {
                          type: selectedProject?.projectType,
                          description: selectedProject?.projectDescription || selectedProject?.title,
                          location: selectedProject?.address,
                        };
                    const financialsFromSource = usesContractDataSource
                      ? (contractData?.financials || {})
                      : { total: selectedProject?.totalAmount };
                    
                    return (
                    <DynamicTemplateConfigurator
                      templateId={selectedDocumentType}
                      baseData={{
                        project: dataSource,
                        client: {
                          name: editableData.clientName || clientFromSource.name,
                          email: editableData.clientEmail || clientFromSource.email,
                          phone: editableData.clientPhone || clientFromSource.phone,
                          address: editableData.clientAddress || clientFromSource.address,
                        },
                        financials: {
                          total: editableData.projectTotal || financialsFromSource.total || 0,
                          milestones: editableData.paymentMilestones,
                        },
                        dates: {
                          startDate: editableData.startDate,
                          completionDate: editableData.completionDate,
                        },
                        linkedContractId: contractData?.linkedContractId,
                      }}
                      onSubmit={async (transformedData) => {
                        console.log("📋 [DYNAMIC-CONFIG] Form submitted:", transformedData);
                        setIsLoading(true);
                        
                        try {
                          const documentPayload = {
                            userId: currentUser?.uid,
                            templateId: selectedDocumentType,
                            client: {
                              name: editableData.clientName || clientFromSource.name || '',
                              address: editableData.clientAddress || clientFromSource.address || '',
                              email: editableData.clientEmail || clientFromSource.email || '',
                              phone: editableData.clientPhone || clientFromSource.phone || '',
                            },
                            contractor: contractData?.contractor || {
                              name: profile?.company || profile?.ownerName || 'Contractor Name',
                              company: profile?.company || 'Company Name',
                              address: profile?.address || '',
                              phone: profile?.phone || '',
                              email: profile?.email || '',
                              license: (profile as any)?.licenseNumber || '',
                            },
                            project: {
                              type: projectFromSource.type || 'Construction Project',
                              description: projectFromSource.description || '',
                              location: editableData.clientAddress || projectFromSource.location || clientFromSource.address || '',
                              startDate: editableData.startDate,
                              endDate: editableData.completionDate,
                            },
                            financials: {
                              total: editableData.projectTotal || financialsFromSource.total || 0,
                              paymentMilestones: editableData.paymentMilestones,
                            },
                            linkedContractId: contractData?.linkedContractId,
                            ...transformedData,
                          };

                          console.log("📋 [DYNAMIC-CONFIG] Generating document with payload:", documentPayload);

                          const htmlResponse = await fetch("/api/generate-contract-html", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${currentUser?.uid}`,
                            },
                            body: JSON.stringify(documentPayload),
                          });

                          if (htmlResponse.ok) {
                            const contractHTMLData = await htmlResponse.json();
                            const contractHtmlContent = contractHTMLData.html || contractHTMLData.contractHTML || '';
                            
                            if (contractHtmlContent) {
                              setContractHTML(contractHtmlContent);
                              setContractData(documentPayload);
                              setIsContractReady(true);
                              setCurrentStep(3);

                              toast({
                                title: "Document Generated",
                                description: `${selectedDocumentType === 'change-order' ? 'Change Order' : 'Document'} created successfully.`,
                              });
                            } else {
                              throw new Error("No HTML content in response");
                            }
                          } else {
                            const errorData = await htmlResponse.json().catch(() => ({}));
                            throw new Error(errorData.error || `Failed to generate document (${htmlResponse.status})`);
                          }
                        } catch (error) {
                          console.error("❌ [DYNAMIC-CONFIG] Error generating document:", error);
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "Failed to generate document",
                            variant: "destructive",
                          });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      onBack={() => setCurrentStep(1)}
                      isSubmitting={isLoading}
                    />
                  );
                  })() : (
                  <div className="space-y-6">
                    {/* Contract Type Selector - Multi-Template System */}
                    {isDocumentTypeSelectorEnabled && (
                      <div className="border border-cyan-500/30 rounded-lg p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20">
                        <h3 className="text-lg font-semibold mb-2 text-cyan-400 flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Contract Type
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                          Select the type of contract for this project
                        </p>
                        <Select 
                          value={selectedDocumentType} 
                          disabled
                          data-testid="select-contract-type"
                        >
                          <SelectTrigger className="bg-gray-800 border-cyan-500/50 text-white h-12" data-testid="contract-type-trigger">
                            <SelectValue placeholder="Select contract type" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-cyan-500/50 max-h-80">
                            {/* Primary Contracts Section - 100% Registry Driven by subcategory */}
                            {availableDocumentTypes.filter(t => t.subcategory === 'primary').length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10">
                                  📋 Primary Contracts
                                </div>
                                {availableDocumentTypes
                                  .filter(t => t.subcategory === 'primary')
                                  .map((docType) => (
                                    <SelectItem 
                                      key={docType.id} 
                                      value={docType.id} 
                                      className="text-white hover:bg-cyan-500/20 py-2" 
                                      data-testid="contract-type-default"
                                      disabled={docType.status === 'coming_soon'}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Shield className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{docType.displayName}</span>
                                            {docType.status === 'coming_soon' && (
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-gray-500/20 text-gray-400 border-gray-500/50">
                                                Próximamente
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-xs text-gray-400">{docType.description}</span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </>
                            )}
                            
                            {/* Contract Amendments Section - Registry Driven by subcategory */}
                            {availableDocumentTypes.filter(t => t.subcategory === 'amendment' || t.subcategory === 'work-authorization').length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-yellow-400 bg-yellow-500/10 mt-1">
                                  📝 Contract Amendments
                                </div>
                                {availableDocumentTypes
                                  .filter(t => t.subcategory === 'amendment' || t.subcategory === 'work-authorization')
                                  .map((docType) => (
                                    <SelectItem 
                                      key={docType.id} 
                                      value={docType.id} 
                                      className="text-white hover:bg-yellow-500/20 py-2"
                                      data-testid={`contract-type-${docType.id}`}
                                      disabled={docType.status === 'coming_soon'}
                                    >
                                      <div className="flex items-center gap-3">
                                        <FileCheck className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{docType.displayName}</span>
                                            {docType.status === 'coming_soon' ? (
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-gray-500/20 text-gray-400 border-gray-500/50">
                                                Próximamente
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-500/20 text-blue-300 border-blue-500/50">
                                                {docType.signatureType === 'dual' ? '2 Firmas' : '1 Firma'}
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-xs text-gray-400">{docType.description}</span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </>
                            )}
                            
                            {/* Lien Waivers Section - Registry Driven by subcategory */}
                            {availableDocumentTypes.filter(t => t.subcategory === 'legal').length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-green-400 bg-green-500/10 mt-1">
                                  ✅ Lien Waivers
                                </div>
                                {availableDocumentTypes
                                  .filter(t => t.subcategory === 'legal')
                                  .map((docType) => (
                                    <SelectItem 
                                      key={docType.id} 
                                      value={docType.id} 
                                      className="text-white hover:bg-green-500/20 py-2"
                                      data-testid={`contract-type-${docType.id}`}
                                      disabled={docType.status === 'coming_soon'}
                                    >
                                      <div className="flex items-center gap-3">
                                        <FileCheck className="h-4 w-4 text-green-400 flex-shrink-0" />
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{docType.displayName}</span>
                                            {docType.status === 'coming_soon' ? (
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-gray-500/20 text-gray-400 border-gray-500/50">
                                                Próximamente
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                                                1 Firma
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-xs text-gray-400">{docType.description}</span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </>
                            )}
                            
                            {/* Completion & Warranty Section - Registry Driven by subcategory */}
                            {availableDocumentTypes.filter(t => t.subcategory === 'completion' || t.subcategory === 'warranty').length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 mt-1">
                                  🏆 Completion & Warranty
                                </div>
                                {availableDocumentTypes
                                  .filter(t => t.subcategory === 'completion' || t.subcategory === 'warranty')
                                  .map((docType) => (
                                    <SelectItem 
                                      key={docType.id} 
                                      value={docType.id} 
                                      className="text-white hover:bg-purple-500/20 py-2"
                                      data-testid={`contract-type-${docType.id}`}
                                      disabled={docType.status === 'coming_soon'}
                                    >
                                      <div className="flex items-center gap-3">
                                        <FileCheck className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{docType.displayName}</span>
                                            {docType.status === 'coming_soon' ? (
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-gray-500/20 text-gray-400 border-gray-500/50">
                                                Próximamente
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-500/20 text-blue-300 border-blue-500/50">
                                                {docType.signatureType === 'dual' ? '2 Firmas' : '1 Firma'}
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-xs text-gray-400">{docType.description}</span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        
                        {/* Selected Contract Info */}
                        {selectedDocumentType !== 'independent-contractor' && (
                          <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                            <span className="text-sm text-cyan-300">
                              {availableDocumentTypes.find(t => t.id === selectedDocumentType)?.signatureType === 'dual' 
                                ? 'Requiere firma del contratista y cliente' 
                                : 'Requiere una sola firma'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Editable Client Information */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        Client Information (Editable)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400">Client Name</Label>
                          <Input
                            value={editableData.clientName}
                            onChange={(e) =>
                              setEditableData((prev) => ({
                                ...prev,
                                clientName: e.target.value,
                              }))
                            }
                            className="bg-gray-800 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400">Client Email</Label>
                          <Input
                            type="email"
                            value={editableData.clientEmail}
                            onChange={(e) =>
                              setEditableData((prev) => ({
                                ...prev,
                                clientEmail: e.target.value,
                              }))
                            }
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="client@email.com"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400">Client Phone</Label>
                          <Input
                            value={editableData.clientPhone}
                            onChange={(e) =>
                              setEditableData((prev) => ({
                                ...prev,
                                clientPhone: e.target.value,
                              }))
                            }
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            Client Address
                          </Label>
                          <AddressAutocomplete
                            value={editableData.clientAddress}
                            onChange={(address) =>
                              setEditableData((prev) => ({
                                ...prev,
                                clientAddress: address,
                              }))
                            }
                            placeholder="123 Main St, City, State ZIP"
                            className="bg-gray-800 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Editable Timeline */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Project Timeline (Editable)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400">Start Date</Label>
                          <Input
                            type="date"
                            value={editableData.startDate}
                            onChange={(e) =>
                              setEditableData((prev) => ({
                                ...prev,
                                startDate: e.target.value,
                              }))
                            }
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="To be agreed with client"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty for "To be agreed with client and
                            contractor"
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            Completion Date
                          </Label>
                          <Input
                            type="date"
                            value={editableData.completionDate}
                            onChange={(e) =>
                              setEditableData((prev) => ({
                                ...prev,
                                completionDate: e.target.value,
                              }))
                            }
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="To be determined"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Based on project complexity
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contractor Information (Read-only from Profile) */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Contractor Information (From Company Profile)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400">Company Name</Label>
                          <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                            {profile?.company || "Not set in profile"}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-400">Owner Name</Label>
                          <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                            {profile?.ownerName || "Not set in profile"}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            Business Address
                          </Label>
                          <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                            {profile?.address
                              ? `${profile.address}${profile.city ? `, ${profile.city}` : ""}${profile.state ? `, ${profile.state}` : ""}${profile.zipCode ? ` ${profile.zipCode}` : ""}`
                              : "Not set in profile"}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            Business Phone
                          </Label>
                          <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                            {profile?.phone ||
                              profile?.mobilePhone ||
                              "Not set in profile"}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            Business Email
                          </Label>
                          <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                            {profile?.email || "Not set in profile"}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            License Number
                          </Label>
                          <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                            {(profile as any)?.licenseNumber ||
                              (profile as any)?.license ||
                              "Not set in profile"}
                          </div>
                        </div>
                      </div>
                      {(!profile?.company || !profile?.address) && (
                        <div className="mt-3 text-sm text-yellow-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Please complete your Company Profile to ensure
                          accurate contractor information
                        </div>
                      )}
                    </div>

                    {/* Dynamic Payment Milestones */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Payment Milestones (Customizable)
                        </h3>
                        <div className="bg-green-900/30 border border-green-400 rounded-lg px-3 py-2 sm:px-4">
                          <Label className="text-xs sm:text-sm text-gray-400 mb-1 block">Project Total (Editable)</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-lg sm:text-xl font-bold text-green-400">$</span>
                            <Input
                              type="number"
                              value={editableData.projectTotal}
                              onChange={(e) => {
                                const newTotal = parseFloat(e.target.value) || 0;
                                // Recalculate all milestone amounts based on percentages
                                const updatedMilestones = editableData.paymentMilestones.map(milestone => ({
                                  ...milestone,
                                  amount: newTotal * (milestone.percentage / 100)
                                }));
                                setEditableData((prev) => ({
                                  ...prev,
                                  projectTotal: newTotal,
                                  paymentMilestones: updatedMilestones
                                }));
                              }}
                              className="bg-gray-800 border-green-400 text-green-400 font-bold text-lg sm:text-xl w-28 sm:w-32"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {editableData.paymentMilestones.map(
                          (milestone, index) => (
                            <div
                              key={milestone.id}
                              className="border border-gray-700 rounded-lg p-4"
                            >
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-cyan-400">
                                  Milestone {index + 1}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (
                                      editableData.paymentMilestones.length > 1
                                    ) {
                                      const newMilestones =
                                        editableData.paymentMilestones.filter(
                                          (_, i) => i !== index,
                                        );
                                      setEditableData((prev) => ({
                                        ...prev,
                                        paymentMilestones: newMilestones,
                                      }));
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                  disabled={
                                    editableData.paymentMilestones.length <= 1
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <Label className="text-gray-400">
                                    Description
                                  </Label>
                                  <Input
                                    value={milestone.description}
                                    onChange={(e) => {
                                      const newMilestones = [
                                        ...editableData.paymentMilestones,
                                      ];
                                      newMilestones[index].description =
                                        e.target.value;
                                      setEditableData((prev) => ({
                                        ...prev,
                                        paymentMilestones: newMilestones,
                                      }));
                                    }}
                                    className="bg-gray-800 border-gray-600 text-white"
                                    placeholder="Payment description"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-gray-400">
                                      Percentage
                                    </Label>
                                    <Input
                                      type="number"
                                      value={milestone.percentage}
                                      onChange={(e) => {
                                        const newMilestones = [
                                          ...editableData.paymentMilestones,
                                        ];
                                        const newPercentage =
                                          parseInt(e.target.value) || 0;
                                        newMilestones[index].percentage =
                                          newPercentage;
                                        // Use editable projectTotal instead of getCorrectProjectTotal
                                        newMilestones[index].amount =
                                          editableData.projectTotal * (newPercentage / 100);
                                        setEditableData((prev) => ({
                                          ...prev,
                                          paymentMilestones: newMilestones,
                                        }));
                                      }}
                                      className="bg-gray-800 border-gray-600 text-white"
                                      min="0"
                                      max="100"
                                      placeholder="%"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">
                                      Amount
                                    </Label>
                                    <div className="text-lg font-semibold text-green-400 mt-2">
                                      $
                                      {(milestone.amount || 0).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ),
                        )}

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newId =
                                Math.max(
                                  ...editableData.paymentMilestones.map(
                                    (m) => m.id,
                                  ),
                                ) + 1;
                              const remainingPercentage =
                                100 -
                                editableData.paymentMilestones.reduce(
                                  (sum, m) => sum + m.percentage,
                                  0,
                                );
                              // Use editable projectTotal instead of getCorrectProjectTotal
                              const newMilestone = {
                                id: newId,
                                description: `Milestone ${newId}`,
                                percentage:
                                  remainingPercentage > 0
                                    ? remainingPercentage
                                    : 0,
                                amount:
                                  editableData.projectTotal * (remainingPercentage / 100),
                              };
                              setEditableData((prev) => ({
                                ...prev,
                                paymentMilestones: [
                                  ...prev.paymentMilestones,
                                  newMilestone,
                                ],
                              }));
                            }}
                            className="border-cyan-400 text-cyan-400"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Milestone
                          </Button>

                          <div className="text-right">
                            <p className="text-sm text-gray-400">
                              Total:{" "}
                              {editableData.paymentMilestones.reduce(
                                (sum, m) => sum + m.percentage,
                                0,
                              )}
                              %
                            </p>
                            <p className="text-sm font-semibold text-green-400">
                              Amount: $
                              {editableData.paymentMilestones
                                .reduce((sum, m) => sum + (m.amount || 0), 0)
                                .toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                            </p>
                            <p className="text-xs text-yellow-400">
                              {editableData.paymentMilestones.reduce(
                                (sum, m) => sum + m.percentage,
                                0,
                              ) !== 100 && "⚠️ Should equal 100%"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Editable Warranties & Permits */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Warranties & Permits (Options)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400">
                            Warranty Period
                          </Label>
                          <Select
                            value={editableData.warrantyYears}
                            onValueChange={(value) =>
                              setEditableData((prev) => ({
                                ...prev,
                                warrantyYears: value,
                              }))
                            }
                          >
                            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Year</SelectItem>
                              <SelectItem value="2">2 Years</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-gray-400">
                            Is a permit required for this project?
                          </Label>
                          <Select
                            value={editableData.permitRequired}
                            onValueChange={(value) =>
                              setEditableData((prev) => ({
                                ...prev,
                                permitRequired: value,
                                // Reset permit responsibility when changing permit requirement
                                permitResponsibility:
                                  value === "yes"
                                    ? prev.permitResponsibility
                                    : "",
                              }))
                            }
                          >
                            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Show permit responsibility only if permit is required */}
                      {editableData.permitRequired === "yes" && (
                        <div className="mt-4">
                          <Label className="text-gray-400">
                            Who will be responsible for obtaining the permit?
                          </Label>
                          <Select
                            value={editableData.permitResponsibility}
                            onValueChange={(value) =>
                              setEditableData((prev) => ({
                                ...prev,
                                permitResponsibility: value,
                              }))
                            }
                          >
                            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                              <SelectValue placeholder="Select responsibility..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contractor">
                                Contractor obtains permits
                              </SelectItem>
                              <SelectItem value="client">
                                Client obtains permits
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* AI-Powered Legal Clauses */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI-Powered Legal Defense Clauses
                      </h3>

                      {/* Loading state for AI clauses */}
                      {isLoadingClauses && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
                          <span className="text-gray-400">
                            Analyzing project for optimal legal protection...
                          </span>
                        </div>
                      )}

                      {/* AI Generated Clauses */}
                      {!isLoadingClauses && suggestedClauses.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-400 mb-4">
                            Based on your $
                            {getCorrectProjectTotal(
                              selectedProject,
                            ).toLocaleString()}{" "}
                            {selectedProject.projectType || "construction"}{" "}
                            project, AI recommends these protection clauses:
                          </p>

                          {suggestedClauses.map((clause) => (
                            <div
                              key={clause.id}
                              className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg"
                            >
                              <Checkbox
                                checked={selectedClauses.includes(clause.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedClauses((prev) => [
                                      ...prev,
                                      clause.id,
                                    ]);
                                  } else {
                                    setSelectedClauses((prev) =>
                                      prev.filter((id) => id !== clause.id),
                                    );
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-white">
                                    {clause.title}
                                  </span>
                                  {clause.risk === "high" && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      High Risk
                                    </Badge>
                                  )}
                                  {clause.risk === "medium" && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Medium Risk
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">
                                  {clause.description}
                                </p>
                              </div>
                            </div>
                          ))}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={fetchAISuggestedClauses}
                            className="w-full mt-4 border-cyan-400 text-cyan-400"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate AI Suggestions
                          </Button>
                        </div>
                      )}

                      {/* Custom Clause Input */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <Label className="text-sm text-gray-300 mb-2 block">
                          ✍️ Add Custom Clause
                        </Label>
                        <div className="space-y-2">
                          <Textarea
                            value={enhancedClauseText || customClauseText}
                            onChange={(e) => {
                              setCustomClauseText(e.target.value);
                              setEnhancedClauseText("");
                            }}
                            placeholder="Write your clause idea in simple terms... e.g., 'Client pays for any extra materials needed'"
                            className="bg-gray-800 border-gray-600 text-gray-200 min-h-[60px] max-h-[100px] text-sm resize-none"
                            data-testid="input-custom-clause"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!customClauseText.trim() || isEnhancingClause}
                              onClick={async () => {
                                if (!customClauseText.trim()) return;
                                setIsEnhancingClause(true);
                                try {
                                  const token = await auth.currentUser?.getIdToken();
                                  const response = await fetch('/api/legal-defense/enhance-clause', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ 
                                      text: customClauseText,
                                      projectType: selectedProject?.projectType || 'construction'
                                    }),
                                  });
                                  const data = await response.json();
                                  if (data.success && data.enhancedText) {
                                    setEnhancedClauseText(data.enhancedText);
                                    toast({
                                      title: "✨ Clause Enhanced",
                                      description: "Your clause has been professionally rewritten",
                                    });
                                  } else {
                                    throw new Error(data.error || 'Enhancement failed');
                                  }
                                } catch (error: any) {
                                  toast({
                                    title: "Enhancement Failed",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsEnhancingClause(false);
                                }
                              }}
                              className="border-purple-500 text-purple-400 hover:bg-purple-500/20 text-xs"
                              data-testid="button-enhance-clause"
                            >
                              {isEnhancingClause ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Enhancing...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI Enhance
                                </>
                              )}
                            </Button>
                            {enhancedClauseText && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  const customClause = {
                                    id: `custom-${Date.now()}`,
                                    title: "Custom Clause",
                                    description: enhancedClauseText.slice(0, 100) + (enhancedClauseText.length > 100 ? '...' : ''),
                                    content: enhancedClauseText,
                                    risk: "medium" as const,
                                    category: "custom",
                                  };
                                  setSuggestedClauses(prev => [...prev, customClause]);
                                  setSelectedClauses(prev => [...prev, customClause.id]);
                                  setCustomClauseText("");
                                  setEnhancedClauseText("");
                                  toast({
                                    title: "✅ Clause Added",
                                    description: "Custom clause added to your contract",
                                  });
                                }}
                                className="bg-green-600 hover:bg-green-500 text-white text-xs"
                                data-testid="button-add-custom-clause"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add to Contract
                              </Button>
                            )}
                          </div>
                          {enhancedClauseText && (
                            <p className="text-xs text-green-400 mt-1">
                              ✨ Enhanced with professional legal language
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Fallback if no clauses */}
                      {!isLoadingClauses && suggestedClauses.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-400 mb-4">
                            Click to get AI-powered legal protection suggestions
                          </p>
                          <Button
                            size="sm"
                            onClick={fetchAISuggestedClauses}
                            className="bg-cyan-600 hover:bg-cyan-700"
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            Get AI Suggestions
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Project Description Preview */}
                    {selectedProject.projectDescription && (
                      <div className="border border-gray-600 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 text-cyan-400">
                          📝 Scope of Work
                        </h3>
                        <div className="text-gray-300 text-sm max-h-32 overflow-y-auto">
                          {selectedProject.projectDescription.slice(0, 300)}...
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                      <Button
                        onClick={() => setCurrentStep(1)}
                        variant="outline"
                        className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                      >
                        Back to Projects
                      </Button>
                      <div className="relative">
                        {isPrimoChambeador && (
                          <div 
                            onClick={() => setLocation('/subscription')}
                            className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer hover:from-yellow-500 hover:to-orange-500 transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-yellow-400/50 group z-50"
                            data-testid="banner-upgrade-contract-primo"
                          >
                            <div className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              <span>Click para upgrade → Mero Patrón</span>
                              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        )}
                        <Button
                          onClick={handleGenerateContract}
                          disabled={isLoading || (isPrimoChambeador && !isLoading)}
                          className={`font-bold py-3 px-8 ${
                            isPrimoChambeador 
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                              : isTrialMaster 
                                ? "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white"
                                : "bg-green-600 hover:bg-green-500 text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isPrimoChambeador && (
                              <Lock className="h-4 w-4" />
                            )}
                            {isTrialMaster && (
                              <span className="text-xs bg-yellow-400 text-black px-1 rounded mr-1">TRIAL</span>
                            )}
                            {isLoading ? "Generating..." : "Generate Contract"}
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Change Order Configuration (Change Order Flow) */}
            {currentStep === 2 && documentFlowType === 'change-order' && contractData && (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="pt-6">
                  <DynamicTemplateConfigurator
                    templateId="change-order"
                    baseData={contractData}
                    onSubmit={async (transformedData) => {
                      setIsLoading(true);
                      try {
                        // Generate Change Order PDF
                        const token = await auth.currentUser?.getIdToken(false).catch(() => null);
                        
                        const response = await fetch('/api/generate-pdf', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            templateId: 'change-order',
                            templateData: transformedData,
                            linkedContractId: contractData.linkedContractId,
                          }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to generate Change Order');
                        }

                        const result = await response.json();
                        
                        // FIX: Set all required state for Step 3 to recognize the contract as ready
                        if (result.success) {
                          console.log('✅ [CHANGE-ORDER] PDF generated successfully:', {
                            templateId: result.templateId,
                            contractId: result.contractId,
                            pdfSize: result.pdfSize,
                            hasHtml: !!result.html,
                          });
                          
                          // Set contract HTML for Step 3 display
                          if (result.html) {
                            setContractHTML(result.html);
                          }
                          
                          // Set contract as ready
                          setIsContractReady(true);
                          setGeneratedContract(result.contractId || result.templateId);
                          setContractData({
                            ...contractData,
                            ...transformedData,
                            pdfBase64: result.pdfBase64,
                            filename: result.filename,
                          });
                          
                          setCurrentStep(3);
                          
                          toast({
                            title: "Change Order Generated",
                            description: "Your Change Order has been created successfully",
                          });
                        } else {
                          throw new Error(result.error || 'PDF generation failed');
                        }
                      } catch (error) {
                        console.error('Error generating Change Order:', error);
                        toast({
                          title: "Error",
                          description: "Failed to generate Change Order. Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    onBack={() => setCurrentStep(1)}
                    isSubmitting={isLoading}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 2: Lien Waiver Configuration (Lien Waiver Flow) */}
            {currentStep === 2 && documentFlowType === 'lien-waiver' && contractData && (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="pt-6">
                  <DynamicTemplateConfigurator
                    templateId="lien-waiver"
                    baseData={contractData}
                    onSubmit={async (transformedData) => {
                      setIsLoading(true);
                      try {
                        const token = await auth.currentUser?.getIdToken(false).catch(() => null);
                        
                        const response = await fetch('/api/generate-pdf', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            templateId: 'lien-waiver',
                            templateData: transformedData,
                            linkedContractId: contractData.linkedContractId,
                          }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to generate Lien Waiver');
                        }

                        const result = await response.json();
                        
                        if (result.success) {
                          console.log('✅ [LIEN-WAIVER] PDF generated successfully:', {
                            templateId: result.templateId,
                            contractId: result.contractId,
                            pdfSize: result.pdfSize,
                            hasHtml: !!result.html,
                          });
                          
                          if (result.html) {
                            setContractHTML(result.html);
                          }
                          
                          setIsContractReady(true);
                          setGeneratedContract(result.contractId || result.templateId);
                          setContractData({
                            ...contractData,
                            ...transformedData,
                            pdfBase64: result.pdfBase64,
                            filename: result.filename,
                          });
                          
                          setCurrentStep(3);
                          
                          toast({
                            title: "Lien Waiver Generated",
                            description: "Your Lien Waiver has been created successfully",
                          });
                        } else {
                          throw new Error(result.error || 'PDF generation failed');
                        }
                      } catch (error) {
                        console.error('Error generating Lien Waiver:', error);
                        toast({
                          title: "Error",
                          description: "Failed to generate Lien Waiver. Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    onBack={() => setCurrentStep(1)}
                    isSubmitting={isLoading}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    Step 3: Contract Generated Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Compact Action Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Quick Download */}
                      <div className="bg-blue-900/30 border border-blue-400 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Download className="h-5 w-5 text-blue-400" />
                          <h3 className="font-semibold text-blue-400">
                            Quick Download
                          </h3>
                        </div>
                        <p className="text-gray-300 text-sm mb-4">
                          Download PDF for immediate use
                        </p>
                        <div className="relative">
                          {isPrimoChambeador && (
                            <div 
                              onClick={() => setLocation('/subscription')}
                              className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-cyan-400/50 group z-50"
                              data-testid="banner-upgrade-download-primo"
                            >
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                <span>Ver Planes → Desbloquear</span>
                                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          )}
                          <Button
                            onClick={handleDownloadPDF}
                            disabled={isLoading || (isPrimoChambeador && !isLoading)}
                            className={`font-medium py-2 px-4 w-full text-sm ${
                              isPrimoChambeador 
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                                : isTrialMaster 
                                  ? "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white"
                                  : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {isPrimoChambeador ? (
                                <Lock className="h-4 w-4" />
                              ) : isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              {isPrimoChambeador ? "Upgrade Required" : (isTrialMaster || isTrialUser) ? `Download PDF (Trial - ${trialDaysRemaining}d)` : isLoading ? "Generating..." : "Download PDF"}
                            </div>
                          </Button>
                        </div>
                        <div className="flex items-center justify-center text-xs text-gray-400 mt-2 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Instant • Print Ready</span>
                        </div>
                      </div>

                      {/* Digital Signature Delivery */}
                      <div className="bg-cyan-900/20 border border-cyan-400 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Send className="h-5 w-5 text-cyan-400" />
                          <h3 className="font-semibold text-cyan-400">
                            Send for Signature
                          </h3>
                          <Badge className="bg-cyan-600 text-white text-xs">
                            Secure
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm mb-6">
                          Generate secure signature links for both contractor
                          and client
                        </p>

                        {/* Contract Status Display */}
                        {!contractHTML && (
                          <div className="bg-red-900/20 border border-red-400 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-red-400" />
                              <span className="text-red-400 text-sm font-medium">Contract Not Generated</span>
                            </div>
                            <p className="text-gray-300 text-xs">
                              The contract HTML was not generated properly. Please regenerate the contract first.
                            </p>
                            <Button
                              onClick={() => {
                                if (templateConfigRegistry.needsDynamicConfig(selectedDocumentType)) {
                                  setCurrentStep(2);
                                } else {
                                  handleGenerateContract();
                                }
                              }}
                              disabled={isLoading}
                              className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 w-full mt-3 text-sm"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              {isLoading ? "Generating..." : templateConfigRegistry.needsDynamicConfig(selectedDocumentType) ? "Go Back to Configure" : "Regenerate Contract"}
                            </Button>
                          </div>
                        )}

                        {/* Simplified Start Button */}
                        {/* 🔧 ROBUST CHECK: hasGeneratedLinks ensures we only show "Links Generated" when URLs actually exist */}
                        {(() => {
                          const hasGeneratedLinks = isMultiChannelActive && !!(contractorSignUrl || clientSignUrl);
                          return (
                        <Button
                          onClick={handleStartSignatureProtocol}
                          disabled={
                            isLoading || !contractHTML || hasGeneratedLinks || (!isMasterContractor && !isTrialMaster && !isTrialUser)
                          }
                          className={`w-full py-3 font-medium transition-all relative ${
                            isLoading
                              ? "bg-yellow-600 text-black"
                              : hasGeneratedLinks
                                ? "bg-green-600 text-white"
                                : !contractHTML
                                  ? "bg-gray-600 cursor-not-allowed text-gray-400"
                                  : (!isMasterContractor && !isTrialMaster && !isTrialUser)
                                    ? "bg-gray-600 cursor-not-allowed text-gray-400"
                                    : isTrialMaster
                                      ? "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white"
                                      : "bg-cyan-600 hover:bg-cyan-500 text-white"
                          }`}
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Generating...</span>
                            </div>
                          ) : hasGeneratedLinks ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Links Generated</span>
                            </div>
                          ) : !contractHTML ? (
                            <div className="flex items-center justify-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              <span>Contract Required</span>
                            </div>
                          ) : (!isMasterContractor && !isTrialMaster && !isTrialUser) ? (
                            <div className="flex items-center justify-center gap-2">
                              <Lock className="h-4 w-4" />
                              <span>Master Contractor Only</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span>{(isTrialMaster || isTrialUser) ? `Start Signature Protocol (Trial - ${trialDaysRemaining}d)` : "Start Signature Protocol"}</span>
                            </div>
                          )}
                        </Button>
                          );
                        })()}

                        {/* Premium Feature Notice */}
                        {!isMasterContractor && !isTrialMaster && !isTrialUser && (
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded text-xs font-medium whitespace-nowrap">
                            🚀 Exclusive to Master Contractor
                          </div>
                        )}
                        
                        {/* Trial Master Notice - Enhanced with countdown */}
                        {(isTrialMaster || isTrialUser) && (
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg border-2 border-white/20">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-yellow-300">🚀</span>
                              <span>Trial Master</span>
                              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">
                                {trialDaysRemaining > 0 ? `${trialDaysRemaining} días` : '¡Último día!'}
                              </span>
                            </div>
                            {trialDaysRemaining <= 3 && trialDaysRemaining > 0 && (
                              <div className="text-yellow-200 text-xs mt-1 animate-pulse">
                                ⚡ Trial terminando pronto
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-center text-xs text-gray-400 mt-2 gap-1">
                          <Shield className="h-3 w-3" />
                          <span>Encrypted • Secure • Professional</span>
                        </div>
                        
                        {/* Debug Info for Development */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400">
                            <div>Debug Info:</div>
                            <div>Contract HTML: {contractHTML ? `Generated ✓ (${contractHTML.length} chars)` : 'Missing ✗'}</div>
                            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                            <div>Multi-channel: {isMultiChannelActive ? 'Active' : 'Inactive'}</div>
                            <div>Project type: {selectedProject?.isFromScratch ? 'From Scratch' : 'Existing'}</div>
                            <div>Contract ready: {isContractReady ? 'Yes' : 'No'}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CLASSIFIED: Multi-Channel Transmission Status */}
                    {isMultiChannelActive && (
                      <div className="relative bg-gradient-to-br from-black via-gray-900 to-black border-2 border-green-400 rounded-lg p-4 shadow-2xl shadow-green-400/20">
                        {/* Status Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Truck className="h-5 w-5 text-green-400 animate-pulse" />
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                            </div>
                            <div>
                              <h3 className="font-bold text-green-400 text-sm tracking-wider">
                                TRANSMISSION STATUS
                              </h3>
                              <p className="text-xs text-gray-500 tracking-widest">
                                REAL-TIME MONITORING
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-600 text-black text-xs font-mono animate-pulse">
                            ACTIVE
                          </Badge>
                        </div>

                        {/* Secure Access Links */}
                        <div className="space-y-3">
                          {contractorSignUrl && (
                            <div className="bg-black/40 border border-cyan-400/50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-cyan-400" />
                                  <h4 className="text-cyan-400 font-bold text-xs tracking-wider">
                                    CONTRACTOR ACCESS PORTAL
                                  </h4>
                                  <Badge className="bg-cyan-600 text-black text-xs font-mono">
                                    SECURED
                                  </Badge>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleCopyToClipboard(
                                        contractorSignUrl,
                                        "Contractor",
                                      )
                                    }
                                    className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                                    title="Copy link"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleShareLink(
                                        contractorSignUrl,
                                        "Contractor",
                                      )
                                    }
                                    className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                                    title="Share link"
                                  >
                                    <Share2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="bg-black/60 rounded p-2 border border-cyan-400/30">
                                <button
                                 onClick={()=>{
                                   openUrl(contractorSignUrl)
                                 }}
                                  className="text-cyan-300 hover:text-cyan-200 underline text-xs break-all font-mono"
                                >
                                  {contractorSignUrl}
                                </button>
                              </div>
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                <Lock className="h-3 w-3" />
                                <span>
                                  256-bit encrypted • Device verified • Audit
                                  logged
                                </span>
                              </div>
                            </div>
                          )}

                          {clientSignUrl && (
                            <div className="bg-black/40 border border-green-400/50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-green-400" />
                                  <h4 className="text-green-400 font-bold text-xs tracking-wider">
                                    CLIENT ACCESS PORTAL
                                  </h4>
                                  <Badge className="bg-green-600 text-black text-xs font-mono">
                                    SECURED
                                  </Badge>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleCopyToClipboard(
                                        clientSignUrl,
                                        "Client",
                                      )
                                    }
                                    className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                    title="Copy link"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleShareLink(clientSignUrl, "Client")
                                    }
                                    className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                    title="Share link"
                                  >
                                    <Share2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="bg-black/60 rounded p-2 border border-green-400/30">
                              <button
                                onClick={()=>{
                                  openUrl(clientSignUrl)
                                }}
                                  className="text-green-300 hover:text-green-200 underline text-xs break-all font-mono"
                                >
                                  {clientSignUrl}
                                </button>
                              </div>
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                <Lock className="h-3 w-3" />
                                <span>
                                  Biometric protected • Time-locked • Audit
                                  trail active
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Corner Security Indicators */}
                        <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-green-400"></div>
                        <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-green-400"></div>
                        <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-green-400"></div>
                        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-green-400"></div>
                      </div>
                    )}

                    {/* Legacy Signature Status (fallback) */}
                    {isDualSignatureActive && !isMultiChannelActive && (
                      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-green-400 mb-2">
                          Signature Status
                        </h4>
                        <p className="text-xs text-gray-300 mb-2">
                          {dualSignatureStatus}
                        </p>

                        {contractorSignUrl && clientSignUrl && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Contractor:</span>
                              <Badge className="bg-blue-600 text-white text-xs">
                                Sent
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Client:</span>
                              <Badge className="bg-blue-600 text-white text-xs">
                                Sent
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Actions */}
                    <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                      <Button
                        onClick={() => setCurrentStep(2)}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        data-testid="button-back-step3"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleNewContract}
                        variant="outline"
                        size="sm"
                        className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                      >
                        Generate New Contract
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Unified History View with Tabs */}
        {currentView === "history" && (
          <div className="space-y-6">
            {/* History Header */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                  <History className="h-5 w-5" />
                  Contract Management
                  <Badge className="bg-cyan-600 text-white ml-2">
                    {contractsStore.drafts.length +
                      contractsStore.inProgress.length +
                      contractsStore.completed.length +
                      contractsStore.archived.length}{" "}
                    total
                  </Badge>
                </CardTitle>
                <p className="text-sm text-cyan-300 mt-2">
                  Manage draft contracts and view completed signed documents
                </p>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={historyTab}
                  onValueChange={(value: any) => setHistoryTab(value)}
                >
                  {/* Mobile-First Responsive Tab Layout */}
                  <div className="w-full">
                    {/* Mobile: Vertical Stacked Buttons */}
                    <div className="block sm:hidden space-y-2 mb-4">
                      <button
                        onClick={() => setHistoryTab("drafts")}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          historyTab === "drafts"
                            ? "bg-cyan-600 text-black border-cyan-400"
                            : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="font-medium">Drafts</span>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            historyTab === "drafts"
                              ? "bg-black/20 text-black"
                              : "bg-cyan-600 text-white"
                          }`}
                        >
                          {contractsStore.drafts.length}
                        </div>
                      </button>

                      <button
                        onClick={() => setHistoryTab("in-progress")}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          historyTab === "in-progress"
                            ? "bg-yellow-600 text-black border-yellow-400"
                            : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center">
                          <FileCheck className="h-4 w-4 mr-2" />
                          <span className="font-medium">In Progress</span>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            historyTab === "in-progress"
                              ? "bg-black/20 text-black"
                              : "bg-yellow-600 text-white"
                          }`}
                        >
                          {contractsStore.inProgress.length}
                        </div>
                      </button>

                      <button
                        onClick={() => setHistoryTab("completed")}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          historyTab === "completed"
                            ? "bg-green-600 text-black border-green-400"
                            : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span className="font-medium">Completed</span>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            historyTab === "completed"
                              ? "bg-black/20 text-black"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          {contractsStore.completed.length}
                        </div>
                      </button>

                      <button
                        onClick={() => setHistoryTab("archived")}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          historyTab === "archived"
                            ? "bg-purple-600 text-black border-purple-400"
                            : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center">
                          <Archive className="h-4 w-4 mr-2" />
                          <span className="font-medium">Archived</span>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            historyTab === "archived"
                              ? "bg-black/20 text-black"
                              : "bg-purple-600 text-white"
                          }`}
                        >
                          {contractsStore.archived.length}
                        </div>
                      </button>
                    </div>

                    {/* Desktop: Traditional Tab Layout */}
                    <TabsList className="hidden sm:grid w-full grid-cols-4 bg-gray-800 border-gray-700 h-auto">
                      <TabsTrigger
                        value="drafts"
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-black flex-col py-3 px-2"
                      >
                        <div className="flex items-center mb-1">
                          <Clock className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Drafts</span>
                        </div>
                        <div className="text-xs opacity-75">
                          ({contractsStore.drafts.length})
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        value="in-progress"
                        className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black flex-col py-3 px-2"
                      >
                        <div className="flex items-center mb-1">
                          <FileCheck className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Progress</span>
                        </div>
                        <div className="text-xs opacity-75">
                          ({contractsStore.inProgress.length})
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        value="completed"
                        className="data-[state=active]:bg-green-600 data-[state=active]:text-black flex-col py-3 px-2"
                      >
                        <div className="flex items-center mb-1">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                        <div className="text-xs opacity-75">
                          (
                          {contractsStore.completed.length}
                          )
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        value="archived"
                        className="data-[state=active]:bg-purple-600 data-[state=active]:text-black flex-col py-3 px-2"
                      >
                        <div className="flex items-center mb-1">
                          <Archive className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Archived</span>
                        </div>
                        <div className="text-xs opacity-75">
                          ({contractsStore.archived.length})
                        </div>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Drafts Tab */}
                  <TabsContent value="drafts" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-cyan-300">
                        Contracts stopped at step 2 - ready to resume editing
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={contractsStore.refetch}
                        disabled={contractsStore.isLoading}
                        className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${contractsStore.isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {contractsStore.isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading contract drafts...
                        </p>
                      </div>
                    ) : contractsStore.drafts.length > 0 ? (
                      <div className="space-y-3">
                        {contractsStore.drafts.map((contract, index) => (
                          <div
                            key={contract.id || `draft-${index}`}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-white text-lg">
                                  {contract.clientName}
                                </h3>
                                <p className="text-cyan-400 font-semibold">
                                  $
                                  {(contract.totalAmount || 0).toLocaleString()}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {contract.projectType ||
                                    "Draft Contract"}
                                </p>
                              </div>
                              <Badge className="bg-yellow-600 text-black">
                                <Clock className="h-3 w-3 mr-1" />
                                DRAFT
                              </Badge>
                            </div>

                            {/* Actions - Mobile Responsive */}
                            <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-3">
                              <h4 className="text-cyan-400 font-semibold text-sm mb-3">
                                Draft Actions:
                              </h4>
                              {/* Mobile: Stacked Buttons */}
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    loadContractFromHistory(contract)
                                  }
                                  className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs w-full sm:w-auto"
                                  data-testid={`button-resume-${contract.id}`}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Resume Editing
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    loadContractFromHistory(contract)
                                  }
                                  className="border-gray-400 text-gray-400 hover:bg-gray-400 hover:text-black text-xs w-full sm:w-auto"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => archiveContract(contract.id || contract.contractId || '', 'user_action')}
                                  className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black text-xs w-full sm:w-auto"
                                  data-testid={`button-archive-${contract.id || contract.contractId}`}
                                >
                                  <Archive className="h-3 w-3 mr-1" />
                                  Archive
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">
                          No draft contracts found
                        </p>
                        <p className="text-sm text-gray-500">
                          Contracts stopped at step 2 will appear here for easy
                          resuming
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* In Progress Contracts Tab */}
                  <TabsContent value="in-progress" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-yellow-300">
                        Contracts with signature links sent - awaiting
                        signatures
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={contractsStore.refetch}
                        disabled={contractsStore.isLoading}
                        className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${contractsStore.isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {contractsStore.isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading in-progress contracts...
                        </p>
                      </div>
                    ) : contractsStore.inProgress.length > 0 ? (
                      <div className="space-y-3">
                        {contractsStore.inProgress.map((contract, index) => (
                          <div
                            key={contract.id || `contract-${index}`}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-white text-lg">
                                  {contract.clientName}
                                </h3>
                                <p className="text-yellow-400 font-semibold">
                                  $
                                  {(contract.totalAmount || 0).toLocaleString()}
                                </p>
                              </div>
                              <Badge className="bg-yellow-600 text-black">
                                IN PROGRESS
                              </Badge>
                            </div>

                            {/* Signature Status */}
                            <div className="bg-gray-700 rounded-lg p-3 mb-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-gray-300 text-sm">
                                    Contractor:
                                  </span>
                                  <Badge
                                    className={`ml-2 text-xs ${
                                      contract.status === 'contractor_signed' || contract.status === 'both_signed' || contract.status === 'completed'
                                        ? "bg-green-600 text-white"
                                        : "bg-red-600 text-white"
                                    }`}
                                  >
                                    {contract.status === 'contractor_signed' || contract.status === 'both_signed' || contract.status === 'completed'
                                      ? "SIGNED"
                                      : "PENDING"}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-gray-300 text-sm">
                                    Client:
                                  </span>
                                  <Badge
                                    className={`ml-2 text-xs ${
                                      contract.status === 'client_signed' || contract.status === 'both_signed' || contract.status === 'completed'
                                        ? "bg-green-600 text-white"
                                        : "bg-red-600 text-white"
                                    }`}
                                  >
                                    {contract.status === 'client_signed' || contract.status === 'both_signed' || contract.status === 'completed'
                                      ? "SIGNED"
                                      : "PENDING"}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Direct Signature Links */}
                            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                              <h4 className="text-blue-400 font-semibold text-sm mb-2">
                                Direct Signature Links:
                              </h4>
                              {/* Mobile-Responsive Signature Links */}
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <span className="text-gray-300 text-sm block">
                                    Contractor Link:
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (contract.contractorSignUrl) {
                                        openUrl(contract.contractorSignUrl);
                                      } else {
                                        toast({
                                          title: "Link Not Available",
                                          description:
                                            "Contractor signature link not found",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs w-full"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Open Contractor Link
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <span className="text-gray-300 text-sm block">
                                    Client Link:
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (contract.clientSignUrl) {
                                        openUrl(contract.clientSignUrl);
                                      } else {
                                        toast({
                                          title: "Link Not Available",
                                          description:
                                            "Client signature link not found",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black text-xs w-full"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Open Client Link
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileCheck className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">
                          No contracts in progress
                        </p>
                        <p className="text-sm text-gray-500">
                          Contracts with sent signature links will appear here
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Completed Contracts Tab */}
                  <TabsContent value="completed" className="space-y-4 mt-6">
                    {/* Refresh Button */}
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-green-300">
                        Digitally signed contracts with secure document delivery
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={contractsStore.refetch}
                        disabled={contractsStore.isLoading}
                        className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${contractsStore.isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {(() => {
                      console.log(`🔍 [RENDER-DEBUG] Completed Tab - isLoading: ${contractsStore.isLoading}, contractsStore.completed.length: ${contractsStore.completed.length}`);
                      if (contractsStore.completed.length > 0) {
                        console.log(`🔍 [RENDER-DEBUG] First 3 contracts:`, contractsStore.completed.slice(0, 3).map(c => ({ id: c.contractId, name: c.clientName, amount: c.totalAmount })));
                      }
                      return null;
                    })()}

                    {contractsStore.isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading completed contracts...
                        </p>
                      </div>
                    ) : contractsStore.completed.length > 0 ? (
                      <div className="space-y-3">
                        {contractsStore.completed.map((contract, index) => (
                          <div
                            key={contract.contractId || `completed-${index}`}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-white text-lg">
                                  {contract.clientName}
                                </h3>
                                <p className="text-green-400 font-semibold">
                                  $
                                  {(contract.totalAmount || 0).toLocaleString()}
                                </p>
                              </div>
                              <Badge className="bg-green-600 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                COMPLETED
                              </Badge>
                            </div>

                            {/* Contract Actions */}
                            <div className="space-y-3">
                              {/* PDF Status and Actions - Always show as ready */}
                              <div className="border rounded-lg p-3 bg-green-900/30 border-green-700">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-sm text-green-400">
                                    Signed PDF with Digital Seal:
                                  </h4>
                                  <Badge className="text-xs bg-green-600 text-white">
                                    <Shield className="h-3 w-3 mr-1" />
                                    DIGITALLY SIGNED
                                  </Badge>
                                </div>

                                {/* Mobile-Responsive Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      downloadSignedPdf(
                                        contract.contractId,
                                        contract.clientName,
                                      )
                                    }
                                    className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black text-xs w-full"
                                    data-testid={`button-download-${contract.contractId}`}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      viewContract(
                                        contract.contractId,
                                        contract.clientName,
                                      )
                                    }
                                    className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black text-xs w-full"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Contract
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      shareContract(
                                        contract.contractId,
                                        contract.clientName,
                                      )
                                    }
                                    className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs w-full"
                                  >
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Share
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => archiveContract(contract.id || contract.contractId || '', 'user_action')}
                                    className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black text-xs w-full"
                                    data-testid={`button-archive-${contract.id || contract.contractId}`}
                                  >
                                    <Archive className="h-3 w-3 mr-1" />
                                    Archive
                                  </Button>
                                </div>
                              </div>

                              {/* Contract Details - Mobile Responsive */}
                              <div className="bg-gray-700 rounded-lg p-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div className="space-y-1">
                                    <span className="text-gray-400 block">
                                      Contract ID:
                                    </span>
                                    <p className="text-gray-200 font-mono text-xs break-all">
                                      {contract.contractId}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-gray-400 block">
                                      Completion Date:
                                    </span>
                                    <p className="text-gray-200">
                                      {contract.completionDate
                                        ? new Date(
                                            contract.completionDate,
                                          ).toLocaleDateString()
                                        : "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">
                          No completed contracts found
                        </p>
                        <p className="text-sm text-gray-500">
                          Signed contracts will appear here for secure download
                          and sharing
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* 📁 Archived Contracts Tab (Nov 2025) */}
                  <TabsContent value="archived" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-purple-300">
                        Archived contracts - moved here for cleanup
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={contractsStore.refetch}
                        disabled={contractsStore.isLoading}
                        className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${contractsStore.isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {contractsStore.isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading archived contracts...
                        </p>
                      </div>
                    ) : contractsStore.archived.length > 0 ? (
                      <div className="space-y-3">
                        {contractsStore.archived.map((contract, index) => (
                          <div
                            key={contract.contractId || `archived-${index}`}
                            className="bg-gray-800 border border-purple-600/50 rounded-lg p-4 opacity-75"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-white text-lg">
                                  {contract.clientName}
                                </h3>
                                <p className="text-purple-400 font-semibold">
                                  ${(contract.totalAmount || 0).toLocaleString()}
                                </p>
                              </div>
                              <Badge className="bg-purple-600 text-white">
                                <Archive className="h-3 w-3 mr-1" />
                                ARCHIVED
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              {/* Archived Details */}
                              <div className="bg-gray-700 rounded-lg p-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div className="space-y-1">
                                    <span className="text-gray-400 block">
                                      Contract ID:
                                    </span>
                                    <p className="text-gray-200 font-mono text-xs break-all">
                                      {contract.contractId}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-gray-400 block">
                                      Archived Date:
                                    </span>
                                    <p className="text-gray-200">
                                      {contract.archivedAt
                                        ? new Date(contract.archivedAt).toLocaleDateString()
                                        : "N/A"}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-gray-400 block">
                                      Original Status:
                                    </span>
                                    <p className="text-gray-200 capitalize">
                                      {contract.status || "N/A"}
                                    </p>
                                  </div>
                                  {contract.archivedReason && (
                                    <div className="space-y-1">
                                      <span className="text-gray-400 block">
                                        Reason:
                                      </span>
                                      <p className="text-gray-200 capitalize">
                                        {contract.archivedReason.replace(/_/g, ' ')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Restore Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unarchiveContract(contract.id || contract.contractId || '')}
                                className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black text-xs w-full"
                                data-testid={`button-restore-${contract.id || contract.contractId}`}
                              >
                                <ArchiveRestore className="h-3 w-3 mr-1" />
                                Restore Contract
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Archive className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">
                          No archived contracts
                        </p>
                        <p className="text-sm text-gray-500">
                          Archived contracts will appear here for later cleanup
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Manual Total Entry Modal (for corrupted legacy drafts) */}
      <AlertDialog open={isManualTotalModalOpen} onOpenChange={setIsManualTotalModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contract Total Required</AlertDialogTitle>
            <AlertDialogDescription>
              This draft contains payment milestones with percentages but is missing the total contract amount. 
              Please enter the original contract total to restore this draft correctly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="manualTotal" className="text-sm font-medium">
              Contract Total Amount ($)
            </Label>
            <Input
              id="manualTotal"
              type="number"
              placeholder="Enter total amount (e.g., 5000.00)"
              value={manualTotalInput}
              onChange={(e) => setManualTotalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualTotalConfirm();
                }
              }}
              className="mt-2"
              autoFocus
              data-testid="input-manual-total"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsManualTotalModalOpen(false);
              setPendingContractData(null);
              setManualTotalInput("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleManualTotalConfirm} data-testid="button-confirm-manual-total">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
