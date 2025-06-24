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
import FuturisticTimeline from "@/components/projects/FuturisticTimeline";
import { 
  FullHeightContainer, 
  FixedHeader, 
  ScrollableContent, 
  DialogContainer,
  TabContainer,
  TabNavigation,
  TabContent,
  CardGrid
} from "@/components/layout/StandardLayoutContainers";

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
  createdAt: { toDate: () => Date };
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

// Project categories and configurations
const projectCategories = {
  fencing: {
    name: "Cercas y Portones",
    icon: "fence",
    types: ["Wood Fence", "Metal Fence", "Iron Fence", "Chain Link Fence", "Mesh Fence", "Vinyl Fence", "Composite Fence", "Bamboo Fence", "Aluminum Fence", "Privacy Fence", "Picket Fence"]
  },
  roofing: {
    name: "Techos",
    icon: "home",
    types: ["Asphalt Shingles", "Metal Roofing", "Tile Roofing", "Slate Roofing", "Flat Roofing", "Roof Repair", "Gutter Installation", "Skylight Installation"]
  },
  general: {
    name: "Contratista General",
    icon: "tool",
    types: ["Home Renovation", "Kitchen Remodel", "Bathroom Remodel", "Addition", "Basement Finishing", "Garage Conversion", "Whole House", "Commercial Build"]
  }
};

const projectStatuses = ["draft", "sent", "approved", "completed"];
const projectProgressStages = ["estimate_created", "estimate_sent", "client_approved", "contract_sent", "contract_signed", "scheduled", "in_progress", "completed", "cancelled"];

