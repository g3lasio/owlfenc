import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { getProjectById, updateProject } from "@/lib/firebase";
import ProjectProgress from "@/components/projects/ProjectProgress";
import ProjectDetails from "@/components/projects/ProjectDetails";
import FuturisticTimeline from "@/components/projects/FuturisticTimeline";

interface Project {
  id: string;
  clientName: string;
  address: string;
  projectType: string;
  projectSubtype?: string;
  projectDescription?: string;
  fenceType?: string;
  fenceHeight?: number;
  height?: number;
  status: string;
  createdAt: any;
  source?: string;
  projectProgress?: string;
  estimateHtml?: string;
  contractHtml?: string;
  totalPrice?: number;
  scheduledDate?: any;
  completedDate?: any;
  assignedTo?: any[];
  attachments?: any;
  permitStatus?: string;
  permitDetails?: any;
  clientNotes?: string;
  internalNotes?: string;
  paymentStatus?: string;
  paymentDetails?: any;
  projectCategory?: string;
  projectScope?: string;
  materialsList?: any[];
  laborHours?: number;
  difficulty?: string;
}

// Categorías de proyectos disponibles
const projectCategories = {
  fencing: {
    name: "Cercas y Portones",
    icon: "fence",
    types: [
      "Wood Fence", "Metal Fence", "Iron Fence", "Chain Link Fence",
      "Mesh Fence", "Vinyl Fence", "Composite Fence", "Bamboo Fence",
      "Aluminum Fence", "Privacy Fence", "Picket Fence"
    ]
  },
  roofing: {
    name: "Techos",
    icon: "home",
    types: [
      "Asphalt Shingles", "Metal Roofing", "Tile Roofing", "Slate Roofing",
      "Flat Roofing", "Roof Repair", "Gutter Installation", "Skylight Installation"
    ]
  },
  general: {
    name: "Contratista General",
    icon: "tool",
    types: [
      "Home Renovation", "Kitchen Remodel", "Bathroom Remodel", "Addition",
      "Basement Finishing", "Garage Conversion", "Whole House", "Commercial Build"
    ]
  }
};

// Estados de proyecto y progreso
const projectStatuses = ["draft", "sent", "approved", "completed"];

