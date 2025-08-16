import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Client } from "@/lib/clientFirebase";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { UpgradePrompt } from "@/components/permissions/UpgradePrompt";
import { ConversationEngine } from "../mervin-ai/core/ConversationEngine";
import { LanguageDetector } from "../mervin-ai/core/LanguageDetector";
import { MaterialInventoryService } from "../../src/services/materialInventoryService";
import { db } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  shareOrDownloadPdf,
  getSharingCapabilities,
} from "@/utils/mobileSharing";
import {
  getClients as getFirebaseClients,
  saveClient,
} from "@/lib/clientFirebase";
import {
  Send,
  Paperclip,
  FileSpreadsheet,
  ClipboardList,
  ClipboardCheck,
  Building,
  BarChart4,
  Edit3,
  Trash2,
  Plus,
  Minus,
  Check,
  X,
  Search,
  Zap,
  Brain,
  Wrench,
  DollarSign,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";
import axios from "axios";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Download } from "lucide-react";
import {
  generatePDFReport,
  downloadPDFReport,
} from "@/utils/permitReportGenerator";
// Tipos para los mensajes
type MessageSender = "user" | "assistant";
type MessageState = "analyzing" | "thinking" | "none";
type Message = {
  id: string;
  content: string;
  sender: MessageSender;
  state?: MessageState;
  action?: string;
  clients?: Client[]; // for searchable + scrollable UI
  materialList?: Material[]; // ✅ NEW - show inventory inside chat like clients
  selectedMaterials?: { material: Material; quantity: number }[]; // ✅ NEW - confirmed selections
  estimates?: EstimateData[]; // NEW - for contract generation
};
type EstimateStep1ChatFlowStep =
  | "select-client"
  | "awaiting-client-choice"
  | "enter-new-client"
  | "client-added"
  | "awaiting-project-description"
  | "awaiting-deepsearch-choice"
  | "deepsearch-processing"
  | "deepsearch-results"
  | "select-inventory"
  | "awaiting-new-material"
  | "awaiting-discount"
  | "awaiting-tax"
  | null;
// Contract-specific types (NEW - for contract generation only)
type ContractFlowStep =
  | "select-estimate"
  | "awaiting-estimate-choice"
  | "edit-client-info"
  | "project-timeline"
  | "contractor-info"
  | "project-milestones"
  | "warranty-permits"
  | "legal-clauses"
  | "project-scope"
  | "final-review"
  | "signature-question"
  | "awaiting-signature-choice"
  | "generate-contract"
  | null;
// Permit Advisor Flow Types
type PermitFlowStep =
  | "address-selection"
  | "awaiting-address-choice"
  | "manual-address-entry"
  | "existing-projects-list"
  | "project-selected"
  | "project-description"
  | "awaiting-description"
  | "document-upload"
  | "deepsearch-analysis"
  | "results-display"
  | null;
