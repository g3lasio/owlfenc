import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { MervinWorkingEffect } from "@/components/ui/mervin-working-effect";
import { DeepSearchEffect } from "@/components/ui/deepsearch-effect";
import { EmailVerification } from "@/components/auth/EmailVerification";
// Usar el logo correcto de OWL FENCE
const mervinLogoUrl =
  "https://ik.imagekit.io/lp5czyx2a/ChatGPT%20Image%20May%2010,%202025,%2005_35_38%20PM.png?updatedAt=1748157114019";
import {
  getClients as getFirebaseClients,
  saveClient,
} from "@/lib/clientFirebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MaterialInventoryService } from "../services/materialInventoryService";
import { EmailService } from "../services/emailService";
import { checkEmailVerification } from "@/lib/firebase";
import {
  shareOrDownloadPdf,
  getSharingCapabilities,
} from "@/utils/mobileSharing";
import {
  Search,
  Plus,
  User,
  Package,
  FileText,
  Eye,
  Share2,
  Save,
  Trash2,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  Calculator,
  Building2,
  UserPlus,
  Brain,
  Minus,
  Download,
  RefreshCw,
  AlertCircle,
  Edit,
  Mail,
  Phone,
  MapPin,
  X,
  Smartphone,
  Wrench,
  Combine,
  ArrowLeft,
  Send,
} from "lucide-react";
import axios from "axios";

// Types
interface Client {
  id: string;
  clientId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  source?: string;
  classification?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface Material {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
}

interface EstimateItem {
  id: string;
  materialId: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
}

interface EstimateData {
  client: Client | null;
  items: EstimateItem[];
  projectDetails: string;
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  discountName: string;
}

const STEPS = [
  { id: "client", title: "Client", icon: User },
  { id: "details", title: "Details", icon: FileText },
  { id: "materials", title: "Materials", icon: Package },
  { id: "preview", title: "Preview", icon: Eye },
];

export default function EstimatesWizardFixed() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { profile, isLoading: isProfileLoading } = useProfile();
  console.log(currentUser);

  const [currentStep, setCurrentStep] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(
    null,
  );

  // Mobile sharing capabilities
  const [sharingCapabilities, setSharingCapabilities] = useState(() =>
    getSharingCapabilities(),
  );
  const [estimate, setEstimate] = useState<EstimateData>({
    client: null,
    items: [],
    projectDetails: "",
    subtotal: 0,
    tax: 0,
    total: 0,
    taxRate: 10, // Default 10% instead of 16%
    discountType: "percentage",
    discountValue: 0,
    discountAmount: 0,
    discountName: "",
  });

  // Data from existing systems
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [contractor, setContractor] = useState<any>(null);

