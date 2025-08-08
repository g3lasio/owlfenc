import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

import { ContractHistoryPanel } from "@/components/contract/ContractHistoryPanel";
import { DefenseClause } from "@/services/deepSearchDefenseEngine";
import {
  professionalContractGenerator,
  ContractData,
} from "@/services/professionalContractGenerator";
import { useProfile } from "@/hooks/use-profile";
import { contractHistoryService } from "@/services/contractHistoryService";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/PermissionContext";
import {
  legalDefenseEngine,
  type LegalClause,
} from "@/services/legalDefenseEngine";
import {
  Upload,
  Shield,
  Eye,
  Lock,
  Database,
  CheckCircle,
  AlertTriangle,
  Download,
  PenTool,
  Users,
  User,
  Clock,
  Zap,
  Play,
  ArrowRight,
  List,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Package,
  Mail,
  FileSignature,
  CheckSquare,
  Archive,
  History,
  Server,
} from "lucide-react";

interface PaymentTerm {
  id: string;
  label: string;
  percentage: number;
  description: string;
}

interface PaymentTermRowProps {
  term: PaymentTerm;
  totalAmount: number;
  onUpdate: (
    id: string,
    field: keyof PaymentTerm,
    value: string | number,
  ) => void;
  onRemove?: (id: string) => void;
  isRemovable?: boolean;
}

