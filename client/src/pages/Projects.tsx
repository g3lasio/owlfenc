import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getProjects } from "@/lib/firebase";
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

interface Project {
  id: string;
  clientName: string;
  address: string;
  fenceType: string;
  fenceHeight?: number;
  projectType: string;
  status: string;
  createdAt: { toDate: () => Date };
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

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFenceType, setSelectedFenceType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const data = await getProjects();
        // Ensure projects have a status field, default to "draft" if missing
        const projectsWithStatus = (data as Project[]).map(project => ({
          ...project,
          status: project.status || "draft"
        }));
        setProjects(projectsWithStatus);
        setFilteredProjects(projectsWithStatus);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load projects."
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
    if (selectedFenceType) {
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
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
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
    <div className="flex-1 p-6 overflow-auto">
      <h1 className="text-2xl font-bold mb-6">Proyectos</h1>
      
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
                <SelectItem value="">Todos los tipos</SelectItem>
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
      
      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <i className="ri-search-line text-3xl mb-2 text-muted-foreground"></i>
          <p className="text-muted-foreground">No se encontraron proyectos con los filtros actuales</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{project.clientName}</CardTitle>
                  <Badge className={`${getStatusBadgeColor(project.status)} text-white`}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <i className="ri-calendar-line mr-1"></i>
                  {formatDate(project.createdAt.toDate())}
                  <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    {project.projectType}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-1">
                  <span className="font-medium">Dirección:</span> {project.address}
                </p>
                <p className="text-sm mb-1">
                  <span className="font-medium">Tipo de Cerca:</span> {project.fenceType}
                  {project.fenceHeight && (
                    <span className="ml-1">{project.fenceHeight} ft</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  ID: {project.id}
                </p>
                <div className="flex justify-end mt-4 space-x-2">
                  <Button size="sm" variant="outline">
                    <i className="ri-file-text-line mr-1"></i> Ver
                  </Button>
                  <Button size="sm" variant="outline">
                    <i className="ri-edit-line mr-1"></i> Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}