function Projects() {
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
  const [dashboardTab, setDashboardTab] = useState<'details' | 'client' | 'documents'>('details');
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const data = await getProjects();
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
    
    if (activeTab !== "all") {
      result = result.filter(project => project.status === activeTab);
    }
    
    if (selectedProjectCategory && selectedProjectCategory !== 'all') {
      result = result.filter(project => {
        const projectCategory = project.projectType || project.projectCategory || 'general';
        return projectCategory === selectedProjectCategory;
      });
    }
    
    if (selectedProjectType && selectedProjectType !== 'all') {
      result = result.filter(project => {
        const projectSubtype = project.projectSubtype || project.fenceType;
        return projectSubtype === selectedProjectType;
      });
    }
    
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-slate-500";
      case "sent": return "bg-blue-500";
      case "approved": return "bg-green-500";
      case "completed": return "bg-purple-500";
      default: return "bg-slate-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Borrador";
      case "sent": return "Enviado";
      case "approved": return "Aprobado";
      case "completed": return "Completado";
      default: return status;
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

  const getProjectDisplayInfo = (project: Project) => {
    const categoryInfo = getProjectCategoryInfo(project);
    
    return {
      ...categoryInfo,
      height: project.fenceHeight || project.height,
      description: project.projectDescription || `${categoryInfo.subtype} en ${project.address}`
    };
  };

  const getProgressBadgeColor = (progress: string) => {
    switch (progress) {
      case "estimate_created": return "bg-slate-500";
      case "estimate_sent": return "bg-blue-500";
      case "client_approved": return "bg-green-500";
      case "contract_sent": return "bg-yellow-500";
      case "contract_signed": return "bg-purple-500";
      case "scheduled": return "bg-orange-500";
      case "in_progress": return "bg-amber-500";
      case "completed": return "bg-emerald-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };
  
  const getProgressLabel = (progress: string) => {
    switch (progress) {
      case "estimate_created": return "Presupuesto Creado";
      case "estimate_sent": return "Presupuesto Enviado";
      case "client_approved": return "Cliente Aprobó";
      case "contract_sent": return "Contrato Enviado";
      case "contract_signed": return "Contrato Firmado";
      case "scheduled": return "Instalación Programada";
      case "in_progress": return "En Progreso";
      case "completed": return "Completado";
      case "cancelled": return "Cancelado";
      default: return progress;
    }
  };

  const handleEditEstimate = (projectId: string) => {
    window.location.href = `/estimates?edit=${projectId}`;
  };

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

  const handleProgressUpdate = (newProgress: string) => {
    if (!selectedProject) return;
    
    const updatedProject = {
      ...selectedProject,
      projectProgress: newProgress
    };
    
    setSelectedProject(updatedProject);
    handleProjectUpdate(updatedProject);
  };

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

      await updateProject(projectId, {
        status: 'completed',
        projectProgress: 'completed',
        completedDate: new Date()
      });

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
      <div className="page-container">
        <h1 className="text-2xl font-bold mb-6">Proyectos</h1>
        <div className="mb-6 space-y-4">
          <Skeleton className="h-10 w-full md:w-3/4" />
          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-28" />
            ))}
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
    <div className="flex-1 flex flex-col ">
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
                setSelectedProjectType("");
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
      </FixedHeader>
      
      {/* Projects Content */}
      <ScrollableContent>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <i className="ri-search-line text-3xl mb-2 text-muted-foreground"></i>
            <p className="text-muted-foreground">No se encontraron proyectos con los filtros actuales</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const displayInfo = getProjectDisplayInfo(project);
              return (
                <Card key={project.id} className="">
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

                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                {filteredProjects.map((project) => {
                  const displayInfo = getProjectDisplayInfo(project);
                  return (
                    <tr key={project.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{project.clientName}</div>
                      </td>
                      <td className="px-4 py-3 truncate max-w-[200px] hidden md:table-cell">
                        {project.address}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <i className={`ri-${displayInfo.categoryIcon}-line text-primary`}></i>
                          <span className="text-xs">{displayInfo.categoryName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell text-sm">
                        {displayInfo.subtype}
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

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ScrollableContent>
      
      {/* Project Details Dialog */}
      {isDialogOpen && selectedProject && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="p-0 max-w-7xl w-[98vw] h-[98vh] max-h-[98vh]">
            <DialogContainer>
              <FixedHeader className="p-2 border-b border-cyan-400/30 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-cyan-400"></div>
                
                <DialogTitle className="flex items-center gap-2 relative z-10">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-cyan-300 tracking-wide font-mono">
                    DASHBOARD: {selectedProject.clientName.toUpperCase()}
                  </span>
                </DialogTitle>
              </FixedHeader>
              
              <FullHeightContainer className="bg-gray-900">
                {/* Futuristic Timeline - Fixed at top */}
                <FixedHeader className="p-4 pb-4 bg-gray-900 border-b-2 border-cyan-400/20 shadow-lg">
                  <FuturisticTimeline 
                    projectId={selectedProject.id} 
                    currentProgress={selectedProject.projectProgress || "estimate_created"} 
                    onProgressUpdate={handleProgressUpdate} 
                  />
                </FixedHeader>

                {/* Large Separation Space */}
                <FixedHeader className="h-8 bg-gray-900 border-b border-gray-700/30" />

                {/* Dashboard Sections - Wizard-style Tabs */}
                <TabContainer className="px-4 pb-4 bg-gray-900 pt-4">
                  <TabNavigation>
                    <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg border border-cyan-400/30 shadow-xl backdrop-blur-sm">
                      <button
                        onClick={() => setDashboardTab('details')}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                          dashboardTab === 'details'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30'
                        }`}
                      >
                        <i className="ri-settings-4-line mr-1"></i>
                        Details
                      </button>
                      <button
                        onClick={() => setDashboardTab('client')}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                          dashboardTab === 'client'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30'
                        }`}
                      >
                        <i className="ri-user-3-line mr-1"></i>
                        Client
                      </button>
                      <button
                        onClick={() => setDashboardTab('documents')}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                          dashboardTab === 'documents'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30'
                        }`}
                      >
                        <i className="ri-folder-3-line mr-1"></i>
                        Docs
                      </button>
                    </div>
                  </TabNavigation>

                  {/* Tab Content */}
                  <div className="flex-1 bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg backdrop-blur-sm shadow-2xl ">
                    <TabContent>
                      {dashboardTab === 'details' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 block mb-1">Type:</span>
                              <span className="text-cyan-200 font-medium">{selectedProject.projectType || 'General'}</span>
                            </div>
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 block mb-1">Subtype:</span>
                              <span className="text-cyan-200 font-medium">{selectedProject.projectSubtype || selectedProject.fenceType || 'N/A'}</span>
                            </div>
                          </div>
                          
                          {selectedProject.projectDescription && (
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 text-sm block mb-2">Description:</span>
                              <p className="text-gray-200 text-sm">{selectedProject.projectDescription}</p>
                            </div>
                          )}

                          {selectedProject.projectScope && (
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 text-sm block mb-2">Scope:</span>
                              <p className="text-gray-200 text-sm">{selectedProject.projectScope}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 block mb-1">Status:</span>
                              <Badge className={`${getStatusBadgeColor(selectedProject.status)} text-xs px-2 py-1 mt-1`}>
                                {getStatusLabel(selectedProject.status)}
                              </Badge>
                            </div>
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 block mb-1">Value:</span>
                              <span className="text-green-400 font-medium text-lg">
                                {selectedProject.totalPrice ? `$${(selectedProject.totalPrice / 100).toLocaleString()}` : 'TBD'}
                              </span>
                            </div>
                          </div>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
                            onClick={() => {
                              window.location.href = `/estimates?edit=${selectedProject.id}`;
                            }}
                          >
                            <i className="ri-edit-line mr-2"></i>
                            Edit Project
                          </Button>
                        </div>
                      )}

                      {dashboardTab === 'client' && (
                        <div className="space-y-4">
                          <div className="bg-gray-700/30 p-4 rounded border border-gray-600/20">
                            <span className="text-gray-400 text-sm block mb-2">Client Name:</span>
                            <p className="text-cyan-200 font-medium text-lg">{selectedProject.clientName}</p>
                          </div>

                          <div className="bg-gray-700/30 p-4 rounded border border-gray-600/20">
                            <span className="text-gray-400 text-sm block mb-2">Project Address:</span>
                            <p className="text-gray-200">{selectedProject.address}</p>
                          </div>

                          {selectedProject.clientEmail && (
                            <div className="bg-gray-700/30 p-4 rounded border border-gray-600/20">
                              <span className="text-gray-400 text-sm block mb-2">Email:</span>
                              <p className="text-gray-200 font-mono">{selectedProject.clientEmail}</p>
                            </div>
                          )}

                          {selectedProject.clientPhone && (
                            <div className="bg-gray-700/30 p-4 rounded border border-gray-600/20">
                              <span className="text-gray-400 text-sm block mb-2">Phone:</span>
                              <p className="text-gray-200 font-mono">{selectedProject.clientPhone}</p>
                            </div>
                          )}

                          {selectedProject.clientNotes && (
                            <div className="bg-gray-700/30 p-4 rounded border border-gray-600/20">
                              <span className="text-gray-400 text-sm block mb-2">Client Notes:</span>
                              <p className="text-gray-200">{selectedProject.clientNotes}</p>
                            </div>
                          )}

                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
                            onClick={() => {
                              toast({
                                title: "Contact Client",
                                description: `${selectedProject.clientName} - ${selectedProject.clientEmail || selectedProject.clientPhone || 'No contact info'}`
                              });
                            }}
                          >
                            <i className="ri-message-3-line mr-2"></i>
                            Contact Client
                          </Button>
                        </div>
                      )}

                      {dashboardTab === 'documents' && (
                        <div className="space-y-4">
                          {/* Document Count Cards */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-700/30 p-4 rounded border border-gray-600/20 text-center">
                              <div className="text-cyan-400 text-2xl mb-2">
                                <i className="ri-file-list-3-line"></i>
                              </div>
                              <div className="text-sm text-gray-400 mb-1">Estimates</div>
                              <div className="text-cyan-300 font-semibold text-xl">
                                {selectedProject.estimateHtml ? '1' : '0'}
                              </div>
                            </div>
                            <div className="bg-gray-700/30 p-4 rounded border border-gray-600/20 text-center">
                              <div className="text-purple-400 text-2xl mb-2">
                                <i className="ri-file-text-line"></i>
                              </div>
                              <div className="text-sm text-gray-400 mb-1">Contracts</div>
                              <div className="text-purple-300 font-semibold text-xl">
                                {selectedProject.contractHtml ? '1' : '0'}
                              </div>
                            </div>
                          </div>

                          {/* Document Actions */}
                          <div className="space-y-3">
                            {selectedProject.estimateHtml && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 justify-start"
                                onClick={() => {
                                  const blob = new Blob([selectedProject.estimateHtml], { type: 'text/html' });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                }}
                              >
                                <i className="ri-eye-line mr-2"></i>
                                View Estimate
                              </Button>
                            )}
                            
                            {selectedProject.contractHtml && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full border-purple-400/30 text-purple-300 hover:bg-purple-400/10 justify-start"
                                onClick={() => {
                                  const blob = new Blob([selectedProject.contractHtml], { type: 'text/html' });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                }}
                              >
                                <i className="ri-eye-line mr-2"></i>
                                View Contract
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full border-green-400/30 text-green-300 hover:bg-green-400/10 justify-start"
                              onClick={() => {
                                window.location.href = `/cyberpunk-contract-generator?projectId=${selectedProject.id}`;
                              }}
                            >
                              <i className="ri-file-add-line mr-2"></i>
                              Create Contract
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/10 justify-start"
                              onClick={() => {
                                window.location.href = `/invoices?projectId=${selectedProject.id}`;
                              }}
                            >
                              <i className="ri-bill-line mr-2"></i>
                              Generate Invoice
                            </Button>

                            {/* Upload Section */}
                            <div className="pt-2 border-t border-gray-700/30">
                              <div className="relative">
                                <input 
                                  type="file" 
                                  id={`file-upload-${selectedProject.id}`}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => {
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                      toast({
                                        title: "Files Selected",
                                        description: `${files.length} file(s) ready for upload`
                                      });
                                    }
                                  }}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
                                >
                                  <i className="ri-upload-2-line mr-2"></i>
                                  Upload Files
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabContent>
                  </div>
                </TabContainer>
              </FullHeightContainer>
            </DialogContainer>
          </DialogContent>
        </Dialog>
      )}
    </FullHeightContainer>
  );
}

export default Projects;
