import React, { useState, useCallback, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/contexts/PermissionContext";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { getClients as getFirebaseClients } from "@/lib/clientFirebase";

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

// Simple 3-step contract generator without complex state management
export default function SimpleContractGenerator() {
  const [currentStep, setCurrentStep] = useState(1);
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
    "drafts" | "in-progress" | "completed"
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

  // Completed contracts state
  const [completedContracts, setCompletedContracts] = useState<any[]>([]);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);

  // Draft contracts state
  const [draftContracts, setDraftContracts] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  // In-progress contracts state
  const [inProgressContracts, setInProgressContracts] = useState<any[]>([]);
  const [isLoadingInProgress, setIsLoadingInProgress] = useState(false);

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
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // AI Enhancement states
  const [isAIProcessing, setIsAIProcessing] = useState(false);

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
    // ✅ FIXED: Resilient auth check
    if (!currentUser?.uid && !profile?.email) return;

    setIsLoadingHistory(true);
    try {
      console.log("📋 Loading contract history for user:", currentUser?.uid || 'profile_user');
      const history = await contractHistoryService.getContractHistory(
        currentUser.uid,
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

  // Load completed contracts from both contract history and dual signature system
  const loadCompletedContracts = useCallback(async () => {
    // ✅ FIXED: Get effective UID from Firebase Auth OR profile
    const effectiveUid = currentUser?.uid || profile?.firebaseUid;
    
    // ✅ FIXED: Resilient auth check  
    if (!effectiveUid && !profile?.email) return;

    setIsLoadingCompleted(true);
    try {
      console.log("📋 Loading completed contracts for user:", effectiveUid || 'profile_user');

      // ✅ SECURE & ROBUST: Use unified endpoint with proper authentication
      // The backend uses unified-session-auth middleware (session cookie OR token)
      
      // Try to get Firebase token for authentication
      let authHeaders: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // ✅ FIX: Verify currentUser exists before trying to get token
      if (currentUser && typeof currentUser.getIdToken === 'function') {
        try {
          const token = await currentUser.getIdToken();
          authHeaders['Authorization'] = `Bearer ${token}`;
          console.log("✅ Firebase token obtained for API authentication");
        } catch (tokenError) {
          console.warn("⚠️ Could not get Firebase token - relying on session cookie:", tokenError);
          // Session cookie will be sent automatically by browser if available
        }
      } else {
        console.warn("⚠️ Firebase user not fully initialized - relying on session cookie");
      }

      const dataPromises: Promise<any>[] = [
        // Source 1: Contract History (contracts completed via Simple Generator)
        // This uses Firebase directly, doesn't need API token
        contractHistoryService.getContractHistory(effectiveUid),
        
        // Source 2: Unified Dual Signature System (SECURE with auth)
        // Uses Firebase token OR session cookie for authentication
        fetch(`/api/dual-signature/completed/${effectiveUid}`, {
          method: 'GET',
          headers: authHeaders,
          credentials: 'include' // Include session cookies
        }).then((res) => {
          if (!res.ok) {
            throw new Error(`API returned ${res.status}: Cannot load dual signature contracts`);
          }
          return res.json();
        })
      ];

      // Load from available sources and merge
      const responses = await Promise.allSettled(dataPromises);

      let allCompleted: any[] = [];

      // Process response[0]: Contract History (always present)
      const historyResponse = responses[0];
      if (historyResponse.status === "fulfilled") {
        const historyCompleted = historyResponse.value
          .filter((contract: any) => contract.status === "completed")
          .map((contract: any) => ({
            contractId: contract.contractId,
            clientName: contract.clientName,
            totalAmount: contract.contractData.financials.total || 0,
            isCompleted: true,
            isDownloadable: !!contract.pdfUrl,
            contractorSigned: true,
            clientSigned: true,
            createdAt: contract.createdAt,
            hasPdf: !!contract.pdfUrl,
            pdfUrl: contract.pdfUrl,
            source: "history",
          }));
        allCompleted = [...allCompleted, ...historyCompleted];
        console.log(`✅ Loaded ${historyCompleted.length} contracts from history`);
      } else {
        console.error("❌ Critical: Failed to load contracts from history:", historyResponse.reason);
      }

      // Process response[1]: Dual Signature (only if auth token was available)
      if (responses.length > 1) {
        const dualSignatureResponse = responses[1];
        if (dualSignatureResponse.status === "fulfilled") {
          const dualSignatureCompleted = (
            dualSignatureResponse.value.contracts || []
          ).map((contract: any) => ({
            contractId: contract.contractId,
            clientName: contract.clientName,
            totalAmount: contract.totalAmount || 0,
            isCompleted: contract.isCompleted,
            isDownloadable: contract.isDownloadable,
            contractorSigned: contract.contractorSigned,
            clientSigned: contract.clientSigned,
            createdAt: contract.createdAt,
            hasPdf: contract.isDownloadable,
            pdfUrl: contract.signedPdfPath,
            source: "dual-signature",
          }));
          allCompleted = [...allCompleted, ...dualSignatureCompleted];
          console.log(`✅ Loaded ${dualSignatureCompleted.length} contracts from dual signature`);
        } else {
          console.warn("⚠️ Could not load contracts from dual signature API:", dualSignatureResponse.reason);
        }
      } else {
        console.warn("⚠️ Dual signature contracts not loaded - auth token unavailable");
      }

      // Remove duplicates (same contractId)
      const uniqueCompleted = allCompleted.filter(
        (contract, index, self) =>
          index === self.findIndex((c) => c.contractId === contract.contractId),
      );

      setCompletedContracts(uniqueCompleted);
      
      const sourcesLoaded = responses.length;
      const sourcesSuccessful = responses.filter(r => r.status === "fulfilled").length;
      
      console.log(
        `✅ Completed contracts loaded: ${uniqueCompleted.length} contracts from ${sourcesSuccessful}/${sourcesLoaded} available sources`,
      );
      
      // ✅ ROBUST: Explicit confirmation of data integrity
      if (uniqueCompleted.length > 0) {
        console.log("✅ Contract data loaded successfully - no data loss detected");
      }
      
      // ⚠️ Warn if some sources failed but we still have data
      if (sourcesSuccessful < sourcesLoaded && uniqueCompleted.length > 0) {
        console.warn(`⚠️ Note: ${sourcesLoaded - sourcesSuccessful} source(s) could not be loaded, but existing contracts are preserved`);
      }
    } catch (error) {
      console.error("❌ Error loading completed contracts:", error);
      // ✅ ROBUST: Don't show error toast if we're just missing auth token
      // Only show error if it's a critical failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('token') && !errorMessage.includes('auth')) {
        toast({
          title: "Error",
          description: "Failed to load some contract data. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingCompleted(false);
    }
  }, [currentUser?.uid, profile?.firebaseUid, toast]);

  // Load draft contracts from contract history
  const loadDraftContracts = useCallback(async () => {
    // ✅ FIXED: Resilient auth check
    if (!currentUser?.uid && !profile?.email) return;

    setIsLoadingDrafts(true);
    try {
      console.log("📋 Loading draft contracts for user:", currentUser?.uid || 'profile_user');

      // Load from contract history service
      const history = await contractHistoryService.getContractHistory(
        currentUser.uid,
      );
      const drafts = history.filter((contract) => contract.status === "draft");

      setDraftContracts(drafts);
      console.log("✅ Draft contracts loaded:", drafts.length, "contracts");
    } catch (error) {
      console.error("❌ Error loading draft contracts:", error);
      toast({
        title: "Error",
        description: "Failed to load draft contracts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [currentUser?.uid, toast]);

  const loadInProgressContracts = useCallback(async () => {
    // ✅ FIXED: Resilient auth check
    if (!currentUser?.uid && !profile?.email) return;

    setIsLoadingInProgress(true);
    try {
      console.log(
        "📋 Loading in-progress contracts for user:",
        currentUser.uid,
      );

      // Try to get Firebase token for authentication
      let authHeaders: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      try {
        const token = await currentUser.getIdToken();
        authHeaders['Authorization'] = `Bearer ${token}`;
      } catch (tokenError) {
        console.warn("⚠️ Could not get Firebase token for in-progress - relying on session cookie:", tokenError);
      }

      // Load from dual signature system (contracts with signature links sent)
      const response = await fetch(
        `/api/dual-signature/in-progress/${currentUser.uid}`,
        {
          method: 'GET',
          headers: authHeaders,
          credentials: 'include' // Include session cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInProgressContracts(data.contracts || []);
        console.log(
          "✅ In-progress contracts loaded:",
          data.contracts?.length || 0,
          "contracts",
        );
      } else {
        console.warn(
          "⚠️ In-progress contracts API not available, using empty array",
        );
        setInProgressContracts([]);
      }
    } catch (error) {
      console.error("❌ Error loading in-progress contracts:", error);
      // Don't show error toast for in-progress contracts as it's not critical
      setInProgressContracts([]);
    } finally {
      setIsLoadingInProgress(false);
    }
  }, [currentUser?.uid, toast]);

  // Load projects from Firebase (same logic as ProjectToContractSelector)
  const loadProjectsFromFirebase = useCallback(async () => {
    // ✅ FIXED: Resilient auth check
    if (!currentUser?.uid && !profile?.email) return;

    try {
      setIsLoading(true);
      console.log("🔥 Loading projects from Firebase for Legal Defense...");

      let allEstimates: any[] = [];

      // Load from projects collection (same as EstimatesWizard)
      try {
        const projectsQuery = query(
          collection(db, "projects"),
          where("firebaseUserId", "==", currentUser.uid),
        );

        const projectsSnapshot = await getDocs(projectsQuery);
        const projectEstimates = projectsSnapshot.docs
          .filter((doc) => {
            const data = doc.data();
            return data.status === "estimate" || data.estimateNumber;
          })
          .map((doc) => {
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

            const clientPhone =
              data.clientInformation?.phone ||
              data.clientPhone ||
              data.client?.phone ||
              "";

            // Total calculation with multiple paths
            let totalValue =
              data.projectTotalCosts?.totalSummary?.finalTotal ||
              data.projectTotalCosts?.total ||
              data.total ||
              data.estimateAmount ||
              0;

            const displayTotal = totalValue;

            const projectTitle =
              data.projectDetails?.name ||
              data.projectName ||
              data.title ||
              `Estimado para ${clientName}`;

            const address =
              data.clientInformation?.address ||
              data.clientAddress ||
              data.client?.address ||
              data.address ||
              "";

            return {
              id: doc.id,
              estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
              title: projectTitle,
              clientName: clientName,
              clientEmail: clientEmail,
              clientPhone: clientPhone,
              totalAmount: displayTotal,
              totalPrice: displayTotal,
              displaySubtotal: displayTotal,
              status: data.status || "draft",
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
                data.projectDescription || data.description || "",
              originalData: data,
            };
          });

        allEstimates = [...allEstimates, ...projectEstimates];
        console.log(
          `📊 Loaded ${projectEstimates.length} projects from projects collection`,
        );
      } catch (projectError) {
        console.warn("Could not load from projects collection:", projectError);
      }

      // Load from estimates collection
      try {
        const estimatesQuery = query(
          collection(db, "estimates"),
          where("firebaseUserId", "==", currentUser.uid),
        );

        const estimatesSnapshot = await getDocs(estimatesQuery);
        const firebaseEstimates = estimatesSnapshot.docs.map((doc) => {
          const data = doc.data();

          const clientName =
            data.clientName || data.client?.name || "Cliente sin nombre";
          const clientEmail = data.clientEmail || data.client?.email || "";
          const clientPhone = data.clientPhone || data.client?.phone || "";

          let totalValue = data.total || data.estimateAmount || 0;
          const displayTotal = totalValue;

          const projectTitle = data.title || `Estimado para ${clientName}`;
          const address = data.address || data.clientAddress || "";

          return {
            id: doc.id,
            estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
            title: projectTitle,
            clientName: clientName,
            clientEmail: clientEmail,
            clientPhone: clientPhone,
            totalAmount: displayTotal,
            totalPrice: displayTotal,
            displaySubtotal: displayTotal,
            status: data.status || "estimate",
            estimateDate: data.createdAt
              ? data.createdAt.toDate?.() || new Date(data.createdAt)
              : new Date(),
            items: data.items || [],
            projectType: data.projectType || "fence",
            address: address,
            projectDescription: data.description || "",
            originalData: data,
          };
        });

        allEstimates = [...allEstimates, ...firebaseEstimates];
        console.log(
          `📋 Loaded ${firebaseEstimates.length} additional estimates`,
        );
      } catch (estimatesError) {
        console.warn(
          "Could not load from estimates collection:",
          estimatesError,
        );
      }

      // Remove duplicates and filter eligible projects
      const uniqueProjects = allEstimates.filter(
        (project, index, self) =>
          index ===
          self.findIndex(
            (p) =>
              p.id === project.id ||
              (p.clientName === project.clientName &&
                p.address === project.address),
          ),
      );

      const eligibleProjects = uniqueProjects.filter((project) => {
        const hasRequiredData =
          project.clientName &&
          project.totalAmount > 0 &&
          (project.address || project.projectType);
        return hasRequiredData;
      });

      setProjects(eligibleProjects);
      console.log(
        `✅ Total: ${eligibleProjects.length} unique projects loaded for Legal Defense`,
      );
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
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

  // Download signed PDF with authentication - ALWAYS PDF generation from signed HTML
  const downloadSignedPdf = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        console.log("📥 Downloading signed contract PDF for:", contractId);

        if (!currentUser) {
          toast({
            title: "Authentication Required",
            description: "Please log in to download contracts",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Generating PDF",
          description: "Creating PDF from signed contract document...",
          variant: "default",
        });

        // CRITICAL FIX: Get the signed HTML content first (same as viewContractHtml)
        const htmlResponse = await fetch(
          `/api/dual-signature/download-html/${contractId}`,
          {
            headers: {
              "x-user-id": currentUser.uid,
            },
          },
        );

        if (!htmlResponse.ok) {
          const errorData = await htmlResponse.json();
          throw new Error(
            errorData.message || "Failed to load signed contract",
          );
        }

        const signedHtmlContent = await htmlResponse.text();

        // Generate PDF from the EXACT signed HTML content
        const pdfResponse = await fetch(
          "/api/dual-signature/generate-pdf-from-html",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contractId,
              htmlContent: signedHtmlContent,
              clientName,
            }),
          },
        );

        if (pdfResponse.ok) {
          // Get the PDF blob and trigger download
          const pdfBlob = await pdfResponse.blob();

          const url = window.URL.createObjectURL(pdfBlob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `contract_${clientName.replace(/\s+/g, "_")}_signed.pdf`;

          document.body.appendChild(a);
          a.click();

          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          console.log(
            "✅ PDF downloaded successfully from signed HTML content",
          );
          toast({
            title: "PDF Downloaded",
            description: `Signed contract for ${clientName} downloaded as PDF`,
          });
        } else {
          const errorData = await pdfResponse.json();
          throw new Error(
            errorData.message || "Failed to generate PDF from signed contract",
          );
        }
      } catch (error: any) {
        console.error("❌ Error downloading signed contract PDF:", error);
        toast({
          title: "PDF Download Error",
          description:
            (error as Error).message ||
            "Failed to download signed contract as PDF. Chrome dependencies may be missing.",
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
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.document.title = `Signed Contract - ${clientName}`;

        toast({
          title: "Contract Opened",
          description: `Signed contract for ${clientName} opened in new window`,
        });
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
            await loadCompletedContracts();
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
    [toast, loadCompletedContracts],
  );

  // Copy contract link to clipboard
  const copyContractLink = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        const downloadUrl = `/api/dual-signature/download/${contractId}`;
        const fullUrl = `${window.location.origin}${downloadUrl}`;

        await navigator.clipboard.writeText(fullUrl);
        toast({
          title: "Link Copied",
          description: `Contract link for ${clientName} copied to clipboard`,
        });
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

  // View contract in new window/tab - ALWAYS uses signed HTML for PDF generation
  const viewContract = useCallback(
    async (contractId: string, clientName: string) => {
      // ✅ POPUP BLOCKER FIX: Open window IMMEDIATELY before ANY async operations
      // This maintains direct connection to user click event
      const newWindow = window.open(
        "",
        "_blank",
        "width=900,height=1100,scrollbars=yes,resizable=yes",
      );

      if (!newWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to view contracts",
          variant: "destructive",
        });
        return;
      }

      // Show loading message in the new window
      newWindow.document.write(`
        <html>
          <head>
            <title>Loading Contract PDF...</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .loader {
                text-align: center;
              }
              .spinner {
                border: 4px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="loader">
              <div class="spinner"></div>
              <h2>Loading Contract PDF...</h2>
              <p>Generating PDF from signed contract...</p>
              <p style="opacity: 0.8; font-size: 14px;">Please wait, this may take a moment</p>
            </div>
          </body>
        </html>
      `);

      try {
        console.log("👀 Opening signed contract PDF view for:", contractId);

        if (!currentUser) {
          newWindow.close();
          toast({
            title: "Authentication Required",
            description: "Please log in to view contracts",
            variant: "destructive",
          });
          return;
        }

        // Get the signed HTML content first with authentication headers
        const htmlResponse = await fetch(
          `/api/dual-signature/download-html/${contractId}`,
          {
            headers: {
              "x-user-id": currentUser.uid,
            },
          },
        );

        if (!htmlResponse.ok) {
          const errorData = await htmlResponse.json();
          throw new Error(
            errorData.message || "Failed to load signed contract",
          );
        }

        const signedHtmlContent = await htmlResponse.text();

        // Generate PDF from the EXACT signed HTML content
        const pdfResponse = await fetch(
          "/api/dual-signature/generate-pdf-from-html",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contractId,
              htmlContent: signedHtmlContent,
              clientName,
            }),
          },
        );

        if (pdfResponse.ok) {
          // Get the PDF blob and replace window content
          const pdfBlob = await pdfResponse.blob();
          const pdfUrl = window.URL.createObjectURL(pdfBlob);

          // Replace the loading page with the PDF
          newWindow.location.href = pdfUrl;

          toast({
            title: "PDF Opened",
            description: `Viewing signed contract PDF for ${clientName}`,
          });

          // Clean up URL after window is closed or 30 seconds
          setTimeout(() => {
            window.URL.revokeObjectURL(pdfUrl);
          }, 30000);
        } else {
          const errorData = await pdfResponse.json();
          throw new Error(
            errorData.message || "Failed to generate PDF from signed contract",
          );
        }
      } catch (error: any) {
        console.error("❌ Error viewing contract PDF:", error);
        
        // Show error in the opened window
        newWindow.document.write(`
          <html>
            <head>
              <title>Error Loading PDF</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: #f3f4f6;
                  color: #1f2937;
                }
                .error {
                  text-align: center;
                  background: white;
                  padding: 40px;
                  border-radius: 12px;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  max-width: 500px;
                }
                .error h2 {
                  color: #dc2626;
                  margin-bottom: 16px;
                }
                .error-icon {
                  font-size: 48px;
                  margin-bottom: 20px;
                }
                button {
                  margin-top: 20px;
                  padding: 10px 24px;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 16px;
                }
                button:hover {
                  background: #2563eb;
                }
              </style>
            </head>
            <body>
              <div class="error">
                <div class="error-icon">⚠️</div>
                <h2>Error Loading PDF</h2>
                <p>${(error as Error).message || "Failed to view signed contract as PDF"}</p>
                <p style="font-size: 14px; color: #6b7280; margin-top: 12px;">
                  Please try again or contact support if the issue persists.
                </p>
                <button onclick="window.close()">Close Window</button>
              </div>
            </body>
          </html>
        `);

        toast({
          title: "PDF View Error",
          description:
            (error as Error).message || "Failed to view signed contract as PDF",
          variant: "destructive",
        });
      }
    },
    [toast, currentUser],
  );

  // Share contract using native share API or copy link
  const shareContract = useCallback(
    async (contractId: string, clientName: string) => {
      try {
        console.log("🔗 Sharing contract:", contractId);

        if (!currentUser) {
          toast({
            title: "Authentication Required",
            description: "Please log in to share contracts",
            variant: "destructive",
          });
          return;
        }

        // Create shareable URL based on PDF availability
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/api/dual-signature/download-html/${contractId}`;
        const shareText = `Signed Contract for ${clientName}`;

        // Try native Web Share API first
        if (navigator.share) {
          try {
            await navigator.share({
              title: shareText,
              text: `View the signed contract for ${clientName}`,
              url: shareUrl,
            });

            toast({
              title: "Contract Shared",
              description: `Contract shared via native share options`,
            });
            return;
          } catch (shareError: any) {
            // User cancelled share or share failed, fall back to copy
            console.log(
              "Native share cancelled or failed, falling back to copy",
            );
          }
        }

        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link Copied",
            description: `Contract link copied to clipboard for ${clientName}`,
          });
        } catch (clipboardError) {
          // Ultimate fallback: Show URL in alert
          window.prompt("Copy this contract link:", shareUrl);
          toast({
            title: "Contract Link",
            description: "Contract link displayed for manual copy",
          });
        }
      } catch (error: any) {
        console.error("❌ Error sharing contract:", error);
        toast({
          title: "Share Error",
          description: (error as Error).message || "Failed to share contract",
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

      // Check if value seems malformed (too large, likely stored as centavos incorrectly)
      // Values over $100K are suspicious for typical projects and likely stored incorrectly
      if (value > 100000) {
        const corrected = value / 100;
        console.log(
          `💰 CORRECTING MALFORMED ${fieldName}:`,
          value,
          "→",
          corrected,
          "(divided by 100)",
        );
        return corrected;
      }

      // Check if value is in centavos format (large integer multiple of 100)
      if (value > 10000 && value % 100 === 0 && Number.isInteger(value)) {
        const corrected = value / 100;
        console.log(
          `💰 Converting ${fieldName} from centavos:`,
          value,
          "→",
          corrected,
        );
        return corrected;
      }

      console.log(`💰 Using ${fieldName} as-is:`, value);
      return value;
    };

    // PRIORITY 1: Check displaySubtotal (but correct if malformed)
    if (project.displaySubtotal && project.displaySubtotal > 0) {
      const corrected = correctMalformedValue(
        project.displaySubtotal,
        "displaySubtotal",
      );
      return corrected;
    }

    // PRIORITY 2: Check displayTotal (but correct if malformed)
    if (project.displayTotal && project.displayTotal > 0) {
      const corrected = correctMalformedValue(
        project.displayTotal,
        "displayTotal",
      );
      return corrected;
    }

    // PRIORITY 3: Check totalPrice
    if (project.totalPrice && project.totalPrice > 0) {
      const corrected = correctMalformedValue(project.totalPrice, "totalPrice");
      return corrected;
    }

    // PRIORITY 4: Check estimateAmount
    if (project.estimateAmount && project.estimateAmount > 0) {
      const corrected = correctMalformedValue(
        project.estimateAmount,
        "estimateAmount",
      );
      return corrected;
    }

    // PRIORITY 5: Check total
    if (project.total && project.total > 0) {
      const corrected = correctMalformedValue(project.total, "total");
      return corrected;
    }

    // PRIORITY 6: Check totalAmount
    if (project.totalAmount && project.totalAmount > 0) {
      const corrected = correctMalformedValue(
        project.totalAmount,
        "totalAmount",
      );
      return corrected;
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
        userId: currentUser.uid,
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
            total: getCorrectProjectTotal(selectedProject),
            subtotal: getCorrectProjectTotal(selectedProject),
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

  // Load contract from history and resume editing
  const loadContractFromHistory = useCallback(
    async (contract: ContractHistoryEntry) => {
      try {
        console.log("🔄 Loading contract from history:", contract.id);

        // Set current contract ID for auto-save updates
        setCurrentContractId(contract.id || null);

        // Extract contract data
        const contractDataFromHistory = contract.contractData;

        // Set up project data from contract history
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
          totalAmount: contractDataFromHistory.financials?.total || 0,
          displaySubtotal: contractDataFromHistory.financials?.total || 0,
          materials: contractDataFromHistory.materials || [],
          originalData: contractDataFromHistory,
        };

        // Set selected project and contract data
        setSelectedProject(projectFromHistory);
        setContractData(contractDataFromHistory);

        // Set editable data from contract history
        const contractTotal = contractDataFromHistory.financials?.total || 0;

        // Ensure payment milestones always have amount field defined
        let paymentMilestones = contractDataFromHistory.paymentTerms || [
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

        // Fix any milestones that don't have amount field or have it as undefined
        paymentMilestones = paymentMilestones.map((milestone: any) => ({
          ...milestone,
          amount:
            milestone.amount ??
            (contractTotal * (milestone.percentage || 0)) / 100,
        }));

        setEditableData({
          clientName:
            contractDataFromHistory.client?.name || contract.clientName,
          clientEmail: contractDataFromHistory.client?.email || "",
          clientPhone: contractDataFromHistory.client?.phone || "",
          clientAddress: contractDataFromHistory.client?.address || "",
          startDate:
            contractDataFromHistory.formFields?.startDate ||
            contractDataFromHistory.timeline?.startDate ||
            "",
          completionDate:
            contractDataFromHistory.formFields?.completionDate ||
            contractDataFromHistory.timeline?.completionDate ||
            "",
          permitRequired: (contractDataFromHistory as any).permitInfo?.required
            ? "yes"
            : "no",
          permitResponsibility:
            contractDataFromHistory.formFields?.permitResponsibility ||
            (contractDataFromHistory as any).permitInfo?.responsibility ||
            "contractor",
          warrantyYears:
            (contractDataFromHistory.formFields as any)?.warrantyYears || "1",
          projectTotal: contractTotal, // Editable project total from history
          paymentMilestones: paymentMilestones as any,
        });

        // Set clauses from history
        setSuggestedClauses(
          contractDataFromHistory.protections?.map((p) => ({
            id: p.id,
            title: p.clause,
            category: p.category,
          })) || [],
        );
        setSelectedClauses(
          contractDataFromHistory.protections?.map((p) => p.id) || [],
        );

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
        (contract.contractData.project?.description || "")
          .toLowerCase()
          .includes(searchLower)
      );
    }

    return true;
  });

  // Load projects for step 1
  const loadProjects = useCallback(async () => {
    // ✅ FIXED: Resilient auth check
    if (!currentUser?.uid && !profile?.email) return;

    setIsLoading(true);
    console.log("🔍 Loading estimates and projects for user:", currentUser?.uid || 'profile_user');

    try {
      // FIREBASE CONNECTION VALIDATION
      console.log("🔗 Validating Firebase connection...");
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );
      const { db } = await import("@/lib/firebase");

      // Test Firebase connection with a simple query
      try {
        const testQuery = query(
          collection(db, "estimates"),
          where("firebaseUserId", "==", currentUser.uid),
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
        where("firebaseUserId", "==", currentUser.uid),
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

      allProjects = [...allProjects, ...firebaseEstimates];
      console.log(
        `📋 Loaded ${firebaseEstimates.length} estimates from Firebase`,
      );

      // 2. Also load from projects collection as backup
      console.log("🏗️ Loading from projects collection...");
      const projectsQuery = query(
        collection(db, "projects"),
        where("firebaseUserId", "==", currentUser.uid),
      );

      const projectsSnapshot = await getDocs(projectsQuery);
      const firebaseProjects = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        source: "projects",
      }));

      allProjects = [...allProjects, ...firebaseProjects];
      console.log(
        `🏗️ Loaded ${firebaseProjects.length} projects from Firebase`,
      );

      // 3. Filter for valid projects with comprehensive data validation
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

      setProjects(validProjects);
      console.log(`✅ Total loaded: ${validProjects.length} valid projects`);

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

  // Set up real-time Firebase listener for projects
  useEffect(() => {
    // ✅ FIXED: Resilient auth check for real-time listener
    if (!currentUser?.uid && !profile?.email) return;

    console.log(
      "🔄 Setting up real-time project listener for user:",
      currentUser?.uid || 'profile_user',
    );

    const projectsQuery = query(
      collection(db, "projects"),
      where("firebaseUserId", "==", currentUser.uid),
    );

    // Real-time listener with enhanced error handling and data validation
    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        try {
          console.log("🔄 Processing real-time Firebase update...");

          const allProjects = snapshot.docs
            .map((doc) => {
              const data = doc.data();

              // Data validation for each project
              if (!data) {
                console.warn("⚠️ Empty project data detected:", doc.id);
                return null;
              }

              return {
                id: doc.id,
                ...data,
                timestamp: new Date().toISOString(),
              };
            })
            .filter(Boolean); // Remove null entries

          // Enhanced project filtering with data integrity checks
          const approvedProjects = allProjects.filter((project: any) => {
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

          setProjects(approvedProjects);
          console.log(
            `📊 Real-time update: ${approvedProjects.length} validated projects`,
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
      (error) => {
        console.error("❌ Firebase listener connection error:", error);
        console.error("❌ Error details:", {
          code: error.code,
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });

        toast({
          title: "Error de Conexión",
          description: "Conexión Firebase perdida. Intentando reconectar...",
          variant: "destructive",
        });
        setIsLoading(false);
      },
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser?.uid, toast]);

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

  // Direct PDF download function - uses working PDF endpoint
  const handleDownloadPDF = useCallback(async () => {
    // ✅ FIXED: Resilient auth check for PDF download  
    if (!selectedProject || (!currentUser?.uid && !profile?.email)) return;

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
      // Collect comprehensive contract data
      const contractPayload = {
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
          total: getCorrectProjectTotal(selectedProject),
          materials: contractData?.materials || selectedProject.materials || [],
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
          total: getCorrectProjectTotal(selectedProject),
          subtotal: getCorrectProjectTotal(selectedProject),
          tax: 0,
          discount: 0,
        },
        timeline: {
          startDate:
            editableData.startDate || new Date().toISOString().split("T")[0],
          completionDate: editableData.completionDate || "",
          estimatedDuration: "As specified in project details",
        },
        paymentTerms: editableData.paymentMilestones || [
          {
            id: 1,
            description: "Initial deposit",
            percentage: 50,
            amount: getCorrectProjectTotal(selectedProject) * 0.5,
          },
          {
            id: 2,
            description: "Project completion",
            percentage: 50,
            amount: getCorrectProjectTotal(selectedProject) * 0.5,
          },
        ],
      };

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
        // Convert response to blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contract-${selectedProject.clientName?.replace(/\s+/g, "_") || "client"}-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "PDF Downloaded",
          description: `Contract PDF downloaded successfully for ${selectedProject.clientName}`,
        });
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
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${getCorrectProjectTotal(selectedProject).toLocaleString()}</p>
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
          total: getCorrectProjectTotal(selectedProject),
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
          total: getCorrectProjectTotal(selectedProject),
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
  const handleStartSignatureProtocol = useCallback(async () => {
    if (!selectedProject || !currentUser?.uid || !contractHTML) {
      toast({
        title: "Error",
        description:
          "Contract must be generated before starting signature protocol",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsMultiChannelActive(true);
    setDeliveryStatus("Generating signature links...");

    try {
      // ✅ SIMPLIFIED AUTH: No need to get tokens manually!
      // Session cookie handles authentication automatically
      
      // Prepare contract data for signature protocol
      const secureDeliveryPayload = {
        userId: currentUser.uid,
        contractHTML: contractHTML,
        deliveryMethods: { email: false, sms: false, whatsapp: false },
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

      const response = await fetch("/api/multi-channel/initiate", {
        method: "POST",
        headers,
        credentials: 'include', // ✅ Include session cookie as fallback
        body: JSON.stringify(secureDeliveryPayload),
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

  // Load contract history on component mount
  useEffect(() => {
    // ✅ FIX: Execute when Firebase Auth OR profile is available
    if (currentUser?.uid || profile?.firebaseUid) {
      loadContractHistory();
      loadCompletedContracts();
    }
  }, [currentUser?.uid, profile?.firebaseUid, loadContractHistory, loadCompletedContracts]);

  // ✅ AUTO-REFRESH REMOVED: Manual refresh prevents annoying auto-scrolling
  // Users can refresh manually if needed by switching tabs or using refresh button

  // Load in-progress contracts when switching to in-progress tab
  useEffect(() => {
    // ✅ FIX: Execute when Firebase Auth OR profile is available
    if (currentUser?.uid || profile?.firebaseUid) {
      if (historyTab === "drafts") {
        loadDraftContracts();
      } else if (historyTab === "in-progress") {
        loadInProgressContracts();
      } else if (historyTab === "completed") {
        loadCompletedContracts();
      }
    }
  }, [
    historyTab,
    currentUser?.uid,
    profile?.firebaseUid,
    loadDraftContracts,
    loadInProgressContracts,
    loadCompletedContracts,
  ]);

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
    
    // Pre-populate editable data
    setEditableData(prev => ({
      ...prev,
      clientName: scratchContractData.clientName,
      clientEmail: scratchContractData.clientEmail,
      clientPhone: scratchContractData.clientPhone,
      clientAddress: scratchContractData.clientAddress,
      paymentMilestones: [
        { id: 1, description: "Initial deposit", percentage: 50, amount: parseFloat(scratchContractData.projectCost) * 0.5 },
        { id: 2, description: "Project completion", percentage: 50, amount: parseFloat(scratchContractData.projectCost) * 0.5 },
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
                loadCompletedContracts();
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
                completedContracts.length > 0) && (
                <Badge className="bg-cyan-600 text-white ml-1 px-1.5 py-0.5 text-xs">
                  {contractHistory.length + completedContracts.length}
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
                {[1, 2, 3].map((step) => (
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
                      {step}
                    </div>
                    <span className="text-sm hidden md:inline">
                      {step === 1 && "Select Project"}
                      {step === 2 && "Review & Generate"}
                      {step === 3 && "Download & Complete"}
                    </span>
                    {step < 3 && <div className="w-8 h-0.5 bg-gray-600"></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Project Selection */}
            {currentStep === 1 && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cyan-400">
                    <Database className="h-5 w-5" />
                    Step 1: Create Contract
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
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {existingClients.map((client) => (
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
                              </div>
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
                      <div className="flex justify-end pt-4">
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

            {/* Step 2: Review & Generate */}
            {currentStep === 2 && selectedProject && (
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
                  <div className="space-y-6">
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
                      <Button
                        onClick={handleGenerateContract}
                        disabled={isLoading || (isPrimoChambeador && !isLoading)}
                        className={`font-bold py-3 px-8 relative ${
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
                        {isPrimoChambeador && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-black px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                            Upgrade to Mero Patrón
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
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
                        <Button
                          onClick={handleDownloadPDF}
                          disabled={isLoading || (isPrimoChambeador && !isLoading)}
                          className={`font-medium py-2 px-4 w-full text-sm relative ${
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
                          {isPrimoChambeador && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-black px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                              Unlock with Mero Patrón
                            </div>
                          )}
                        </Button>
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
                              onClick={handleGenerateContract}
                              disabled={isLoading}
                              className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 w-full mt-3 text-sm"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              {isLoading ? "Generating..." : "Regenerate Contract"}
                            </Button>
                          </div>
                        )}

                        {/* Simplified Start Button */}
                        <Button
                          onClick={handleStartSignatureProtocol}
                          disabled={
                            isLoading || !contractHTML || isMultiChannelActive || (!isMasterContractor && !isTrialMaster && !isTrialUser)
                          }
                          className={`w-full py-3 font-medium transition-all relative ${
                            isLoading
                              ? "bg-yellow-600 text-black"
                              : isMultiChannelActive
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
                          ) : isMultiChannelActive ? (
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
                    <div className="border-t border-gray-700 pt-4 text-center">
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
                    {draftContracts.length +
                      inProgressContracts.length +
                      completedContracts.length}{" "}
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
                          {draftContracts.length}
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
                          {inProgressContracts.length}
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
                          {
                            completedContracts.filter((c) => c.isCompleted)
                              .length
                          }
                        </div>
                      </button>
                    </div>

                    {/* Desktop: Traditional Tab Layout */}
                    <TabsList className="hidden sm:grid w-full grid-cols-3 bg-gray-800 border-gray-700 h-auto">
                      <TabsTrigger
                        value="drafts"
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-black flex-col py-3 px-2"
                      >
                        <div className="flex items-center mb-1">
                          <Clock className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Drafts</span>
                        </div>
                        <div className="text-xs opacity-75">
                          ({draftContracts.length})
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
                          ({inProgressContracts.length})
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
                          {
                            completedContracts.filter((c) => c.isCompleted)
                              .length
                          }
                          )
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
                        onClick={loadDraftContracts}
                        disabled={isLoadingDrafts}
                        className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${isLoadingDrafts ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {isLoadingDrafts ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading contract drafts...
                        </p>
                      </div>
                    ) : draftContracts.length > 0 ? (
                      <div className="space-y-3">
                        {draftContracts.map((contract, index) => (
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
                                  {contract.projectDescription ||
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
                        onClick={loadInProgressContracts}
                        disabled={isLoadingInProgress}
                        className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${isLoadingInProgress ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {isLoadingInProgress ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading in-progress contracts...
                        </p>
                      </div>
                    ) : inProgressContracts.length > 0 ? (
                      <div className="space-y-3">
                        {inProgressContracts.map((contract, index) => (
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
                                      contract.contractorSigned
                                        ? "bg-green-600 text-white"
                                        : "bg-red-600 text-white"
                                    }`}
                                  >
                                    {contract.contractorSigned
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
                                      contract.clientSigned
                                        ? "bg-green-600 text-white"
                                        : "bg-red-600 text-white"
                                    }`}
                                  >
                                    {contract.clientSigned
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
                        onClick={loadCompletedContracts}
                        disabled={isLoadingCompleted}
                        className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${isLoadingCompleted ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {(() => {
                      console.log(`🔍 [RENDER-DEBUG] Completed Tab - isLoading: ${isLoadingCompleted}, completedContracts.length: ${completedContracts.length}`);
                      if (completedContracts.length > 0) {
                        console.log(`🔍 [RENDER-DEBUG] First 3 contracts:`, completedContracts.slice(0, 3).map(c => ({ id: c.contractId, name: c.clientName, amount: c.totalAmount })));
                      }
                      return null;
                    })()}

                    {isLoadingCompleted ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">
                          Loading completed contracts...
                        </p>
                      </div>
                    ) : completedContracts.length > 0 ? (
                      <div className="space-y-3">
                        {completedContracts.map((contract, index) => (
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
                              {/* PDF Status and Actions */}
                              <div
                                className={`border rounded-lg p-3 ${contract.hasPdf ? "bg-green-900/30 border-green-700" : "bg-orange-900/30 border-orange-700"}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h4
                                    className={`font-semibold text-sm ${contract.hasPdf ? "text-green-400" : "text-orange-400"}`}
                                  >
                                    {contract.hasPdf
                                      ? "Signed PDF Available:"
                                      : "PDF Not Generated:"}
                                  </h4>
                                  <Badge
                                    className={`text-xs ${contract.hasPdf ? "bg-green-600 text-white" : "bg-orange-600 text-white"}`}
                                  >
                                    {contract.hasPdf
                                      ? "PDF READY"
                                      : "PDF PENDING"}
                                  </Badge>
                                </div>

                                {/* Mobile-Responsive Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {contract.hasPdf ? (
                                    <>
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
                                        View PDF
                                      </Button>
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
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
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
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          generateContractPdf(
                                            contract.contractId,
                                            contract.clientName,
                                          )
                                        }
                                        className="border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black text-xs w-full"
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        Generate
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          viewContractHtml(
                                            contract.contractId,
                                            contract.clientName,
                                          )
                                        }
                                        className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black text-xs w-full"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View HTML
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
                                    </>
                                  )}
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
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
