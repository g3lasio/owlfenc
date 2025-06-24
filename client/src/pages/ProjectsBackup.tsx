import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getProjects, getProjectById, updateProject } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProjectProgress from "@/components/projects/ProjectProgress";
import ProjectDetails from "@/components/projects/ProjectDetails";

interface Project {
  id: string;
  clientName: string;
  address: string;
  // Campos actualizados para múltiples tipos de proyecto
  projectType: string; // Categoría principal (fencing, roofing, etc.)
  projectSubtype?: string; // Tipo específico (Wood Fence, Metal Roofing, etc.)
  projectDescription?: string;
  // Campos legacy para compatibilidad
  fenceType?: string;
  fenceHeight?: number;
  height?: number;
  // Campos de estado
  status: string;
  createdAt: { toDate: () => Date };
  // Campos adicionales
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
  // Nuevos campos para mejor organización
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
      "Wood Fence",
      "Metal Fence", 
      "Iron Fence",
      "Chain Link Fence",
      "Mesh Fence",
      "Vinyl Fence",
      "Composite Fence",
      "Bamboo Fence",
      "Aluminum Fence",
      "Privacy Fence",
      "Picket Fence"
    ]
  },
  roofing: {
    name: "Techos",
    icon: "home",
    types: [
      "Asphalt Shingles",
      "Metal Roofing",
      "Tile Roofing",
      "Slate Roofing",
      "Flat Roofing",
      "Roof Repair",
      "Gutter Installation",
      "Skylight Installation"
    ]
  },
  plumbing: {
    name: "Plomería",
    icon: "droplet",
    types: [
      "Pipe Installation",
      "Leak Repair",
      "Drain Cleaning",
      "Water Heater",
      "Bathroom Remodel",
      "Kitchen Plumbing",
      "Sewer Line",
      "Fixture Installation"
    ]
  },
  electrical: {
    name: "Electricidad",
    icon: "zap",
    types: [
      "Panel Upgrade",
      "Outlet Installation",
      "Lighting Installation",
      "Ceiling Fan",
      "Security System",
      "Smart Home",
      "Generator Installation",
      "Electrical Repair"
    ]
  },
  carpentry: {
    name: "Carpintería",
    icon: "hammer",
    types: [
      "Custom Cabinets",
      "Deck Building",
      "Trim Work",
      "Door Installation",
      "Window Installation",
      "Built-in Storage",
      "Staircase",
      "Furniture Repair"
    ]
  },
  concrete: {
    name: "Concreto",
    icon: "square",
    types: [
      "Driveway",
      "Patio",
      "Sidewalk",
      "Foundation",
      "Retaining Wall",
      "Concrete Repair",
      "Stamped Concrete",
      "Garage Floor"
    ]
  },
  landscaping: {
    name: "Paisajismo",
    icon: "tree",
    types: [
      "Garden Design",
      "Lawn Installation",
      "Tree Services",
      "Irrigation System",
      "Hardscaping",
      "Landscape Lighting",
      "Plant Installation",
      "Yard Cleanup"
    ]
  },
  painting: {
    name: "Pintura",
    icon: "paint-bucket",
    types: [
      "Interior Painting",
      "Exterior Painting",
      "Cabinet Painting",
      "Deck Staining",
      "Pressure Washing",
      "Wallpaper Installation",
      "Texture Repair",
      "Commercial Painting"
    ]
  },
  flooring: {
    name: "Pisos",
    icon: "grid",
    types: [
      "Hardwood Installation",
      "Tile Installation",
      "Carpet Installation",
      "Laminate Flooring",
      "Vinyl Flooring",
      "Floor Refinishing",
      "Subfloor Repair",
      "Baseboard Installation"
    ]
  },
  hvac: {
    name: "HVAC",
    icon: "thermometer",
    types: [
      "AC Installation",
      "Heating Installation",
      "Duct Work",
      "HVAC Repair",
      "Air Quality",
      "Thermostat Installation",
      "Ventilation",
      "Heat Pump"
    ]
  },
  general: {
    name: "Contratista General",
    icon: "tool",
    types: [
      "Home Renovation",
      "Kitchen Remodel",
      "Bathroom Remodel",
      "Addition",
      "Basement Finishing",
      "Garage Conversion",
      "Whole House",
      "Commercial Build"
    ]
  }
};