  // Search states
  const [clientSearch, setClientSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);

  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // Deepsearch Materials states
  const [showDeepsearchDialog, setShowDeepsearchDialog] = useState(false);
  const [deepsearchMode, setDeepsearchMode] = useState<
    "materials" | "labor" | "full"
  >("materials");
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showMervinWorking, setShowMervinWorking] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

  // Nuevo botón MATERIALS AI SEARCH - Estado independiente
  const [showNewDeepsearchDialog, setShowNewDeepsearchDialog] = useState(false);

  // New client form
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  });

  // AI enhancement states - using the existing isAIProcessing from Smart Search
  const [showMervinMessage, setShowMervinMessage] = useState(false);

  // Estimates history states
  const [showEstimatesHistory, setShowEstimatesHistory] = useState(false);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [showCompanyEditDialog, setShowCompanyEditDialog] = useState(false);

  // Invoice configuration states
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceConfig, setInvoiceConfig] = useState({
    projectCompleted: null as boolean | null,
    downPaymentAmount: "",
    totalAmountPaid: null as boolean | null,
  });

  // Check for edit mode on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");

    if (editId) {
      setIsEditMode(true);
      setEditingEstimateId(editId);
      // Note: Edit functionality will be handled by existing logic when needed
    }
  }, []);

  // Email dialog states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Client editing state for preview step
  const [isEditingClient, setIsEditingClient] = useState(false);

  // Función para evaluar la calidad de la descripción
  const evaluateProjectDescription = (description: string) => {
    const words = description
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const hasNumbers = /\d/.test(description);
    const hasSpecificTerms =
      /(?:feet|ft|metros?|m|linear|square|cubic|install|build|construct|repair|replace|fence|deck|roof|floor|wall|paint|electrical|plumb)/i.test(
        description,
      );

    return {
      wordCount: words.length,
      hasNumbers,
      hasSpecificTerms,
      isDetailed: words.length >= 5 && (hasNumbers || hasSpecificTerms),
    };
  };

  // Smart Search Handler
  const handleSmartSearch = async () => {
    const description = estimate.projectDetails.trim();

    if (!description || description.length < 3) {
      toast({
        title: "Description Required",
        description:
          "Please describe your project with at least 3 characters to use Smart Search AI",
        variant: "destructive",
      });
      return;
    }

    const evaluation = evaluateProjectDescription(description);

    // Si la descripción es muy básica, sugerir mejorarla
    if (!evaluation.isDetailed) {
      toast({
        title: "Description too basic for DeepSearch",
        description:
          'To run DeepSearch I need more project details. Include measurements, specific materials, or use "Enhance with Mervin AI" first.',
        variant: "destructive",
      });
      return;
    }

    setIsAIProcessing(true);
    setAiProgress(0);

    try {
      let endpoint = "";
      let successMessage = "";

      switch (deepsearchMode) {
        case "materials":
          endpoint = "/api/deepsearch/materials-only";
          successMessage = "materials";
          break;
        case "labor":
          endpoint = "/api/labor-deepsearch/generate-items";
          successMessage = "labor services";
          break;
        case "full":
          endpoint = "/api/labor-deepsearch/combined";
          successMessage = "materials and labor";
          break;
      }

      setAiProgress(30);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectDescription: estimate.projectDetails,
          location: estimate.client?.address || "",
        }),
      });

      setAiProgress(70);

      if (!response.ok) {
        throw new Error("Error generating with Smart Search AI");
      }

      const result = await response.json();
      setAiProgress(90);

      if (result.success) {
        const newItems: EstimateItem[] = [];

        // Add materials if they exist AND automatically save them to inventory
        if (result.materials && result.materials.length > 0) {
          result.materials.forEach((material: any) => {
            newItems.push({
              id: `ai_mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              materialId: material.id || "",
              name: material.name,
              description: material.description || "",
              quantity: material.quantity,
              price: material.price,
              unit: material.unit,
              total: material.total,
            });
          });

          // Auto-save materials to Firebase inventory
          if (currentUser?.uid) {
            console.log(
              "🚀 STARTING AUTO-SAVE for materials:",
              result.materials.length,
            );
            console.log("📋 Materials data:", result.materials);
            console.log("👤 Current user UID:", currentUser.uid);

            MaterialInventoryService.addMaterialsFromDeepSearch(
              result.materials,
              currentUser.uid,
              estimate.projectDetails,
            )
              .then((saveResults) => {
                console.log("✅ AUTO-SAVE SUCCESS! Results:", saveResults);
                if (saveResults.added > 0) {
                  toast({
                    title: "Materials Auto-Saved",
                    description: `${saveResults.added} materials automatically added to your inventory`,
                  });
                }
              })
              .catch((error) => {
                console.error("❌ AUTO-SAVE FAILED:", error);
                toast({
                  title: "Auto-save Warning",
                  description: "Some materials couldn't be saved to inventory",
                  variant: "destructive",
                });
              });
          } else {
            console.warn("⚠️ No user UID available for auto-save");
          }
        }

        // Add labor services if they exist (using 'items' for labor endpoint)
        if (result.items) {
          result.items.forEach((service: any) => {
            // Map real construction units
            const unitMapping: Record<string, string> = {
              linear_ft: "linear ft",
              square_ft: "ft²",
              cubic_yard: "yd³",
              square: "square",
              project: "project",
              per_unit: "unit",
            };

            newItems.push({
              id: `ai_lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              materialId: service.id || "",
              name: service.name,
              description: service.description || "",
              quantity: service.quantity || 1,
              price: service.unitPrice || service.totalCost || 0,
              unit: unitMapping[service.unit] || service.unit || "service",
              total:
                service.totalCost || service.unitPrice * service.quantity || 0,
            });
          });

          // Auto-save labor services as "materials" in inventory for future reuse
          if (currentUser?.uid) {
            // Convert labor services to material format for inventory
            const laborMaterials = result.items.map((service: any) => ({
              name: service.name,
              category: "Labor Services",
              description:
                service.description || `Labor service: ${service.name}`,
              unit: service.unit || "service",
              price: service.unitPrice || service.totalCost || 0,
              source: "deepsearch-labor",
              tags: ["labor", "service", "ai-generated"],
            }));

            MaterialInventoryService.addMaterialsFromDeepSearch(
              laborMaterials,
              currentUser.uid,
              estimate.projectDetails,
            )
              .then((saveResults) => {
                console.log(
                  "🔧 Auto-save labor services to inventory completed:",
                  saveResults,
                );
              })
              .catch((error) => {
                console.error(
                  "❌ Error auto-saving labor services to inventory:",
                  error,
                );
              });
          }
        }

        // Also handle labor if it comes from the combined endpoint
        if (result.labor) {
          result.labor.forEach((service: any) => {
            // Map real construction units
            const unitMapping: Record<string, string> = {
              linear_ft: "linear ft",
              square_ft: "ft²",
              cubic_yard: "yd³",
              square: "square",
              project: "project",
              per_unit: "unit",
            };

            newItems.push({
              id: `ai_lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              materialId: service.id || "",
              name: service.name,
              description: service.description || "",
              quantity: service.quantity || 1,
              price:
                service.unitPrice ||
                service.totalPrice ||
                service.totalCost ||
                0,
              unit: unitMapping[service.unit] || service.unit || "service",
              total:
                service.totalCost ||
                service.totalPrice ||
                service.unitPrice * service.quantity ||
                0,
            });
          });

          // Auto-save labor services from combined endpoint to inventory
          if (currentUser?.uid) {
            // Convert labor services to material format for inventory
            const combinedLaborMaterials = result.labor.map((service: any) => ({
              name: service.name,
              category: "Labor Services",
              description:
                service.description || `Labor service: ${service.name}`,
              unit: service.unit || "service",
              price: service.unitPrice || service.totalCost || 0,
              source: "deepsearch-combined",
              tags: ["labor", "service", "ai-generated", "combined-analysis"],
            }));

            MaterialInventoryService.addMaterialsFromDeepSearch(
              combinedLaborMaterials,
              currentUser.uid,
              estimate.projectDetails,
            )
              .then((saveResults) => {
                console.log(
                  "🔧 Auto-save combined labor services to inventory completed:",
                  saveResults,
                );
              })
              .catch((error) => {
                console.error(
                  "❌ Error auto-saving combined labor services to inventory:",
                  error,
                );
              });
          }
        }

        setEstimate((prev) => ({
          ...prev,
          items: [...prev.items, ...newItems],
        }));

        setAiProgress(100);
        setShowDeepsearchDialog(false);

        // Mostrar mensaje de Mervin
        setShowMervinMessage(true);
        setTimeout(() => {
          setShowMervinMessage(false);
        }, 10000);

        toast({
          title: "🎉 Smart Search IA Completado",
          description: `Se agregaron ${newItems.length} ${successMessage} automáticamente`,
        });
      }
    } catch (error) {
      console.error("Error with Smart Search:", error);
      toast({
        title: "Error en Smart Search IA",
        description: "No se pudieron generar los elementos automáticamente",
        variant: "destructive",
      });
    } finally {
      setIsAIProcessing(false);
      setAiProgress(0);
    }
  };
  const [emailData, setEmailData] = useState({
    toEmail: "",
    subject: "",
    message: "",
    sendCopy: true,
  });
  const [editableCompany, setEditableCompany] = useState({
    company: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    license: "",
    insurancePolicy: "",
    logo: "",
  });

  // Load data on mount
  useEffect(() => {
    loadClients();
    loadMaterials();
    loadContractorProfile();
  }, [currentUser]);

  // Handle Deepsearch Materials button functionality
  const handleDeepsearchToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeepsearchDialog((prev) => !prev);
  };

  // Nuevo handler para MATERIALS AI SEARCH - Con debugging detallado
  const handleNewDeepsearch = async (
    searchType: "materials" | "labor" | "full",
  ) => {
    console.log("🔍 NEW DEEPSEARCH - Starting with type:", searchType);
    const description = estimate.projectDetails.trim();
    console.log(
      "🔍 NEW DEEPSEARCH - Description:",
      description.substring(0, 100) + "...",
    );

    if (!description || description.length < 3) {
      toast({
        title: "Description Required",
        description:
          "Please describe your project with at least 3 characters to use AI Search",
        variant: "destructive",
      });
      return;
    }

    setShowNewDeepsearchDialog(false);
    setIsAIProcessing(true);
    setAiProgress(0);

    try {
      let endpoint = "";
      let successMessage = "";

      switch (searchType) {
        case "materials":
          endpoint = "/api/deepsearch/materials-only";
          successMessage = "materials";
          break;
        case "labor":
          endpoint = "/api/labor-deepsearch/generate-items";
          successMessage = "labor services";
          break;
        case "full":
          endpoint = "/api/labor-deepsearch/combined";
          successMessage = "materials and labor";
          break;
      }

      console.log("🔍 NEW DEEPSEARCH - Using endpoint:", endpoint);

      // Enhanced progress simulation with realistic timing for combined analysis
      const progressInterval = setInterval(() => {
        setAiProgress((prev) => {
          if (searchType === "full") {
            // Slower, more realistic progress for combined analysis
            return Math.min(prev + Math.random() * 8 + 2, 75);
          } else {
            // Faster progress for single-type analysis
            return Math.min(prev + Math.random() * 12 + 3, 80);
          }
        });
      }, 800);

      console.log("🔍 NEW DEEPSEARCH - Making request to:", endpoint);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectDescription: description,
          includeMaterials: searchType === "materials" || searchType === "full",
          includeLabor: searchType === "labor" || searchType === "full",
          location: estimate.client?.address || "Estados Unidos",
          projectType: "construction",
        }),
      });

      clearInterval(progressInterval);
      console.log("🔍 NEW DEEPSEARCH - Response status:", response.status);
      console.log("🔍 NEW DEEPSEARCH - Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔍 NEW DEEPSEARCH - Response error:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("🔍 NEW DEEPSEARCH - Response data:", data);
      console.log("🔍 NEW DEEPSEARCH - Data.success:", data.success);
      console.log("🔍 NEW DEEPSEARCH - Data.items:", data.items);
      console.log("🔍 NEW DEEPSEARCH - Items length:", data.items?.length);

      // Verificar diferentes estructuras de respuesta según el endpoint
      let items = [];

      if (searchType === "materials" && data.materials) {
        console.log(
          "🔍 NEW DEEPSEARCH - Using data.materials:",
          data.materials,
        );
        items = data.materials;
      } else if (searchType === "labor" && data.items) {
        console.log("🔍 NEW DEEPSEARCH - Using data.items:", data.items);
        items = data.items;
      } else if (searchType === "full") {
        console.log(
          "🔍 NEW DEEPSEARCH - FULL COSTS - Processing combined response",
        );
        console.log("🔍 NEW DEEPSEARCH - FULL COSTS - Data structure:", data);

        // For combined endpoint, the data is nested in data.data
        const combinedData = data.data || data;
        console.log(
          "🔍 NEW DEEPSEARCH - FULL COSTS - Combined data:",
          combinedData,
        );

        const materialItems: any[] = [];
        const laborItems: any[] = [];

        // Process materials from combinedData.materials
        if (combinedData.materials && Array.isArray(combinedData.materials)) {
          console.log("🔍 Found materials:", combinedData.materials.length);
          combinedData.materials.forEach((material: any) => {
            materialItems.push({
              id:
                Date.now().toString() + Math.random().toString(36).substr(2, 9),
              materialId: material.id || Date.now().toString(),
              name: material.name || "Unknown Material",
              description: material.description || "",
              quantity: material.quantity || 1,
              price: material.price || material.unitPrice || 0,
              unit: material.unit || "each",
              total:
                (material.quantity || 1) *
                (material.price || material.unitPrice || 0),
            });
          });
        }

        // Process labor services from combinedData.laborCosts
        if (combinedData.laborCosts && Array.isArray(combinedData.laborCosts)) {
          console.log(
            "🔍 Found labor services:",
            combinedData.laborCosts.length,
          );
          combinedData.laborCosts.forEach((service: any) => {
            laborItems.push({
              id:
                Date.now().toString() + Math.random().toString(36).substr(2, 9),
              materialId: service.id || Date.now().toString(),
              name: service.name || "Unknown Service",
              description: service.description || "",
              quantity: service.quantity || 1,
              price:
                service.unitPrice ||
                service.totalPrice ||
                service.totalCost ||
                0,
              unit: service.unit || "service",
              total:
                service.totalCost ||
                service.totalPrice ||
                (service.quantity || 1) * (service.unitPrice || 0),
            });
          });
        }

        items = [...materialItems, ...laborItems];
        console.log(
          "🔍 NEW DEEPSEARCH - FULL COSTS - Total items:",
          items.length,
          "Materials:",
          materialItems.length,
          "Labor:",
          laborItems.length,
        );
      } else if (data.items) {
        console.log("🔍 NEW DEEPSEARCH - Fallback to data.items:", data.items);
        items = data.items;
      }

      console.log("🔍 NEW DEEPSEARCH - Final items to process:", items);

      if (items && items.length > 0) {
        const newItems =
          searchType === "full"
            ? items
            : items.map((item: any) => {
                console.log("🔍 NEW DEEPSEARCH - Processing item:", item);
                return {
                  id:
                    Date.now().toString() +
                    Math.random().toString(36).substr(2, 9),
                  materialId: item.id || Date.now().toString(),
                  name: item.name || item.material || "Unknown Item",
                  description: item.description || item.details || "",
                  quantity: item.quantity || 1,
                  price: item.price || item.unitPrice || 0,
                  unit: item.unit || "each",
                  total:
                    (item.quantity || 1) * (item.price || item.unitPrice || 0),
                };
              });

        console.log("🔍 NEW DEEPSEARCH - New items created:", newItems);

        setEstimate((prev) => ({
          ...prev,
          items: [...prev.items, ...newItems],
        }));

        setAiProgress(100);

        toast({
          title: `${searchType === "full" ? "Full Costs Analysis" : "AI Search"} Completed`,
          description:
            searchType === "full"
              ? `Added ${newItems.length} items (materials + labor) with complete cost analysis`
              : `Successfully found and added ${newItems.length} ${successMessage} to your estimate`,
        });

        // Mostrar mensaje de Mervin
        setShowMervinMessage(true);
        setTimeout(() => setShowMervinMessage(false), 3000);
      } else {
        console.error("🔍 NEW DEEPSEARCH - No items found in response:", data);
        throw new Error("No items found in the response");
      }
    } catch (error) {
      console.error("🔍 NEW DEEPSEARCH - Error details:", error);
      toast({
        title: "AI Search Failed",
        description:
          "Unable to process your request. Please try again or add materials manually.",
        variant: "destructive",
      });
    } finally {
      setIsAIProcessing(false);
      setAiProgress(0);
    }
  };

  // Check for edit parameter and load project data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editProjectId = urlParams.get("edit");

    if (editProjectId && currentUser) {
      // Add small delay to ensure clients are loaded
      setTimeout(() => {
        loadProjectForEdit(editProjectId);
      }, 1000);
    }
  }, [currentUser]);

  // Calculate totals when items, tax rate, or discount change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);

    console.log("🔍 TOTALS CALCULATION DEBUG", {
      itemsCount: estimate.items.length,
      itemsData: estimate.items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        calculation: `${item.price} × ${item.quantity} = ${item.total}`
      })),
      subtotal,
      taxRate: estimate.taxRate,
      discountValue: estimate.discountValue,
      discountType: estimate.discountType
    });

    // Calculate discount amount
    let discountAmount = 0;
    if (estimate.discountValue > 0) {
      if (estimate.discountType === "percentage") {
        discountAmount = subtotal * (estimate.discountValue / 100);
      } else {
        discountAmount = estimate.discountValue;
      }
    }

    // Apply discount to subtotal
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calculate tax on discounted amount
    const tax = subtotalAfterDiscount * (estimate.taxRate / 100);
    const total = subtotalAfterDiscount + tax;

    console.log("🔍 FINAL TOTALS DEBUG", {
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      tax,
      total
    });

    setEstimate((prev) => ({
      ...prev,
      subtotal,
      tax,
      total,
      discountAmount,
    }));
  }, [
    estimate.items,
    estimate.taxRate,
    estimate.discountType,
    estimate.discountValue,
  ]);

  // AUTOGUARDADO INTELIGENTE: Actualizar proyecto existente cuando cambien datos críticos
  useEffect(() => {
    // Debounce timer to avoid excessive saves
    const timeoutId = setTimeout(() => {
      autoSaveEstimateChanges();
    }, 2000); // Wait 2 seconds after changes

    return () => clearTimeout(timeoutId);
  }, [
    estimate.items,
    estimate.taxRate,
    estimate.discountType,
    estimate.discountValue,
    estimate.discountAmount,
    estimate.discountName,
    estimate.subtotal,
    estimate.tax,
    estimate.total,
    estimate.client,
    estimate.projectDetails
  ]);

  // Función de autoguardado que actualiza el proyecto existente
  const autoSaveEstimateChanges = useCallback(async () => {
    if (!currentUser?.uid || !estimate.client || estimate.items.length === 0) {
      return; // No autoguardar si no hay datos válidos
    }

    try {
      console.log("💾 AUTOGUARDADO: Actualizando proyecto existente...");

      // Preparar datos completos del estimado con descuentos e impuestos
      const estimateNumber = `EST-${Date.now()}`;
      const estimateData = {
        firebaseUserId: currentUser.uid,
        estimateNumber,
        
        // Información completa del cliente
        clientName: estimate.client.name,
        clientEmail: estimate.client.email || "",
        clientPhone: estimate.client.phone || "",
        clientAddress: estimate.client.address || "",
        clientInformation: estimate.client,
        
        // Detalles del proyecto
        projectDescription: estimate.projectDetails,
        projectType: "construction",
        
        // Items completos - VALORES DIRECTOS SIN CONVERSIONES
        items: estimate.items.map((item, index) => ({
          id: item.id,
          materialId: item.materialId || "",
          name: item.name,
          description: item.description || "",
          quantity: item.quantity,
          unit: item.unit || "unit",
          unitPrice: item.price, // NO convertir a centavos
          price: item.price, // Agregar precio directo
          totalPrice: item.total, // NO convertir a centavos
          total: item.total, // Agregar total directo
          sortOrder: index,
          isOptional: false,
        })),

        // DATOS FINANCIEROS DIRECTOS - SIN CONVERSIONES A CENTAVOS
        subtotal: estimate.subtotal,
        taxRate: estimate.taxRate,
        taxAmount: estimate.tax,
        tax: estimate.tax, // Agregar tax directo
        
        // DESCUENTOS DIRECTOS - SIN CONVERSIONES
        discount: estimate.discountAmount || 0,
        discountType: estimate.discountType || "percentage",
        discountValue: estimate.discountValue || 0,
        discountAmount: estimate.discountAmount || 0,
        discountName: estimate.discountName || "",
        
        total: estimate.total,

        // Display-friendly totals (mismos valores)
        displaySubtotal: estimate.subtotal,
        displayTax: estimate.tax,
        displayTotal: estimate.total,
        displayDiscountAmount: estimate.discountAmount || 0,

        // Metadata
        status: "draft",
        type: "estimate",
        source: "estimates-wizard-autosave",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Buscar proyecto existente para el mismo cliente
      const { collection, query, where, getDocs, addDoc, updateDoc, doc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const existingQuery = query(
        collection(db, "estimates"),
        where("firebaseUserId", "==", currentUser.uid),
        where("clientName", "==", estimate.client.name)
      );

      const querySnapshot = await getDocs(existingQuery);

      if (!querySnapshot.empty) {
        // Actualizar proyecto existente
        const existingDoc = querySnapshot.docs[0];
        const docRef = doc(db, "estimates", existingDoc.id);
        await updateDoc(docRef, estimateData);
        console.log("✅ AUTOGUARDADO: Proyecto actualizado:", existingDoc.id);
      } else {
        // Crear nuevo proyecto si no existe
        const docRef = await addDoc(collection(db, "estimates"), estimateData);
        console.log("✅ AUTOGUARDADO: Nuevo proyecto creado:", docRef.id);
      }
      
    } catch (error) {
      console.error("❌ AUTOGUARDADO: Error:", error);
      // Silenciar errores de autoguardado para no interrumpir al usuario
    }
  }, [currentUser?.uid, estimate]);

  // Initialize company data when contractor profile loads
  useEffect(() => {
    if (contractor) {
      setEditableCompany({
        company: contractor.company || contractor.name || "",
        address: contractor.address || "",
        city: contractor.city || "",
        state: contractor.state || "",
        zipCode: contractor.zipCode || "",
        phone: contractor.phone || "",
        email: contractor.email || "",
        website: contractor.website || "",
        license: contractor.license || "",
        insurancePolicy: contractor.insurancePolicy || "",
        logo: contractor.logo || "",
      });
    }
  }, [contractor]);

  // Auto-recovery system for client data - runs on component mount and when clients load
  useEffect(() => {
    const autoRecoverClientData = async () => {
      // Only run if we have items but no client (the exact problem we're solving)
      if (estimate.items.length > 0 && !estimate.client && clients.length > 0) {
        try {
          let clientToRestore = null;

          // Method 1: Try to restore from localStorage (most recent session)
          const savedClient = localStorage.getItem("currentEstimateClient");
          if (savedClient) {
            try {
              const parsedClient = JSON.parse(savedClient);
              // Verify this client still exists in the database
              clientToRestore = clients.find((c) => c.id === parsedClient.id);
              if (clientToRestore) {
                console.log(
                  "✅ AUTO-RECOVERY: Restored client from localStorage",
                );
              }
            } catch (parseError) {
              console.warn(
                "localStorage client data corrupted, trying alternatives",
              );
            }
          }

          // Method 2: Try to find the most recent client used by ID
          if (!clientToRestore) {
            const lastUsedClientId = localStorage.getItem("lastUsedClientId");
            if (lastUsedClientId) {
              clientToRestore = clients.find((c) => c.id === lastUsedClientId);
            }
          }

          // Method 3: Use the first available client as fallback
          if (!clientToRestore && clients.length > 0) {
            clientToRestore = clients[0];
          }

          if (clientToRestore) {
            // Auto-restore the client silently for seamless experience
            setEstimate((prev) => ({
              ...prev,
              client: clientToRestore,
            }));

            // Update localStorage for future sessions
            localStorage.setItem("lastUsedClientId", clientToRestore.id);
            localStorage.setItem(
              "currentEstimateClient",
              JSON.stringify(clientToRestore),
            );
          }
        } catch (error) {
          console.error("AUTO-RECOVERY: Failed to restore client data:", error);
        }
      }
    };

    // Run auto-recovery after a short delay to ensure clients are loaded
    const timeoutId = setTimeout(autoRecoverClientData, 300);
    return () => clearTimeout(timeoutId);
  }, [clients, estimate.items.length, estimate.client]);

  // Check email verification status on component load
  useEffect(() => {
    const checkEmailStatus = async () => {
      try {
        const result = await checkEmailVerification();
        setEmailVerified(result.verified);
      } catch (error) {
        console.error("Error checking email verification:", error);
        setEmailVerified(false);
      }
    };

    checkEmailStatus();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      const clientsData = await getFirebaseClients();
      // @ts-ignore - Temporarily disable type checking for client mapping
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading clients from Firebase:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadMaterials = async () => {
    if (!currentUser) return;

    try {
      setIsLoadingMaterials(true);
      const materialsRef = collection(db, "materials");
      const q = query(materialsRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);

      const materialsData: Material[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Material, "id">;
        const material: Material = {
          id: doc.id,
          ...data,
          price: typeof data.price === "number" ? data.price : 0,
        };
        materialsData.push(material);
      });

      setMaterials(materialsData);
    } catch (error) {
      console.error("Error loading materials from Firebase:", error);
      toast({
        title: "Error",
        description: "Could not load materials",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const loadContractorProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setContractor(data);
      }
    } catch (error) {
      console.error("Error loading contractor profile:", error);
    }
  };

  // Load saved estimates from Firebase
  const loadSavedEstimates = async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoadingEstimates(true);
      console.log("📥 Cargando estimados desde Firebase...");

      // Import Firebase functions
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../lib/firebase");

      let allEstimates = [];

      // Try loading from projects collection first (simpler query)
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

            // Better data extraction with multiple fallback paths
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

            // Better total calculation with multiple paths
            let totalValue =
              data.projectTotalCosts?.totalSummary?.finalTotal ||
              data.projectTotalCosts?.total ||
              data.total ||
              data.estimateAmount ||
              0;

            // No conversion - keep original values as they are stored
            const displayTotal = totalValue;

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
              total: displayTotal,
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
              projectId: doc.id,
              pdfUrl: data.pdfUrl || null,
              originalData: data, // Store original data for editing
            };
          });

        allEstimates = [...allEstimates, ...projectEstimates];
        console.log(
          `📊 Cargados ${projectEstimates.length} estimados desde proyectos`,
        );
      } catch (projectError) {
        console.warn(
          "No se pudieron cargar estimados desde proyectos:",
          projectError,
        );
      }

      // Try loading from estimates collection (if it exists)
      try {
        const estimatesQuery = query(
          collection(db, "estimates"),
          where("firebaseUserId", "==", currentUser.uid),
        );

        const estimatesSnapshot = await getDocs(estimatesQuery);
        const firebaseEstimates = estimatesSnapshot.docs.map((doc) => {
          const data = doc.data();

          // Better data extraction for estimates collection
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

          // Better total calculation
          let totalValue =
            data.projectTotalCosts?.totalSummary?.finalTotal ||
            data.projectTotalCosts?.total ||
            data.total ||
            data.estimateAmount ||
            0;

          // No conversion - keep original values as they are stored
          const displayTotal = totalValue;

          const projectTitle =
            data.projectDetails?.name ||
            data.title ||
            data.projectName ||
            `Estimado para ${clientName}`;

          return {
            id: doc.id,
            estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
            title: projectTitle,
            clientName: clientName,
            clientEmail: clientEmail,
            total: displayTotal,
            status: data.status || "draft",
            estimateDate: data.createdAt
              ? data.createdAt.toDate?.() || new Date(data.createdAt)
              : new Date(),
            items:
              data.projectTotalCosts?.materialCosts?.items || data.items || [],
            projectType:
              data.projectType ||
              data.projectDetails?.type ||
              data.fenceType ||
              "fence",
            projectId: data.projectId || doc.id,
            pdfUrl: data.pdfUrl || null,
            originalData: data, // Store original data for editing
          };
        });

        allEstimates = [...allEstimates, ...firebaseEstimates];
        console.log(
          `📋 Cargados ${firebaseEstimates.length} estimados adicionales`,
        );
      } catch (estimatesError) {
        console.warn(
          "No se pudieron cargar estimados desde colección estimates:",
          estimatesError,
        );
      }

      // Deduplicate and sort
      const uniqueEstimates = allEstimates
        .filter(
          (estimate, index, self) =>
            index ===
            self.findIndex((e) => e.estimateNumber === estimate.estimateNumber),
        )
        .sort(
          (a, b) =>
            new Date(b.estimateDate).getTime() -
            new Date(a.estimateDate).getTime(),
        );

      setSavedEstimates(uniqueEstimates);
      console.log(
        `✅ Total: ${uniqueEstimates.length} estimados únicos cargados`,
      );

      // Debug: Log the first few estimates to see their data structure
      if (uniqueEstimates.length > 0) {
        console.log(
          "📋 Muestra de estimados cargados:",
          uniqueEstimates.slice(0, 3).map((est) => ({
            estimateNumber: est.estimateNumber,
            clientName: est.clientName,
            total: est.total,
            title: est.title,
            rawData: est.originalData
              ? {
                  clientInfo: est.originalData.clientInformation,
                  totalCosts: est.originalData.projectTotalCosts,
                  directTotal: est.originalData.total,
                  totalSummary:
                    est.originalData.projectTotalCosts?.totalSummary,
                  hasCentsField:
                    !!est.originalData.projectTotalCosts?.totalSummary
                      ?.finalTotalCents,
                }
              : null,
          })),
        );
      }

      if (uniqueEstimates.length === 0) {
        toast({
          title: "Sin estimados",
          description:
            "No se encontraron estimados guardados. Crea tu primer estimado para verlo aquí.",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("❌ Error cargando estimados:", error);
      toast({
        title: "Error al cargar estimados",
        description:
          "No se pudieron cargar los estimados guardados. Verifica tu conexión.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEstimates(false);
    }
  };

  // Simple edit function that matches Projects.tsx exactly
  const handleEditEstimate = (projectId: string) => {
    window.location.href = `/estimates?edit=${projectId}`;
  };

  // AI Enhancement Function - Using new Mervin Working Effect
  const enhanceProjectWithAI = async () => {
    if (!estimate.projectDetails.trim()) {
      toast({
        title: "Descripción Requerida",
        description: "Por favor describe tu proyecto para usar Mervin AI",
        variant: "destructive",
      });
      return;
    }

    setIsAIProcessing(true);
    setShowMervinWorking(true);

    try {
      console.log("🤖 Starting Mervin AI enhancement...");

      const response = await fetch("/api/ai-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: estimate.projectDetails,
          projectType: "construction estimate",
        }),
      });

      if (!response.ok) {
        throw new Error("Error al procesar con Mervin AI");
      }

      const result = await response.json();
      console.log("✅ Mervin AI Response:", result);

      if (result.enhancedDescription) {
        setEstimate((prev) => ({
          ...prev,
          projectDetails: result.enhancedDescription,
        }));

        toast({
          title: "✨ Mejorado con Mervin AI",
          description:
            "La descripción del proyecto ha sido mejorada profesionalmente",
        });
      } else {
        throw new Error("No se pudo generar contenido mejorado");
      }
    } catch (error) {
      console.error("Error enhancing with AI:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar con Mervin AI. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsAIProcessing(false);
      setShowMervinWorking(false);
    }
  };

  // Load project for editing
  const loadProjectForEdit = async (projectId: string) => {
    if (!currentUser) return;

    try {
      toast({
        title: "Cargando datos del proyecto...",
        description: "Preparando estimado para edición",
      });

      // Import Firebase functions
      const { collection, query, where, getDocs, doc, getDoc } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../lib/firebase");

      console.log("🔍 Buscando proyecto con ID:", projectId);

      // First try to get from projects collection
      let projectData = null;
      try {
        const projectDocRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectDocRef);

        if (projectSnap.exists()) {
          projectData = { id: projectSnap.id, ...projectSnap.data() };
          console.log(
            "📄 Proyecto encontrado en colección projects:",
            projectData,
          );
        }
      } catch (error) {
        console.warn("No se pudo cargar desde projects collection:", error);
      }

      // If not found, try estimates collection
      if (!projectData) {
        try {
          const estimateDocRef = doc(db, "estimates", projectId);
          const estimateSnap = await getDoc(estimateDocRef);

          if (estimateSnap.exists()) {
            projectData = { id: estimateSnap.id, ...estimateSnap.data() };
            console.log(
              "📋 Proyecto encontrado en colección estimates:",
              projectData,
            );
          }
        } catch (error) {
          console.warn("No se pudo cargar desde estimates collection:", error);
        }
      }

      if (projectData) {
        // Find matching client
        let clientData = null;
        const clientName =
          projectData.clientName || projectData.clientInformation?.name;

        if (clientName && clients.length > 0) {
          clientData = clients.find((c) => c.name === clientName);
        }

        // Create client object if not found in database
        if (!clientData && clientName) {
          clientData = {
            id: "temp-" + Date.now(),
            clientId: "temp-" + Date.now(),
            name: clientName,
            email:
              projectData.clientEmail ||
              projectData.clientInformation?.email ||
              null,
            phone:
              projectData.clientPhone ||
              projectData.clientInformation?.phone ||
              null,
            address:
              projectData.address ||
              projectData.clientInformation?.address ||
              null,
            city:
              projectData.clientCity ||
              projectData.clientInformation?.city ||
              null,
            state:
              projectData.clientState ||
              projectData.clientInformation?.state ||
              null,
            zipCode:
              projectData.clientZipCode ||
              projectData.clientInformation?.zipCode ||
              null,
            notes: null,
          };
        }

        // Parse estimate items from project data with better price handling
        let estimateItems: EstimateItem[] = [];

        console.log("💰 DATOS COMPLETOS DEL PROYECTO:", projectData);
        console.log("💰 Analizando datos de precios del proyecto:", {
          items: projectData.items,
          materialCosts: projectData.projectTotalCosts?.materialCosts,
          estimateHtml: !!projectData.estimateHtml,
        });

        // Log raw price data for debugging
        if (projectData.items) {
          console.log("📊 PRECIOS RAW en items array:");
          projectData.items.forEach((item: any, i: number) => {
            console.log(`  Item ${i}:`, {
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              price: item.price,
              total: item.total || item.totalPrice,
              rawData: item,
            });
          });
        }

        // Priority 1: Try materialCosts.items (most structured)
        if (projectData.projectTotalCosts?.materialCosts?.items) {
          estimateItems = projectData.projectTotalCosts.materialCosts.items.map(
            (item: any, index: number) => {
              const quantity = parseFloat(item.quantity || item.qty || 1);
              const rawPrice = parseFloat(
                item.unitPrice || item.price || item.pricePerUnit || 0,
              );
              const rawTotal = parseFloat(item.total || item.totalPrice || 0);

              // NORMALIZAR PRECIOS: Aplicar conversión inteligente
              let price = rawPrice;
              let total = rawTotal;
              
              // Si el precio es mayor a 1000, probablemente está en centavos
              if (rawPrice > 1000) {
                price = rawPrice / 100;
              }
              
              // Si el total es mayor a 1000, probablemente está en centavos
              if (rawTotal > 1000) {
                total = rawTotal / 100;
              }
              
              // Si no hay total, calcularlo correctamente
              if (!total || total === 0) {
                total = price * quantity;
              }

              return {
                id: item.id || `item-${index}`,
                materialId: item.materialId || "",
                name: item.name || item.description || "Material",
                description: item.description || item.name || "",
                quantity,
                price,
                unit: item.unit || item.unitType || "unidad",
                total,
              };
            },
          );
          console.log(
            "✅ Items cargados desde materialCosts.items:",
            estimateItems,
          );
        }
        // Priority 2: Try direct items array
        else if (projectData.items && Array.isArray(projectData.items)) {
          estimateItems = projectData.items.map((item: any, index: number) => {
            const quantity = parseFloat(item.quantity || 1);
            const rawPrice = parseFloat(item.unitPrice || item.price || 0);
            const rawTotal = parseFloat(item.totalPrice || item.total || 0);

            // NORMALIZAR PRECIOS: Aplicar conversión inteligente
            let price = rawPrice;
            let total = rawTotal;
            
            // Si el precio es mayor a 1000, probablemente está en centavos
            if (rawPrice > 1000) {
              price = rawPrice / 100;
            }
            
            // Si el total es mayor a 1000, probablemente está en centavos
            if (rawTotal > 1000) {
              total = rawTotal / 100;
            }
            
            // Si no hay total, calcularlo correctamente
            if (!total || total === 0) {
              total = price * quantity;
            }

            return {
              id: item.id || `item-${index}`,
              materialId: item.materialId || "",
              name: item.name || item.description || "Material",
              description: item.description || "",
              quantity,
              price,
              unit: item.unit || "unidad",
              total,
            };
          });
          console.log("✅ Items cargados desde items array:", estimateItems);
        }
        // Priority 3: Try to parse from HTML
        else if (projectData.estimateHtml) {
          estimateItems = parseEstimateItemsFromHtml(projectData.estimateHtml);
          console.log("✅ Items parseados desde HTML:", estimateItems);
        }

        // Ensure we have valid items with prices
        if (estimateItems.length === 0) {
          // Create a basic item so user can edit
          estimateItems = [
            {
              id: "item-1",
              materialId: "",
              name: "Material a definir",
              description: "Material del proyecto original",
              quantity: 1,
              price: 0,
              unit: "unidad",
              total: 0,
            },
          ];
          console.log(
            "⚠️ No se encontraron items, creando item básico para edición",
          );
        }

        // Get project total and details
        const projectTotal =
          projectData.total ||
          projectData.projectTotalCosts?.total ||
          projectData.estimateAmount ||
          estimateItems.reduce((sum, item) => sum + item.total, 0);

        const projectDetails =
          projectData.projectDescription ||
          projectData.projectScope ||
          projectData.scope ||
          projectData.notes ||
          `Proyecto de ${projectData.projectType || "cerca"} para ${clientName}`;

        // Set estimate data
        setEstimate({
          client: clientData,
          items: estimateItems,
          projectDetails,
          subtotal: 0, // Will be recalculated by useEffect
          tax: 0, // Will be recalculated by useEffect
          total: 0, // Will be recalculated by useEffect
          taxRate:
            projectData.taxRate > 100
              ? projectData.taxRate / 100
              : projectData.taxRate || 10,
          discountType: "percentage",
          discountValue: 0,
          discountAmount: 0,
          discountName: "",
        });

        console.log("🎯 Estimate configurado:", {
          client: clientData?.name,
          itemsCount: estimateItems.length,
          projectDetails,
          originalTotal: projectTotal,
        });

        // Jump to materials step (step 2) since client and details are loaded
        setCurrentStep(2);

        toast({
          title: "Proyecto cargado exitosamente",
          description: `${estimateItems.length} materiales listos para editar`,
        });
      } else {
        throw new Error("Proyecto no encontrado");
      }
    } catch (error) {
      console.error("Error loading project for edit:", error);
      toast({
        title: "Error al cargar proyecto",
        description: "No se pudieron cargar los datos del proyecto",
        variant: "destructive",
      });
    }
  };

  // Helper function to parse estimate items from HTML
  const parseEstimateItemsFromHtml = (html: string): EstimateItem[] => {
    const items: EstimateItem[] = [];

    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const rows = tempDiv.querySelectorAll("tr");

      rows.forEach((row, index) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 4) {
          const name = cells[0]?.textContent?.trim() || "";
          const quantity = parseFloat(cells[1]?.textContent?.trim() || "0");
          const price = parseFloat(
            cells[2]?.textContent?.replace(/[^0-9.]/g, "") || "0",
          );
          const total = parseFloat(
            cells[3]?.textContent?.replace(/[^0-9.]/g, "") || "0",
          );

          if (name && quantity > 0 && price > 0) {
            items.push({
              id: `item-${index}`,
              materialId: "",
              name,
              description: "",
              quantity,
              price,
              unit: "unidad",
              total,
            });
          }
        }
      });
    } catch (error) {
      console.error("Error parsing estimate items from HTML:", error);
    }

    return items;
  };

  // Navigation
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0:
        return estimate.client !== null;
      case 1:
        return estimate.projectDetails.trim().length > 0;
      case 2:
        return estimate.items.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Robust save function that syncs to Firebase and projects dashboard
  const handleSaveEstimate = async () => {
    if (!currentUser?.uid) {
      toast({
        title: "Error de autenticación",
        description: "Debes estar conectado para guardar estimados",
        variant: "destructive",
      });
      return;
    }

    if (!estimate.client || estimate.items.length === 0) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona un cliente y agrega al menos un material",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Generate HTML content first (fallback if needed)
      let htmlContent = "";
      try {
        htmlContent = generateEstimatePreview();
      } catch (htmlError) {
        console.warn(
          "Error generating HTML preview, using basic format:",
          htmlError,
        );
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Estimado para ${estimate.client.name}</h1>
            <p>Cliente: ${estimate.client.name}</p>
            <p>Email: ${estimate.client.email || "No especificado"}</p>
            <p>Proyecto: ${estimate.projectDetails}</p>
            <h3>Materiales:</h3>
            <ul>
              ${estimate.items
                .map(
                  (item) => `
                <li>${item.name} - ${item.quantity} ${item.unit} x $${item.price.toFixed(2)} = $${item.total.toFixed(2)}</li>
              `,
                )
                .join("")}
            </ul>
            <p><strong>Total: $${estimate.total.toFixed(2)}</strong></p>
          </div>
        `;
      }

      // 2. Prepare complete estimate data for Firebase and backend
      const estimateNumber = `EST-${Date.now()}`;

      // Get contractor data from profile
      const contractorData = {
        company: profile?.company || "Your Company",
        companyAddress: profile?.address || "",
        companyCity: profile?.city || "",
        companyState: profile?.state || "",
        companyZip: profile?.zipCode || "",
        companyPhone: profile?.phone || "",
        companyEmail: profile?.email || currentUser?.email || "",
        companyLicense: profile?.license || "",
        companyLogo: profile?.logo || null,
      };

      const estimateData = {
        // Firebase user association
        firebaseUserId: currentUser.uid,
        userId: currentUser.uid,

        // Basic info with complete identification
        estimateNumber: estimateNumber,
        title: `Estimado para ${estimate.client.name}`,
        status: "draft",
        date: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),

        // Complete client information
        clientId: estimate.client.id,
        clientName: estimate.client.name,
        clientEmail: estimate.client.email || "",
        clientPhone: estimate.client.phone || "",
        clientAddress: estimate.client.address || "",
        clientCity: estimate.client.city || "",
        clientState: estimate.client.state || "",
        clientZipCode: estimate.client.zipCode || "",

        // Complete contractor information
        contractorCompanyName: contractorData.company,
        contractorAddress: contractorData.companyAddress,
        contractorCity: contractorData.companyCity,
        contractorState: contractorData.companyState,
        contractorZip: contractorData.companyZip,
        contractorPhone: contractorData.companyPhone,
        contractorEmail: contractorData.companyEmail,
        contractorLicense: contractorData.companyLicense,
        contractorLogo: contractorData.companyLogo,

        // Complete project details
        projectType: "fence",
        projectSubtype: "custom",
        projectDescription:
          estimate.projectDetails || "Proyecto de cerca personalizado",
        scope:
          estimate.projectDetails ||
          "Instalación completa según especificaciones",
        timeline: "2-3 semanas",
        notes: `Estimado generado el ${new Date().toLocaleDateString()}`,

        // Complete financial data with proper calculations
        items: estimate.items.map((item, index) => ({
          id: item.id,
          materialId: item.materialId,
          name: item.name,
          description: item.description || item.name,
          category: "material",
          quantity: item.quantity,
          unit: item.unit || "unit",
          unitPrice: Math.round(item.price * 100), // Store in cents
          totalPrice: Math.round(item.total * 100), // Store in cents
          sortOrder: index,
          isOptional: false,
        })),

        // Financial totals (stored in cents for precision)
        subtotal: Math.round(estimate.subtotal * 100),
        taxRate: Math.round((estimate.taxRate || 10) * 100), // Store as basis points
        taxAmount: Math.round(estimate.tax * 100),
        
        // CRÍTICO: Guardar información completa de descuentos
        discount: Math.round((estimate.discountAmount || 0) * 100), // Store discount amount in cents
        discountType: estimate.discountType || "percentage",
        discountValue: estimate.discountValue || 0,
        discountAmount: Math.round((estimate.discountAmount || 0) * 100),
        discountName: estimate.discountName || "",
        
        total: Math.round(estimate.total * 100),

        // Display-friendly totals (for dashboard compatibility)
        displaySubtotal: estimate.subtotal,
        displayTax: estimate.tax,
        displayTotal: estimate.total,
        displayDiscountAmount: estimate.discountAmount || 0,

        // Additional metadata for dashboard
        itemsCount: estimate.items.length,
        estimateDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("💾 Guardando estimado completo:", {
        estimateNumber,
        clientName: estimateData.clientName,
        contractorCompany: estimateData.contractorCompanyName,
        totalItems: estimateData.items.length,
        subtotal: estimateData.displaySubtotal,
        total: estimateData.displayTotal,
      });

      // Guardar también en Firebase para máxima compatibilidad
      try {
        const firebaseDoc = {
          ...estimateData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: "estimate",
          source: "estimates-wizard",
        };

        const estimateRef = await addDoc(
          collection(db, "estimates"),
          firebaseDoc,
        );
        console.log("✅ También guardado en Firebase:", estimateRef.id);

        const projectRef = await addDoc(collection(db, "projects"), {
          ...firebaseDoc,
          projectId: estimateData.projectId,
          status: "estimate",
          type: "project",
        });
        console.log("✅ Proyecto creado en Firebase:", projectRef.id);
      } catch (firebaseError) {
        console.warn(
          "⚠️ No se pudo guardar en Firebase, pero PostgreSQL funcionó:",
          firebaseError,
        );
      }

      console.log("💾 Guardando estimado:", estimateData);

      // 3. Save directly to Firebase (primary storage)
      console.log("💾 Guardando directamente en Firebase...");

      const estimateDoc = {
        ...estimateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: "estimate",
        source: "estimates-wizard",
      };

      // Save to Firebase estimates collection
      const estimateRef = await addDoc(
        collection(db, "estimates"),
        estimateDoc,
      );
      console.log(
        "✅ Estimado guardado en Firebase estimates:",
        estimateRef.id,
      );

      // Also save to Firebase projects collection for dashboard integration
      const projectDoc = {
        ...estimateData,
        projectId: estimateRef.id,
        estimateId: estimateRef.id,
        type: "project",
        source: "estimate",
        status: "estimate",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projectRef = await addDoc(collection(db, "projects"), projectDoc);
      console.log("✅ Estimado guardado en Firebase projects:", projectRef.id);

      // 4. Save to localStorage as final backup
      try {
        const localData = {
          ...estimateData,
          savedAt: new Date().toISOString(),
          estimateId: estimateRef.id,
          projectId: projectRef.id,
        };

        const existingEstimates = JSON.parse(
          localStorage.getItem("savedEstimates") || "[]",
        );
        existingEstimates.push(localData);
        localStorage.setItem(
          "savedEstimates",
          JSON.stringify(existingEstimates),
        );
        console.log("✅ Estimado guardado en localStorage como respaldo");
      } catch (localError) {
        console.warn("⚠️ No se pudo guardar en localStorage:", localError);
      }

      // 5. Success feedback
      toast({
        title: "✅ Estimado guardado exitosamente",
        description: `${estimateNumber} se guardó en tus estimados y proyectos`,
        duration: 5000,
      });

      // 6. Optional: Auto-advance to preview
      if (currentStep === 3) {
        setPreviewHtml(htmlContent);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("❌ Error guardando estimado:", error);

      // 7. Fallback: Try to save minimal data locally or show helpful error
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      toast({
        title: "Error al guardar",
        description: `No se pudo guardar el estimado: ${errorMessage}. Los datos se mantienen en la sesión actual.`,
        variant: "destructive",
        duration: 8000,
      });

      // Try to save to localStorage as absolute fallback
      try {
        const fallbackData = {
          estimate,
          timestamp: new Date().toISOString(),
          userId: currentUser.uid,
        };
        localStorage.setItem(
          `estimate_fallback_${Date.now()}`,
          JSON.stringify(fallbackData),
        );
        console.log("💾 Fallback: Datos guardados localmente");
      } catch (localError) {
        console.error("❌ Error incluso en fallback local:", localError);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filter clients and materials
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (client.email &&
        client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
      (client.phone && client.phone.includes(clientSearch)) ||
      (client.mobilePhone && client.mobilePhone.includes(clientSearch)),
  );

  const filteredMaterials = materials.filter(
    (material) =>
      material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.description
        .toLowerCase()
        .includes(materialSearch.toLowerCase()) ||
      material.category.toLowerCase().includes(materialSearch.toLowerCase()),
  );

  // Client selection
  const selectClient = (client: Client) => {
    console.log("📋 Client selected with full data:", {
      name: client.name,
      address: client.address,
      city: client.city,
      state: client.state,
      zipCode: client.zipCode || client.zipcode,
      email: client.email,
      phone: client.phone,
    });

    // Enhanced client object with proper address parsing
    const enhancedClient = {
      ...client,
      // Parse address if it's in format "street, city state zip"
      ...(client.address && client.address.includes(",") && !client.city
        ? (() => {
            const parts = client.address.split(",");
            if (parts.length >= 2) {
              const street = parts[0].trim();
              const cityStateZip = parts[1].trim();
              const lastSpace = cityStateZip.lastIndexOf(" ");
              if (lastSpace > 0) {
                const cityState = cityStateZip.substring(0, lastSpace).trim();
                const zip = cityStateZip.substring(lastSpace + 1).trim();
                const stateSpace = cityState.lastIndexOf(" ");
                if (stateSpace > 0) {
                  return {
                    address: street,
                    city: cityState.substring(0, stateSpace).trim(),
                    state: cityState.substring(stateSpace + 1).trim(),
                    zipCode: zip,
                  };
                }
              }
            }
            return {};
          })()
        : {}),
    };

    // Save to localStorage for persistence and auto-recovery
    localStorage.setItem("lastUsedClientId", client.id);
    localStorage.setItem(
      "currentEstimateClient",
      JSON.stringify(enhancedClient),
    );

    setEstimate((prev) => ({ ...prev, client: enhancedClient }));
    setIsEditingClient(false); // Close editing mode when new client is selected

    console.log(
      "✅ CLIENT PERSISTENCE: Client saved to localStorage and state",
    );

    toast({
      title: "Client Selected",
      description: `${client.name} has been added to the estimate`,
      duration: 3000,
    });
  };

  // Create new client manually
  const createNewClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast({
        title: "Datos Requeridos",
        description: "Nombre y email son requeridos",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser?.uid) {
      toast({
        title: "Error de Autenticación",
        description: "Usuario no autenticado. Por favor, inicia sesión.",
        variant: "destructive",
      });
      return;
    }

    try {
      const clientData = {
        clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId: currentUser.uid, // Esta es la clave que faltaba
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone || "",
        mobilePhone: "",
        address: newClient.address || "",
        city: newClient.city || "",
        state: newClient.state || "",
        zipCode: newClient.zipCode || "",
        notes: newClient.notes || "",
        source: "Manual - Estimates",
        classification: "cliente",
        tags: [],
      };

      console.log("💾 Guardando nuevo cliente:", clientData);
      const savedClient = await saveClient(clientData);
      console.log("✅ Cliente guardado exitosamente:", savedClient);

      const clientWithId = {
        id: savedClient.id,
        ...clientData,
        createdAt: savedClient.createdAt || new Date(),
        updatedAt: savedClient.updatedAt || new Date(),
      };

      // Actualizar la lista local de clientes
      setClients((prev) => [clientWithId, ...prev]);

      // Seleccionar el cliente recién creado
      setEstimate((prev) => ({ ...prev, client: clientWithId }));

      // Limpiar el formulario
      setNewClient({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        notes: "",
      });

      // Cerrar el diálogo
      setShowAddClientDialog(false);

      toast({
        title: "✅ Cliente Creado Exitosamente",
        description: `${clientData.name} ha sido guardado y seleccionado para este estimado`,
        duration: 4000,
      });

      // Forzar recarga de clientes para sincronizar
      setTimeout(() => {
        loadClients();
      }, 1000);
    } catch (error) {
      console.error("❌ Error creating client:", error);
      toast({
        title: "Error al Crear Cliente",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo crear el cliente. Verifica tu conexión e intenta nuevamente.",
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  // Add material to estimate
  const addMaterialToEstimate = (material: Material) => {
    const estimateItem: EstimateItem = {
      id: `item-${Date.now()}`,
      materialId: material.id,
      name: material.name,
      description: material.description || "",
      quantity: 1,
      price: material.price,
      unit: material.unit || "unit",
      total: material.price * 1,
    };

    setEstimate((prev) => ({
      ...prev,
      items: [...prev.items, estimateItem],
    }));

    setShowMaterialDialog(false);

    toast({
      title: "Material Added",
      description: `${material.name} has been added to the estimate`,
    });
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    console.log("🔍 UPDATE QUANTITY DEBUG - Starting", {
      itemId,
      newQuantity,
    });

    setEstimate((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const newTotal = item.price * newQuantity;
          console.log("🔍 UPDATE QUANTITY DEBUG - Item calculation", {
            itemName: item.name,
            itemPrice: item.price,
            oldQuantity: item.quantity,
            newQuantity,
            oldTotal: item.total,
            newTotal,
            calculation: `${item.price} × ${newQuantity} = ${newTotal}`
          });
          
          return { ...item, quantity: newQuantity, total: newTotal };
        }
        return item;
      }),
    }));
  };

  // Update item price
  const updateItemPrice = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return;

    setEstimate((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? { ...item, price: newPrice, total: newPrice * item.quantity }
          : item,
      ),
    }));
  };

  // Update item description
  const updateItemDescription = (itemId: string, newDescription: string) => {
    setEstimate((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, description: newDescription } : item,
      ),
    }));
  };

  // Remove item from estimate
  const removeItemFromEstimate = (itemId: string) => {
    setEstimate((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));

    toast({
      title: "Material Removed",
      description: "The material has been removed from the estimate",
      duration: 3000,
    });
  };

  // Generate estimate preview with validation and authority
  const generateEstimatePreview = () => {
    // USAR EXACTAMENTE LOS MISMOS CAMPOS QUE EL PDF
    // Validación usando profile.company (no companyName)
    const missingData = [];
    if (!estimate.client) missingData.push("Cliente");
    if (estimate.items.length === 0) missingData.push("Materiales");
    if (!estimate.projectDetails || estimate.projectDetails.trim() === "")
      missingData.push("Detalles del proyecto");
    if (!profile?.company) missingData.push("Nombre de empresa");

    // Si falta información crítica, mostrar alerta
    if (missingData.length > 0) {
      const alertHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; border: 3px solid #f59e0b;">
          <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0;">
              ⚠️ Preview Incompleto - Información Faltante
            </h3>
            <p style="color: #92400e; margin: 10px 0;">Para generar un preview completo del PDF, necesitas completar:</p>
            <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
              ${missingData.map((item) => `<li style="margin: 5px 0;">${item}</li>`).join("")}
            </ul>
            <p style="color: #92400e; margin: 10px 0; font-weight: bold;">
              Completa tu perfil para ver el preview exacto del PDF.
            </p>
          </div>
          ${generateBasicPreview()}
        </div>
      `;
      setPreviewHtml(alertHtml);
      return alertHtml;
    }

    // Generar estimado completo
    const estimateNumber = `EST-${Date.now()}`;
    const estimateDate = new Date().toLocaleDateString();

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header with Company Info and Logo -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="flex: 1;">
            ${profile?.logo ? `<img src="${profile.logo}" alt="Company Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />` : `<div style="width: 120px; height: 80px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; color: #666; font-size: 14px;">Logo</div>`}
            <h2 style="margin: 0; color: #2563eb; font-size: 1.5em;">${profile?.company || ""}</h2>
            <p style="margin: 5px 0; color: #666;">
              ${profile?.address ? `${profile.address}${profile.city ? ", " + profile.city : ""}${profile.state ? ", " + profile.state : ""}${profile.zipCode ? " " + profile.zipCode : ""}` : ""}<br>
              ${profile?.phone || ""}<br>
              ${profile?.email || ""}
            </p>
            ${profile?.website ? `<p style="margin: 5px 0; color: #2563eb;">${profile.website}</p>` : ""}
            ${profile?.license ? `<p style="margin: 5px 0; font-size: 0.9em; color: #666;">License: ${profile.license}</p>` : ""}
          </div>
          
          <div style="text-align: right;">
            <h1 style="margin: 0; color: #2563eb; font-size: 2.2em;">PROFESSIONAL ESTIMATE</h1>
            <p style="margin: 10px 0; font-size: 1.1em;"><strong>Estimate #:</strong> ${estimateNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${estimateDate}</p>
          </div>
        </div>
        
        <!-- Client Information -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1; padding-right: 20px;">
            <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">BILL TO:</h3>
            <p style="margin: 5px 0; font-size: 1.1em; color: #000000;"><strong>${estimate.client?.name || "Client not specified"}</strong></p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.email || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.phone || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.address || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.city ? `${estimate.client.city}, ` : ""}${estimate.client?.state || ""} ${estimate.client?.zipCode || ""}</p>
          </div>
        </div>

        <!-- Project Details -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">MATERIALS AND SERVICES:</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; line-height: 1.6;">
            ${estimate.projectDetails.replace(/\n/g, "<br>")}
          </div>
        </div>

        <!-- Materials & Labor Table -->
        <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: left; font-weight: bold;">Description</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Qty.</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Unit</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Unit Price</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${estimate.items
              .map(
                (item, index) => `
              <tr style="background: ${index % 2 === 0 ? "#f8fafc" : "#ffffff"};">
                <td style="border: 1px solid #ddd; padding: 12px; color: #000000;">
                  <strong>${item.name}</strong>
                  ${item.description ? `<br><small style="color: #333333;">${item.description}</small>` : ""}
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.unit}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; color: #000000;">$${item.price.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; color: #000000;">$${item.total.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="text-align: right; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
          <div style="margin-bottom: 10px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Subtotal:</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.subtotal.toFixed(2)}</span>
          </div>
          ${
            estimate.discountAmount > 0
              ? `
            <div style="margin-bottom: 10px; font-size: 1.1em; color: #22c55e;">
              <span style="margin-right: 40px; color: #22c55e;"><strong>Discount ${estimate.discountName ? "(" + estimate.discountName + ")" : ""} (${estimate.discountType === "percentage" ? estimate.discountValue + "%" : "Fixed"}):</strong></span>
              <span style="font-weight: bold; color: #22c55e;">-$${estimate.discountAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          <div style="margin-bottom: 15px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Tax (${estimate.taxRate}%):</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.tax.toFixed(2)}</span>
          </div>
          <div style="border-top: 2px solid #2563eb; padding-top: 15px; font-size: 1.3em; color: #2563eb;">
            <span style="margin-right: 40px; color: #2563eb;"><strong>TOTAL:</strong></span>
            <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">$${estimate.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 0.9em;">
          <p style="margin: 10px 0;"><strong>This estimate is valid for 30 days from the date shown above.</strong></p>
          <p style="margin: 10px 0;">Thank you for considering ${profile?.company || "our company"} for your project!</p>
          ${profile?.insurancePolicy ? `<p style="margin: 5px 0;">Fully Insured - Policy #: ${profile.insurancePolicy}</p>` : ""}
        </div>
      </div>
    `;

    setPreviewHtml(html);
    return html;
  };

  // Función auxiliar para generar preview básico cuando faltan datos
  const generateBasicPreview = () => {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9fafb; opacity: 0.7;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #6b7280;">Estimate Preview</h2>
          <p style="color: #6b7280;">Complete the information to see the final estimate</p>
        </div>
        
        <div style="border: 2px dashed #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #6b7280;">Company Information</h3>
          <p style="color: #6b7280;">${profile?.company || "[Complete su perfil - nombre de empresa requerido]"}</p>
        </div>
        
        <div style="border: 2px dashed #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #6b7280;">Client</h3>
          <p style="color: #6b7280;">${estimate.client?.name || "[Client required]"}</p>
        </div>
        
        <div style="border: 2px dashed #d1d5db; padding: 20px; border-radius: 8px;">
          <h3 style="color: #6b7280;">Materials and Services</h3>
          <p style="color: #6b7280;">${estimate.items.length > 0 ? `${estimate.items.length} materials added` : "[Materials required]"}</p>
        </div>
      </div>
    `;
  };

  // Save estimate to database
  const saveEstimate = async () => {
    try {
      console.log("💾 Iniciando guardado del estimado...");

      // Asegurar que tenemos datos mínimos
      if (!estimate.client || estimate.items.length === 0) {
        toast({
          title: "⚠️ Datos Incompletos",
          description: "Necesitas seleccionar un cliente y agregar materiales",
          variant: "destructive",
          duration: 3000,
        });
        return null;
      }

      // 🚀 DATOS COMPLETOS PARA TRANSFERENCIA AL DASHBOARD
      // Obtener información completa del contratista desde el perfil del usuario
      const contractorInfo = {
        company: profile?.company || "Sin nombre de empresa",
        name: profile?.ownerName || profile?.displayName || "Sin nombre",
        email: profile?.email || currentUser?.email || "Sin email",
        phone: profile?.phone || "Sin teléfono",
        address: profile?.address || "Sin dirección",
        city: profile?.city || "Sin ciudad",
        state: profile?.state || "CA",
        zip: profile?.zipCode || "00000",
        license: profile?.licenseNumber || "",
        insurancePolicy: profile?.insurancePolicy || "",
        logoUrl: profile?.logoUrl || "",
        website: profile?.website || "",
        yearsInBusiness: profile?.yearsInBusiness || "N/A",
      };

      const estimateData = {
        // ===== IDENTIFICACIÓN Y METADATOS =====
        firebaseUserId: currentUser?.uid || "dev-user-123",
        estimateNumber: `EST-${Date.now()}`,
        projectId: `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        status: "estimate",
        createdAt: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),

        // ===== CLIENT INFORMATION - Datos estructurados del cliente =====
        clientInformation: {
          id: estimate.client.id || null,
          name: estimate.client.name || "",
          email: estimate.client.email || "",
          phone: estimate.client.phone || "",
          address: estimate.client.address || "",
          city: estimate.client.city || "",
          state: estimate.client.state || "",
          zipCode: estimate.client.zipCode || "",
          fullAddress:
            `${estimate.client.address || ""}, ${estimate.client.city || ""}, ${estimate.client.state || ""} ${estimate.client.zipCode || ""}`.trim(),
          contactPreference: "email",
          lastContact: new Date().toISOString(),
        },

        // ===== CONTRACT INFORMATION - Información del contratista =====
        contractInformation: {
          companyName: contractorInfo.company || "Owl Fence",
          companyAddress: contractorInfo.address || "",
          companyCity: contractorInfo.city || "",
          companyState: contractorInfo.state || "",
          companyZip: contractorInfo.zip || "",
          companyPhone: contractorInfo.phone || "",
          companyEmail: contractorInfo.email || "",
          companyWebsite: contractorInfo.website || "",
          licenseNumber: contractorInfo.license || "",
          insurancePolicy: contractorInfo.insurancePolicy || "",
          logoUrl: contractorInfo.logoUrl || "/owl-logo.png",
          fullAddress:
            `${contractorInfo.address || ""}, ${contractorInfo.city || ""}, ${contractorInfo.state || ""} ${contractorInfo.zip || ""}`.trim(),
          businessType: "Construction Services",
          yearsInBusiness: contractorInfo.yearsInBusiness || "N/A",
        },

        // ===== PROJECT TOTAL COSTS - Desglose completo de costos =====
        projectTotalCosts: {
          materialCosts: {
            items: estimate.items.map((item, index) => ({
              name: item.name,
              description: item.description || item.name,
              category: "material",
              quantity: item.quantity,
              unit: item.unit || "unit",
              unitPrice: item.price,
              totalPrice: item.total,
              unitPriceCents: Math.round(item.price * 100),
              totalPriceCents: Math.round(item.total * 100),
              sortOrder: index,
              isOptional: false,
            })),
            subtotal: estimate.subtotal,
            subtotalCents: Math.round(estimate.subtotal * 100),
            itemsCount: estimate.items.length,
          },
          laborCosts: {
            estimatedHours: Math.ceil(estimate.items.length * 2),
            hourlyRate: 45.0,
            totalLabor: Math.round(estimate.total * 0.3),
            description: "Professional installation and labor services",
          },
          additionalCosts: {
            taxRate: estimate.taxRate || 10,
            taxRateBasisPoints: Math.round((estimate.taxRate || 10) * 100),
            taxAmount: estimate.tax,
            taxAmountCents: Math.round(estimate.tax * 100),
            discountType: estimate.discountType || null,
            discountValue: estimate.discountValue || 0,
            discountAmount: estimate.discountAmount || 0,
            discountAmountCents: Math.round(
              (estimate.discountAmount || 0) * 100,
            ),
          },
          totalSummary: {
            subtotal: estimate.subtotal,
            tax: estimate.tax,
            discount: estimate.discountAmount || 0,
            finalTotal: estimate.total,
            subtotalCents: Math.round(estimate.subtotal * 100),
            taxCents: Math.round(estimate.tax * 100),
            discountCents: Math.round((estimate.discountAmount || 0) * 100),
            finalTotalCents: Math.round(estimate.total * 100),
          },
        },

        // ===== DETALLES DEL PROYECTO =====
        projectDetails: {
          name: `Proyecto para ${estimate.client.name}`,
          type: "fence",
          subtype: "custom",
          description:
            estimate.projectDetails || "Proyecto de cerca personalizado",
          scope: "Instalación completa de cerca",
          timeline: "2-3 semanas",
          startDate: null,
          completionDate: null,
          priority: "normal",
          notes: `Estimado generado el ${new Date().toLocaleDateString()}`,
          terms:
            "Estimado válido por 30 días. Materiales y mano de obra incluidos.",
        },

        // ===== CAMPOS LEGACY PARA COMPATIBILIDAD =====
        clientId: estimate.client.id || null,
        clientName: estimate.client.name || "",
        clientEmail: estimate.client.email || "",
        clientPhone: estimate.client.phone || "",
        contractorCompanyName: contractorInfo.company || "Owl Fence",
        subtotal: Math.round(estimate.subtotal * 100),
        total: Math.round(estimate.total * 100),
        items: estimate.items.map((item, index) => ({
          name: item.name,
          description: item.description || item.name,
          category: "material" as const,
          quantity: item.quantity,
          unit: item.unit || "unit",
          unitPrice: Math.round(item.price * 100),
          totalPrice: Math.round(item.total * 100),
          sortOrder: index,
          isOptional: false,
        })),
        taxRate: estimate.taxRate || 10,
        taxAmount: Math.round(estimate.tax * 100),
        estimateAmount: Math.round(estimate.total * 100),
      };

      console.log("📤 Enviando datos al servidor:", estimateData);

      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateData),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log("✅ Estimado guardado exitosamente:", responseData);
        toast({
          title: "💾 Estimado Guardado",
          description: `Estimado guardado correctamente en la base de datos`,
          duration: 3000,
        });
        return responseData;
      } else {
        console.error("❌ Error del servidor:", responseData);
        throw new Error(responseData.error || "Error al guardar el estimado");
      }
    } catch (error) {
      console.error("❌ Error saving estimate:", error);
      toast({
        title: "❌ Error al Guardar",
        description:
          "No se pudo guardar el estimado. Revisa los datos e inténtalo de nuevo.",
        variant: "destructive",
        duration: 5000,
      });
      return null;
    }
  };

  // Initialize email data when dialog opens
  useEffect(() => {
    if (showEmailDialog && estimate.client) {
      setEmailData({
        toEmail: estimate.client.email || "",
        subject: `🏗️ Your Professional Estimate is Ready - ${profile?.company || profile?.name || "Your Company"}`,
        message: `Dear ${estimate.client.name},

I hope this message finds you well!

It is our pleasure to present your completely customized professional estimate for your "${estimate.projectDetails || "construction project"}".

✨ **Why choose our services?**
• Over ${profile?.yearsInBusiness || "10"} years of proven experience
• Highest quality materials guaranteed
• Team of certified and insured professionals
• Competitive pricing without compromising excellence
• Complete warranty on all our work

💪 **Your project deserves the best**, and we are committed to exceeding your expectations in every detail.

📋 **The attached estimate includes:**
• Detailed analysis of ${estimate.items.length} project items
• Complete technical specifications
• Estimated work timeline
• Total investment: $${estimate.total.toLocaleString()}

🎯 **SPECIAL OFFER VALID UNTIL ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}!**
If you approve this estimate before the deadline, we guarantee the price regardless of market fluctuations.

We are completely at your disposal to clarify any questions or make adjustments you consider necessary. Your satisfaction is our number one priority.

Ready to transform your vision into reality? Contact us today!

Best regards,
${profile?.company || profile?.name || "Your Company"}
📞 ${profile?.phone || "Phone Number"}
📧 ${profile?.email || "Email Address"}
${profile?.website ? `🌐 ${profile.website}` : ""}

**Next steps:**
✅ Review the attached estimate carefully
✅ Contact us for any questions
✅ Schedule your project start date as soon as possible!

*"Your project, our passion. Quality guaranteed."*`,
        sendCopy: true,
      });
    }
  }, [showEmailDialog, estimate.client, profile]);

  // Open email compose dialog
  const openEmailCompose = () => {
    if (!estimate.client?.email) {
      toast({
        title: "Error",
        description: "El cliente no tiene email registrado",
        variant: "destructive",
      });
      return;
    }
    setShowEmailDialog(true);
  };

  // Show email preview before sending
  const showEmailPreviewDialog = () => {
    if (!emailData.toEmail || !emailData.subject || !emailData.message) {
      toast({
        title: "Error",
        description:
          "Por favor complete todos los campos antes de previsualizar",
        variant: "destructive",
      });
      return;
    }
    setShowEmailPreview(true);
  };

  // Send estimate email using new HTML email service
  const sendEstimateEmail = async () => {
    if (!emailData.toEmail || !estimate.client || !estimate.items?.length) {
      toast({
        title: "Error",
        description:
          "Please complete client information and add items to the estimate.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.email || !profile?.company) {
      toast({
        title: "Profile Required",
        description:
          "Please complete your company profile before sending estimates.",
        variant: "destructive",
      });
      return;
    }

    // Check email verification status before sending
    if (!emailVerified) {
      toast({
        title: "Email Verification Required",
        description:
          "Please verify your email address before sending estimates.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // Generate estimate number
      const estimateNumber = `EST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

      // Use the correct calculated values from the estimate (which already includes discount)
      const taxRate = estimate.taxRate;
      const tax = estimate.tax;
      const total = estimate.total;

      // Prepare estimate data for new HTML email service
      const estimateData = {
        estimateNumber,
        date: new Date().toLocaleDateString("es-ES"),
        client: {
          name: estimate.client.name,
          email: emailData.toEmail,
          address: estimate.client.address,
          phone: estimate.client.phone,
        },
        contractor: {
          companyName: profile.company,
          name: profile.displayName || profile.company,
          email: profile.email,
          phone: profile.phone || "No especificado",
          address: profile.address || "No especificada",
          city: profile.city || "No especificada",
          state: profile.state || "CA",
          zipCode: profile.zipCode || "00000",
          license: profile.license,
          insurancePolicy: profile.insurancePolicy,
          logo: profile.logo,
          website: profile.website,
        },
        project: {
          type: estimate.projectType || "Construcción",
          description: estimate.title || "Proyecto de construcción",
          location: estimate.client.address,
          scopeOfWork: estimate.projectDetails || emailData.message,
        },
        items: estimate.items.map((item) => ({
          id: item.id || String(Math.random()),
          name: item.name || item.material,
          description: item.description || item.details,
          quantity: item.quantity || 1,
          unit: item.unit || "unidad",
          unitPrice: item.unitPrice || item.price || 0,
          total:
            item.total || item.quantity * (item.unitPrice || item.price || 0),
        })),
        subtotal: estimate.subtotal || estimate.total || 0,
        discount: estimate.discountAmount || 0,
        discountType: estimate.discountType || "percentage",
        discountValue: estimate.discountValue || 0,
        tax: tax,
        taxRate: taxRate,
        total: total,
        notes: emailData.message,
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toLocaleDateString("es-ES"), // 30 days from now
      };

      console.log(
        "📧 Enviando estimado con sistema centralizado:",
        estimateData,
      );

      // Send estimate using centralized email system
      const response = await fetch("/api/centralized-email/send-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: emailData.toEmail,
          clientName: estimate.client.name,
          contractorEmail: profile.email,
          contractorName: profile.displayName || profile.company,
          contractorCompany: profile.company,
          estimateData: estimateData,
          customMessage: emailData.message,
          sendCopy: emailData.sendCopy, // ← CORREGIDO: usar el valor real del checkbox
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Handle demo mode specifically
        if (result.demoMode) {
          toast({
            title: "Estimado Enviado en Modo Demo",
            description: `Su estimado fue enviado a ${result.authorizedEmail} como demostración. Cliente original: ${result.originalClient}. ${result.warning || ""}`,
            duration: 8000,
            className: "bg-yellow-900 border-yellow-600",
          });
        } else {
          toast({
            title: "Estimado Enviado con Éxito",
            description: `Su estimado fue enviado desde noreply@owlfenc.com a ${emailData.toEmail}. El cliente puede responder directamente a su email.`,
            duration: 5000,
          });
        }

        // Save estimate to Firebase for tracking
        if (currentUser) {
          try {
            const estimateRef = doc(collection(db, "estimates"));
            await setDoc(estimateRef, {
              ...estimateData,
              firebaseUserId: currentUser.uid,
              status: "sent",
              sentAt: new Date(),
              createdAt: new Date(),
              // Store demo mode information if applicable
              ...(result.demoMode && {
                demoMode: true,
                originalClientEmail: result.originalClient,
                sentToEmail: result.authorizedEmail,
              }),
            });
            console.log("✅ Estimado guardado en Firebase para seguimiento");
          } catch (saveError) {
            console.warn("Error guardando estimado en Firebase:", saveError);
          }
        }

        setShowEmailDialog(false);
        setShowEmailPreview(false);

        // Refresh estimates list
        loadSavedEstimates();
      } else {
        // Handle specific error types
        if (result.error === "RESEND_TEST_MODE_LIMITATION") {
          toast({
            title: "Limitación del Servicio de Email",
            description: `${result.message}. Email autorizado: ${result.details?.authorizedEmail}. Para enviar a cualquier dirección, se requiere verificar dominio en resend.com`,
            variant: "destructive",
            duration: 10000,
            className: "bg-orange-900 border-orange-600",
          });
        } else {
          toast({
            title: "Error Enviando Estimado",
            description:
              result.message || "Error enviando el estimado por email.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error("Error sending HTML estimate email:", error);
      toast({
        title: "Error de Conexión",
        description:
          "No se pudo enviar el estimado. Verifique su conexión e intente nuevamente.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Download PDF
  const downloadPDF = async () => {
    try {
      // Generar PDF directamente sin guardar primero

      // Usar EXACTAMENTE el mismo HTML del preview para eliminar discrepancias
      const html = generateEstimatePreview();

      // Agregar estilos optimizados para PDF sin cambiar el contenido
      const pdfOptimizedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            /* Resetear márgenes y optimizar para PDF */
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #000 !important;
              background: #fff;
            }
            /* Asegurar que todos los textos sean negros en PDF */
            * { color: #000 !important; }
            .text-muted-foreground, .text-gray-600, .text-gray-500 { color: #000 !important; }
            
            /* Optimizaciones para impresión */
            @media print {
              body { margin: 0; padding: 15px; }
              * { color: #000 !important; }
            }
            
            /* Asegurar que las imágenes se mantengan */
            img { max-width: 100%; height: auto; }
            
            /* Mantener colores de marca solo para elementos específicos */
            h1, h2, h3 { color: #2563eb !important; }
            .border-bottom { border-bottom: 3px solid #2563eb !important; }
            thead tr { background: #2563eb !important; color: white !important; }
            thead th { color: white !important; }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;

      // 🐒 USAR TEMPLATE UNIFICADO CON PDFMONKEY
      const { generateUnifiedEstimateHTML, convertEstimateDataToTemplate } =
        await import("../lib/unified-estimate-template");

      // Obtener datos de la empresa
      let companyData = {};
      try {
        const profile = localStorage.getItem("contractorProfile");
        if (profile) companyData = JSON.parse(profile);
      } catch (error) {
        console.warn("Usando datos por defecto");
      }

      // Generar HTML con template unificado (mismo que el preview)
      const templateData = convertEstimateDataToTemplate(estimate, companyData);
      const unifiedHtml = generateUnifiedEstimateHTML(templateData);

      console.log("🔍 [DEBUG-FRONTEND] Profile data antes de enviar:", {
        company: profile?.company,
        email: profile?.email,
        phone: profile?.phone,
        address: profile?.address,
        city: profile?.city,
        state: profile?.state,
        zipCode: profile?.zipCode,
        logo: profile?.logo,
        logoLength: profile?.logo?.length || 0,
        currentUserUid: currentUser?.uid,
      });

      // Preparar datos para PDF Monkey con validación completa
      const estimateData = {
        estimateNumber: estimate.estimateNumber || `EST-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toLocaleDateString(),
        firebaseUid: currentUser?.uid, // ← CRÍTICO: Agregar FirebaseUID
        clientName: estimate.client?.name || "Cliente Sin Nombre",
        clientEmail: estimate.client?.email || "cliente@ejemplo.com",
        clientAddress:
          estimate.client?.address ||
          estimate.client?.fullAddress ||
          "Dirección no especificada",
        clientPhone: estimate.client?.phone || "555-0000",
        // Datos del contractor que se enviarán al backend para sobreescribir
        contractorCompanyName: profile?.company || "", // ← CORREGIDO: usar 'company'
        contractorEmail: profile?.email || "",
        contractorPhone: profile?.phone || "",
        contractorAddress: profile?.address || "",
        contractorCity: profile?.city || "",
        contractorState: profile?.state || "",
        contractorZipCode: profile?.zipCode || "",
        contractorLicense: profile?.license || "",
        contractorLogo: profile?.logo || "", // ← CORREGIDO: enviar logo del profile
        project: {
          type: estimate.projectType || "Fence Installation",
          description:
            estimate.projectDescription ||
            estimate.title ||
            "Proyecto de construcción de cerca",
          location:
            estimate.client?.address ||
            estimate.client?.fullAddress ||
            "Ubicación del proyecto",
          scopeOfWork:
            estimate.notes ||
            estimate.projectDescription ||
            "Construcción de cerca según especificaciones",
        },
        items: (estimate.items || []).map((item) => ({
          id: item.id || Date.now().toString(),
          name: item.name || item.material || "Material",
          description: item.description || item.details || "Sin descripción",
          quantity: item.quantity || 1,
          unit: item.unit || "unidad",
          unitPrice: item.unitPrice || item.price || 0,
          total: item.total || item.price * item.quantity || 0,
        })),
        subtotal: estimate.subtotal || 0,
        discount: estimate.discountAmount || 0,
        discountType: estimate.discountType || "percentage",
        discountValue: estimate.discountValue || 0,
        tax: estimate.tax || 0,
        taxRate: estimate.taxRate || 10,
        total: estimate.total || 0,
        notes: estimate.notes || "Estimado generado por Owl Fence",
      };

      console.log("🔍 [DEBUG-FRONTEND] Enviando datos al backend:", {
        firebaseUid: estimateData.firebaseUid,
        contractorCompanyName: estimateData.contractorCompanyName,
        contractorLogo: estimateData.contractorLogo,
        contractorEmail: estimateData.contractorEmail,
        contractorPhone: estimateData.contractorPhone,
        estimateDataKeys: Object.keys(estimateData),
      });

      const response = await fetch("/api/pdfmonkey-estimates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateData),
      });

      console.log(
        "📄 Respuesta del servidor:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error del servidor PDF:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `estimate-${estimate.client?.name || "client"}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ PDF Descargado",
        description: "El estimado se ha descargado correctamente como PDF",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "❌ Error al Descargar PDF",
        description: "No se pudo generar el PDF. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  console.log(estimate);
  // Direct Invoice Generation without popup
  const handleDirectInvoiceGeneration = async () => {
    if (!profile?.company) {
      toast({
        title: "Profile Incomplete",
        description:
          "Complete your company name in your profile before generating invoices.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use default values for direct generation
      const defaultInvoiceConfig = {
        projectCompleted: true,
        downPaymentAmount: "",
        totalAmountPaid: true,
      };

      const invoicePayload = {
        profile: {
          company: profile.company,
          address: profile.address
            ? `${profile.address}${profile.city ? ", " + profile.city : ""}${profile.state ? ", " + profile.state : ""}${profile.zipCode ? " " + profile.zipCode : ""}`
            : "",
          phone: profile.phone || "",
          email: profile.email || currentUser?.email || "",
          website: profile.website || "",
          logo: profile.logo || "",
        },
        estimate: {
          client: estimate.client,
          items: estimate.items,
          subtotal: estimate.subtotal,
          discountAmount: estimate.discountAmount,
          taxRate: estimate.taxRate,
          tax: estimate.tax,
          total: estimate.total,
        },
        invoiceConfig: defaultInvoiceConfig,
      };

      const response = await axios.post("/api/invoice-pdf", invoicePayload, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Invoice Generated",
        description:
          "Your professional invoice has been generated and downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    try {
      // Validar que el perfil del contractor esté completo
      if (!profile?.company) {
        toast({
          title: "❌ Perfil Incompleto",
          description:
            "Debes completar el nombre de tu empresa en tu perfil antes de generar PDFs.",
          variant: "destructive",
        });
        return;
      }

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
        client: estimate.client || {},
        items: estimate.items || [],
        projectTotalCosts: {
          subtotal: estimate.subtotal || 0,
          discount: estimate.discountAmount || 0,
          taxRate: estimate.taxRate || 10,
          tax: estimate.tax || 0,
          total: estimate.total || 0,
        },
        originalData: {
          projectDescription: estimate.projectDetails || "",
        },
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
        estimate.client?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "client";
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const filename = `estimate-${clientName}-${timestamp}.pdf`;

      // Use mobile sharing utility for smart download/share behavior
      await shareOrDownloadPdf(pdfBlob, filename, {
        title: `Estimate for ${estimate.client?.name || "Client"}`,
        text: `Professional estimate from ${profile?.company || "your contractor"}`,
        clientName: estimate.client?.name,
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
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "❌ Error",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Client Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <p className="text-base">Seleccionar Cliente</p>
                </div>
                <Dialog
                  open={showAddClientDialog}
                  onOpenChange={setShowAddClientDialog}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      <p className="md:block hidden">Nuevo Cliente</p>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md sm:max-w-lg border-0 bg-transparent p-0 shadow-none">
                    {/* Futuristic Sci-Fi Container */}
                    <div className="relative bg-gradient-to-b from-slate-900/95 via-slate-800/98 to-slate-900/95 backdrop-blur-xl ">
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/60"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/60"></div>

                      {/* Scanning Lines */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                        <div className="absolute bottom-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse delay-500"></div>
                      </div>

                      {/* Arc Reactor Effect */}
                      <div className="absolute top-4 right-4 w-4 h-4 rounded-full border-2 border-cyan-400 opacity-60">
                        <div className="absolute inset-1 rounded-full bg-cyan-400/30 animate-pulse"></div>
                        <div className="absolute inset-2 rounded-full bg-cyan-400 animate-ping"></div>
                      </div>

                      {/* Main Content */}
                      <div className="relative p-6 space-y-6">
                        {/* Header with Holographic Effect */}
                        <div className="text-center pb-4 border-b border-cyan-400/20">
                          <div className="text-xs font-mono text-cyan-400 mb-1 tracking-wider">
                            CLIENT MATRIX
                          </div>
                          <div className="text-lg font-bold text-white">
                            CREAR NUEVO CLIENTE
                          </div>
                          <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent mt-2"></div>
                        </div>

                        {/* Form Fields with Cyberpunk Styling */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="name"
                                className="text-cyan-400 text-xs font-mono tracking-wide"
                              >
                                NOMBRE [REQUIRED]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="name"
                                  value={newClient.name}
                                  onChange={(e) =>
                                    setNewClient((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="John Doe"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="email"
                                className="text-cyan-400 text-xs font-mono tracking-wide"
                              >
                                EMAIL [REQUIRED]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="email"
                                  type="email"
                                  value={newClient.email}
                                  onChange={(e) =>
                                    setNewClient((prev) => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="john@example.com"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="phone"
                                className="text-cyan-400 text-xs font-mono tracking-wide"
                              >
                                TELÉFONO [OPTIONAL]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="phone"
                                  value={newClient.phone}
                                  onChange={(e) =>
                                    setNewClient((prev) => ({
                                      ...prev,
                                      phone: e.target.value,
                                    }))
                                  }
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="(555) 123-4567"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="address"
                                className="text-cyan-400 text-xs font-mono tracking-wide"
                              >
                                DIRECCIÓN [OPTIONAL]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="address"
                                  value={newClient.address}
                                  onChange={(e) =>
                                    setNewClient((prev) => ({
                                      ...prev,
                                      address: e.target.value,
                                    }))
                                  }
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="123 Main St"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons with Cyberpunk Styling */}
                        <div className="flex gap-3 pt-4 border-t border-cyan-400/20">
                          <button
                            onClick={() => setShowAddClientDialog(false)}
                            className="
                              flex-1 px-4 py-2 border border-red-400/40 bg-gradient-to-r from-red-500/10 to-red-600/10
                              text-red-400 hover:text-red-300 hover:border-red-400/60 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20
                              transition-all duration-300 rounded font-mono text-sm tracking-wide
                            "
                          >
                            CANCELAR
                          </button>
                          <button
                            onClick={createNewClient}
                            className="
                              flex-1 px-4 py-2 border border-green-400/40 bg-gradient-to-r from-green-500/10 to-green-600/10
                              text-green-400 hover:text-green-300 hover:border-green-400/60 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-green-600/20
                              transition-all duration-300 rounded font-mono text-sm tracking-wide
                              disabled:opacity-50 disabled:cursor-not-allowed
                            "
                            disabled={!newClient.name || !newClient.email}
                          >
                            CREAR CLIENTE
                          </button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nombre, email o teléfono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {estimate.client && (
                <div className="p-4 border border-primary rounded-lg bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-primary">
                        Cliente Seleccionado
                      </h3>
                      <p className="text-sm font-medium">
                        {estimate.client.name}
                      </p>
                    </div>
                    <Check className="h-5 w-5 text-primary" />
                  </div>

                  {/* Client Information Display Only */}
                  <div className="space-y-1 text-sm text-gray-600">
                    {estimate.client.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {estimate.client.email}
                      </p>
                    )}
                    {estimate.client.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {estimate.client.phone}
                      </p>
                    )}
                    {estimate.client.address && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {estimate.client.address}
                        {estimate.client.city && `, ${estimate.client.city}`}
                        {estimate.client.state && `, ${estimate.client.state}`}
                        {estimate.client.zipCode &&
                          ` ${estimate.client.zipCode}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div
                className={`${showAllClients ? "max-h-64" : "max-h-24"} overflow-y-auto border rounded-md bg-muted/20 transition-all duration-300`}
              >
                {isLoadingClients ? (
                  <p className="text-center py-4 text-muted-foreground">
                    Cargando clientes...
                  </p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {clientSearch
                      ? "No se encontraron clientes"
                      : "No hay clientes disponibles"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {(showAllClients
                      ? filteredClients
                      : filteredClients.slice(0, 3)
                    ).map((client) => (
                      <div
                        key={client.id}
                        className={`p-1.5 border rounded cursor-pointer transition-colors ${
                          estimate.client?.id === client.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => selectClient(client)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-xs truncate">
                              {client.name}
                            </h4>
                            <div className="text-xs text-muted-foreground truncate">
                              {client.email || client.phone || "Sin contacto"}
                            </div>
                          </div>
                          {estimate.client?.id === client.id && (
                            <Check className="h-3 w-3 text-primary flex-shrink-0 ml-1 mt-0.5" />
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredClients.length > 3 && !showAllClients && (
                      <div
                        className="text-xs text-center text-muted-foreground py-2 cursor-pointer hover:text-primary hover:bg-muted/50 rounded transition-colors"
                        onClick={() => setShowAllClients(true)}
                      >
                        +{filteredClients.length - 3} más clientes disponibles
                      </div>
                    )}
                    {showAllClients && filteredClients.length > 3 && (
                      <div
                        className="text-xs text-center text-muted-foreground py-2 cursor-pointer hover:text-primary hover:bg-muted/50 rounded transition-colors border-t"
                        onClick={() => setShowAllClients(false)}
                      >
                        Mostrar menos clientes
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Project Details
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalles del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <Label
                    htmlFor="projectDetails"
                    className="text-base font-medium flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Project Details
                  </Label>
                  <Button
                    onClick={enhanceProjectWithAI}
                    disabled={isAIProcessing || !estimate.projectDetails.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto"
                    size="sm"
                  >
                    {isAIProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="hidden sm:inline">Procesando...</span>
                        <span className="sm:hidden">Procesando...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">
                          Enhance with Mervin AI
                        </span>
                        <span className="sm:hidden">Mervin AI</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="relative">
                  <Textarea
                    id="projectDetails"
                    placeholder="Describe los detalles completos del proyecto:&#10;&#10;• Alcance del trabajo y especificaciones técnicas&#10;• Cronograma y tiempo estimado&#10;• Proceso paso a paso del trabajo&#10;• Qué está incluido en el precio&#10;• Qué NO está incluido&#10;• Notas adicionales, términos especiales, condiciones..."
                    value={estimate.projectDetails}
                    onChange={(e) =>
                      setEstimate((prev) => ({
                        ...prev,
                        projectDetails: e.target.value,
                      }))
                    }
                    className="min-h-[120px] max-h-[300px] text-sm resize-none"
                  />
                </div>

                {/* Smart Search Dynamic Bar - Compact & Mobile-Friendly */}
                <div className="mt-3 p-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 rounded-lg shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Quality Indicator & Status */}
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                          estimate.projectDetails.trim().length < 10
                            ? "bg-orange-100 text-orange-700 border border-orange-200"
                            : evaluateProjectDescription(
                                  estimate.projectDetails,
                                ).isDetailed
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        }`}
                      >
                        {estimate.projectDetails.trim().length < 10 ? (
                          <>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                            <span>Necesita más información</span>
                          </>
                        ) : evaluateProjectDescription(estimate.projectDetails)
                            .isDetailed ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Listo para DeepSearch</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span>Parcialmente completo</span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="flex-1 min-w-0">
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              estimate.projectDetails.trim().length < 10
                                ? "bg-orange-400"
                                : evaluateProjectDescription(
                                      estimate.projectDetails,
                                    ).isDetailed
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  10,
                                  (estimate.projectDetails.trim().length /
                                    100) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Character Count & Details Detected */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-slate-500">
                        {estimate.projectDetails.length} caracteres
                      </div>
                      {estimate.projectDetails.trim().length >= 10 && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <span>•</span>
                          <span>
                            {(() => {
                              const evaluation = evaluateProjectDescription(
                                estimate.projectDetails,
                              );
                              const detectedItems = [];

                              // Check for dimensions
                              if (
                                /\d+\s*(ft|feet|linear|sq|square|yard|meter|inch)/i.test(
                                  estimate.projectDetails,
                                )
                              ) {
                                detectedItems.push("medidas");
                              }

                              // Check for materials
                              if (
                                /(wood|cedar|vinyl|chain|fence|concrete|steel|aluminum|material)/i.test(
                                  estimate.projectDetails,
                                )
                              ) {
                                detectedItems.push("materiales");
                              }

                              // Check for location
                              if (
                                /(yard|backyard|front|side|property|pool|garden|patio)/i.test(
                                  estimate.projectDetails,
                                )
                              ) {
                                detectedItems.push("ubicación");
                              }

                              // Check for project type
                              if (
                                /(fence|fencing|gate|deck|roof|floor|paint|electrical|plumb)/i.test(
                                  estimate.projectDetails,
                                )
                              ) {
                                detectedItems.push("tipo");
                              }

                              return detectedItems.length > 0
                                ? `${detectedItems.slice(0, 2).join(", ")}${detectedItems.length > 2 ? "..." : ""} detectado${detectedItems.length > 1 ? "s" : ""}`
                                : "descripción básica";
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detailed Quality Breakdown - Expandable on Mobile */}
                  {estimate.projectDetails.trim().length >= 10 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-xs">
                        {(() => {
                          const evaluation = evaluateProjectDescription(
                            estimate.projectDetails,
                          );
                          const checks = [
                            {
                              label: "Dimensiones",
                              detected:
                                /\d+\s*(ft|feet|linear|sq|square|yard|meter|inch)/i.test(
                                  estimate.projectDetails,
                                ),
                              color: "text-blue-600",
                            },
                            {
                              label: "Materiales",
                              detected:
                                /(wood|cedar|vinyl|chain|fence|concrete|steel|aluminum|material)/i.test(
                                  estimate.projectDetails,
                                ),
                              color: "text-purple-600",
                            },
                            {
                              label: "Detalles",
                              detected:
                                estimate.projectDetails.trim().length > 50,
                              color: "text-orange-600",
                            },
                          ];

                          return checks.map((check, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1"
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  check.detected
                                    ? "bg-green-500"
                                    : "bg-slate-300"
                                }`}
                              />
                              <span
                                className={
                                  check.detected
                                    ? check.color
                                    : "text-slate-400"
                                }
                              >
                                {check.label}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {estimate.projectDetails.trim().length >= 10 &&
                    !evaluateProjectDescription(estimate.projectDetails)
                      .isDetailed && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="text-xs text-slate-600">
                          <span className="font-medium">Sugerencia:</span> Añade{" "}
                          {!/\d+\s*(ft|feet|linear|sq|square)/i.test(
                            estimate.projectDetails,
                          ) && "medidas específicas, "}
                          {!/(wood|cedar|vinyl|chain|concrete)/i.test(
                            estimate.projectDetails,
                          ) && "tipos de materiales "}
                          para mejorar la precisión del DeepSearch.
                        </div>
                      </div>
                    )}
                </div>
                {/* Mensaje de ayuda dinámico */}
                {estimate.projectDetails.trim().length >= 10 &&
                  !evaluateProjectDescription(estimate.projectDetails)
                    .isDetailed && (
                    <div className="flex items-start gap-2 mt-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-700">
                        <strong>Para DeepSearch necesito más detalles:</strong>{" "}
                        Incluye medidas específicas, tipos de materiales,
                        ubicación del trabajo, o usa{" "}
                        <strong>"Enhance with Mervin AI"</strong> para generar
                        una descripción completa.
                      </p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Materials Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Add Materials ({estimate.items.length})
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end">
                  {/* HUD-STYLE MATERIALS AI SEARCH - Compact Futuristic Design */}
                  <div className="relative z-10">
                    <button
                      disabled={
                        !estimate.projectDetails.trim() ||
                        estimate.projectDetails.length < 3 ||
                        isAIProcessing
                      }
                      className={`
                        relative  px-4 py-2 text-sm font-mono transition-all duration-300
                        bg-black/40 backdrop-blur-sm
                        border border-cyan-400/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                        group z-40 w-full sm:w-auto
                        hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/20
                      `}
                      style={{
                        clipPath:
                          "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)",
                      }}
                      onClick={() => {
                        console.log(
                          "🔍 MATERIALS AI SEARCH clicked - current state:",
                          showNewDeepsearchDialog,
                        );
                        setShowNewDeepsearchDialog((prev) => {
                          console.log(
                            "🔍 Setting new state from",
                            prev,
                            "to",
                            !prev,
                          );
                          return !prev;
                        });
                      }}
                    >
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-cyan-400/60"></div>
                      <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-cyan-400/60"></div>
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-cyan-400/60"></div>
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-cyan-400/60"></div>

                      {/* Scanning Lines */}
                      <div className="absolute inset-0 ">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-pulse"></div>
                        <div
                          className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-pulse"
                          style={{ animationDelay: "0.5s" }}
                        ></div>
                      </div>

                      {/* Holographic Border Glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 via-blue-400/10 to-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative flex items-center gap-1.5 text-cyan-100">
                        {isAIProcessing ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-cyan-400 font-mono text-xs">
                                {aiProgress}%
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 text-cyan-400" />
                            <span className="text-sm tracking-wide">
                              DeepSearch Material
                            </span>
                            <ChevronDown
                              className={`h-3 w-3 text-cyan-400 transition-transform duration-300 ${showNewDeepsearchDialog ? "rotate-180" : ""}`}
                            />
                          </>
                        )}
                      </div>
                    </button>

                    {/* HUD-Style Dropdown - Compact Futuristic Design */}
                    {showNewDeepsearchDialog && !isAIProcessing && (
                      <div
                        className="fixed inset-0 z-[9999] flex items-start justify-center pt-20"
                        onClick={() => setShowNewDeepsearchDialog(false)}
                      >
                        <div
                          className="bg-black/80 backdrop-blur-xl border border-cyan-400/30  max-w-sm w-full mx-4 relative"
                          style={{
                            clipPath:
                              "polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Corner Brackets for Dialog */}
                          <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-cyan-400/80"></div>
                          <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-cyan-400/80"></div>
                          <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-cyan-400/80"></div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-cyan-400/80"></div>

                          {/* Header */}
                          <div className="border-b border-cyan-400/20 p-3">
                            <div className="text-xs font-mono text-cyan-400 mb-1 tracking-wider">
                              SELECT.SEARCH.TYPE
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                          </div>

                          <div className="p-3 space-y-2">
                            {/* Only Materials */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewDeepsearch("materials");
                              }}
                              className="group w-full p-3 rounded-lg transition-all duration-300 border border-blue-400/20 bg-gradient-to-r from-blue-500/5 to-blue-600/5 hover:border-blue-400/50 hover:bg-gradient-to-r hover:from-blue-500/15 hover:to-blue-600/15 hover:shadow-lg hover:shadow-blue-400/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                    ONLY MATERIALS
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Search materials database only
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>

                            {/* Labor Costs */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewDeepsearch("labor");
                              }}
                              className="group w-full p-3 rounded-lg transition-all duration-300 border border-orange-400/20 bg-gradient-to-r from-orange-500/5 to-amber-600/5 hover:border-orange-400/50 hover:bg-gradient-to-r hover:from-orange-500/15 hover:to-amber-600/15 hover:shadow-lg hover:shadow-orange-400/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400/20 to-amber-600/20 border border-orange-400/30 flex items-center justify-center">
                                  <Wrench className="h-5 w-5 text-orange-400" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">
                                    LABOR COSTS
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Generate labor service items
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>

                            {/* Full Costs - Recommended */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewDeepsearch("full");
                              }}
                              className="group w-full p-3 rounded-lg transition-all duration-300 border border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 to-green-600/10 hover:border-emerald-400/70 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-green-600/20 hover:shadow-lg hover:shadow-emerald-400/25 ring-1 ring-emerald-400/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/20 to-green-600/20 border border-emerald-400/40 flex items-center justify-center">
                                  <div className="w-5 h-5 rounded-full border-2 border-emerald-400 relative">
                                    <div className="absolute inset-1 rounded-full bg-emerald-400/30" />
                                    <div className="absolute inset-2 rounded-full bg-emerald-400 animate-pulse" />
                                  </div>
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                                      FULL COSTS
                                    </div>
                                    <div className="px-2 py-0.5 bg-emerald-400/20 border border-emerald-400/40 rounded text-xs text-emerald-400 font-mono">
                                      RECOMMENDED
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Materials + labor complete analysis
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>
                          </div>

                          {/* Footer */}
                          <div className="border-t border-purple-400/20 p-2">
                            <div className="h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overlay para cerrar el dropdown */}
                    {showNewDeepsearchDialog && !isAIProcessing && (
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowNewDeepsearchDialog(false)}
                      />
                    )}
                  </div>

                  {/* Deepsearch Materials - Nuevo Botón Funcional - HIDDEN */}
                  <div className="relative z-50 hidden">
                    <button
                      disabled={
                        !estimate.projectDetails.trim() ||
                        estimate.projectDetails.length < 3 ||
                        isAIProcessing
                      }
                      className={`
                        relative  px-3 sm:px-4 py-2 w-full sm:min-w-[200px] text-sm font-medium transition-all duration-300
                        bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900
                        border border-emerald-400/30 rounded-lg
                        hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-400/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                        group z-50
                      `}
                      onClick={handleDeepsearchToggle}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-green-400/5 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative flex items-center gap-2 text-white">
                        {isAIProcessing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-emerald-400 font-mono">
                                {aiProgress}%
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 text-emerald-400" />
                            <span>DEEPSEARCH MATERIALS</span>
                            <ChevronDown
                              className={`h-3 w-3 text-emerald-400 transition-transform duration-300 ${showDeepsearchDialog ? "rotate-180" : ""}`}
                            />
                          </>
                        )}
                      </div>
                    </button>

                    {/* Dropdown del nuevo Deepsearch Materials */}
                    {showDeepsearchDialog && !isAIProcessing && (
                      <div className="absolute top-full mt-2 left-0 right-0 sm:left-0 sm:right-auto z-[60] sm:min-w-[300px]">
                        <div className="bg-gradient-to-b from-emerald-900/95 via-emerald-800/98 to-emerald-900/95 backdrop-blur-xl border border-emerald-400/30 rounded-xl shadow-2xl shadow-emerald-400/10 ">
                          {/* Header */}
                          <div className="border-b border-emerald-400/20 p-4">
                            <div className="text-xs font-mono text-emerald-400 mb-1 tracking-wider">
                              SELECT DEEPSEARCH TYPE
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                          </div>

                          <div className="p-3 space-y-2">
                            {/* Only Materials */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeepsearchMode("materials");
                                setShowDeepsearchDialog(false);
                                handleSmartSearch();
                              }}
                              className="group w-full p-3 rounded-lg transition-all duration-300 border border-blue-400/20 bg-gradient-to-r from-blue-500/5 to-blue-600/5 hover:border-blue-400/50 hover:bg-gradient-to-r hover:from-blue-500/15 hover:to-blue-600/15 hover:shadow-lg hover:shadow-blue-400/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                    ONLY MATERIALS
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Search materials database only
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>

                            {/* Labor Costs */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeepsearchMode("labor");
                                setShowDeepsearchDialog(false);
                                handleSmartSearch();
                              }}
                              className="group w-full p-3 rounded-lg transition-all duration-300 border border-orange-400/20 bg-gradient-to-r from-orange-500/5 to-amber-600/5 hover:border-orange-400/50 hover:bg-gradient-to-r hover:from-orange-500/15 hover:to-amber-600/15 hover:shadow-lg hover:shadow-orange-400/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400/20 to-amber-600/20 border border-orange-400/30 flex items-center justify-center">
                                  <Wrench className="h-5 w-5 text-orange-400" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">
                                    LABOR COSTS
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Generate labor service items
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>

                            {/* Full Costs - Recommended */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeepsearchDialog(false);
                                handleNewDeepsearch("full");
                              }}
                              className="group w-full p-3 rounded-lg transition-all duration-300 border border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 to-green-600/10 hover:border-emerald-400/70 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-green-600/20 hover:shadow-lg hover:shadow-emerald-400/25 ring-1 ring-emerald-400/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/20 to-green-600/20 border border-emerald-400/40 flex items-center justify-center">
                                  <div className="w-5 h-5 rounded-full border-2 border-emerald-400 relative">
                                    <div className="absolute inset-1 rounded-full bg-emerald-400/30" />
                                    <div className="absolute inset-2 rounded-full bg-emerald-400 animate-pulse" />
                                  </div>
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                                      FULL COSTS
                                    </div>
                                    <div className="px-2 py-0.5 bg-emerald-400/20 border border-emerald-400/40 rounded text-xs text-emerald-400 font-mono">
                                      RECOMMENDED
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Materials + labor complete analysis
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>
                          </div>

                          {/* Footer */}
                          <div className="border-t border-emerald-400/20 p-2">
                            <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overlay para cerrar el dropdown */}
                    {showDeepsearchDialog && !isAIProcessing && (
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowDeepsearchDialog(false)}
                      />
                    )}
                  </div>

                  {/* Barra de progreso futurista cuando está procesando */}
                  {isAIProcessing && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-800 border border-cyan-400/30 rounded-lg">
                        <div className="w-20 h-1.5 bg-slate-700 rounded-full ">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full transition-all duration-300"
                            style={{ width: `${aiProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-cyan-400 font-mono">
                          {aiProgress}%
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {aiProgress < 20
                          ? "Initializing AI analysis..."
                          : aiProgress < 40
                            ? "Processing project requirements..."
                            : aiProgress < 60
                              ? "Generating materials list..."
                              : aiProgress < 80
                                ? "Calculating labor costs..."
                                : "Finalizing estimates..."}
                      </span>
                    </div>
                  )}
                </div>
                <Dialog
                  open={showMaterialDialog}
                  onOpenChange={setShowMaterialDialog}
                >
                  <DialogTrigger asChild>
                    <button
                      className={`
                        relative  px-4 py-2 text-sm font-medium transition-all duration-300
                        bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900
                        border border-teal-400/30 rounded-lg
                        hover:border-teal-400/60 hover:shadow-lg hover:shadow-teal-400/20
                        group w-full sm:w-auto
                      `}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-400/10 via-teal-400/5 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative flex items-center gap-2 text-white justify-center">
                        <Plus className="h-4 w-4 text-teal-400" />
                        <span className="hidden sm:inline">Add Material</span>
                        <span className="sm:hidden">Add</span>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="p-4   max-w-4xl">
                    <DialogHeader>
                      <DialogTitle className="my-4">
                        Select Material from Inventory
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pb-10 ">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search materials..."
                          value={materialSearch}
                          onChange={(e) => setMaterialSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-96 ">
                        {isLoadingMaterials ? (
                          <p className="text-center py-4 text-muted-foreground">
                            Loading materials...
                          </p>
                        ) : filteredMaterials.length === 0 ? (
                          <p className="text-center py-4 text-muted-foreground">
                            {materialSearch
                              ? "No materials found"
                              : "No materials available"}
                          </p>
                        ) : (
                          <div className="overflow-y-auto h-[50dvh] pb-10 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredMaterials.map((material) => (
                              <div
                                key={material.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => addMaterialToEstimate(material)}
                              >
                                <h4 className="font-medium">{material.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {material.category}
                                </p>
                                <p className="text-sm font-medium text-primary">
                                  ${material.price?.toFixed(2) || "0.00"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No materials added to estimate</p>
                  <p className="text-sm">Click "Add Material" to get started</p>
                </div>
              ) : (
                <div className="space-y-4 ">
                  {estimate.items.map((item, index) => (
                    <div key={item.id} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.name}</h4>
                          <textarea
                            value={item.description}
                            onChange={(e) =>
                              updateItemDescription(item.id, e.target.value)
                            }
                            className="w-full text-sm text-muted-foreground bg-transparent border border-gray-300 rounded px-2 py-1 mt-1 resize-none"
                            rows={2}
                            placeholder="Material description..."
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm">$</span>
                            <Input
                              type="number"
                              value={item.price.toFixed(2)}
                              onChange={(e) =>
                                updateItemPrice(
                                  item.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-16 sm:w-20 h-6 text-sm"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-sm">/ {item.unit}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateItemQuantity(item.id, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.id,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-16 sm:w-20 h-7 text-center text-sm"
                              min="1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateItemQuantity(item.id, item.quantity + 1)
                              }
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right min-w-16">
                            <p className="font-medium text-sm sm:text-base">
                              ${item.total.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItemFromEstimate(item.id)}
                            className="text-destructive hover:text-destructive h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-4 space-y-3">
                    {/* Sleek Dark Tax and Discount Controls */}
                    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 rounded-xl px-3 py-3 border border-gray-700 shadow-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
                          {/* Tax Rate - Sleek Dark */}
                          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <span className="text-gray-300 text-xs font-medium tracking-wide">
                              IMPUESTO
                            </span>
                            <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 border border-gray-600 flex-1 sm:flex-initial">
                              <input
                                type="number"
                                value={estimate.taxRate}
                                onChange={(e) =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    taxRate: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-8 bg-transparent text-white text-xs text-center focus:outline-none"
                                min="0"
                                max="100"
                                step="0.1"
                              />
                              <span className="text-gray-400 text-xs ml-1">
                                %
                              </span>
                            </div>
                          </div>

                          {/* Discount - Sleek Dark */}
                          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <span className="text-gray-300 text-xs font-medium tracking-wide">
                              DESC.
                            </span>
                            <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial">
                              {/* Discount Name */}
                              <input
                                type="text"
                                value={estimate.discountName || ""}
                                onChange={(e) =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    discountName: e.target.value,
                                  }))
                                }
                                className="w-16 sm:w-20 bg-gray-800 text-white text-xs border border-gray-600 rounded px-1 sm:px-2 py-1 focus:outline-none focus:border-blue-500"
                                placeholder="Tipo"
                              />
                              {/* Discount Type */}
                              <button
                                onClick={() =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    discountType:
                                      prev.discountType === "percentage"
                                        ? "fixed"
                                        : "percentage",
                                  }))
                                }
                                className="bg-gray-800 text-white text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500 min-w-0 hover:bg-gray-700 transition-colors"
                              >
                                {estimate.discountType === "percentage"
                                  ? "%"
                                  : "$"}
                              </button>
                              {/* Discount Value */}
                              <div className="bg-gray-800 rounded-lg px-1 sm:px-2 py-1 border border-gray-600">
                                <input
                                  type="number"
                                  value={estimate.discountValue}
                                  onChange={(e) =>
                                    setEstimate((prev) => ({
                                      ...prev,
                                      discountValue:
                                        parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-14 sm:w-16 bg-transparent text-white text-xs text-center focus:outline-none"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Reset button with glow effect */}
                        {(estimate.discountValue > 0 ||
                          estimate.taxRate !== 10 ||
                          estimate.discountName) && (
                          <button
                            onClick={() =>
                              setEstimate((prev) => ({
                                ...prev,
                                taxRate: 10,
                                discountValue: 0,
                                discountType: "percentage",
                                discountName: "",
                              }))
                            }
                            className="text-xs text-gray-400 hover:text-blue-400 transition-colors duration-200 underline hover:glow"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Premium Totals Summary */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">
                            Subtotal:
                          </span>
                          <span className="font-semibold text-gray-900">
                            ${estimate.subtotal.toFixed(2)}
                          </span>
                        </div>

                        {estimate.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600 font-medium">
                              Descuento (
                              {estimate.discountType === "percentage"
                                ? `${estimate.discountValue}%`
                                : `$${estimate.discountValue}`}
                              ):
                            </span>
                            <span className="font-semibold text-emerald-600">
                              -${estimate.discountAmount.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">
                            Impuesto ({estimate.taxRate}%):
                          </span>
                          <span className="font-semibold text-gray-900">
                            ${estimate.tax.toFixed(2)}
                          </span>
                        </div>

                        <div className="border-t border-gray-300 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-800">
                              Total:
                            </span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              ${estimate.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3: // Preview
        // Debug logging for preview step
        console.log("🔍 PREVIEW DEBUG - Current estimate state:", {
          client: estimate.client,
          clientExists: !!estimate.client,
          itemsCount: estimate.items.length,
          items: estimate.items,
        });

        const hasClient = !!estimate.client;
        const hasItems = estimate.items.length > 0;

        return (
          <div className="space-y-4">
            {/* Header */}
            <Card className="border-cyan-500/30 bg-gradient-to-r from-gray-900/90 via-black/90 to-gray-900/90">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                  <Eye className="h-5 w-5" />
                  Vista Previa del Estimado
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-cyan-400">ACTIVO</span>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>

            {!hasClient || !hasItems ? (
              <Card className="border-amber-500/30">
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className="text-lg font-medium">Estimado Incompleto</p>
                  <div className="text-muted-foreground space-y-2">
                    {!hasClient && (
                      <p>❌ Necesitas seleccionar un cliente (paso 1)</p>
                    )}
                    {!hasItems && (
                      <p>❌ Necesitas agregar materiales (paso 3)</p>
                    )}
                    {hasClient && hasItems && (
                      <p>
                        ✅ Todos los datos están completos - verificando
                        estado...
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(0)}
                      disabled={hasClient}
                    >
                      Ir a Cliente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(2)}
                      disabled={hasItems}
                    >
                      Ir a Materiales
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Card 1: Información del Contratista y Cliente */}
                <Card className="border-cyan-500/30 bg-gradient-to-r from-gray-900/50 via-black/50 to-gray-900/50">
                  <CardHeader className="border-b border-cyan-500/20">
                    <CardTitle className="text-sm text-cyan-300 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Información General
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Contratista */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-cyan-400 mb-2">
                          CONTRATISTA
                        </h4>
                        <div className="text-sm text-gray-300">
                          {/* Company Logo */}
                          {profile?.logo ? (
                            <div className="mb-3">
                              <img
                                src={profile.logo}
                                alt={`${profile.company || "Company"} Logo`}
                                className="h-12 w-auto max-w-24 object-contain bg-white rounded p-1 border border-gray-600"
                                onError={(e) => {
                                  console.warn(
                                    "Logo failed to load:",
                                    profile.logo,
                                  );
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="mb-3">
                              <div className="h-12 w-24 bg-gray-700 border border-gray-600 rounded p-1 flex items-center justify-center">
                                <span className="text-xs text-gray-400">
                                  Logo
                                </span>
                              </div>
                            </div>
                          )}
                          <p className="font-medium">
                            {profile?.company || "Sin nombre de empresa"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {profile?.address || "Sin dirección"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {profile?.city || "Sin ciudad"},{" "}
                            {profile?.state || "CA"} {profile?.zipCode || ""}
                          </p>
                          <p className="text-xs text-cyan-400">
                            {profile?.phone || "Sin teléfono"}
                          </p>
                          <p className="text-xs text-cyan-400">
                            {profile?.email || "Sin email"}
                          </p>
                          {profile?.website && (
                            <p className="text-xs text-cyan-400">
                              {profile.website}
                            </p>
                          )}
                          {profile?.licenseNumber && (
                            <p className="text-xs text-gray-400">
                              Licencia: {profile.licenseNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Cliente */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-medium text-cyan-400 mb-2">
                            CLIENTE
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingClient(!isEditingClient)}
                            className="h-6 px-2 text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            {isEditingClient ? "Guardar" : "Editar"}
                          </Button>
                        </div>

                        {isEditingClient ? (
                          <div className="space-y-2 bg-gray-800/50 p-3 rounded border">
                            {/* Editable Client Name */}
                            <div>
                              <Label
                                htmlFor="edit-client-name"
                                className="text-xs text-gray-400"
                              >
                                Nombre
                              </Label>
                              <Input
                                id="edit-client-name"
                                value={estimate.client?.name || ""}
                                onChange={(e) =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    client: {
                                      ...prev.client!,
                                      name: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Nombre del cliente"
                                className="h-7 text-xs bg-gray-900/50 border-gray-600"
                              />
                            </div>

                            {/* Editable Address */}
                            <div>
                              <Label
                                htmlFor="edit-client-address"
                                className="text-xs text-gray-400"
                              >
                                Dirección
                              </Label>
                              <Input
                                id="edit-client-address"
                                value={estimate.client?.address || ""}
                                onChange={(e) =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    client: {
                                      ...prev.client!,
                                      address: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Dirección completa"
                                className="h-7 text-xs bg-gray-900/50 border-gray-600"
                              />
                            </div>

                            {/* City and State */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label
                                  htmlFor="edit-client-city"
                                  className="text-xs text-gray-400"
                                >
                                  Ciudad
                                </Label>
                                <Input
                                  id="edit-client-city"
                                  value={estimate.client?.city || ""}
                                  onChange={(e) =>
                                    setEstimate((prev) => ({
                                      ...prev,
                                      client: {
                                        ...prev.client!,
                                        city: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Ciudad"
                                  className="h-7 text-xs bg-gray-900/50 border-gray-600"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="edit-client-state"
                                  className="text-xs text-gray-400"
                                >
                                  Estado
                                </Label>
                                <Input
                                  id="edit-client-state"
                                  value={estimate.client?.state || ""}
                                  onChange={(e) =>
                                    setEstimate((prev) => ({
                                      ...prev,
                                      client: {
                                        ...prev.client!,
                                        state: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Estado"
                                  className="h-7 text-xs bg-gray-900/50 border-gray-600"
                                />
                              </div>
                            </div>

                            {/* ZIP Code */}
                            <div>
                              <Label
                                htmlFor="edit-client-zip"
                                className="text-xs text-gray-400"
                              >
                                Código Postal
                              </Label>
                              <Input
                                id="edit-client-zip"
                                value={
                                  estimate.client?.zipCode ||
                                  estimate.client?.zipcode ||
                                  ""
                                }
                                onChange={(e) =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    client: {
                                      ...prev.client!,
                                      zipCode: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Código postal"
                                className="h-7 text-xs bg-gray-900/50 border-gray-600"
                              />
                            </div>

                            {/* Phone */}
                            <div>
                              <Label
                                htmlFor="edit-client-phone"
                                className="text-xs text-gray-400"
                              >
                                Teléfono
                              </Label>
                              <Input
                                id="edit-client-phone"
                                value={estimate.client?.phone || ""}
                                onChange={(e) =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    client: {
                                      ...prev.client!,
                                      phone: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Teléfono"
                                className="h-7 text-xs bg-gray-900/50 border-gray-600"
                              />
                            </div>

                            {/* Email */}
                            <div>
                              <Label
                                htmlFor="edit-client-email"
                                className="text-xs text-gray-400"
                              >
                                Email
                              </Label>
                              <Input
                                id="edit-client-email"
                                value={estimate.client?.email || ""}
                                onChange={(e) =>
                                  setEstimate((prev) => ({
                                    ...prev,
                                    client: {
                                      ...prev.client!,
                                      email: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Email"
                                className="h-7 text-xs bg-gray-900/50 border-gray-600"
                              />
                            </div>

                            {/* Quick Fill for Turner Group */}
                            {estimate.client?.name ===
                              "Turner Group Construction" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEstimate((prev) => ({
                                    ...prev,
                                    client: {
                                      ...prev.client!,
                                      address: "8055 Collins Dr",
                                      city: "Oakland",
                                      state: "CA",
                                      zipCode: "94621",
                                    },
                                  }));
                                  toast({
                                    title: "Address completed",
                                    description:
                                      "Turner Group Construction address filled",
                                  });
                                }}
                                className="w-full text-xs h-7"
                              >
                                Complete Turner Group Address
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-300">
                            <p className="font-medium">
                              {estimate.client?.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {estimate.client?.address &&
                              estimate.client.address.trim() !== ""
                                ? `${estimate.client.address}${estimate.client.city ? ", " + estimate.client.city : ""}${estimate.client.state ? ", " + estimate.client.state : ""}${estimate.client.zipcode || estimate.client.zipCode ? " " + (estimate.client.zipcode || estimate.client.zipCode) : ""}`
                                : "Complete address in Client step"}
                            </p>
                            <p className="text-xs text-cyan-400">
                              {estimate.client?.phone ||
                                "Add phone in Client step"}
                            </p>
                            <p className="text-xs text-cyan-400">
                              {estimate.client?.email ||
                                "Add email in Client step"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Número y Fecha */}
                    <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col sm:flex-row sm:justify-between gap-2">
                      <div className="text-xs">
                        <span className="text-gray-400">Estimado #:</span>
                        <span className="text-cyan-400 ml-1">
                          EST-{new Date().getFullYear()}-
                          {String(Math.floor(Math.random() * 10000)).padStart(
                            4,
                            "0",
                          )}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-400">Fecha:</span>
                        <span className="text-cyan-400 ml-1">
                          {new Date().toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Detalles del Proyecto */}
                <Card className="border-cyan-500/30 bg-gradient-to-r from-gray-900/50 via-black/50 to-gray-900/50">
                  <CardHeader className="border-b border-cyan-500/20">
                    <CardTitle className="text-sm text-cyan-300 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Detalles del Proyecto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-300">
                      <p className="mb-2">
                        {estimate.projectDetails ||
                          "Sin descripción del proyecto"}
                      </p>
                      <div className="text-xs text-gray-400">
                        <p>
                          Ubicación:{" "}
                          {estimate.client?.address
                            ? `${estimate.client.address}${estimate.client.city ? ", " + estimate.client.city : ""}${estimate.client.state ? ", " + estimate.client.state : ""}${estimate.client.zipcode || estimate.client.zipCode ? " " + (estimate.client.zipcode || estimate.client.zipCode) : ""}`
                            : "No especificada"}
                        </p>
                        <p>
                          Materiales: {estimate.items.length} items
                          seleccionados
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Resumen Financiero */}
                <Card className="border-cyan-500/30 bg-gradient-to-r from-gray-900/50 via-black/50 to-gray-900/50">
                  <CardHeader className="border-b border-cyan-500/20">
                    <CardTitle className="text-sm text-cyan-300 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Resumen Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {/* Resumen de Materiales */}
                      <div className="text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">
                            Materiales ({estimate.items.length} items):
                          </span>
                          <span className="text-gray-300">
                            ${estimate.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Descuento */}
                      {estimate.discountAmount > 0 && (
                        <div className="text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">
                              Descuento{" "}
                              {estimate.discountName
                                ? `(${estimate.discountName})`
                                : ""}
                              :
                            </span>
                            <span className="text-green-400">
                              -${estimate.discountAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Impuesto */}
                      <div className="text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">
                            Impuesto ({estimate.taxRate}%):
                          </span>
                          <span className="text-gray-300">
                            ${estimate.tax.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="pt-2 border-t border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-300 font-medium">
                            TOTAL:
                          </span>
                          <span className="text-cyan-300 font-bold text-lg">
                            ${estimate.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 4: Acciones Principales */}
                <Card className="border-cyan-500/30 bg-gradient-to-r from-gray-900/50 via-black/50 to-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        onClick={handleDirectInvoiceGeneration}
                        disabled={
                          !estimate.client || estimate.items.length === 0
                        }
                        size="sm"
                        className="border-orange-500/50 text-orange-300 hover:bg-orange-500/10 text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">
                          Generate as Invoice
                        </span>
                        <span className="sm:hidden">Invoice</span>
                      </Button>

                      <Button
                        onClick={handleDownload}
                        disabled={
                          !estimate.client || estimate.items.length === 0
                        }
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        {sharingCapabilities.isMobile &&
                        sharingCapabilities.nativeShareSupported ? (
                          <>
                            <Share2 className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">
                              Share PDF Estimate
                            </span>
                            <span className="sm:hidden">Share</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">
                              Generate as Estimate
                            </span>
                            <span className="sm:hidden">Estimate</span>
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => handleSaveEstimate()}
                        disabled={isSaving}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {isSaving ? (
                          <span className="hidden sm:inline">Guardando...</span>
                        ) : (
                          <>
                            <span className="hidden sm:inline">Guardar</span>
                            <span className="sm:hidden">Save</span>
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => {
                          // If client has no email, show dialog to add one
                          if (
                            !estimate.client?.email ||
                            estimate.client.email.trim() === ""
                          ) {
                            setShowEmailDialog(true);
                          } else {
                            openEmailCompose();
                          }
                        }}
                        disabled={!estimate.client}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Enviar Email</span>
                        <span className="sm:hidden">Email</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="md:container md:mx-auto mt-10 md:mt-0 px-4 sm:px-4 py-4 sm:py-8  md:max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl  md:text-3xl font-bold mb-2 truncate">
              {isEditMode ? "Editar Estimado" : "Crear Nuevo Estimado"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isEditMode
                ? "Edita tu estimado existente y guarda los cambios"
                : "Sigue los pasos para crear un estimado profesional para tu cliente"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEstimatesHistory(true);
                loadSavedEstimates();
              }}
              className="border-blue-300 text-blue-600 hover:bg-blue-50 w-full sm:w-auto shrink-0"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Mis </span>Estimados
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center max-w-4xl mx-auto px-4">
          <div className="flex items-center w-full max-w-2xl">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={`flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 mb-2 transition-all duration-300 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-lg scale-110"
                          : isCompleted
                            ? "border-green-600 bg-green-600 text-white shadow-md"
                            : "border-muted-foreground/40 bg-background"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 sm:h-6 sm:w-6" />
                      ) : (
                        <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
                      )}
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-medium text-center transition-colors duration-300 ${
                        isActive
                          ? "text-primary font-semibold"
                          : isCompleted
                            ? "text-green-600"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 flex items-center px-2 sm:px-4">
                      <div
                        className={`w-full h-1 rounded-full transition-all duration-500 ${
                          isCompleted
                            ? "bg-green-600"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Step Content */}
      <div className="mb-8">{renderCurrentStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={handleDownload}
              disabled={!estimate.client || estimate.items.length === 0}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Finalizar y </span>Descargar
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceedToNext()}
              className="w-full sm:w-auto"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Overlay futurista de DeepSearch AI */}

      {/* Mensaje emergente de Mervin - Compacto y Responsive */}
      {showMervinMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md mx-auto">
          <div className="bg-gradient-to-r from-cyan-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <img
                    src={mervinLogoUrl}
                    alt="Mervin"
                    className="w-6 h-6 object-contain"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white mb-1">
                  ¡Lista generada! 👋
                </h3>
                <p className="text-gray-200 text-xs leading-relaxed">
                  Revisa y ajusta los materiales según necesites. ¡Tu feedback
                  me ayuda a mejorar!
                </p>
              </div>
            </div>
            <div className="mt-3 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Diálogo de edición de empresa */}
      <Dialog
        open={showCompanyEditDialog}
        onOpenChange={setShowCompanyEditDialog}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Editar Información de Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo">Logo de la Empresa</Label>
                <div className="flex items-center gap-4">
                  {editableCompany.logo && (
                    <img
                      src={editableCompany.logo}
                      alt="Logo actual"
                      className="w-16 h-16 object-contain border rounded"
                    />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditableCompany((prev) => ({
                            ...prev,
                            logo: event.target?.result as string,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Sube una imagen para el logo de tu empresa (PNG, JPG, etc.)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Nombre de la Empresa</Label>
                <Input
                  id="company"
                  value={editableCompany.company}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  placeholder="Nombre de tu empresa"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={editableCompany.phone}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={editableCompany.address}
                onChange={(e) =>
                  setEditableCompany((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={editableCompany.city}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  placeholder="Ciudad"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={editableCompany.state}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      state: e.target.value,
                    }))
                  }
                  placeholder="CA"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Código Postal</Label>
                <Input
                  id="zipCode"
                  value={editableCompany.zipCode}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      zipCode: e.target.value,
                    }))
                  }
                  placeholder="12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editableCompany.email}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="info@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={editableCompany.website}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                  placeholder="www.empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="license">Licencia</Label>
                <Input
                  id="license"
                  value={editableCompany.license}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      license: e.target.value,
                    }))
                  }
                  placeholder="Número de licencia"
                />
              </div>
              <div>
                <Label htmlFor="insurancePolicy">Póliza de Seguro</Label>
                <Input
                  id="insurancePolicy"
                  value={editableCompany.insurancePolicy}
                  onChange={(e) =>
                    setEditableCompany((prev) => ({
                      ...prev,
                      insurancePolicy: e.target.value,
                    }))
                  }
                  placeholder="Número de póliza"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompanyEditDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                // Actualizar la información del contratista temporalmente para esta sesión
                const updatedContractor = {
                  ...contractor,
                  company: editableCompany.company,
                  name: editableCompany.company,
                  address: editableCompany.address,
                  city: editableCompany.city,
                  state: editableCompany.state,
                  zipCode: editableCompany.zipCode,
                  phone: editableCompany.phone,
                  email: editableCompany.email,
                  website: editableCompany.website,
                  license: editableCompany.license,
                  insurancePolicy: editableCompany.insurancePolicy,
                  logo: editableCompany.logo,
                };
                setContractor(updatedContractor);
                setShowCompanyEditDialog(false);
                setPreviewHtml(""); // Forzar regeneración de la vista previa
                toast({
                  title: "✅ Información Actualizada",
                  description:
                    "Los cambios se aplicarán al estimado. Logo y datos de empresa actualizados.",
                });
              }}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Configuration Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Invoice Configuration
            </DialogTitle>
            <DialogDescription>
              Configure invoice settings before generation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Project Completion Status */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Has the project been completed?
              </Label>
              <div className="flex gap-3">
                <Button
                  variant={
                    invoiceConfig.projectCompleted === true
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setInvoiceConfig((prev) => ({
                      ...prev,
                      projectCompleted: true,
                    }))
                  }
                  className="flex-1"
                >
                  Yes
                </Button>
                <Button
                  variant={
                    invoiceConfig.projectCompleted === false
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setInvoiceConfig((prev) => ({
                      ...prev,
                      projectCompleted: false,
                    }))
                  }
                  className="flex-1"
                >
                  No
                </Button>
              </div>
            </div>

            {/* Down Payment Amount - Only show if project is not completed */}
            {invoiceConfig.projectCompleted === false && (
              <div className="space-y-3">
                <Label htmlFor="downPayment" className="text-sm font-medium">
                  How much down payment has been paid?
                </Label>
                <Input
                  id="downPayment"
                  type="number"
                  placeholder="Enter amount (e.g., 500.00)"
                  value={invoiceConfig.downPaymentAmount}
                  onChange={(e) =>
                    setInvoiceConfig((prev) => ({
                      ...prev,
                      downPaymentAmount: e.target.value,
                    }))
                  }
                  className="w-full"
                />
              </div>
            )}

            {/* Total Amount Payment Status */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Has the total amount been paid by client?
              </Label>
              <div className="flex gap-3">
                <Button
                  variant={
                    invoiceConfig.totalAmountPaid === true
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setInvoiceConfig((prev) => ({
                      ...prev,
                      totalAmountPaid: true,
                    }))
                  }
                  className="flex-1"
                >
                  Yes
                </Button>
                <Button
                  variant={
                    invoiceConfig.totalAmountPaid === false
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setInvoiceConfig((prev) => ({
                      ...prev,
                      totalAmountPaid: false,
                    }))
                  }
                  className="flex-1"
                >
                  No
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowInvoiceDialog(false);
                setInvoiceConfig({
                  projectCompleted: null,
                  downPaymentAmount: "",
                  totalAmountPaid: null,
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Validate required fields
                if (
                  invoiceConfig.projectCompleted === null ||
                  invoiceConfig.totalAmountPaid === null
                ) {
                  toast({
                    title: "Configuration Required",
                    description:
                      "Please answer all questions before proceeding",
                    variant: "destructive",
                  });
                  return;
                }

                if (
                  invoiceConfig.projectCompleted === false &&
                  !invoiceConfig.downPaymentAmount
                ) {
                  toast({
                    title: "Down Payment Required",
                    description: "Please enter the down payment amount",
                    variant: "destructive",
                  });
                  return;
                }

                // Validate contractor profile
                if (!profile?.company) {
                  toast({
                    title: "Profile Incomplete",
                    description:
                      "Complete your company name in your profile before generating invoices.",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  // Prepare invoice data payload
                  const invoicePayload = {
                    profile: {
                      company: profile.company,
                      address: profile.address
                        ? `${profile.address}${profile.city ? ", " + profile.city : ""}${profile.state ? ", " + profile.state : ""}${profile.zipCode ? " " + profile.zipCode : ""}`
                        : "",
                      phone: profile.phone || "",
                      email: profile.email || currentUser?.email || "",
                      website: profile.website || "",
                      logo: profile.logo || "",
                    },
                    estimate: {
                      client: estimate.client,
                      items: estimate.items,
                      subtotal: estimate.subtotal,
                      discountAmount: estimate.discountAmount,
                      taxRate: estimate.taxRate,
                      tax: estimate.tax,
                      total: estimate.total,
                    },
                    invoiceConfig,
                  };

                  console.log(
                    "Generating invoice PDF with payload:",
                    invoicePayload,
                  );

                  // Call invoice PDF service
                  const response = await axios.post(
                    "/api/invoice-pdf",
                    invoicePayload,
                    {
                      responseType: "blob",
                    },
                  );

                  // Create download link
                  const blob = new Blob([response.data], {
                    type: "application/pdf",
                  });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `invoice-${Date.now()}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);

                  // Close dialog and show success message
                  setShowInvoiceDialog(false);
                  setInvoiceConfig({
                    projectCompleted: null,
                    downPaymentAmount: "",
                    totalAmountPaid: null,
                  });

                  toast({
                    title: "Invoice Generated",
                    description:
                      "Your professional invoice has been generated and downloaded successfully.",
                  });
                } catch (error) {
                  console.error("Error generating invoice:", error);
                  toast({
                    title: "Generation Failed",
                    description:
                      "Could not generate invoice. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Generate Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal del Historial de Estimados */}
      <Dialog
        open={showEstimatesHistory}
        onOpenChange={setShowEstimatesHistory}
      >
        <DialogContent className="p-4 md:m-0 md:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="my-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mis Estimados Guardados
            </DialogTitle>
            <DialogDescription className="my-4">
              Historial completo de todos los estimados creados y guardados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {isLoadingEstimates ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando estimados...
                </div>
              </div>
            ) : savedEstimates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">
                  No hay estimados guardados
                </p>
                <p className="text-muted-foreground">
                  Crea y descarga tu primer estimado para verlo aquí
                </p>
              </div>
            ) : (
              <div className="max-h-80  px-2">
                <div className="space-y-2">
                  {savedEstimates.map((estimate) => (
                    <div
                      key={estimate.id}
                      className="border rounded-lg p-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate">
                              {estimate.estimateNumber}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                                estimate.status === "draft"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : estimate.status === "sent"
                                    ? "bg-blue-100 text-blue-800"
                                    : estimate.status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {estimate.status === "draft"
                                ? "Borrador"
                                : estimate.status === "sent"
                                  ? "Enviado"
                                  : estimate.status === "approved"
                                    ? "Aprobado"
                                    : estimate.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 text-sm text-gray-600">
                            <div className="truncate">
                              <span className="font-medium">Cliente:</span>{" "}
                              {estimate.clientName}
                            </div>
                            <div className="truncate">
                              <span className="font-medium">Total:</span> $
                              {(estimate.total / 100).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {estimate.projectType || "Cerca"} •{" "}
                            {new Date(estimate.estimateDate).toLocaleDateString(
                              "es-ES",
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                // Validar que el perfil del contractor esté completo
                                if (!profile?.company) {
                                  toast({
                                    title: "❌ Perfil Incompleto",
                                    description:
                                      "Debes completar el nombre de tu empresa en tu perfil antes de generar PDFs.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                // Get stored estimate data from originalData field
                                const estimateData = estimate.originalData;

                                if (!estimateData) {
                                  toast({
                                    title: "Error de datos",
                                    description:
                                      "No se pudieron cargar los datos del estimado",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                // Extract client information from different possible locations
                                const clientInfo =
                                  estimateData.clientInformation ||
                                    estimateData.client || {
                                      name: estimate.clientName,
                                      email: estimate.clientEmail || "",
                                      phone: "",
                                      address: "",
                                    };

                                // Extract items from different possible locations
                                const items =
                                  estimateData.projectTotalCosts?.materialCosts
                                    ?.items ||
                                  estimateData.items ||
                                  estimate.items ||
                                  [];

                                // Extract financial data for tax and discount calculations
                                const totalCosts =
                                  estimateData.projectTotalCosts?.totalSummary;
                                const subtotal =
                                  totalCosts?.subtotal ||
                                  estimateData.subtotal ||
                                  estimate.subtotal ||
                                  0;
                                const discountAmount =
                                  totalCosts?.discountAmount ||
                                  estimateData.discountAmount ||
                                  estimate.discountAmount ||
                                  0;
                                const taxAmount =
                                  totalCosts?.tax ||
                                  estimateData.tax ||
                                  estimate.tax ||
                                  0;
                                const finalTotal =
                                  totalCosts?.finalTotal ||
                                  estimateData.total ||
                                  estimate.total ||
                                  0;

                                const payload = {
                                  company: {
                                    name: profile.company,
                                    address: profile.address
                                      ? `${profile.address}${profile.city ? ", " + profile.city : ""}${profile.state ? ", " + profile.state : ""}${profile.zipCode ? " " + profile.zipCode : ""}`
                                      : "",
                                    phone: profile.phone || "",
                                    email:
                                      profile.email || currentUser?.email || "",
                                    website: profile.website || "",
                                    logo: profile.logo || "",
                                  },
                                  estimate: {
                                    number:
                                      estimate.estimateNumber ||
                                      "EST-" + Date.now(),
                                    date: new Date().toLocaleDateString(),
                                    valid_until: new Date(
                                      Date.now() + 30 * 24 * 60 * 60 * 1000,
                                    ).toLocaleDateString(),
                                    project_description: (
                                      estimateData.projectDetails
                                        ?.description ||
                                      estimateData.projectDescription ||
                                      estimateData.projectScope ||
                                      estimate.projectDetails ||
                                      ""
                                    ).substring(0, 500),
                                    items: items.map((item: any) => ({
                                      code:
                                        item.name || item.material || "Item",
                                      description: item.description || "",
                                      qty: item.quantity || 1,
                                      unit_price: `$${Number(item.price || item.unitPrice || 0).toFixed(2)}`,
                                      total: `$${Number(item.total || item.totalPrice || item.quantity * item.price || 0).toFixed(2)}`,
                                    })),
                                    subtotal: `$${Number(subtotal / 100).toFixed(2)}`,
                                    discounts:
                                      discountAmount > 0
                                        ? `-$${Number(discountAmount / 100).toFixed(2)}`
                                        : "$0.00",
                                    tax_rate:
                                      Math.round(
                                        (taxAmount /
                                          (subtotal - discountAmount)) *
                                          100,
                                      ) || 0,
                                    tax_amount:
                                      taxAmount > 0
                                        ? `$${Number(taxAmount / 100).toFixed(2)}`
                                        : "$0.00",
                                    total: `$${Number(finalTotal / 100).toFixed(2)}`,
                                  },
                                  client: {
                                    name:
                                      clientInfo.name ||
                                      estimate.clientName ||
                                      "",
                                    email:
                                      clientInfo.email ||
                                      estimate.clientEmail ||
                                      "",
                                    phone: clientInfo.phone || "",
                                    address: clientInfo.address
                                      ? `${clientInfo.address}${clientInfo.city ? ", " + clientInfo.city : ""}${clientInfo.state ? ", " + clientInfo.state : ""}${clientInfo.zipCode ? " " + clientInfo.zipCode : ""}`
                                      : "",
                                  },
                                  firebaseUid: currentUser?.uid,
                                };

                                console.log(
                                  "📊 Full Payload enviado a PDF:",
                                  JSON.stringify(payload, null, 2),
                                );
                                console.log(
                                  "📊 Items being sent:",
                                  payload.estimate.items,
                                );

                                const res = await axios.post(
                                  "/api/estimate-basic-pdf",
                                  payload,
                                );
                                const downloadUrl = res.data.data.download_url;

                                if (downloadUrl) {
                                  window.open(downloadUrl, "_blank");
                                  toast({
                                    title: "✅ PDF Generado",
                                    description:
                                      "El PDF se ha generado y descargado correctamente",
                                  });
                                } else {
                                  toast({
                                    title: "Error",
                                    description:
                                      "No se pudo obtener la URL de descarga del PDF",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                console.error("Error generating PDF:", error);
                                toast({
                                  title: "❌ Error al generar PDF",
                                  description:
                                    "No se pudo generar el PDF. Inténtalo de nuevo.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="h-8 px-2"
                          >
                            <Download className="h-3 w-3" />
                            <span className="hidden sm:inline ml-1">PDF</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Close the dialog and navigate to edit estimate exactly like Projects page
                              setShowEstimatesHistory(false);
                              window.location.href = `/estimates?edit=${estimate.id}`;
                            }}
                            className="h-8 px-2"
                          >
                            <Edit className="h-3 w-3" />
                            <span className="hidden sm:inline ml-1">
                              Editar
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEstimatesHistory(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setShowEstimatesHistory(false);
                // Reset form for new estimate and clear edit mode
                setIsEditMode(false);
                setEditingEstimateId(null);
                setCurrentStep(0);
                setEstimate({
                  client: null,
                  items: [],
                  projectDetails: "",
                  subtotal: 0,
                  tax: 0,
                  total: 0,
                  taxRate: 10,
                  discountType: "percentage",
                  discountValue: 0,
                  discountAmount: 0,
                  discountName: "",
                });
                // Clear URL parameters
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname,
                );
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Estimado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete PDF Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[95vh] ">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              Professional Estimate Preview
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Complete preview of your professional estimate as it will appear
              in the PDF
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Complete PDF Preview */}
            <div className="bg-white border border-gray-200 rounded-xl ">
              <div
                className="p-8 bg-white"
                style={{
                  fontFamily: "Arial, sans-serif",
                  lineHeight: "1.6",
                  color: "#333",
                }}
              >
                {/* Header with Company Logo and Info */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    {profile?.logo ? (
                      <img
                        src={profile.logo}
                        alt="Company Logo"
                        className="h-16 w-16 object-contain"
                      />
                    ) : (
                      <div className="h-16 w-16 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-xs">
                        Logo
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-blue-900">
                        {profile?.company || "Your Company"}
                      </h1>
                      <p className="text-gray-600">
                        {profile?.address || "Company Address"}
                      </p>
                      <p className="text-gray-600">
                        {profile?.city}, {profile?.state} {profile?.zipCode}
                      </p>
                      <p className="text-gray-600">
                        Phone: {profile?.phone || "Phone Number"}
                      </p>
                      <p className="text-gray-600">
                        Email: {profile?.email || "Email Address"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">
                      PROFESSIONAL ESTIMATE
                    </h2>
                    <p className="text-gray-600">
                      Date: {new Date().toLocaleDateString()}
                    </p>
                    <p className="text-gray-600">
                      Estimate #: EST-{new Date().getFullYear()}-
                      {String(Date.now()).slice(-4)}
                    </p>
                  </div>
                </div>

                {/* Client Information */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">
                    Bill To:
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">
                        {estimate.client?.name || "Client Name"}
                      </p>
                      <p className="text-gray-600">
                        {estimate.client?.address || "Client Address"}
                      </p>
                      <p className="text-gray-600">
                        {estimate.client?.city}, {estimate.client?.state}{" "}
                        {estimate.client?.zipCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">
                        Phone: {estimate.client?.phone || "Phone Number"}
                      </p>
                      <p className="text-gray-600">
                        Email: {estimate.client?.email || "Email Address"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                {estimate.projectDetails && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                      Project Description:
                    </h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">
                      {estimate.projectDetails}
                    </p>
                  </div>
                )}

                {/* Items Table */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Items & Services:
                  </h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="border border-gray-300 p-3 text-left">
                          Description
                        </th>
                        <th className="border border-gray-300 p-3 text-center">
                          Quantity
                        </th>
                        <th className="border border-gray-300 p-3 text-center">
                          Unit
                        </th>
                        <th className="border border-gray-300 p-3 text-right">
                          Unit Price
                        </th>
                        <th className="border border-gray-300 p-3 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.items.map((item, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-gray-50" : "bg-white"
                          }
                        >
                          <td className="border border-gray-300 p-3">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {item.quantity}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {item.unit}
                          </td>
                          <td className="border border-gray-300 p-3 text-right">
                            ${item.price.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-3 text-right font-medium">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="mb-8">
                  <div className="flex justify-end">
                    <div className="w-80">
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Subtotal:</span>
                          <span className="font-medium">
                            ${estimate.subtotal.toFixed(2)}
                          </span>
                        </div>

                        {estimate.discountAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>
                              Discount ({estimate.discountName || "Discount"}):
                            </span>
                            <span>-${estimate.discountAmount.toFixed(2)}</span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-gray-700">
                            Tax ({estimate.taxRate}%):
                          </span>
                          <span className="font-medium">
                            ${estimate.tax.toFixed(2)}
                          </span>
                        </div>

                        <div className="border-t border-gray-300 pt-2">
                          <div className="flex justify-between text-lg font-bold text-blue-900">
                            <span>Total:</span>
                            <span>${estimate.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">
                    Terms & Conditions:
                  </h3>
                  <div className="text-sm text-gray-700 space-y-2 bg-gray-50 p-4 rounded-lg">
                    <p>
                      • This estimate is valid for 30 days from the date issued.
                    </p>
                    <p>• A 50% deposit is required to begin work.</p>
                    <p>
                      • Final payment is due upon completion of the project.
                    </p>
                    <p>
                      • All materials and workmanship are guaranteed for one
                      year.
                    </p>
                    <p>
                      • Changes to the scope of work may affect the final price.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-6 border-t border-gray-300">
                  <p className="text-gray-600">
                    Thank you for choosing {profile?.company || "our services"}!
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    For questions about this estimate, please contact us at{" "}
                    {profile?.phone || "phone"} or {profile?.email || "email"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Close Preview
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreview(false);
                  setShowEmailDialog(true);
                }}
                disabled={!estimate.client?.email}
                className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!estimate.client || estimate.items.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[95vh] overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-white">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-5 w-5 text-blue-600" />
              Send Professional Estimate
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Send your estimate directly to the client
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Client Information Card */}
              {estimate.client && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Client Information
                    </h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Name
                        </label>
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                          {estimate.client.name}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Email
                        </label>
                        {!estimate.client.email ||
                        estimate.client.email.trim() === "" ? (
                          <div className="space-y-2">
                            <Input
                              type="email"
                              placeholder="Enter client email..."
                              className="text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const input = e.target as HTMLInputElement;
                                  const newEmail = input.value.trim();
                                  if (
                                    newEmail &&
                                    /\S+@\S+\.\S+/.test(newEmail)
                                  ) {
                                    // Update client email
                                    setEstimate((prev) => ({
                                      ...prev,
                                      client: prev.client
                                        ? { ...prev.client, email: newEmail }
                                        : null,
                                    }));
                                    // Update localStorage
                                    if (estimate.client) {
                                      const updatedClient = {
                                        ...estimate.client,
                                        email: newEmail,
                                      };
                                      localStorage.setItem(
                                        "currentEstimateClient",
                                        JSON.stringify(updatedClient),
                                      );

                                      // Update client in Firebase
                                      try {
                                        fetch("/api/clients", {
                                          method: "PUT",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            id: estimate.client.id,
                                            email: newEmail,
                                          }),
                                        });
                                      } catch (error) {
                                        console.log(
                                          "Failed to update client in Firebase:",
                                          error,
                                        );
                                      }
                                    }
                                    toast({
                                      title: "Email Updated",
                                      description: `Client email set to ${newEmail}`,
                                    });
                                  }
                                }
                              }}
                            />
                            <p className="text-xs text-gray-500">
                              Press Enter to save email
                            </p>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg break-all">
                            {estimate.client.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Configuration */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Email Configuration
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  {/* Email Recipient */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="toEmail"
                      className="text-sm font-medium text-gray-700"
                    >
                      Send to Email Address *
                    </Label>
                    <Input
                      id="toEmail"
                      type="email"
                      value={emailData.toEmail}
                      onChange={(e) =>
                        setEmailData((prev) => ({
                          ...prev,
                          toEmail: e.target.value,
                        }))
                      }
                      placeholder="client@email.com"
                      className="w-full h-11 text-sm"
                    />
                  </div>

                  {/* Email Subject */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="subject"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Subject *
                    </Label>
                    <Input
                      id="subject"
                      value={emailData.subject}
                      onChange={(e) =>
                        setEmailData((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      placeholder="Professional Estimate - Your Project"
                      className="w-full h-11 text-sm"
                    />
                  </div>

                  {/* Personal Message */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-sm font-medium text-gray-700"
                    >
                      Personal Message *
                    </Label>
                    <Textarea
                      id="message"
                      value={emailData.message}
                      onChange={(e) =>
                        setEmailData((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      placeholder="Dear [Client Name], I hope this message finds you well. Please find attached our professional estimate for your project..."
                      rows={5}
                      className="w-full resize-none text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      This message will be included in the email body
                    </p>
                  </div>

                  {/* Send Copy Option */}
                  <div className="pt-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="sendCopy"
                        checked={emailData.sendCopy}
                        onChange={(e) =>
                          setEmailData((prev) => ({
                            ...prev,
                            sendCopy: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="sendCopy"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          Send me a copy
                        </Label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Copy will be sent to: {profile?.email || "your email"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    Email Preview
                  </h4>
                </div>
                <div className="p-4">
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
                    {/* Email Headers */}
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium text-gray-600 min-w-12">
                          To:
                        </span>
                        <span className="text-gray-900 break-all font-mono text-xs bg-white px-2 py-1 rounded">
                          {emailData.toEmail || "client@email.com"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium text-gray-600 min-w-12">
                          From:
                        </span>
                        <span className="text-gray-900 break-all font-mono text-xs bg-white px-2 py-1 rounded">
                          {profile?.email || "your@email.com"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium text-gray-600 min-w-12">
                          Subject:
                        </span>
                        <span className="text-gray-900 break-words bg-white px-2 py-1 rounded flex-1">
                          {emailData.subject || "Professional Estimate"}
                        </span>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="border-t border-gray-300 pt-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {emailData.message ||
                            "Your message will appear here..."}
                        </div>
                      </div>
                    </div>

                    {/* Attachment Info */}
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <span>📎</span>
                      <span className="font-medium">
                        Professional estimate attached
                      </span>
                    </div>

                    {/* Copy Notification */}
                    {emailData.sendCopy && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                        <span>✓</span>
                        <span className="font-medium">
                          Copy will be sent to you
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={sendEstimateEmail}
                disabled={
                  isSendingEmail ||
                  !emailData.toEmail.trim() ||
                  !emailData.subject.trim() ||
                  !emailData.message.trim()
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="w-[95vw] max-w-5xl h-[95vh] flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-cyan-500/30 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-700 flex-shrink-0 bg-gray-900/50">
            <DialogTitle className="text-xl font-bold text-cyan-300 flex items-center gap-3">
              <Eye className="h-5 w-5" />
              Email Preview - Professional Format
            </DialogTitle>
            <div className="text-sm text-gray-400 mt-2">
              Review how your email will look before sending it to the client
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0 email-preview-scroll">
            {/* Email Headers Preview */}
            <div className="bg-gray-800/60 rounded-xl p-4 border border-cyan-500/30 shadow-lg">
              <h3 className="text-cyan-300 font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Headers
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-cyan-300 font-medium min-w-16">
                    To:
                  </span>
                  <span className="text-white bg-gray-700/50 px-3 py-1 rounded break-all">
                    {emailData.toEmail}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-cyan-300 font-medium min-w-16">
                    From:
                  </span>
                  <span className="text-white bg-gray-700/50 px-3 py-1 rounded break-all">
                    {profile?.email || "contact@company.com"}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-cyan-300 font-medium min-w-16">
                    Subject:
                  </span>
                  <span className="text-white bg-gray-700/50 px-3 py-1 rounded break-words flex-1">
                    {emailData.subject}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Content Preview */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Professional Email Content
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Message Preview */}
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Personal Message
                  </h4>
                  <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                    {emailData.message}
                  </div>
                </div>

                {/* Professional Estimate Preview */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Attached Professional Estimate
                  </h4>

                  {previewHtml ? (
                    <div className="border-2 border-blue-200 rounded-lg overflow-hidden shadow-lg">
                      <div className="bg-blue-50 px-4 py-2 text-sm text-blue-700 font-medium flex items-center gap-2 border-b">
                        <Eye className="h-4 w-4" />
                        Estimate Document Preview
                      </div>
                      <div className="bg-white">
                        <iframe
                          srcDoc={previewHtml}
                          className="w-full border-0"
                          title="Professional Estimate Preview"
                          style={{ height: "450px", minHeight: "450px" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 text-center">
                      <div className="text-blue-600 font-medium mb-3">
                        Generating estimate preview...
                      </div>
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  )}
                </div>

                {/* Quick Summary Card */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Estimate Summary
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-gray-600 mb-1">Client</div>
                      <div className="font-medium text-gray-800">
                        {estimate.client?.name}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-gray-600 mb-1">Line Items</div>
                      <div className="font-medium text-gray-800">
                        {estimate.items.length} items
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-gray-600 mb-1">Total Amount</div>
                      <div className="font-bold text-blue-600 text-lg">
                        ${estimate.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Signature */}
                <div className="border-t pt-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Professional Signature
                  </h4>
                  <div className="text-sm space-y-2 text-gray-700">
                    <div className="font-bold text-blue-600 text-base">
                      {profile?.company || profile?.name || "Your Company"}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {profile?.phone && (
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border">
                          <span className="text-blue-600">📞</span>
                          <span className="break-all">{profile.phone}</span>
                        </div>
                      )}
                      {profile?.email && (
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border">
                          <span className="text-blue-600">📧</span>
                          <span className="break-all">{profile.email}</span>
                        </div>
                      )}
                      {profile?.website && (
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border sm:col-span-2">
                          <span className="text-blue-600">🌐</span>
                          <span className="break-all">{profile.website}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Options */}
            {emailData.sendCopy && (
              <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-xl p-4 border border-blue-500/40 shadow-lg">
                <div className="text-sm text-blue-300 flex items-start gap-3">
                  <span className="text-green-400 flex-shrink-0 text-lg">
                    ✅
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">
                      Email Copy Notification
                    </div>
                    <div className="text-blue-200">
                      A copy of this email will be sent to:{" "}
                      <span className="font-medium">
                        {profile?.email || "your email"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-900/80 border-t border-gray-700 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowEmailPreview(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 flex-1 sm:flex-none sm:w-auto h-11"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
              <Button
                onClick={sendEstimateEmail}
                disabled={isSendingEmail}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white flex-1 sm:flex-none sm:w-auto h-11"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email Now
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DeepSearch Effect - Smart Search con frases futuristas */}
      <DeepSearchEffect
        isVisible={isAIProcessing}
        onComplete={() => setIsAIProcessing(false)}
      />

      {/* Mervin Working Effect */}
      <MervinWorkingEffect
        isVisible={showMervinWorking}
        onComplete={() => setShowMervinWorking(false)}
      />
    </div>
  );
}
