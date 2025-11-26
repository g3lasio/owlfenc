import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/PermissionContext";
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

function ProjectsSimple() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasAccess, showUpgradeModal } = usePermissions();

  useEffect(() => {
    if (user?.uid) {
      loadProjects();
    }
  }, [user?.uid]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);

      if (!user?.uid) {
        toast({
          title: "Autenticación requerida",
          description: "Por favor inicia sesión para ver tus proyectos",
          variant: "destructive",
        });
        return;
      }

      if (!hasAccess('projects')) {
        toast({
          title: "Acceso Restringido",
          description: "Tu plan actual no incluye acceso completo a gestión de proyectos",
          variant: "destructive",
        });
        showUpgradeModal('projects', 'Gestiona proyectos con herramientas profesionales');
        return;
      }

      // UNIFIED DATA SOURCE: Load ONLY from 'estimates' collection
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      console.log(`🔒 [PROJECTS-SIMPLE] Loading estimates for user: ${user.uid}`);

      const estimatesRef = collection(db, "estimates");
      const estimatesQuery = query(estimatesRef, where("firebaseUserId", "==", user.uid));
      const estimatesSnapshot = await getDocs(estimatesQuery);

      console.log(`📊 [PROJECTS-SIMPLE] Found ${estimatesSnapshot.size} estimates`);

      const allProjects: Project[] = [];

      estimatesSnapshot.forEach((doc) => {
        const data = doc.data();
        
        const clientName = data.clientInformation?.name || 
                          data.clientName || 
                          data.client?.name || 
                          "Cliente no especificado";

        const address = data.clientInformation?.address ||
                       data.clientInformation?.fullAddress ||
                       data.address || 
                       data.clientAddress || 
                       "Dirección no especificada";

        let totalPrice = data.projectTotalCosts?.totalSummary?.finalTotal ||
                        data.projectTotalCosts?.total ||
                        data.totalAmount || 
                        data.totalPrice || 
                        data.total ||
                        0;

        if (totalPrice > 10000 && Number.isInteger(totalPrice)) {
          totalPrice = totalPrice / 100;
        }

        allProjects.push({
          id: doc.id,
          clientName: clientName,
          address: address,
          projectType: data.projectType || data.projectDetails?.type || "General",
          status: data.status || "estimate",
          totalPrice: totalPrice,
          createdAt: data.createdAt,
          source: "estimates"
        });
      });

      console.log(`✅ [PROJECTS-SIMPLE] Loaded ${allProjects.length} estimates`);
      setProjects(allProjects);

    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los proyectos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar proyectos
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectType.toLowerCase().includes(searchTerm.toLowerCase());
    
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Proyectos</h1>
        <p className="text-muted-foreground">
          Gestiona todos tus proyectos y estimados en un solo lugar
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente, dirección o tipo..."
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
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{projects.length}</div>
            <div className="text-sm text-muted-foreground">Total Proyectos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === "estimate").length}
            </div>
            <div className="text-sm text-muted-foreground">Estimados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === "in_progress").length}
            </div>
            <div className="text-sm text-muted-foreground">En Progreso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {formatPrice(projects.reduce((sum, p) => sum + (p.totalPrice || 0), 0))}
            </div>
            <div className="text-sm text-muted-foreground">Valor Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
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
              <Button>Crear Estimado</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
                        Ver Estimado
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1">
                      Ver Proyecto
                    </Button>
                  )}
                  <Link href={`/project-payments`}>
                    <Button size="sm" className="flex-1">
                      Pagos
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

export default ProjectsSimple;