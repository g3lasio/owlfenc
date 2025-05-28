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
  fenceType: string;
  fenceHeight?: number;
  height?: number;
  projectType?: string;
  status: string;
  createdAt: { toDate: () => Date };
  // Campos nuevos
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
}

// Tipos de cercas disponibles
const fenceTypes = [
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
];

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
  const [selectedFenceType, setSelectedFenceType] = useState("");
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
    
    // Filter by fence type
    if (selectedFenceType && selectedFenceType !== 'all') {
      result = result.filter(project => project.fenceType === selectedFenceType);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        project => 
          project.clientName.toLowerCase().includes(term) || 
          project.address.toLowerCase().includes(term)
      );
    }
    
    setFilteredProjects(result);
  }, [activeTab, selectedFenceType, searchTerm, projects]);
  
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
  
  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-auto">
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
    <div className="flex-1 p-6 page-scroll-container" style={{WebkitOverflowScrolling: 'touch'}}>
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
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-72">
            <Select value={selectedFenceType} onValueChange={setSelectedFenceType}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo de cerca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {fenceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      </div>
      
      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        {filteredProjects.length} {filteredProjects.length === 1 ? 'proyecto encontrado' : 'proyectos encontrados'}
      </div>
      
      {/* Projects Grid or List View */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
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
                <p className="text-sm mb-1">
                  <span className="font-medium">Dirección:</span> {project.address}
                </p>
                <p className="text-sm mb-1">
                  <span className="font-medium">Tipo de Cerca:</span> {project.fenceType}
                  {(project.fenceHeight || project.height) && (
                    <span className="ml-1">{project.fenceHeight || project.height} ft</span>
                  )}
                </p>
                
                {/* Progress Badge */}
                <div className="mt-3 mb-2">
                  <Badge variant="outline" className={`${getProgressBadgeColor(project.projectProgress || "estimate_created")} bg-opacity-10 border-opacity-50 text-sm`}>
                    <i className={`ri-${project.projectProgress === "completed" ? "checkbox-circle" : "time"}-line mr-1`}></i>
                    {getProgressLabel(project.projectProgress || "estimate_created")}
                  </Badge>
                </div>
                
                <div className="flex justify-end mt-4 space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewProject(project.id)}
                  >
                    <i className="ri-dashboard-line mr-1"></i> Dashboard
                  </Button>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
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
                    {project.fenceType}
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
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewProject(project.id)}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      <i className="ri-dashboard-line mr-1"></i> Dashboard
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
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
              <div className="flex-1 overflow-auto bg-gray-900 relative">
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
                  <div className="cyber-container-mobile">
                    <h3 className="text-cyan-300 font-semibold mb-3 flex items-center font-mono">
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
                <div className="hidden lg:grid lg:grid-cols-2 gap-6 p-6">
                  {/* Left Column - Progress & System Status */}
                  <div className="space-y-6">
                    {/* System Status */}
                    <div className="cyber-container">
                      <div className="cyber-header">
                        <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                          <i className="ri-dashboard-3-line mr-2"></i>
                          ESTADO DEL SISTEMA
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="cyber-stat-card">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-cyan-400 text-xs mb-1 font-mono">PROYECTO ID</div>
                              <div className="text-white font-mono text-sm">{selectedProject.id.slice(-12)}</div>
                            </div>
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                          </div>
                        </div>
                        
                        <div className="cyber-stat-card">
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
                    <div className="cyber-container">
                      <div className="cyber-header">
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
                  <div className="cyber-container">
                    <div className="cyber-header">
                      <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                        <i className="ri-file-list-3-line mr-2"></i>
                        DETALLES DEL PROYECTO
                      </h3>
                    </div>
                    <div className="p-4">
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