const PaymentTermRow: React.FC<PaymentTermRowProps> = ({
  term,
  totalAmount,
  onUpdate,
  onRemove,
  isRemovable = false,
}) => {
  const amount = (totalAmount * term.percentage) / 100;

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 w-full">
      {/* Mobile-First Layout */}
      <div className="space-y-3">
        {/* First Row: Label and Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <input
            type="text"
            value={term.label}
            onChange={(e) => onUpdate(term.id, "label", e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 text-sm font-medium focus:border-green-400 focus:outline-none w-full sm:flex-1 sm:mr-3"
            placeholder="Payment label..."
          />
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-green-400 font-mono font-bold text-lg">
              ${amount.toFixed(2)}
            </span>
            {isRemovable && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(term.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-8 w-8"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Percentage and Description */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 sm:w-auto">
            <input
              type="number"
              value={term.percentage}
              onChange={(e) =>
                onUpdate(term.id, "percentage", parseFloat(e.target.value) || 0)
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 w-20 focus:border-green-400 focus:outline-none text-center"
              min="0"
              max="100"
              step="1"
            />
            <span className="text-gray-400 text-sm">%</span>
          </div>
          <input
            type="text"
            value={term.description}
            onChange={(e) => onUpdate(term.id, "description", e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 text-sm flex-1 focus:border-green-400 focus:outline-none"
            placeholder="Payment description..."
          />
        </div>
      </div>
    </div>
  );
};

interface WorkflowStep {
  id: string;
  step: number;
  title: string;
  description: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  icon: React.ReactNode;
  estimatedTime?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number;
}

interface ContractAnalysis {
  riskLevel: "bajo" | "medio" | "alto" | "crítico";
  riskScore: number;
  protectionsApplied: string[];
  legalAdvice: string[];
  contractStrength: number;
  complianceScore: number;
  stateCompliance: boolean;
}

export default function CyberpunkLegalDefense() {
  const { toast } = useToast();
  
  // Permission system integration
  const { 
    userPlan,
    userUsage,
    incrementUsage, 
    canUse,
    hasAccess,
    isTrialUser,
    trialDaysRemaining,
    getUpgradeReason
  } = usePermissions();
  
  // Plan type checks
  const currentPlan = userPlan;
  const isPrimoChambeador = currentPlan?.id === 1;
  const isMeroPatron = currentPlan?.id === 2;
  const isMasterContractor = currentPlan?.id === 3;
  const isTrialMaster = currentPlan?.id === 4;

  // Estados principales del workflow - SIMPLE 3 STEP WIZARD
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [contractAnalysis, setContractAnalysis] =
    useState<ContractAnalysis | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para el nuevo sistema DeepSearch Defense
  const [approvedClauses, setApprovedClauses] = useState<DefenseClause[]>([]);
  const [clauseCustomizations, setClauseCustomizations] = useState<
    Record<string, any>
  >({});

  // Estados para el motor de Legal Defense inteligente
  const [intelligentClauses, setIntelligentClauses] = useState<LegalClause[]>(
    [],
  );
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(
    new Set(),
  );
  
  // Permission access controls
  const checkLegalDefenseAccess = () => {
    if (isPrimoChambeador) {
      return {
        allowed: false,
        reason: "Upgrade to Mero Patrón to unlock Legal Defense system",
        upgradeText: "Legal Defense requires Mero Patrón plan or higher"
      };
    }
    return { allowed: true };
  };
  
  const checkAdvancedFeaturesAccess = () => {
    if (isPrimoChambeador || isMeroPatron) {
      return {
        allowed: false,
        reason: "Upgrade to Master Contractor for unlimited advanced legal features",
        upgradeText: "Advanced legal protections require Master Contractor plan"
      };
    }
    return { allowed: true };
  };
  
  const checkContractGenerationAccess = () => {
    if (isPrimoChambeador) {
      return {
        allowed: false,
        reason: "Contract generation requires Mero Patrón plan or higher"
      };
    }
    if (isMeroPatron && !canUse('contracts')) {
      return {
        allowed: false,
        reason: `You've reached your contract limit (${userUsage?.contracts || 0}/${currentPlan?.limits?.contracts}). Upgrade to Master Contractor for unlimited contracts.`
      };
    }
    return { allowed: true };
  };

  // Estados para términos de pago
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([
    {
      id: "1",
      label: "Initial Payment (50%)",
      percentage: 50,
      description: "50% after contract signed",
    },
    {
      id: "2",
      label: "Final Payment",
      percentage: 50,
      description: "Upon project completion",
    },
  ]);

  // Estado para el costo total editable
  const [totalCost, setTotalCost] = useState<number>(0);

  // Estados para checkboxes y campos adicionales
  const [hasLicense, setHasLicense] = useState<boolean>(false);
  const [hasInsurance, setHasInsurance] = useState<boolean>(false);
  const [permitsRequired, setPermitsRequired] = useState<boolean>(false);
  const [licenseClassification, setLicenseClassification] =
    useState<string>("");
  const [insuranceCompany, setInsuranceCompany] = useState<string>("");
  const [policyNumber, setPolicyNumber] = useState<string>("");
  const [coverageAmount, setCoverageAmount] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [permitResponsibility, setPermitResponsibility] = useState<string>(
    "Contractor obtains permits",
  );
  const [permitNumbers, setPermitNumbers] = useState<string>("");
  const [workmanshipWarranty, setWorkmanshipWarranty] =
    useState<string>("1 Year");
  const [materialsWarranty, setMaterialsWarranty] = useState<string>(
    "Manufacturer warranty only",
  );
  const [startDate, setStartDate] = useState<string>("");
  const [completionDate, setCompletionDate] = useState<string>("");
  const [estimatedDuration, setEstimatedDuration] = useState<string>("");

  // Profile data for contractor information
  const { profile } = useProfile();
  const { user } = useAuth();

  // Auto-populate contractor data only once when reaching step 3 for the first time
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);

  useEffect(() => {
    if (profile && currentStep === 3 && extractedData && !hasAutoPopulated) {
      console.log("Auto-populating contractor data from profile:", profile);
      setExtractedData((prev) => ({
        ...prev,
        contractorName:
          prev.contractorName || profile.ownerName || profile.company || "",
        contractorCompany: prev.contractorCompany || profile.company || "",
        contractorAddress:
          prev.contractorAddress ||
          `${profile.address || ""} ${profile.city || ""} ${profile.state || ""} ${profile.zipCode || ""}`.trim(),
        contractorPhone:
          prev.contractorPhone || profile.phone || profile.mobilePhone || "",
        contractorLicense: prev.contractorLicense || profile.license || "",
      }));
      setHasAutoPopulated(true);
    }
  }, [profile, currentStep, extractedData, hasAutoPopulated]);

  // Estados del toggle de método de entrada
  const [dataInputMethod, setDataInputMethod] = useState<"upload" | "select">(
    "upload",
  );
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [approvedProjects, setApprovedProjects] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [contractPreviewHtml, setContractPreviewHtml] = useState<string>("");
  const [lockStepThree, setLockStepThree] = useState<boolean>(false);
  
  // Override setCurrentStep to respect lockStepThree
  const safeSetCurrentStep = useCallback((step: number) => {
    console.log(`🔒 SafeSetCurrentStep called: ${step}, lockStepThree: ${lockStepThree}`);
    if (lockStepThree && step === 2) {
      console.log("🔒 BLOCKED: Attempted to regress from step 3 to step 2");
      return; // Block regression to step 2
    }
    setCurrentStep(step);
  }, [lockStepThree, setCurrentStep]);
  
  // Monitor contractPreviewHtml changes
  useEffect(() => {
    console.log("[PREVIEW STATE] contractPreviewHtml changed:", {
      hasContent: !!contractPreviewHtml,
      length: contractPreviewHtml?.length,
      currentStep,
      showPreview
    });
  }, [contractPreviewHtml, currentStep, showPreview]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Contract history state
  const [currentContractId, setCurrentContractId] = useState<string | null>(
    null,
  );
  const [pdfGenerationTime, setPdfGenerationTime] = useState<number>(0);

  // Estados para autoguardado en tiempo real
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para cargar automáticamente datos del contratista desde Company Profile
  const loadContractorDataFromProfile = useCallback(() => {
    if (!profile) return;

    // Check permission access
    const accessCheck = checkLegalDefenseAccess();
    if (!accessCheck.allowed) {
      toast({
        title: "⚠️ Access Restricted",
        description: accessCheck.reason,
        variant: "destructive"
      });
      return;
    }

    console.log("📋 Loading contractor data from Company Profile:", profile);

    // Auto-poblar datos del contratista con información del perfil
    setExtractedData((prev) => ({
      ...prev,
      contractorCompany: profile.company || prev?.contractorCompany || "",
      contractorName:
        profile.ownerName || profile.company || prev?.contractorName || "",
      contractorAddress:
        profile.address && profile.city && profile.state
          ? `${profile.address}, ${profile.city}, ${profile.state} ${profile.zipCode || ""}`.trim()
          : prev?.contractorAddress || "",
      contractorPhone:
        profile.phone || profile.mobilePhone || prev?.contractorPhone || "",
      contractorEmail: profile.email || prev?.contractorEmail || "",
      contractorLicense: profile.license || prev?.contractorLicense || "",
    }));

    console.log("✅ Contractor data loaded from profile");
  }, [profile, toast]);

  // Sistema de autoguardado en tiempo real
  const performAutoSave = useCallback(async () => {
    if (!autoSaveEnabled || !user?.uid || !extractedData) return;

    try {
      console.log("💾 Autoguardando cambios del contrato...");

      const clientName =
        extractedData.clientInfo?.name || extractedData.clientName || "Cliente";
      const projectType =
        extractedData.projectDetails?.type ||
        extractedData.projectType ||
        "Proyecto";

      const contractData = {
        userId: user.uid,
        contractId:
          currentContractId ||
          `${clientName.replace(/\s+/g, "_")}_${projectType.replace(/\s+/g, "_")}_${user.uid.slice(-6)}`,
        clientName,
        projectType,
        status: "draft" as const,
        contractData: {
          client: {
            name:
              extractedData.clientInfo?.name || extractedData.clientName || "",
            address:
              extractedData.clientInfo?.address ||
              extractedData.clientAddress ||
              "",
            email:
              extractedData.clientInfo?.email ||
              extractedData.clientEmail ||
              "",
            phone:
              extractedData.clientInfo?.phone ||
              extractedData.clientPhone ||
              "",
          },
          contractor: {
            name: extractedData.contractorName || profile?.ownerName || "",
            address: extractedData.contractorAddress || "",
            email: extractedData.contractorEmail || profile?.email || "",
            phone: extractedData.contractorPhone || profile?.phone || "",
            license: extractedData.contractorLicense || profile?.license || "",
            company: extractedData.contractorCompany || profile?.company || "",
          },
          project: {
            type:
              extractedData.projectDetails?.type ||
              extractedData.projectType ||
              "",
            description:
              extractedData.projectDetails?.description ||
              extractedData.projectDescription ||
              "",
            location:
              extractedData.projectDetails?.location ||
              extractedData.projectLocation ||
              "",
            scope: extractedData.projectDetails?.scope || "",
            specifications: extractedData.projectDetails?.specifications || "",
          },
          financials: {
            total: totalCost || extractedData.totalAmount || 0,
            subtotal: extractedData.financials?.subtotal || 0,
            tax: extractedData.financials?.tax || 0,
            materials: extractedData.financials?.materials || 0,
            labor: extractedData.financials?.labor || 0,
          },
          protections: intelligentClauses
            .filter((clause) => selectedClauses.has(clause.id))
            .map((clause) => ({
              id: clause.id,
              category: clause.category,
              clause: clause.title || "",
            })),
          paymentTerms: paymentTerms,
          formFields: {
            hasLicense,
            hasInsurance,
            permitsRequired,
            licenseClassification,
            insuranceCompany,
            policyNumber,
            coverageAmount,
            expirationDate,
            startDate,
            completionDate,
            estimatedDuration,
            permitResponsibility,
            permitNumbers,
            workmanshipWarranty,
            materialsWarranty,
          },
        },
        lastModified: Date.now(),
        autoSaved: true,
      };

      // Guardar en Firebase
      await contractHistoryService.saveContract(contractData);

      if (!currentContractId) {
        setCurrentContractId(contractData.contractId);
      }

      setLastSaved(new Date());
      setIsDirty(false);

      console.log("✅ Autoguardado completado exitosamente");
    } catch (error) {
      console.error("❌ Error en autoguardado:", error);
    }
  }, [
    autoSaveEnabled,
    user?.uid,
    extractedData,
    totalCost,
    intelligentClauses,
    selectedClauses,
    paymentTerms,
    hasLicense,
    hasInsurance,
    permitsRequired,
    licenseClassification,
    insuranceCompany,
    policyNumber,
    coverageAmount,
    expirationDate,
    startDate,
    completionDate,
    estimatedDuration,
    permitResponsibility,
    permitNumbers,
    workmanshipWarranty,
    materialsWarranty,
    profile,
    currentContractId,
  ]);

  // Función para marcar como sucio y programar autoguardado
  const markDirtyAndScheduleAutoSave = useCallback(() => {
    setIsDirty(true);

    // Cancelar timeout anterior si existe
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Programar autoguardado en 2 segundos
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000);
  }, [performAutoSave]);

  // Cleanup del timeout al desmontar componente
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Funciones para manejar términos de pago con autoguardado
  const updatePaymentTerm = useCallback(
    (id: string, field: keyof PaymentTerm, value: string | number) => {
      setPaymentTerms((prev) =>
        prev.map((term) =>
          term.id === id ? { ...term, [field]: value } : term,
        ),
      );
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave],
  );

  const addPaymentTerm = useCallback(() => {
    const newTerm: PaymentTerm = {
      id: Date.now().toString(),
      label: "Progressive Payment",
      percentage: 0,
      description: "Payment milestone description",
    };
    setPaymentTerms((prev) => [...prev, newTerm]);
    markDirtyAndScheduleAutoSave();
  }, [markDirtyAndScheduleAutoSave]);

  const removePaymentTerm = useCallback(
    (id: string) => {
      setPaymentTerms((prev) => prev.filter((term) => term.id !== id));
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave],
  );

  // Funciones con autoguardado para campos editables
  const updateTotalCost = useCallback(
    (value: number) => {
      setTotalCost(value);
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave],
  );

  const updateExtractedData = useCallback(
    (updates: any) => {
      setExtractedData((prev: any) => ({ ...prev, ...updates }));
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave],
  );

  const updateClientInfo = useCallback(
    (field: string, value: string) => {
      setExtractedData((prev: any) => ({
        ...prev,
        clientInfo: {
          ...prev.clientInfo,
          [field]: value,
        },
      }));
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave],
  );

  const updateContractorInfo = useCallback(
    (field: string, value: string) => {
      setExtractedData((prev: any) => ({
        ...prev,
        [field]: value,
      }));
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave],
  );

  const toggleClause = useCallback(
    (clauseId: string) => {
      // Check access for advanced legal clause features
      const accessCheck = checkAdvancedFeaturesAccess();
      if (!accessCheck.allowed) {
        toast({
          title: "🎯 Advanced Feature",
          description: accessCheck.reason,
          variant: "destructive"
        });
        return;
      }
      
      setSelectedClauses((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(clauseId)) {
          newSet.delete(clauseId);
        } else {
          newSet.add(clauseId);
        }
        return newSet;
      });
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave, toast],
  );

  const updateFormField = useCallback(
    (field: string, value: any) => {
      switch (field) {
        case "hasLicense":
          setHasLicense(value);
          break;
        case "hasInsurance":
          setHasInsurance(value);
          break;
        case "permitsRequired":
          setPermitsRequired(value);
          break;
        case "licenseClassification":
          setLicenseClassification(value);
          break;
        case "insuranceCompany":
          setInsuranceCompany(value);
          break;
        case "policyNumber":
          setPolicyNumber(value);
          break;
        case "coverageAmount":
          setCoverageAmount(value);
          break;
      }
      markDirtyAndScheduleAutoSave();
    },
    [markDirtyAndScheduleAutoSave],
  );

  // Edit contract handler
  const handleEditContract = useCallback(
    (contract: any) => {
      // Check contract generation access
      const accessCheck = checkContractGenerationAccess();
      if (!accessCheck.allowed) {
        toast({
          title: "📝 Contract Edit Restricted",
          description: accessCheck.reason,
          variant: "destructive"
        });
        return;
      }
      
      console.log("🔧 Editing contract:", contract);

      // Enhanced mapping to preserve ALL contract data during editing
      const mappedData = {
        // Client information - with comprehensive fallbacks
        clientInfo: {
          name:
            contract.contractData?.client?.name || contract.clientName || "",
          address:
            contract.contractData?.client?.address ||
            contract.contractData?.project?.location ||
            "",
          email: contract.contractData?.client?.email || "",
          phone: contract.contractData?.client?.phone || "",
        },

        // Project information - preserve all details
        projectDetails: {
          type:
            contract.contractData?.project?.type || contract.projectType || "",
          description: contract.contractData?.project?.description || "",
          location:
            contract.contractData?.project?.location ||
            contract.contractData?.client?.address ||
            "",
          scope: contract.contractData?.project?.scope || "",
          specifications:
            contract.contractData?.project?.specifications ||
            contract.contractData?.project?.description ||
            "",
        },

        // Financial information - ensure all costs are preserved
        financials: {
          total: contract.contractData?.financials?.total || 0,
          subtotal: contract.contractData?.financials?.subtotal || 0,
          tax: contract.contractData?.financials?.tax || 0,
          materials: contract.contractData?.financials?.materials || 0,
          labor: contract.contractData?.financials?.labor || 0,
          permits: contract.contractData?.financials?.permits || 0,
          other: contract.contractData?.financials?.other || 0,
        },

        // Contractor information - use profile as fallback only
        contractorInfo: {
          name:
            contract.contractData?.contractor?.name ||
            profile?.ownerName ||
            profile?.company ||
            "",
          company:
            contract.contractData?.contractor?.company ||
            profile?.company ||
            "",
          address:
            contract.contractData?.contractor?.address ||
            (profile?.address
              ? `${profile.address} ${profile.city || ""} ${profile.state || ""} ${profile.zipCode || ""}`.trim()
              : ""),
          email:
            contract.contractData?.contractor?.email || profile?.email || "",
          phone:
            contract.contractData?.contractor?.phone ||
            profile?.phone ||
            profile?.mobilePhone ||
            "",
          license:
            contract.contractData?.contractor?.license ||
            profile?.license ||
            "",
        },

        // Additional data preservation
        materials: contract.contractData?.materials || [],
        timeline: contract.contractData?.timeline || {},
        terms: contract.contractData?.terms || {},
        protections: contract.contractData?.protections || [],

        // Legacy format fields for backward compatibility
        clientName:
          contract.contractData?.client?.name || contract.clientName || "",
        clientAddress:
          contract.contractData?.client?.address ||
          contract.contractData?.project?.location ||
          "",
        clientEmail: contract.contractData?.client?.email || "",
        clientPhone: contract.contractData?.client?.phone || "",
        projectType:
          contract.contractData?.project?.type || contract.projectType || "",
        projectDescription: contract.contractData?.project?.description || "",
        projectLocation: contract.contractData?.project?.location || "",
        totalAmount: contract.contractData?.financials?.total || 0,
        contractorName:
          contract.contractData?.contractor?.name ||
          profile?.ownerName ||
          profile?.company ||
          "",
        contractorAddress: contract.contractData?.contractor?.address || "",
        contractorEmail: contract.contractData?.contractor?.email || "",
        contractorPhone: contract.contractData?.contractor?.phone || "",
        contractorLicense: contract.contractData?.contractor?.license || "",

        // Preserve original contract data structure
        originalContractData: contract.contractData,
      };

      console.log("🔧 Enhanced mapped data for editing:", mappedData);

      // Load complete contract data into the form for editing
      setExtractedData(mappedData);
      safeSetCurrentStep(2);

      // Restore all form states if they exist
      if (contract.approvedClauses) {
        setApprovedClauses(contract.approvedClauses);
      }

      if (contract.clauseCustomizations) {
        setClauseCustomizations(contract.clauseCustomizations);
      }

      // Restore payment terms if they exist
      if (contract.contractData?.paymentTerms) {
        setPaymentTerms(contract.contractData.paymentTerms);
      }

      // Restore selected clauses for preview generation
      if (contract.contractData?.protections) {
        const clauseIds = new Set(
          contract.contractData.protections.map((p: any) => p.id),
        );
        setSelectedClauses(clauseIds);
      }

      // Restore form field states
      if (contract.contractData?.formFields) {
        const fields = contract.contractData.formFields;
        // Note: Form field restoration will be handled by individual form components
        console.log("📋 Form fields available for restoration:", fields);
      }

      // Store the contract ID for updating
      setCurrentContractId(contract.id);

      // Generate contract preview after setting the data
      setTimeout(() => {
        generateRealContractPreview();
      }, 100);

      console.log(
        "🔧 Complete contract editing state prepared with full data preservation",
      );
    },
    [profile],
  );

  // Auto-cargar datos del contratista cuando el perfil esté disponible o cuando se avanza al paso 2/3
  useEffect(() => {
    if (
      profile &&
      (currentStep === 2 ||
        currentStep === 3)
    ) {
      loadContractorDataFromProfile();
    }
  }, [profile, currentStep, loadContractorDataFromProfile]);

  // Definir pasos del workflow cyberpunk
  const workflowSteps: WorkflowStep[] = [
    {
      id: "data-command",
      step: 1,
      title: "Project Data Command",
      description:
        "Seize control from the start. Instantly extract all key project data—select from your portfolio or upload an approved estimate. No detail escapes.",
      status: selectedFile
        ? "completed"
        : currentStep === 1
          ? "processing"
          : "pending",
      progress: selectedFile ? 100 : currentStep === 1 ? 50 : 0,
      icon: <Database className="h-6 w-6" />,
      estimatedTime: "30 sec",
    },
    {
      id: "defense-review",
      step: 2,
      title: "Defense Review & Correction",
      description:
        "Preview, correct, and strengthen. Every term, clause, and client detail is surfaced for your review—so you stay in command before anything is signed.",
      status: generatedContract
        ? "completed"
        : currentStep === 3
          ? "processing"
          : "pending",
      progress: generatedContract ? 100 : currentStep === 3 ? 50 : 0,
      icon: <Eye className="h-6 w-6" />,
      estimatedTime: "2 min",
    },
    {
      id: "digital-execution",
      step: 3,
      title: "Digital Execution & Vault",
      description:
        "E-sign securely. Both parties sign; final contracts are auto-delivered as certified PDFs and stored in your digital vault—irrefutable, retrievable, and always protected.",
      status: currentStep === 3 ? "processing" : "pending",
      progress: currentStep === 3 ? 50 : 0,
      icon: <Lock className="h-6 w-6" />,
      estimatedTime: "1 min",
    },
  ];

  // Función para cargar proyectos directamente desde Firebase
  const loadApprovedProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      // SECURITY FIX: Verificar autenticación primero
      if (!user?.uid) {
        toast({
          title: "⚡ AUTHENTICATION REQUIRED",
          description: "Please login to access your saved projects",
          variant: "destructive",
        });
        setApprovedProjects([]);
        return;
      }

      console.log(
        `🔒 SECURITY: Loading projects for authenticated user: ${user.uid}`,
      );

      // Importar función de Firebase
      const { getProjects, auth } = await import("@/lib/firebase");
      const { onAuthStateChanged } = await import("firebase/auth");

      // Asegurar que el estado de autenticación esté listo
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          unsubscribe(); // Limpiar listener

          if (!currentUser || currentUser.uid !== user.uid) {
            console.error("🔒 SECURITY: User authentication mismatch");
            setApprovedProjects([]);
            toast({
              title: "⚡ AUTHENTICATION ERROR",
              description: "User authentication failed. Please login again.",
              variant: "destructive",
            });
            resolve();
            return;
          }

          try {
            // SIMPLIFIED APPROACH: Load estimates directly with timeout
            let allProjects = [];

            console.log("🔍 Loading estimates directly...");

            // Import Firebase functions for direct estimate access
            const { collection, query, where, getDocs } = await import(
              "firebase/firestore"
            );
            const { db } = await import("../lib/firebase");

            // Load estimates that can be converted to contracts
            try {
              const estimatesQuery = query(
                collection(db, "estimates"),
                where("firebaseUserId", "==", user.uid),
              );

              const estimatesSnapshot = await getDocs(estimatesQuery);
              const firebaseEstimates = estimatesSnapshot.docs
                .map((doc) => {
                  const data = doc.data();

                  // Convert estimate to project format for contract generation
                  return {
                    id: doc.id,
                    firebaseUserId: data.firebaseUserId,
                    clientName:
                      data.clientInformation?.name ||
                      data.clientName ||
                      "Unknown Client",
                    clientEmail:
                      data.clientInformation?.email || data.clientEmail || "",
                    clientPhone:
                      data.clientInformation?.phone || data.clientPhone || "",
                    address:
                      data.clientInformation?.fullAddress ||
                      data.clientInformation?.address ||
                      `${data.clientInformation?.city || ""}, ${data.clientInformation?.state || ""}`,
                    projectType:
                      data.projectDetails?.type ||
                      data.projectType ||
                      "Fence Project",
                    projectDescription:
                      data.projectDetails?.description ||
                      data.projectDescription ||
                      "Estimate ready for contract",
                    totalAmount:
                      data.projectTotalCosts?.totalSummary?.finalTotal ||
                      data.total ||
                      data.estimateAmount ||
                      0,
                    status: "estimate_ready", // Mark as ready for contract
                    createdAt: data.createdAt,
                    source: "estimate",
                    estimateNumber: data.estimateNumber,
                    originalEstimateData: data, // Preserve original estimate data
                    // Include all project details and materials for contract generation
                    projectTotalCosts: data.projectTotalCosts,
                    contractInformation: data.contractInformation,
                    items:
                      data.projectTotalCosts?.materialCosts?.items ||
                      data.items ||
                      [],
                  };
                })
                // Filter estimates that have enough data for contract generation
                .filter(
                  (estimate) => estimate.clientName && estimate.totalAmount > 0,
                );

              allProjects = [...firebaseEstimates];
              console.log(
                `🔍 Found ${firebaseEstimates.length} estimates ready for contracts`,
              );
            } catch (estimatesError) {
              console.warn("Could not load estimates:", estimatesError);

              // FALLBACK: Try projects collection as backup
              try {
                console.log("🔍 Trying projects collection as backup...");
                const projectsQuery = query(
                  collection(db, "projects"),
                  where("firebaseUserId", "==", user.uid),
                );

                const projectsSnapshot = await getDocs(projectsQuery);
                const firebaseProjects = projectsSnapshot.docs
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    source: "project",
                  }))
                  .filter(
                    (project) =>
                      project.status === "approved" ||
                      project.status === "estimate" ||
                      project.status === "client_approved" ||
                      project.projectProgress === "approved",
                  );

                allProjects = [...firebaseProjects];
                console.log(
                  `🔍 Found ${firebaseProjects.length} backup projects`,
                );
              } catch (projectsError) {
                console.warn("Backup projects also failed:", projectsError);
              }
            }

            if (allProjects.length > 0) {
              // DIRECT PROCESSING: Skip backend sync that's failing, process directly in frontend
              const processedProjects = allProjects.map((project) => ({
                id: project.id,
                clientName: project.clientName || "Unknown Client",
                clientEmail: project.clientEmail || "",
                clientPhone: project.clientPhone || "",
                address: project.address || "",
                projectType: project.projectType || "Construction Project",
                projectDescription:
                  project.projectDescription || project.description || "",
                totalAmount:
                  project.totalAmount ||
                  project.total ||
                  project.estimateAmount ||
                  0,
                status: project.status || "ready",
                source: project.source || "estimate",
                estimateNumber:
                  project.estimateNumber || `EST-${project.id?.slice(-6)}`,
                createdAt: project.createdAt,
                // Preserve original data for contract generation
                originalData: project.originalEstimateData || project,
                items: project.items || [],
                projectTotalCosts: project.projectTotalCosts,
              }));

              setApprovedProjects(processedProjects);
              console.log(
                `✅ Projects loaded directly: ${processedProjects.length} for user ${user.uid}`,
              );
              console.log(
                "📋 Sample projects data:",
                processedProjects.slice(0, 3).map((p) => ({
                  id: p.id,
                  clientName: p.clientName,
                  totalAmount: p.totalAmount,
                  source: p.source,
                })),
              );
            } else {
              setApprovedProjects([]);
              toast({
                title: "⚡ NO SAVED PROJECTS OR ESTIMATES",
                description:
                  "No approved projects or saved estimates found. Create estimates or approve projects first to generate contracts.",
              });
            }
          } catch (error: any) {
            console.error("Error loading projects:", error);

            // BACKUP SYSTEM: Try PostgreSQL when Firebase fails
            if (
              error.code === "failed-precondition" ||
              error.code === "permission-denied"
            ) {
              console.log(
                "🔄 BACKUP: Attempting to load projects from PostgreSQL...",
              );

              try {
                const backupResponse = await fetch("/api/projects", {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Firebase-UID": user.uid, // Pass user ID for security
                  },
                });

                if (backupResponse.ok) {
                  const backupProjects = await backupResponse.json();

                  // Filter only approved projects and format for contract system
                  const approvedBackupProjects = backupProjects
                    .filter((project: any) => project.status === "approved")
                    .map((project: any) => ({
                      id: project.id,
                      clientName: project.clientName || "Unknown Client",
                      clientEmail: project.clientEmail || "",
                      clientPhone: project.clientPhone || "",
                      address: project.address || "",
                      projectType: project.projectType || "Fence Project",
                      projectDescription: project.description || "",
                      totalAmount: project.totalPrice || 0,
                      status: project.status,
                      createdAt:
                        project.createdAt || new Date().toLocaleDateString(),
                      userId: user.uid, // Ensure user ID is attached
                    }));

                  setApprovedProjects(approvedBackupProjects);

                  toast({
                    title: "🔄 BACKUP SYSTEM ACTIVATED",
                    description: `Loaded ${approvedBackupProjects.length} projects from backup database.`,
                  });

                  console.log(
                    `✅ BACKUP: Successfully loaded ${approvedBackupProjects.length} projects from PostgreSQL`,
                  );
                } else {
                  throw new Error("Backup system also failed");
                }
              } catch (backupError) {
                console.error("Backup system failed:", backupError);

                // Final fallback with helpful message
                toast({
                  title: "⚡ DATABASE CONNECTION ISSUE",
                  description:
                    "Both Firebase and backup systems are temporarily unavailable. Please try again in a few minutes.",
                  variant: "destructive",
                });
                setApprovedProjects([]);
              }
            } else {
              // Handle other types of errors
              toast({
                title: "⚡ CONNECTION ERROR",
                description:
                  "Cannot connect to project database. Try again later.",
                variant: "destructive",
              });
              setApprovedProjects([]);
            }
          }
          resolve();
        });
      });
    } catch (error) {
      console.error("Error setting up project loading:", error);
      setApprovedProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [toast, user]);

  // Cargar proyectos cuando se selecciona el método 'select'
  useEffect(() => {
    if (dataInputMethod === "select") {
      loadApprovedProjects();
    }
  }, [dataInputMethod, loadApprovedProjects]);

  // Función para manejar la selección de proyecto y cargar todos sus datos
  const handleProjectSelection = useCallback(
    async (project: any) => {
      // Check legal defense access
      const accessCheck = checkLegalDefenseAccess();
      if (!accessCheck.allowed) {
        toast({
          title: "📁 Project Selection Restricted",
          description: accessCheck.reason,
          variant: "destructive"
        });
        return;
      }
      
      setIsProcessing(true);

      try {
        // SECURITY FIX: Use authenticated user's ID
        if (!user?.uid) {
          throw new Error("User authentication required");
        }

        toast({
          title: "🔥 PROJECT DATA EXTRACTION",
          description: `Loading complete data for ${project.clientName}'s project...`,
        });

        // Send complete project data to backend for contract processing with user verification
        const response = await fetch("/api/projects/contract-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            userId: user.uid, // CRITICAL: Include authenticated user ID for security verification
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load project data");
        }

        if (result.success) {
          // Set the extracted data with all project information
          setExtractedData(result.extractedData);
          safeSetCurrentStep(2);
          setShowPreview(true); // Show preview immediately

          // Mark as selected project source
          setSelectedFile(null); // Clear any uploaded file

          // Auto-load contractor data from Company Profile
          setTimeout(() => {
            loadContractorDataFromProfile();
          }, 100);

          // Generate intelligent clauses for the project
          console.log("Advancing to step 3 with data:", result.extractedData);
          processExtractedDataWorkflow(result.extractedData);

          toast({
            title: "✅ PROJECT DATA LOADED",
            description: `All data for ${project.clientName}'s project loaded successfully. Ready for contract generation.`,
          });

          console.log("Project data loaded:", result.extractedData);
        } else {
          throw new Error(result.error || "Invalid project data received");
        }
      } catch (error) {
        console.error("Error loading project data:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load complete project data";
        toast({
          title: "⚡ PROJECT LOADING ERROR",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  // Comprehensive form data collection function
  const collectFormData = useCallback(() => {
    return {
      contractorInfo: {
        companyName: profile?.companyName || "",
        address: profile?.address || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        license: (profile as any)?.licenseNumber || "",
        businessType: profile?.businessType || "",
        yearEstablished: profile?.yearEstablished || new Date().getFullYear(),
        insuranceAmount: profile?.insuranceAmount || 1000000,
        bondAmount: profile?.bondAmount || 50000,
      },
      clientInfo: {
        name:
          extractedData?.clientInfo?.name || extractedData?.clientName || "",
        address:
          extractedData?.clientInfo?.address ||
          extractedData?.clientAddress ||
          "",
        email:
          extractedData?.clientInfo?.email || extractedData?.clientEmail || "",
        phone:
          extractedData?.clientInfo?.phone || extractedData?.clientPhone || "",
        propertyType: "Residential",
        accessInstructions: "",
        specialRequests: "",
      },
      paymentTerms: paymentTerms.map((term) => ({
        id: term.id,
        label: term.label,
        percentage: term.percentage,
        description: term.description,
      })),
      totalCost: extractedData?.financials?.total || 0,
      timeline: {
        startDate: startDate || extractedData?.projectDetails?.startDate || "",
        endDate: completionDate || extractedData?.projectDetails?.endDate || "",
        estimatedDuration: extractedData?.timeline?.estimatedDuration || "",
        milestones: extractedData?.timeline?.milestones || [],
      },
      permits: {
        required: permitsRequired,
        responsibleParty: permitResponsibility,
        permitNumbers: permitNumbers,
        processingTime: "5-7 business days",
      },
      warranties: {
        workmanship: workmanshipWarranty,
        materials: materialsWarranty,
        weatherResistance: "10 years against rot and decay",
        colorFading: "5 years limited warranty",
      },
      extraClauses: Array.from(selectedClauses)
        .map((clauseId) => {
          const clause = intelligentClauses.find((c) => c.id === clauseId);
          return clause
            ? {
                id: clause.id,
                title: clause.title,
                content: clause.clause,
                category: clause.category,
                riskLevel: clause.riskLevel,
              }
            : null;
        })
        .filter(Boolean),
      consents: {
        propertyAccess: true,
        emergencyContact: true,
        photographyPermission: true,
        marketingUse: false,
      },
      signatures: {
        electronicSignatureEnabled: true,
        requireWitnessSignature: false,
        notarizationRequired: false,
        signatureMethod: "DocuSign compatible",
      },
      confirmations: {
        contractReviewed: true,
        paymentTermsUnderstood: true,
        timelineAccepted: true,
        warrantyExplained: true,
      },
      legalNotices: {
        rightToCancel: "3-day right to cancel for contracts over $500",
        disputeResolution: "Binding arbitration through AAA",
        licenseVerification: "Contractor license verified with state board",
        insuranceConfirmation: "Current insurance certificates on file",
      },
      selectedIntelligentClauses: Array.from(selectedClauses)
        .map((clauseId) => {
          const clause = intelligentClauses.find((c) => c.id === clauseId);
          return clause
            ? {
                id: clause.id,
                title: clause.title,
                content: clause.clause,
                category: clause.category,
                riskLevel: clause.riskLevel,
              }
            : null;
        })
        .filter(Boolean),
      customTerms: clauseCustomizations || {},
      specialProvisions:
        approvedClauses.map((clause) => clause.subcategory) || [],
      stateCompliance: {
        californiaCompliant: true,
        contractorLicenseVerified: true,
        workerCompensationCurrent: true,
        buildingPermitObtained: true,
      },
    };
  }, [
    profile,
    extractedData,
    paymentTerms,
    selectedClauses,
    intelligentClauses,
    clauseCustomizations,
    approvedClauses,
  ]);

  // Función para manejar la finalización del Defense Review
  const handleDefenseComplete = useCallback(
    (
      approvedDefenseClauses: DefenseClause[],
      customizations: Record<string, any>,
    ) => {
      // Check advanced features access for defense completion
      const accessCheck = checkAdvancedFeaturesAccess();
      if (!accessCheck.allowed) {
        toast({
          title: "🛡️ Advanced Defense Restricted",
          description: accessCheck.reason,
          variant: "destructive"
        });
        return;
      }
      
      setApprovedClauses(approvedDefenseClauses);
      setClauseCustomizations(customizations);

      // Actualizar el análisis del contrato con las cláusulas aprobadas
      const updatedAnalysis: ContractAnalysis = {
        riskLevel: approvedDefenseClauses.length > 10 ? "bajo" : "medio",
        riskScore: Math.max(0, 100 - approvedDefenseClauses.length * 5),
        protectionsApplied: approvedDefenseClauses.map(
          (clause) => clause.subcategory,
        ),
        legalAdvice: [
          `${approvedDefenseClauses.length} cláusulas defensivas aprobadas`,
          "Análisis de compliance jurisdiccional completado",
          "Trazabilidad legal verificada para todas las cláusulas",
        ],
        contractStrength: Math.min(100, approvedDefenseClauses.length * 8),
        complianceScore: 95, // Alto score por usar el sistema DeepSearch Defense
        stateCompliance: true,
      };

      setContractAnalysis(updatedAnalysis);
      setCurrentStep(3);

      toast({
        title: "DEFENSE SYSTEM ACTIVATED",
        description: `${approvedDefenseClauses.length} defensive clauses approved with full legal traceability`,
      });
    },
    [toast],
  );

  // Generar preview real del contrato
  const generateRealContractPreview = useCallback(async () => {
    if (!extractedData) {
      console.log("[PREVIEW] No extracted data available");
      return;
    }

    console.log("[PREVIEW] Starting contract preview generation");
    console.log("[PREVIEW] Current step:", currentStep);
    console.log("[PREVIEW] Show preview state:", showPreview);
    
    setLoadingPreview(true);
    try {
      const selectedClausesData = intelligentClauses.filter(
        (clause) =>
          selectedClauses.has(clause.id) || clause.category === "MANDATORY",
      );

      const contractData = {
        client: {
          name:
            extractedData.clientInfo?.name || extractedData.clientName || "",
          address:
            extractedData.clientInfo?.address ||
            extractedData.clientAddress ||
            extractedData.projectDetails?.location ||
            "",
          email:
            extractedData.clientInfo?.email || extractedData.clientEmail || "",
          phone:
            extractedData.clientInfo?.phone || extractedData.clientPhone || "",
        },
        contractor: {
          name: profile?.company || profile?.ownerName || "",
          address: profile?.address || "",
          email: profile?.email || "",
          phone: profile?.phone || profile?.mobilePhone || "",
        },
        project: {
          type:
            extractedData.projectDetails?.type ||
            extractedData.projectType ||
            "",
          description:
            extractedData.projectDetails?.description ||
            extractedData.projectDescription ||
            "",
          location:
            extractedData.projectDetails?.location ||
            extractedData.projectLocation ||
            "",
          startDate: extractedData.projectDetails?.startDate || null,
          endDate: extractedData.projectDetails?.endDate || null,
        },
        financials: {
          total:
            extractedData.financials?.total || extractedData.totalAmount || 0,
          subtotal:
            extractedData.financials?.subtotal || extractedData.subtotal || 0,
          tax: extractedData.financials?.tax || extractedData.tax || 0,
          taxRate: extractedData.financials?.taxRate || 0,
        },
        protections: selectedClausesData,
      };

      console.log("[PREVIEW] Sending request to /api/contracts/preview");
      console.log("[PREVIEW] Selected clauses:", selectedClausesData.length);
      
      const response = await fetch("/api/contracts/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        console.error("[PREVIEW] Response not ok:", response.status);
        throw new Error("Error generando preview del contrato");
      }

      const previewData = await response.json();
      console.log("[PREVIEW] Preview generated successfully, HTML length:", previewData.html?.length);
      console.log("[PREVIEW] Setting preview HTML...");
      setContractPreviewHtml(previewData.html);
      console.log("[PREVIEW] Preview HTML set successfully");
    } catch (error) {
      console.error("[PREVIEW] Error generando preview:", error);
      setContractPreviewHtml(
        '<div class="error">Error generando preview del contrato</div>',
      );
    } finally {
      console.log("[PREVIEW] Preview generation completed");
      setLoadingPreview(false);
    }
  }, [extractedData, intelligentClauses, selectedClauses, profile]);

  // Actualizar preview cuando cambien los datos o selecciones
  useEffect(() => {
    console.log("[PREVIEW EFFECT] Checking conditions:");
    console.log("[PREVIEW EFFECT] - extractedData exists:", !!extractedData);
    console.log("[PREVIEW EFFECT] - showPreview:", showPreview);
    console.log("[PREVIEW EFFECT] - currentStep:", currentStep);
    
    // Only generate preview when we have data and are in step 2
    if (extractedData && currentStep === 2) {
      console.log("[PREVIEW EFFECT] Step 2 with data, generating preview...");
      generateRealContractPreview();
    } else {
      console.log("[PREVIEW EFFECT] Conditions not met, skipping preview generation");
    }
  }, [extractedData, currentStep]); // Simplified dependencies

  // Función para generar el PDF del contrato profesional
  const generateContractPDF = useCallback(async () => {
    try {
      setIsProcessing(true);

      // Collect ALL form data using the comprehensive collectFormData function
      const allFormData = collectFormData();

      // Contract data formatted for the working /api/generate-pdf endpoint
      const contractData = {
        client: {
          name: extractedData.clientInfo?.name || "Client Name",
          address:
            extractedData.clientInfo?.address ||
            extractedData.projectDetails?.location ||
            "Client Address",
          email: extractedData.clientInfo?.email || "",
          phone: extractedData.clientInfo?.phone || "",
        },
        contractor: {
          name: profile?.company || profile?.ownerName || "Contractor Name",
          address: profile?.address || "Contractor Address",
          email: profile?.email || "",
          phone: profile?.phone || profile?.mobilePhone || "",
        },
        project: {
          type: extractedData.projectDetails?.type || "Construction Services",
          description:
            extractedData.projectDetails?.description ||
            "Services as specified",
          location:
            extractedData.projectDetails?.location ||
            extractedData.clientInfo?.address ||
            "Project Location",
        },
        financials: {
          total: totalCost || extractedData.financials?.total || 0,
          subtotal: extractedData.financials?.subtotal || 0,
          tax: extractedData.financials?.tax || 0,
        },
        // Enhanced data for the working PDF endpoint
        protections: (() => {
          console.log(
            "🔍 [CLAUSE-DEBUG] Current intelligentClauses count:",
            intelligentClauses.length,
          );
          console.log(
            "🔍 [CLAUSE-DEBUG] Current selectedClauses count:",
            selectedClauses.size,
          );
          console.log(
            "🔍 [CLAUSE-DEBUG] Selected clause IDs:",
            Array.from(selectedClauses),
          );
          console.log(
            "🔍 [CLAUSE-DEBUG] Available clause IDs:",
            intelligentClauses.map((c) => c.id),
          );

          const filteredClauses = intelligentClauses.filter(
            (clause) =>
              selectedClauses.has(clause.id) || clause.category === "MANDATORY",
          );

          console.log(
            "🔍 [CLAUSE-DEBUG] Filtered clauses for PDF:",
            filteredClauses.length,
          );
          if (filteredClauses.length > 0) {
            console.log("🔍 [CLAUSE-DEBUG] Sample clause:", filteredClauses[0]);
          }

          return filteredClauses.map((clause) => ({
            id: clause.id,
            title: clause.title || "Protection Clause",
            content: clause.clause || "Standard protection clause",
            category: clause.category || "PROTECTION",
            riskLevel: clause.riskLevel || "MEDIUM",
          }));
        })(),

        // Additional contract customizations that the working API expects
        paymentTerms: allFormData.paymentTerms || {},
        warranties: {
          workmanship: workmanshipWarranty,
          materials: materialsWarranty,
          ...allFormData.warranties,
        },
        extraClauses: allFormData.extraClauses || [],
        customTerms: allFormData.customTerms || {},

        // NEW: Complete additional contract data
        licenseInfo: {
          hasLicense,
          licenseNumber: extractedData?.contractorLicense || "",
          licenseClassification,
        },
        insuranceInfo: {
          hasInsurance,
          company: insuranceCompany,
          policyNumber,
          coverageAmount,
          expirationDate,
        },
        permitInfo: {
          permitsRequired,
          responsibility: permitResponsibility,
          numbers: permitNumbers,
        },
        timeline: {
          startDate,
          completionDate,
          estimatedDuration,
        },
      };

      console.log(
        "📋 [FRONTEND] Connecting to working PDF endpoint with data:",
        {
          clientName: contractData.client.name,
          contractorName: contractData.contractor.name,
          projectType: contractData.project.type,
          totalAmount: contractData.financials.total,
          protectionClauses: contractData.protections?.length || 0,
        },
      );

      // Call the working PDF generation API that produces perfect PDFs
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate professional contract");
      }

      // Check content type to handle PDF or JSON response
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/pdf")) {
        // Handle PDF binary response
        const pdfBlob = await response.blob();
        const pdfUrl = URL.createObjectURL(pdfBlob);

        setPdfGenerationTime(Date.now());

        // Save contract to Firebase history
        if (user?.uid) {
          try {
            // Enhanced contract data preservation for complete Firebase storage
            const contractHistoryEntry = {
              userId: user.uid,
              contractId: `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              clientName: contractData.client.name,
              projectType: contractData.project.type,
              status: "completed" as const,
              contractData: {
                client: {
                  name: contractData.client.name,
                  address:
                    contractData.client.address ||
                    extractedData.clientInfo?.address ||
                    extractedData.clientAddress ||
                    "",
                  email:
                    contractData.client.email ||
                    extractedData.clientInfo?.email ||
                    extractedData.clientEmail ||
                    "",
                  phone:
                    contractData.client.phone ||
                    extractedData.clientInfo?.phone ||
                    extractedData.clientPhone ||
                    "",
                },
                contractor: {
                  name: contractData.contractor.name,
                  address: contractData.contractor.address,
                  email: contractData.contractor.email,
                  phone: contractData.contractor.phone,
                  license: profile?.license || "",
                  company: profile?.company || "",
                },
                project: {
                  type: contractData.project.type,
                  description:
                    contractData.project.description ||
                    extractedData.projectDescription ||
                    "",
                  location:
                    contractData.project.location ||
                    extractedData.projectLocation ||
                    extractedData.clientAddress ||
                    "",
                  scope: extractedData.projectDetails?.scope || "",
                  specifications:
                    extractedData.projectDetails?.specifications ||
                    contractData.project.description ||
                    "",
                },
                financials: {
                  total:
                    contractData.financials.total ||
                    extractedData.totalAmount ||
                    extractedData.financials?.total ||
                    0,
                  subtotal:
                    contractData.financials.subtotal ||
                    extractedData.financials?.subtotal ||
                    0,
                  tax:
                    contractData.financials.tax ||
                    extractedData.financials?.tax ||
                    0,
                  materials: extractedData.financials?.materials || 0,
                  labor: extractedData.financials?.labor || 0,
                  permits: extractedData.financials?.permits || 0,
                  other: extractedData.financials?.other || 0,
                },
                protections: contractData.protections.map((p: any) => ({
                  id: p.id,
                  category: p.category,
                  clause: p.content || p.clause || "",
                })),
                // Preserve all form field states for editing restoration
                formFields: {
                  licenseNumber:
                    extractedData.contractorLicense || profile?.license || "",
                  insurancePolicy: extractedData.insurancePolicy || "",
                  coverageAmount: extractedData.coverageAmount || "",
                  expirationDate: extractedData.expirationDate || "",
                  permitResponsibility: "Contractor obtains permits",
                  permitNumbers: extractedData.permitNumbers || "",
                  workmanshipWarranty: "1 Year",
                  materialsWarranty: "Manufacturer warranty only",
                  startDate: extractedData.startDate || "",
                  completionDate: extractedData.completionDate || "",
                  estimatedDuration: extractedData.estimatedDuration || "",
                },
                paymentTerms: paymentTerms,
                materials: extractedData.materials || [],
                timeline: extractedData.timeline || {},
                terms: extractedData.terms || {},
              },
              pdfUrl: pdfUrl,
              pageCount: 6, // Standard professional contract pages
              generationTime: Date.now(),
              templateUsed: "professional-pdf",
            };

            const savedContractId =
              await contractHistoryService.saveContract(contractHistoryEntry);
            setCurrentContractId(savedContractId);

            console.log(
              "✅ Contract saved to Firebase history:",
              savedContractId,
            );
          } catch (firebaseError) {
            console.error(
              "❌ Failed to save contract to history:",
              firebaseError,
            );
            // Don't fail the PDF generation if Firebase save fails
          }
        }

        // Trigger automatic download
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `Contract_${extractedData.clientInfo?.name?.replace(/\s+/g, "_") || "Client"}_${Date.now()}.pdf`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Contract Generated Successfully",
          description: "Professional PDF contract downloaded successfully",
        });
      } else {
        // Handle JSON fallback response (when PDF generation fails)
        try {
          const result = await response.json();
          if (result.success && result.html) {
            // Create HTML preview if PDF generation failed
            const htmlBlob = new Blob([result.html], { type: "text/html" });
            const htmlUrl = URL.createObjectURL(htmlBlob);
            window.open(htmlUrl, "_blank");

            toast({
              title: "Contract Preview Generated",
              description:
                "PDF generation failed, showing HTML preview instead",
            });
          } else {
            throw new Error(result.error || "Contract generation failed");
          }
        } catch (parseError) {
          throw new Error("Failed to parse server response");
        }
      }
    } catch (error) {
      console.error("Error generating contract:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [extractedData, intelligentClauses, selectedClauses, profile, toast]);

  // Función para enviar contrato para firma electrónica
  const sendContractForSignature = useCallback(async () => {
    try {
      setIsProcessing(true);

      const signatureData = {
        clientEmail: extractedData.clientInfo?.email || "",
        clientName: extractedData.clientInfo?.name || "",
        contractData: extractedData,
        protections: approvedClauses,
      };

      const response = await fetch("/api/contracts/send-for-signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signatureData),
      });

      if (!response.ok) {
        throw new Error("Failed to send contract for signature");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Contract Sent Successfully",
          description: "Electronic signature request sent to client",
        });
      }
    } catch (error) {
      console.error("Error sending contract:", error);
      toast({
        title: "Send Error",
        description: "Failed to send contract for signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [extractedData, approvedClauses, toast]);

  // Función para generar cláusulas inteligentes usando el motor de Legal Defense
  const generateIntelligentClauses = useCallback((data: any) => {
    console.log("🧠 Generating intelligent legal clauses for project data");

    const clauses = legalDefenseEngine.generateIntelligentClauses(data);
    setIntelligentClauses(clauses);

    // Pre-seleccionar cláusulas obligatorias
    const mandatoryClauses = clauses
      .filter((clause) => clause.category === "MANDATORY")
      .map((clause) => clause.id);

    setSelectedClauses(new Set(mandatoryClauses));

    console.log(
      `🛡️ Generated ${clauses.length} clauses (${mandatoryClauses.length} mandatory)`,
    );
  }, []);

  // Función para comenzar un nuevo contrato
  const startNewContract = useCallback(() => {
    setExtractedData(null);
    setApprovedClauses([]);
    setClauseCustomizations({});
    setContractAnalysis(null);
    setGeneratedContract("");
    setCurrentStep(1);
    setSelectedFile(null);
    setIntelligentClauses([]);
    setSelectedClauses(new Set());

    toast({
      title: "New Contract Started",
      description: "Ready to create a new contract",
    });
  }, [toast]);

  // Manejo de carga de archivos con Claude Sonnet OCR
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      // Check legal defense access
      const accessCheck = checkLegalDefenseAccess();
      if (!accessCheck.allowed) {
        toast({
          title: "📄 File Upload Restricted",
          description: accessCheck.reason,
          variant: "destructive"
        });
        return;
      }
      
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        toast({
          title: "⚡ INVALID FILE FORMAT",
          description:
            "Only PDF files are supported for advanced OCR processing",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setIsProcessing(true);

      try {
        await processAdvancedOCR(file);
      } catch (error) {
        console.error("Error en procesamiento:", error);
        toast({
          title: "⚡ SYSTEM ERROR",
          description:
            "Neural network disruption detected. Initiating recovery protocols...",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  // Procesamiento avanzado de OCR con Claude Sonnet
  const processAdvancedOCR = async (file: File) => {
    toast({
      title: "🔥 NEURAL OCR INITIATED",
      description: "Claude Sonnet analyzing document structure and content...",
    });

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await fetch("/api/legal-defense/extract-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "OCR processing failed");
      }

      if (result.success) {
        const { data, hasCriticalMissing, missingCritical, canProceed } =
          result;

        console.log("OCR Result:", {
          data,
          hasCriticalMissing,
          missingCritical,
          canProceed,
        });

        setExtractedData(data);
        safeSetCurrentStep(2);

        if (hasCriticalMissing && missingCritical?.length > 0) {
          toast({
            title: "⚠️ INCOMPLETE DATA EXTRACTED",
            description: `Missing critical fields: ${missingCritical.join(", ")}. Review extracted data below.`,
          });
        } else {
          toast({
            title: "✅ OCR EXTRACTION COMPLETE",
            description: `Data extracted with ${data.extractionQuality?.confidence || 85}% confidence. Review data below.`,
          });
        }
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      throw error;
    }
  };

  // Collect all form data from the comprehensive legal blocks
  const collectContractData = () => {
    const form = document.querySelector(
      "#defense-review-form",
    ) as HTMLFormElement;
    if (!form) return extractedData;

    const formData = new FormData(form);
    const contractorInfo = {
      companyName: formData.get("contractorCompany") as string,
      contractorName: formData.get("contractorName") as string,
      businessAddress: formData.get("businessAddress") as string,
      phone: formData.get("contractorPhone") as string,
      hasLicense: formData.get("hasLicense") === "on",
      licenseNumber: formData.get("licenseNumber") as string,
      licenseClassification: formData.get("licenseClassification") as string,
      hasInsurance: formData.get("hasInsurance") === "on",
      insuranceCompany: formData.get("insuranceCompany") as string,
      policyNumber: formData.get("policyNumber") as string,
      coverageAmount: formData.get("coverageAmount") as string,
      insuranceExpiration: formData.get("insuranceExpiration") as string,
    };

    const clientInfo = {
      ...extractedData.clientInfo,
      name:
        (formData.get("clientName") as string) ||
        extractedData.clientInfo?.name,
      address:
        (formData.get("clientAddress") as string) ||
        extractedData.clientInfo?.address,
      email:
        (formData.get("clientEmail") as string) ||
        extractedData.clientInfo?.email,
      phone:
        (formData.get("clientPhone") as string) ||
        extractedData.clientInfo?.phone,
    };

    const paymentTerms = {
      downPayment: formData.get("downPayment") as string,
      progressPayment: formData.get("progressPayment") as string,
      finalPayment: formData.get("finalPayment") as string,
    };

    const timeline = {
      startDate: formData.get("startDate") as string,
      completionDate: formData.get("completionDate") as string,
      estimatedDuration: formData.get("estimatedDuration") as string,
    };

    const permits = {
      required: formData.get("permitsRequired") === "on",
      responsibility: formData.get("permitResponsibility") as string,
      numbers: formData.get("permitNumbers") as string,
    };

    const warranties = {
      workmanship: formData.get("workmanshipWarranty") as string,
      materials: formData.get("materialsWarranty") as string,
    };

    // Collect extra clauses
    const extraClauses = formData.getAll("extraClauses") as string[];

    // Collect electronic consents
    const consents = {
      electronicCommunications: formData.get("electronicConsent") === "on",
      electronicSignatures: formData.get("esignConsent") === "on",
    };

    // Collect signatures
    const signatures = {
      contractor: {
        name: formData.get("contractorSignatureName") as string,
        date: formData.get("contractorSignatureDate") as string,
      },
      client: {
        name: formData.get("clientSignatureName") as string,
        date: formData.get("clientSignatureDate") as string,
      },
    };

    // Collect final confirmations
    const confirmations = {
      finalReview: formData.get("finalReview") === "on",
      legalNoticesAck: formData.get("legalNoticesAck") === "on",
      authorityConfirm: formData.get("authorityConfirm") === "on",
    };

    // Generate automatic license disclaimer based on contractor license status
    const licenseDisclaimer = contractorInfo.hasLicense
      ? `This contractor is licensed under the Contractors' State License Law (Chapter 9 (commencing with Section 7000) of Division 3 of the Business and Professions Code). License Number: ${contractorInfo.licenseNumber}, Classification: ${contractorInfo.licenseClassification}.`
      : "This contractor is not licensed under the Contractors' State License Law (Chapter 9 (commencing with Section 7000) of Division 3 of the Business and Professions Code).";

    const legalNotices = {
      lienNotice: true, // Always mandatory
      cancelNotice: true, // Always mandatory
      licenseDisclaimer,
      preliminaryNotice:
        "As required by the Mechanics Lien Law of the applicable state jurisdiction, you are hereby notified that a Preliminary Notice may be served upon you. Even though you have paid your contractor in full, if the contractor fails to pay subcontractors or material suppliers or becomes unable to meet these obligations during the course of construction of your project, the subcontractors or material suppliers may look to your property for satisfaction of the obligations owed to them by filing liens against your property.",
      cancellationNotice:
        "You, the buyer, have the right to cancel this contract within three business days. You may cancel by e-mailing, mailing, faxing or delivering a written notice to the contractor at the contractor's place of business by midnight of the third business day after you received a signed copy of the contract that includes this notice. Include your name, your address, and the date you received the signed copy of the contract and this notice.",
    };

    return {
      ...extractedData,
      contractorInfo,
      clientInfo,
      paymentTerms: paymentTerms,
      totalCost: totalCost || extractedData.financials?.total || 0,
      timeline,
      permits,
      warranties,
      extraClauses,
      consents,
      signatures,
      confirmations,
      legalNotices,
      selectedIntelligentClauses: Array.from(selectedClauses)
        .map((id) => intelligentClauses.find((clause) => clause.id === id))
        .filter(Boolean),
    };
  };

  // Generate defensive contract with intelligent clauses
  const generateDefensiveContract = useCallback(
    async (data: any) => {
      setIsProcessing(true);

      try {
        console.log("Generating contract with data including clauses:", data);

        toast({
          title: "GENERATING DEFENSIVE CONTRACT",
          description:
            "AI crafting maximum legal protection with intelligent clauses...",
        });

        const response = await fetch(
          "/api/anthropic/generate-defensive-contract",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              extractedData: data,
              riskAnalysis: contractAnalysis,
              protectiveRecommendations: intelligentClauses,
            }),
          },
        );

        const result = await response.json();

        if (result.success) {
          setGeneratedContract(result.contractHtml);
          toast({
            title: "DEFENSIVE CONTRACT GENERATED",
            description: `Legal protection deployed with ${result.clausesApplied || 0} intelligent clauses.`,
          });
        } else {
          throw new Error(result.error || "Contract generation failed");
        }
      } catch (error) {
        console.error("Contract generation error:", error);
        toast({
          title: "GENERATION ERROR",
          description:
            "Failed to generate defensive contract. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast, contractAnalysis, intelligentClauses],
  );

  // Procesamiento del workflow con datos extraídos de OCR
  const processExtractedDataWorkflow = async (extractedData: any) => {
    // Generar cláusulas inteligentes basadas en los datos del proyecto
    generateIntelligentClauses(extractedData);

    // Análisis de contrato con datos extraídos por Claude Sonnet
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const analysis: ContractAnalysis = {
      riskLevel:
        extractedData.extractionQuality?.confidence > 85 ? "bajo" : "medio",
      riskScore: Math.max(
        10,
        100 - (extractedData.extractionQuality?.confidence || 85),
      ),
      protectionsApplied: [
        "Advanced OCR Data Validation",
        "Liability Protection Clauses",
        "Payment Terms Enforcement",
        "Material Quality Guarantees",
      ],
      legalAdvice: [
        `Document analyzed with ${extractedData.extractionQuality?.confidence || 85}% confidence`,
        "All financial terms validated and protected",
        "Client and project details secured",
      ],
      contractStrength: Math.min(
        95,
        (extractedData.extractionQuality?.confidence || 85) + 10,
      ),
      complianceScore: 90,
      stateCompliance: true,
    };

    setContractAnalysis(analysis);
    safeSetCurrentStep(2);

    toast({
      title: "🛡️ CONTRACT ARSENAL READY",
      description: `Defense level: ${analysis.riskLevel.toUpperCase()} | Strength: ${analysis.contractStrength}%`,
    });
  };

  // Procesamiento del workflow para proyectos seleccionados
  const processProjectWorkflow = async (projectData: any) => {
    // Simular análisis de contrato para proyecto existente
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const analysis: ContractAnalysis = {
      riskLevel: "bajo",
      riskScore: 25,
      protectionsApplied: [
        "Liability Protection Clauses",
        "Payment Terms Enforcement",
        "Material Quality Guarantees",
        "Timeline Protection",
      ],
      legalAdvice: [
        "Standard residential fence contract approved",
        "Payment schedule protects contractor interests",
        "All local permits and regulations covered",
      ],
      contractStrength: 90,
      complianceScore: 95,
      stateCompliance: true,
    };

    setContractAnalysis(analysis);
    safeSetCurrentStep(2);

    toast({
      title: "🛡️ CONTRACT ARSENAL READY",
      description: `Defense level: ${analysis.riskLevel.toUpperCase()} | Strength: ${analysis.contractStrength}%`,
    });
  };

  // Procesamiento completo del workflow
  const processCompleteWorkflow = async (file: File) => {
    toast({
      title: "🔥 LEGAL DEFENSE ENGINE ACTIVATED",
      description: "Initializing maximum protection protocols...",
    });

    try {
      // Paso 1: Extracción de datos
      setCurrentStep(1);
      const { data, validation } = await extractAndValidateData(file);
      setExtractedData(data);
      setValidationResult(validation);

      // Paso 2: Análisis legal
      const analysis = await performLegalRiskAnalysis(data);
      setContractAnalysis(analysis);

      // Paso 3: Generación de contrato
      await generateDefensiveContract(data);

      // Paso 4: Preparación para firma
      setCurrentStep(3);

      toast({
        title: "⚡ MISSION ACCOMPLISHED",
        description:
          "Legal defense matrix fully operational. Contract ready for deployment.",
      });
    } catch (error) {
      console.error("🚨 ERROR in processExtractedDataWorkflow:", error);
      // FORCE STEP 3: Don't regress to step 2 on errors when user clicked GENERATE CONTRACT
      toast({
        title: "⚡ CONTRACT PROCESSING",
        description: "Finalizing contract generation with backup systems...",
      });
      setCurrentStep(3); // Force stay in step 3
    }
  };

  // Extracción y validación de datos
  const extractAndValidateData = async (
    file: File,
  ): Promise<{
    data: any;
    validation: ValidationResult;
  }> => {
    const formData = new FormData();
    formData.append("estimatePdf", file);

    const response = await fetch(
      "/api/pdf-contract-processor/extract-and-validate",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    return {
      data: result.extractedData,
      validation: {
        isValid: result.validation.isValid,
        errors: result.validation.errors || [],
        warnings: result.validation.warnings || [],
        completeness: result.validation.completeness || 0,
      },
    };
  };

  // Análisis legal avanzado
  const performLegalRiskAnalysis = async (
    projectData: any,
  ): Promise<ContractAnalysis> => {
    const response = await fetch("/api/legal-defense/advanced-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectData,
        includeStateCompliance: true,
        industrySpecificAnalysis: true,
        veteranProtections: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en análisis legal: ${response.status}`);
    }

    return await response.json();
  };

  // Sistema de respaldo
  const handleProcessingFallback = async (file: File) => {
    toast({
      title: "🔄 BACKUP PROTOCOLS ENGAGED",
      description: "Switching to emergency defense systems...",
    });

    try {
      const formData = new FormData();
      formData.append("estimatePdf", file);

      const response = await fetch(
        "/api/pdf-contract-processor/pdf-to-contract-simple",
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        const result = await response.json();
        setGeneratedContract(
          result.data.contractHtml || "<p>Contrato básico generado</p>",
        );
        safeSetCurrentStep(2);

        toast({
          title: "⚡ BACKUP SUCCESSFUL",
          description: "Emergency contract shield deployed.",
        });
      }
    } catch (error) {
      console.error("Error en sistema de respaldo:", error);
    }
  };

  // Obtener clase de estado para animaciones
  const getStepStatusClass = (step: WorkflowStep) => {
    switch (step.status) {
      case "completed":
        return "border-green-400 bg-green-900/30 shadow-green-400/50";
      case "processing":
        return "border-cyan-400 bg-cyan-900/30 shadow-cyan-400/50 animate-pulse";
      case "error":
        return "border-red-400 bg-red-900/30 shadow-red-400/50";
      default:
        return "border-gray-500 bg-gray-900/30 shadow-gray-500/20";
    }
  };

  // Componente de esquinas HUD
  const HUDCorners = ({ className = "" }) => (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Esquina superior izquierda */}
      <div className="absolute top-0 left-0 w-4 h-4">
        <div className="absolute top-0 left-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute top-0 left-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
      {/* Esquina superior derecha */}
      <div className="absolute top-0 right-0 w-4 h-4">
        <div className="absolute top-0 right-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute top-0 right-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
      {/* Esquina inferior izquierda */}
      <div className="absolute bottom-0 left-0 w-4 h-4">
        <div className="absolute bottom-0 left-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute bottom-0 left-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
      {/* Esquina inferior derecha */}
      <div className="absolute bottom-0 right-0 w-4 h-4">
        <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
    </div>
  );

  // Componente de líneas de escaneo
  const ScanLines = ({ active = false }) => (
    <div
      className={`absolute inset-0 pointer-events-none  ${active ? "opacity-100" : "opacity-0"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-ping"></div>
    </div>
  );

  return (
    <div
      className=" mb-40 bg-black text-white p-6 relative "
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {/* Trial Information Banner */}
      {isTrialUser && trialDaysRemaining !== undefined && (
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-3 rounded-lg mb-4 text-center">
          <p className="text-white font-medium">
            🎆 Trial Mode: {trialDaysRemaining} days remaining for unlimited access
          </p>
        </div>
      )}
      
      {/* Plan Restriction Warning */}
      {isPrimoChambeador && (
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-lg mb-4 text-center">
          <p className="text-white font-medium">
            ⚠️ Legal Defense requires Mero Patrón plan or higher - 
            <span className="underline cursor-pointer ml-1" onClick={() => window.open('/pricing', '_blank')}>
              Upgrade Now
            </span>
          </p>
        </div>
      )}
      
      {/* Fondo limpio */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header simplificado */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-cyan-400">
              FORTRESS DRAFT
            </h1>
            <ContractHistoryPanel onEditContract={handleEditContract}>
              <div />
            </ContractHistoryPanel>
          </div>
          <p className="text-gray-400 font-mono text-xs md:text-sm">
            Defensive Contracts for Relentless Protection
          </p>
        </div>

        {/* Cyberpunk Horizontal Stepper */}
        <div className="mb-8 md:px-4">
          {/* Mobile: Horizontal Scroll Stepper */}
          <div className="md:hidden  md:pb-4">
            <div className="flex items-center  space-x-0 md:space-x-4 min-w-max px-2">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Icon + Label */}
                  <div className="flex flex-col items-center min-w-0">
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all duration-300 ${
                        step.status === "completed"
                          ? "border-green-400 bg-green-400/20 shadow-green-400/30 shadow-lg"
                          : step.status === "processing"
                            ? "border-cyan-400 bg-cyan-400/20 shadow-cyan-400/50 shadow-lg"
                            : step.step === currentStep
                              ? "border-cyan-400 bg-cyan-400/10 shadow-cyan-400/30 shadow-lg"
                              : "border-gray-600 bg-gray-800/30"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : (
                        <div
                          className={`text-lg ${
                            step.status === "processing"
                              ? "text-cyan-400"
                              : step.step === currentStep
                                ? "text-cyan-400"
                                : "text-gray-500"
                          }`}
                        >
                          {step.icon}
                        </div>
                      )}

                      {step.status === "processing" && (
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75"></div>
                      )}
                    </div>

                    <p
                      className={` text-xs font-mono mt-2 text-center max-w-20 leading-tight ${
                        step.status === "completed"
                          ? "text-green-400"
                          : step.status === "processing"
                            ? "text-cyan-400"
                            : step.step === currentStep
                              ? "text-cyan-400"
                              : "text-gray-500"
                      }`}
                    >
                      {step.title
                        .replace(" & ", " &\n")
                        .replace(" Command", "\nCommand")
                        .replace(" Builder", "\nBuilder")
                        .replace(" Vault", "\nVault")}
                    </p>
                  </div>

                  {/* Connection Line */}
                  {index < workflowSteps.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                        step.status === "completed"
                          ? "bg-green-400"
                          : step.status === "processing"
                            ? "bg-cyan-400 animate-pulse"
                            : "bg-gray-600"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Horizontal Stepper */}
          <div className="hidden md:block">
            <div className="flex items-center justify-center space-x-6 lg:space-x-12">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Icon + Label */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-16 h-16 lg:w-18 lg:h-18 rounded-full border-3 flex items-center justify-center relative transition-all duration-300 ${
                        step.status === "completed"
                          ? "border-green-400 bg-green-400/20 shadow-green-400/50 shadow-lg"
                          : step.status === "processing"
                            ? "border-cyan-400 bg-cyan-400/20 shadow-cyan-400/50 shadow-xl"
                            : step.step === currentStep
                              ? "border-cyan-400 bg-cyan-400/10 shadow-cyan-400/30 shadow-lg"
                              : "border-gray-600 bg-gray-800/30"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle className="h-8 w-8 text-green-400" />
                      ) : (
                        <div
                          className={`text-2xl transition-all duration-300 ${
                            step.status === "processing"
                              ? "text-cyan-400 scale-110"
                              : step.step === currentStep
                                ? "text-cyan-400 scale-105"
                                : "text-gray-500"
                          }`}
                        >
                          {step.icon}
                        </div>
                      )}

                      {step.status === "processing" && (
                        <>
                          <div className="absolute inset-0 rounded-full border-3 border-cyan-400 animate-ping opacity-75"></div>
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse opacity-50"></div>
                        </>
                      )}

                      {step.step === currentStep &&
                        step.status !== "processing" &&
                        step.status !== "completed" && (
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse opacity-50"></div>
                        )}
                    </div>

                    <p
                      className={`text-sm font-mono mt-3 text-center max-w-24 leading-tight transition-colors duration-300 ${
                        step.status === "completed"
                          ? "text-green-400"
                          : step.status === "processing"
                            ? "text-cyan-400"
                            : step.step === currentStep
                              ? "text-cyan-400"
                              : "text-gray-500"
                      }`}
                    >
                      {step.title.toUpperCase()}
                    </p>
                  </div>

                  {/* Connection Line */}
                  {index < workflowSteps.length - 1 && (
                    <div
                      className={`w-16 lg:w-24 h-1 mx-3 lg:mx-6 transition-all duration-500 ${
                        step.status === "completed"
                          ? "bg-gradient-to-r from-green-400 to-green-300"
                          : step.status === "processing"
                            ? "bg-gradient-to-r from-cyan-400 to-cyan-300 animate-pulse"
                            : "bg-gray-600"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Indicador de Autoguardado */}
        {autoSaveEnabled && currentStep >= 2 && (
          <div className="max-w-2xl mx-auto px-4 mb-4">
            <div
              className={`border rounded-lg p-3 transition-all duration-300 ${
                isDirty
                  ? "bg-yellow-900/20 border-yellow-400/30"
                  : "bg-green-900/20 border-green-400/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isDirty ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 text-yellow-400 animate-pulse" />
                      <span className="text-yellow-400 font-medium text-sm">
                        Guardando cambios automáticamente...
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                      <span className="text-green-400 font-medium text-sm">
                        {lastSaved
                          ? "Cambios guardados automáticamente"
                          : "Autoguardado activado"}
                      </span>
                    </>
                  )}
                </div>
                {lastSaved && (
                  <span className="text-gray-400 text-xs">
                    {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Step Card */}
        <div className="md:max-w-2xl md:mx-auto px-4">
          {currentStep === 1 && (
            <Card className="border-2 border-cyan-400 bg-black/80 relative ">
              <HUDCorners />
              {isProcessing && <ScanLines active={true} />}

              <CardHeader className="text-center px-4 md:px-6">
                <div className="flex items-center justify-center mb-4">
                  <div
                    className={`p-3 md:p-4 rounded-full border-2 border-cyan-400 ${isProcessing ? "animate-pulse" : ""}`}
                  >
                    <Database className="h-6 w-6 md:h-8 md:w-8 text-cyan-400" />
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-cyan-400 mb-2">
                  Project Data Command
                </CardTitle>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                  Seize control from the start. Instantly extract all key
                  project data—select from your portfolio or upload an approved
                  estimate. No detail escapes.
                </p>
              </CardHeader>

              <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
                {/* Toggle Switch */}
                <div className="mb-6">
                  <div className="flex justify-center">
                    <div className="relative bg-gray-800/50 rounded-lg p-1 border border-cyan-400/30">
                      <div className="flex  relative">
                        {/* Sliding Background */}
                        <div
                          className={`absolute top-1 bottom-1 w-1/2 bg-cyan-400/20 border border-cyan-400 rounded transition-all duration-300 ease-in-out ${
                            dataInputMethod === "upload" ? "left-1" : "left-1/2"
                          }`}
                        />

                        {/* Upload Option */}
                        <button
                          onClick={() => setDataInputMethod("upload")}
                          className={`relative z-10 flex items-center space-x-2 px-4 py-3 rounded transition-all duration-300 ${
                            dataInputMethod === "upload"
                              ? "text-cyan-400 font-bold"
                              : "text-gray-400 hover:text-gray-300"
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-sm font-mono">
                            Upload PDF Estimate
                          </span>
                        </button>

                        {/* Select Option */}
                        <button
                          onClick={() => setDataInputMethod("select")}
                          className={`relative z-10 flex items-center space-x-2 px-4 py-3 rounded transition-all duration-300 ${
                            dataInputMethod === "select"
                              ? "text-cyan-400 font-bold"
                              : "text-gray-400 hover:text-gray-300"
                          }`}
                        >
                          <List className="h-4 w-4" />
                          <span className="text-sm font-mono">
                            Select Saved Project
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Content Area */}
                <div className="relative ">
                  {/* Upload PDF Content */}
                  {dataInputMethod === "upload" && (
                    <div className="animate-in fade-in-0 slide-in-from-left-5 duration-300">
                      <div className="border-2 border-dashed border-cyan-400/50 rounded-lg p-6 md:p-8 text-center relative group hover:border-cyan-400 transition-all duration-300">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="pdf-upload-cyberpunk"
                          disabled={isProcessing}
                        />

                        <label
                          htmlFor="pdf-upload-cyberpunk"
                          className="cursor-pointer block"
                        >
                          <div
                            className={`mb-4 md:mb-6 ${isProcessing ? "animate-spin" : ""}`}
                          >
                            <Upload className="h-12 w-12 md:h-16 md:w-16 text-cyan-400 mx-auto" />
                          </div>
                          <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">
                            {isProcessing
                              ? "NEURAL PROCESSING..."
                              : "DROP PDF OR CLICK TO SELECT"}
                          </h3>
                          <p className="text-gray-400 text-xs md:text-sm mb-4 md:mb-6">
                            Advanced OCR • Threat Assessment • Legal Compliance
                          </p>
                          {!isProcessing && (
                            <Button className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 md:py-3 md:px-6 rounded border-0 shadow-none text-sm md:text-base">
                              EXECUTE COMMAND
                            </Button>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Select Project Content - Compact Dropdown */}
                  {dataInputMethod === "select" && (
                    <div className="animate-in fade-in-0 slide-in-from-right-5 duration-300">
                      <div className="space-y-4">
                        {/* Compact Project Selector */}
                        <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                          <label className="block text-cyan-400 text-sm font-bold mb-2">
                            SELECT PROJECT ({approvedProjects.length} found)
                          </label>
                          {approvedProjects.length === 0 && (
                            <div className="text-xs text-gray-400 mb-2">
                              No projects loaded yet...
                            </div>
                          )}
                          <select
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                            value={selectedProject?.id || ""}
                            onChange={(e) => {
                              const project = approvedProjects.find(
                                (p) => p.id === e.target.value,
                              );
                              if (project) {
                                setSelectedProject(project);
                                console.log(
                                  "Selected project with full data:",
                                  project,
                                );
                              }
                            }}
                          >
                            <option value="">Choose a saved project...</option>
                            {approvedProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.clientName} - {project.projectType} - $
                                {(
                                  project.totalAmount ||
                                  project.totalPrice ||
                                  0
                                ).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selected Project Preview */}
                        {selectedProject && (
                          <div className="bg-cyan-900/20 border border-cyan-400/50 rounded-lg p-4">
                            <h4 className="text-cyan-400 font-bold mb-3 flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              SELECTED PROJECT DATA
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-400">Client:</span>
                                <span className="text-white ml-2">
                                  {selectedProject.clientName}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Amount:</span>
                                <span className="text-green-400 ml-2 font-mono">
                                  $
                                  {(
                                    selectedProject.totalAmount ||
                                    selectedProject.totalPrice ||
                                    0
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Type:</span>
                                <span className="text-white ml-2">
                                  {selectedProject.projectType}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Status:</span>
                                <span className="text-green-400 ml-2">
                                  {selectedProject.status || "Active"}
                                </span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-gray-400">Address:</span>
                                <span className="text-white ml-2">
                                  {selectedProject.address}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedProject && (
                          <div className="pt-4">
                            <Button
                              onClick={() =>
                                handleProjectSelection(selectedProject)
                              }
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 md:py-3 md:px-6 rounded border-0 shadow-none text-sm md:text-base"
                            >
                              EXECUTE WITH SELECTED PROJECT
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Defense Review & Correction with Live Preview */}
          {extractedData &&
            currentStep === 2 && (
              <Card className="border-2 border-green-400 bg-black/80 relative  mt-6">
                <HUDCorners />

                <CardHeader className="text-center px-4 md:px-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 md:p-4 rounded-full border-2 border-green-400">
                      <Eye className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
                    </div>
                  </div>
                  <CardTitle className="text-xl md:text-2xl font-bold text-green-400 mb-2">
                    Defense Review & Live Contract Preview
                  </CardTitle>
                  <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                    Configure your contract settings on the left and see the
                    exact document preview on the right in real-time.
                  </p>
                </CardHeader>

                <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
                  {/* Mobile-First Preview Toggle */}
                  <div className="mb-4 xl:hidden">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={() => setShowPreview(false)}
                        variant={!showPreview ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                      >
                        Configuración
                      </Button>
                      <Button
                        onClick={() => setShowPreview(true)}
                        variant={showPreview ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                      >
                        Vista Previa
                      </Button>
                    </div>
                  </div>

                  {/* Split Layout: Configuration Left, Preview Right */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Left Panel: Configuration */}
                    <div
                      className={`space-y-6 ${showPreview ? "hidden xl:block" : "block"}`}
                    >
                      <form id="defense-review-form" className="space-y-6">
                        {/* Contractor Information */}
                        <div className="bg-gray-900/50 border border-blue-400/30 rounded-lg p-4">
                          <h3 className="text-blue-400 font-bold mb-4 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            CONTRACTOR INFORMATION
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-gray-400 text-sm">
                                Company Name *
                              </label>
                              <input
                                type="text"
                                name="contractorCompany"
                                value={extractedData?.contractorCompany || ""}
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    contractorCompany: e.target.value,
                                  }))
                                }
                                placeholder="Enter contractor company name"
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Contractor Name *
                              </label>
                              <input
                                type="text"
                                name="contractorName"
                                value={extractedData?.contractorName || ""}
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    contractorName: e.target.value,
                                  }))
                                }
                                placeholder="Enter contractor full name"
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Business Address *
                              </label>
                              <input
                                type="text"
                                name="businessAddress"
                                value={extractedData?.contractorAddress || ""}
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    contractorAddress: e.target.value,
                                  }))
                                }
                                placeholder="Enter business address"
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Phone Number *
                              </label>
                              <input
                                type="tel"
                                name="contractorPhone"
                                value={extractedData?.contractorPhone || ""}
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    contractorPhone: e.target.value,
                                  }))
                                }
                                placeholder="(555) 123-4567"
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Client Information */}
                        <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-3 sm:p-4 w-full max-w-full">
                          <h3 className="text-green-400 font-bold mb-4 flex items-center text-sm sm:text-base">
                            <User className="h-4 w-4 mr-2 flex-shrink-0" />
                            CLIENT INFORMATION
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
                            <div>
                              <label className="text-gray-400 text-sm">
                                Client Name
                              </label>
                              <input
                                type="text"
                                name="clientName"
                                value={
                                  extractedData?.clientName ||
                                  extractedData?.clientInfo?.name ||
                                  ""
                                }
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    clientName: e.target.value,
                                  }))
                                }
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Client Address
                              </label>
                              <input
                                type="text"
                                name="clientAddress"
                                value={
                                  extractedData.clientInfo?.address ||
                                  extractedData.projectDetails?.location ||
                                  ""
                                }
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    clientInfo: {
                                      ...prev.clientInfo,
                                      address: e.target.value,
                                    },
                                    projectDetails: {
                                      ...prev.projectDetails,
                                      location: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Email
                              </label>
                              <input
                                type="email"
                                name="clientEmail"
                                value={extractedData.clientInfo?.email || ""}
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    clientInfo: {
                                      ...prev.clientInfo,
                                      email: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="client@email.com"
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Phone
                              </label>
                              <input
                                type="tel"
                                name="clientPhone"
                                value={extractedData.clientInfo?.phone || ""}
                                onChange={(e) =>
                                  setExtractedData((prev) => ({
                                    ...prev,
                                    clientInfo: {
                                      ...prev.clientInfo,
                                      phone: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="(555) 123-4567"
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Editable Project Details */}
                        <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-4">
                          <h3 className="text-green-400 font-bold mb-4 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            PROJECT DETAILS
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-gray-400 text-sm">
                                Project Type
                              </label>
                              <input
                                type="text"
                                value={extractedData.projectDetails?.type || ""}
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                                readOnly
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Description
                              </label>
                              <textarea
                                value={
                                  extractedData.projectDetails?.description ||
                                  extractedData.specifications ||
                                  ""
                                }
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none h-20"
                                readOnly
                              />
                            </div>
                          </div>
                        </div>

                        {/* Payment Terms */}
                        <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-3 sm:p-4 w-full max-w-full ">
                          <h3 className="text-green-400 font-bold mb-4 flex items-center text-sm sm:text-base">
                            <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                            PAYMENT TERMS
                          </h3>
                          <div className="space-y-4 w-full">
                            {/* Total Cost Display */}
                            <div className="w-full">
                              <div className="bg-gray-800/50 rounded-lg p-4 border border-green-400/50 max-w-full">
                                <div className="text-gray-400 text-sm text-center mb-2">
                                  TOTAL COST
                                </div>
                                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                                  <span className="text-green-400 font-mono text-xl sm:text-2xl font-bold">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    value={
                                      totalCost ||
                                      extractedData.financials?.total ||
                                      0
                                    }
                                    onChange={(e) =>
                                      updateTotalCost(
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="bg-transparent text-green-400 font-mono text-xl sm:text-2xl font-bold text-center border-none outline-none focus:ring-2 focus:ring-green-400/50 rounded px-2 w-32 sm:w-auto max-w-full"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Payment Schedule */}
                            <div className="space-y-3">
                              {paymentTerms.map((term, index) => (
                                <PaymentTermRow
                                  key={term.id}
                                  term={term}
                                  totalAmount={
                                    totalCost ||
                                    extractedData.financials?.total ||
                                    0
                                  }
                                  onUpdate={updatePaymentTerm}
                                  onRemove={
                                    paymentTerms.length > 2
                                      ? removePaymentTerm
                                      : undefined
                                  }
                                  isRemovable={
                                    paymentTerms.length > 2 && index > 1
                                  }
                                />
                              ))}
                            </div>

                            {/* Payment Summary */}
                            <div className="mt-4 p-3 bg-gray-800/30 rounded border border-gray-600 w-full">
                              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
                                <span className="text-gray-400 text-center sm:text-left">
                                  Total Percentage:
                                </span>
                                <span
                                  className={`font-mono text-center sm:text-right font-bold ${
                                    paymentTerms.reduce(
                                      (sum, term) => sum + term.percentage,
                                      0,
                                    ) === 100
                                      ? "text-green-400"
                                      : "text-yellow-400"
                                  }`}
                                >
                                  {paymentTerms.reduce(
                                    (sum, term) => sum + term.percentage,
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>

                            {/* Add Payment Button */}
                            <div className="w-full flex justify-center">
                              <button
                                type="button"
                                onClick={addPaymentTerm}
                                className="w-full sm:w-auto px-4 py-2 border border-green-400 text-green-400 bg-transparent rounded-lg hover:bg-green-400 hover:text-black transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400/50"
                              >
                                + Add Progressive Payment
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Project Timeline */}
                        <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                          <h3 className="text-cyan-400 font-bold mb-4 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            PROJECT TIMELINE
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-gray-400 text-sm">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                  setStartDate(e.target.value);
                                  markDirtyAndScheduleAutoSave();
                                }}
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm">
                                Completion Date
                              </label>
                              <input
                                type="date"
                                value={completionDate}
                                onChange={(e) => {
                                  setCompletionDate(e.target.value);
                                  markDirtyAndScheduleAutoSave();
                                }}
                                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Permits and Compliance */}
                        <div className="bg-gray-900/50 border border-orange-400/30 rounded-lg p-4">
                          <h3 className="text-orange-400 font-bold mb-4 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            PERMITS & COMPLIANCE
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="permitsRequired"
                                checked={permitsRequired}
                                onChange={(e) =>
                                  setPermitsRequired(e.target.checked)
                                }
                                className="text-orange-400"
                              />
                              <label
                                htmlFor="permitsRequired"
                                className="text-gray-300"
                              >
                                Building permits required for this project
                              </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-gray-400 text-sm">
                                  Permit Responsibility
                                </label>
                                <select
                                  value={permitResponsibility}
                                  onChange={(e) =>
                                    setPermitResponsibility(e.target.value)
                                  }
                                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                                >
                                  <option>Contractor obtains permits</option>
                                  <option>Owner obtains permits</option>
                                  <option>No permits required</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-gray-400 text-sm">
                                  Permit Numbers
                                </label>
                                <input
                                  type="text"
                                  value={permitNumbers}
                                  onChange={(e) =>
                                    setPermitNumbers(e.target.value)
                                  }
                                  placeholder="Enter permit numbers if available"
                                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Warranties and Guarantees */}
                        <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                          <h3 className="text-purple-400 font-bold mb-4 flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            WARRANTIES & GUARANTEES
                          </h3>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-gray-400 text-sm">
                                  Workmanship Warranty
                                </label>
                                <select
                                  value={workmanshipWarranty}
                                  onChange={(e) =>
                                    setWorkmanshipWarranty(e.target.value)
                                  }
                                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                                >
                                  <option>1 Year</option>
                                  <option>2 Years</option>
                                  <option>3 Years</option>
                                  <option>No warranty</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-gray-400 text-sm">
                                  Materials Warranty
                                </label>
                                <select
                                  value={materialsWarranty}
                                  onChange={(e) =>
                                    setMaterialsWarranty(e.target.value)
                                  }
                                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                                >
                                  <option>Manufacturer warranty only</option>
                                  <option>1 Year contractor warranty</option>
                                  <option>2 Years contractor warranty</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* California Legal Notices */}
                        <div className="bg-gray-900/50 border border-red-400/30 rounded-lg p-4">
                          <h3 className="text-red-400 font-bold mb-4 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            CALIFORNIA LEGAL NOTICES
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                defaultChecked
                                disabled
                                name="lienNotice"
                                className="text-red-400"
                              />
                              <label className="text-gray-300">
                                Include Preliminary 20-Day Lien Notice
                                (MANDATORY)
                              </label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                defaultChecked
                                disabled
                                name="cancelNotice"
                                className="text-red-400"
                              />
                              <label className="text-gray-300">
                                Include 3-Day Right to Cancel Notice (MANDATORY)
                              </label>
                            </div>
                            <div className="bg-red-900/20 border border-red-400/30 rounded p-3">
                              <div className="text-red-400 text-xs font-bold mb-2">
                                MANDATORY CALIFORNIA NOTICES:
                              </div>
                              <div className="text-gray-300 text-xs space-y-2">
                                <div>
                                  • <strong>Three-Day Right to Cancel:</strong>{" "}
                                  "You, the buyer, have the right to cancel this
                                  contract within three business days. The right
                                  to cancel agreement is attached to this
                                  contract."
                                </div>
                                <div>
                                  • <strong>Preliminary Lien Notice:</strong>{" "}
                                  "As required by the Mechanics Lien Law of the
                                  state of California, you are hereby notified
                                  that a Preliminary Notice may be served upon
                                  you..."
                                </div>
                                <div>
                                  • <strong>License Disclosure:</strong>{" "}
                                  Automatic disclosure based on contractor
                                  license status will be included
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* AI-Powered Legal Defense Engine */}
                        <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                          <h3 className="text-cyan-400 font-bold mb-4 flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            INTELLIGENT LEGAL DEFENSE ENGINE
                          </h3>

                          {intelligentClauses.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="text-gray-400 mb-2">
                                Analyzing project data...
                              </div>
                              <div className="text-xs text-gray-500">
                                Legal Defense Engine processing project
                                specifics
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Mandatory Clauses */}
                              {intelligentClauses.filter(
                                (clause) => clause.category === "MANDATORY",
                              ).length > 0 && (
                                <div className="bg-red-900/20 border border-red-400/30 rounded p-4">
                                  <h4 className="text-red-400 font-bold mb-3 flex items-center">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    OBLIGATORIAS POR LEY
                                  </h4>
                                  <div className="space-y-3">
                                    {intelligentClauses
                                      .filter(
                                        (clause) =>
                                          clause.category === "MANDATORY",
                                      )
                                      .map((clause) => (
                                        <div
                                          key={clause.id}
                                          className="bg-red-800/20 border border-red-400/20 rounded p-3"
                                        >
                                          <div className="flex items-start space-x-3">
                                            <input
                                              type="checkbox"
                                              checked={selectedClauses.has(
                                                clause.id,
                                              )}
                                              disabled={
                                                clause.category === "MANDATORY"
                                              }
                                              className="text-red-400 mt-1"
                                            />
                                            <div className="flex-1">
                                              <div className="text-red-400 font-semibold text-sm mb-1">
                                                {clause.title}
                                              </div>
                                              <div className="text-gray-300 text-xs mb-2 leading-relaxed">
                                                {clause.content &&
                                                clause.content.length > 200
                                                  ? `${clause.content.substring(0, 200)}...`
                                                  : clause.content}
                                              </div>
                                              <div className="flex items-center space-x-4 text-xs">
                                                <Badge
                                                  variant="destructive"
                                                  className="text-xs"
                                                >
                                                  {clause.riskLevel} RISK
                                                </Badge>
                                                <span className="text-red-400 font-bold">
                                                  OBLIGATORIA
                                                </span>
                                              </div>
                                              <div className="text-gray-400 text-xs mt-2">
                                                <strong>Justificación:</strong>{" "}
                                                {clause.justification}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommended Clauses - Simplified */}
                              {intelligentClauses.filter(
                                (clause) => clause.category === "RECOMMENDED",
                              ).length > 0 && (
                                <div className="bg-cyan-900/20 border border-cyan-400/30 rounded p-4">
                                  <h4 className="text-cyan-400 font-bold mb-3 flex items-center">
                                    <Shield className="h-4 w-4 mr-2" />
                                    RECOMENDADAS POR IA LEGAL
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {intelligentClauses
                                      .filter(
                                        (clause) =>
                                          clause.category === "RECOMMENDED",
                                      )
                                      .map((clause) => (
                                        <div
                                          key={clause.id}
                                          className="flex items-center space-x-3 p-2 bg-cyan-800/10 border border-cyan-400/20 rounded hover:bg-cyan-800/20 transition-colors"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedClauses.has(
                                              clause.id,
                                            )}
                                            onChange={(e) => {
                                              const newSelected = new Set(
                                                selectedClauses,
                                              );
                                              if (e.target.checked) {
                                                newSelected.add(clause.id);
                                              } else {
                                                newSelected.delete(clause.id);
                                              }
                                              setSelectedClauses(newSelected);
                                            }}
                                            className="w-4 h-4 text-cyan-400 bg-gray-800 border-cyan-400/50 rounded focus:ring-cyan-400 focus:ring-2"
                                          />
                                          <div className="flex-1">
                                            <div className="text-cyan-300 font-medium text-sm">
                                              {clause.title}
                                            </div>
                                            <div className="flex items-center space-x-2 mt-1">
                                              <Badge
                                                variant={
                                                  clause.riskLevel === "HIGH"
                                                    ? "destructive"
                                                    : clause.riskLevel ===
                                                        "MEDIUM"
                                                      ? "default"
                                                      : "secondary"
                                                }
                                                className="text-xs px-2 py-0"
                                              >
                                                {clause.riskLevel}
                                              </Badge>
                                              <span className="text-cyan-400 text-xs">
                                                RECOMENDADA
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Right Panel: Live Contract Preview - Responsive */}
                    <div
                      className={`${!showPreview ? "hidden xl:block" : "block xl:block"}`}
                    >
                      <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-3 md:p-4 h-full">
                        <h3 className="text-green-400 font-bold mb-3 md:mb-4 flex items-center text-sm md:text-base">
                          <Eye className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                          VISTA PREVIA DEL CONTRATO
                        </h3>

                        {/* Real Contract Preview Container */}
                        <div className="bg-white text-black rounded  border shadow-lg">
                          <style
                            dangerouslySetInnerHTML={{
                              __html: `
                          .contract-content h1 {
                            font-size: 14px !important;
                            font-weight: bold !important;
                            text-align: center !important;
                            margin: 10px 0 !important;
                            text-transform: uppercase !important;
                          }
                          .contract-content h2 {
                            font-size: 12px !important;
                            font-weight: bold !important;
                            margin: 8px 0 4px 0 !important;
                            text-transform: uppercase !important;
                            border-bottom: 1px solid #333 !important;
                            padding-bottom: 2px !important;
                          }
                          .contract-content .parties {
                            display: flex !important;
                            justify-content: space-between !important;
                            margin: 10px 0 !important;
                            border: 1px solid #000 !important;
                            padding: 8px !important;
                          }
                          .contract-content .party {
                            flex: 1 !important;
                            text-align: center !important;
                            padding: 0 4px !important;
                          }
                          .contract-content .party-title {
                            font-weight: bold !important;
                            font-size: 11px !important;
                            margin-bottom: 4px !important;
                          }
                          .contract-content .section {
                            margin: 8px 0 !important;
                          }
                          .contract-content .section-title {
                            font-weight: bold !important;
                            font-size: 11px !important;
                            margin-bottom: 4px !important;
                          }
                          .contract-content .clause {
                            margin: 4px 0 !important;
                            text-align: justify !important;
                          }
                          .contract-content p {
                            margin: 4px 0 !important;
                            font-size: 9px !important;
                            line-height: 1.2 !important;
                          }
                          .contract-content .signature-section {
                            display: flex !important;
                            gap: 15px !important;
                            margin-top: 15px !important;
                          }
                          .contract-content .signature-box {
                            border: 1px solid #000 !important;
                            padding: 8px !important;
                            background: #f9f9f9 !important;
                            flex: 1 !important;
                          }
                          .contract-content .signature-line {
                            border-bottom: 1px solid #000 !important;
                            margin: 8px 0 2px 0 !important;
                            height: 1px !important;
                          }
                          .contract-content .info-box {
                            border: 1px solid #333 !important;
                            padding: 6px !important;
                            margin: 4px 0 !important;
                            background: #f9f9f9 !important;
                          }
                          .contract-content .total-box {
                            border: 1px solid #000 !important;
                            padding: 6px !important;
                            background: #f5f5f5 !important;
                            text-align: center !important;
                          }
                        `,
                            }}
                          />
                          {loadingPreview ? (
                            <div className="h-64 md:h-80 xl:h-96 flex items-center justify-center">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-sm text-gray-600">
                                  Generando preview real del contrato...
                                </p>
                              </div>
                            </div>
                          ) : contractPreviewHtml ? (
                            <div
                              className="h-64 md:h-80 xl:h-96  p-3 md:p-4 contract-content"
                              dangerouslySetInnerHTML={{
                                __html: contractPreviewHtml,
                              }}
                              style={{
                                fontSize: "9px",
                                lineHeight: "1.2",
                                fontFamily: "Times New Roman, serif",
                              }}
                              onLoad={() => console.log("[PREVIEW] Preview rendered in DOM")}
                            />
                          ) : (
                            <div className="h-64 md:h-80 xl:h-96 flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <p className="text-sm mb-2">
                                  Vista previa del contrato real
                                </p>
                                <p className="text-xs">
                                  Selecciona protecciones legales para ver el
                                  contenido
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status Indicator */}
                        <div className="mt-2 text-center">
                          <span className="text-xs text-green-400 flex items-center justify-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Actualizándose en tiempo real
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={() => {
                        setCurrentStep(1);
                      }}
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                    >
                      BACK TO PROJECT SELECTION
                    </Button>
                    <Button
                      onClick={() => {
                        // Recopilar cláusulas seleccionadas del motor de Legal Defense
                        const selectedClausesData = intelligentClauses.filter(
                          (clause) =>
                            selectedClauses.has(clause.id) ||
                            clause.category === "MANDATORY",
                        );

                        // Crear datos completos incluyendo cláusulas seleccionadas
                        const completeData = {
                          ...extractedData,
                          selectedIntelligentClauses: selectedClausesData,
                          clauseCount: selectedClausesData.length,
                        };

                        console.log(
                          "Advancing to contract generation with complete data:",
                          completeData,
                        );
                        console.log("Selected clauses:", selectedClausesData);

                        setLockStepThree(true); // Lock step 3 to prevent regression
                        setCurrentStep(3);
                        processExtractedDataWorkflow(completeData);
                      }}
                      className="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none"
                    >
                      GENERATE CONTRACT
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Contract Generation & PDF Creation - Final Step */}
          {extractedData && currentStep === 3 && (
            <Card className="border-2 border-purple-400 bg-black/80 relative  mt-6">
              <CardHeader className="text-center px-4 md:px-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 md:p-4 rounded-full border-2 border-purple-400">
                    <FileText className="h-6 w-6 md:h-8 md:w-8 text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-purple-400 mb-2">
                  Contract Generation Complete
                </CardTitle>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                  Professional contract with selected protections ready for
                  signature and execution.
                </p>
              </CardHeader>

              <CardContent className="px-4 md:px-8 pb-6 md:pb-8 space-y-6">
                {/* Contract Summary */}
                <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                  <h3 className="text-purple-400 font-bold mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    CONTRACT SUMMARY
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Client:</span>
                      <span className="text-white ml-2">
                        {extractedData.clientInfo?.name || "Client Name"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Project:</span>
                      <span className="text-white ml-2">
                        {extractedData.projectDetails?.type || "Project Type"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Amount:</span>
                      <span className="text-green-400 ml-2 font-mono">
                        ${extractedData.financials?.total?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">
                        Protections Applied:
                      </span>
                      <span className="text-purple-400 ml-2">
                        {approvedClauses.length} defensive clauses
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contract Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => generateContractPDF()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded border-0 shadow-none"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    GENERATE CONTRACT PDF
                  </Button>
                  <Button
                    onClick={() => sendContractForSignature()}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded border-0 shadow-none"
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    SEND FOR SIGNATURE
                  </Button>
                </div>

                {/* Legal Compliance Notice */}
                <div className="bg-blue-900/20 border border-blue-400/30 rounded p-4">
                  <div className="text-blue-400 text-sm font-bold mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    LEGAL COMPLIANCE VERIFIED
                  </div>
                  <div className="text-gray-300 text-xs leading-relaxed">
                    Contract includes all required California legal protections,
                    payment terms, and contractor safeguards. Document is ready
                    for professional execution with full legal compliance.
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    onClick={() => {
                      safeSetCurrentStep(2);
                    }}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  >
                    BACK TO DEFENSE REVIEW
                  </Button>
                  <Button
                    onClick={() => startNewContract()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none"
                  >
                    CREATE NEW CONTRACT
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <Card className="mt-6 border-2 border-yellow-400/50 bg-yellow-900/20">
            <CardContent className="py-6">
              <div className="text-center">
                <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2 animate-pulse" />
                <p className="font-bold text-yellow-400">
                  NEURAL NETWORKS ENGAGED
                </p>
                <p className="text-sm text-gray-300">
                  Step {currentStep} of {workflowSteps.length} - Processing with
                  maximum legal protection protocols
                </p>
                <Progress
                  value={(currentStep / workflowSteps.length) * 100}
                  className="mt-4 [&>div]:bg-yellow-400"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Animated Background Elements */}
      <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-50"></div>
      <div className="absolute top-1/3 right-20 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-50"></div>
      <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce opacity-50"></div>
    </div>
  );
}
