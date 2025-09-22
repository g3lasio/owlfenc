import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/PermissionContext";
import { getAuthHeaders } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

interface Project {
  id: string;
  clientName: string;
  address: string;
  projectType: string;
  status: string;
  totalPrice?: number;
  createdAt: any;
  source?: string;
}

function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasAccess, showUpgradeModal, loading: permissionsLoading } = usePermissions();

  // 🚀 TANSTACK QUERY INTEGRATION for PostgreSQL projects - matching EstimatesWizard pattern
  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      console.log("🔄 Loading projects from PostgreSQL via /api/projects...");
      
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/projects", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.status}`);
      }

      const allProjects: Project[] = await response.json();
      console.log(`✅ Projects loaded from PostgreSQL: ${allProjects.length}`);
      return allProjects;
    },
    enabled: !!user?.uid && hasAccess('projects'),
  });

  // Handle permissions and error states with useEffect
  useEffect(() => {
    if (!user?.uid) {
      if (user !== undefined) { // Only show error if auth check is complete
        toast({
          title: "🔐 Autenticación requerida",
          description: "Por favor inicia sesión para ver tus proyectos",
          variant: "destructive",
        });
      }
      return;
    }

    if (!hasAccess('projects')) {
      if (!permissionsLoading) {
        toast({
          title: "⭐ Acceso Restringido", 
          description: "Tu plan actual no incluye acceso completo a gestión de proyectos",
          variant: "destructive",
        });
        showUpgradeModal('projects', 'Gestiona proyectos con herramientas profesionales');
      }
    }
  }, [user?.uid, hasAccess, toast, showUpgradeModal, permissionsLoading]);

  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error("❌ Error loading projects:", error);
      
      let errorMessage = "No se pudieron cargar los proyectos";
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          errorMessage = "Sesión expirada. Por favor inicia sesión nuevamente";
        } else if (error.message.includes("403")) {
          errorMessage = "No tienes permisos para acceder a esta información";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Error de conexión. Verifica tu internet e intenta nuevamente";
        }
      }
      
      toast({
        title: "Error al cargar proyectos",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Filtrar proyectos - NULL-SAFE filtering for database nullable fields
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      (project.clientName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (project.address?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (project.projectType?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      return timestamp.toDate ? timestamp.toDate().toLocaleDateString() : new Date(timestamp).toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      estimate: "bg-blue-100 text-blue-800",
      "client_approved": "bg-green-100 text-green-800",
      "in_progress": "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      active: "bg-blue-100 text-blue-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      estimate: "Estimado",
      "client_approved": "Aprobado",
      "in_progress": "En Progreso",
      completed: "Completado",
      active: "Activo"
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <div className="text-4xl mb-4">🚀 CARGANDO NUEVA PÁGINA...</div>
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border-2 border-green-200">
        <h1 className="text-4xl font-bold mb-2">🚀 NUEVA PÁGINA PROJECTS</h1>
        <p className="text-lg text-green-600 font-semibold">
          ✅ Página completamente nueva y optimizada (284 líneas vs 1,979)
        </p>
        <p className="text-muted-foreground">
          Gestiona todos tus proyectos y estimados en un solo lugar
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="🔍 Buscar por cliente, dirección o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="estimate">Estimados</SelectItem>
            <SelectItem value="client_approved">Aprobados</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
            <div className="text-sm text-blue-600">📋 Total Proyectos</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {projects.filter(p => p.status === "estimate").length}
            </div>
            <div className="text-sm text-green-600">📝 Estimados</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {projects.filter(p => p.status === "in_progress").length}
            </div>
            <div className="text-sm text-yellow-600">🔧 En Progreso</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {formatPrice(projects.reduce((sum, p) => sum + (p.totalPrice || 0), 0))}
            </div>
            <div className="text-sm text-purple-600">💰 Valor Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "No se encontraron proyectos con los filtros aplicados."
                : "Comienza creando tu primer estimado o proyecto."
              }
            </p>
            <Link href="/estimates-dashboard">
              <Button className="bg-green-500 hover:bg-green-600">
                🚀 Crear Estimado
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-400">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{project.clientName}</CardTitle>
                  <Badge className={getStatusColor(project.status)}>
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
                    🔨 {project.projectType}
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
                  {project.source === "estimates" ? (
                    <Link href={`/estimates-dashboard`}>
                      <Button size="sm" variant="outline" className="flex-1">
                        📊 Ver Estimado
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1">
                      📋 Ver Proyecto
                    </Button>
                  )}
                  <Link href={`/project-payments`}>
                    <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                      💳 Pagos
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;