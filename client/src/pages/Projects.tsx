import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getProjects, getProjectById, updateProject, updateProjectProgress } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/PermissionContext";
import { UpgradePrompt } from "@/components/permissions/UpgradePrompt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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

interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string | Date;
  base64Data?: string;
  downloadURL?: string;
}

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
  clientEmail?: string;
  clientPhone?: string;
  documents?: ProjectDocument[];
}



function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Advanced filtering and pagination states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Enhanced file management states
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [dragOver, setDragOver] = useState(false);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dashboardTab, setDashboardTab] = useState("details");
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasAccess, canUse, showUpgradeModal } = usePermissions();
  const [, setLocation] = useLocation();

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

      // SECURITY: Verificar permisos de acceso a proyectos
      if (!hasAccess('projects')) {
        toast({
          title: "Acceso Restringido",
          description: "Tu plan actual no incluye acceso completo a gestión de proyectos",
          variant: "destructive",
        });
        showUpgradeModal('projects', 'Gestiona proyectos con herramientas profesionales');
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

  // Enhanced filtering logic
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesType = typeFilter === "all" || project.projectType === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const projectDate = project.createdAt?.toDate?.() || new Date();
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case "today":
          matchesDate = diffInDays === 0;
          break;
        case "week":
          matchesDate = diffInDays <= 7;
          break;
        case "month":
          matchesDate = diffInDays <= 30;
          break;
        case "year":
          matchesDate = diffInDays <= 365;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

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
    setLocation(`/estimates?edit=${projectId}`);
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

  // Enhanced confirmation dialog helper
  const showConfirmation = (type: string, message: string, onConfirm: () => void) => {
    setConfirmAction({ type, message, onConfirm });
    setShowConfirmDialog(true);
  };

  // Bulk actions
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedProjects.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona al menos un proyecto.",
      });
      return;
    }

    showConfirmation(
      "bulk-update",
      `¿Estás seguro de que quieres cambiar el estado de ${selectedProjects.length} proyecto(s) a "${getStatusLabel(newStatus)}"?`,
      async () => {
        try {
          await Promise.all(
            selectedProjects.map(projectId => updateProjectProgress(projectId, newStatus))
          );
          
          toast({
            title: "Estados actualizados",
            description: `Se actualizaron ${selectedProjects.length} proyectos exitosamente.`,
          });
          
          setSelectedProjects([]);
          loadProjects();
        } catch (error) {
          console.error("❌ Error updating bulk status:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron actualizar algunos proyectos.",
          });
        }
      }
    );
  };

  // Export functionality
  const handleExportProjects = () => {
    const csvContent = [
      ['Cliente', 'Dirección', 'Tipo', 'Estado', 'Precio', 'Fecha'],
      ...filteredProjects.map(project => [
        project.clientName,
        project.address,
        project.projectType,
        getStatusLabel(project.status),
        project.totalPrice?.toString() || '0',
        formatDate(project.createdAt)
      ])
    ].map(row => row.join(','))
     .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyectos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exportación completa",
      description: "Los datos se han exportado exitosamente.",
    });
  };

  const handleProgressUpdate = async (
    projectId: string,
    newProgress: string,
  ) => {
    showConfirmation(
      "progress-update",
      `¿Confirmas cambiar el progreso a "${getProgressDisplayText(newProgress)}"?`,
      async () => {
        try {
          console.log(`🔒 SECURITY: Updating progress for project ${projectId} by user ${user?.uid}`);
          console.log(`🔄 Updating progress from ${selectedProject?.projectProgress} to ${newProgress}`);
          
          // Usar updateProjectProgress que busca en ambas colecciones y verifica usuario
          await updateProjectProgress(projectId, newProgress);
          
          setSelectedProject((prev) =>
            prev ? { ...prev, projectProgress: newProgress } : null,
          );
          
          toast({
            title: "Progreso actualizado",
            description:
              "El progreso del proyecto ha sido actualizado exitosamente.",
          });
          
          // Audit log
          console.log(`🔍 AUDIT: User ${user?.uid} updated project ${projectId} progress to ${newProgress}`);
          
          // Recargar proyectos para mostrar cambios
          loadProjects();
        } catch (error) {
          console.error("❌ Error updating progress:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo actualizar el progreso del proyecto.",
          });
        }
      }
    );
  };

  // Enhanced file validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    
    if (file.size > maxSize) {
      return { valid: false, error: `El archivo ${file.name} excede el tamaño máximo de 10MB` };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Tipo de archivo no permitido: ${file.type}` };
    }
    
    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    if (sanitizedName !== file.name) {
      console.warn(`Filename sanitized: ${file.name} -> ${sanitizedName}`);
    }
    
    return { valid: true };
  };

  // Enhanced file upload with Firebase Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedProject) return;

    // Validate all files first
    const validationResults = Array.from(files).map(file => ({
      file,
      validation: validateFile(file)
    }));
    
    const invalidFiles = validationResults.filter(r => !r.validation.valid);
    if (invalidFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Archivos inválidos",
        description: invalidFiles.map(f => f.validation.error).join(', '),
      });
      event.target.value = '';
      return;
    }

    setUploadingFile(true);

    try {
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { storage } = await import("@/lib/firebase");
      const { updateDoc, doc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      const updatedDocuments = [...(selectedProject.documents || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // Update progress
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        try {
          // Upload to Firebase Storage
          const storageRef = ref(storage, `projects/${selectedProject.id}/documents/${fileId}-${sanitizedName}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          const document: ProjectDocument = {
            id: fileId,
            name: sanitizedName,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            downloadURL: downloadURL
          };

          updatedDocuments.push(document);
          
          // Update progress to 100%
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          
          // Audit log
          console.log(`🔍 AUDIT: User ${user?.uid} uploaded document ${sanitizedName} to project ${selectedProject.id}`);
          
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          toast({
            variant: "destructive",
            title: "Error de subida",
            description: `No se pudo subir el archivo ${file.name}`,
          });
        }
      }

      // Update project in Firebase Firestore
      const projectRef = doc(db, "estimates", selectedProject.id);
      await updateDoc(projectRef, {
        documents: updatedDocuments
      });

      setSelectedProject({ ...selectedProject, documents: updatedDocuments });

      toast({
        title: "Documentos subidos",
        description: `${updatedDocuments.length - (selectedProject.documents?.length || 0)} documento(s) subido(s) exitosamente.`,
      });

    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron subir los archivos.",
      });
    } finally {
      setUploadingFile(false);
      setUploadProgress({});
      event.target.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    // Simulate file input change event
    const fakeEvent = {
      target: {
        files: files,
        value: ''
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    await handleFileUpload(fakeEvent);
  };

  // Selection handlers
  const handleSelectProject = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects(prev => [...prev, projectId]);
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(paginatedProjects.map(p => p.id));
    } else {
      setSelectedProjects([]);
    }
  };

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            handleSelectAll(!selectedProjects.length);
            break;
          case 'e':
            e.preventDefault();
            if (selectedProjects.length === 1) {
              handleEditEstimate(selectedProjects[0]);
            }
            break;
          case 'Escape':
            setSelectedProjects([]);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjects]);

  // Get unique values for filters
  const uniqueStatuses = [...new Set(projects.map(p => p.status))];
  const uniqueTypes = [...new Set(projects.map(p => p.projectType))];

  // Helper function to convert file to Base64 (legacy support)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return 'ri-image-line';
    if (fileType.includes('video')) return 'ri-video-line';
    if (fileType.includes('pdf')) return 'ri-file-pdf-line';
    if (fileType.includes('word')) return 'ri-file-word-line';
    if (fileType.includes('excel')) return 'ri-file-excel-line';
    if (fileType.includes('powerpoint')) return 'ri-file-ppt-line';
    if (fileType.includes('text')) return 'ri-file-text-line';
    if (fileType.includes('audio')) return 'ri-music-line';
    return 'ri-file-line';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadDocument = (document: any) => {
    try {
      // Create download link from Base64 data
      const link = document.createElement('a');
      link.href = document.base64Data || document.downloadURL; // Support both new and old format
      link.download = document.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Document downloaded",
        description: "El documento se ha descargado exitosamente.",
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el documento.",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedProject) return;

    const documentToDelete = selectedProject.documents?.find(doc => doc.id === documentId);
    if (!documentToDelete) return;

    showConfirmation(
      "delete-document",
      `¿Estás seguro de que quieres eliminar el documento "${documentToDelete.name}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          const { deleteObject, ref } = await import("firebase/storage");
          const { storage } = await import("@/lib/firebase");
          const { updateDoc, doc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          
          // Delete from Firebase Storage if it has downloadURL
          if (documentToDelete.downloadURL) {
            try {
              const storageRef = ref(storage, documentToDelete.downloadURL);
              await deleteObject(storageRef);
            } catch (storageError) {
              console.warn("Could not delete from storage (may not exist):", storageError);
            }
          }
          
          const updatedDocuments = selectedProject.documents?.filter(doc => doc.id !== documentId) || [];

          // Update project in Firebase
          const projectRef = doc(db, "estimates", selectedProject.id);
          await updateDoc(projectRef, {
            documents: updatedDocuments
          });

          setSelectedProject({ ...selectedProject, documents: updatedDocuments });

          // Audit log
          console.log(`🔍 AUDIT: User ${user?.uid} deleted document ${documentToDelete.name} from project ${selectedProject.id}`);

          toast({
            title: "Documento eliminado",
            description: "El documento ha sido eliminado exitosamente.",
          });

        } catch (error) {
          console.error("Error deleting document:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo eliminar el documento.",
          });
        }
      }
    );
  };

  // Function to generate PDF from project data
  const generateEstimatePdf = async (project: Project) => {
    try {
      const response = await fetch('/api/contract-management/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractHtml: project.estimateHtml || generateEstimateHtml(project),
          contractData: {
            clientName: project.clientName,
            clientAddress: project.address,
            projectType: project.projectType,
            projectDescription: project.projectDescription,
            totalAmount: project.totalPrice
          },
          fileName: `estimate-${project.clientName}.pdf`
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `estimate-${project.clientName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Estimado descargado",
          description: "El archivo PDF se ha descargado exitosamente.",
        });
      } else {
        throw new Error('Error generating PDF');
      }
    } catch (error) {
      console.error('Error generating estimate PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF del estimado.",
      });
    }
  };

  const generateContractPdf = async (project: Project) => {
    try {
      const response = await fetch('/api/contract-management/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractHtml: project.contractHtml || generateContractHtml(project),
          contractData: {
            clientName: project.clientName,
            clientAddress: project.address,
            projectType: project.projectType,
            projectDescription: project.projectDescription,
            totalAmount: project.totalPrice
          },
          fileName: `contract-${project.clientName}.pdf`
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `contract-${project.clientName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Contrato descargado",
          description: "El archivo PDF se ha descargado exitosamente.",
        });
      } else {
        throw new Error('Error generating PDF');
      }
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF del contrato.",
      });
    }
  };

  // Generate HTML content for estimate if not available
  const generateEstimateHtml = (project: Project) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Estimado - ${project.clientName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .client-info, .project-info { margin-bottom: 20px; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ESTIMADO</h1>
          <p>Fecha: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="client-info">
          <h2>Información del Cliente</h2>
          <p><strong>Nombre:</strong> ${project.clientName}</p>
          <p><strong>Dirección:</strong> ${project.address}</p>
        </div>
        <div class="project-info">
          <h2>Información del Proyecto</h2>
          <p><strong>Tipo:</strong> ${project.projectType}</p>
          <p><strong>Descripción:</strong> ${project.projectDescription || 'No especificada'}</p>
        </div>
        <div class="total">
          <p>Total Estimado: $${project.totalPrice?.toLocaleString() || '0.00'}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Generate HTML content for contract if not available
  const generateContractHtml = (project: Project) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Contrato - ${project.clientName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { width: 45%; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CONTRATO DE SERVICIOS</h1>
          <p>Fecha: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="section">
          <h2>PARTES</h2>
          <p><strong>Contratista:</strong> OWL FENC LLC</p>
          <p><strong>Cliente:</strong> ${project.clientName}</p>
          <p><strong>Dirección del Proyecto:</strong> ${project.address}</p>
        </div>
        <div class="section">
          <h2>DESCRIPCIÓN DE LOS SERVICIOS</h2>
          <p><strong>Tipo de Proyecto:</strong> ${project.projectType}</p>
          <p><strong>Descripción:</strong> ${project.projectDescription || 'Servicios de construcción según especificaciones acordadas'}</p>
        </div>
        <div class="section">
          <h2>TÉRMINOS FINANCIEROS</h2>
          <p><strong>Valor Total del Contrato:</strong> $${project.totalPrice?.toLocaleString() || '0.00'}</p>
          <p><strong>Términos de Pago:</strong> Según lo acordado entre las partes</p>
        </div>
        <div class="signature-section">
          <div class="signature-box">
            <div style="border-top: 1px solid #000; padding-top: 5px;">
              <p>Firma del Contratista</p>
              <p>Fecha: _______________</p>
            </div>
          </div>
          <div class="signature-box">
            <div style="border-top: 1px solid #000; padding-top: 5px;">
              <p>Firma del Cliente</p>
              <p>Fecha: _______________</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Function to handle estimate viewing/generation
  const handleEstimateAction = async (project: Project) => {
    if (project.estimateHtml) {
      // If estimate HTML exists, generate and download PDF
      await generateEstimatePdf(project);
    } else {
      // If no estimate HTML, generate it first
      const estimateHtml = generateEstimateHtml(project);
      
      try {
        // Save the generated HTML to the project
        const { updateDoc, doc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        await updateDoc(doc(db, "estimates", project.id), {
          estimateHtml: estimateHtml
        });
        
        // Update local state
        setSelectedProject(prev => prev ? { ...prev, estimateHtml } : null);
        
        // Generate PDF
        await generateEstimatePdf({ ...project, estimateHtml });
      } catch (error) {
        console.error('Error saving estimate HTML:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo generar el estimado.",
        });
      }
    }
  };

  // Function to handle contract viewing/generation
  const handleContractAction = async (project: Project) => {
    if (project.contractHtml) {
      // If contract HTML exists, generate and download PDF
      await generateContractPdf(project);
    } else {
      // If no contract HTML, generate it first
      const contractHtml = generateContractHtml(project);
      
      try {
        // Save the generated HTML to the project
        const { updateDoc, doc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        await updateDoc(doc(db, "estimates", project.id), {
          contractHtml: contractHtml
        });
        
        // Update local state
        setSelectedProject(prev => prev ? { ...prev, contractHtml } : null);
        
        // Generate PDF
        await generateContractPdf({ ...project, contractHtml });
      } catch (error) {
        console.error('Error saving contract HTML:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo generar el contrato.",
        });
      }
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

        {/* Enhanced Filters and Search Bar */}
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Cliente, dirección, tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {uniqueStatuses.filter(status => status).map(status => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {uniqueTypes.filter(type => type).map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las fechas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fechas</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Status and Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {paginatedProjects.length} de {filteredProjects.length} proyecto(s)
              {filteredProjects.length !== projects.length && (
                <span> (filtrado de {projects.length} total)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(statusFilter !== "all" || typeFilter !== "all" || dateFilter !== "all" || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setTypeFilter("all");
                    setDateFilter("all");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                >
                  <i className="ri-close-line mr-1"></i>
                  Limpiar filtros
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportProjects}
              >
                <i className="ri-download-line mr-2"></i>
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedProjects.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedProjects.length === paginatedProjects.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <span className="text-sm font-medium">
                  {selectedProjects.length} proyecto(s) seleccionado(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProjects([])}
                >
                  Deseleccionar todo
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleBulkStatusUpdate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Cambiar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Marcar como Pendiente</SelectItem>
                    <SelectItem value="in_progress">Marcar como En Progreso</SelectItem>
                    <SelectItem value="completed">Marcar como Completado</SelectItem>
                    <SelectItem value="approved">Marcar como Aprobado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
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
            {paginatedProjects.map((project) => {
              const displayInfo = getProjectDisplayInfo(project);
              return (
                <Card
                  key={project.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group relative"
                >
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={(checked) => handleSelectProject(project.id, !!checked)}
                      className="bg-background border-2"
                    />
                  </div>
                  <CardContent className="p-4 pt-8">
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
                        (project as any).total && (
                          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                            <i className="ri-money-dollar-circle-line"></i>
                            <span>
                              ${((project as any).total || 0).toLocaleString()}
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
                    <th className="text-left p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedProjects.length === paginatedProjects.length && paginatedProjects.length > 0}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <span>Cliente</span>
                      </div>
                    </th>
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
                  {paginatedProjects.map((project) => {
                    const displayInfo = getProjectDisplayInfo(project);
                    return (
                      <tr
                        key={project.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedProjects.includes(project.id)}
                              onCheckedChange={(checked) => handleSelectProject(project.id, !!checked)}
                            />
                            <div>
                              <div className="font-medium">
                                {project.clientName}
                              </div>
                              <div className="text-sm text-muted-foreground md:hidden">
                                {project.address}
                              </div>
                            </div>
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 p-4 border-t bg-muted/30 rounded-b-lg">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <i className="ri-skip-back-line"></i>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <i className="ri-arrow-left-s-line"></i>
              </Button>
              <span className="px-3 py-1 bg-background border rounded text-sm min-w-[3rem] text-center">
                {currentPage}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <i className="ri-arrow-right-s-line"></i>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <i className="ri-skip-forward-line"></i>
              </Button>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20 ml-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      {isDialogOpen && selectedProject && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="dialog-content p-0 max-w-7xl w-[98vw] h-[95vh] flex flex-col overflow-hidden">
            <div className="fixed-header p-2 border-b border-cyan-400/30 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative flex-shrink-0">
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

            <div className="dialog-body bg-gray-900 flex-1 flex flex-col min-h-0">
              <div className="fixed-header p-4 pb-4 bg-gray-900 border-b-2 border-cyan-400/20 shadow-lg flex-shrink-0">
                <FuturisticTimeline
                  projectId={selectedProject.id}
                  currentProgress={
                    selectedProject.projectProgress || "estimate_created"
                  }
                  onProgressUpdate={(newProgress: string) => handleProgressUpdate(selectedProject.id, newProgress)}
                />
              </div>

              <div className="h-2 bg-gray-900 border-b border-gray-700/30 flex-shrink-0"></div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-4 pb-4 bg-gray-900 pt-4">
                  <div className="mb-4">
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

                  <div className="bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg backdrop-blur-sm shadow-2xl">
                    <div className="p-4">
                      {dashboardTab === "details" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 block mb-1">
                                Total Price:
                              </span>
                              <span className="text-cyan-200 font-medium">
                                ${selectedProject.totalPrice?.toLocaleString() || '0.00'}
                              </span>
                            </div>
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 block mb-1">
                                Status:
                              </span>
                              <span className="text-cyan-200 font-medium">
                                {getProgressLabel(selectedProject.projectProgress || selectedProject.status || 'estimate_created')}
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
                          {selectedProject.clientEmail && (
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 text-sm block mb-2">
                                Email:
                              </span>
                              <p className="text-gray-200 text-sm">
                                {selectedProject.clientEmail}
                              </p>
                            </div>
                          )}
                          {selectedProject.clientPhone && (
                            <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                              <span className="text-gray-400 text-sm block mb-2">
                                Phone:
                              </span>
                              <p className="text-gray-200 text-sm">
                                {selectedProject.clientPhone}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {dashboardTab === "documents" && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-cyan-300">Project Documents</h3>
                            <Button
                              size="sm"
                              className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/30"
                              onClick={() => document.getElementById('fileUpload')?.click()}
                            >
                              <i className="ri-upload-line mr-1"></i>
                              Upload File
                            </Button>
                            <input
                              id="fileUpload"
                              type="file"
                              multiple
                              accept="*/*"
                              className="hidden"
                              onChange={handleFileUpload}
                            />
                          </div>

                          {/* Documents List */}
                          <div className="space-y-3">
                            {selectedProject.documents && selectedProject.documents.length > 0 ? (
                              selectedProject.documents.map((doc: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded border border-gray-600/20">
                                  <div className="flex items-center space-x-3">
                                    <i className={`text-xl ${getFileIcon(doc.type)} text-cyan-400`}></i>
                                    <div>
                                      <p className="text-sm font-medium text-gray-200">{doc.name}</p>
                                      <p className="text-xs text-gray-400">
                                        {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-600/30"
                                      onClick={() => handleDownloadDocument(doc)}
                                    >
                                      <i className="ri-download-line text-xs"></i>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                    >
                                      <i className="ri-delete-bin-line text-xs"></i>
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 border-2 border-dashed border-gray-600/30 rounded-lg">
                                <i className="ri-folder-open-line text-4xl text-gray-400 mb-3 block"></i>
                                <p className="text-gray-400 mb-4">No documents uploaded yet</p>
                                <Button
                                  size="sm"
                                  className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/30"
                                  onClick={() => document.getElementById('fileUpload')?.click()}
                                >
                                  <i className="ri-upload-cloud-line mr-2"></i>
                                  Upload First Document
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Enhanced Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="ri-alert-line text-yellow-500"></i>
              Confirmar Acción
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              {confirmAction?.message}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmAction(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirmAction?.onConfirm();
                setShowConfirmDialog(false);
                setConfirmAction(null);
              }}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Projects;
