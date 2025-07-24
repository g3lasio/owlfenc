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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Search, Clock, Trash2, Paperclip, X, FileText, Upload, Download, MapPin, ArrowRight, ArrowLeft, Eye, Database, Building, RefreshCw, History, DollarSign } from "lucide-react";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
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

      // Guardar automáticamente en historial
      await saveToHistory(data);

      toast({
        title: "✅ DeepSearch Complete",
        description: "Permit analysis generated and saved to history!",
      });
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
      {/* Header with cyberpunk styling */}
      <div className="relative bg-gradient-to-r from-slate-900/50 to-gray-900/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gray-800/10 opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-4">
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent mb-2">
              Mervin DeepSearch
            </h1>
            <p className="text-base text-gray-300 mb-2">
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

      {/* Wizard Step Indicator - Redesigned Centered Layout */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          {/* Mobile: Improved Centered Stepper */}
          <div className="md:hidden">
            <div className="flex items-center justify-center space-x-1 px-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center relative transition-all duration-500 ${
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
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <span className={`text-xs font-bold ${
                          step.status === "processing" ? "text-cyan-300" : 
                          step.step === currentStep ? "text-cyan-300" : "text-gray-400"
                        }`}>
                          {step.step}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <p className="text-xs font-medium text-gray-300 max-w-16 leading-tight">
                        {step.title.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced Connection Arrow */}
                  {index < workflowSteps.length - 1 && (
                    <div className="px-2 flex items-center">
                      <div className="relative">
                        <ArrowRight
                          className={`h-4 w-4 transition-all duration-500 ${
                            step.status === "completed"
                              ? "text-green-400 scale-110"
                              : "text-gray-500"
                          }`}
                        />
                        {step.status === "completed" && (
                          <div className="absolute inset-0 animate-ping">
                            <ArrowRight className="h-4 w-4 text-green-400/50" />
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
            <div className="flex items-center justify-center max-w-4xl mx-auto">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Card - More Compact */}
                  <div className="flex-1 relative">
                    <div
                      className={`p-4 rounded-2xl border-2 transition-all duration-500 cursor-pointer transform hover:scale-105 ${
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
                      {/* Compact Header */}
                      <div className="flex items-center justify-center mb-3">
                        <div className="flex items-center gap-3">
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
                              <span className={`text-lg font-bold ${
                                step.status === "processing" ? "text-cyan-300" : 
                                step.step === currentStep ? "text-cyan-300" : "text-gray-400"
                              }`}>
                                {step.step}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Centered Title */}
                      <div className="text-center">
                        <h3
                          className={`font-semibold text-sm mb-2 ${
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
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex justify-center mt-3">
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
                      <div className="mt-3">
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
                    <div className="flex justify-center px-3">
                      <div className="relative">
                        {/* Main Arrow */}
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                            step.status === "completed"
                              ? "border-green-400/60 bg-green-400/10 shadow-lg shadow-green-400/20"
                              : "border-gray-600/40 bg-gray-800/30"
                          }`}
                        >
                          <ArrowRight
                            className={`h-4 w-4 transition-all duration-500 ${
                              step.status === "completed"
                                ? "text-green-400"
                                : "text-gray-500"
                            }`}
                          />
                        </div>
                        
                        {/* Animated Ring for Completed Steps */}
                        {step.status === "completed" && (
                          <div className="absolute inset-0 animate-ping">
                            <div className="w-8 h-8 rounded-full border border-green-400/40"></div>
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

      {/* Search History Section - Moved to top */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2">
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 h-9 text-sm px-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-cyan-500/20 rounded-md flex items-center justify-center">
                    🕒
                  </div>
                  <span>DeepSearch History</span>
                </div>
              </Button>
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

      {/* Main Wizard Content */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        
        {/* Step 1: Property Analysis */}
        {currentStep === 1 && (
          <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="text-center px-4 sm:px-6 py-6">
              <CardTitle className="text-xl text-cyan-300 flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <span>Property & Project Analysis</span>
              </CardTitle>
              <p className="text-gray-400 text-sm mt-2">
                Enter your property address to begin comprehensive permit analysis
              </p>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6 pb-6">
              {/* Selection Mode Toggle */}
              <div className="flex justify-center mb-6">
                <div className="bg-slate-900/50 border border-cyan-500/30 rounded-lg p-1 flex">
                  <Button
                    onClick={() => setSelectionMode("manual")}
                    variant={selectionMode === "manual" ? "default" : "ghost"}
                    className={`px-6 py-2 transition-all ${
                      selectionMode === "manual"
                        ? "bg-cyan-600 text-black hover:bg-cyan-500"
                        : "text-gray-400 hover:text-cyan-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Manual Address
                  </Button>
                  <Button
                    onClick={() => setSelectionMode("existing")}
                    variant={selectionMode === "existing" ? "default" : "ghost"}
                    className={`px-6 py-2 transition-all ${
                      selectionMode === "existing"
                        ? "bg-cyan-600 text-black hover:bg-cyan-500"
                        : "text-gray-400 hover:text-cyan-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Existing Projects
                  </Button>
                </div>
              </div>

              {/* Manual Address Input Mode */}
              {selectionMode === "manual" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Address Input */}
                <div className="relative bg-slate-900/30 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-400/50 transition-colors">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Property Address
                    </label>
                    <MapboxPlacesAutocomplete
                      onPlaceSelect={handleAddressSelect}
                      onChange={() => {}}
                      className="w-full bg-slate-900/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 min-h-[40px]"
                      placeholder="Enter property address..."
                    />
                    {selectedAddress && (
                      <div className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Address verified
                      </div>
                    )}
                  </div>
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/50 rounded-br-lg"></div>
                </div>

                {/* Project Type */}
                <div className="relative bg-slate-900/30 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-400/50 transition-colors">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Project Type
                    </label>
                    <Select value={projectType} onValueChange={setProjectType}>
                      <SelectTrigger className="w-full bg-slate-900/50 border-cyan-500/30 text-white focus:border-cyan-400 min-h-[40px]">
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-cyan-500/30 max-h-[200px]">
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
                        <CheckCircle2 className="h-3 w-3" />
                        Project type selected
                      </div>
                    )}
                  </div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-lg"></div>
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

              {/* Navigation */}
              <div className="flex justify-end pt-4 border-t border-gray-700/30">
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
                  className="bg-cyan-600 hover:bg-cyan-500 text-black font-medium px-6"
                >
                  Continue to Project Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Project Details & Documentation */}
        {currentStep === 2 && (
          <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="text-center px-4 sm:px-6 py-6">
              <CardTitle className="text-xl text-cyan-300 flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span>Project Details & Documentation</span>
              </CardTitle>
              <p className="text-gray-400 text-sm mt-2">
                Provide detailed project information and attach relevant documents
              </p>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6 pb-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                  Project Description & Documents
                  <Paperclip className="h-4 w-4 text-cyan-300/70" />
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
                      className={`w-full bg-slate-900/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 min-h-[120px] resize-none pr-12 transition-all duration-300 ${
                        isDragOver ? "border-cyan-400 bg-cyan-500/10" : ""
                      }`}
                    />
                    
                    <button
                      type="button"
                      onClick={() => document.getElementById("file-input")?.click()}
                      className="absolute right-2 top-2 w-8 h-8 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-full flex items-center justify-center transition-all duration-300 group hover:scale-110"
                      title="Upload documents"
                    >
                      <Upload className="h-4 w-4 text-cyan-300 group-hover:text-cyan-200" />
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

                  {/* File List */}
                  {attachedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {attachedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="inline-flex items-center gap-2 bg-slate-900/70 border border-cyan-500/20 rounded-md px-3 py-2 text-sm group hover:border-cyan-400/40 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {file.type === 'application/pdf' ? (
                                <div className="w-4 h-4 bg-red-500/30 rounded-sm flex items-center justify-center">
                                  <span className="text-red-300 text-xs">📄</span>
                                </div>
                              ) : file.type.startsWith('image/') ? (
                                <div className="w-4 h-4 bg-green-500/30 rounded-sm flex items-center justify-center">
                                  <span className="text-green-300 text-xs">🖼️</span>
                                </div>
                              ) : (
                                <div className="w-4 h-4 bg-blue-500/30 rounded-sm flex items-center justify-center">
                                  <FileText className="h-3 w-3 text-blue-300" />
                                </div>
                              )}
                            </div>
                            <span className="text-white font-medium truncate max-w-[120px]">
                              {file.name}
                            </span>
                            <span className="text-gray-400 text-xs">
                              ({formatFileSize(file.size)})
                            </span>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-4 h-4 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="h-3 w-3 text-red-300" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t border-gray-700/30">
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Property Analysis
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
                  className="bg-cyan-600 hover:bg-cyan-500 text-black font-medium px-6"
                >
                  Start DeepSearch Analysis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: DeepSearch Results & Analysis */}
        {currentStep === 3 && (
          <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="text-center px-4 sm:px-6 py-6">
              <CardTitle className="text-xl text-cyan-300 flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <span>DeepSearch Results & Analysis</span>
              </CardTitle>
              <p className="text-gray-400 text-sm mt-2">
                Comprehensive permit requirements and analysis for your project
              </p>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6 pb-6">
              
              {/* Analysis Controls */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !selectedAddress || !projectType || !projectDescription.trim()}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-6 py-3 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Run DeepSearch Analysis
                    </>
                  )}
                </Button>
                
                {permitData && (
                  <Button
                    onClick={generatePDF}
                    disabled={isGeneratingPDF}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium px-6 py-3 shadow-lg"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF Report
                      </>
                    )}
                  </Button>
                )}
              </div>

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
                    <TabsList className="grid w-full grid-cols-5 bg-gray-800/50 border border-cyan-500/20">
                      <TabsTrigger 
                        value="permits" 
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300"
                      >
                        Permits
                      </TabsTrigger>
                      <TabsTrigger 
                        value="codes" 
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300"
                      >
                        Building Codes
                      </TabsTrigger>
                      <TabsTrigger 
                        value="process" 
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300"
                      >
                        Process
                      </TabsTrigger>
                      <TabsTrigger 
                        value="contact" 
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300"
                      >
                        Contact
                      </TabsTrigger>
                      <TabsTrigger 
                        value="considerations" 
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-300"
                      >
                        Alerts
                      </TabsTrigger>
                    </TabsList>

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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Department Info */}
                                <div className="space-y-4">
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
                                          <a href={`tel:${permitData.contactInfo?.phone || permitData.contactInformation?.[0]?.directPhone}`} className="text-gray-300 text-sm hover:text-cyan-400 transition-colors">
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
                                          <a href={`mailto:${permitData.contactInfo?.email || permitData.contactInformation?.[0]?.email}`} className="text-gray-300 text-sm hover:text-cyan-400 transition-colors">
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
                                        className="text-blue-200 text-sm hover:text-cyan-300 transition-colors underline"
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
                                              <a href={`tel:${contact.directPhone}`} className="text-gray-400 hover:text-cyan-400 transition-colors">
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

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-gray-700/30">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project Details
                </Button>
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="border-cyan-600 text-cyan-400 hover:border-cyan-500 hover:text-cyan-300"
                >
                  Start New Analysis
                  <RefreshCw className="h-4 w-4 ml-2" />
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