// Obtener todos los tipos de proyecto únicos
const getAllProjectTypes = () => {
  const allTypes: string[] = [];
  Object.values(projectCategories).forEach(category => {
    allTypes.push(...category.types);
  });
  return allTypes;
};

// Estados de proyecto
const projectStatuses = ["draft", "sent", "approved", "completed"];

// Estados de progreso del proyecto
const projectProgressStages = [
  "estimate_created",
  "estimate_sent",
  "client_approved",
  "contract_sent",
  "contract_signed",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled"
];

function Projects() {
  // Asegurarse de que la página tenga scroll en móviles
  useEffect(() => {
    // Forzar el reflow para activar el scrolling
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
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProjectCategory, setSelectedProjectCategory] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const data = await getProjects();
        // Ensure projects have a status field, default to "draft" if missing
        const projectsWithStatus = (data as Project[]).map(project => ({
          ...project,
          status: project.status || "draft",
          projectProgress: project.projectProgress || "estimate_created"
        }));
        setProjects(projectsWithStatus);
        setFilteredProjects(projectsWithStatus);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los proyectos."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjects();
  }, [toast]);
  
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
  
  const formatDate = (date: any) => {
    try {
      // Si es un objeto con método toDate (formato Firebase Timestamp)
      if (date && typeof date.toDate === 'function') {
        return new Intl.DateTimeFormat('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(date.toDate());
      }
      
      // Si es una fecha válida o string de fecha
      const dateObj = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (e) {
      // Si hay algún error, devolver formato predeterminado
      return "Fecha no disponible";
    }
  };
  
  // Helper function to get badge color based on status
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
  
  // Helper function to get status label in Spanish
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

  // Helper function to get project category info
  const getProjectCategoryInfo = (project: Project) => {
    const projectType = project.projectType || project.projectCategory || 'general';
    const category = projectCategories[projectType as keyof typeof projectCategories] || projectCategories.general;
    
    return {
      categoryName: category.name,
      categoryIcon: category.icon,
      subtype: project.projectSubtype || project.fenceType || 'No especificado'
    };
  };

  // Helper function to get project display info
  const getProjectDisplayInfo = (project: Project) => {
    const categoryInfo = getProjectCategoryInfo(project);
    
    return {
      ...categoryInfo,
      height: project.fenceHeight || project.height,
      description: project.projectDescription || `${categoryInfo.subtype} en ${project.address}`
    };
  };

  // Helper function to get progress stage badge color
  const getProgressBadgeColor = (progress: string) => {
    switch (progress) {
      case "estimate_created":
        return "bg-slate-500";
      case "estimate_sent":
        return "bg-blue-500";
      case "client_approved":
        return "bg-green-500";
      case "contract_sent":
        return "bg-yellow-500";
      case "contract_signed":
        return "bg-purple-500";
      case "scheduled":
        return "bg-orange-500";
      case "in_progress":
        return "bg-amber-500";
      case "completed":
        return "bg-emerald-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };
  
  // Helper function to get progress stage label in Spanish
  const getProgressLabel = (progress: string) => {
    switch (progress) {
      case "estimate_created":
        return "Presupuesto Creado";
      case "estimate_sent":
        return "Presupuesto Enviado";
      case "client_approved":
        return "Cliente Aprobó";
      case "contract_sent":
        return "Contrato Enviado";
      case "contract_signed":
        return "Contrato Firmado";
      case "scheduled":
        return "Instalación Programada";
      case "in_progress":
        return "En Progreso";
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return progress;
    }
  };

  // Handle editing estimate
  const handleEditEstimate = (projectId: string) => {
    // Navigate to estimates page with edit parameter
    window.location.href = `/estimates?edit=${projectId}`;
  };

  // Handle viewing project details
  const handleViewProject = async (id: string) => {
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
    
    // Update the project in the projects list
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
    
    // Update the selectedProject
    const updatedProject = {
      ...selectedProject,
      projectProgress: newProgress
    };
    
    setSelectedProject(updatedProject);
    
    // Update the project in the projects list
    handleProjectUpdate(updatedProject);
  };

  // Handle marking project as completed
  const handleMarkAsCompleted = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedProject = {
        ...project,
        status: 'completed',
        projectProgress: 'completed',
        completedDate: new Date()
      };

      // Update in Firebase
      await updateProject(projectId, {
        status: 'completed',
        projectProgress: 'completed',
        completedDate: new Date()
      });

      // Update local state
      const updatedProjects = projects.map(p => 
        p.id === projectId ? updatedProject : p
      );
      
      setProjects(updatedProjects);
      setFilteredProjects(
        filteredProjects.map(p => p.id === projectId ? updatedProject : p)
      );

      toast({
        title: "Proyecto completado",
        description: `El proyecto de ${project.clientName} ha sido marcado como completado.`,
      });
    } catch (error) {
      console.error("Error marking project as completed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo marcar el proyecto como completado."
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="page-container">>
        <h1 className="text-2xl font-bold mb-6">Proyectos</h1>
        <div className="mb-6 space-y-4">
          <Skeleton className="h-10 w-full md:w-3/4" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4 mb-2" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex justify-end mt-4">
                  <Skeleton className="h-8 w-20" />
                </div>
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
          <i className="ri-file-list-3-line text-4xl text-muted-foreground"></i>
        </div>
        <h2 className="text-xl font-semibold mb-2">No hay proyectos</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Aún no has creado ningún estimado o contrato.
        </p>
        <Link href="/">
          <Button>
            <i className="ri-add-line mr-2"></i> Crear Nuevo Estimado
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "bg-muted" : ""}>
            <i className="ri-grid-line"></i>
          </Button>
          <Button variant="outline" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-muted" : ""}>
            <i className="ri-list-check"></i>
          </Button>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="mb-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedProjectCategory} onValueChange={(value) => {
              setSelectedProjectCategory(value);
              setSelectedProjectType(""); // Reset specific type when category changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(projectCategories).map(([key, category]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <i className={`ri-${category.icon}-line`}></i>
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedProjectCategory && selectedProjectCategory !== 'all' && (
            <div className="w-full md:w-64">
              <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
                <SelectTrigger>
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
              <TabsTrigger value="all">Todos</TabsTrigger>
              {projectStatuses.map(status => (
                <TabsTrigger key={status} value={status}>
                  {getStatusLabel(status)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'proyecto encontrado' : 'proyectos encontrados'}
          </div>
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <i className="ri-search-line text-3xl mb-2 text-muted-foreground"></i>
            <p className="text-muted-foreground">No se encontraron proyectos con los filtros actuales</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{project.clientName}</CardTitle>
                  <Badge className={`${getStatusBadgeColor(project.status)} text-white`}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <i className="ri-calendar-line mr-1"></i>
                  {formatDate(project.createdAt)}
                  {project.projectType && (
                    <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                      {project.projectType}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const displayInfo = getProjectDisplayInfo(project);
                  return (
                    <>
                      <p className="text-sm mb-1">
                        <span className="font-medium">Dirección:</span> {project.address}
                      </p>
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="font-medium">Categoría:</span>
                        <div className="flex items-center gap-1">
                          <i className={`ri-${displayInfo.categoryIcon}-line text-primary`}></i>
                          <span>{displayInfo.categoryName}</span>
                        </div>
                      </div>
                      <p className="text-sm mb-1">
                        <span className="font-medium">Tipo:</span> {displayInfo.subtype}
                        {displayInfo.height && (
                          <span className="ml-1">{displayInfo.height} ft</span>
                        )}
                      </p>
                      {project.projectDescription && (
                        <p className="text-sm mb-1 text-muted-foreground">
                          {project.projectDescription.length > 80 
                            ? `${project.projectDescription.substring(0, 80)}...` 
                            : project.projectDescription}
                        </p>
                      )}
                      {project.totalPrice && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Precio:</span> 
                          <span className="text-green-600 font-semibold ml-1">
                            ${(project.totalPrice / 100).toLocaleString()}
                          </span>
                        </p>
                      )}
                    </>
                  );
                })()}
                
                {/* Progress Badge */}
                <div className="mt-3 mb-2">
                  <Badge variant="outline" className={`${getProgressBadgeColor(project.projectProgress || "estimate_created")} bg-opacity-10 border-opacity-50 text-sm`}>
                    <i className={`ri-${project.projectProgress === "completed" ? "checkbox-circle" : "time"}-line mr-1`}></i>
                    {getProgressLabel(project.projectProgress || "estimate_created")}
                  </Badge>
                </div>
                
                <div className="flex justify-between mt-4">
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditEstimate(project.id)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <i className="ri-edit-line mr-1"></i> Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewProject(project.id)}
                    >
                      <i className="ri-dashboard-line mr-1"></i> Dashboard
                    </Button>
                  </div>
                  {project.status !== 'completed' && (
                    <Button 
                      size="sm"
                      variant="default"
                      onClick={() => handleMarkAsCompleted(project.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <i className="ri-checkbox-circle-line mr-1"></i>
                      Completar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Dirección</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Progreso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{project.clientName}</div>
                    </td>
                    <td className="px-4 py-3 truncate max-w-[200px] hidden md:table-cell">
                      {project.address}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      {(() => {
                        const displayInfo = getProjectDisplayInfo(project);
                        return (
                          <div className="flex items-center gap-1">
                            <i className={`ri-${displayInfo.categoryIcon}-line text-primary`}></i>
                            <span className="text-xs">{displayInfo.categoryName}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell text-sm">
                      {(() => {
                        const displayInfo = getProjectDisplayInfo(project);
                        return displayInfo.subtype;
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      {formatDate(project.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                      <Badge variant="outline" className={`${getProgressBadgeColor(project.projectProgress || "estimate_created")} bg-opacity-10 border-opacity-50 text-xs`}>
                        {getProgressLabel(project.projectProgress || "estimate_created")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={`${getStatusBadgeColor(project.status)} text-white text-xs`}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditEstimate(project.id)}
                          className="text-xs px-2 py-1 h-auto text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <i className="ri-edit-line mr-1"></i> Editar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewProject(project.id)}
                          className="text-xs px-2 py-1 h-auto"
                        >
                          <i className="ri-dashboard-line mr-1"></i> Dashboard
                        </Button>
                        {project.status !== 'completed' && (
                          <Button 
                            size="sm"
                            variant="default"
                            onClick={() => handleMarkAsCompleted(project.id)}
                            className="text-xs px-2 py-1 h-auto bg-green-600 hover:bg-green-700 text-white"
                          >
                            <i className="ri-checkbox-circle-line mr-1"></i>
                            Completar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Project Details Dialog */}
      {isDialogOpen && selectedProject && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="p-0 max-w-7xl w-[98vw] h-[98vh] max-h-[98vh] overflow-hidden bg-gray-900 border-cyan-400/30 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <div className="flex flex-col h-full relative overflow-hidden">
              {/* Cyberpunk Header */}
              <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b border-cyan-400/30 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative">
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-400"></div>
                
                {/* Scanning Line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                
                <DialogTitle className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    {/* Arc Reactor */}
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div>
                      <div className="absolute inset-1 bg-white rounded-full"></div>
                    </div>
                    <span className="text-xl font-bold text-cyan-300 tracking-wider font-mono">
                      DASHBOARD: {selectedProject.clientName.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Scanning Effect */}
                    <div className="w-16 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-4 animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                    <Badge className={`${getProgressBadgeColor(selectedProject.projectProgress || "estimate_created")} px-3 py-1 font-mono text-xs bg-cyan-400/20 text-cyan-300 border-cyan-400/30`}>
                      <i className="ri-cpu-line mr-1"></i>
                      {getProgressLabel(selectedProject.projectProgress || "estimate_created")}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              {/* Cyberpunk Dashboard Content */}
              <div className="page-container bg-gray-900 relative">
                {/* Mobile Layout */}
                <div className="lg:hidden p-4 space-y-4">
                  {/* Mobile Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="cyber-stat-card-mobile">
                      <div className="text-cyan-400 text-xs mb-1 font-mono">ID PROYECTO</div>
                      <div className="text-white text-sm font-mono">{selectedProject.id.slice(-8)}</div>
                    </div>
                    <div className="cyber-stat-card-mobile">
                      <div className="text-cyan-400 text-xs mb-1 font-mono">ESTADO</div>
                      <div className="text-green-400 text-sm font-semibold">{getStatusLabel(selectedProject.status)}</div>
                    </div>
                  </div>
                  
                  {/* Mobile Progress Section */}
                  <div className="cyber-container-mobile">
                    <h3 className="text-cyan-300 font-semibold mb-3 flex items-center font-mono">
                      <i className="ri-route-line mr-2"></i>
                      PROGRESO DEL PROYECTO
                    </h3>
                    <ProjectProgress 
                      projectId={selectedProject.id} 
                      currentProgress={selectedProject.projectProgress || "estimate_created"} 
                      onProgressUpdate={handleProgressUpdate} 
                    />
                  </div>
                  
                  {/* Mobile Details Section */}
                  <div className="bg-gray-800/40 border border-cyan-400/20 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                    <h3 className="text-cyan-300 font-semibold mb-4 flex items-center font-mono">
                      <i className="ri-file-list-3-line mr-2"></i>
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
                  {/* Left Column - Progress & System Status */}
                  <div className="space-y-6 overflow-auto">
                    {/* System Status */}
                    <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>
                      
                      <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                        <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                          <i className="ri-dashboard-3-line mr-2"></i>
                          ESTADO DEL SISTEMA
                        </h3>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative overflow-hidden hover:border-cyan-400/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-cyan-400 text-xs mb-1 font-mono">PROYECTO ID</div>
                              <div className="text-white font-mono text-sm">{selectedProject.id.slice(-12)}</div>
                            </div>
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative overflow-hidden hover:border-cyan-400/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-cyan-400 text-xs mb-1 font-mono">ESTADO ACTUAL</div>
                              <div className="text-green-400 font-semibold">{getStatusLabel(selectedProject.status)}</div>
                            </div>
                            <i className="ri-checkbox-circle-line text-green-400 text-lg"></i>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative overflow-hidden hover:border-cyan-400/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-cyan-400 text-xs mb-1 font-mono">PRECIO TOTAL</div>
                              <div className="text-white font-bold">
                                {selectedProject.totalPrice 
                                  ? `$${(selectedProject.totalPrice / 100).toLocaleString()}`
                                  : 'No establecido'}
                              </div>
                            </div>
                            <i className="ri-money-dollar-circle-line text-cyan-400 text-lg"></i>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400"></div>
                      
                      <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                        <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                          <i className="ri-route-line mr-2"></i>
                          PROGRESO DEL PROYECTO
                        </h3>
                      </div>
                      
                      <div className="p-4">
                        <ProjectProgress 
                          projectId={selectedProject.id} 
                          currentProgress={selectedProject.projectProgress || "estimate_created"} 
                          onProgressUpdate={handleProgressUpdate} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Project Details */}
                  <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400"></div>
                    
                    <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                      <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                        <i className="ri-file-list-3-line mr-2"></i>
                        DETALLES DEL PROYECTO
                      </h3>
                    </div>
                    
                    <div className="p-4 overflow-auto">
                      <ProjectDetails 
                        project={selectedProject} 
                        onUpdate={handleProjectUpdate} 
                      />
                    </div>
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