interface PermitProject {
  id: string;
  clientName: string;
  address: string;
  projectType: string;
  projectDescription?: string;
  status: string;
  createdAt: { toDate: () => Date };
  totalPrice?: number;
  clientEmail?: string;
  clientPhone?: string;
}
interface PermitData {
  name: string;
  issuingAuthority: string;
  estimatedTimeline: string;
  averageCost?: string;
  description?: string;
  requirements?: string;
  url?: string;
}
interface PermitResponse {
  requiredPermits: PermitData[];
  specialConsiderations: string[];
  process: string[];
  meta: {
    sources: string[];
    generated: string;
    projectType: string;
    location: string;
    fullAddress?: string;
    timestamp?: string;
  };
}
interface EstimateData {
  id: string;
  estimateNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientInformation?: Client;
  projectDescription: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  status: string;
}
interface ProjectTimelineField {
  id: string;
  label: string;
  value: string;
  required: boolean;
}
interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  percentage: number;
  estimatedDays: number;
}
interface LegalClause {
  id: string;
  title: string;
  content: string;
  category: string;
  isRequired: boolean;
}
type DeepSearchOption = "materials-labor" | "materials-only" | "labor-only";
type DeepSearchRecommendation = {
  materials: {
    name: string;
    description: string;
    quantity: number;
    unit: string;
    estimatedPrice: number;
    category: string;
    reason: string;
  }[];
  laborCosts: {
    task: string;
    description: string;
    estimatedHours: number;
    hourlyRate: number;
    totalCost: number;
    category: string;
  }[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalProjectCost: number;
  recommendations: string[];
};
interface Material {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
}
// Botones de acción principales con iconos
const actionButtons = [
  {
    id: "estimates",
    text: "Generate Estimates",
    action: "estimates",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: "contracts",
    text: "Generate Contracts",
    action: "contracts",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: "permits",
    text: "Permit Advisor",
    action: "permits",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    id: "properties",
    text: "Verify Ownership",
    action: "properties",
    icon: <Building className="h-5 w-5" />,
  },
  {
    id: "analytics",
    text: "Payment Tracker",
    action: "analytics",
    icon: <BarChart4 className="h-5 w-5" />,
  },
];
export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([]);
  // 🔐 CONTEXTOS DE AUTENTICACIÓN Y PERMISOS
  const { userPlan, showUpgradeModal } = usePermissions();
  const [inputValue, setInputValue] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [inventoryItems, setInventoryItems] = useState<
    { material: Material; quantity: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [caseType, setCaseType] = useState<
    "Estimates" | "Contract" | "Permits" | ""
  >("");
  const { toast } = useToast();
  const [projectDescription, setProjectDescription] = useState<string>("");
  const [tax, setTax] = useState<{
    type: "manual" | "percentage";
    amount: number;
  }>({
    type: "manual",
    amount: 0,
  });
  const [discount, setDiscount] = useState<{
    type: "manual" | "percentage";
    amount: number;
  }>({
    type: "manual",
    amount: 0,
  });
  const [chatFlowStep, setChatFlowStep] =
    useState<EstimateStep1ChatFlowStep>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const { currentUser } = useAuth();
  // Contract-specific states (NEW - only for contract generation)
  const [contractFlowStep, setContractFlowStep] =
    useState<ContractFlowStep>(null);
  const [estimates, setEstimates] = useState<EstimateData[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateData | null>(
    null,
  );
  // Permit Advisor states
  const [permitFlowStep, setPermitFlowStep] = useState<PermitFlowStep>(null);
  const [permitProjects, setPermitProjects] = useState<PermitProject[]>([]);
  const [selectedPermitProject, setSelectedPermitProject] =
    useState<PermitProject | null>(null);
  const [permitAddress, setPermitAddress] = useState("");
  const [permitProjectType, setPermitProjectType] = useState("");
  const [permitProjectDescription, setPermitProjectDescription] = useState("");
  const [permitDocuments, setPermitDocuments] = useState<File[]>([]);
  const [permitResults, setPermitResults] = useState<PermitResponse | null>(
    null,
  );
  const [isPermitAnalyzing, setIsPermitAnalyzing] = useState(false);
  const [permitCoordinates, setPermitCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [activePermitTab, setActivePermitTab] = useState("permits");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [projectTimeline, setProjectTimeline] = useState<
    ProjectTimelineField[]
  >([
    { id: "start", label: "Fecha de inicio", value: "", required: true },
    {
      id: "completion",
      label: "Fecha de finalización",
      value: "",
      required: true,
    },
    {
      id: "duration",
      label: "Duración estimada (días)",
      value: "",
      required: true,
    },
    {
      id: "workingHours",
      label: "Horario de trabajo",
      value: "8:00 AM - 5:00 PM",
      required: false,
    },
  ]);
  // Separate state for date values
  const [projectDates, setProjectDates] = useState<{
    start?: Date;
    completion?: Date;
  }>({});
  // State for logo file upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  // State for signature protocol
  const [contractorSignUrl, setContractorSignUrl] = useState<string>("");
  const [clientSignUrl, setClientSignUrl] = useState<string>("");
  const [contractHTML, setContractHTML] = useState<string>("");
  const [contractorInfo, setContractorInfo] = useState({
    company: "",
    license: "",
    licenseUrl: "",
    insurance: "",
    address: "",
    phone: "",
    email: "",
    logo: "",
  });
  const [projectMilestones, setProjectMilestones] = useState<
    ProjectMilestone[]
  >([
    {
      id: "1",
      title: "Inicio del proyecto",
      description: "Preparación del sitio y materiales",
      percentage: 25,
      estimatedDays: 2,
    },
    {
      id: "2",
      title: "Desarrollo",
      description: "Ejecución principal del trabajo",
      percentage: 50,
      estimatedDays: 5,
    },
    {
      id: "3",
      title: "Finalización",
      description: "Acabados y limpieza",
      percentage: 25,
      estimatedDays: 2,
    },
  ]);
  const [warrantyPermits, setWarrantyPermits] = useState({
    warranty: "",
    permits: "",
    insurance: "",
  });
  const [legalClauses, setLegalClauses] = useState<LegalClause[]>([]);
  const [projectScope, setProjectScope] = useState("");
  const [editingClient, setEditingClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  // DeepSearch AI states
  const [deepSearchOption, setDeepSearchOption] =
    useState<DeepSearchOption | null>(null);
  const [deepSearchRecommendation, setDeepSearchRecommendation] =
    useState<DeepSearchRecommendation | null>(null);
  const [isDeepSearchProcessing, setIsDeepSearchProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // AI Model Selector states (ChatGPT-style)
  const [selectedModel, setSelectedModel] = useState<"legacy" | "agent">("agent");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [editingMaterials, setEditingMaterials] = useState<
    DeepSearchRecommendation["materials"]
  >([]);
  const [editingLaborCosts, setEditingLaborCosts] = useState<
    DeepSearchRecommendation["laborCosts"]
  >([]);
  const [canEditClient, setCanEditClient] = useState(false);
  const [canEditMaterials, setCanEditMaterials] = useState(false);
  const { data: userSubscription, isLoading: isLoadingUserSubscription } =
    useQuery({
      queryKey: ["/api/subscription/user-subscription", currentUser?.email],
      queryFn: async () => {
        if (!currentUser?.email) throw new Error("User email is required");
        const response = await fetch(
          `/api/subscription/user-subscription?email=${encodeURIComponent(currentUser?.email)}`,
        );
        if (!response.ok) throw new Error("Failed to fetch subscription");
        return response.json();
      },
      enabled: !!currentUser?.email,
      throwOnError: false,
    });
  console.log(userSubscription);
  const loadMaterials = async (): Promise<Material[]> => {
    if (!currentUser) return [];
    const { collection, query, where, getDocs } = await import(
      "firebase/firestore"
    );
    try {
      setIsLoadingMaterials(true);
      const materialsRef = collection(db, "materials");
      const q = query(materialsRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      const materialsData: Material[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Material, "id">;
        let normalizedPrice = typeof data.price === "number" ? data.price : 0;
        if (normalizedPrice > 1000) {
          normalizedPrice = Number((normalizedPrice / 100).toFixed(2));
          console.log(
            `💰 NORMALIZED PRICE: ${data.name} - ${data.price} → ${normalizedPrice}`,
          );
        }
        const material: Material = {
          id: doc.id,
          ...data,
          price: normalizedPrice,
        };
        materialsData.push(material);
      });
      setMaterials(materialsData);
      return materialsData;
    } catch (error) {
      console.error("Error loading materials from Firebase:", error);
      toast({
        title: "Error",
        description: "Could not load materials",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoadingMaterials(false);
    }
  };
  const { profile, isLoading: isProfileLoading, updateProfile } = useProfile();
  // Inicializar con mensaje de bienvenida
  useEffect(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      content:
        "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. Puedo ayudarte con las siguientes funciones:",
      sender: "assistant",
      action: "menu",
    };
    setMessages([welcomeMessage]);
  }, []);
  // Initialize contractor info with profile data when profile loads
  useEffect(() => {
    if (profile && !isProfileLoading) {
      setContractorInfo((prev) => ({
        ...prev,
        company: profile.company || prev.company,
        license: profile.license || prev.license,
        licenseUrl: profile.documents?.licenseUrl || prev.licenseUrl,
        insurance: profile.insurancePolicy || prev.insurance,
        address: profile.address || prev.address,
        phone: profile.phone || prev.phone,
        email: profile.email || prev.email,
        logo: profile.logo || prev.logo,
      }));
      // Set logo preview if exists in profile
      if (profile.logo) {
        setLogoPreview(profile.logo);
      }
    }
  }, [profile, isProfileLoading]);
  // Close model selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModelSelector) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelSelector]);
  // Handle logo file upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen válido",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo es demasiado grande. Máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        // Update contractor info with the data URL for immediate use
        setContractorInfo((prev) => ({
          ...prev,
          logo: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };
  // Convert file to base64 for storage
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  // Signature protocol function adapted for Mervin
  const handleStartSignatureProtocol = async () => {
    if (!selectedEstimate || !currentUser?.uid || !selectedClient) {
      toast({
        title: "Error",
        description:
          "Contract data must be complete before starting signature protocol",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      // Generate contract HTML
      const contractHtml = generateContractHTML();
      setContractHTML(contractHtml);
      // Prepare contract data for signature protocol
      const secureDeliveryPayload = {
        userId: currentUser.uid,
        contractHTML: contractHtml,
        deliveryMethods: { email: false, sms: false, whatsapp: false },
        contractData: {
          contractorName:
            contractorInfo.company || profile?.company || "Contractor Name",
          contractorEmail:
            contractorInfo.email || profile?.email || currentUser.email || "",
          contractorPhone: contractorInfo.phone || profile?.phone || "",
          contractorCompany:
            contractorInfo.company || profile?.company || "Company Name",
          clientName: selectedClient.name,
          clientEmail: selectedClient.email || "",
          clientPhone: selectedClient.phone || "",
          clientAddress: selectedClient.address || "",
          projectDescription:
            projectScope ||
            selectedEstimate.projectDescription ||
            "Construction Project",
          totalAmount: selectedEstimate.total || 0,
          startDate:
            projectTimeline[0]?.value || new Date().toISOString().split("T")[0],
          completionDate:
            projectTimeline[1]?.value ||
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
        "🔐 [SIGNATURE-PROTOCOL] Generating signature links:",
        secureDeliveryPayload,
      );
      const response = await fetch("/api/multi-channel/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(secureDeliveryPayload),
      });
      if (!response.ok) {
        throw new Error(`Signature protocol failed: ${response.status}`);
      }
      const result = await response.json();
      setContractorSignUrl(result.contractorSignUrl || "");
      setClientSignUrl(result.clientSignUrl || "");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `✅ **PROTOCOLO DE FIRMA INICIADO**\n\n🔐 Enlaces de firma seguros generados:\n\n**Para el Contratista:**\n${result.contractorSignUrl}\n\n**Para el Cliente:**\n${result.clientSignUrl}\n\n📋 **ID del Contrato:** ${result.contractId}\n\nAmbas partes pueden usar estos enlaces para firmar el contrato digitalmente.`,
          sender: "assistant",
        },
      ]);
      toast({
        title: "Protocolo de Firma Iniciado",
        description: `Enlaces seguros generados. ID del Contrato: ${result.contractId}`,
      });
    } catch (error) {
      console.error("❌ [SIGNATURE-PROTOCOL] Error:", error);
      toast({
        title: "Error en Protocolo de Firma",
        description: `No se pudieron generar los enlaces de firma: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  // PDF download function adapted for Mervin
  const handleDownloadPDF = async () => {
    if (!selectedEstimate || !currentUser?.uid || !selectedClient) {
      toast({
        title: "Error",
        description: "Contract data must be complete before generating PDF",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      // Prepare contract payload
      const contractPayload = {
        userId: currentUser.uid,
        client: {
          name: selectedClient.name,
          address: selectedClient.address || "",
          email: selectedClient.email || "",
          phone: selectedClient.phone || "",
        },
        project: {
          description:
            projectScope || selectedEstimate.projectDescription || "",
          type: "Construction Project",
          total: selectedEstimate.total || 0,
          materials: selectedEstimate.items || [],
        },
        contractor: {
          name: contractorInfo.company || profile?.company || "Company Name",
          company: contractorInfo.company || profile?.company || "Company Name",
          address: contractorInfo.address || profile?.address || "",
          phone: contractorInfo.phone || profile?.phone || "",
          email: contractorInfo.email || profile?.email || "",
          license: contractorInfo.license || profile?.license || "",
        },
        financials: {
          total: selectedEstimate.total || 0,
          subtotal: selectedEstimate.total || 0,
          tax: 0,
          discount: 0,
        },
        timeline: {
          startDate:
            projectTimeline[0]?.value || new Date().toISOString().split("T")[0],
          completionDate: projectTimeline[1]?.value || "",
          estimatedDuration: projectTimeline[2]?.value
            ? `${projectTimeline[2].value} días`
            : "As specified in project details",
        },
        paymentTerms: projectMilestones.map((milestone, index) => ({
          id: index + 1,
          description: milestone.title,
          percentage: milestone.percentage,
          amount: (selectedEstimate.total || 0) * (milestone.percentage / 100),
        })),
      };
      console.log(
        "📄 [PDF DOWNLOAD] Generating PDF with payload:",
        contractPayload,
      );
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
        a.download = `contract-${selectedClient.name?.replace(/\s+/g, "_") || "client"}-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: `✅ **CONTRATO PDF GENERADO**\n\n📄 El contrato se ha descargado exitosamente:\n\n• **Cliente:** ${selectedClient.name}\n• **Valor:** $${(selectedEstimate.total || 0).toFixed(2)}\n• **Empresa:** ${contractorInfo.company}\n• **Archivo:** contract-${selectedClient.name?.replace(/\s+/g, "_") || "client"}-${new Date().toISOString().split("T")[0]}.pdf\n\nEl contrato está listo para su uso.`,
            sender: "assistant",
          },
        ]);
        toast({
          title: "PDF Descargado",
          description: `Contrato PDF descargado exitosamente para ${selectedClient.name}`,
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
        title: "Error de Descarga",
        description: `No se pudo descargar el PDF: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Generate contract HTML for signature protocol
  const generateContractHTML = () => {
    return `
      <html>
        <head>
          <title>Contrato de Construcción</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .signature { margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CONTRATO DE CONSTRUCCIÓN</h1>
            <p>Número: CON-${Date.now()}</p>
          </div>
          <div class="section">
            <h3>INFORMACIÓN DEL CONTRATISTA</h3>
            <p><strong>Empresa:</strong> ${contractorInfo.company}</p>
            <p><strong>Dirección:</strong> ${contractorInfo.address}</p>
            <p><strong>Teléfono:</strong> ${contractorInfo.phone}</p>
            <p><strong>Email:</strong> ${contractorInfo.email}</p>
            <p><strong>Licencia:</strong> ${contractorInfo.license}</p>
          </div>
          <div class="section">
            <h3>INFORMACIÓN DEL CLIENTE</h3>
            <p><strong>Nombre:</strong> ${selectedClient?.name}</p>
            <p><strong>Dirección:</strong> ${selectedClient?.address}</p>
            <p><strong>Teléfono:</strong> ${selectedClient?.phone}</p>
            <p><strong>Email:</strong> ${selectedClient?.email}</p>
          </div>
          <div class="section">
            <h3>ALCANCE DEL PROYECTO</h3>
            <p>${projectScope}</p>
          </div>
          <div class="section">
            <h3>VALOR DEL CONTRATO</h3>
            <p><strong>Total:</strong> $${selectedEstimate?.total?.toFixed(2)}</p>
          </div>
          <div class="section">
            <h3>CRONOGRAMA</h3>
            <p><strong>Fecha de inicio:</strong> ${projectTimeline[0]?.value}</p>
            <p><strong>Fecha de finalización:</strong> ${projectTimeline[1]?.value}</p>
            <p><strong>Duración:</strong> ${projectTimeline[2]?.value} días</p>
          </div>
          <div class="section">
            <h3>CLÁUSULAS LEGALES</h3>
            ${legalClauses
              .map(
                (clause, index) => `
              <p><strong>${index + 1}. ${clause.title}:</strong> ${clause.content}</p>
            `,
              )
              .join("")}
          </div>
          <div class="signature">
            <table width="100%">
              <tr>
                <td width="45%">
                  <p>_________________________</p>
                  <p><strong>Contratista</strong></p>
                  <p>${contractorInfo.company}</p>
                </td>
                <td width="10%"></td>
                <td width="45%">
                  <p>_________________________</p>
                  <p><strong>Cliente</strong></p>
                  <p>${selectedClient?.name}</p>
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;
  };
  const [visibleCount, setVisibleCount] = useState(6);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [shoppingCart, setShoppingCart] = useState<
    { material: Material; quantity: number }[]
  >([]);
  const [showCart, setShowCart] = useState(false);
  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()),
  );
  // Shopping cart helper functions
  const addToCart = (material: Material, quantity: number = 1) => {
    setShoppingCart((prev) => {
      const existingItem = prev.find(
        (item) => item.material.id === material.id,
      );
      if (existingItem) {
        return prev.map((item) =>
          item.material.id === material.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { material, quantity }];
    });
  };
  const removeFromCart = (materialId: string) => {
    setShoppingCart((prev) =>
      prev.filter((item) => item.material.id !== materialId),
    );
  };
  const updateCartQuantity = (materialId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(materialId);
      return;
    }
    setShoppingCart((prev) =>
      prev.map((item) =>
        item.material.id === materialId ? { ...item, quantity } : item,
      ),
    );
  };
  const getCartTotal = () => {
    return shoppingCart.reduce(
      (total, item) => total + item.material.price * item.quantity,
      0,
    );
  };
  const getCartItemCount = () => {
    return shoppingCart.reduce((total, item) => total + item.quantity, 0);
  };
  const addCartToInventory = () => {
    setInventoryItems((prev) => {
      const newItems = [...prev];
      shoppingCart.forEach((cartItem) => {
        const existingIndex = newItems.findIndex(
          (item) => item.material.id === cartItem.material.id,
        );
        if (existingIndex >= 0) {
          newItems[existingIndex].quantity += cartItem.quantity;
        } else {
          newItems.push(cartItem);
        }
      });
      return newItems;
    });
    setShoppingCart([]);
    setShowCart(false);
    toast({
      title: "Materiales añadidos",
      description: `Se añadieron ${getCartItemCount()} materiales al inventario.`,
    });
  };
  // Manejar envío de mensajes
  // const handleSendMessage = () => {
  //   if (inputValue.trim() === "" || isLoading) return;
  //   // Agregar mensaje del usuario
  //   const userMessage: Message = {
  //     id: `user-${Date.now()}`,
  //     content: inputValue,
  //     sender: "user",
  //   };
  //   setMessages((prev) => [...prev, userMessage]);
  //   setInputValue("");
  //   setIsLoading(true);
  //   // Simular respuesta
  //   setTimeout(() => {
  //     const assistantMessage: Message = {
  //       id: `assistant-${Date.now()}`,
  //       content:
  //         "Estoy aquí para ayudarte. ¿Te gustaría generar un contrato, verificar una propiedad, consultar permisos, gestionar clientes o revisar facturación?",
  //       sender: "assistant",
  //     };
  //     setMessages((prev) => [...prev, assistantMessage]);
  //     setIsLoading(false);
  //     // Desplazar al final
  //     setTimeout(() => {
  //       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  //     }, 100);
  //   }, 1500);
  // };
  // 🧠 SISTEMA HÍBRIDO: FALLBACK INTELIGENTE + SISTEMA AVANZADO
  const generateIntelligentResponse = async (userMessage: string): Promise<string> => {
    console.log('🧠 [MERVIN-AI] Procesando con sistema híbrido:', userMessage);
    console.log('🎯 [MODEL-SELECTOR] Modelo seleccionado:', selectedModel);
    // FASE 1: RESPUESTA INMEDIATA INTELIGENTE (FALLBACK ROBUSTO)
    const quickIntelligentResponse = await generateQuickIntelligentResponse(userMessage);
    // 🎯 CONTROL POR MODELO SELECCIONADO Y PERMISOS
    if (selectedModel === "legacy") {
      console.log('📋 [LEGACY-MODE] Usando modo Legacy (respuesta directa)');
      return quickIntelligentResponse;
    }
    // 🔐 VERIFICACIÓN DE PERMISOS PARA AGENT MODE
    if (selectedModel === "agent" && userPlan && userPlan.name === "Free Trial") {
      console.log('🚫 [PERMISSION-DENIED] Free trial no tiene acceso a Agent mode');
      return `¡Órale, primo! Para usar Agent mode necesitas upgrade a Primo Chambeador o superior.
El modo Legacy que tienes disponible ya es súper inteligente y conversacional. ¿Te ayudo con algo usando el modo Legacy?
Para desbloquear Agent mode con todas las funciones avanzadas, puedes hacer upgrade desde tu panel de control.`;
    }
    try {
      // FASE 2: SISTEMA AVANZADO SOLO EN AGENT MODE
      console.log('🚀 [AGENT-MODE] Intentando sistema avanzado...');
      const userId = (currentUser as any)?.uid || 'anonymous';
      const agentConfig = {
        userId,
        debug: true,
        learningEnabled: true,
        memoryPersistence: true
      };
      // Importar componentes con manejo de errores
      const modules = await import('@/mervin-ai').catch(error => {
        console.warn('⚠️ [IMPORT] Sistema avanzado no disponible:', error.message);
        return null;
      });
      if (!modules) {
        console.log('📋 [FALLBACK] Usando respuesta inteligente directa');
        return quickIntelligentResponse;
      }
      const { ConversationEngine, DatabaseAgentMemory } = modules;
      // 🔧 SOLUCIÓN DEFINITIVA: Sistema de usuario robusto
      if (!currentUser || !(currentUser as any)?.uid) {
        console.warn('⚠️ [USER-ISSUE] Usuario no definido, usando sistema directo');
        return quickIntelligentResponse;
      }
      const conversationEngine = new ConversationEngine(userId);
      const databaseMemory = new DatabaseAgentMemory(userId);
      console.log('🤖 [ADVANCED-SYSTEM] Componentes básicos inicializados');
      // Procesamiento con sistema avanzado simplificado
      const advancedResponse = await conversationEngine.processUserMessage(userMessage);
      if (advancedResponse && (advancedResponse as any).response) {
        console.log('✅ [ADVANCED-SYSTEM] Respuesta avanzada generada exitosamente');
        return (advancedResponse as any).response;
      }
      console.log('📋 [FALLBACK] Sistema avanzado no generó respuesta, usando fallback');
      return quickIntelligentResponse;
    } catch (error) {
      console.error('❌ [ADVANCED-SYSTEM] Error en sistema avanzado:', (error as any)?.message || 'Unknown error');
      console.log('📋 [FALLBACK] Usando respuesta inteligente de respaldo');
      return quickIntelligentResponse;
    }
  };
  // 🧠 SISTEMA DE RESPUESTA INTELIGENTE DIRECTO (FALLBACK ROBUSTO)
  const generateQuickIntelligentResponse = async (userMessage: string): Promise<string> => {
    const userMessageLower = userMessage.toLowerCase().trim();
    const isSpanish = /[ñáéíóúü]/i.test(userMessage) ||
                      /\b(que|como|con|por|para|muy|mas|todo|este|esta|cuando|donde|porque|desde|hasta)\b/.test(userMessageLower);
    // 🧠 ANÁLISIS CONVERSACIONAL SÚPER INTELIGENTE - DETECCIÓN DE PATRONES COMPLEJOS
    const conversationHistory = messages.slice(-3); // Últimas 3 interacciones para contexto
    const lastUserMessage = conversationHistory.filter(m => m.sender === 'user').slice(-1)[0];
    const lastAssistantMessage = conversationHistory.filter(m => m.sender === 'assistant').slice(-1)[0];
    // 🎯 DETECCIÓN AVANZADA DE INTENCIONES Y EMOCIONES
    const emotions = {
      frustrated: /no entiendes|no me entiendes|you dont understand|esto no funciona|this doesn't work|ya intenté|already tried/.test(userMessageLower),
      excited: /genial|awesome|increible|amazing|perfecto|perfect|love it|me encanta/.test(userMessageLower),
      confused: /no entiendo|confused|perdido|lost|que significa|what means|como funciona|how does/.test(userMessageLower),
      grateful: /gracias|thank|appreciate|agradezco|mil gracias|muchas gracias/.test(userMessageLower),
      urgent: /urgente|urgent|rapido|quickly|asap|necesito ya|need now|emergency/.test(userMessageLower),
      casual: /que tal|what's up|que onda|how's it going|como va|sup/.test(userMessageLower)
    };
    const intentions = {
      greeting: /^(hola|hello|hi|hey|good morning|buenos dias|que tal|como estas|how are you|what's up|que onda)[\s\.\?\!]*$/i.test(userMessage.trim()),
      confirmation: /si me entend|entendiste|me sigues|yes you understand|got it|exactly|correcto|eso es|that's right/.test(userMessageLower),
      followUp: /y ahora|what now|que sigue|next step|and then|después|luego|siguiente/.test(userMessageLower),
      agreement: /^(si|yes|ok|okay|claro|perfecto|exactly|correcto|dale|sure|of course)[\s\.\!]*$/i.test(userMessage.trim()),
      disagreement: /^(no|nope|nah|nel|never|jamás|para nada|not really)[\s\.\!]*$/i.test(userMessage.trim()),
      question: userMessage.includes('?') || /^(que|como|cuando|donde|porque|por que|cual|who|what|when|where|why|how|which)/.test(userMessageLower),
      help: /ayuda|help|auxilio|necesito|need|can you|puedes|me ayudas/.test(userMessageLower),
      compliment: /bueno|good|great|excelente|excellent|incredible|amazing|fantastic|maravilloso/.test(userMessageLower),
      smallTalk: /clima|weather|dia|day|como estas|how are you|que haces|what are you doing/.test(userMessageLower)
    };
    // 🎯 ANÁLISIS CONTEXTUAL INTELIGENTE
    const isVeryShort = userMessage.trim().length <= 10;
    const isRepeatingQuestion = lastUserMessage && userMessage.toLowerCase() === lastUserMessage.content.toLowerCase();
    const isFollowingUp = lastAssistantMessage &&
      (intentions.followUp || intentions.confirmation ||
       (isVeryShort && (intentions.agreement || intentions.disagreement)));
    console.log('🧠 [MERVIN-INTELLIGENCE] Análisis:', {
      userMessage,
      emotions: Object.entries(emotions).filter(([_, detected]) => detected).map(([emotion]) => emotion),
      intentions: Object.entries(intentions).filter(([_, detected]) => detected).map(([intent]) => intent),
      isFollowingUp,
      isRepeatingQuestion,
      isSpanish
    });
    // 🎭 SISTEMA DE RESPUESTAS CONTEXTUALES Y EMOCIONALES AVANZADO
    // 🚨 MANEJO DE FRUSTRACIÓN CON EMPATÍA REAL
    if (emotions.frustrated) {
      const responses = isSpanish ? [
        "¡Órale primo, entiendo tu frustración! A veces las cosas se complican más de lo necesario. Platícame específicamente qué está pasando y juntos lo resolvemos.",
        "¡Ey compadre, te escucho! Sé que puede ser frustrante cuando algo no jala como debe. Vamos paso a paso, ¿qué exactamente te está dando lata?",
        "¡No te preocupes, primo! Todos hemos estado ahí. Mejor cuéntame qué es lo que necesitas lograr y vemos cómo hacerlo más fácil.",
        "¡Ándale, hermano! Entiendo que esté cabrón. Dime qué estás intentando hacer y yo te ayudo a que funcione como debe ser."
      ] : [
        "Hey, I totally get that frustration, dude! Sometimes things just don't work the way they should. Tell me exactly what's going on and we'll figure this out together.",
        "Bro, I hear you! It's super annoying when stuff doesn't work right. Walk me through what you're trying to do and I'll help you make it happen.",
        "I feel you, man! Been there myself. Let's break this down - what specifically are you trying to accomplish?",
        "Totally understand the frustration! Let me help you sort this out. What exactly is giving you trouble right now?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    // 🎉 RESPUESTAS A EMOCIÓN POSITIVA/GRATITUD
    if (emotions.grateful || emotions.excited) {
      const responses = isSpanish ? [
        "¡De nada, primo! Me da mucho gusto poder ayudarte. ¿Qué más puedo hacer por ti?",
        "¡Órale, qué padre que te haya servido! Para eso estamos, compadre. ¿En qué más andas?",
        "¡Ey, me alegra mucho escuchar eso! Esa actitud me gusta. ¿Qué sigue en tu proyecto?",
        "¡Simón! Me da muchísimo gusto que esté funcionando bien. ¿Cómo te puedo seguir apoyando?"
      ] : [
        "You're so welcome, dude! Stoked I could help you out. What else are you working on?",
        "Awesome, bro! Love hearing that. That's what I'm here for. What's next on your list?",
        "So cool to hear! That energy is contagious, man. What else can we tackle together?",
        "Right on! Super happy it worked out for you. How else can I help make your project even better?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    // ⚡ RESPUESTAS URGENTES CON ACCIÓN INMEDIATA
    if (emotions.urgent) {
      const responses = isSpanish ? [
        "¡Órale, primo! Entiendo que es urgente. Vamos directo al grano - ¿qué necesitas que resuelva ahorita mismo?",
        "¡Ándale, compadre! Situación urgente detectada. Dame los detalles y te ayudo inmediatamente.",
        "¡Ok primo, código rojo! Dime específicamente qué necesitas y lo resolvemos ya.",
        "¡Entendido, hermano! Emergencia en construcción. ¿Qué está pasando y cómo lo arreglamos rápido?"
      ] : [
        "Got it, dude! Emergency mode activated. Tell me exactly what you need and I'll help you solve it right now.",
        "Understood, bro! Urgent situation - I'm on it. What specifically needs fixing immediately?",
        "Alright, man! Code red situation. Give me the details and we'll sort this out fast.",
        "Copy that! Emergency construction situation. What's happening and how do we fix it quickly?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    // 🤝 CONFIRMACIONES Y SEGUIMIENTO CONVERSACIONAL NATURAL
    if (intentions.confirmation || (isFollowingUp && intentions.agreement)) {
      const responses = isSpanish ? [
        "¡Exacto, primo! Me da gusto que nos entendamos perfecto. ¿Qué hacemos ahora?",
        "¡Simón, compadre! Estamos en la misma página. ¿Cuál es el siguiente paso?",
        "¡Ándale! Así me gusta, que todo quede claro. ¿En qué más te ayudo?",
        "¡Perfecto, hermano! Vamos bien encaminados. ¿Qué sigue en tu plan?",
        "¡Órale, sí! Te sigo al cien. ¿Qué quieres que platiquemos ahora?",
        "¡Exacto, primo! Nos entendemos bien. ¿Cuál es tu siguiente pregunta?"
      ] : [
        "Exactly, dude! Love that we're totally on the same page. What's our next move?",
        "Perfect, bro! We're vibing perfectly. What should we tackle next?",
        "Right on, man! Glad we're dialed in together. How can I help you move forward?",
        "Awesome! We're clicking perfectly. What's the next step in your master plan?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    // 🔄 SEGUIMIENTOS CONVERSACIONALES ("Y AHORA QUÉ")
    if (intentions.followUp && !intentions.agreement) {
      const responses = isSpanish ? [
        "¡Buena pregunta, primo! Ahora que ya tienes eso claro, te sugiero que sigamos con...",
        "¡Órale, compadre! El siguiente paso lógico sería...",
        "¡Ándale! Ya que estamos aquí, lo que sigue normalmente es...",
        "¡Perfecto timing, hermano! Lo que yo haría ahora es..."
      ] : [
        "Great question, dude! Now that we've got that sorted, I'd suggest we move on to...",
        "Awesome follow-up, bro! The logical next step would be...",
        "Perfect timing, man! What typically comes next is...",
        "Right on! Now that we're here, what I'd do next is..."
      ];
      return responses[Math.floor(Math.random() * responses.length)] + (isSpanish ? " ¿Qué te parece si empezamos por ahí?" : " What do you think?");
    }
    // 💬 SALUDOS NATURALES Y CASUALES
    if (intentions.greeting || emotions.casual) {
      const timeOfDay = new Date().getHours();
      const morning = timeOfDay < 12;
      const afternoon = timeOfDay < 18;
      const responses = isSpanish ? [
        `¡${morning ? 'Buenos días' : afternoon ? 'Buenas tardes' : 'Buenas noches'}, primo! ¿Cómo andas? ¿En qué proyecto estás trabajando?`,
        "¡Órale, qué tal compadre! ¿Todo tranquilo por allá? Platícame qué traes entre manos.",
        "¡Ey, hermano! ¿Cómo está la cosa? ¿Hay algo en construcción en lo que te pueda echar la mano?",
        "¡Qué onda, primo! ¿Cómo va tu día? ¿Algún proyecto que necesite mi expertise?"
      ] : [
        `${morning ? 'Morning' : afternoon ? 'Afternoon' : 'Evening'}, dude! How's it going? What project are you working on?`,
        "Hey bro! What's up? Everything chill on your end? Tell me what you're building.",
        "What's good, man! How are things? Any construction stuff I can help you with?",
        "Yo! How's your day treating you? Got any projects that need my expertise?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    // ✅ ACUERDOS Y RESPUESTAS BÁSICAS
    if (intentions.agreement || isVeryShort) {
      const responses = isSpanish ? [
        "¡Órale! Me da mucho gusto que estemos en la misma página, primo. ¿Qué más ocupas?",
        "¡Perfecto, compadre! ¿En qué más te puedo ayudar?",
        "¡Excelente! Así me gusta, que nos entendamos bien. ¿Cuál es tu siguiente move?"
      ] : [
        "Perfect, dude! Glad we're on the same page. What else do you need?",
        "Awesome, bro! What else can I help you with?",
        "Right on, man! Love that we understand each other. What's next?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    // 🔧 RESPUESTAS DE CONSTRUCCIÓN/LICENCIAS ESPECÍFICAS
    if (/(licencia|license|permit|construccion|construction|contractor)/i.test(userMessageLower)) {
      const responses = isSpanish ? [
        "¡Órale primo! Claro que te ayudo con eso. Las licencias de construcción pueden ser un rollo, pero conozco todos los trucos. ¿Qué específicamente necesitas saber?",
        "¡Ey compadre! Ese es mi territorio. Construcción y licencias son mi especialidad. Platícame qué proyecto tienes en mente.",
        "¡Perfecto, hermano! Ahí es donde puedo brillar. ¿Estás empezando como contratista o ya tienes experiencia pero necesitas la licencia oficial?"
      ] : [
        "Oh dude! That's totally my wheelhouse. Construction licensing can be a pain, but I know all the shortcuts. What specifically do you need to know?",
        "Hey bro! That's exactly what I'm here for. Construction and licensing are my specialty. Tell me about your project.",
        "Perfect, man! That's where I really shine. Are you just starting as a contractor or do you have experience but need the official license?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    // 🎯 RESPUESTA GENERAL INTELIGENTE CONTEXTUAL
    const generalResponses = isSpanish ? [
      "¡Órale primo! Me gusta tu pregunta. Platícame más detalles para poder ayudarte mejor.",
      "¡Ey compadre! Estoy aquí para echarte la mano. ¿Qué específicamente necesitas saber?",
      "¡Qué tal, hermano! Esa es una buena pregunta. Cuéntame más del contexto.",
      "¡Perfecto! Me gusta cuando llegan con preguntas así. ¿Qué más detalles puedes darme?"
    ] : [
      "Hey dude! I love that question. Give me more details so I can help you better.",
      "What's up, bro! I'm here to help you out. What specifically do you need to know?",
      "Yo, man! That's a solid question. Tell me more about the context.",
      "Perfect! I love when you come with questions like that. What other details can you give me?"
    ];
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  };
  // 🧠 FUNCIÓN ADICIONAL DE RESPUESTAS AVANZADAS (MANTENIDA PARA COMPATIBILIDAD)
  const generateAdvancedResponse = async (userMessage: string): Promise<string> => {
    console.log('🧠 [ADVANCED-RESPONSE] Procesando respuesta avanzada:', userMessage);
    const userMessageLower = userMessage.toLowerCase();
    const isSpanish = /[ñáéíóúü]/i.test(userMessage) ||
                      /\b(que|como|con|por|para|muy|mas|todo|este|esta|cuando|donde|porque|desde|hasta)\b/.test(userMessageLower);
    // 🎯 RESPUESTA DE FALLBACK CONVERSACIONAL
    return isSpanish ?
      "¡Órale primo! Platícame más específicamente qué necesitas y te ayudo al tiro." :
      "Hey dude! Tell me more specifically what you need and I'll help you out right away.";
  };
  // 🚀 SISTEMA ANTI-CUELGUES Y MANEJO ROBUSTO DE ERRORES
  const handleSendMessage = async () => {
    console.log('📤 [SEND-MESSAGE] Iniciando envío de mensaje:', { inputValue, isLoading });
    // ⚠️ PREVENCIÓN DE ENVÍOS DUPLICADOS
    if (isLoading) {
      console.warn('⚠️ [SEND-MESSAGE] Mensaje ya en proceso, ignorando duplicado');
      return;
    }
    if (!inputValue.trim()) {
      console.warn('⚠️ [SEND-MESSAGE] Mensaje vacío, cancelando');
      return;
    }
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: "user",
    };
    const originalInput = inputValue;
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    // 🛡️ SISTEMA ANTI-CUELGUES CON TIMEOUT ROBUSTO
    const timeoutId = setTimeout(() => {
      console.error('⏰ [TIMEOUT] Respuesta tardó más de 15 segundos, aplicando fallback');
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `timeout-${Date.now()}`,
          content: "¡Órale primo! Me tardé un chingo, pero aquí ando. A veces la conexión se pone cabrona. ¿Me repites tu pregunta?",
          sender: "assistant",
        },
      ]);
    }, 15000);
    try {
      console.log('🧠 [SEND-MESSAGE] Procesando mensaje con sistema híbrido:', originalInput);
      // 🧠 PROCESAMIENTO INTELIGENTE CON SISTEMA HÍBRIDO
      const response = await generateIntelligentResponse(originalInput);
      clearTimeout(timeoutId);
      if (!response || response.trim() === '') {
        throw new Error('Respuesta vacía del sistema inteligente');
      }
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: response,
        sender: "assistant",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      console.log('✅ [SEND-MESSAGE] Respuesta generada exitosamente');
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ [SEND-MESSAGE] Error generando respuesta:', error);
      // 🛡️ RESPUESTA DE EMERGENCIA INTELIGENTE
      const emergencyResponse = `¡Órale primo! Se me trabó un poco el sistema, pero aquí estoy. ${
        originalInput.toLowerCase().includes('licencia') ? 'Sobre licencias de construcción te puedo ayudar un chingo.' :
        originalInput.toLowerCase().includes('construccion') ? 'De construcción sé bastante, platícame más.' :
        '¿Me repites tu pregunta para ayudarte mejor?'
      }`;
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: emergencyResponse,
          sender: "assistant",
        },
      ]);
    } finally {
      setIsLoading(false);
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
  };
  const handleClientSelect = (client: Client | null) => {
    if (client) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `✅ Cliente "${client.name}" seleccionado. Continuando con la estimación...`,
          sender: "assistant",
        },
      ]);
      setSelectedClient(client);
      setChatFlowStep("client-added");
      setChatFlowStep("awaiting-project-description");
      const askDescriptionMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: "Por favor, proporciona una descripción del proyecto.",
        sender: "assistant",
      };
      setMessages((prev) => [...prev, askDescriptionMessage]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      // setEstimate((prev) => ({ ...prev, client }));
    } else {
      // Handle new client entry
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "Por favor comparte los detalles del nuevo cliente en el siguiente formato:\n\nNombre, Email, Teléfono, Dirección, Ciudad, Estado, Código Postal",
          sender: "assistant",
        },
      ]);
      setChatFlowStep("enter-new-client");
    }
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  // Manejar selección de acción
  const handleAction = (action: string) => {
    setIsLoading(true);
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      content: "Analizando datos...",
      sender: "assistant",
      state: "analyzing",
    };
    setMessages((prev) => [...prev, thinkingMessage]);
    // Simular respuesta
    setTimeout(() => {
      // Eliminar mensaje de pensando
      setMessages((prev) => prev.filter((m) => m.id !== thinkingMessage.id));
      // Determinar respuesta según acción
      let response = "";
      switch (action) {
        case "estimates":
          response =
            "¡Órale primo! Puedo ayudarte a generar estimados súper precisos para tus proyectos. Solo necesito que me compartas algunos datos básicos como la información del cliente, descripción del proyecto y el inventario. ¡Está al tiro!";
          break;
        case "contracts":
          response =
            "Puedo ayudarte a generar un contrato profesional y legal. ¿Te gustaría crear un nuevo contrato desde cero, usar una plantilla existente o modificar un contrato anterior?";
          break;
        case "permits":
          response =
            "Para ayudarte con información sobre permisos y regulaciones, necesito saber la ubicación exacta, el tipo de cerca que planeas instalar y si la propiedad está en una zona con restricciones.";
          break;
        case "properties":
          response =
            "Para verificar los detalles de una propiedad, necesito la dirección completa del inmueble. Esto me permitirá confirmar al propietario actual y verificar los límites de la propiedad.";
          break;
        case "analytics":
          response =
            "Puedo proporcionar análisis detallados sobre tendencias de costos de materiales, comparativas de proyectos anteriores y métricas de rentabilidad por tipo de proyecto.";
          break;
        default:
          response = "¿En qué puedo ayudarte hoy?";
      }
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: response,
        sender: "assistant",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      // Desplazar al final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1500);
    if (action === "estimates") {
      setCaseType("Estimates");
      setChatFlowStep("select-client");
      // Load clients
      getFirebaseClients().then((clientList) => {
        setClients(clientList);
        // Delay sending the assistant message by 3 seconds (3000 ms)
        setTimeout(() => {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            content: "Selecciona un cliente existente o crea uno nuevo:",
            sender: "assistant",
            clients: clientList,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setChatFlowStep("awaiting-client-choice");
          setIsLoading(false);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }, 3000);
      });
      return; // Prevent default simulated reply
    }
    // Handle contract generation (NEW)
    if (action === "contracts") {
      setCaseType("Contract");
      setContractFlowStep("select-estimate");
      // Load estimates for contract generation
      loadEstimates().then((estimatesData) => {
        setTimeout(() => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== thinkingMessage.id),
          );
          if (!estimatesData || estimatesData.length === 0) {
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                content:
                  "No se encontraron estimados. Necesitas crear un estimado primero antes de generar un contrato.",
                sender: "assistant",
              },
            ]);
            setIsLoading(false);
            return;
          }
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            content: "Selecciona el estimado que deseas convertir en contrato:",
            sender: "assistant",
            estimates: estimatesData.slice(0, 10),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setContractFlowStep("awaiting-estimate-choice");
          setIsLoading(false);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }, 1000);
      });
      return; // Prevent default simulated reply
    }
    // Handle permit advisor (NEW)
    if (action === "permits") {
      setCaseType("Permits");
      setPermitFlowStep("address-selection");
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== thinkingMessage.id));
        // Second message: Show the choice options after a brief delay
        setTimeout(() => {
          const choiceMessage: Message = {
            id: `assistant-${Date.now()}`,
            content:
              "Ingresa la dirección de tu propiedad para comenzar el análisis integral de permisos. Elige una opción:",
            sender: "assistant",
            action: "permit-address-selection",
          };
          setMessages((prev) => [...prev, choiceMessage]);
          setPermitFlowStep("awaiting-address-choice");
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }, 1500);
        setIsLoading(false);
      }, 1000);
      return; // Prevent default simulated reply
    }
    // Desplazar al final
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  // OpenAI DeepSearch AI function
  const performDeepSearchAI = async (
    option: DeepSearchOption,
    description: string,
  ): Promise<DeepSearchRecommendation> => {
    setIsDeepSearchProcessing(true);
    // Create AbortController for request cancellation
    const controller = new AbortController();
    // Set timeout for the request (3 minutes)
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 180000); // 3 minutes
    try {
      const response = await fetch("/api/deepsearch-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          option,
          projectDescription: description,
          clientInfo: selectedClient,
        }),
        signal: controller.signal,
      });
      // Clear timeout if request completes
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);
      // Handle different error types
      if (error.name === "AbortError") {
        console.error("DeepSearch AI request was aborted (timeout)");
        throw new Error(
          "La solicitud excedió el tiempo límite. Por favor intenta nuevamente.",
        );
      } else if (error.code === "ECONNABORTED") {
        console.error("DeepSearch AI request was aborted");
        throw new Error(
          "La conexión fue interrumpida. Por favor intenta nuevamente.",
        );
      } else {
        console.error("Error in DeepSearch AI:", error);
        throw error;
      }
    } finally {
      setIsDeepSearchProcessing(false);
    }
  };
  // Handle DeepSearch option selection
  const handleDeepSearchOptionSelect = async (option: DeepSearchOption) => {
    setDeepSearchOption(option);
    setChatFlowStep("deepsearch-processing");
    // Show processing message
    const processingMessage: Message = {
      id: `assistant-${Date.now()}`,
      content:
        "🧠 Procesando con DeepSearch AI... Esto puede tomar unos momentos.",
      sender: "assistant",
      state: "analyzing",
    };
    setMessages((prev) => [...prev, processingMessage]);
    // Scroll to bottom after processing message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    try {
      const recommendation = await performDeepSearchAI(
        option,
        projectDescription,
      );
      setDeepSearchRecommendation(recommendation);
      setEditingMaterials(recommendation.materials);
      setEditingLaborCosts(recommendation.laborCosts);
      // Remove processing message
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id));
      // Show results
      const resultsMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: generateDeepSearchResultsMessage(recommendation, option),
        sender: "assistant",
        action: "deepsearch-results",
      };
      setMessages((prev) => [...prev, resultsMessage]);
      setChatFlowStep("deepsearch-results");
      // Scroll to bottom after results message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("DeepSearch AI Error:", error);
      // Remove processing message
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id));
      // Show error message
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        content:
          "❌ Error al procesar la recomendación de DeepSearch AI. Por favor intenta nuevamente.",
        sender: "assistant",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setChatFlowStep("awaiting-deepsearch-choice");
      // Scroll to bottom after error message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };
  // Generate DeepSearch results message
  const generateDeepSearchResultsMessage = (
    recommendation: DeepSearchRecommendation,
    option: DeepSearchOption,
  ): string => {
    let message = "✨ **Recomendación de DeepSearch AI completada**\n\n";
    if (option === "materials-only" || option === "materials-labor") {
      message += "📦 **Materiales Recomendados:**\n";
      recommendation.materials.forEach((material, index) => {
        message += `${index + 1}. ${material.name} - ${material.quantity} ${material.unit}\n`;
        message += `   Precio estimado: $${material.estimatedPrice.toFixed(2)}\n`;
        message += `   Razón: ${material.reason}\n\n`;
      });
      message += `💰 **Costo total de materiales: $${recommendation.totalMaterialCost.toFixed(2)}**\n\n`;
    }
    if (option === "labor-only" || option === "materials-labor") {
      message += "⚡ **Costos de Mano de Obra:**\n";
      recommendation.laborCosts.forEach((labor, index) => {
        message += `${index + 1}. ${labor.task} - ${labor.estimatedHours} horas\n`;
        message += `   Tarifa: $${labor.hourlyRate.toFixed(2)}/hora\n`;
        message += `   Costo total: $${labor.totalCost.toFixed(2)}\n\n`;
      });
      message += `💼 **Costo total de mano de obra: $${recommendation.totalLaborCost.toFixed(2)}**\n\n`;
    }
    message += `🎯 **Costo total del proyecto: $${recommendation.totalProjectCost.toFixed(2)}**\n\n`;
    if (recommendation.recommendations.length > 0) {
      message += "💡 **Recomendaciones adicionales:**\n";
      recommendation.recommendations.forEach((rec, index) => {
        message += `• ${rec}\n`;
      });
    }
    return message;
  };
  const taxWithPercentage = (tax: {
    type: "manual" | "percentage";
    amount: number;
  }) => {
    if (tax.type === "percentage") {
      return (getCartTotal() * tax.amount) / 100;
    }
    return tax.amount;
  };
  const discountCalculation = () => {
    if (discount.type === "percentage") {
      return (getCartTotal() * discount.amount) / 100;
    }
    return discount.amount;
  };
  const handleCreateEstimate = async () => {
    try {
      const body = {
        firebaseUserId: currentUser?.uid,
        estimateNumber: `EST-${Date.now()}`,
        // Información completa del cliente
        clientName: selectedClient?.name,
        clientEmail: selectedClient?.email,
        clientPhone: selectedClient?.phone || "",
        clientAddress: selectedClient?.address || "",
        clientInformation: selectedClient,
        // Detalles del proyecto
        projectDescription: projectDescription,
        projectType: "construction",
        // Items completos - VALORES DIRECTOS SIN CONVERSIONES
        items: shoppingCart.map((item, index) => ({
          id: item.material.id,
          materialId: item.material.id || "",
          name: item.material.name,
          description: item.material.description || "",
          quantity: item.quantity,
          unit: item.material.unit || "unit",
          unitPrice: item.material.price, // NO convertir a centavos
          price: item.material.price, // Agregar precio directo
          totalPrice: Number(item.material.price * item.quantity).toFixed(2), // NO convertir a centavos
          total: Number(item.material.price * item.quantity).toFixed(2), // Agregar total directo
          sortOrder: index,
          isOptional: false,
        })),
        // DATOS FINANCIEROS DIRECTOS - SIN CONVERSIONES A CENTAVOS
        subtotal: getCartTotal().toFixed(2),
        taxRate: tax.type === "percentage" ? tax.amount : 0, // ✅ FIXED: Return number 0, not string "0.0"
        taxAmount:
          tax.type === "percentage"
            ? taxWithPercentage(tax).toFixed(2)
            : tax.amount.toFixed(2), // ✅ FIXED: Handle both types
        // DESCUENTOS DIRECTOS - SIN CONVERSIONES
        discount: discountCalculation(),
        discountType: discount.type,
        discountValue: discountCalculation(),
        discountAmount: discountCalculation(),
        discountName: "",
        total:
          Number(getCartTotal() + taxWithPercentage(tax)) -
          discountCalculation(),
        // Display-friendly totals (mismos valores)
        displaySubtotal: Number(getCartTotal()),
        displayTax: taxWithPercentage(tax),
        displayTotal:
          Number(getCartTotal() + taxWithPercentage(tax)) -
          discountCalculation(),
        displayDiscountAmount: discountCalculation(),
        // Metadata
        status: "draft",
        type: "estimate",
        source: "mervin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Buscar proyecto existente para el mismo cliente
      const { collection, query, where, getDocs, addDoc, updateDoc, doc } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const existingQuery = query(
        collection(db, "estimates"),
        //  @ts-ignore
        where("firebaseUserId", "==", currentUser.uid as string),
        where("clientName", "==", selectedClient?.name),
      );
      const estimatesRef = collection(db, "estimates");
      // Always create a new estimate, regardless of existing ones
      await addDoc(estimatesRef, body);
      // Show success message
      toast({
        title: "Estimado guardado",
        description: "El estimado ha sido guardado exitosamente.",
      });
    } catch (error) {}
  };
  const handleDownload = async (tax: {
    type: "manual" | "percentage";
    amount: number;
  }) => {
    try {
      // Validar que el perfil del contractor esté completo
      // Create payload in the exact format expected by Puppeteer service
      const payload = {
        user: currentUser
          ? [
              {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
              },
            ]
          : [],
        client: selectedClient || {},
        items:
          shoppingCart.map((item) => {
            return {
              id: item.material.id,
              materialId: item.material.id,
              name: item.material.name,
              description: item.material.description,
              quantity: item.quantity,
              price: item.material.price,
              unit: item.material.unit,
              total: Number(item.material.price * item.quantity).toFixed(2),
            };
          }) || [],
        projectTotalCosts: {
          subtotal: Number(getCartTotal()),
          discount: discountCalculation(),
          taxRate: tax.type === "percentage" ? tax.amount : 0,
          taxAmount: Number(taxWithPercentage(tax)), // ✅ ADD THIS - send as number
          tax: Number(taxWithPercentage(tax)), // ✅ CHANGE - send as number
          total: Number(
            (
              Number(getCartTotal()) +
              taxWithPercentage(tax) -
              discountCalculation()
            ).toFixed(2),
          ),
        },
        originalData: {
          projectDescription: projectDescription || "",
        },
        // Add contractor data from profile
        contractor: {
          name: profile?.company || "Owl Fence LLC",
          company: profile?.company || "Owl Fence LLC",
          address: profile?.address || "2901 Owens Ct, Fairfield, CA 94534 US",
          phone: profile?.phone || "(202) 549-3519",
          email: profile?.email || currentUser?.email || "info@owlfenc.com",
          website: profile?.website || "www.owlfenc.com",
          logo: profile?.logo || "",
          license: profile?.license || "CA-LICENSE-123",
        },
        isMembership: userSubscription?.plan?.id === 1 ? false : true,
      };
      console.log("📤 Sending payload to PDF service:", payload);
      // Use new Puppeteer PDF service (local, no external dependency)
      const response = await axios.post(
        "/api/estimate-puppeteer-pdf",
        payload,
        {
          responseType: "blob", // Important for PDF download
        },
      );
      console.log("📨 Response received:", {
        status: response.status,
        headers: response.headers,
        dataType: typeof response.data,
        dataSize: response.data?.size || "unknown",
      });
      // Validate the blob
      if (!response.data || response.data.size === 0) {
        throw new Error("Received empty PDF data from server");
      }
      // Create blob for sharing/downloading
      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      console.log("📄 Created PDF blob:", {
        size: pdfBlob.size,
        type: pdfBlob.type,
      });
      // Generate filename with client name and timestamp
      const clientName =
        selectedClient?.name.replace(/[^a-zA-Z0-9]/g, "_") || "client";
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const filename = `estimate-${clientName}-${timestamp}.pdf`;
      // Use mobile sharing utility for smart download/share behavior
      await shareOrDownloadPdf(pdfBlob, filename, {
        title: `Estimate for ${selectedClient?.name || "Client"}`,
        text: `Professional estimate from ${profile?.company || "your contractor"}`,
        clientName: selectedClient?.name,
        estimateNumber: `EST-${timestamp}`,
      });
      console.log("📥 PDF download/share completed successfully");
      // Get sharing capabilities for toast message
      const capabilities = getSharingCapabilities();
      const actionText =
        capabilities.isMobile && capabilities.nativeShareSupported
          ? "PDF generated and ready to share"
          : "PDF downloaded successfully";
      toast({
        title: "✅ PDF Generated",
        description: actionText,
      });
      // Mostrar mensaje de éxito en español
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "✅ ¡PDF generado con éxito! Aquí está tu archivo de estimación listo para descargar.",
          sender: "assistant",
        },
      ]);
      // Desplazar al final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            content:
              "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. ¿En qué puedo ayudarte hoy?",
            sender: "assistant",
            action: "menu",
          },
        ]);
        setSelectedClient(null);
        setChatFlowStep(null);
        setCaseType("");
        setProjectDescription("");
        setShoppingCart([]);
        setInventoryItems([]);
        setDeepSearchOption(null);
        setDiscount({
          type: "manual",
          amount: 0,
        });
        setTax({
          type: "manual",
          amount: 0,
        });
        setDeepSearchRecommendation(null);
      }, 5000);
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "❌ Error",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleEstimateFlow = async (userInput: string) => {
    if (chatFlowStep === "awaiting-client-choice") {
      if (userInput === "nuevo cliente") {
        setChatFlowStep("enter-new-client");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Por favor comparte los detalles del nuevo cliente en el siguiente formato:\n\nNombre, Email, Teléfono, Dirección, Ciudad, Estado, Código Postal",
            sender: "assistant",
          },
        ]);
      } else {
        // Try to find client by name
        const client = clients.find((c) =>
          c.name.toLowerCase().includes(userInput),
        );
        if (client) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content: `Cliente "${client.name}" seleccionado. Procediendo al siguiente paso.`,
              sender: "assistant",
            },
          ]);
          setSelectedClient(client);
          setChatFlowStep("client-added");
          // Save selected client to estimate context
          // setEstimate((prev) => ({ ...prev, client }));
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content:
                "No se encontró un cliente con ese nombre. Intenta de nuevo o escribe 'nuevo cliente'.",
              sender: "assistant",
            },
          ]);
        }
      }
    } else if (chatFlowStep === "enter-new-client") {
      const parts = userInput.split(",");
      if (parts.length < 3) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Formato incorrecto. Asegúrate de incluir: Nombre, Email, Teléfono, Dirección, Ciudad, Estado, Código Postal.",
            sender: "assistant",
          },
        ]);
        return;
      }
      const [name, email, phone, address, city, state, zipCode] = parts.map(
        (p) => p.trim(),
      );
      try {
        const clientData = {
          clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          // @ts-ignore
          userId: currentUser.uid as string,
          name,
          email,
          phone,
          mobilePhone: "",
          address,
          city,
          state,
          zipCode,
          notes: "",
          source: "Manual - Estimates",
          classification: "cliente",
          tags: [],
        };
        const savedClient = await saveClient(clientData);
        const clientWithId: Client = {
          id: savedClient.id,
          ...clientData,
          createdAt: savedClient.createdAt || new Date(),
          updatedAt: savedClient.updatedAt || new Date(),
        };
        setClients((prev) => [clientWithId, ...prev]);
        // Attach to estimate state
        // setEstimate((prev) => ({ ...prev, client: clientWithId }));
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: `✅ Cliente "${name}" creado y asignado con éxito.`,
            sender: "assistant",
          },
        ]);
        setChatFlowStep("client-added");
        toast({
          title: "✅ Cliente Creado Exitosamente",
          description: `${name} ha sido guardado y seleccionado para este estimado.`,
          duration: 4000,
        });
      } catch (error) {
        console.error("❌ Error creating client:", error);
        toast({
          title: "Error al Crear Cliente",
          description:
            error instanceof Error
              ? error.message
              : "No se pudo crear el cliente. Verifica tu conexión.",
          variant: "destructive",
          duration: 6000,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Ocurrió un error al guardar el cliente. Por favor intenta nuevamente.",
            sender: "assistant",
          },
        ]);
      }
    } else if (chatFlowStep === "awaiting-project-description") {
      setProjectDescription(userInput);
      setChatFlowStep("awaiting-deepsearch-choice");
      // Ask DeepSearch AI question
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "¿Le gustaría realizar una recomendación de DeepSearch AI (materiales + costo de mano de obra, solo materiales o solo mano de obra)?",
          sender: "assistant",
          action: "deepsearch-options",
        },
      ]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (chatFlowStep === "awaiting-new-material") {
      const parts = userInput.split(",");
      if (parts.length < 5) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Formato incorrecto. Asegúrate de incluir: Nombre, Descripción, Precio, Unidad, Categoría",
            sender: "assistant",
          },
        ]);
        return;
      }
      const [name, description, priceStr, unit, category] = parts.map((p) =>
        p.trim(),
      );
      const price = parseFloat(priceStr);
      if (isNaN(price)) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: "El precio debe ser un número válido.",
            sender: "assistant",
          },
        ]);
        return;
      }
      try {
        const { collection, addDoc } = await import("firebase/firestore");
        const materialsRef = collection(db, "materials");
        const docRef = await addDoc(materialsRef, {
          name,
          description,
          price,
          unit,
          category,
          //@ts-ignore
          userId: currentUser.uid as string,
        });
        const newMaterial: Material = {
          id: docRef.id,
          name,
          description,
          price,
          unit,
          category,
        };
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: `✅ Material "${name}" agregado exitosamente.`,
            sender: "assistant",
          },
        ]);
        // 🔁 Re-load updated materials and render again as new message
        const updatedMaterials = await loadMaterials();
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Material agregado. Ahora puedes seleccionar de la lista actualizada:",
            sender: "assistant",
            materialList: updatedMaterials,
          },
        ]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
        setChatFlowStep("select-inventory");
      } catch (error) {
        console.error("❌ Error al guardar material:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Ocurrió un error al guardar el material. Intenta nuevamente.",
            sender: "assistant",
          },
        ]);
      }
      return;
    } else if (chatFlowStep === "awaiting-discount") {
      const value = userInput.trim();
      let discount: string | null = null;
      if (value.toLowerCase() !== "skip") {
        const isPercentage = value.endsWith("%");
        const numeric = isPercentage ? value.slice(0, -1) : value;
        if (isNaN(Number(numeric))) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content:
                "Formato inválido para el descuento. Usa un número o porcentaje (ej: `100` o `10%`).",
              sender: "assistant",
            },
          ]);
          return;
        }
        if (isPercentage) {
          setDiscount({
            type: "percentage",
            amount: parseFloat(numeric),
          });
          toast({
            title: "Descuento Aplicado",
            description: `Descuento del ${parseFloat(numeric)}% aplicado.`,
          });
        } else {
          setDiscount({
            type: "manual",
            amount: parseFloat(numeric),
          });
          toast({
            title: "Descuento Aplicado",
            description: `Descuento de $${parseFloat(numeric)} aplicado.`,
          });
        }
        discount = isPercentage
          ? `${parseFloat(numeric)}%`
          : `${parseFloat(numeric)}`;
      }
      // Ask for tax
      setChatFlowStep("awaiting-tax");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "¿Deseas aplicar algún **impuesto**? Ingresa un valor numérico o porcentaje (ej: `50` o `13%`). Escribe `skip` para omitir.",
          sender: "assistant",
        },
      ]);
      setTimeout(
        () =>
          messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        100,
      );
    } else if (chatFlowStep === "awaiting-tax") {
      const value = userInput.trim();
      let tax: string | null = null;
      let currentTax: { type: "manual" | "percentage"; amount: number } = {
        type: "manual",
        amount: 0,
      };
      if (value.toLowerCase() !== "skip") {
        const isPercentage = value.endsWith("%");
        const numeric = isPercentage ? value.slice(0, -1) : value;
        if (isNaN(Number(numeric))) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content:
                "Formato inválido para el impuesto. Usa un número o porcentaje (ej: `50` o `13%`).",
              sender: "assistant",
            },
          ]);
          return;
        }
        if (isPercentage) {
          currentTax = {
            type: "percentage",
            amount: parseFloat(numeric),
          };
          setTax(currentTax);
          toast({
            title: "Impuesto Aplicado",
            description: `Impuesto del ${parseFloat(numeric)}% aplicado.`,
          });
        } else {
          toast({
            title: "Impuesto Aplicado",
            description: `Impuesto de $${parseFloat(numeric)} aplicado.`,
          });
          currentTax = {
            type: "manual",
            amount: parseFloat(numeric),
          };
          setTax(currentTax);
        }
        tax = isPercentage
          ? `${parseFloat(numeric)}%`
          : `${parseFloat(numeric)}`;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `✅ Gracias. El estimado será generado con los valores ingresados.`,
          sender: "assistant",
        },
      ]);
      setTimeout(
        () =>
          messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        100,
      );
      await handleCreateEstimate();
      await handleDownload(currentTax);
      setChatFlowStep(null); // reset
    } else {
    }
  };
  // Contract flow handler (NEW - only for contract generation)
  const handleContractFlow = async (userInput: string) => {
    const input = userInput.trim().toLowerCase();
    if (contractFlowStep === "awaiting-estimate-choice") {
      const selectedIndex = parseInt(input) - 1;
      if (selectedIndex >= 0 && selectedIndex < estimates.length) {
        const estimate = estimates[selectedIndex];
        setSelectedEstimate(estimate);
        setSelectedClient(
          estimate.clientInformation ||
            ({
              id: "temp",
              clientId: "temp",
              name: estimate.clientName,
              email: estimate.clientEmail,
              phone: estimate.clientPhone,
              address: estimate.clientAddress,
            } as Client),
        );
        // Set project scope from estimate
        setProjectScope(
          estimate.projectDescription ||
            "Descripción del proyecto no disponible",
        );
        // Set editing client data
        setEditingClient({
          name: estimate.clientName || "",
          email: estimate.clientEmail || "",
          phone: estimate.clientPhone || "",
          address: estimate.clientAddress || "",
        });
        const clientInfo = estimate.clientInformation || {
          name: estimate.clientName,
          email: estimate.clientEmail,
          phone: estimate.clientPhone,
          address: estimate.clientAddress,
        };
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: `✅ Estimado "${estimate.estimateNumber}" seleccionado.\n\n📋 **INFORMACIÓN DEL CLIENTE:**\n• Nombre: ${clientInfo.name || "No especificado"}\n• Email: ${clientInfo.email || "No especificado"}\n• Teléfono: ${clientInfo.phone || "No especificado"}\n• Dirección: ${clientInfo.address || "No especificado"}\n\n¿Deseas editar esta información? Responde **SÍ** o **NO**`,
            sender: "assistant",
          },
        ]);
        setContractFlowStep("edit-client-info");
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Número inválido. Por favor selecciona un estimado de la lista.",
            sender: "assistant",
          },
        ]);
      }
    } else if (contractFlowStep === "edit-client-info") {
      if (
        input === "sí" ||
        input === "si" ||
        input === "yes" ||
        input === "s"
      ) {
        // Show client editing form
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "📝 **EDITAR INFORMACIÓN DEL CLIENTE**\n\nCompleta el formulario a continuación:",
            sender: "assistant",
            action: "client-edit-form",
          },
        ]);
      } else if (input === "no" || input === "n") {
        // Continue to project timeline
        setContractFlowStep("project-timeline");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "✅ Perfecto. Mantendremos la información actual del cliente.\n\n📅 **CRONOGRAMA DEL PROYECTO**\n\nAhora necesito información sobre el cronograma del proyecto:",
            sender: "assistant",
            action: "project-timeline",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "❌ Respuesta no válida. Por favor responde **SÍ** para editar la información del cliente o **NO** para continuar con los datos actuales.",
            sender: "assistant",
          },
        ]);
      }
    } else if (contractFlowStep === "project-timeline") {
      // Check if contractor profile exists automatically
      const hasContractorInfo =
        profile?.company && profile?.company.trim() !== "";
      if (hasContractorInfo) {
        // Use profile data and skip contractor info step
        setContractorInfo({
          company: profile?.company || "",
          license: profile?.license || "",
          licenseUrl: profile?.documents?.licenseUrl || "",
          insurance: profile?.insurancePolicy || "",
          address: profile?.address || "",
          phone: profile?.phone || "",
          email: profile?.email || "",
          logo: profile?.logo || "",
        });
        setContractFlowStep("project-milestones");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "✅ Cronograma del proyecto guardado.\n\n✅ Información del contratista cargada desde el perfil.\n\n🎯 **HITOS DEL PROYECTO**\n\nConfigura los hitos del proyecto:",
            sender: "assistant",
            action: "project-milestones",
          },
        ]);
      } else {
        // No contractor info exists, ask them to set it up
        setContractFlowStep("contractor-info");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "✅ Cronograma del proyecto guardado.\n\n🏢 **INFORMACIÓN DEL CONTRATISTA**\n\nNo tienes información de empresa configurada en tu perfil. Necesitas configurar tu información de empresa para generar contratos.\n\n¿Deseas configurarla ahora? Responde **SÍ** para continuar o **PERFIL** para ir a la página de perfil.",
            sender: "assistant",
          },
        ]);
      }
    } else if (contractFlowStep === "contractor-info") {
      if (
        input === "sí" ||
        input === "si" ||
        input === "yes" ||
        input === "s"
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "📝 **INFORMACIÓN DEL CONTRATISTA**\n\nCompleta la información de tu empresa:",
            sender: "assistant",
            action: "contractor-form",
          },
        ]);
      } else if (input === "perfil") {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "🔗 **IR AL PERFIL**\n\nPuedes configurar tu información de empresa en la página de perfil (/profile). Una vez configurada, regresa aquí para continuar con la generación del contrato.\n\n¿Deseas continuar sin información de empresa por ahora? Responde **CONTINUAR** o **CANCELAR**.",
            sender: "assistant",
          },
        ]);
      } else if (input === "continuar") {
        // Continue without contractor info (use defaults)
        setContractorInfo({
          company: "Tu Empresa",
          license: "Licencia pendiente",
          licenseUrl: "",
          insurance: "Seguro pendiente",
          address: "Dirección pendiente",
          phone: "Teléfono pendiente",
          email: "Email pendiente",
          logo: "",
        });
        setContractFlowStep("project-milestones");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "⚠️ Continuando con información de empresa temporal. Te recomendamos configurar tu perfil después.\n\n🎯 **HITOS DEL PROYECTO**\n\nConfigura los hitos del proyecto:",
            sender: "assistant",
            action: "project-milestones",
          },
        ]);
      } else if (input === "cancelar") {
        // Reset contract flow
        resetContractFlow();
        return;
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Por favor responde: **SÍ** para configurar ahora, **PERFIL** para ir a la página de perfil, **CONTINUAR** para usar datos temporales, o **CANCELAR** para salir.",
            sender: "assistant",
          },
        ]);
      }
    } else if (contractFlowStep === "project-milestones") {
      // Continue to warranty and permits
      setContractFlowStep("warranty-permits");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "✅ Hitos del proyecto configurados.\n\n🛡️ **GARANTÍAS Y PERMISOS**\n\n¿Deseas agregar información sobre garantías y permisos?\n\n• **SÍ** - Completar formulario\n• **OMITIR** - Continuar sin esta información",
          sender: "assistant",
        },
      ]);
    } else if (contractFlowStep === "warranty-permits") {
      if (
        input === "sí" ||
        input === "si" ||
        input === "yes" ||
        input === "s"
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "📝 **GARANTÍAS Y PERMISOS**\n\nCompleta la información sobre garantías y permisos:",
            sender: "assistant",
            action: "warranty-permits-form",
          },
        ]);
      } else if (
        input === "omitir" ||
        input === "skip" ||
        input === "no" ||
        input === "n"
      ) {
        // Skip warranty and permits, set defaults
        setWarrantyPermits({
          warranty: "Garantía estándar según términos del contrato",
          permits: "Permisos según regulaciones locales",
          insurance: "Seguro de responsabilidad vigente",
        });
        setContractFlowStep("legal-clauses");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "✅ Información de garantías y permisos omitida (se usarán valores estándar).\n\n⚖️ **CLÁUSULAS LEGALES**\n\n¿Deseas agregar cláusulas legales?\n\n• **AI** - Generar con inteligencia artificial\n• **MANUAL** - Agregar manualmente\n• **OMITIR** - Continuar sin cláusulas",
            sender: "assistant",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Por favor responde: **SÍ** para completar el formulario o **OMITIR** para continuar sin esta información.",
            sender: "assistant",
          },
        ]);
      }
    } else if (contractFlowStep === "legal-clauses") {
      if (input === "ai") {
        // Generate AI legal clauses
        await generateAILegalClauses();
      } else if (input === "manual") {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "📝 **CLÁUSULAS LEGALES MANUALES**\n\nAgrega cláusulas legales manualmente:",
            sender: "assistant",
            action: "legal-clauses-form",
          },
        ]);
      } else if (input === "omitir") {
        // Skip to project scope
        setContractFlowStep("project-scope");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: `📋 **ALCANCE DEL PROYECTO**\n\nRevisemos el alcance del proyecto:\n\n"${projectScope}"\n\n¿Deseas editarlo? Responde **SÍ** o **NO**`,
            sender: "assistant",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: "Por favor responde: **AI**, **MANUAL** o **OMITIR**",
            sender: "assistant",
          },
        ]);
      }
    } else if (
      contractFlowStep === "legal-clauses" &&
      input.includes("editar")
    ) {
      // User wants to edit clauses after preview
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "📝 **EDITAR CLÁUSULAS LEGALES**\n\nPuedes continuar editando las cláusulas:",
          sender: "assistant",
          action: "legal-clauses-form",
        },
      ]);
    } else if (
      contractFlowStep === "legal-clauses" &&
      (input === "sí" || input === "si" || input === "yes")
    ) {
      // User is satisfied with clauses preview, continue to project scope
      setContractFlowStep("project-scope");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `✅ Cláusulas legales confirmadas.\n\n📋 **ALCANCE DEL PROYECTO**\n\nRevisemos el alcance del proyecto: "${projectScope || selectedEstimate?.projectDescription || "No definido"}"\n\n¿Deseas editarlo? Responde **SÍ** o **NO**`,
          sender: "assistant",
        },
      ]);
    } else if (contractFlowStep === "project-scope") {
      if (input.includes("editar")) {
        // User wants to edit project scope after preview
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "📝 **EDITAR ALCANCE DEL PROYECTO**\n\nPuedes continuar editando la descripción:",
            sender: "assistant",
            action: "project-scope-form",
          },
        ]);
      } else if (
        input === "sí" ||
        input === "si" ||
        input === "yes" ||
        input === "s"
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "📝 **EDITAR ALCANCE DEL PROYECTO**\n\nEdita la descripción del proyecto:",
            sender: "assistant",
            action: "project-scope-form",
          },
        ]);
      } else {
        // Final review
        setContractFlowStep("final-review");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: generateContractSummary(),
            sender: "assistant",
          },
        ]);
      }
    } else if (contractFlowStep === "final-review") {
      if (input === "generar" || input === "generate" || input === "GENERATE") {
        // Ask about signature before generating
        setContractFlowStep("signature-question");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "📝 **FIRMA DEL CONTRATO**\n\n¿Te gustaría configurar la firma digital del contrato?\n\nEsto generará enlaces seguros para que tanto tú como el cliente puedan firmar el contrato digitalmente.\n\nResponde **SÍ** para configurar firmas o **NO** para solo generar el PDF.",
            sender: "assistant",
          },
        ]);
      }
    } else if (contractFlowStep === "signature-question") {
      if (
        input === "sí" ||
        input === "si" ||
        input === "yes" ||
        input === "s"
      ) {
        await handleStartSignatureProtocol();
      } else {
        await handleDownloadPDF();
      }
    }
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  // Permit Advisor flow handler
  const handlePermitFlow = async (userInput: string) => {
    const input = userInput.trim().toLowerCase();
    if (permitFlowStep === "awaiting-address-choice") {
      if (
        input === "manual address" ||
        input === "dirección manual" ||
        input === "1"
      ) {
        setPermitFlowStep("manual-address-entry");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: "Perfecto. Ahora ingresa los detalles de tu proyecto:",
            sender: "assistant",
            action: "permit-manual-entry",
          },
        ]);
      } else if (
        input === "existing projects" ||
        input === "proyectos existentes" ||
        input === "2"
      ) {
        setPermitFlowStep("existing-projects-list");
        // Show loading message
        const loadingMessageId = `loading-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: loadingMessageId,
            content: "🔄 Cargando proyectos existentes...",
            sender: "assistant",
            state: "analyzing",
          },
        ]);
        try {
          await loadPermitProjects();
          // Remove loading message and add project selection if projects were found
          setMessages((prev) => {
            const filteredMessages = prev.filter(
              (msg) => msg.id !== loadingMessageId,
            );
            // Only add project selection message if we have projects
            if (permitProjects.length > 0) {
              return [
                ...filteredMessages,
                {
                  id: `assistant-${Date.now()}`,
                  content: "Selecciona un proyecto existente:",
                  sender: "assistant",
                  action: "permit-existing-projects",
                },
              ];
            }
            return filteredMessages;
          });
        } catch (error) {
          // Remove loading message on error (error message is handled in loadPermitProjects)
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== loadingMessageId),
          );
        }
      }
    } else if (
      permitFlowStep === "project-selected" ||
      permitFlowStep === "manual-address-entry"
    ) {
      // Move to project description step
      setPermitFlowStep("awaiting-description");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "Proporciona una descripción detallada del proyecto y opcionalmente sube documentos relevantes:",
          sender: "assistant",
          action: "permit-description-upload",
        },
      ]);
    } else if (permitFlowStep === "awaiting-description") {
      // Check if user wants to proceed with current description or modify it
      if (
        input.includes("continuar") ||
        input.includes("continue") ||
        input.includes("análisis") ||
        input.includes("analysis") ||
        input.includes("proceder")
      ) {
        setPermitFlowStep("document-upload");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "✅ Usando la descripción actual del proyecto. ¿Deseas subir documentos adicionales o continuar con el análisis DeepSearch?",
            sender: "assistant",
            action: "permit-ready-analysis",
          },
        ]);
      } else {
        // User provided a new description
        setPermitProjectDescription(input);
        setPermitFlowStep("document-upload");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "✅ Nueva descripción guardada. ¿Deseas subir documentos adicionales o continuar con el análisis DeepSearch?",
            sender: "assistant",
            action: "permit-ready-analysis",
          },
        ]);
      }
    } else if (permitFlowStep === "document-upload") {
      // Handle document upload or proceed to analysis
      if (
        input.includes("continuar") ||
        input.includes("continue") ||
        input.includes("análisis") ||
        input.includes("analysis")
      ) {
        await runPermitDeepSearch();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Puedes subir documentos usando el botón de adjuntar archivos o escribir 'continuar' para proceder con el análisis.",
            sender: "assistant",
          },
        ]);
      }
    }
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  // Load permit projects from Firebase
  const loadPermitProjects = async () => {
    if (!currentUser?.uid) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view your projects",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );
      let allProjects: any[] = [];
      // Load from projects collection
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
            const address =
              data.clientInformation?.address ||
              data.clientAddress ||
              data.client?.address ||
              data.address ||
              data.projectAddress ||
              data.location ||
              data.workAddress ||
              data.propertyAddress ||
              "";
            const projectType =
              data.projectType || data.projectDetails?.type || "fence";
            const projectDescription =
              data.projectDetails?.description ||
              data.projectDescription ||
              data.description ||
              `${projectType} project for ${clientName}`;
            return {
              id: doc.id,
              clientName: clientName,
              address: address,
              projectType: projectType,
              projectDescription: projectDescription,
              status: data.status || "draft",
              createdAt: data.createdAt || { toDate: () => new Date() },
              totalPrice:
                data.projectTotalCosts?.totalSummary?.finalTotal ||
                data.projectTotalCosts?.total ||
                data.total ||
                data.estimateAmount ||
                0,
              clientEmail:
                data.clientInformation?.email || data.clientEmail || "",
              clientPhone:
                data.clientInformation?.phone || data.clientPhone || "",
            };
          });
        allProjects = [...allProjects, ...projectEstimates];
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
          const address =
            data.address ||
            data.clientAddress ||
            data.projectAddress ||
            data.location ||
            data.workAddress ||
            data.propertyAddress ||
            "";
          const projectType = data.projectType || "fence";
          const projectDescription =
            data.projectDescription ||
            `${projectType} project for ${clientName}`;
          return {
            id: doc.id,
            clientName: clientName,
            address: address,
            projectType: projectType,
            projectDescription: projectDescription,
            status: data.status || "draft",
            createdAt: data.createdAt || { toDate: () => new Date() },
            totalPrice: data.total || data.estimateAmount || 0,
            clientEmail: data.clientEmail || "",
            clientPhone: data.clientPhone || "",
          };
        });
        allProjects = [...allProjects, ...firebaseEstimates];
      } catch (estimatesError) {
        console.warn(
          "Could not load from estimates collection:",
          estimatesError,
        );
      }
      // Filter for valid projects
      const validProjects = allProjects.filter((project: any) => {
        const hasClientName =
          project.clientName &&
          project.clientName !== "Cliente sin nombre" &&
          project.clientName.trim().length > 0;
        const hasAddress = project.address && project.address.trim().length > 0;
        return hasClientName && hasAddress;
      });
      // Remove duplicates by ID
      const uniqueProjects = validProjects.filter(
        (project, index, self) =>
          index === self.findIndex((p) => p.id === project.id),
      );
      setPermitProjects(uniqueProjects);
      if (uniqueProjects.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "No se encontraron proyectos existentes. Por favor, usa la opción de dirección manual.",
            sender: "assistant",
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading permit projects:", error);
      toast({
        title: "Error Loading Projects",
        description: "Failed to load your existing projects",
        variant: "destructive",
      });
      // Show error message in chat
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "❌ Error al cargar proyectos existentes. Por favor, intenta nuevamente o usa la opción de dirección manual.",
          sender: "assistant",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  // Handle permit project selection
  const handlePermitProjectSelect = (project: PermitProject) => {
    setSelectedPermitProject(project);
    setPermitAddress(project.address);
    setPermitProjectType(project.projectType);
    setPermitProjectDescription(
      project.projectDescription ||
        `${project.projectType} project for ${project.clientName}`,
    );
    setPermitFlowStep("project-selected");
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        content: `✅ Proyecto seleccionado: ${project.projectType} para ${project.clientName} en ${project.address}`,
        sender: "assistant",
      },
    ]);
    // Automatically move to description step
    setTimeout(() => {
      setPermitFlowStep("awaiting-description");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `📝 **Proyecto seleccionado:** ${project.projectType} para ${project.clientName}\n\n**Dirección:** ${project.address}\n\n**Descripción actual:** ${project.projectDescription || `${project.projectType} project for ${project.clientName}`}\n\n¿Deseas modificar la descripción del proyecto o continuar con el análisis DeepSearch?`,
          sender: "assistant",
          action: "permit-description-upload",
        },
      ]);
    }, 1000);
  };
  // Run DeepSearch analysis for permits
  const runPermitDeepSearch = async () => {
    if (!permitAddress || !permitProjectType) {
      toast({
        title: "Información Incompleta",
        description: "Se requiere dirección y tipo de proyecto",
        variant: "destructive",
      });
      return;
    }
    setIsPermitAnalyzing(true);
    setPermitFlowStep("deepsearch-analysis");
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        content:
          "🔍 Ejecutando análisis DeepSearch de permisos... Esto puede tomar unos momentos.",
        sender: "assistant",
        state: "analyzing",
      },
    ]);
    try {
      const response = await fetch("/api/permit/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: permitAddress,
          projectType: permitProjectType,
          projectDescription:
            permitProjectDescription || `${permitProjectType} project`,
          coordinates: permitCoordinates,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPermitResults(data);
      setPermitFlowStep("results-display");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "✅ Análisis de permisos completado. Aquí están los resultados:",
          sender: "assistant",
          action: "permit-results",
        },
      ]);
      toast({
        title: "✅ Análisis Completado",
        description: "Los resultados del análisis de permisos están listos",
      });
    } catch (error) {
      console.error("Error in permit analysis:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "❌ Error al analizar los permisos. Por favor intenta nuevamente.",
          sender: "assistant",
        },
      ]);
      toast({
        title: "Error en Análisis",
        description: "No se pudo completar el análisis de permisos",
        variant: "destructive",
      });
    } finally {
      setIsPermitAnalyzing(false);
    }
  };
  // Export permit report
  const exportPermitReport = async () => {
    if (!permitResults || !profile) {
      toast({
        title: "Cannot Export PDF",
        description: "No permit data or company profile available",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      // Import the PDF generation utilities
      const { generatePDFReport, downloadPDFReport } = await import(
        "@/utils/permitReportGenerator"
      );
      // Prepare company information from profile
      const companyInfo = {
        company: profile.company || "",
        ownerName: profile.ownerName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        mobilePhone: profile.mobilePhone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        license: profile.license || "",
        website: profile.website || "",
        logo: profile.logo || "",
      };
      // Ensure permitResults has timestamp in meta
      const permitDataWithTimestamp = {
        ...permitResults,
        meta: {
          ...permitResults.meta,
          timestamp: permitResults.meta?.timestamp || new Date().toISOString(),
          projectType: permitProjectType,
          location: permitAddress,
          fullAddress: permitAddress,
        },
      };
      // Generate PDF using the utility functions
      const pdfBlob = await generatePDFReport(
        permitDataWithTimestamp,
        companyInfo,
      );
      // Download the PDF
      downloadPDFReport(pdfBlob, permitDataWithTimestamp);
      toast({
        title: "PDF Export Successful",
        description: "Permit analysis report has been downloaded",
        variant: "default",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      // Fallback to simple text export if PDF generation fails
      try {
        const reportContent = `
REPORTE DE ANÁLISIS DE PERMISOS
Dirección: ${permitAddress}
Tipo de Proyecto: ${permitProjectType}
Descripción: ${permitProjectDescription}
PERMISOS REQUERIDOS:
${
  permitResults.requiredPermits && Array.isArray(permitResults.requiredPermits)
    ? permitResults.requiredPermits
        .map((permit, index) => {
          if (typeof permit === "string") return `${index + 1}. ${permit}`;
          return `${index + 1}. ${permit.name || "Permiso"} - ${permit.issuingAuthority || "N/A"} (${permit.estimatedTimeline || "N/A"})`;
        })
        .join("\n")
    : "No hay información de permisos disponible"
}
CONSIDERACIONES ESPECIALES:
${
  permitResults.specialConsiderations
    ? Array.isArray(permitResults.specialConsiderations)
      ? permitResults.specialConsiderations.join("\n")
      : typeof permitResults.specialConsiderations === "object"
        ? Object.entries(permitResults.specialConsiderations)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
        : permitResults.specialConsiderations
    : "No hay consideraciones especiales"
}
PROCESO:
${
  permitResults.process && Array.isArray(permitResults.process)
    ? permitResults.process
        .map(
          (step, index) =>
            `${index + 1}. ${typeof step === "string" ? step : step.step || "Paso del proceso"}`,
        )
        .join("\n")
    : "No hay información del proceso disponible"
}
        `;
        // Create and download text file as fallback
        const blob = new Blob([reportContent], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `permit-analysis-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({
          title: "Text Report Downloaded",
          description:
            "PDF generation failed, but text report was downloaded successfully",
          variant: "default",
        });
      } catch (fallbackError) {
        console.error("Fallback export also failed:", fallbackError);
        toast({
          title: "Export Failed",
          description: "Could not export the permit report",
          variant: "destructive",
        });
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  // Helper functions for contract generation
  const generateAILegalClauses = async () => {
    setIsLoading(true);
    try {
      // Generate standard legal clauses for construction contracts
      const standardClauses: LegalClause[] = [
        {
          id: "1",
          title: "Términos de Pago",
          content:
            "El cliente pagará según el cronograma acordado. Los pagos vencidos generarán intereses del 1.5% mensual.",
          category: "payment",
          isRequired: true,
        },
        {
          id: "2",
          title: "Garantía de Trabajo",
          content: `${contractorInfo.company} garantiza el trabajo realizado por un período de ${warrantyPermits.warranty || "1 año"}.`,
          category: "warranty",
          isRequired: true,
        },
        {
          id: "3",
          title: "Responsabilidad y Seguros",
          content: `El contratista mantiene ${warrantyPermits.insurance || "seguro de responsabilidad general"} durante la duración del proyecto.`,
          category: "insurance",
          isRequired: true,
        },
        {
          id: "4",
          title: "Permisos y Regulaciones",
          content: `Todos los trabajos se realizarán cumpliendo con ${warrantyPermits.permits || "las regulaciones locales aplicables"}.`,
          category: "permits",
          isRequired: true,
        },
        {
          id: "5",
          title: "Modificaciones al Contrato",
          content:
            "Cualquier modificación a este contrato debe ser acordada por escrito y firmada por ambas partes.",
          category: "modifications",
          isRequired: true,
        },
      ];
      setLegalClauses(standardClauses);
      // Show editable form instead of going directly to project scope
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `✅ ${standardClauses.length} cláusulas legales estándar fueron generadas. Puedes editarlas a continuación:`,
          sender: "assistant",
          action: "legal-clauses-form",
        },
      ]);
      toast({
        title: "✅ Cláusulas Generadas",
        description: `Se generaron ${standardClauses.length} cláusulas legales estándar`,
      });
    } catch (error) {
      console.error("Error generating AI legal clauses:", error);
      toast({
        title: "Error",
        description: "No se pudieron generar las cláusulas legales",
        variant: "destructive",
      });
      setContractFlowStep("project-scope");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `Error generando cláusulas. Continuemos sin cláusulas adicionales.\n\n📋 **ALCANCE DEL PROYECTO**\n\nRevisemos el alcance del proyecto:\n\n"${projectScope}"\n\n¿Deseas editarlo? Responde **SÍ** o **NO**`,
          sender: "assistant",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  const generateContractSummary = () => {
    return `📋 **RESUMEN DEL CONTRATO**
👤 **Cliente:** ${selectedClient?.name}
📧 **Email:** ${selectedClient?.email}
📞 **Teléfono:** ${selectedClient?.phone}
📍 **Dirección:** ${selectedClient?.address}
🏢 **Contratista:** ${contractorInfo.company}
📄 **Licencia:** ${contractorInfo.license}
🛡️ **Seguro:** ${contractorInfo.insurance}
📅 **Cronograma:**
• Inicio: ${projectTimeline[0]?.value}
• Finalización: ${projectTimeline[1]?.value}
• Duración: ${projectTimeline[2]?.value} días
💰 **Valor del contrato:** $${selectedEstimate?.total?.toFixed(2)}
🎯 **Hitos del proyecto:** ${projectMilestones.length} hitos configurados
⚖️ **Cláusulas legales:** ${legalClauses.length} cláusulas incluidas
🛡️ **Garantía:** ${warrantyPermits.warranty}
📝 **Firma del Contrato:** Requerida
¿Todo se ve correcto? Escribe **GENERAR** para crear el contrato PDF.`;
  };
  const generateAndDownloadContract = async () => {
    setIsLoading(true);
    try {
      const contractData = {
        clientInfo: {
          name: selectedClient?.name,
          email: selectedClient?.email,
          phone: selectedClient?.phone,
          address: selectedClient?.address,
        },
        contractorInfo: contractorInfo,
        projectInfo: {
          description: projectScope,
          timeline: projectTimeline,
          milestones: projectMilestones,
          totalAmount: selectedEstimate?.total,
          items: selectedEstimate?.items || [],
        },
        legalInfo: {
          clauses: legalClauses,
          warranty: warrantyPermits.warranty,
          permits: warrantyPermits.permits,
          insurance: warrantyPermits.insurance,
        },
        metadata: {
          estimateNumber: selectedEstimate?.estimateNumber,
          contractNumber: `CON-${Date.now()}`,
          createdAt: new Date().toISOString(),
          source: "mervin-contract-generator",
        },
      };
      // For now, create a simple contract document
      const contractHtml = `
        <html>
          <head>
            <title>Contrato de Construcción</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .signature { margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>CONTRATO DE CONSTRUCCIÓN</h1>
              <p>Número: ${contractData.metadata.contractNumber}</p>
            </div>
            <div class="section">
              <h3>INFORMACIÓN DEL CONTRATISTA</h3>
              <p><strong>Empresa:</strong> ${contractorInfo.company}</p>
              <p><strong>Dirección:</strong> ${contractorInfo.address}</p>
              <p><strong>Teléfono:</strong> ${contractorInfo.phone}</p>
              <p><strong>Email:</strong> ${contractorInfo.email}</p>
              <p><strong>Licencia:</strong> ${contractorInfo.license}</p>
            </div>
            <div class="section">
              <h3>INFORMACIÓN DEL CLIENTE</h3>
              <p><strong>Nombre:</strong> ${selectedClient?.name}</p>
              <p><strong>Dirección:</strong> ${selectedClient?.address}</p>
              <p><strong>Teléfono:</strong> ${selectedClient?.phone}</p>
              <p><strong>Email:</strong> ${selectedClient?.email}</p>
            </div>
            <div class="section">
              <h3>ALCANCE DEL PROYECTO</h3>
              <p>${projectScope}</p>
            </div>
            <div class="section">
              <h3>VALOR DEL CONTRATO</h3>
              <p><strong>Total:</strong> $${selectedEstimate?.total?.toFixed(2)}</p>
            </div>
            <div class="section">
              <h3>CRONOGRAMA</h3>
              <p><strong>Fecha de inicio:</strong> ${projectTimeline[0]?.value}</p>
              <p><strong>Fecha de finalización:</strong> ${projectTimeline[1]?.value}</p>
              <p><strong>Duración:</strong> ${projectTimeline[2]?.value} días</p>
            </div>
            <div class="section">
              <h3>GARANTÍAS Y PERMISOS</h3>
              <p><strong>Garantía:</strong> ${warrantyPermits.warranty}</p>
              <p><strong>Permisos:</strong> ${warrantyPermits.permits}</p>
              <p><strong>Seguro:</strong> ${warrantyPermits.insurance}</p>
            </div>
            <div class="signature">
              <table width="100%">
                <tr>
                  <td width="45%">
                    <p>_________________________</p>
                    <p><strong>Contratista</strong></p>
                    <p>${contractorInfo.company}</p>
                  </td>
                  <td width="10%"></td>
                  <td width="45%">
                    <p>_________________________</p>
                    <p><strong>Cliente</strong></p>
                    <p>${selectedClient?.name}</p>
                  </td>
                </tr>
              </table>
            </div>
          </body>
        </html>
      `;
      // Create a simple PDF download (for now just show success)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "✅ ¡Contrato generado exitosamente!\n\n📄 **CONTRATO CREADO**\n\n• Número de contrato: " +
            contractData.metadata.contractNumber +
            "\n• Cliente: " +
            selectedClient?.name +
            "\n• Valor: $" +
            selectedEstimate?.total?.toFixed(2) +
            "\n• Empresa: " +
            contractorInfo.company +
            "\n\nEl contrato está listo para su uso.",
          sender: "assistant",
        },
      ]);
      toast({
        title: "✅ Contrato Generado",
        description: "El contrato se ha generado correctamente",
      });
      // Reset flow after 5 seconds
      setTimeout(() => {
        resetContractFlow();
      }, 5000);
    } catch (error) {
      console.error("Error generating contract:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el contrato. Intenta nuevamente.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "❌ Error generando el contrato. Por favor intenta nuevamente o contacta soporte técnico.",
          sender: "assistant",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  const resetContractFlow = () => {
    setContractFlowStep(null);
    setCaseType("");
    setSelectedEstimate(null);
    setSelectedClient(null);
    setProjectScope("");
    setLegalClauses([]);
    setMessages([
      {
        id: "welcome",
        content:
          "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. ¿En qué puedo ayudarte hoy?",
        sender: "assistant",
        action: "menu",
      },
    ]);
  };
  // Load estimates for contract generation
  const loadEstimates = async () => {
    if (!currentUser) return [];
    try {
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );
      const estimatesRef = collection(db, "estimates");
      const q = query(
        estimatesRef,
        where("firebaseUserId", "==", currentUser.uid),
      );
      const querySnapshot = await getDocs(q);
      const estimatesData: EstimateData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        estimatesData.push({
          id: doc.id,
          ...data,
        } as EstimateData);
      });
      estimatesData.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setEstimates(estimatesData);
      return estimatesData;
    } catch (error) {
      console.error("Error loading estimates:", error);
      return [];
    }
  };
  // Manejar tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  console.log(currentUser);
  console.log("clienters");
  console.log(selectedClient);
  console.log(selectedClient);
  console.log(selectedClient);
  return (
    <div className="flex flex-col h-full  bg-black text-white ">
      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-cyan-900/50 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-cyan-400">
              Editar Recomendaciones de DeepSearch AI
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Materials Section */}
            {(deepSearchOption === "materials-only" ||
              deepSearchOption === "materials-labor") && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Wrench className="w-5 h-5 text-blue-400" />
                  <span>Materiales</span>
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {editingMaterials.map((material, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={material.name}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].name = e.target.value;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            value={material.quantity}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].quantity =
                                parseFloat(e.target.value) || 0;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Unidad
                          </label>
                          <input
                            type="text"
                            value={material.unit}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].unit = e.target.value;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Precio Estimado
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={material.estimatedPrice}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].estimatedPrice =
                                parseFloat(e.target.value) || 0;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Descripción
                        </label>
                        <textarea
                          value={material.description}
                          onChange={(e) => {
                            const updated = [...editingMaterials];
                            updated[index].description = e.target.value;
                            setEditingMaterials(updated);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const updated = editingMaterials.filter(
                              (_, i) => i !== index,
                            );
                            setEditingMaterials(updated);
                          }}
                          className="bg-red-900/30 hover:bg-red-800/50 text-red-400 px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingMaterials([
                        ...editingMaterials,
                        {
                          name: "",
                          description: "",
                          quantity: 1,
                          unit: "",
                          estimatedPrice: 0,
                          category: "",
                          reason: "",
                        },
                      ]);
                    }}
                    className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 px-4 py-2 rounded flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Material</span>
                  </button>
                </div>
              </div>
            )}
            {/* Labor Costs Section */}
            {(deepSearchOption === "labor-only" ||
              deepSearchOption === "materials-labor") && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span>Mano de Obra</span>
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {editingLaborCosts.map((labor, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Tarea
                          </label>
                          <input
                            type="text"
                            value={labor.task}
                            onChange={(e) => {
                              const updated = [...editingLaborCosts];
                              updated[index].task = e.target.value;
                              setEditingLaborCosts(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Horas Estimadas
                          </label>
                          <input
                            type="number"
                            value={labor.estimatedHours}
                            onChange={(e) => {
                              const updated = [...editingLaborCosts];
                              updated[index].estimatedHours =
                                parseFloat(e.target.value) || 0;
                              updated[index].totalCost =
                                updated[index].estimatedHours *
                                updated[index].hourlyRate;
                              setEditingLaborCosts(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Tarifa por Hora
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={labor.hourlyRate}
                            onChange={(e) => {
                              const updated = [...editingLaborCosts];
                              updated[index].hourlyRate =
                                parseFloat(e.target.value) || 0;
                              updated[index].totalCost =
                                updated[index].estimatedHours *
                                updated[index].hourlyRate;
                              setEditingLaborCosts(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Costo Total
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={labor.totalCost}
                            readOnly
                            className="w-full bg-gray-600 text-gray-300 px-3 py-2 rounded border border-gray-600 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Descripción
                        </label>
                        <textarea
                          value={labor.description}
                          onChange={(e) => {
                            const updated = [...editingLaborCosts];
                            updated[index].description = e.target.value;
                            setEditingLaborCosts(updated);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const updated = editingLaborCosts.filter(
                              (_, i) => i !== index,
                            );
                            setEditingLaborCosts(updated);
                          }}
                          className="bg-red-900/30 hover:bg-red-800/50 text-red-400 px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingLaborCosts([
                        ...editingLaborCosts,
                        {
                          task: "",
                          description: "",
                          estimatedHours: 0,
                          hourlyRate: 0,
                          totalCost: 0,
                          category: "",
                        },
                      ]);
                    }}
                    className="bg-green-900/30 hover:bg-green-800/50 text-green-400 px-4 py-2 rounded flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Tarea</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t border-gray-700 pt-4 mt-4">
            <Button
              onClick={() => setShowEditModal(false)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                // Update the recommendation with edited values
                if (deepSearchRecommendation) {
                  const updatedRecommendation: DeepSearchRecommendation = {
                    ...deepSearchRecommendation,
                    materials: editingMaterials,
                    laborCosts: editingLaborCosts,
                    totalMaterialCost: editingMaterials.reduce(
                      (sum, m) => sum + m.estimatedPrice * m.quantity,
                      0,
                    ),
                    totalLaborCost: editingLaborCosts.reduce(
                      (sum, l) => sum + l.totalCost,
                      0,
                    ),
                    totalProjectCost:
                      editingMaterials.reduce(
                        (sum, m) => sum + m.estimatedPrice * m.quantity,
                        0,
                      ) +
                      editingLaborCosts.reduce(
                        (sum, l) => sum + l.totalCost,
                        0,
                      ),
                  };
                  setDeepSearchRecommendation(updatedRecommendation);
                  // Update the last message with new results
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMessageIndex = updated.length - 1;
                    if (
                      updated[lastMessageIndex].action === "deepsearch-results"
                    ) {
                      updated[lastMessageIndex].content =
                        generateDeepSearchResultsMessage(
                          updatedRecommendation,
                          deepSearchOption!,
                        );
                    }
                    return updated;
                  });
                }
                setShowEditModal(false);
                toast({
                  title: "Cambios guardados",
                  description:
                    "Las recomendaciones han sido actualizadas exitosamente.",
                });
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Contenedor de mensajes (scrollable) */}
      <div className="flex-1  pb-24">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-lg p-3 ${
                message.sender === "assistant"
                  ? "bg-gray-900 text-white mr-auto"
                  : "bg-blue-900 text-white ml-auto"
              }`}
            >
              {/* Avatar y nombre para mensajes de Mervin */}
              {message.sender === "assistant" && (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-2">
                      <img
                        src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
                        alt="Mervin AI"
                        className="w-6 h-6"
                      />
                    </div>
                    <span className="text-cyan-400 font-semibold">Mervin AI</span>
                    {/* Estado de análisis */}
                    {message.state === "analyzing" && (
                      <div className="ml-2 text-xs text-blue-400 flex items-center">
                        <span>Analizando datos...</span>
                      </div>
                    )}
                  </div>
                  {/* AI Model Selector (ChatGPT-style) with Permission Control */}
                  <div className="relative">
                    <button
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md border border-gray-600 transition-colors"
                    >
                      <span className="capitalize">
                        {selectedModel === "legacy" ? "Legacy" : "Agent mode"}
                      </span>
                      {userPlan && userPlan.name === "Free Trial" && selectedModel === "agent" && (
                        <span className="text-xs text-yellow-400 ml-1">⚡</span>
                      )}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {/* Dropdown Menu with Permission-based Options */}
                    {showModelSelector && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50">
                        <button
                          onClick={() => {
                            // Check if user has access to Agent mode
                            if (userPlan && userPlan.name === "Free Trial") {
                              // Free trial - show upgrade prompt
                              showUpgradeModal("agent-mode", "Agent mode requiere plan Primo Chambeador o superior");
                              setShowModelSelector(false);
                              return;
                            }
                            setSelectedModel("agent");
                            setShowModelSelector(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700 ${
                            selectedModel === "agent"
                              ? "text-cyan-400 bg-gray-700"
                              : "text-gray-300"
                          } ${userPlan && userPlan.name === "Free Trial" ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Agent mode</span>
                            {userPlan && userPlan.name === "Free Trial" && (
                              <span className="text-yellow-400 text-xs">🔒</span>
                            )}
                          </div>
                          {userPlan && userPlan.name === "Free Trial" && (
                            <div className="text-xs text-gray-500 mt-1">Requiere upgrade</div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel("legacy");
                            setShowModelSelector(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700 ${
                            selectedModel === "legacy"
                              ? "text-cyan-400 bg-gray-700"
                              : "text-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Legacy</span>
                            <span className="text-green-400 text-xs">✓</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Disponible para todos</div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Nombre para mensajes del usuario */}
              {message.sender === "user" && (
                <div className="text-right mb-1">
                  <span className="text-blue-400 font-semibold">You</span>
                </div>
              )}
              {message.clients && message.clients.length > 0 && (
                <div className="mt-2 space-y-3">
                  {/* 🔍 Search bar */}
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={materialSearchTerm} // you can rename this to clientSearchTerm if needed
                    onChange={(e) => {
                      setMaterialSearchTerm(e.target.value); // reuse this state or separate one
                      setVisibleCount(6);
                    }}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-cyan-900/50"
                  />
                  <div
                    className="max-h-42 p-6 overflow-y-auto grid grid-cols-2 gap-2 pr-2"
                    onScroll={(e) => {
                      const { scrollTop, scrollHeight, clientHeight } =
                        e.currentTarget;
                      if (scrollTop + clientHeight >= scrollHeight - 10) {
                        setVisibleCount((prev) => prev + 6);
                      }
                    }}
                  >
                    {message.clients
                      .filter((client) =>
                        client.name
                          .toLowerCase()
                          .includes(materialSearchTerm.toLowerCase()),
                      )
                      .slice(0, visibleCount)
                      .map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="bg-cyan-800 hover:bg-cyan-700 text-white px-3 py-2 rounded text-sm text-left"
                        >
                          <div className="font-semibold">{client.name}</div>
                          <div className="text-xs opacity-80">
                            {client.email || "Sin email"}
                          </div>
                        </button>
                      ))}
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleClientSelect(null)}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm text-center col-span-2"
                    >
                      ➕ Nuevo Cliente
                    </button>
                  </div>
                </div>
              )}
              {/* Estimates selection for contracts (NEW) */}
              {message.estimates && message.estimates.length > 0 && (
                <div className="mt-2 space-y-3">
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {message.estimates.map((estimate, index) => (
                      <div
                        key={estimate.id}
                        className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 hover:border-cyan-600 transition-all duration-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-cyan-400 font-bold text-lg">
                                {index + 1}.
                              </span>
                              <span className="font-semibold text-white">
                                {estimate.estimateNumber}
                              </span>
                              <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                                {estimate.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-300 mb-1">
                              👤 {estimate.clientName}
                            </div>
                            <div className="text-sm text-gray-400 mb-2">
                              {estimate.projectDescription?.substring(0, 100)}
                              ...
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span>💰 ${estimate.total?.toFixed(2)}</span>
                              <span>
                                📅{" "}
                                {new Date(
                                  estimate.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const userMessage = {
                              content: (index + 1).toString(),
                            };
                            handleContractFlow(userMessage.content);
                          }}
                          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded transition-colors"
                        >
                          Seleccionar para Contrato
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {message.materialList && message.materialList.length > 0 && (
                <div className="mt-2 space-y-3">
                  {/* Shopping Cart Header */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-cyan-400 font-semibold">
                        Catálogo de Materiales
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowCart(!showCart)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Carrito ({getCartItemCount()})
                    </button>
                  </div>
                  {/* Search bar for materials */}
                  <input
                    type="text"
                    placeholder="🔍 Buscar materiales..."
                    value={materialSearchTerm}
                    onChange={(e) => {
                      setMaterialSearchTerm(e.target.value);
                      setVisibleCount(6);
                    }}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-cyan-900/50 focus:border-cyan-600 focus:outline-none"
                  />
                  <div className="flex gap-4">
                    {/* Product Catalog */}
                    <div
                      className={`${showCart ? "w-2/3" : "w-full"} transition-all duration-300`}
                    >
                      <div
                        className="max-h-96 overflow-y-auto grid grid-cols-1 gap-3 pr-2"
                        onScroll={(e) => {
                          const { scrollTop, scrollHeight, clientHeight } =
                            e.currentTarget;
                          if (scrollTop + clientHeight >= scrollHeight - 10) {
                            setVisibleCount((prev) => prev + 6);
                          }
                        }}
                      >
                        {message.materialList
                          .filter((material) =>
                            material.name
                              .toLowerCase()
                              .includes(materialSearchTerm.toLowerCase()),
                          )
                          .slice(0, visibleCount)
                          .map((material) => (
                            <div
                              key={material.id}
                              className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 hover:border-cyan-600 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-white text-lg mb-1">
                                    {material.name}
                                  </div>
                                  <div className="text-sm text-gray-300 mb-2">
                                    {material.description}
                                  </div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-cyan-400 font-bold text-lg">
                                      ${material.price}
                                    </span>
                                    <span className="text-gray-400 text-sm">
                                      por {material.unit}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    defaultValue={1}
                                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                    id={`qty-${material.id}`}
                                  />
                                  <button
                                    onClick={() => {
                                      const qtyInput = document.getElementById(
                                        `qty-${material.id}`,
                                      ) as HTMLInputElement;
                                      const qty = parseInt(
                                        qtyInput?.value || "1",
                                      );
                                      if (!isNaN(qty) && qty > 0) {
                                        addToCart(material, qty);
                                        qtyInput.value = "1";
                                        toast({
                                          title: "Material añadido",
                                          description: `${qty} ${material.unit} de ${material.name} añadido al carrito.`,
                                        });
                                      }
                                    }}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded transition-colors flex items-center gap-1"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Añadir
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    {/* Shopping Cart Sidebar */}
                    {showCart && (
                      <div className="w-1/3 bg-gray-800 rounded-lg p-4 border border-cyan-900/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Carrito de Compras
                          </h3>
                          <button
                            onClick={() => setShowCart(false)}
                            className="text-gray-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                          {shoppingCart.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Tu carrito está vacío</p>
                            </div>
                          ) : (
                            shoppingCart.map((item) => (
                              <div
                                key={item.material.id}
                                className="bg-gray-700 p-3 rounded-lg"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white text-sm">
                                      {item.material.name}
                                    </div>
                                    <div className="text-xs text-gray-300">
                                      ${item.material.price} /{" "}
                                      {item.material.unit}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      removeFromCart(item.material.id)
                                    }
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        updateCartQuantity(
                                          item.material.id,
                                          item.quantity - 1,
                                        )
                                      }
                                      className="w-6 h-6 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center justify-center"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center text-white font-semibold">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateCartQuantity(
                                          item.material.id,
                                          item.quantity + 1,
                                        )
                                      }
                                      className="w-6 h-6 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center justify-center"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="text-cyan-400 font-bold">
                                    $
                                    {(
                                      item.material.price * item.quantity
                                    ).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {shoppingCart.length > 0 && (
                          <div className="border-t border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-white font-semibold">
                                Total:
                              </span>
                              <span className="text-cyan-400 font-bold text-lg">
                                ${getCartTotal().toFixed(2)}
                              </span>
                            </div>
                            <button
                              onClick={addCartToInventory}
                              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg font-semibold transition-colors"
                            >
                              Añadir al Inventario
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Add new material */}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => {
                        setChatFlowStep("awaiting-new-material");
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `assistant-${Date.now()}`,
                            content:
                              "Por favor ingresa los detalles del nuevo material en el siguiente formato:\n\nNombre, Descripción, Precio, Unidad, Categoría",
                            sender: "assistant",
                          },
                        ]);
                      }}
                      className="text-cyan-300 hover:text-cyan-200 underline flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar nuevo material
                    </button>
                  </div>
                </div>
              )}
              {/* Contenido del mensaje */}
              <div className="whitespace-pre-wrap">{message.content}</div>
              {/* Botones de acción - solo en el mensaje inicial o cuando se solicita menú */}
              {message.action === "menu" && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {actionButtons.map((button) => (
                    <button
                      key={button.id}
                      onClick={() => handleAction(button.action)}
                      className="bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 rounded p-2 text-sm font-medium transition-colors duration-200 flex flex-col items-center justify-center"
                    >
                      <div className="mb-1 flex items-center justify-center w-6 h-6">
                        {button.icon}
                      </div>
                      {button.text}
                    </button>
                  ))}
                </div>
              )}
              {/* DeepSearch AI Options */}
              {message.action === "deepsearch-options" && (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <button
                    onClick={() =>
                      handleDeepSearchOptionSelect("materials-labor")
                    }
                    className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 hover:from-purple-800/50 hover:to-blue-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-5 h-5 text-purple-400" />
                    <Wrench className="w-5 h-5 text-blue-400" />
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span>Materiales + Costo de Mano de Obra</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDeepSearchOptionSelect("materials-only")
                    }
                    className="bg-gradient-to-r from-green-900/30 to-teal-900/30 hover:from-green-800/50 hover:to-teal-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-5 h-5 text-green-400" />
                    <Wrench className="w-5 h-5 text-teal-400" />
                    <span>Solo Materiales</span>
                  </button>
                  <button
                    onClick={() => handleDeepSearchOptionSelect("labor-only")}
                    className="bg-gradient-to-r from-orange-900/30 to-red-900/30 hover:from-orange-800/50 hover:to-red-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-5 h-5 text-orange-400" />
                    <DollarSign className="w-5 h-5 text-red-400" />
                    <span>Solo Mano de Obra</span>
                  </button>
                  <button
                    onClick={async () => {
                      setChatFlowStep("select-inventory");
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `assistant-${Date.now()}`,
                          content:
                            "✅ Recomendaciones aplicadas al inventario. Puedes continuar con el descuento.",
                          sender: "assistant",
                        },
                      ]);
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }, 100);
                      await loadMaterials().then((updatedMaterials) => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `assistant-${Date.now()}`,
                            content: "Ahora selecciona materiales manualmente:",
                            sender: "assistant",
                            materialList: updatedMaterials,
                          },
                        ]);
                      });
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }, 100);
                    }}
                    className="bg-gradient-to-r from-orange-900/30 to-red-900/30 hover:from-orange-800/50 hover:to-red-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <span>Saltar</span>
                  </button>
                </div>
              )}
              {/* DeepSearch Results with Edit Options */}
              {message.action === "deepsearch-results" &&
                deepSearchRecommendation && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editar Selección</span>
                      </button>
                      <button
                        onClick={() => {
                          // Continue with current selection
                          if (deepSearchOption === "labor-only") {
                            // Go to manual material selection
                            setChatFlowStep("select-inventory");
                            loadMaterials().then((updatedMaterials) => {
                              setMessages((prev) => [
                                ...prev,
                                {
                                  id: `assistant-${Date.now()}`,
                                  content:
                                    "Ahora selecciona materiales manualmente:",
                                  sender: "assistant",
                                  materialList: updatedMaterials,
                                },
                              ]);
                            });
                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }, 100);
                          } else {
                            // Convert AI recommendations to inventory items
                            const convertedItems =
                              deepSearchRecommendation.materials.map(
                                (material) => ({
                                  material: {
                                    id: `ai-${material.name.toLowerCase().replace(/\s+/g, "-")}`,
                                    name: material.name,
                                    description: material.description,
                                    price: material.estimatedPrice,
                                    unit: material.unit,
                                    category: material.category,
                                  },
                                  quantity: material.quantity,
                                }),
                              );
                            setInventoryItems(convertedItems);
                            setChatFlowStep("select-inventory");
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: `assistant-${Date.now()}`,
                                content:
                                  "✅ Recomendaciones aplicadas al inventario. Puedes continuar con el descuento.",
                                sender: "assistant",
                              },
                            ]);
                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }, 100);
                          }
                        }}
                        className="bg-green-900/30 hover:bg-green-800/50 text-green-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Continuar con Selección</span>
                      </button>
                    </div>
                  </div>
                )}
              {/* Contract Forms (NEW) */}
              {message.action === "client-edit-form" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={editingClient.name}
                        onChange={(e) =>
                          setEditingClient((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editingClient.email}
                        onChange={(e) =>
                          setEditingClient((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={editingClient.phone}
                        onChange={(e) =>
                          setEditingClient((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={editingClient.address}
                        onChange={(e) =>
                          setEditingClient((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClient((prev) => ({
                          ...prev!,
                          name: editingClient.name,
                          email: editingClient.email,
                          phone: editingClient.phone,
                          address: editingClient.address,
                        }));
                        setContractFlowStep("project-timeline");
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `assistant-${Date.now()}`,
                            content: `✅ Información del cliente actualizada.\n\n📅 **CRONOGRAMA DEL PROYECTO**\n\nAhora necesito información sobre el cronograma del proyecto:`,
                            sender: "assistant",
                            action: "project-timeline",
                          },
                        ]);
                      }}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded transition-colors"
                    >
                      Guardar y Continuar
                    </button>
                  </div>
                </div>
              )}
              {message.action === "project-timeline" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-3">
                    {projectTimeline.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          {field.label}{" "}
                          {field.required && (
                            <span className="text-red-400">*</span>
                          )}
                        </label>
                        {field.id === "start" || field.id === "completion" ? (
                          <DatePicker
                            date={
                              projectDates[
                                field.id as keyof typeof projectDates
                              ]
                            }
                            onDateChange={(date) => {
                              setProjectDates((prev) => ({
                                ...prev,
                                [field.id]: date,
                              }));
                              // Also update the string value for compatibility
                              const updatedTimeline = projectTimeline.map(
                                (t) =>
                                  t.id === field.id
                                    ? {
                                        ...t,
                                        value: date
                                          ? date.toISOString().split("T")[0]
                                          : "",
                                      }
                                    : t,
                              );
                              setProjectTimeline(updatedTimeline);
                            }}
                            placeholder={
                              field.id === "start"
                                ? "Seleccionar fecha de inicio"
                                : "Seleccionar fecha de finalización"
                            }
                          />
                        ) : (
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => {
                              const updatedTimeline = projectTimeline.map(
                                (t) =>
                                  t.id === field.id
                                    ? { ...t, value: e.target.value }
                                    : t,
                              );
                              setProjectTimeline(updatedTimeline);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                            placeholder={
                              field.id === "duration"
                                ? "ej: 10"
                                : field.id === "workingHours"
                                  ? "ej: 8:00 AM - 5:00 PM"
                                  : ""
                            }
                          />
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        handleContractFlow("timeline-saved");
                      }}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded transition-colors"
                    >
                      Guardar Cronograma
                    </button>
                  </div>
                </div>
              )}
              {message.action === "contractor-form" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nombre de la Empresa *
                      </label>
                      <input
                        type="text"
                        value={contractorInfo.company}
                        onChange={(e) =>
                          setContractorInfo((prev) => ({
                            ...prev,
                            company: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        placeholder="ej: Tu Empresa LLC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Número de Licencia
                      </label>
                      <input
                        type="text"
                        value={contractorInfo.license}
                        onChange={(e) =>
                          setContractorInfo((prev) => ({
                            ...prev,
                            license: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        placeholder="ej: CA-123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        URL de Licencia
                      </label>
                      <input
                        type="url"
                        value={contractorInfo.licenseUrl}
                        onChange={(e) =>
                          setContractorInfo((prev) => ({
                            ...prev,
                            licenseUrl: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        placeholder="ej: https://ejemplo.com/licencia"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Seguro de Responsabilidad
                      </label>
                      <input
                        type="text"
                        value={contractorInfo.insurance}
                        onChange={(e) =>
                          setContractorInfo((prev) => ({
                            ...prev,
                            insurance: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        placeholder="ej: Póliza #12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Dirección de la Empresa
                      </label>
                      <input
                        type="text"
                        value={contractorInfo.address}
                        onChange={(e) =>
                          setContractorInfo((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        placeholder="ej: 123 Main St, Ciudad, Estado 12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={contractorInfo.phone}
                        onChange={(e) =>
                          setContractorInfo((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        placeholder="ej: (555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contractorInfo.email}
                        onChange={(e) =>
                          setContractorInfo((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        placeholder="ej: info@tuempresa.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Logo de la Empresa *
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {logoPreview ? (
                                <img
                                  src={logoPreview}
                                  alt="Logo preview"
                                  className="h-16 w-auto rounded border border-gray-500 mb-2"
                                />
                              ) : (
                                <>
                                  <svg
                                    className="w-8 h-8 mb-4 text-gray-400"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 20 16"
                                  >
                                    <path
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                                    />
                                  </svg>
                                  <p className="mb-2 text-sm text-gray-400">
                                    <span className="font-semibold">
                                      Click para subir
                                    </span>{" "}
                                    o arrastra y suelta
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    PNG, JPG, GIF (MAX. 5MB)
                                  </p>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </div>
                        {logoPreview && (
                          <div className="flex items-center justify-between bg-gray-600 p-2 rounded">
                            <span className="text-sm text-gray-300">
                              {logoFile?.name || "Logo cargado"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoFile(null);
                                setLogoPreview("");
                                setContractorInfo((prev) => ({
                                  ...prev,
                                  logo: "",
                                }));
                              }}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!contractorInfo.company.trim()) {
                          toast({
                            title: "Error",
                            description:
                              "El nombre de la empresa es obligatorio",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (!logoPreview) {
                          toast({
                            title: "Error",
                            description: "El logo de la empresa es obligatorio",
                            variant: "destructive",
                          });
                          return;
                        }
                        try {
                          // Save contractor information to profile
                          await updateProfile({
                            company: contractorInfo.company,
                            license: contractorInfo.license,
                            phone: contractorInfo.phone,
                            email: contractorInfo.email,
                            address: contractorInfo.address,
                            logo: logoPreview, // Use the base64 data from file upload
                            insurancePolicy: contractorInfo.insurance,
                            // Add licenseUrl to documents or create a new field
                            documents: {
                              ...profile?.documents,
                              licenseUrl: contractorInfo.licenseUrl,
                            },
                          });
                          toast({
                            title: "Éxito",
                            description:
                              "Información del contratista guardada en el perfil",
                          });
                          setContractFlowStep("project-milestones");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content:
                                "✅ Información del contratista guardada en el perfil.\n\n🎯 **HITOS DEL PROYECTO**\n\nConfigura los hitos del proyecto:",
                              sender: "assistant",
                              action: "project-milestones",
                            },
                          ]);
                        } catch (error) {
                          console.error("Error saving contractor info:", error);
                          toast({
                            title: "Error",
                            description:
                              "No se pudo guardar la información del contratista",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded transition-colors"
                    >
                      Guardar y Continuar
                    </button>
                  </div>
                </div>
              )}
              {message.action === "project-milestones" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-3">
                    {projectMilestones.map((milestone, index) => (
                      <div
                        key={milestone.id}
                        className="bg-gray-700 p-3 rounded"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">
                              Título
                            </label>
                            <input
                              value={milestone.title}
                              onChange={(e) => {
                                const updated = projectMilestones.map((m) =>
                                  m.id === milestone.id
                                    ? { ...m, title: e.target.value }
                                    : m,
                                );
                                setProjectMilestones(updated);
                              }}
                              className="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">
                              Porcentaje
                            </label>
                            <input
                              type="number"
                              value={milestone.percentage}
                              onChange={(e) => {
                                const updated = projectMilestones.map((m) =>
                                  m.id === milestone.id
                                    ? {
                                        ...m,
                                        percentage: parseInt(e.target.value),
                                      }
                                    : m,
                                );
                                setProjectMilestones(updated);
                              }}
                              className="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs text-gray-300 mb-1">
                            Descripción
                          </label>
                          <textarea
                            value={milestone.description}
                            onChange={(e) => {
                              const updated = projectMilestones.map((m) =>
                                m.id === milestone.id
                                  ? { ...m, description: e.target.value }
                                  : m,
                              );
                              setProjectMilestones(updated);
                            }}
                            className="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm"
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-300">
                              Días estimados:
                            </label>
                            <input
                              type="number"
                              value={milestone.estimatedDays}
                              onChange={(e) => {
                                const updated = projectMilestones.map((m) =>
                                  m.id === milestone.id
                                    ? {
                                        ...m,
                                        estimatedDays: parseInt(e.target.value),
                                      }
                                    : m,
                                );
                                setProjectMilestones(updated);
                              }}
                              className="w-16 bg-gray-600 text-white px-2 py-1 rounded text-sm"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const updated = projectMilestones.filter(
                                (m) => m.id !== milestone.id,
                              );
                              setProjectMilestones(updated);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newMilestone: ProjectMilestone = {
                            id: Date.now().toString(),
                            title: "",
                            description: "",
                            percentage: 0,
                            estimatedDays: 1,
                          };
                          setProjectMilestones((prev) => [
                            ...prev,
                            newMilestone,
                          ]);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar Hito
                      </button>
                      <button
                        onClick={() => {
                          handleContractFlow("milestones-saved");
                          // Scroll to bottom
                          setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({
                              behavior: "smooth",
                            });
                          }, 100);
                        }}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded transition-colors"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {message.action === "warranty-permits-form" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        🛡️ Garantía Ofrecida
                      </label>
                      <textarea
                        value={warrantyPermits.warranty}
                        onChange={(e) =>
                          setWarrantyPermits((prev) => ({
                            ...prev,
                            warranty: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        rows={2}
                        placeholder="ej: Garantía de 1 año en materiales y mano de obra"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        📋 Permisos Requeridos
                      </label>
                      <textarea
                        value={warrantyPermits.permits}
                        onChange={(e) =>
                          setWarrantyPermits((prev) => ({
                            ...prev,
                            permits: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        rows={2}
                        placeholder="ej: Permiso de construcción municipal, permiso de cercado"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        🏥 Seguro de Responsabilidad
                      </label>
                      <textarea
                        value={warrantyPermits.insurance}
                        onChange={(e) =>
                          setWarrantyPermits((prev) => ({
                            ...prev,
                            insurance: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                        rows={2}
                        placeholder="ej: Seguro de responsabilidad general por $1,000,000"
                      />
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-cyan-400 mb-2">
                        💡 Sugerencias Comunes:
                      </h4>
                      <div className="grid grid-cols-1 gap-2 text-xs text-gray-300">
                        <div>
                          <strong>Garantías:</strong> 1 año materiales, 2 años
                          mano de obra, garantía de satisfacción
                        </div>
                        <div>
                          <strong>Permisos:</strong> Permiso municipal, permiso
                          de cercado, inspección final
                        </div>
                        <div>
                          <strong>Seguros:</strong> Responsabilidad general,
                          seguro de trabajadores, bonos de garantía
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Use default values
                          setWarrantyPermits({
                            warranty:
                              "Garantía de 1 año en materiales y mano de obra",
                            permits:
                              "Permisos según regulaciones locales aplicables",
                            insurance:
                              "Seguro de responsabilidad general vigente",
                          });
                          setContractFlowStep("legal-clauses");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content:
                                "✅ Valores estándar aplicados para garantías y permisos.\n\n⚖️ **CLÁUSULAS LEGALES**\n\n¿Deseas agregar cláusulas legales?\n\n• **AI** - Generar con inteligencia artificial\n• **MANUAL** - Agregar manualmente\n• **OMITIR** - Continuar sin cláusulas",
                              sender: "assistant",
                            },
                          ]);
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition-colors"
                      >
                        Usar Valores Estándar
                      </button>
                      <button
                        onClick={() => {
                          setContractFlowStep("legal-clauses");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content:
                                "✅ Información de garantías y permisos guardada.\n\n⚖️ **CLÁUSULAS LEGALES**\n\n¿Deseas agregar cláusulas legales?\n\n• **AI** - Generar con inteligencia artificial\n• **MANUAL** - Agregar manualmente\n• **OMITIR** - Continuar sin cláusulas",
                              sender: "assistant",
                            },
                          ]);
                        }}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded transition-colors"
                      >
                        Guardar y Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Legal Clauses Form - Editable AI Generated Clauses */}
              {message.action === "legal-clauses-form" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="text-sm text-gray-300 mb-4">
                      ✅ {legalClauses.length} cláusulas legales generadas.
                      Puedes editarlas a continuación:
                    </div>
                    {legalClauses.map((clause, index) => (
                      <div
                        key={clause.id}
                        className="bg-gray-700 p-4 rounded-lg"
                      >
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            {clause.title}{" "}
                            {clause.isRequired && (
                              <span className="text-red-400">*</span>
                            )}
                          </label>
                          <div className="text-xs text-gray-400 mb-2">
                            Categoría: {clause.category}
                          </div>
                        </div>
                        <textarea
                          value={clause.content}
                          onChange={(e) => {
                            const updatedClauses = legalClauses.map((c) =>
                              c.id === clause.id
                                ? { ...c, content: e.target.value }
                                : c,
                            );
                            setLegalClauses(updatedClauses);
                          }}
                          className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 min-h-[100px] resize-y"
                          placeholder="Contenido de la cláusula..."
                        />
                        {!clause.isRequired && (
                          <button
                            onClick={() => {
                              const updatedClauses = legalClauses.filter(
                                (c) => c.id !== clause.id,
                              );
                              setLegalClauses(updatedClauses);
                            }}
                            className="mt-2 text-red-400 hover:text-red-300 text-sm"
                          >
                            Eliminar cláusula
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newClause: LegalClause = {
                            id: `custom-${Date.now()}`,
                            title: "Cláusula Personalizada",
                            content: "",
                            category: "custom",
                            isRequired: false,
                          };
                          setLegalClauses([...legalClauses, newClause]);
                        }}
                        className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                      >
                        + Agregar Cláusula
                      </button>
                      <button
                        onClick={() => {
                          // Show preview with better formatting
                          const previewContent = legalClauses
                            .map(
                              (clause, index) =>
                                `**${index + 1}. ${clause.title}** *(${clause.category})*\n${clause.content}`,
                            )
                            .join("\n\n---\n\n");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content: `📋 **VISTA PREVIA DE CLÁUSULAS LEGALES**\n\n${previewContent}\n\n---\n\n✅ **Total: ${legalClauses.length} cláusulas legales**\n\n¿Estás satisfecho con estas cláusulas? Responde **SÍ** para continuar o **EDITAR** para modificarlas.`,
                              sender: "assistant",
                              action: "legal-clauses-preview",
                            },
                          ]);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        👁️ Vista Previa
                      </button>
                      <button
                        onClick={() => {
                          // Initialize project scope with estimate description if empty
                          if (
                            !projectScope &&
                            selectedEstimate?.projectDescription
                          ) {
                            setProjectScope(
                              selectedEstimate.projectDescription,
                            );
                          }
                          setContractFlowStep("project-scope");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content: `✅ Cláusulas legales guardadas (${legalClauses.length} cláusulas).\n\n📋 **ALCANCE DEL PROYECTO**\n\nRevisemos el alcance del proyecto:\n\n"${projectScope || selectedEstimate?.projectDescription || "No definido"}"\n\n¿Deseas editarlo? Responde **SÍ** o **NO**`,
                              sender: "assistant",
                            },
                          ]);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Legal Clauses Preview */}
              {message.action === "legal-clauses-preview" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="text-sm text-gray-300 mb-4">
                      📋 **Vista previa de las cláusulas legales:**
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                      {legalClauses.map((clause, index) => (
                        <div
                          key={clause.id}
                          className="mb-4 pb-4 border-b border-gray-600 last:border-b-0"
                        >
                          <h4 className="font-semibold text-cyan-400 mb-2">
                            {index + 1}. {clause.title}
                          </h4>
                          <p className="text-xs text-gray-400 mb-2">
                            Categoría: {clause.category}{" "}
                            {clause.isRequired && "• Obligatoria"}
                          </p>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {clause.content}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content:
                                "📝 **EDITAR CLÁUSULAS LEGALES**\n\nPuedes continuar editando las cláusulas:",
                              sender: "assistant",
                              action: "legal-clauses-form",
                            },
                          ]);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => {
                          // Initialize project scope with estimate description if empty
                          if (
                            !projectScope &&
                            selectedEstimate?.projectDescription
                          ) {
                            setProjectScope(
                              selectedEstimate.projectDescription,
                            );
                          }
                          setContractFlowStep("project-scope");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content: `✅ Cláusulas legales confirmadas (${legalClauses.length} cláusulas).\n\n📋 **ALCANCE DEL PROYECTO**\n\nRevisemos el alcance del proyecto:\n\n"${projectScope || selectedEstimate?.projectDescription || "No definido"}"\n\n¿Deseas editarlo? Responde **SÍ** o **NO**`,
                              sender: "assistant",
                            },
                          ]);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        ✅ Confirmar y Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Project Scope Form - Editable Project Description */}
              {message.action === "project-scope-form" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Descripción del Proyecto *
                      </label>
                      <textarea
                        value={
                          projectScope ||
                          selectedEstimate?.projectDescription ||
                          ""
                        }
                        onChange={(e) => setProjectScope(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 min-h-[150px] resize-y"
                        placeholder="Describe detalladamente el alcance del proyecto, materiales, trabajo a realizar, etc..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const currentScope =
                            projectScope ||
                            selectedEstimate?.projectDescription ||
                            "";
                          if (!currentScope.trim()) {
                            toast({
                              title: "Error",
                              description:
                                "La descripción del proyecto es obligatoria",
                              variant: "destructive",
                            });
                            return;
                          }
                          // Show preview with better formatting
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content: `📋 **VISTA PREVIA DEL ALCANCE DEL PROYECTO**\n\n---\n\n${currentScope}\n\n---\n\n¿Estás satisfecho con esta descripción? Responde **SÍ** para continuar o **EDITAR** para modificarla.`,
                              sender: "assistant",
                              action: "project-scope-preview",
                            },
                          ]);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        👁️ Vista Previa
                      </button>
                      <button
                        onClick={() => {
                          if (!projectScope.trim()) {
                            toast({
                              title: "Error",
                              description:
                                "La descripción del proyecto es obligatoria",
                              variant: "destructive",
                            });
                            return;
                          }
                          setContractFlowStep("final-review");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content: `✅ Alcance del proyecto guardado.\n\n🎯 **REVISIÓN FINAL**\n\nTodo está listo para generar el contrato. Revisa el resumen final:`,
                              sender: "assistant",
                              action: "final-review",
                            },
                          ]);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Project Scope Preview */}
              {message.action === "project-scope-preview" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="text-sm text-gray-300 mb-4">
                      📋 **Vista previa del alcance del proyecto:**
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {projectScope ||
                          selectedEstimate?.projectDescription ||
                          ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content:
                                "📝 **EDITAR ALCANCE DEL PROYECTO**\n\nPuedes continuar editando la descripción:",
                              sender: "assistant",
                              action: "project-scope-form",
                            },
                          ]);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => {
                          setContractFlowStep("final-review");
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `assistant-${Date.now()}`,
                              content: `✅ Alcance del proyecto confirmado.\n\n🎯 **REVISIÓN FINAL**\n\nTodo está listo para generar el contrato. Revisa el resumen final:`,
                              sender: "assistant",
                              action: "final-review",
                            },
                          ]);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        ✅ Confirmar y Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Permit Address Selection */}
              {message.action === "permit-address-selection" && (
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `user-${Date.now()}`,
                          content: "Manual Address",
                          sender: "user",
                        },
                      ]);
                      handlePermitFlow("manual address");
                    }}
                    className="w-full bg-gradient-to-r from-red-900/30 to-pink-900/30 hover:from-red-800/50 hover:to-pink-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <span>📍 Manual Steering</span>
                  </button>
                  <button
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `user-${Date.now()}`,
                          content: "Existing Projects",
                          sender: "user",
                        },
                      ]);
                      handlePermitFlow("existing projects");
                    }}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-900/30 to-teal-900/30 hover:from-green-800/50 hover:to-teal-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Loading Projects...</span>
                      </>
                    ) : (
                      <span>📋 Existing Projects</span>
                    )}
                  </button>
                </div>
              )}
              {/* Permit Manual Entry Form */}
              {message.action === "permit-manual-entry" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Dirección de la Propiedad *
                      </label>
                      <MapboxPlacesAutocomplete
                        value={permitAddress}
                        onChange={(address) => setPermitAddress(address)}
                        onPlaceSelect={(placeData) => {
                          setPermitAddress(placeData.address);
                          setPermitCoordinates(placeData.coordinates);
                        }}
                        placeholder="Ingresa la dirección completa..."
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tipo de Proyecto *
                      </label>
                      <select
                        value={permitProjectType}
                        onChange={(e) => setPermitProjectType(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      >
                        <option value="">Selecciona un tipo de proyecto</option>
                        <option value="fence">Fence Installation</option>
                        <option value="deck">Deck Construction</option>
                        <option value="addition">Home Addition</option>
                        <option value="renovation">Renovation</option>
                        <option value="electrical">Electrical Work</option>
                        <option value="plumbing">Plumbing</option>
                        <option value="roofing">Roofing</option>
                        <option value="hvac">HVAC Installation</option>
                        <option value="concrete">Concrete Work</option>
                        <option value="landscaping">Landscaping</option>
                        <option value="pool">Pool Installation</option>
                        <option value="solar">Solar Panel Installation</option>
                        <option value="siding">Siding</option>
                        <option value="windows">Window Replacement</option>
                        <option value="demolition">Demolition</option>
                        <option value="garage">Garage Construction</option>
                        <option value="shed">Shed Installation</option>
                        <option value="driveway">Driveway</option>
                        <option value="bathroom">Bathroom Remodel</option>
                        <option value="kitchen">Kitchen Remodel</option>
                        <option value="basement">Basement Finishing</option>
                        <option value="attic">Attic Conversion</option>
                        <option value="porch">Porch/Patio</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!permitAddress.trim() || !permitProjectType) {
                            toast({
                              title: "Campos Requeridos",
                              description:
                                "Por favor completa la dirección y tipo de proyecto",
                              variant: "destructive",
                            });
                            return;
                          }
                          handlePermitFlow("continue");
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Permit Existing Projects List */}
              {message.action === "permit-existing-projects" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {permitProjects.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <p>No se encontraron proyectos existentes.</p>
                        <p className="text-sm mt-2">
                          Usa la opción de dirección manual.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {permitProjects.map((project) => (
                          <div
                            key={project.id}
                            onClick={() => handlePermitProjectSelect(project)}
                            className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-white text-sm">
                                  {project.clientName}
                                </h4>
                                <p className="text-xs text-gray-400 mt-1">
                                  📍 {project.address}
                                </p>
                                <div className="flex items-center mt-2">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      project.projectType === "fence"
                                        ? "bg-teal-500/20 text-teal-300"
                                        : project.projectType === "deck"
                                          ? "bg-orange-500/20 text-orange-300"
                                          : project.projectType === "electrical"
                                            ? "bg-yellow-500/20 text-yellow-300"
                                            : "bg-gray-500/20 text-gray-300"
                                    }`}
                                  >
                                    {project.projectType}
                                  </span>
                                  {project.totalPrice && (
                                    <span className="text-xs text-green-400 ml-2">
                                      ${project.totalPrice.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Permit Description and Upload */}
              {message.action === "permit-description-upload" && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Descripción del Proyecto *
                      </label>
                      <textarea
                        value={permitProjectDescription}
                        onChange={(e) =>
                          setPermitProjectDescription(e.target.value)
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 min-h-[100px] resize-y"
                        placeholder="Describe detalladamente tu proyecto..."
                      />
                      <button
                        onClick={async () => {
                          if (!permitProjectDescription.trim()) {
                            toast({
                              title: "Descripción Requerida",
                              description:
                                "Ingresa una descripción básica primero",
                              variant: "destructive",
                            });
                            return;
                          }
                          try {
                            setIsLoading(true);
                            const response = await fetch("/api/ai-enhance", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                description: permitProjectDescription,
                                projectType: permitProjectType,
                                context: "permit_application",
                                enhancementType: "description_improvement",
                              }),
                            });
                            if (response.ok) {
                              const data = await response.json();
                              if (data.enhancedDescription) {
                                setPermitProjectDescription(
                                  data.enhancedDescription,
                                );
                                toast({
                                  title: "✅ Descripción Mejorada",
                                  description:
                                    "La descripción ha sido mejorada con IA",
                                });
                              } else {
                                throw new Error(
                                  "No enhanced description received",
                                );
                              }
                            } else {
                              throw new Error(
                                `HTTP ${response.status}: ${response.statusText}`,
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error improving description:",
                              error,
                            );
                            toast({
                              title: "Error",
                              description:
                                "No se pudo mejorar la descripción. Intenta nuevamente.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-2"
                        disabled={isLoading}
                      >
                        <Brain className="w-4 h-4" />
                        <span>Mejorar con IA</span>
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Documentos (Opcional)
                      </label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setPermitDocuments(files);
                        }}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      />
                      {permitDocuments.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          {permitDocuments.length} archivo(s) seleccionado(s)
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!permitProjectDescription.trim()) {
                            toast({
                              title: "Descripción Requerida",
                              description:
                                "Por favor proporciona una descripción del proyecto",
                              variant: "destructive",
                            });
                            return;
                          }
                          handlePermitFlow("continue");
                        }}
                        className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Continuar con Análisis</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Permit Ready for Analysis */}
              {message.action === "permit-ready-analysis" && (
                <div className="mt-4 space-y-3">
                  <button
                    onClick={runPermitDeepSearch}
                    disabled={isPermitAnalyzing}
                    className="w-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 hover:from-purple-800/50 hover:to-blue-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50"
                  >
                    {isPermitAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍 Ejecutar Análisis DeepSearch</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              {/* Permit Results Display */}
              {message.action === "permit-results" && permitResults && (
                <div className="mt-4 space-y-6">
                  {/* Header with Export Button */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">
                      ✅ Análisis de permisos completado para {permitAddress}
                    </div>
                    <Button
                      onClick={exportPermitReport}
                      disabled={isGeneratingPDF}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium px-4 sm:px-6 py-2 sm:py-3 shadow-lg text-sm"
                    >
                      {isGeneratingPDF ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                          <span className="hidden sm:inline">
                            Generating PDF...
                          </span>
                          <span className="sm:hidden">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">
                            Export PDF Report
                          </span>
                          <span className="sm:hidden">Export PDF</span>
                        </>
                      )}
                    </Button>
                  </div>
                  {/* Tabs */}
                  <Tabs
                    value={activePermitTab}
                    onValueChange={setActivePermitTab}
                    className="w-full"
                  >
                    {/* Mobile-optimized TabsList */}
                    <div className="bg-gray-800/50 border border-cyan-500/20 rounded-lg p-1">
                      <TabsList className="flex w-full bg-transparent gap-1 overflow-x-auto scrollbar-none sm:grid sm:grid-cols-5">
                        <TabsTrigger
                          value="permits"
                          className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300 whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">Permits</span>
                          <span className="sm:hidden">📋</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="codes"
                          className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300 whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">
                            Building Codes
                          </span>
                          <span className="sm:hidden">📏</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="process"
                          className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300 whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">Process</span>
                          <span className="sm:hidden">🔄</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="contact"
                          className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300 whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">Contact</span>
                          <span className="sm:hidden">📞</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="considerations"
                          className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300 whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">Alerts</span>
                          <span className="sm:hidden">⚠️</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="permits" className="space-y-4 mt-6">
                      {permitResults.requiredPermits &&
                      permitResults.requiredPermits.length > 0 ? (
                        <div className="space-y-4">
                          {permitResults.requiredPermits.map(
                            (permit: any, idx: number) => (
                              <div key={idx} className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-blue-400/10 to-teal-400/10 rounded-lg"></div>
                                <Card className="relative bg-gray-800/70 border-cyan-400/30 backdrop-blur-sm">
                                  <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                                        <span className="text-xl">📋</span>
                                      </div>
                                      <div className="flex-1 space-y-3">
                                        <div>
                                          <h3 className="text-xl font-semibold text-cyan-300 mb-2">
                                            {permit.type ||
                                              permit.name ||
                                              `Permit ${idx + 1}`}
                                          </h3>
                                          <p className="text-gray-300 leading-relaxed">
                                            {permit.description ||
                                              permit.requirements ||
                                              "Permit details"}
                                          </p>
                                        </div>
                                        {(permit.fees ||
                                          permit.averageCost) && (
                                          <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                                            <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                                              💰 Estimated Fees
                                            </h4>
                                            <p className="text-green-200 font-semibold">
                                              {permit.fees ||
                                                permit.averageCost}
                                            </p>
                                          </div>
                                        )}
                                        {(permit.timeline ||
                                          permit.estimatedTimeline) && (
                                          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                                            <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                                              ⏱️ Processing Time
                                            </h4>
                                            <p className="text-blue-200">
                                              {permit.timeline ||
                                                permit.estimatedTimeline}
                                            </p>
                                          </div>
                                        )}
                                        {(permit.contact ||
                                          permit.issuingAuthority) && (
                                          <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                                            <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                                              📞 Contact Information
                                            </h4>
                                            <p className="text-purple-200">
                                              {permit.contact ||
                                                permit.issuingAuthority}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-green-300">
                            Permit information loading...
                          </h3>
                          <p className="text-gray-400">
                            Required permits will appear here.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="codes" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <h4 className="text-emerald-300 font-semibold border-b border-emerald-500/30 pb-2 mb-4 flex items-center gap-2">
                          <span className="text-xl">📋</span>
                          Project-Specific Building Codes
                        </h4>
                        {permitResults.buildingCodes &&
                        Array.isArray(permitResults.buildingCodes) &&
                        permitResults.buildingCodes.length > 0 ? (
                          <div className="space-y-4">
                            {permitResults.buildingCodes.map(
                              (codeSection: any, idx: number) => (
                                <div key={idx} className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-teal-400/10 rounded-lg"></div>
                                  <Card className="relative bg-gray-800/70 border-emerald-400/30 backdrop-blur-sm">
                                    <CardContent className="p-6">
                                      <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg">
                                          <span className="text-xl">📏</span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                          <div>
                                            <h3 className="text-xl font-semibold text-emerald-300 mb-2">
                                              {codeSection.section ||
                                                codeSection.title ||
                                                `Building Code Section ${idx + 1}`}
                                            </h3>
                                            <p className="text-gray-300 leading-relaxed">
                                              {codeSection.description ||
                                                codeSection.summary ||
                                                "Code section details"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-green-300">
                              No Specific Building Codes
                            </h3>
                            <p className="text-gray-400">
                              No specific building codes identified for this
                              project type and location.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="process" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <h4 className="text-blue-300 font-semibold border-b border-blue-500/30 pb-2 mb-4 flex items-center gap-2">
                          <span className="text-xl">🔄</span>
                          Permit Application Process
                        </h4>
                        {permitResults.process &&
                        Array.isArray(permitResults.process) &&
                        permitResults.process.length > 0 ? (
                          <div className="space-y-4">
                            {permitResults.process.map(
                              (step: any, idx: number) => (
                                <div key={idx} className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-indigo-400/10 to-purple-400/10 rounded-lg"></div>
                                  <Card className="relative bg-gray-800/70 border-blue-400/30 backdrop-blur-sm">
                                    <CardContent className="p-6">
                                      <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
                                          <span className="text-xl font-bold text-white">
                                            {idx + 1}
                                          </span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                          <div>
                                            <h3 className="text-xl font-semibold text-blue-300 mb-2">
                                              {typeof step === "string"
                                                ? `Step ${idx + 1}`
                                                : step.step ||
                                                  step.title ||
                                                  `Step ${idx + 1}`}
                                            </h3>
                                            <p className="text-gray-300 leading-relaxed">
                                              {typeof step === "string"
                                                ? step
                                                : step.description ||
                                                  step.summary ||
                                                  "Process step details"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-green-300">
                              No Process Information
                            </h3>
                            <p className="text-gray-400">
                              No specific process information available for this
                              project.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="contact" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <h4 className="text-purple-300 font-semibold border-b border-purple-500/30 pb-2 mb-4 flex items-center gap-2">
                          <span className="text-xl">📞</span>
                          Contact Information
                        </h4>
                        {permitResults.contactInformation ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-red-400/10 rounded-lg"></div>
                            <Card className="relative bg-gray-800/70 border-purple-400/30 backdrop-blur-sm">
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                                    <span className="text-xl">📞</span>
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <h3 className="text-xl font-semibold text-purple-300 mb-2">
                                        Municipal Contact Information
                                      </h3>
                                      <div className="space-y-2 text-gray-300">
                                        {Array.isArray(
                                          permitResults.contactInformation,
                                        ) ? (
                                          permitResults.contactInformation.map(
                                            (
                                              contact: any,
                                              contactIdx: number,
                                            ) => (
                                              <div
                                                key={contactIdx}
                                                className="space-y-2"
                                              >
                                                {contact.department && (
                                                  <div>
                                                    <strong>Department:</strong>{" "}
                                                    {contact.department}
                                                  </div>
                                                )}
                                                {contact.directPhone && (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-purple-400">
                                                      📞
                                                    </span>
                                                    <span>
                                                      <strong>Phone:</strong>{" "}
                                                      {contact.directPhone}
                                                    </span>
                                                  </div>
                                                )}
                                                {contact.email && (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-purple-400">
                                                      📧
                                                    </span>
                                                    <span>
                                                      <strong>Email:</strong>{" "}
                                                      {contact.email}
                                                    </span>
                                                  </div>
                                                )}
                                                {contact.physicalAddress && (
                                                  <div className="flex items-start gap-2">
                                                    <span className="text-purple-400">
                                                      📍
                                                    </span>
                                                    <span>
                                                      <strong>Address:</strong>{" "}
                                                      {contact.physicalAddress}
                                                    </span>
                                                  </div>
                                                )}
                                                {contact.website && (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-purple-400">
                                                      🌐
                                                    </span>
                                                    <span>
                                                      <strong>Website:</strong>{" "}
                                                      <a
                                                        href={contact.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-cyan-400 hover:underline"
                                                      >
                                                        {contact.website}
                                                      </a>
                                                    </span>
                                                  </div>
                                                )}
                                                {contact.hours && (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-purple-400">
                                                      🕒
                                                    </span>
                                                    <span>
                                                      <strong>Hours:</strong>{" "}
                                                      {contact.hours}
                                                    </span>
                                                  </div>
                                                )}
                                                {contact.inspectorName && (
                                                  <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 mt-3">
                                                    <h4 className="text-purple-300 font-medium mb-2">
                                                      Inspector Information
                                                    </h4>
                                                    <div className="space-y-1 text-sm">
                                                      <div>
                                                        <strong>Name:</strong>{" "}
                                                        {contact.inspectorName}
                                                      </div>
                                                      {contact.inspectorPhone && (
                                                        <div>
                                                          <strong>
                                                            Phone:
                                                          </strong>{" "}
                                                          {
                                                            contact.inspectorPhone
                                                          }
                                                        </div>
                                                      )}
                                                      {contact.inspectorEmail && (
                                                        <div>
                                                          <strong>
                                                            Email:
                                                          </strong>{" "}
                                                          {
                                                            contact.inspectorEmail
                                                          }
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                                {contact.onlinePortal && (
                                                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mt-3">
                                                    <h4 className="text-blue-300 font-medium mb-2">
                                                      Online Services
                                                    </h4>
                                                    <a
                                                      href={
                                                        contact.onlinePortal
                                                      }
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-cyan-400 hover:underline text-sm"
                                                    >
                                                      {contact.onlinePortal}
                                                    </a>
                                                  </div>
                                                )}
                                              </div>
                                            ),
                                          )
                                        ) : typeof permitResults.contactInformation ===
                                          "object" ? (
                                          <div className="space-y-2">
                                            {Object.entries(
                                              permitResults.contactInformation,
                                            ).map(([key, value]) => (
                                              <div
                                                key={key}
                                                className="flex items-start gap-2"
                                              >
                                                <span className="text-purple-400 capitalize font-medium min-w-[120px]">
                                                  {key
                                                    .replace(/([A-Z])/g, " $1")
                                                    .trim()}
                                                  :
                                                </span>
                                                <span>
                                                  {typeof value === "string"
                                                    ? value
                                                    : JSON.stringify(value)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-gray-300 leading-relaxed">
                                            {permitResults.contactInformation}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-green-300">
                              No Contact Information
                            </h3>
                            <p className="text-gray-400">
                              No specific contact information available for this
                              location.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent
                      value="considerations"
                      className="space-y-4 mt-6"
                    >
                      {permitResults.specialConsiderations &&
                      Array.isArray(permitResults.specialConsiderations) &&
                      permitResults.specialConsiderations.length > 0 ? (
                        <div className="space-y-4">
                          {permitResults.specialConsiderations.map(
                            (consideration: any, idx: number) => (
                              <div key={idx} className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-orange-400/10 to-red-400/10 rounded-lg"></div>
                                <Card className="relative bg-gray-800/70 border-amber-400/30 backdrop-blur-sm">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-black shadow-lg">
                                        ⚠️
                                      </div>
                                      <div className="flex-1 space-y-3">
                                        <h4 className="text-amber-300 font-semibold">
                                          Critical Alert #{idx + 1}
                                        </h4>
                                        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                                          <div className="text-amber-200 text-sm leading-relaxed space-y-2">
                                            {typeof consideration ===
                                            "string" ? (
                                              <p>{consideration}</p>
                                            ) : typeof consideration ===
                                              "object" ? (
                                              <div className="space-y-2">
                                                {Object.entries(
                                                  consideration,
                                                ).map(([key, value]) => (
                                                  <div
                                                    key={key}
                                                    className="border-l-2 border-amber-400/30 pl-3"
                                                  >
                                                    <div className="font-medium text-amber-300 capitalize mb-1">
                                                      {key
                                                        .replace(
                                                          /([A-Z])/g,
                                                          " $1",
                                                        )
                                                        .trim()}
                                                    </div>
                                                    <div className="text-amber-200">
                                                      {typeof value === "string"
                                                        ? value
                                                        : JSON.stringify(value)}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p>
                                                {JSON.stringify(consideration)}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-green-300">
                            No Critical Alerts
                          </h3>
                          <p className="text-gray-400">
                            No special considerations or alerts identified for
                            this project.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          ))}
          {/* Mensaje de carga */}
          {isLoading && (
            <div className="max-w-[85%] rounded-lg p-3 bg-gray-900 mr-auto">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-2">
                  <img
                    src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
                    alt="Mervin AI"
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-cyan-400">Procesando</span>
                <div className="ml-1 flex">
                  <span className="animate-pulse text-cyan-400">.</span>
                  <span className="animate-pulse text-cyan-400 delay-200">
                    .
                  </span>
                  <span className="animate-pulse text-cyan-400 delay-500">
                    .
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Elemento para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
        {chatFlowStep === "select-inventory" && shoppingCart.length > 0 && (
          <div className="text-center mt-4">
            <button
              className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium"
              onClick={() => {
                setChatFlowStep("awaiting-discount");
                setMessages((prev) => [
                  ...prev,
                  {
                    id: "assistant-" + Date.now(),
                    content:
                      "¿Quieres aplicar algún **descuento**? Ingresa un valor numérico o porcentaje (ej: 100 o 10%). Escribe skip para omitir.",
                    sender: "assistant",
                  },
                ]);
                setTimeout(
                  () =>
                    messagesEndRef.current?.scrollIntoView({
                      behavior: "smooth",
                    }),
                  100,
                );
              }}
            >
              📄 Generar Estimado
            </button>
          </div>
        )}
      </div>
      {/* Área de input FIJA en la parte inferior, fuera del scroll */}
      <div className="fixed bottom-8 left-0 right-0 p-3 bg-black border-t border-cyan-900/30">
        <div className="flex gap-2 max-w-screen-lg mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 text-cyan-500 border-cyan-900/50"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-gray-800 border border-cyan-900/50 rounded-full px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            disabled={isLoading}
          />
          <Button
            variant="default"
            className="rounded-full bg-cyan-600 hover:bg-cyan-700"
            onClick={handleSendMessage}
            disabled={inputValue.trim() === "" || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
}