function Projects() {
  // Asegurar que la página tenga scroll en móviles
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProjectCategory, setSelectedProjectCategory] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // ✅ Track if initial load completed to prevent toast spam
  const hasLoadedOnce = useRef(false);
  
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { hasAccess, showUpgradeModal } = usePermissions();

  // Helper function para mapear estados de estimados a progreso de proyecto
  const mapStatusToProgress = (status?: string): string => {
    switch (status) {
      case "approved":
      case "signed":
        return "estimate_approved";
      case "in_progress":
      case "started":
        return "work_in_progress";
      case "completed":
      case "finished":
        return "project_completed";
      case "draft":
        return "estimate_draft";
      case "sent":
        return "estimate_sent";
      default:
        return "estimate_created";
    }
  };

  const loadProjects = useCallback(async (isBackgroundRefresh = false) => {
    try {
      // ✅ Only show skeleton on initial load, not on background refresh
      if (isBackgroundRefresh) {
        setIsBackgroundRefreshing(true);
      } else {
        setIsLoading(true);
      }

      if (!currentUser?.uid) {
        toast({
          title: "🔐 Autenticación requerida",
          description: "Por favor inicia sesión para ver tus proyectos",
          variant: "destructive",
        });
        return;
      }

      // ✅ OPTIMIZED: No bloquear la carga, solo mostrar mensaje informativo
      // La verificación de permisos se hace en el UI, no en la carga de datos

      console.log("🚀 [PROJECTS] Iniciando carga del dashboard de proyectos...");
      console.log(`🔍 [PROJECTS] Usuario autenticado: ${currentUser.uid}`);

      const allProjects: Project[] = [];

      try {
        // ✅ INTEGRACIÓN SIMPLIFICADA ESTIMATE WIZARD → PROJECTS DASHBOARD
        console.log("📊 [ESTIMATE-INTEGRATION] Conectando con Firebase de forma robusta...");
        
        const { collection, getDocs, query, where } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        console.log("📋 [ESTIMATE-INTEGRATION] Buscando estimados del usuario...");
        
        // 🎯 USAR EXACTAMENTE LA MISMA LÓGICA QUE ESTIMATESWIZARD.TSX
        let allEstimates: any[] = [];

        // ❌ ELIMINADO: Ya no cargar desde collection "projects" (proyectos corruptos)
        // Solo cargar desde collection "estimates" que es la fuente de verdad
        console.log(`📊 [PROJECTS-COLLECTION] Encontrados 0 documentos`);
        console.log(`📊 [PROJECTS-COLLECTION] Mapeados 0 estimados desde proyectos`);

        // ✅ SOLO cargar desde collection "estimates" (igual que EstimatesWizard)
        try {
          const estimatesQuery = query(
            collection(db, "estimates"),
            where("firebaseUserId", "==", currentUser.uid)  // ✅ FIXED: Usar firebaseUserId
          );

          const estimatesSnapshot = await getDocs(estimatesQuery);
          console.log(`📊 [ESTIMATES-COLLECTION] Encontrados ${estimatesSnapshot.size} estimados`);
          
          const firebaseEstimates = estimatesSnapshot.docs.map((doc) => {
            const data = doc.data();

            // ✅ EXACT SAME MAPPING AS EstimatesWizard.tsx
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

            let totalValue =
              data.projectTotalCosts?.totalSummary?.finalTotal ||
              data.projectTotalCosts?.total ||
              data.total ||
              data.estimateAmount ||
              0;

            // ✅ FIXED: Detectar si el valor está en centavos y convertir a dólares
            // Si es un número entero grande (>10000) sin decimales, está en centavos
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
              clientName: clientName,
              address: data.address || data.clientAddress || "Dirección no especificada",
              projectType: data.projectType || data.projectDetails?.type || "fencing",
              projectSubtype: data.projectSubtype || data.fenceType || data.serviceType,
              fenceType: data.fenceType,
              fenceHeight: data.fenceHeight || data.height,
              height: data.height || data.fenceHeight,
              status: data.status || "estimate",
              totalPrice: totalValue,
              createdAt: data.createdAt,
              source: "estimates",
              projectProgress: mapStatusToProgress(data.status),
              estimateHtml: data.estimateHtml,
              contractHtml: data.contractHtml,
              attachments: data.attachments || {},
              clientNotes: data.clientNotes || data.notes,
              internalNotes: data.internalNotes,
              permitStatus: data.permitStatus,
              paymentStatus: data.paymentStatus,
              scheduledDate: data.scheduledDate,
              completedDate: data.completedDate,
              projectDescription: data.projectDescription || data.description || projectTitle,
              projectCategory: data.projectCategory || "fencing",
              projectScope: data.projectScope,
              materialsList: data.materialsList || data.items || [],
              laborHours: data.laborHours,
              difficulty: data.difficulty || "medium",
              // ✅ EXACT SAME FIELDS AS EstimatesWizard
              estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
              title: projectTitle,
              clientEmail: clientEmail,
              estimateDate: data.createdAt
                ? data.createdAt.toDate?.() || new Date(data.createdAt)
                : new Date(),
              items: data.projectTotalCosts?.materialCosts?.items || data.items || [],
              projectId: doc.id,
              pdfUrl: data.pdfUrl || null,
              originalData: data
            };
          });

          allEstimates = [...allEstimates, ...firebaseEstimates];
          console.log(`📊 [ESTIMATES-COLLECTION] Mapeados ${firebaseEstimates.length} estimados`);
        } catch (estimatesError) {
          console.warn("⚠️ [ESTIMATES-COLLECTION] Error:", estimatesError);
        }

        // Convertir estimados a formato de proyectos
        allEstimates.forEach((estimate) => {
          console.log(`📋 [ESTIMATE-TO-PROJECT]`, {
            id: estimate.id,
            cliente: estimate.clientName,
            estado: estimate.status,
            total: estimate.totalPrice,
            numero: estimate.estimateNumber
          });

          allProjects.push(estimate);
        });

        console.log(`🎯 [DASHBOARD] Total proyectos cargados: ${allProjects.length}`);
        
        if (allProjects.length === 0) {
          console.log("📭 [DASHBOARD] Dashboard vacío - No hay estimados");
          // No mostrar toast en carga vacía, solo en errores
        } else {
          console.log(`✅ [DASHBOARD] Dashboard cargado exitosamente con ${allProjects.length} proyectos`);
          // ✅ FIXED: Solo mostrar toast en la primera carga exitosa usando ref
          if (!hasLoadedOnce.current && !isBackgroundRefresh) {
            toast({
              title: "📊 Dashboard Cargado",
              description: `${allProjects.length} proyecto${allProjects.length !== 1 ? 's' : ''} sincronizado${allProjects.length !== 1 ? 's' : ''} desde estimates.`,
            });
            hasLoadedOnce.current = true;
          }
        }

        // Mapear estados correctamente
        const projectsWithProgress = allProjects.map(project => ({
          ...project,
          projectProgress: mapStatusToProgress(project.status) || "estimate_created"
        }));
        
        setProjects(projectsWithProgress);
        setFilteredProjects(projectsWithProgress);

      } catch (firebaseError: any) {
        console.error("🚨 [FIREBASE-ERROR] Error conectando con Firebase:", firebaseError);
        
        // ✅ FIXED: Solo mostrar toasts de error si no es background refresh
        if (!isBackgroundRefresh) {
          // Manejar errores específicos
          if (firebaseError.code === 'permission-denied') {
            toast({
              variant: "destructive",
              title: "Error de Permisos",
              description: "No tienes permisos para acceder a los proyectos. Verifica tu autenticación.",
            });
          } else if (firebaseError.code === 'unavailable') {
            toast({
              variant: "destructive",
              title: "Firebase No Disponible",
              description: "El servicio está temporalmente no disponible. Intenta de nuevo en unos minutos.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error de Conexión",
              description: "No se pudo cargar los proyectos. Verifica tu conexión a internet.",
            });
          }
        } else {
          // Background refresh: log silently for telemetry
          console.warn("🔇 [BACKGROUND-REFRESH] Error silencioso:", firebaseError.code || firebaseError.message);
        }
      }

    } catch (error) {
      console.error("❌ Error loading projects:", error);
      // Solo mostrar error si no es background refresh silencioso
      if (!isBackgroundRefresh) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los proyectos.",
        });
      }
    } finally {
      // ✅ FIXED: Clear correct loading state
      if (isBackgroundRefresh) {
        setIsBackgroundRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [currentUser, toast]); // ✅ Dependencies for useCallback

  // ✅ Auto-refresh cada 30 segundos para sincronizar con EstimatesWizard
  useEffect(() => {
    // Esperar a que el usuario esté completamente autenticado
    if (currentUser?.uid) {
      console.log("👤 [PROJECTS] Usuario autenticado detectado, cargando proyectos...");
      loadProjects(false); // Initial load
      
      // ✅ Auto-refresh cada 30 segundos en background sin parpadeo
      const refreshInterval = setInterval(() => {
        console.log("🔄 [PROJECTS] Auto-refresh silencioso de proyectos...");
        loadProjects(true); // Background refresh (no skeleton)
      }, 30000);
      
      return () => clearInterval(refreshInterval);
    } else {
      console.log("👤 [PROJECTS] Esperando autenticación...");
      setIsLoading(false); // No mostrar cargando infinito si no hay usuario
    }
  }, [currentUser?.uid, loadProjects]); // ✅ Include loadProjects dependency

  // Filter projects when any filter changes
  useEffect(() => {
    let result = [...projects];
    
    // Filter by status tab
    if (activeTab !== "all") {
      result = result.filter(project => project.status === activeTab);
    }
    
    // Filter by project category
    if (selectedProjectCategory && selectedProjectCategory !== 'all') {
      result = result.filter(project => {
        const projectCategory = project.projectType || project.projectCategory || 'general';
        return projectCategory === selectedProjectCategory;
      });
    }
    
    // Filter by specific project type
    if (selectedProjectType && selectedProjectType !== 'all') {
      result = result.filter(project => {
        const projectSubtype = project.projectSubtype || project.fenceType;
        return projectSubtype === selectedProjectType;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        project => 
          project.clientName.toLowerCase().includes(term) || 
          project.address.toLowerCase().includes(term) ||
          (project.projectType && project.projectType.toLowerCase().includes(term)) ||
          (project.projectSubtype && project.projectSubtype.toLowerCase().includes(term)) ||
          (project.fenceType && project.fenceType.toLowerCase().includes(term)) ||
          (project.projectDescription && project.projectDescription.toLowerCase().includes(term))
      );
    }
    
    setFilteredProjects(result);
  }, [activeTab, selectedProjectCategory, selectedProjectType, searchTerm, projects]);

  // Helper functions
  const formatDate = (date: any) => {
    try {
      if (date && typeof date.toDate === 'function') {
        return new Intl.DateTimeFormat('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(date.toDate());
      }
      
      const dateObj = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (e) {
      return "Fecha no disponible";
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-500";
      case "sent":
        return "bg-blue-500";
      case "approved":
        return "bg-green-500";
      case "completed":
        return "bg-purple-500";
      default:
        return "bg-slate-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Borrador";
      case "sent":
        return "Enviado";
      case "approved":
        return "Aprobado";
      case "completed":
        return "Completado";
      default:
        return status;
    }
  };

  const getProjectCategoryInfo = (project: Project) => {
    const projectType = project.projectType || project.projectCategory || 'general';
    const category = projectCategories[projectType as keyof typeof projectCategories] || projectCategories.general;
    
    return {
      categoryName: category.name,
      categoryIcon: category.icon,
      subtype: project.projectSubtype || project.fenceType || 'No especificado'
    };
  };

  // Handle viewing project details
  const handleViewProject = async (id: string) => {
    // 🔐 VERIFICAR PERMISOS: Solo usuarios de paga pueden ver detalles
    const canAccessProjects = hasAccess('projects');
    
    if (!canAccessProjects) {
      // Mostrar modal de upgrade para usuarios Free/Primo Chambeador
      showUpgradeModal({
        title: "Gestión de Proyectos - Plan Premium",
        message: "La gestión completa de proyectos está disponible solo para usuarios de paga. Actualiza tu plan para monitorear y gestionar todos tus proyectos sin límites.",
        feature: "projects",
        benefits: [
          "Monitoreo ilimitado de proyectos",
          "Detalles completos de cada proyecto",
          "Timeline futurista y visual",
          "Gestión de documentos y pagos",
          "Sin restricciones de acceso"
        ]
      });
      return;
    }
    
    // Si tiene acceso, abrir modal normalmente
    try {
      const projectData = await getProjectById(id);
      setSelectedProject(projectData as Project);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching project details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los detalles del proyecto."
      });
    }
  };

  // Handle updating project
  const handleProjectUpdate = (updatedProject: Project) => {
    setSelectedProject(updatedProject);
    
    const updatedProjects = projects.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    );
    
    setProjects(updatedProjects);
    setFilteredProjects(
      filteredProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
  };

  // Handle updating project progress
  const handleProgressUpdate = (newProgress: string) => {
    if (!selectedProject) return;
    
    const updatedProject = {
      ...selectedProject,
      projectProgress: newProgress
    };
    
    setSelectedProject(updatedProject);
    handleProjectUpdate(updatedProject);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="mb-6">
          <div className="text-4xl mb-4">🔄 CARGANDO PROYECTOS RESTAURADOS...</div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <div className="text-4xl">📋</div>
        </div>
        <h2 className="text-xl font-semibold mb-2">No hay proyectos</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Aún no has creado ningún estimado o contrato.
        </p>
        <Link href="/estimates">
          <Button className="bg-green-500 hover:bg-green-600">
            🚀 Crear Nuevo Estimado
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-shrink-0 p-6 pb-2">
        {/* Header con controles de vista */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Proyectos
          </h1>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setViewMode("grid")} 
              className={viewMode === "grid" ? "bg-muted" : ""}
              data-testid="button-view-grid"
            >
              📋
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setViewMode("list")} 
              className={viewMode === "list" ? "bg-muted" : ""}
              data-testid="button-view-list"
            >
              📝
            </Button>
          </div>
        </div>

        {/* 🔐 BANNER DE ACCESO LIMITADO para usuarios Free/Primo Chambeador */}
        {!hasAccess('projects') && (
          <div className="mb-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔒</div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Acceso Limitado - Plan Gratuito
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                  Puedes ver la lista de proyectos, pero necesitas un plan de paga para acceder a los detalles completos, monitoreo y gestión avanzada.
                </p>
                <Button
                  size="sm"
                  onClick={() => showUpgradeModal({
                    title: "Desbloquea la Gestión Completa de Proyectos",
                    message: "Actualiza a un plan de paga para acceder a todas las funcionalidades de gestión de proyectos.",
                    feature: "projects",
                    benefits: [
                      "Monitoreo ilimitado de proyectos",
                      "Timeline futurista y visual",
                      "Gestión de documentos y pagos",
                      "Análisis detallado por proyecto",
                      "Sin restricciones de acceso"
                    ]
                  })}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="button-upgrade-projects"
                >
                  ⭐ Actualizar Plan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="mb-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="🔍 Buscar por cliente, dirección o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-search"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedProjectCategory} onValueChange={(value) => {
                setSelectedProjectCategory(value);
                setSelectedProjectType("");
              }}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.entries(projectCategories).map(([key, category]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        🔧 {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProjectCategory && selectedProjectCategory !== 'all' && (
              <div className="w-full md:w-64">
                <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="Tipo específico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {projectCategories[selectedProjectCategory as keyof typeof projectCategories]?.types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Status Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full md:w-auto flex flex-wrap">
              <TabsTrigger value="all" data-testid="tab-all">Todos</TabsTrigger>
              {projectStatuses.map(status => (
                <TabsTrigger key={status} value={status} data-testid={`tab-${status}`}>
                  {getStatusLabel(status)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {/* Results Count */}
          <div className="text-sm text-muted-foreground" data-testid="text-results-count">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'proyecto encontrado' : 'proyectos encontrados'}
          </div>
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 px-6 pb-6">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-muted-foreground">No se encontraron proyectos con los filtros actuales</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const categoryInfo = getProjectCategoryInfo(project);
              return (
                <Card 
                  key={project.id} 
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-cyan-400"
                  onClick={() => handleViewProject(project.id)}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{project.clientName}</CardTitle>
                      <Badge className={`${getStatusBadgeColor(project.status)} text-white`}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        📍 {project.address}
                      </p>
                      <p className="text-sm">
                        🔨 {categoryInfo.categoryName}
                      </p>
                      <p className="text-xs text-cyan-600">
                        📊 Progreso: {project.projectProgress || "estimate_created"}
                      </p>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold text-green-600">
                          {formatPrice(project.totalPrice)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(project.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProject(project.id);
                        }}
                        data-testid={`button-view-${project.id}`}
                      >
                        📋 Ver Detalles
                      </Button>
                      {project.attachments && Object.keys(project.attachments).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          📎 {Object.keys(project.attachments).length}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => {
              const categoryInfo = getProjectCategoryInfo(project);
              return (
                <Card 
                  key={project.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewProject(project.id)}
                  data-testid={`row-project-${project.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <h3 className="font-semibold">{project.clientName}</h3>
                          <Badge className={`${getStatusBadgeColor(project.status)} text-white`}>
                            {getStatusLabel(project.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          📍 {project.address} • 🔨 {categoryInfo.categoryName}
                        </p>
                        <p className="text-xs text-cyan-600 mt-1">
                          📊 {project.projectProgress || "estimate_created"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatPrice(project.totalPrice)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(project.createdAt)}
                        </div>
                        {project.attachments && Object.keys(project.attachments).length > 0 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            📎 {Object.keys(project.attachments).length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalles del proyecto con línea de tiempo */}
      {selectedProject && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <DialogHeader className="sticky top-0 z-20 bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-b border-cyan-400/20 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex items-center justify-center border border-cyan-400/30">
                  <div className="text-cyan-400 text-xl">🏗️</div>
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      {selectedProject.clientName}
                    </span>
                    <Badge className={`${getStatusBadgeColor(selectedProject.status)} text-white`}>
                      {getStatusLabel(selectedProject.status)}
                    </Badge>
                  </DialogTitle>
                  <p className="text-cyan-300/80 text-sm font-mono">
                    ID: {selectedProject.id} • 📍 {selectedProject.address}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
              {/* Mobile Layout: Stack */}
              <div className="lg:hidden p-4 space-y-6 overflow-y-auto h-full">
                {/* Futuristic Timeline for Mobile */}
                <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg p-4 relative shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                  <h3 className="text-cyan-300 font-semibold mb-4 flex items-center font-mono">
                    <div className="mr-2">⏱️</div>
                    LÍNEA DE TIEMPO DEL PROYECTO
                  </h3>
                  <FuturisticTimeline 
                    projectId={selectedProject.id} 
                    currentProgress={selectedProject.projectProgress || "estimate_created"} 
                    onProgressUpdate={handleProgressUpdate} 
                  />
                </div>
                
                {/* Mobile Details Section */}
                <div className="bg-gray-800/40 border border-cyan-400/20 rounded-lg p-4 relative">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                  <h3 className="text-cyan-300 font-semibold mb-4 flex items-center font-mono">
                    <div className="mr-2">📋</div>
                    DETALLES DEL PROYECTO
                  </h3>
                  <ProjectDetails 
                    project={selectedProject} 
                    onUpdate={handleProjectUpdate} 
                  />
                </div>
              </div>

              {/* Desktop Layout: Two Columns */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-6 p-6 h-full">
                {/* Left Column - Timeline */}
                <div className="space-y-6">
                  {/* Futuristic Timeline */}
                  <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>
                    
                    <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                      <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                        <div className="mr-2">⏱️</div>
                        LÍNEA DE TIEMPO DEL PROYECTO
                      </h3>
                    </div>
                    
                    <div className="p-4">
                      <FuturisticTimeline 
                        projectId={selectedProject.id} 
                        currentProgress={selectedProject.projectProgress || "estimate_created"} 
                        onProgressUpdate={handleProgressUpdate} 
                      />
                    </div>
                  </div>

                  {/* Sistema de estado del proyecto */}
                  <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400"></div>
                    
                    <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                      <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                        <div className="mr-2">📊</div>
                        ESTADO DEL SISTEMA
                      </h3>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative hover:border-cyan-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-cyan-400 text-xs mb-1 font-mono">PRECIO TOTAL</div>
                            <div className="text-white font-bold">
                              {formatPrice(selectedProject.totalPrice)}
                            </div>
                          </div>
                          <div className="text-cyan-400 text-lg">💰</div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative hover:border-cyan-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-cyan-400 text-xs mb-1 font-mono">ARCHIVOS ADJUNTOS</div>
                            <div className="text-white font-semibold">
                              {selectedProject.attachments ? Object.keys(selectedProject.attachments).length : 0} archivos
                            </div>
                          </div>
                          <div className="text-cyan-400 text-lg">📎</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Project Details */}
                <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400"></div>
                  
                  <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                    <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                      <div className="mr-2">📋</div>
                      DETALLES DEL PROYECTO
                    </h3>
                  </div>
                  
                  <div className="p-4 h-full overflow-y-auto">
                    <ProjectDetails 
                      project={selectedProject} 
                      onUpdate={handleProjectUpdate} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default Projects;