import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getProjects, getProjectById, updateProject } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FuturisticTimeline from "@/components/projects/FuturisticTimeline";
import {
  FullHeightContainer,
  FixedHeader,
  ScrollableContent,
  DialogContainer,
  TabContainer,
  TabNavigation,
  TabContent,
  CardGrid,
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

const projectCategories = {
  fences: {
    name: "Cercas",
    icon: "fence",
    types: ["Madera", "Vinilo", "Metal", "Chain Link", "Compuesta"],
  },
  decks: {
    name: "Terrazas",
    icon: "building",
    types: ["Madera", "Compuesta", "Vinilo", "Metal"],
  },
  roofing: {
    name: "Techos",
    icon: "home",
    types: ["Asfalto", "Metal", "Teja", "Slate"],
  },
  general: {
    name: "General",
    icon: "tools",
    types: ["Reparación", "Instalación", "Mantenimiento"],
  },
};

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectCategory, setSelectedProjectCategory] = useState("all");
  const [selectedProjectType, setSelectedProjectType] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dashboardTab, setDashboardTab] = useState("details");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      loadProjects();
    }
  }, [user?.uid]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);

      // SECURITY: Verificar autenticación
      if (!user?.uid) {
        toast({
          title: "Autenticación requerida",
          description: "Por favor inicia sesión para ver tus proyectos",
          variant: "destructive",
        });
        setProjects([]);
        return;
      }

      console.log(
        `🔒 SECURITY: Loading projects for authenticated user: ${user.uid}`,
      );

      // Importar Firebase directamente para evitar errores de backend
      const { collection, getDocs, query, where } = await import(
        "firebase/firestore"
      );
      const { db } = await import("@/lib/firebase");

      console.log("🔍 Loading estimates directly...");

      // Cargar estimados de la colección "estimates"
      const estimatesRef = collection(db, "estimates");
      const estimatesQuery = query(
        estimatesRef,
        where("userId", "==", user.uid),
      );
      const estimatesSnapshot = await getDocs(estimatesQuery);

      // Cargar proyectos de la colección "projects" con status="estimate"
      const projectsRef = collection(db, "projects");
      const projectsQuery = query(projectsRef, where("userId", "==", user.uid));
      const projectsSnapshot = await getDocs(projectsQuery);

      // Procesar todos los datos
      const allProjects: any[] = [];

      // Procesar estimados
      estimatesSnapshot.forEach((doc) => {
        const data = doc.data();
        allProjects.push({
          id: doc.id,
          clientName: data.clientName || "Cliente no especificado",
          address:
            data.address ||
            data.clientAddress ||
            data.projectAddress ||
            "Dirección no especificada",
          projectType: data.projectType || "Cerca",
          projectDescription: data.projectDescription || data.description || "",
          status: data.status || "estimate",
          createdAt: data.createdAt || new Date(),
          totalPrice:
            data.totalAmount || data.totalPrice || data.totalCost || 0,
          source: "estimates-wizard",
          // Datos completos del estimado
          items: data.items || [],
          projectTotalCosts: data.projectTotalCosts,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          // Preservar todos los datos adicionales
          ...data,
        });
      });

      // Procesar proyectos tradicionales
      projectsSnapshot.forEach((doc) => {
        const data = doc.data();
        allProjects.push({
          id: doc.id,
          clientName: data.clientName || "Cliente no especificado",
          address:
            data.address ||
            data.clientAddress ||
            data.projectAddress ||
            "Dirección no especificada",
          projectType: data.projectType || "General",
          projectDescription: data.projectDescription || data.description || "",
          status: data.status || "active",
          createdAt: data.createdAt || new Date(),
          totalPrice: data.totalPrice || data.totalAmount || 0,
          source: "project",
          // Preservar todos los datos del proyecto
          ...data,
        });
      });

      console.log(
        `✅ Projects loaded directly: ${allProjects.length} for user ${user.uid}`,
      );
      console.log(
        "📋 Sample projects data:",
        allProjects.slice(0, 3).map((p) => ({
          id: p.id,
          clientName: p.clientName,
          totalPrice: p.totalPrice,
          source: p.source,
          rawTotalAmount: p.totalAmount,
          rawTotalPrice: p.totalPrice,
          rawTotalCost: p.totalCost,
        })),
      );

      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los proyectos.",
      });
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedProjectCategory === "all" ||
      project.projectCategory === selectedProjectCategory ||
      (selectedProjectCategory === "fences" &&
        project.projectType === "fence") ||
      (selectedProjectCategory === "decks" && project.projectType === "deck") ||
      (selectedProjectCategory === "roofing" &&
        project.projectType === "roofing");

    const matchesType =
      selectedProjectType === "all" ||
      project.projectSubtype === selectedProjectType ||
      project.fenceType === selectedProjectType;

    const matchesProgress =
      progressFilter === "all" || project.projectProgress === progressFilter;

    return matchesSearch && matchesCategory && matchesType && matchesProgress;
  });

  const getProjectCategoryInfo = (project: Project) => {
    if (
      project.projectType === "fence" ||
      project.projectCategory === "fences"
    ) {
      return { name: "Cercas", icon: "fence" };
    } else if (
      project.projectType === "deck" ||
      project.projectCategory === "decks"
    ) {
      return { name: "Terrazas", icon: "building" };
    } else if (
      project.projectType === "roofing" ||
      project.projectCategory === "roofing"
    ) {
      return { name: "Techos", icon: "home" };
    } else {
      return { name: "General", icon: "tools" };
    }
  };

  const getProjectDisplayInfo = (project: Project) => {
    const categoryInfo = getProjectCategoryInfo(project);
    return {
      categoryName: categoryInfo.name,
      categoryIcon: categoryInfo.icon,
      subtype: project.projectSubtype || project.fenceType || "N/A",
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      case "in_progress":
        return "bg-blue-500";
      case "completed":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprobado";
      case "rejected":
        return "Rechazado";
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En Progreso";
      case "completed":
        return "Completado";
      default:
        return "Desconocido";
    }
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case "estimate_created":
        return "border-blue-400 text-blue-400";
      case "rejected":
        return "border-red-400 text-red-400";
      case "in_contract":
        return "border-yellow-400 text-yellow-400";
      case "scheduled":
        return "border-purple-400 text-purple-400";
      case "in_progress":
        return "border-orange-400 text-orange-400";
      case "paid":
        return "border-green-400 text-green-400";
      case "completed":
        return "border-gray-400 text-gray-400";
      default:
        return "border-gray-400 text-gray-400";
    }
  };

  const getProgressLabel = (progress: string) => {
    switch (progress) {
      case "estimate_created":
        return "Estimado";
      case "rejected":
        return "Rechazado";
      case "in_contract":
        return "Contrato";
      case "scheduled":
        return "Programado";
      case "in_progress":
        return "En Progreso";
      case "paid":
        return "Pagado";
      case "completed":
        return "Completado";
      default:
        return "Desconocido";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return timestamp.toDate().toLocaleDateString();
  };

  const handleEditEstimate = (projectId: string) => {
    window.location.href = `/estimates?edit=${projectId}`;
  };

  const handleViewProject = (projectId: string) => {
    try {
      console.log(`🔒 SECURITY: Loading project ${projectId} for user ${user?.uid}`);
      
      // Buscar el proyecto en los datos ya cargados
      const project = projects.find(p => p.id === projectId);
      
      if (project) {
        console.log("✅ Project found in loaded data:", project.clientName);
        setSelectedProject(project);
        setIsDialogOpen(true);
      } else {
        console.error("❌ Project not found in loaded data");
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se encontró el proyecto seleccionado.",
        });
      }
    } catch (error) {
      console.error("Error loading project details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los detalles del proyecto.",
      });
    }
  };

  const handleProgressUpdate = async (
    projectId: string,
    newProgress: string,
  ) => {
    try {
      await updateProject(projectId, { projectProgress: newProgress });
      setSelectedProject((prev) =>
        prev ? { ...prev, projectProgress: newProgress } : null,
      );
      toast({
        title: "Progreso actualizado",
        description:
          "El progreso del proyecto ha sido actualizado exitosamente.",
      });
      loadProjects();
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el progreso del proyecto.",
      });
    }
  };

  if (isLoading) {
    return (
      <FullHeightContainer className="bg-background">
        <FixedHeader className="p-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </FixedHeader>
        <ScrollableContent>
          <CardGrid cols={{ default: 1, md: 2, lg: 3 }} className="gap-6 pb-40">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </CardGrid>
        </ScrollableContent>
      </FullHeightContainer>
    );
  }

  return (
    <div className=" bg-background">
      <div className="fixed-header p-6 border-b">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Proyectos</h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-muted" : ""}
            >
              <i className="ri-grid-line"></i>
            </Button>
            <Button
              variant="outline"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-muted" : ""}
            >
              <i className="ri-list-check"></i>
            </Button>
          </div>
        </div>

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
              <Select
                value={selectedProjectCategory}
                onValueChange={(value) => {
                  setSelectedProjectCategory(value);
                  setSelectedProjectType("");
                }}
              >
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
          </div>

          <Tabs
            value={progressFilter}
            onValueChange={setProgressFilter}
            className="w-full"
          >
            <TabsList className="flex flex-wrap  sm:grid sm:grid-cols-4 md:grid-cols-8 gap-1 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="all" className="text-xs whitespace-nowrap">
                Todos
              </TabsTrigger>
              <TabsTrigger
                value="estimate_created"
                className="text-xs whitespace-nowrap"
              >
                Estimado
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="text-xs whitespace-nowrap"
              >
                Rechazado
              </TabsTrigger>
              <TabsTrigger
                value="in_contract"
                className="text-xs whitespace-nowrap"
              >
                Contrato
              </TabsTrigger>
              <TabsTrigger
                value="scheduled"
                className="text-xs whitespace-nowrap"
              >
                Programado
              </TabsTrigger>
              <TabsTrigger
                value="in_progress"
                className="text-xs whitespace-nowrap"
              >
                Proyecto
              </TabsTrigger>
              <TabsTrigger value="paid" className="text-xs whitespace-nowrap">
                Pagado
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-xs whitespace-nowrap"
              >
                Completado
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-sm text-muted-foreground">
            {filteredProjects.length}{" "}
            {filteredProjects.length === 1
              ? "proyecto encontrado"
              : "proyectos encontrados"}
          </div>
        </div>
      </div>
      <div className="p-6">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <i className="ri-search-line text-3xl mb-2 text-muted-foreground"></i>
            <p className="text-muted-foreground">
              No se encontraron proyectos con los filtros actuales
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <CardGrid
            cols={{ default: 1, md: 2, lg: 3 }}
            className="gap-6 md:h-[40dvh] overflow-y-auto "
          >
            {filteredProjects.map((project) => {
              const displayInfo = getProjectDisplayInfo(project);
              return (
                <Card
                  key={project.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                          {project.clientName}
                        </h3>
                        <p
                          className="text-sm text-muted-foreground truncate"
                          title={project.address}
                        >
                          {project.address}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`ml-2 ${getStatusColor(project.status)} text-xs shrink-0`}
                      >
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <i
                          className={`ri-${displayInfo.categoryIcon}-line text-primary`}
                        ></i>
                        <span className="font-medium">
                          {displayInfo.categoryName}
                        </span>
                        {project.projectSubtype && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {displayInfo.subtype}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${getProgressColor(project.projectProgress || "estimate_created")} text-xs`}
                        >
                          {getProgressLabel(
                            project.projectProgress || "estimate_created",
                          )}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <i className="ri-calendar-line"></i>
                        <span>{formatDate(project.createdAt)}</span>
                      </div>

                      {project.projectDescription && (
                        <div className="text-xs hidden md:block text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded">
                          {project.projectDescription.slice(0, 250)}...
                        </div>
                      )}

                      {
                        //@ts-ignore
                        project.total && (
                          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                            <i className="ri-money-dollar-circle-line"></i>
                            <span>
                              {
                                //@ts-ignore
                                project.total
                              }
                            </span>
                          </div>
                        )
                      }
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEstimate(project.id)}
                        className="flex-1 text-xs"
                      >
                        <i className="ri-edit-line mr-1"></i>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewProject(project.id)}
                        className="flex-1 text-xs"
                      >
                        <i className="ri-dashboard-line mr-1"></i>
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardGrid>
        ) : (
          <div className="border rounded-lg ">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Cliente</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">
                      Dirección
                    </th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">
                      Categoría
                    </th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">
                      Progreso
                    </th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">
                      Fecha
                    </th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const displayInfo = getProjectDisplayInfo(project);
                    return (
                      <tr
                        key={project.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-medium">
                            {project.clientName}
                          </div>
                          <div className="text-sm text-muted-foreground md:hidden">
                            {project.address}
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div
                            className="text-sm max-w-xs truncate"
                            title={project.address}
                          >
                            {project.address}
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <i
                              className={`ri-${displayInfo.categoryIcon}-line text-primary text-sm`}
                            ></i>
                            <span className="text-sm">
                              {displayInfo.categoryName}
                            </span>
                          </div>
                          {project.projectSubtype && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {displayInfo.subtype}
                            </div>
                          )}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <Badge
                            variant="outline"
                            className={`${getProgressColor(
                              project.projectProgress || "estimate_created",
                            )} text-xs`}
                          >
                            {getProgressLabel(
                              project.projectProgress || "estimate_created",
                            )}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={`${getStatusColor(project.status)} text-xs`}
                          >
                            {getStatusLabel(project.status)}
                          </Badge>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(project.createdAt)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditEstimate(project.id)}
                              className="text-xs"
                            >
                              <i className="ri-edit-line mr-1"></i>
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewProject(project.id)}
                              className="text-xs"
                            >
                              <i className="ri-dashboard-line mr-1"></i>
                              Ver
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {isDialogOpen && selectedProject && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="dialog-content p-0 max-w-7xl w-[98vw] h-[95vh]">
            <div className="fixed-header p-2 border-b border-cyan-400/30 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative">
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
            </div>

            <div className="dialog-body bg-gray-900">
              <div className="fixed-header p-4 pb-4 bg-gray-900 border-b-2 border-cyan-400/20 shadow-lg">
                <FuturisticTimeline
                  projectId={selectedProject.id}
                  currentProgress={
                    selectedProject.projectProgress || "estimate_created"
                  }
                  onProgressUpdate={handleProgressUpdate}
                />
              </div>

              <div className="h-8 bg-gray-900 border-b border-gray-700/30"></div>

              <div className="flex-1 px-4 pb-4 bg-gray-900 pt-4  flex flex-col">
                <div className="flex-shrink-0">
                  <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg border border-cyan-400/30 shadow-xl backdrop-blur-sm">
                    <button
                      onClick={() => setDashboardTab("details")}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        dashboardTab === "details"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30"
                      }`}
                    >
                      <i className="ri-settings-4-line mr-1"></i>
                      Details
                    </button>
                    <button
                      onClick={() => setDashboardTab("client")}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        dashboardTab === "client"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30"
                      }`}
                    >
                      <i className="ri-user-3-line mr-1"></i>
                      Client
                    </button>
                    <button
                      onClick={() => setDashboardTab("documents")}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        dashboardTab === "documents"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30"
                      }`}
                    >
                      <i className="ri-folder-3-line mr-1"></i>
                      Docs
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg backdrop-blur-sm shadow-2xl ">
                  <div className="h-full  p-4">
                    {dashboardTab === "details" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                            <span className="text-gray-400 block mb-1">
                              Type:
                            </span>
                            <span className="text-cyan-200 font-medium">
                              {selectedProject.projectType || "General"}
                            </span>
                          </div>
                          <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                            <span className="text-gray-400 block mb-1">
                              Subtype:
                            </span>
                            <span className="text-cyan-200 font-medium">
                              {selectedProject.projectSubtype ||
                                selectedProject.fenceType ||
                                "N/A"}
                            </span>
                          </div>
                        </div>

                        {selectedProject.projectDescription && (
                          <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                            <span className="text-gray-400 text-sm block mb-2">
                              Description:
                            </span>
                            <p className="text-gray-200 text-sm">
                              {selectedProject.projectDescription}
                            </p>
                          </div>
                        )}

                        {selectedProject.projectScope && (
                          <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                            <span className="text-gray-400 text-sm block mb-2">
                              Scope:
                            </span>
                            <p className="text-gray-200 text-sm">
                              {selectedProject.projectScope}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {dashboardTab === "client" && (
                      <div className="space-y-4">
                        <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                          <span className="text-gray-400 text-sm block mb-2">
                            Client Name:
                          </span>
                          <p className="text-cyan-200 font-medium">
                            {selectedProject.clientName}
                          </p>
                        </div>
                        <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                          <span className="text-gray-400 text-sm block mb-2">
                            Address:
                          </span>
                          <p className="text-gray-200 text-sm">
                            {selectedProject.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {dashboardTab === "documents" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-gray-700/20 rounded border border-cyan-400/20">
                            <i className="ri-file-text-line text-2xl text-cyan-400 mb-2 block"></i>
                            <p className="text-sm text-gray-300 mb-2">
                              Estimate
                            </p>
                            <Button
                              size="sm"
                              className="w-full bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                            >
                              {selectedProject.estimateHtml
                                ? "View"
                                : "Generate"}
                            </Button>
                          </div>
                          <div className="text-center p-4 bg-gray-700/20 rounded border border-cyan-400/20">
                            <i className="ri-file-shield-line text-2xl text-cyan-400 mb-2 block"></i>
                            <p className="text-sm text-gray-300 mb-2">
                              Contract
                            </p>
                            <Button
                              size="sm"
                              className="w-full bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                            >
                              {selectedProject.contractHtml
                                ? "View"
                                : "Generate"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
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
