import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Search, Clock, Trash2, Paperclip, X, FileText, Upload, Download, MapPin, ArrowRight, ArrowLeft, Eye, Database, Building, RefreshCw, History, DollarSign, Lock, Crown, Zap } from "lucide-react";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { usePermissions } from "@/hooks/usePermissions";
import { UpgradePrompt } from "@/components/permissions/UpgradePrompt";
import { UserPlanSwitcher } from "@/components/dev/UserPlanSwitcher";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { generatePermitReportHTML, generatePDFReport, downloadPDFReport } from "@/utils/permitReportGenerator";

interface Project {
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

interface SearchHistoryItem {
  id: number;
  userId: number;
  address: string;
  projectType: string;
  projectDescription?: string;
  title: string;
  results: any;
  createdAt: string;
}

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  category: string;
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
  };
  [key: string]: any;
}

interface WizardStep {
  id: string;
  step: number;
  title: string;
  description: string;
  status: "pending" | "processing" | "completed";
  progress: number;
  icon: React.ReactNode;
  estimatedTime: string;
}

export default function PermitAdvisor() {
  // Wizard state management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Existing state - preserved exactly
  const [selectedAddress, setSelectedAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [projectType, setProjectType] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [permitData, setPermitData] = useState<PermitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("permits");
  const [showHistory, setShowHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { 
    userPlan, 
    canUse, 
    incrementUsage,
    getRemainingUsage,
    isLimitReached 
  } = usePermissions();
  
  // New states for project selection option
  const [selectionMode, setSelectionMode] = useState<"manual" | "existing">("manual");
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load existing projects when user changes to existing mode
  useEffect(() => {
    if (selectionMode === "existing" && user?.uid) {
      loadExistingProjects();
    }
  }, [selectionMode, user?.uid]);

  const loadExistingProjects = async () => {
    if (!user?.uid) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view your projects",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingProjects(true);
      console.log(`🔒 Loading projects for user: ${user.uid}`);

      let allProjects: any[] = [];

      // 1. Load from projects collection (same as Legal Defense)
      try {
        const projectsQuery = query(
          collection(db, "projects"),
          where("firebaseUserId", "==", user.uid),
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

            const projectType = data.projectType || data.projectDetails?.type || "fence";

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
              totalPrice: data.projectTotalCosts?.totalSummary?.finalTotal || 
                         data.projectTotalCosts?.total ||
                         data.total ||
                         data.estimateAmount ||
                         0,
              clientEmail: data.clientInformation?.email || data.clientEmail || "",
              clientPhone: data.clientInformation?.phone || data.clientPhone || "",
            };
          });

        allProjects = [...allProjects, ...projectEstimates];
        console.log(`📊 Loaded ${projectEstimates.length} projects from projects collection`);
      } catch (projectError) {
        console.warn("Could not load from projects collection:", projectError);
      }

      // 2. Load from estimates collection (same as Legal Defense)
      try {
        const estimatesQuery = query(
          collection(db, "estimates"),
          where("firebaseUserId", "==", user.uid),
        );

        const estimatesSnapshot = await getDocs(estimatesQuery);
        const firebaseEstimates = estimatesSnapshot.docs.map((doc) => {
          const data = doc.data();

          const clientName = data.clientName || data.client?.name || "Cliente sin nombre";
          const address = data.address || 
                         data.clientAddress || 
                         data.projectAddress ||
                         data.location ||
                         data.workAddress ||
                         data.propertyAddress ||
                         "";
          const projectType = data.projectType || "fence";
          const projectDescription = data.projectDescription || `${projectType} project for ${clientName}`;

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
        console.log(`📋 Loaded ${firebaseEstimates.length} additional estimates`);
      } catch (estimatesError) {
        console.warn("Could not load from estimates collection:", estimatesError);
      }

      // 3. Filter for valid projects with comprehensive data validation
      const validProjects = allProjects.filter((project: any) => {
        const hasClientName = project.clientName && 
                             project.clientName !== "Cliente sin nombre" && 
                             project.clientName.trim().length > 0;
        
        const hasAddress = project.address && project.address.trim().length > 0;
        
        const isValidProject = hasClientName && hasAddress;
        
        if (!isValidProject) {
          console.warn("⚠️ Invalid project filtered out:", {
            id: project.id,
            clientName: project.clientName,
            hasAddress,
            hasClientName
          });
        }
        
        return isValidProject;
      });

      // Remove duplicates by ID
      const uniqueProjects = validProjects.filter((project, index, self) => 
        index === self.findIndex(p => p.id === project.id)
      );

      setExistingProjects(uniqueProjects);
      console.log(`✅ Total loaded: ${uniqueProjects.length} unique valid projects for Permit Advisor`);
      
      if (uniqueProjects.length === 0) {
        console.log("❌ No valid projects found. User needs to create estimates first.");
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error Loading Projects",
        description: "Failed to load your existing projects",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectSelection = (project: Project) => {
    setSelectedProject(project);
    setSelectedAddress(project.address);
    setProjectType(project.projectType);
    setProjectDescription(project.projectDescription || `${project.projectType} project for ${project.clientName}`);
    
    toast({
      title: "Project Selected",
      description: `Loaded project for ${project.clientName}`,
    });
  };

  // Define wizard steps matching Legal Defense pattern
  const workflowSteps: WizardStep[] = [
    {
      id: "property-analysis",
      step: 1,
      title: "Property & Project Analysis",
      description: "Enter your property address to begin comprehensive permit analysis. Our system will identify local requirements and jurisdiction-specific regulations.",
      status: selectedAddress && coordinates
        ? "completed"
        : currentStep === 1
          ? "processing"
          : "pending",
      progress: selectedAddress && coordinates ? 100 : currentStep === 1 ? 50 : 0,
      icon: <MapPin className="h-6 w-6" />,
      estimatedTime: "1 min",
    },
    {
      id: "project-details",
      step: 2,
      title: "Project Details & Documentation",
      description: "Specify your project type, provide detailed description, and attach relevant documents. This information helps generate precise permit requirements.",
      status: projectType && projectDescription
        ? "completed"
        : currentStep === 2
          ? "processing"
          : "pending",
      progress: projectType && projectDescription ? 100 : currentStep === 2 ? 50 : 0,
      icon: <FileText className="h-6 w-6" />,
      estimatedTime: "2 min",
    },
    {
      id: "deepsearch-results",
      step: 3,
      title: "DeepSearch Results & Analysis",
      description: "Review comprehensive permit requirements, building codes, timeline estimates, and download your professional permit analysis report.",
      status: permitData
        ? "completed"
        : currentStep === 3
          ? "processing"
          : "pending",
      progress: permitData ? 100 : currentStep === 3 ? 50 : 0,
      icon: <Eye className="h-6 w-6" />,
      estimatedTime: "3 min",
    },
  ];

  // Query para obtener historial real de Firebase
  const {
    data: historyData = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["permitHistory", currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) return [];

      try {
        // Intentar diferentes estrategias para cargar el historial
        let q;
        try {
          // Primero intentar con orderBy
          q = query(
            collection(db, "permit_search_history"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(50),
          );
        } catch (error) {
          // Si falla orderBy, intentar sin él
          console.log("⚠️ OrderBy failed, trying without...");
          q = query(
            collection(db, "permit_search_history"),
            where("userId", "==", currentUser.uid),
            limit(50),
          );
        }

        const querySnapshot = await getDocs(q);
        const history: any[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            ...data,
            // Asegurar compatibilidad con timestamps
            createdAt: data.createdAt || data.timestamp || new Date(),
          });
        });

        // Ordenar manualmente por fecha si no se pudo hacer en la query
        history.sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        console.log(
          `📋 Historial cargado: ${history.length} búsquedas encontradas`,
        );
        return history;
      } catch (error) {
        console.error("❌ Error obteniendo historial:", error);

        // Fallback: intentar obtener todas las búsquedas sin filtros complejos
        try {
          console.log("🔄 Intentando fallback simple...");
          const simpleQuery = collection(db, "permit_search_history");
          const snapshot = await getDocs(simpleQuery);
          const fallbackHistory: any[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId === currentUser.uid) {
              fallbackHistory.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt || data.timestamp || new Date(),
              });
            }
          });

          console.log(
            `📋 Fallback cargado: ${fallbackHistory.length} búsquedas`,
          );
          return fallbackHistory.slice(0, 50); // Limitar a 50
        } catch (fallbackError) {
          console.error("❌ Fallback también falló:", fallbackError);
          return [];
        }
      }
    },
    enabled: !!currentUser?.uid,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Funciones para el historial de Firebase con retry automático
  const saveToHistory = async (results: any, retryCount = 3) => {
    if (!currentUser?.uid || !selectedAddress || !projectType) {
      console.log(
        "⚠️ No se puede guardar: faltan datos del usuario o búsqueda",
      );
      return;
    }

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const title = `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} en ${selectedAddress}`;

        const historyItem = {
          userId: currentUser.uid,
          address: selectedAddress,
          projectType,
          projectDescription: projectDescription || "",
          results,
          title,
          createdAt: Timestamp.now(),
          timestamp: new Date().toISOString(), // Backup timestamp
        };

        const docRef = await addDoc(
          collection(db, "permit_search_history"),
          historyItem,
        );
        console.log(
          `✅ Búsqueda guardada en historial de Firebase (ID: ${docRef.id})`,
        );

        // Actualizar la lista inmediatamente
        setTimeout(() => {
          refetchHistory();
        }, 500);

        return docRef.id; // Éxito, salir del loop
      } catch (error) {
        console.error(
          `❌ Error al guardar en historial (intento ${attempt}/${retryCount}):`,
          error,
        );

        if (attempt === retryCount) {
          // En el último intento, mostrar el error al usuario
          toast({
            title: "⚠️ History Save Warning",
            description:
              "Search completed but couldn't save to history. Your results are still available.",
            variant: "default",
          });
        } else {
          // Esperar antes del siguiente intento
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  };

  // Filtrar historial según búsqueda
  const filteredHistory = historyData.filter((item: any) => {
    if (!searchFilter) return true;
    const searchTerm = searchFilter.toLowerCase();
    return (
      item.address?.toLowerCase().includes(searchTerm) ||
      item.projectType?.toLowerCase().includes(searchTerm) ||
      item.title?.toLowerCase().includes(searchTerm)
    );
  });

  const getProjectIcon = (type: string) => {
    const icons: Record<string, string> = {
      electrical: "⚡",
      plumbing: "🚿",
      roofing: "🏠",
      bathroom: "🛁",
      kitchen: "🍳",
      addition: "🏗️",
      concrete: "🧱",
      default: "🔧",
    };
    return icons[type.toLowerCase()] || icons.default;
  };

  const getProjectTypeColor = (projectType: string): string => {
    const colors: Record<string, string> = {
      electrical: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      plumbing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      roofing: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      bathroom: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      kitchen: "bg-green-500/20 text-green-300 border-green-500/30",
      addition: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      concrete: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      fence: "bg-teal-500/20 text-teal-300 border-teal-500/30",
      deck: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      hvac: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      pool: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      default: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    };
    return colors[projectType.toLowerCase()] || colors.default;
  }

  const getProjectTypeIcon = (projectType: string): string => {
    const icons: Record<string, string> = {
      electrical: '⚡',
      plumbing: '🚿',
      roofing: '🏠',
      bathroom: '🛁',
      kitchen: '🍳',
      addition: '🏗️',
      concrete: '🧱',
      fence: '🚧',
      deck: '🏘️',
      pool: '🏊',
      hvac: '❄️',
      solar: '☀️',
      garage: '🏢',
      shed: '🏠',
      driveway: '🛣️',
      default: '🔧'
    };
    
    return icons[projectType.toLowerCase()] || icons.default;
  };

  const loadFromHistory = (historyItem: any) => {
    setSelectedAddress(historyItem.address);
    setProjectType(historyItem.projectType);
    setProjectDescription(historyItem.projectDescription || "");
    setPermitData(historyItem.results);
    setShowHistory(false);
    
    // Navigate to step 3 to show DeepSearch results
    setCurrentStep(3);
    
    toast({
      title: "Search Loaded",
      description: `Loaded: ${historyItem.title}`,
    });
  };

  // File handling functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Maximum file size: 10MB
    const maxSize = 10 * 1024 * 1024;
    
    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 10MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not supported. Please use PDF, Word, text, or image files.' };
    }

    return { isValid: true };
  };

  const categorizeFile = (file: File): string => {
    const name = file.name.toLowerCase();
    
    if (name.includes('permit') || name.includes('permiso')) return 'Permits';
    if (name.includes('estimate') || name.includes('estimado')) return 'Estimates';
    if (name.includes('scope') || name.includes('trabajo')) return 'Scope of Work';
    if (name.includes('plan') || name.includes('blueprint') || name.includes('plano')) return 'Plans';
    if (name.includes('contract') || name.includes('contrato')) return 'Contracts';
    
    if (file.type === 'application/pdf') return 'Documents';
    if (file.type.startsWith('image/')) return 'Images';
    
    return 'Other';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const newFiles: AttachedFile[] = [];
    let hasErrors = false;

    files.forEach((file) => {
      const validation = validateFile(file);
      
      if (validation.isValid) {
        const attachedFile: AttachedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          category: categorizeFile(file)
        };
        newFiles.push(attachedFile);
      } else {
        hasErrors = true;
        toast({
          title: "File Error",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive",
        });
      }
    });

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Files Uploaded",
        description: `Successfully uploaded ${newFiles.length} file(s)`,
        variant: "default",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: "File Removed",
      description: "File has been removed from the project",
      variant: "default",
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleExportPDF = async () => {
    if (!permitData || !profile) {
      toast({
        title: "Cannot Export PDF",
        description: "No permit data or company profile available",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);
    try {
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

      // Ensure permitData has timestamp in meta
      const permitDataWithTimestamp = {
        ...permitData,
        meta: {
          ...permitData.meta,
          timestamp: (permitData.meta as any)?.timestamp || new Date().toISOString()
        }
      };

      // Generate PDF using the utility functions
      const pdfBlob = await generatePDFReport(permitDataWithTimestamp, companyInfo);
      
      // Download the PDF
      downloadPDFReport(pdfBlob, permitDataWithTimestamp);
      
      toast({
        title: "PDF Export Successful",
        description: "Permit analysis report has been downloaded",
        variant: "default",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "PDF Export Failed",
        description: "There was an error generating the PDF report",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Wizard navigation functions
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToStep2 = () => {
    return selectedAddress && coordinates;
  };

  const canProceedToStep3 = () => {
    return projectType && projectDescription;
  };

  const formatHistoryDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });
    } catch (error) {
      return "Unknown";
    }
  };

  const handleAddressSelect = (addressData: any) => {
    console.log(
      "📍 [MapboxPlaces] Dirección seleccionada:",
      addressData.address,
    );
    console.log("✅ [MapboxPlaces] Datos del lugar:", addressData);

    setSelectedAddress(addressData.address);
    setCoordinates(addressData.coordinates);
  };

  const handleSearch = async () => {
    if (!selectedAddress.trim()) {
      setError("Please enter an address");
      return;
    }
    if (!projectType) {
      setError("Please select a project type");
      return;
    }

    // Verificar permisos antes de proceder
    const canUsePermitAdvisor = canUse('permitAdvisor');
    if (!canUsePermitAdvisor) {
      toast({
        title: "Límite alcanzado",
        description: `Has alcanzado tu límite de consultas de Permit Advisor para este mes. Actualiza tu plan para continuar.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError("");
    setPermitData(null);

    try {
      console.log("===== INICIANDO SOLICITUD MERVIN DEEPSEARCH =====");

      const response = await apiRequest("POST", "/api/permit/check", {
        address: selectedAddress,
        projectType,
        projectDescription: projectDescription || `${projectType} project`,
        coordinates,
      });

      const data = await response.json();
      console.log("✅ Respuesta recibida del servidor:", data);
      setPermitData(data);

      // Incrementar uso después de una búsqueda exitosa
      await incrementUsage('permitAdvisor');

      // Guardar automáticamente en historial
      await saveToHistory(data);

      toast({
        title: "✅ DeepSearch Complete",
        description: "Permit analysis generated and saved to history!",
      });

      // Avanzar al paso 3
      setCurrentStep(3);
    } catch (error) {
      console.error("Error in permit search:", error);
      setError("Failed to analyze permits. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate PDF wrapper function
  const generatePDF = async () => {
    if (!permitData || !profile) return;
    
    try {
      setIsGeneratingPDF(true);
      
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

      // Ensure permitData has timestamp in meta
      const permitDataWithTimestamp = {
        ...permitData,
        meta: {
          ...permitData.meta,
          timestamp: (permitData.meta as any)?.timestamp || new Date().toISOString()
        }
      };
      
      const pdfBlob = await generatePDFReport(permitDataWithTimestamp, companyInfo);
      
      // Download the PDF
      downloadPDFReport(pdfBlob, permitDataWithTimestamp);
      
      toast({
        title: "PDF Generated Successfully",
        description: "Your permit analysis report has been downloaded.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF report.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const historyQuery = useQuery({
    queryKey: ["/api/permit/history"],
    enabled: showHistory,
  });

  const handleLoadHistoryItem = (item: SearchHistoryItem) => {
    setSelectedAddress(item.address);
    setProjectType(item.projectType);
    setProjectDescription(item.projectDescription || "");
    setPermitData(item.results);
    setShowHistory(false);

    toast({
      title: "History Loaded",
      description: `Loaded search for ${item.address}`,
    });
  };

  return (
    <div className="bg-gradient-to-br pb-40 from-slate-950 via-gray-900 to-slate-800">
      {/* Header with cyberpunk styling - Mobile Optimized */}
      <div className="relative bg-gradient-to-r from-slate-900/50 to-gray-900/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gray-800/10 opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent mb-1 sm:mb-2">
              Mervin DeepSearch
            </h1>
            <p className="text-sm sm:text-base text-gray-300 mb-1 sm:mb-2 px-2">
              AI-Powered Permit Analysis & Regulatory Intelligence
            </p>
            <div className="flex items-center justify-center gap-2 text-cyan-300">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-mono">
                Professional Grade Intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Permit Counter - Only for Limited Plans */}
      {userPlan && userPlan.limits.permitAdvisor !== -1 && (
        <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg blur-sm"></div>
            <Card className="relative border border-cyan-400/30 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <FileText className="h-5 w-5 text-cyan-400" />
                      <div className="absolute inset-0 h-5 w-5 bg-cyan-400/20 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Permit Analysis</p>
                      <p className="text-xs text-slate-400">Monthly Usage</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-cyan-300">
                        {getRemainingUsage('permitAdvisor')}
                      </span>
                      <span className="text-sm text-slate-400">remaining</span>
                      {isLimitReached('permitAdvisor') && (
                        <Lock className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Progress 
                        value={(1 - getRemainingUsage('permitAdvisor') / userPlan.limits.permitAdvisor) * 100} 
                        className="w-20 h-2" 
                      />
                      <span className="text-xs text-slate-500">
                        {userPlan.limits.permitAdvisor - getRemainingUsage('permitAdvisor')}/{userPlan.limits.permitAdvisor}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Wizard Step Indicator - Mobile Optimized */}
      <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          {/* Mobile: Compact Horizontal Stepper */}
          <div className="md:hidden">
            <div className="flex items-center justify-center px-2 gap-1 overflow-x-auto scrollbar-none">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  {/* Step Circle - Mobile Enhanced */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center relative transition-all duration-500 ${
                        step.status === "completed"
                          ? "border-green-400 bg-green-400/20 shadow-lg shadow-green-400/30"
                          : step.status === "processing"
                            ? "border-cyan-400 bg-cyan-400/20 shadow-lg shadow-cyan-400/40 animate-pulse"
                            : step.step === currentStep
                              ? "border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/25"
                              : "border-gray-600 bg-gray-800/30"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                      ) : (
                        <div className={`transition-all duration-500 ${
                          step.status === "processing" ? "text-cyan-300" : 
                          step.step === currentStep ? "text-cyan-300" : "text-gray-400"
                        }`}>
                          {step.step === 1 && <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {step.step === 2 && <FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {step.step === 3 && <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs sm:text-sm font-medium text-gray-300 max-w-16 sm:max-w-20 leading-tight break-words">
                        {step.title.split(' ').slice(0, 2).join(' ')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced Connection Arrow - Mobile Enhanced */}
                  {index < workflowSteps.length - 1 && (
                    <div className="px-1 sm:px-2 flex items-center">
                      <div className="relative">
                        <ArrowRight
                          className={`h-3 w-3 sm:h-4 sm:w-4 transition-all duration-500 ${
                            step.status === "completed"
                              ? "text-green-400 scale-110"
                              : "text-gray-500"
                          }`}
                        />
                        {step.status === "completed" && (
                          <div className="absolute inset-0 animate-ping">
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-400/50" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Enhanced Centered Flow Layout */}
          <div className="hidden md:block">
            <div className="flex items-center justify-center max-w-3xl mx-auto gap-2">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Card - More Compact */}
                  <div className="relative">
                    <div
                      className={`p-3 rounded-xl border-2 transition-all duration-500 cursor-pointer transform hover:scale-105 ${
                        step.status === "completed"
                          ? "border-green-400/70 bg-gradient-to-br from-green-400/10 to-green-500/5 shadow-xl shadow-green-400/20"
                          : step.status === "processing"
                            ? "border-cyan-400 bg-gradient-to-br from-cyan-400/15 to-cyan-500/10 shadow-xl shadow-cyan-400/30 animate-pulse"
                            : step.step === currentStep
                              ? "border-cyan-400/60 bg-gradient-to-br from-cyan-400/10 to-cyan-500/5 shadow-lg shadow-cyan-400/20"
                              : "border-gray-600/40 bg-gradient-to-br from-gray-800/20 to-gray-900/30"
                      }`}
                      onClick={() => {
                        if (step.step === 1 || 
                            (step.step === 2 && canProceedToStep2()) ||
                            (step.step === 3 && canProceedToStep3())) {
                          setCurrentStep(step.step);
                        }
                      }}
                    >
                      {/* Icon Circle */}
                      <div className="flex items-center justify-center mb-2">
                        <div
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                            step.status === "completed"
                              ? "border-green-400 bg-green-400/25 shadow-lg shadow-green-400/30"
                              : step.status === "processing"
                                ? "border-cyan-400 bg-cyan-400/25 shadow-lg shadow-cyan-400/40"
                                : step.step === currentStep
                                  ? "border-cyan-400 bg-cyan-400/15 shadow-lg shadow-cyan-400/25"
                                  : "border-gray-600 bg-gray-800/40"
                          }`}
                        >
                          {step.status === "completed" ? (
                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                          ) : (
                            <div className={`transition-all duration-500 ${
                              step.status === "processing" ? "text-cyan-300" : 
                              step.step === currentStep ? "text-cyan-300" : "text-gray-400"
                            }`}>
                              {step.step === 1 && <MapPin className="h-5 w-5" />}
                              {step.step === 2 && <FileText className="h-5 w-5" />}
                              {step.step === 3 && <Eye className="h-5 w-5" />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Compact Title */}
                      <div className="text-center max-w-28">
                        <h3
                          className={`font-semibold text-xs mb-1 leading-tight ${
                            step.status === "completed"
                              ? "text-green-400"
                              : step.status === "processing"
                                ? "text-cyan-300"
                                : step.step === currentStep
                                  ? "text-cyan-300"
                                  : "text-gray-400"
                          }`}
                        >
                          {step.title}
                        </h3>
                        
                        {/* Status Badge */}
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            step.status === "completed"
                              ? "bg-green-400/20 text-green-400 border-green-400/40"
                              : step.status === "processing"
                                ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40"
                                : "bg-gray-600/20 text-gray-400 border-gray-600/40"
                          }`}
                        >
                          {step.estimatedTime}
                        </Badge>
                      </div>

                      {/* Progress Indicator */}
                      <div className="mt-2">
                        <Progress 
                          value={step.progress} 
                          className={`h-1 ${
                            step.status === "completed" ? "bg-green-400/20" :
                            step.status === "processing" ? "bg-cyan-400/20" : "bg-gray-600/20"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Flow Arrow */}
                  {index < workflowSteps.length - 1 && (
                    <div className="flex justify-center px-2">
                      <div className="relative">
                        <ArrowRight
                          className={`h-5 w-5 transition-all duration-500 ${
                            step.status === "completed"
                              ? "text-green-400 scale-110"
                              : "text-gray-500"
                          }`}
                        />
                        {step.status === "completed" && (
                          <div className="absolute inset-0 animate-ping">
                            <ArrowRight className="h-5 w-5 text-green-400/50" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* Search History Section - Mobile Optimized */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2">
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <div className="relative group">
                {/* Holographic Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-purple-500/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
                
                {/* Animated Border Ring */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400/50 via-blue-500/30 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="absolute inset-[1px] rounded-lg bg-slate-900/80"></div>
                </div>
                
                <Button
                  variant="outline"
                  className="relative border-2 border-cyan-500/40 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 text-cyan-300 hover:text-cyan-200 hover:border-cyan-400/60 h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 backdrop-blur-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-[1.02] overflow-hidden"
                >
                  {/* Inner Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Corner Accents */}
                  <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-cyan-400/60 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-blue-400/60 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  
                  <div className="relative flex items-center gap-1 sm:gap-2 z-10">
                    <div className="relative">
                      {/* Icon Container with Holographic Effect */}
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-md flex items-center justify-center border border-cyan-400/40 group-hover:border-cyan-300/60 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-cyan-400/50">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-cyan-300 group-hover:text-cyan-200 transition-colors duration-300" />
                      </div>
                      
                      {/* Animated Pulse Ring */}
                      <div className="absolute inset-0 rounded-md border border-cyan-400/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
                    </div>
                    
                    <span className="hidden sm:inline font-medium tracking-wide">DeepSearch History</span>
                    <span className="sm:hidden font-medium">History</span>
                    
                    {/* Animated Arrow */}
                    <div className="ml-1 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                      <ArrowRight className="h-3 w-3 text-cyan-400" />
                    </div>
                  </div>
                  
                  {/* Scanning Line Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                </Button>
              </div>
            </DialogTrigger>

            <DialogContent className="max-w-2xl bg-slate-900/95 border-cyan-400/30 backdrop-blur-md">
              <DialogHeader>
                <DialogTitle className="text-cyan-300 flex items-center gap-3">
                  <div className="w-7 h-7 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                    🕒
                  </div>
                  DeepSearch History
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                {/* Search filter */}
                <div className="mb-4 p-3 bg-slate-900/30 rounded-lg border border-cyan-400/30">
                  <Input
                    placeholder="Search history... (address, project type)"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-slate-900/50 border-cyan-600/50 text-cyan-300 placeholder-gray-400"
                  />
                </div>

                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto mb-3"></div>
                    <p className="text-gray-400 text-sm">Loading history...</p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
                      🕒
                    </div>
                    <h3 className="text-base font-medium text-gray-400 mb-1">
                      No search history found
                    </h3>
                    <p className="text-gray-500 text-xs">
                      Your recent permit searches will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistory.map((item: any, index: number) => (
                      <div key={item.id}>
                        <DialogClose asChild>
                          <div
                            onClick={() => loadFromHistory(item)}
                            className="group relative p-4 bg-slate-900/40 hover:bg-slate-900/70 border border-cyan-400/30 hover:border-cyan-300/50 rounded-lg cursor-pointer transition-all duration-300"
                          >
                          {/* Holographic border effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-300"></div>

                          <div className="relative space-y-3">
                            {/* Header with project type and date */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {getProjectIcon(item.projectType)}
                                </span>
                                <Badge
                                  className={`${getProjectTypeColor(item.projectType)} text-xs font-medium`}
                                >
                                  {item.projectType
                                    .charAt(0)
                                    .toUpperCase() +
                                    item.projectType.slice(1)}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-400 font-mono">
                                {formatHistoryDate(item.createdAt)}
                              </span>
                            </div>

                            {/* Address */}
                            <div className="space-y-1">
                              <p className="text-cyan-300 font-medium text-sm line-clamp-1">
                                {item.address}
                              </p>
                            </div>

                            {/* Quick stats */}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {item.results?.requiredPermits && (
                                <span className="flex items-center gap-1">
                                  🏛️ {item.results.requiredPermits.length}{" "}
                                  permits
                                </span>
                              )}
                              {item.results?.contactInformation && (
                                <span className="flex items-center gap-1">
                                  📞{" "}
                                  {item.results.contactInformation.length}{" "}
                                  contacts
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hover effect indicator */}
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                          </div>
                          </div>
                        </DialogClose>

                        {index < filteredHistory.length - 1 && (
                          <Separator className="my-3 bg-cyan-400/30" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {filteredHistory.length > 0 && (
                <div className="flex justify-center pt-4 border-t border-gray-700/30">
                  <p className="text-xs text-gray-500">
                    Showing {filteredHistory.length} of {historyData.length}{" "}
                    searches
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Wizard Content - Mobile Optimized */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
        
        {/* Step 1: Property Analysis - Mobile Optimized */}
        {currentStep === 1 && (
          <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="text-center px-3 sm:px-6 py-4 sm:py-6">
              <CardTitle className="text-lg sm:text-xl text-cyan-300 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="text-center leading-tight">Property & Project Analysis</span>
              </CardTitle>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2 px-2">
                Enter your property address to begin comprehensive permit analysis
              </p>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
              {/* Selection Mode Toggle - Mobile Optimized */}
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="bg-slate-900/50 border border-cyan-500/30 rounded-lg p-1 flex w-full max-w-md">
                  <Button
                    onClick={() => setSelectionMode("manual")}
                    variant={selectionMode === "manual" ? "default" : "ghost"}
                    className={`flex-1 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all ${
                      selectionMode === "manual"
                        ? "bg-cyan-600 text-black hover:bg-cyan-500"
                        : "text-gray-400 hover:text-cyan-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Manual Address</span>
                    <span className="sm:hidden">Manual</span>
                  </Button>
                  <Button
                    onClick={() => setSelectionMode("existing")}
                    variant={selectionMode === "existing" ? "default" : "ghost"}
                    className={`flex-1 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all ${
                      selectionMode === "existing"
                        ? "bg-cyan-600 text-black hover:bg-cyan-500"
                        : "text-gray-400 hover:text-cyan-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Existing Projects</span>
                    <span className="sm:hidden">Existing</span>
                  </Button>
                </div>
              </div>

              {/* Manual Address Input Mode - Mobile Optimized */}
              {selectionMode === "manual" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Address Input - Mobile Optimized */}
                <div className="relative bg-slate-900/30 border border-cyan-500/30 rounded-lg p-3 sm:p-4 hover:border-cyan-400/50 transition-colors">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-cyan-300 flex items-center gap-1 sm:gap-2">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Property Address</span>
                    </label>
                    <MapboxPlacesAutocomplete
                      onPlaceSelect={handleAddressSelect}
                      onChange={() => {}}
                      className="w-full bg-slate-900/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 min-h-[40px] text-sm"
                      placeholder="Enter property address..."
                    />
                    {selectedAddress && (
                      <div className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                        <span className="break-words">Address verified</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-cyan-400/50 rounded-br-lg"></div>
                </div>

                {/* Project Type - Mobile Optimized */}
                <div className="relative bg-slate-900/30 border border-cyan-500/30 rounded-lg p-3 sm:p-4 hover:border-cyan-400/50 transition-colors">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-cyan-300 flex items-center gap-1 sm:gap-2">
                      <Building className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Project Type</span>
                    </label>
                    <Select value={projectType} onValueChange={setProjectType}>
                      <SelectTrigger className="w-full bg-slate-900/50 border-cyan-500/30 text-white focus:border-cyan-400 min-h-[40px] text-sm">
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-cyan-500/30 max-h-[200px] text-sm">
                        <SelectItem value="fence">Fence Installation</SelectItem>
                        <SelectItem value="deck">Deck Construction</SelectItem>
                        <SelectItem value="addition">Home Addition</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                        <SelectItem value="electrical">Electrical Work</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="roofing">Roofing</SelectItem>
                        <SelectItem value="hvac">HVAC Installation</SelectItem>
                        <SelectItem value="concrete">Concrete Work</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="pool">Pool Installation</SelectItem>
                        <SelectItem value="solar">Solar Panel Installation</SelectItem>
                        <SelectItem value="siding">Siding</SelectItem>
                        <SelectItem value="windows">Window Replacement</SelectItem>
                        <SelectItem value="demolition">Demolition</SelectItem>
                        <SelectItem value="garage">Garage Construction</SelectItem>
                        <SelectItem value="shed">Shed Installation</SelectItem>
                        <SelectItem value="driveway">Driveway</SelectItem>
                        <SelectItem value="bathroom">Bathroom Remodel</SelectItem>
                        <SelectItem value="kitchen">Kitchen Remodel</SelectItem>
                        <SelectItem value="basement">Basement Finishing</SelectItem>
                        <SelectItem value="attic">Attic Conversion</SelectItem>
                        <SelectItem value="porch">Porch/Patio</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {projectType && (
                      <div className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                        <span className="break-words">Project type selected</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-lg"></div>
                </div>
                </div>
              )}

              {/* Existing Projects Mode */}
              {selectionMode === "existing" && (
                <div className="space-y-4">
                  {loadingProjects ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
                      <span className="ml-2 text-gray-400">Loading your projects...</span>
                    </div>
                  ) : existingProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400 mb-2">No existing projects found</p>
                      <p className="text-sm text-gray-500">
                        Switch to Manual Address mode to create a new analysis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-cyan-300 font-medium flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Select from {existingProjects.length} existing project{existingProjects.length !== 1 ? 's' : ''}
                      </h4>
                      <div className="grid gap-3 max-h-96 overflow-y-auto">
                        {existingProjects.map((project) => (
                          <div
                            key={project.id}
                            onClick={() => handleProjectSelection(project)}
                            className={`relative bg-slate-900/30 border rounded-lg p-4 cursor-pointer transition-all hover:border-cyan-400/50 hover:bg-slate-800/50 ${
                              selectedProject?.id === project.id
                                ? "border-cyan-400/70 bg-slate-800/50"
                                : "border-cyan-500/30"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h5 className="text-white font-medium truncate">
                                  {project.clientName}
                                </h5>
                                <p className="text-cyan-300 text-sm mt-1 line-clamp-1">
                                  {project.address}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getProjectTypeColor(project.projectType)}`}>
                                    {getProjectTypeIcon(project.projectType)} {project.projectType}
                                  </span>
                                  {project.totalPrice && (
                                    <span className="text-green-400 text-sm font-medium flex items-center">
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                      }).format(project.totalPrice)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-500 text-xs mt-1">
                                  Created {project.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                                </p>
                              </div>
                              {selectedProject?.id === project.id && (
                                <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation - Mobile Optimized */}
              <div className="flex justify-end pt-3 sm:pt-4 border-t border-gray-700/30">
                <Button
                  onClick={() => {
                    if (selectedAddress && projectType) {
                      setCurrentStep(2);
                    } else {
                      toast({
                        title: "Missing Information",
                        description: "Please enter both property address and project type",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!selectedAddress || !projectType}
                  className="bg-cyan-600 hover:bg-cyan-500 text-black font-medium px-4 sm:px-6 text-sm"
                >
                  <span className="hidden sm:inline">Continue to Project Details</span>
                  <span className="sm:hidden">Continue</span>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Project Details & Documentation - Mobile Optimized */}
        {currentStep === 2 && (
          <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="text-center px-3 sm:px-6 py-4 sm:py-6">
              <CardTitle className="text-lg sm:text-xl text-cyan-300 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="text-center leading-tight">Project Details & Documentation</span>
              </CardTitle>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2 px-2">
                Provide detailed project information and attach relevant documents
              </p>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-3 sm:space-y-4">
                <label className="text-xs sm:text-sm font-medium text-cyan-300 flex items-center gap-1 sm:gap-2">
                  <span>Project Description & Documents</span>
                  <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300/70 flex-shrink-0" />
                </label>
                <div className="relative">
                  <div
                    onDrop={handleFileDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative transition-all duration-300 ${
                      isDragOver ? "ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-900" : ""
                    }`}
                  >
                    <Textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe your project in detail (e.g., materials, scope, square footage)... 

You can also drag & drop documents here (permits, plans, estimates)"
                      className={`w-full bg-slate-900/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 min-h-[100px] sm:min-h-[120px] resize-none pr-10 sm:pr-12 transition-all duration-300 text-sm ${
                        isDragOver ? "border-cyan-400 bg-cyan-500/10" : ""
                      }`}
                    />
                    
                    <button
                      type="button"
                      onClick={() => document.getElementById("file-input")?.click()}
                      className="absolute right-2 top-2 w-6 h-6 sm:w-8 sm:h-8 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-full flex items-center justify-center transition-all duration-300 group hover:scale-110"
                      title="Upload documents"
                    >
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 group-hover:text-cyan-200" />
                    </button>

                    <input
                      id="file-input"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* File List - Mobile Optimized */}
                  {attachedFiles.length > 0 && (
                    <div className="mt-3 sm:mt-4 space-y-2">
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {attachedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="inline-flex items-center gap-1 sm:gap-2 bg-slate-900/70 border border-cyan-500/20 rounded-md px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm group hover:border-cyan-400/40 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {file.type === 'application/pdf' ? (
                                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500/30 rounded-sm flex items-center justify-center">
                                  <span className="text-red-300 text-xs">📄</span>
                                </div>
                              ) : file.type.startsWith('image/') ? (
                                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500/30 rounded-sm flex items-center justify-center">
                                  <span className="text-green-300 text-xs">🖼️</span>
                                </div>
                              ) : (
                                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500/30 rounded-sm flex items-center justify-center">
                                  <FileText className="h-2 w-2 sm:h-3 sm:w-3 text-blue-300" />
                                </div>
                              )}
                            </div>
                            <span className="text-white font-medium truncate max-w-[80px] sm:max-w-[120px] break-all">
                              {file.name}
                            </span>
                            <span className="text-gray-400 text-xs hidden sm:inline">
                              ({formatFileSize(file.size)})
                            </span>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                              <X className="h-2 w-2 sm:h-3 sm:w-3 text-red-300" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 sm:pt-4 border-t border-gray-700/30">
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 text-sm order-2 sm:order-1"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Property Analysis</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <Button
                  onClick={() => {
                    if (projectDescription.trim()) {
                      setCurrentStep(3);
                    } else {
                      toast({
                        title: "Missing Information",
                        description: "Please provide a project description",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!projectDescription.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-black font-medium px-4 sm:px-6 text-sm order-1 sm:order-2"
                >
                  <span className="hidden sm:inline">Start DeepSearch Analysis</span>
                  <span className="sm:hidden">Start Analysis</span>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: DeepSearch Results & Analysis - Mobile Optimized */}
        {currentStep === 3 && (
          <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="text-center px-3 sm:px-6 py-4 sm:py-6">
              <CardTitle className="text-lg sm:text-xl text-cyan-300 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="text-center leading-tight">DeepSearch Results & Analysis</span>
              </CardTitle>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2 px-2">
                Comprehensive permit requirements and analysis for your project
              </p>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
              
              {/* Usage Counter */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-600/50">
                  <div className="flex items-center gap-2">
                    {userPlan?.name === 'Master Contractor' || userPlan?.name === 'Trial Master' ? (
                      <>
                        <Crown className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-yellow-400 font-medium">Ilimitado</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm text-gray-300">
                          <span className="text-cyan-400 font-semibold">{getRemainingUsage('permitAdvisor')}</span>
                          <span className="text-gray-400"> / {userPlan?.limits.permitAdvisor === -1 ? '∞' : userPlan?.limits.permitAdvisor} consultas restantes</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis Controls - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !selectedAddress || !projectType || !projectDescription.trim() || !canUse('permitAdvisor')}
                  className={`font-medium px-4 sm:px-6 py-2 sm:py-3 shadow-lg text-sm ${
                    canUse('permitAdvisor')
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
                      : "bg-gradient-to-r from-gray-600 to-gray-500 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  {!canUse('permitAdvisor') ? (
                    <>
                      <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Límite Alcanzado</span>
                      <span className="sm:hidden">Bloqueado</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                      <span className="hidden sm:inline">Running Analysis...</span>
                      <span className="sm:hidden">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Run DeepSearch Analysis</span>
                      <span className="sm:hidden">Start Analysis</span>
                    </>
                  )}
                </Button>
                
                {permitData && (
                  <Button
                    onClick={generatePDF}
                    disabled={isGeneratingPDF}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium px-4 sm:px-6 py-2 sm:py-3 shadow-lg text-sm"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                        <span className="hidden sm:inline">Generating PDF...</span>
                        <span className="sm:hidden">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Export PDF Report</span>
                        <span className="sm:hidden">Export PDF</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Upgrade Prompt for Limited Users */}
              {!canUse('permitAdvisor') && (
                <div className="mt-4">
                  <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Lock className="h-5 w-5 text-cyan-400 mt-0.5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-cyan-300 font-semibold mb-1">Límite de consultas alcanzado</h3>
                        <p className="text-gray-300 text-sm mb-3">
                          Has alcanzado tu límite de {userPlan?.limits.permitAdvisor} consultas de Permit Advisor este mes. 
                          Actualiza tu plan para obtener acceso completo.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            onClick={() => window.location.href = '/subscription'}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          >
                            Ver Planes de Actualización
                          </button>
                          <div className="text-xs text-gray-400 sm:self-center">
                            Los límites se reinician el 1ro de cada mes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="py-8">
                  <Card className="bg-gray-800/50 border-teal-500/20">
                    <CardContent className="p-8">
                      <div className="flex items-center justify-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                        <p className="text-teal-300">Running DeepSearch analysis...</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="py-4">
                  <Card className="bg-red-900/20 border-red-500/20">
                    <CardContent className="p-6">
                      <p className="text-red-300">{error}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Results Display */}
              {permitData && !isLoading && (
                <div className="space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                          <span className="hidden sm:inline">Building Codes</span>
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
                      {permitData.requiredPermits && permitData.requiredPermits.length > 0 ? (
                        <div className="space-y-4">
                          {permitData.requiredPermits.map((permit: any, idx: number) => (
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
                                          {permit.type || `Permit ${idx + 1}`}
                                        </h3>
                                        <p className="text-gray-300 leading-relaxed">
                                          {permit.description || permit.requirements || "Permit details"}
                                        </p>
                                      </div>

                                      {permit.fees && (
                                        <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                                          <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                                            💰 Estimated Fees
                                          </h4>
                                          <p className="text-green-200 font-semibold">
                                            {permit.fees}
                                          </p>
                                        </div>
                                      )}

                                      {permit.timeline && (
                                        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                                          <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                                            ⏱️ Processing Time
                                          </h4>
                                          <p className="text-blue-200">
                                            {permit.timeline}
                                          </p>
                                        </div>
                                      )}

                                      {permit.contact && (
                                        <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                                          <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                                            📞 Contact Information
                                          </h4>
                                          <p className="text-purple-200">
                                            {permit.contact}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
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
                        
                        {/* Dynamic Building Codes from Enhanced Service */}
                        {permitData.buildingCodes && Array.isArray(permitData.buildingCodes) && permitData.buildingCodes.length > 0 ? (
                          <div className="space-y-4">
                            {permitData.buildingCodes.map((codeSection: any, idx: number) => (
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
                                            {codeSection.section || codeSection.title || `Building Code Section ${idx + 1}`}
                                          </h3>
                                          <p className="text-gray-300 leading-relaxed">
                                            {codeSection.description || codeSection.summary || "Code section details"}
                                          </p>
                                        </div>

                                        {/* Enhanced Details Section */}
                                        {codeSection.details && (
                                          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
                                            <h4 className="text-emerald-400 font-medium mb-3 flex items-center gap-2">
                                              📋 Detailed Requirements
                                            </h4>
                                            {typeof codeSection.details === 'string' ? (
                                              <p className="text-emerald-200 text-sm leading-relaxed whitespace-pre-line">
                                                {codeSection.details}
                                              </p>
                                            ) : Array.isArray(codeSection.details) ? (
                                              <ul className="text-emerald-200 text-sm space-y-2">
                                                {codeSection.details.map((detail: any, detailIdx: number) => (
                                                  <li key={detailIdx} className="flex items-start gap-2">
                                                    <span className="text-emerald-400">•</span>
                                                    <span>{typeof detail === 'string' ? detail : detail.description || detail.requirement || JSON.stringify(detail)}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <div className="text-emerald-200 text-sm">
                                                {JSON.stringify(codeSection.details, null, 2)}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Specific Requirements */}
                                        {codeSection.requirements && Array.isArray(codeSection.requirements) && (
                                          <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                                            <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                                              ✅ Specific Requirements
                                            </h4>
                                            <ul className="text-green-200 text-sm space-y-2">
                                              {codeSection.requirements.map((req: any, reqIdx: number) => (
                                                <li key={reqIdx} className="flex items-start gap-2">
                                                  <span className="text-green-400">•</span>
                                                  <span>
                                                    {typeof req === 'string' ? req : req.description || req.requirement || JSON.stringify(req)}
                                                  </span>
                                                  {/* Show additional details if available */}
                                                  {typeof req === 'object' && req.details && (
                                                    <div className="ml-4 mt-1 text-xs text-green-300 italic">
                                                      {req.details}
                                                    </div>
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Specifications */}
                                        {codeSection.specifications && (
                                          <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-4">
                                            <h4 className="text-cyan-400 font-medium mb-3 flex items-center gap-2">
                                              🔧 Technical Specifications
                                            </h4>
                                            {Array.isArray(codeSection.specifications) ? (
                                              <ul className="text-cyan-200 text-sm space-y-2">
                                                {codeSection.specifications.map((spec: any, specIdx: number) => (
                                                  <li key={specIdx} className="flex items-start gap-2">
                                                    <span className="text-cyan-400">•</span>
                                                    <span>{typeof spec === 'string' ? spec : spec.description || JSON.stringify(spec)}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-cyan-200 text-sm">
                                                {codeSection.specifications}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {/* Code References */}
                                        {codeSection.codeReference && (
                                          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                                            <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                                              📖 Code Reference
                                            </h4>
                                            <p className="text-blue-200 font-mono text-sm">
                                              {codeSection.codeReference}
                                            </p>
                                            {/* Additional code details */}
                                            {codeSection.codeDetails && (
                                              <div className="mt-2 pt-2 border-t border-blue-400/20">
                                                <p className="text-blue-300 text-xs">
                                                  {codeSection.codeDetails}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Measurements and Dimensions */}
                                        {codeSection.measurements && (
                                          <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                                            <h4 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
                                              📏 Measurements & Dimensions
                                            </h4>
                                            {Array.isArray(codeSection.measurements) ? (
                                              <ul className="text-purple-200 text-sm space-y-2">
                                                {codeSection.measurements.map((measurement: any, measIdx: number) => (
                                                  <li key={measIdx} className="flex items-start gap-2">
                                                    <span className="text-purple-400">•</span>
                                                    <span>{typeof measurement === 'string' ? measurement : JSON.stringify(measurement)}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-purple-200 text-sm">
                                                {codeSection.measurements}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {/* Installation Guidelines */}
                                        {codeSection.installation && (
                                          <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4">
                                            <h4 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
                                              🔨 Installation Guidelines
                                            </h4>
                                            {Array.isArray(codeSection.installation) ? (
                                              <ul className="text-orange-200 text-sm space-y-2">
                                                {codeSection.installation.map((guideline: any, guideIdx: number) => (
                                                  <li key={guideIdx} className="flex items-start gap-2">
                                                    <span className="text-orange-400">•</span>
                                                    <span>{typeof guideline === 'string' ? guideline : JSON.stringify(guideline)}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-orange-200 text-sm">
                                                {codeSection.installation}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {/* Materials */}
                                        {codeSection.materials && (
                                          <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-4">
                                            <h4 className="text-indigo-400 font-medium mb-3 flex items-center gap-2">
                                              🧱 Material Requirements
                                            </h4>
                                            {Array.isArray(codeSection.materials) ? (
                                              <ul className="text-indigo-200 text-sm space-y-2">
                                                {codeSection.materials.map((material: any, matIdx: number) => (
                                                  <li key={matIdx} className="flex items-start gap-2">
                                                    <span className="text-indigo-400">•</span>
                                                    <span>{typeof material === 'string' ? material : JSON.stringify(material)}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-indigo-200 text-sm">
                                                {codeSection.materials}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {/* Compliance Notes */}
                                        {codeSection.complianceNotes && (
                                          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
                                            <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                                              ⚠️ Compliance Notes
                                            </h4>
                                            <p className="text-yellow-200 text-sm">
                                              {codeSection.complianceNotes}
                                            </p>
                                          </div>
                                        )}

                                        {/* Violations/Penalties */}
                                        {codeSection.violations && (
                                          <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                                            <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                                              🚫 Violations & Penalties
                                            </h4>
                                            <p className="text-red-200 text-sm">
                                              {codeSection.violations}
                                            </p>
                                          </div>
                                        )}

                                        {/* Additional Dynamic Fields */}
                                        {Object.keys(codeSection).filter(key => 
                                          !['section', 'title', 'description', 'summary', 'details', 'requirements', 
                                            'specifications', 'codeReference', 'codeDetails', 'measurements', 
                                            'installation', 'materials', 'complianceNotes', 'violations'].includes(key)
                                        ).map((key, keyIdx) => (
                                          <div key={keyIdx} className="bg-gray-600/20 border border-gray-500/30 rounded-lg p-4">
                                            <h4 className="text-gray-300 font-medium mb-2 flex items-center gap-2 capitalize">
                                              🔍 {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </h4>
                                            <div className="text-gray-400 text-sm">
                                              {typeof codeSection[key] === 'string' ? (
                                                <p>{codeSection[key]}</p>
                                              ) : Array.isArray(codeSection[key]) ? (
                                                <ul className="space-y-1">
                                                  {codeSection[key].map((item: any, itemIdx: number) => (
                                                    <li key={itemIdx} className="flex items-start gap-2">
                                                      <span className="text-gray-500">•</span>
                                                      <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              ) : (
                                                <pre className="text-xs bg-gray-700/30 p-2 rounded overflow-x-auto">
                                                  {JSON.stringify(codeSection[key], null, 2)}
                                                </pre>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Fallback for when enhanced building codes are not available */
                          <div className="space-y-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-teal-400/10 rounded-lg"></div>
                              <Card className="relative bg-gray-800/70 border-emerald-400/30 backdrop-blur-sm">
                                <CardContent className="p-4">
                                  <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <span className="text-2xl">📋</span>
                                    </div>
                                    <h3 className="text-lg font-medium text-emerald-300 mb-2">
                                      Building Codes Analysis
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                      Project-specific building codes will appear here based on your location and project type.
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="process" className="space-y-4 mt-6">
                      {permitData.process && Array.isArray(permitData.process) && permitData.process.length > 0 ? (
                        <div className="space-y-4">
                          {permitData.process.map((step: any, idx: number) => (
                            <div key={idx} className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-cyan-400/10 to-teal-400/10 rounded-lg"></div>
                              <Card className="relative bg-gray-800/70 border-blue-400/30 backdrop-blur-sm">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <h4 className="text-blue-300 font-semibold">
                                        {typeof step === "string" ? `Step ${idx + 1}` : step.step || `Step ${idx + 1}`}
                                      </h4>
                                      <p className="text-gray-300 text-sm leading-relaxed">
                                        {typeof step === "string" ? step : step.step || step.description || "Process step details"}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-green-300">
                            Process information loading...
                          </h3>
                          <p className="text-gray-400">
                            Step-by-step process will appear here.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="contact" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <h4 className="text-purple-300 font-semibold border-b border-purple-500/30 pb-2 mb-4 flex items-center gap-2">
                          <span className="text-xl">📞</span>
                          Municipal Contact Information
                        </h4>
                        
                        {/* Primary Contact Card */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-blue-400/10 to-cyan-400/10 rounded-lg"></div>
                          <Card className="relative bg-gray-800/70 border-purple-400/30 backdrop-blur-sm">
                            <CardContent className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {/* Department Info - Mobile Optimized */}
                                <div className="space-y-3 sm:space-y-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                      <span className="text-lg">🏛️</span>
                                    </div>
                                    <div>
                                      <h5 className="text-purple-300 font-semibold">
                                        {permitData?.location || 'Municipal'} Building Department
                                      </h5>
                                      <p className="text-gray-400 text-sm">Permits & Inspections Office</p>
                                    </div>
                                  </div>
                                  
                                  {/* Contact Details */}
                                  <div className="space-y-3">
                                    {(permitData?.contactInfo?.address || permitData?.contactInformation?.[0]?.physicalAddress) && (
                                      <div className="flex items-start gap-3">
                                        <span className="text-blue-400">📍</span>
                                        <div>
                                          <p className="text-blue-300 font-medium">Address</p>
                                          <p className="text-gray-300 text-sm">
                                            {permitData.contactInfo?.address || permitData.contactInformation?.[0]?.physicalAddress}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {(permitData?.contactInfo?.phone || permitData?.contactInformation?.[0]?.directPhone) && (
                                      <div className="flex items-center gap-3">
                                        <span className="text-green-400">📞</span>
                                        <div>
                                          <p className="text-green-300 font-medium">Phone</p>
                                          <a href={`tel:${permitData.contactInfo?.phone || permitData.contactInformation?.[0]?.directPhone}`} className="text-gray-300 text-sm hover:text-cyan-400 transition-colors break-all">
                                            {permitData.contactInfo?.phone || permitData.contactInformation?.[0]?.directPhone}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {(permitData?.contactInfo?.email || permitData?.contactInformation?.[0]?.email) && (
                                      <div className="flex items-center gap-3">
                                        <span className="text-yellow-400">📧</span>
                                        <div>
                                          <p className="text-yellow-300 font-medium">Email</p>
                                          <a href={`mailto:${permitData.contactInfo?.email || permitData.contactInformation?.[0]?.email}`} className="text-gray-300 text-sm hover:text-cyan-400 transition-colors break-all">
                                            {permitData.contactInfo?.email || permitData.contactInformation?.[0]?.email}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Additional Info */}
                                <div className="space-y-4">
                                  {(permitData?.contactInfo?.hours || permitData?.contactInformation?.[0]?.hours) && (
                                    <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                                      <h6 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                                        🕒 Office Hours
                                      </h6>
                                      <p className="text-green-200 text-sm">
                                        {permitData.contactInfo?.hours || permitData.contactInformation?.[0]?.hours}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {(permitData?.contactInfo?.website || permitData?.contactInformation?.[0]?.website) && (
                                    <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                                      <h6 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                                        🌐 Website
                                      </h6>
                                      <a 
                                        href={permitData.contactInfo?.website || permitData.contactInformation?.[0]?.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-200 text-sm hover:text-cyan-300 transition-colors underline break-all"
                                      >
                                        {permitData.contactInfo?.website || permitData.contactInformation?.[0]?.website}
                                      </a>
                                    </div>
                                  )}
                                  
                                  {(permitData?.contactInfo?.inspector || permitData?.contactInformation?.[0]?.inspectorName) && (
                                    <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                                      <h6 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                                        👷 Assigned Inspector
                                      </h6>
                                      <p className="text-purple-200 text-sm">
                                        {permitData.contactInfo?.inspector || permitData.contactInformation?.[0]?.inspectorName}
                                      </p>
                                      {permitData?.contactInformation?.[0]?.inspectorPhone && (
                                        <a href={`tel:${permitData.contactInformation[0].inspectorPhone}`} className="text-purple-300 text-xs hover:text-cyan-400 transition-colors block mt-1">
                                          📞 {permitData.contactInformation[0].inspectorPhone}
                                        </a>
                                      )}
                                      {permitData?.contactInformation?.[0]?.inspectorEmail && (
                                        <a href={`mailto:${permitData.contactInformation[0].inspectorEmail}`} className="text-purple-300 text-xs hover:text-cyan-400 transition-colors block mt-1">
                                          📧 {permitData.contactInformation[0].inspectorEmail}
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Online Portal */}
                                  {permitData?.contactInformation?.[0]?.onlinePortal && (
                                    <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-4">
                                      <h6 className="text-cyan-400 font-medium mb-2 flex items-center gap-2">
                                        💻 Online Portal
                                      </h6>
                                      <a 
                                        href={permitData.contactInformation[0].onlinePortal} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-cyan-200 text-sm hover:text-cyan-300 transition-colors underline"
                                      >
                                        {permitData.contactInformation[0].onlinePortal}
                                      </a>
                                    </div>
                                  )}
                                  
                                  {/* Additional Contact Departments */}
                                  {permitData?.contactInformation && permitData.contactInformation.length > 1 && (
                                    <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
                                      <h6 className="text-gray-300 font-medium mb-3 flex items-center gap-2">
                                        🏢 Additional Departments
                                      </h6>
                                      <div className="space-y-2">
                                        {permitData.contactInformation.slice(1).map((contact: any, idx: number) => (
                                          <div key={idx} className="text-sm">
                                            <p className="text-gray-200 font-medium">{contact.department}</p>
                                            {contact.directPhone && (
                                              <a href={`tel:${contact.directPhone}`} className="text-gray-400 hover:text-cyan-400 transition-colors break-all">
                                                📞 {contact.directPhone}
                                              </a>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Emergency & After Hours */}
                        {(permitData?.contactInfo?.emergency || permitData?.contactInformation?.[0]?.schedulingPhone) && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-orange-400/10 to-yellow-400/10 rounded-lg"></div>
                            <Card className="relative bg-gray-800/70 border-red-400/30 backdrop-blur-sm">
                              <CardContent className="p-4">
                                <h6 className="text-red-400 font-medium mb-3 flex items-center gap-2">
                                  🚨 Emergency/Scheduling Contact
                                </h6>
                                <p className="text-red-200 text-sm">
                                  {permitData.contactInfo?.emergency || `Scheduling: ${permitData.contactInformation?.[0]?.schedulingPhone}`}
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        
                        {/* No Contact Data Found Message */}
                        {!permitData?.contactInfo && !permitData?.contactInformation && (
                          <div className="text-center py-12">
                            <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-8">
                              <div className="text-gray-400 mb-4">
                                <span className="text-4xl">🔍</span>
                              </div>
                              <h3 className="text-lg font-medium text-gray-300 mb-2">
                                No Contact Information Found
                              </h3>
                              <p className="text-gray-500 text-sm max-w-md mx-auto">
                                DeepSearch analysis did not return specific municipal contact information for this location and project type.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="considerations" className="space-y-4 mt-6">
                      {permitData.specialConsiderations && Array.isArray(permitData.specialConsiderations) && permitData.specialConsiderations.length > 0 ? (
                        <div className="space-y-4">
                          {permitData.specialConsiderations.map((consideration: any, idx: number) => (
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
                                        <p className="text-amber-200 text-sm leading-relaxed">
                                          {typeof consideration === "string" ? consideration : JSON.stringify(consideration)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-green-300">
                            No Critical Alerts
                          </h3>
                          <p className="text-gray-400">
                            No special considerations or alerts identified for this project.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Navigation - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 sm:pt-6 border-t border-gray-700/30">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 text-sm order-2 sm:order-1"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Project Details</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="border-cyan-600 text-cyan-400 hover:border-cyan-500 hover:text-cyan-300 text-sm order-1 sm:order-2"
                >
                  <span className="hidden sm:inline">Start New Analysis</span>
                  <span className="sm:hidden">New Analysis</span>
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        </div>
      </div>
    </div>
  );
}
