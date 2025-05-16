// Página de gestión de materiales e inventario con soporte para importación vía IA
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { uploadFile } from "@/lib/firebase";
import { db as firebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AIFileImport } from "@/components/materials/AIFileImport";
import { QuickbooksImport } from "@/components/materials/QuickbooksImport";
import { 
  FileSpreadsheet, 
  FileText,
  Link as LinkIcon, 
  Loader2,
  Package, 
  PackagePlus, 
  Plus,
  RefreshCw, 
  Search, 
  ShoppingCart,
  Tag, 
  Trash2, 
  Upload,
  Download,
  Calculator,
  X
} from "lucide-react";

// Definir interfaz para material
interface Material {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  price: number; // en centavos
  supplier?: string;
  supplierLink?: string;
  sku?: string;
  stock?: number;
  minStock?: number;
  projectId?: string;
  imageUrl?: string;
  fileUrls?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema para validación del formulario
const materialSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  category: z.string().min(1, { message: "Seleccione una categoría" }),
  description: z.string().optional(),
  unit: z.string().min(1, { message: "Seleccione una unidad de medida" }),
  price: z.coerce.number().min(0, { message: "El precio debe ser un número positivo" }),
  supplier: z.string().optional(),
  supplierLink: z.string().url({ message: "Debe ser una URL válida" }).optional().or(z.literal('')),
  sku: z.string().optional(),
  stock: z.coerce.number().min(0, { message: "El inventario debe ser un número positivo" }).optional(),
  minStock: z.coerce.number().min(0, { message: "El mínimo debe ser un número positivo" }).optional(),
  projectId: z.string().optional(),
  imageUrl: z.string().optional(),
  fileUrls: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

type MaterialFormValues = z.infer<typeof materialSchema>;

// Categorías predefinidas
const categories = [
  "Madera", 
  "Metal", 
  "Concreto", 
  "Herrería", 
  "Pintura", 
  "Cerradura", 
  "Cercas", 
  "Herramientas", 
  "Otro"
];

// Unidades de medida
const units = [
  "pieza", 
  "pie", 
  "metro", 
  "kg", 
  "lb", 
  "galón", 
  "litro", 
  "paquete", 
  "rollo", 
  "caja", 
  "otro"
];

export default function Materials() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAIImportDialogOpen, setIsAIImportDialogOpen] = useState(false);
  const [isQuickbooksImportDialogOpen, setIsQuickbooksImportDialogOpen] = useState(false);

  // Verificar resultado de redirección de QuickBooks
  useEffect(() => {
    console.log("Verificando resultado de redirección...");
    const queryParams = new URLSearchParams(window.location.search);
    const quickbooksParam = queryParams.get('quickbooks');

    if (quickbooksParam === 'connected') {
      // Si fue conectado exitosamente, mostrar mensaje y abrir diálogo de importación
      toast({
        title: "QuickBooks conectado",
        description: "Se ha conectado correctamente con tu cuenta de QuickBooks.",
        duration: 5000
      });

      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Abrir el diálogo de importación
      setTimeout(() => {
        setIsQuickbooksImportDialogOpen(true);
      }, 1000);
    } else if (quickbooksParam === 'error') {
      // Si hubo un error, mostrar mensaje
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con QuickBooks. Por favor, inténtelo de nuevo.",
        variant: "destructive",
        duration: 5000
      });

      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [csvContent, setCsvContent] = useState("");

  // Referencias para carga de archivos
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para manejar subida de archivos
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);

  // Configuración del formulario
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      unit: "",
      price: 0,
      supplier: "",
      supplierLink: "",
      sku: "",
      stock: 0,
      minStock: 0,
      projectId: "",
      imageUrl: "",
      fileUrls: [],
      tags: []
    }
  });

  // Función para manejar la selección de imagen
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para manejar la selección de archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Función para eliminar un archivo seleccionado
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Función para manejar la selección de CSV
  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Leer el contenido del archivo CSV
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  // Función para subir una imagen a Firebase Storage
  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    try {
      const imageUrl = await uploadFile(selectedImage, `user_materials/${currentUser?.uid}/images`);
      return imageUrl;
    } catch (error) {
      console.error("Error al subir imagen:", error);
      throw error;
    }
  };

  // Función para subir archivos a Firebase Storage
  const uploadFilesIfNeeded = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];

    try {
      const uploadPromises = selectedFiles.map(file => 
        uploadFile(file, `user_materials/${currentUser?.uid}/files`)
      );

      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error("Error al subir archivos:", error);
      throw error;
    }
  };

  // Esta sección se eliminó para evitar duplicación de funciones

  // Cargar materiales al inicio
  useEffect(() => {
    if (currentUser) {
      loadMaterials();
    }
  }, [currentUser]);

  // Filtrar materiales cuando cambie el filtro o término de búsqueda
  useEffect(() => {
    filterMaterials();
  }, [materials, searchTerm, categoryFilter]);

  // Función para cargar materiales
  const loadMaterials = async () => {
    try {
      setLoading(true);

      // Usar datos de muestra en desarrollo si es necesario
      const useSampleData = (process.env.NODE_ENV === 'development' && 
                             (!currentUser?.uid || currentUser.uid === 'dev-user-123'));

      if (useSampleData) {
        console.log("Usando datos de muestra para desarrollo");
        // Datos de ejemplo para desarrollo
        const sampleMaterials: Material[] = [
          {
            id: "sample1",
            name: "Poste de madera",
            category: "Madera",
            description: "Poste de madera tratada 4x4",
            unit: "pieza",
            price: 1599, // en centavos
            supplier: "Home Depot",
            sku: "HD-123",
            stock: 15,
            minStock: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "sample2",
            name: "Panel de vinilo",
            category: "Cercas",
            description: "Panel de vinilo blanco 6x8",
            unit: "pieza",
            price: 4599, // en centavos
            supplier: "Lowe's",
            sku: "LW-456",
            stock: 8,
            minStock: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "sample3",
            name: "Cemento para postes",
            category: "Concreto",
            description: "Bolsa de cemento para instalación de postes",
            unit: "bolsa",
            price: 799, // en centavos
            supplier: "Menards",
            sku: "MN-789",
            stock: 20,
            minStock: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        setMaterials(sampleMaterials);
        setLoading(false);
        return;
      }

      // Referencia a la colección de materiales del usuario
      const materialsRef = collection(firebaseDb, "user_materials");

      try {
        // Intentar primero con doble ordenamiento (puede fallar en algunas versiones de Firebase)
        const q = query(
          materialsRef,
          where("userId", "==", currentUser?.uid),
          orderBy("category"),
          orderBy("name")
        );

        const snapshot = await getDocs(q);
        processMaterialsSnapshot(snapshot);
      } catch (queryError) {
        console.warn("Error con ordenamiento múltiple, usando ordenamiento simple:", queryError);

        // Si falla el doble ordenamiento, intentar solo con where
        const simpleQuery = query(
          materialsRef,
          where("userId", "==", currentUser?.uid)
        );

        const snapshot = await getDocs(simpleQuery);
        processMaterialsSnapshot(snapshot);
      }
    } catch (error) {
      console.error("Error al cargar materiales:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales",
        variant: "destructive"
      });
      setLoading(false);

      // Si hay un error, cargar datos de muestra para mostrar la UI
      const fallbackMaterials: Material[] = [
        {
          id: "fallback1",
          name: "Poste de madera (muestra)",
          category: "Madera",
          description: "Datos de muestra - Error al cargar datos reales",
          unit: "pieza",
          price: 1599,
          stock: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "fallback2",
          name: "Panel de vinilo (muestra)",
          category: "Cercas",
          description: "Datos de muestra - Error al cargar datos reales",
          unit: "pieza",
          price: 4599,
          stock: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      setMaterials(fallbackMaterials);
    }
  };

  // Función para procesar los resultados de la consulta de materiales
  const processMaterialsSnapshot = (snapshot: any) => {
    try {
      // Convertir documentos a objetos Material
      const materialsData: Material[] = snapshot.docs.map((doc: any) => {
        const data = doc.data();

        // Verificar datos mínimos requeridos y aplicar valores predeterminados
        if (!data.name || !data.category || !data.unit) {
          console.warn(`Material ${doc.id} tiene datos incompletos:`, data);
        }

        return {
          id: doc.id,
          name: data.name || "Sin nombre",
          category: data.category || "Otro",
          description: data.description || "",
          unit: data.unit || "pieza",
          price: typeof data.price === 'number' ? data.price : 0,
          supplier: data.supplier || "",
          supplierLink: data.supplierLink || "",
          sku: data.sku || "",
          stock: typeof data.stock === 'number' ? data.stock : 0,
          minStock: typeof data.minStock === 'number' ? data.minStock : 0,
          projectId: data.projectId || "",
          imageUrl: data.imageUrl || "",
          fileUrls: Array.isArray(data.fileUrls) ? data.fileUrls : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });

      // Ordenar materiales por categoría y nombre
      materialsData.sort((a, b) => {
        if (a.category === b.category) {
          return a.name.localeCompare(b.name);
        }
        return a.category.localeCompare(b.category);
      });

      console.log(`Cargados ${materialsData.length} materiales`);
      setMaterials(materialsData);
    } catch (processError) {
      console.error("Error al procesar resultados:", processError);
      throw processError;
    } finally {
      setLoading(false);
    }
  };

  // Filtrar materiales según criterios
  const filterMaterials = () => {
    let filtered = [...materials];

    // Filtrar por categoría
    if (categoryFilter !== "all") {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(term) || 
        m.description?.toLowerCase().includes(term) ||
        m.supplier?.toLowerCase().includes(term) ||
        m.sku?.toLowerCase().includes(term) ||
        m.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredMaterials(filtered);
  };

  // Guardar material (crear o actualizar)
  const saveMaterial = async (data: MaterialFormValues) => {
    try {
      if (!currentUser) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para guardar materiales",
          variant: "destructive"
        });
        return;
      }

      setIsUploading(true);

      // Subir imagen y archivos si es necesario
      let imageUrl = data.imageUrl || null;
      let fileUrls: string[] = data.fileUrls || [];

      try {
        if (selectedImage) {
          const uploadedImageUrl = await uploadImageIfNeeded();
          if (uploadedImageUrl) {
            imageUrl = uploadedImageUrl;
          }
        }

        if (selectedFiles.length > 0) {
          const uploadedFileUrls = await uploadFilesIfNeeded();
          fileUrls = [...fileUrls, ...uploadedFileUrls];
        }
      } catch (error) {
        console.error("Error al subir archivos:", error);
        toast({
          title: "Error",
          description: "No se pudieron subir los archivos adjuntos",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Preparar datos para guardar
      const materialData: any = {
        ...data,
        userId: currentUser.uid,
        price: Math.round(data.price * 100), // Convertir a centavos
        imageUrl,
        fileUrls,
        updatedAt: Timestamp.now()
      };

      if (isEditMode && currentMaterial) {
        // Actualizar material existente
        const materialRef = doc(firebaseDb, "user_materials", currentMaterial.id);
        await updateDoc(materialRef, materialData);

        toast({
          title: "Material actualizado",
          description: `${data.name} ha sido actualizado correctamente`
        });
      } else {
        // Crear nuevo material
        materialData.createdAt = Timestamp.now();
        await addDoc(collection(firebaseDb, "user_materials"), materialData);

        toast({
          title: "Material agregado",
          description: `${data.name} ha sido agregado correctamente`
        });
      }

      // Resetear formulario y cerrar diálogo
      form.reset();
      setIsAddDialogOpen(false);
      setIsEditMode(false);
      setCurrentMaterial(null);

      // Limpiar estado de archivos
      setSelectedImage(null);
      setSelectedFiles([]);
      setImagePreview(null);
      setUploadedFileUrls([]);

      // Recargar materiales
      loadMaterials();
    } catch (error) {
      console.error("Error al guardar material:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el material",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Eliminar material
  const deleteMaterial = async (id: string, name: string) => {
    try {
      if (confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
        const materialRef = doc(firebaseDb, "user_materials", id);
        await deleteDoc(materialRef);

        toast({
          title: "Material eliminado",
          description: `${name} ha sido eliminado correctamente`
        });

        // Recargar materiales
        loadMaterials();
      }
    } catch (error) {
      console.error("Error al eliminar material:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el material",
        variant: "destructive"
      });
    }
  };

  // Abrir diálogo para editar material
  const openEditDialog = (material: Material) => {
    setCurrentMaterial(material);
    setIsEditMode(true);

    // Si hay una imagen, mostrar la previsualización
    if (material.imageUrl) {
      setImagePreview(material.imageUrl);
    }

    // Si hay archivos adjuntos, actualizar la lista
    if (material.fileUrls && material.fileUrls.length > 0) {
      setUploadedFileUrls(material.fileUrls);
    }

    // Llenar formulario con datos del material
    form.reset({
      name: material.name,
      category: material.category,
      description: material.description || "",
      unit: material.unit,
      price: material.price / 100, // Convertir de centavos
      supplier: material.supplier || "",
      supplierLink: material.supplierLink || "",
      sku: material.sku || "",
      stock: material.stock || 0,
      minStock: material.minStock || 0,
      projectId: material.projectId || "",
      imageUrl: material.imageUrl || "",
      fileUrls: material.fileUrls || [],
      tags: material.tags || []
    });

    setIsAddDialogOpen(true);
  };

  // Manejador para materiales procesados con IA
  const handleAIProcessedMaterials = (materials: any[]) => {
    if (!materials || materials.length === 0) {
      toast({
        title: "Sin datos",
        description: "No se detectaron materiales válidos en el archivo importado",
        variant: "destructive"
      });
      return;
    }

    // Formatear los materiales para asegurar que tienen la estructura correcta
    const formattedMaterials = materials.map(material => ({
      name: material.name || "Sin nombre",
      category: material.category || "General",
      description: material.description || "",
      unit: material.unit || "pieza",
      price: typeof material.price === 'number' ? material.price : parseFloat(material.price) || 0,
      supplier: material.supplier || "",
      supplierLink: material.supplierLink || "",
      sku: material.sku || "",
      stock: typeof material.stock === 'number' ? material.stock : parseFloat(material.stock) || 0,
      minStock: typeof material.minStock === 'number' ? material.minStock : parseFloat(material.minStock) || 0
    }));

    // Actualizar el estado
    setMaterials(prevMaterials => [...prevMaterials, ...formattedMaterials]);

    // Guardar en Firebase
    saveProcessedMaterialsToFirebase(formattedMaterials);

    // Mostrar mensaje de éxito con detalles
    toast({
      title: "Materiales importados",
      description: `Se agregaron ${formattedMaterials.length} materiales a tu inventario`,
    });
  };

  // Función para guardar materiales procesados a Firebase
  const saveProcessedMaterialsToFirebase = async (materials: any[]) => {
    if (!materials || materials.length === 0) return;

    try {
      let savedCount = 0;
      let errorCount = 0;

      // Crear batch para operaciones en lote (máximo 500 operaciones por batch)
      const batchSize = 450; // Firebase tiene un límite de 500 operaciones por batch
      const totalBatches = Math.ceil(materials.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = writeBatch(firebaseDb);
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, materials.length);
        const batchMaterials = materials.slice(start, end);

        // Procesar cada material en este batch
        batchMaterials.forEach(material => {
          try {
            if (!material.name) return; // Saltar materiales sin nombre

            const materialRef = doc(collection(firebaseDb, "user_materials"));
            batch.set(materialRef, {
              name: material.name,
              category: material.category || "General",
              description: material.description || "",
              unit: material.unit || "pieza",
              price: typeof material.price === 'number' ? material.price : parseFloat(material.price) || 0,
              supplier: material.supplier || "",
              supplierLink: material.supplierLink || "",
              sku: material.sku || "",
              stock: typeof material.stock === 'number' ? material.stock : parseFloat(material.stock) || 0,
              minStock: typeof material.minStock === 'number' ? material.minStock : parseFloat(material.minStock) || 0,
              userId: currentUser?.uid || 'dev-user',
              createdAt: serverTimestamp()
            });

            savedCount++;
          } catch (itemError) {
            console.error("Error al procesar material individual:", itemError);
            errorCount++;
          }
        });

        // Ejecutar este batch
        await batch.commit();
        console.log(`Batch ${i+1}/${totalBatches} completado: ${batchMaterials.length} materiales`);
      }

      if (savedCount > 0) {
        toast({
          title: "Materiales guardados",
          description: `Se guardaron ${savedCount} materiales correctamente${errorCount > 0 ? ` (${errorCount} con errores)` : ''}`
        });

        // Recargar la lista de materiales
        loadMaterials();
      } else if (errorCount > 0) {
        toast({
          title: "Error al guardar",
          description: `No se pudo guardar ningún material (${errorCount} errores)`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al guardar materiales en Firebase:", error);
      toast({
        title: "Error en la base de datos",
        description: "Ocurrió un error al intentar guardar los materiales",
        variant: "destructive"
      });
    }
  };

  // Manejar materiales importados desde QuickBooks
  const handleQuickbooksImportedMaterials = async (materials: any[]) => {
    try {
      if (!materials || materials.length === 0) {
        toast({
          title: "Error",
          description: "No se seleccionaron materiales para importar",
          variant: "destructive"
        });
        return;
      }

      // Mostrar un indicador de carga
      setIsUploading(true);

      // Crear un documento para cada material
      const promises = materials.map(material => {
        const materialData = {
          ...material,
          userId: currentUser?.uid,
          price: typeof material.price === 'number' ? Math.round(material.price * 100) : 0, // Convertir a centavos
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        return addDoc(collection(firebaseDb, "user_materials"), materialData);
      });

      await Promise.all(promises);

      toast({
        title: "Importación desde QuickBooks exitosa",
        description: `Se importaron ${materials.length} materiales correctamente`
      });

      // Recargar materiales
      loadMaterials();
    } catch (error) {
      console.error("Error al importar materiales desde QuickBooks:", error);
      toast({
        title: "Error",
        description: "No se pudieron importar los materiales desde QuickBooks",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Importar materiales desde CSV (método tradicional)
  const importFromCsv = async () => {
    try {
      if (!csvContent) {
        toast({
          title: "Error",
          description: "El contenido CSV está vacío",
          variant: "destructive"
        });
        return;
      }

      // Reemplazar diferentes tipos de saltos de línea y manejar posibles errores de formato
      let normalizedContent = csvContent.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedContent.split('\n');

      console.log("Procesando CSV con", lines.length, "líneas");

      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "Formato CSV inválido - se necesitan al menos dos líneas",
          variant: "destructive"
        });
        return;
      }

      // La primera línea debe ser el encabezado
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      console.log("Encabezados detectados:", headers);

      // Índices para campos requeridos (con verificación de varios formatos posibles)
      const nameIndex = headers.indexOf('nombre') !== -1 ? headers.indexOf('nombre') : headers.indexOf('name');
      const categoryIndex = headers.indexOf('categoria') !== -1 ? headers.indexOf('categoria') : headers.indexOf('category');
      const unitIndex = headers.indexOf('unidad') !== -1 ? headers.indexOf('unidad') : headers.indexOf('unit');
      const priceIndex = headers.indexOf('precio') !== -1 ? headers.indexOf('precio') : headers.indexOf('price');

      if (nameIndex === -1 || categoryIndex === -1 || unitIndex === -1 || priceIndex === -1) {
        toast({
          title: "Error",
          description: "El CSV debe contener las columnas: nombre/name, categoria/category, unidad/unit, precio/price",
          variant: "destructive"
        });
        return;
      }

      // Mostrar indicador de progreso
      setIsUploading(true);

      // Procesar cada línea
      let importCount = 0;
      let errorLines = 0;
      let promises = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Saltar líneas vacías

        try {
          const values = lines[i].split(',').map(v => v.trim());

          // Verificar si hay suficientes columnas
          if (values.length < Math.max(nameIndex, categoryIndex, unitIndex, priceIndex) + 1) {
            console.warn(`Línea ${i} no tiene suficientes columnas, saltando`);
            errorLines++;
            continue;
          }

          // Obtener valores
          const name = values[nameIndex];
          const category = values[categoryIndex];
          const unit = values[unitIndex];
          const priceStr = values[priceIndex];

          if (!name || !category || !unit || !priceStr) {
            console.warn(`Línea ${i} tiene campos requeridos vacíos, saltando`);
            errorLines++;
            continue;
          }

          // Convertir precio a centavos
          let price = 0;
          try {
            // Limpiar el precio de simbolos $ y convertir a número
            const cleanPrice = priceStr.replace(/[$,]/g, '');
            price = Math.round(parseFloat(cleanPrice) * 100);
            if (isNaN(price)) {
              console.warn(`Línea ${i} tiene un precio inválido: ${priceStr}, estableciendo a 0`);
              price = 0;
            }
          } catch (e) {
            console.warn(`Error al convertir precio en línea ${i}: ${priceStr}`, e);
            price = 0;
          }

          // Crear material
          const materialData: any = {
            userId: currentUser?.uid,
            name,
            category,
            unit,
            price,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };

          // Agregar campos opcionales si existen en el CSV
          const descIndex = headers.indexOf('descripcion') !== -1 ? 
            headers.indexOf('descripcion') : headers.indexOf('description');
          if (descIndex !== -1 && values[descIndex]) {
            materialData.description = values[descIndex];
          }

          const supplierIndex = headers.indexOf('proveedor') !== -1 ?
            headers.indexOf('proveedor') : headers.indexOf('supplier');
          if (supplierIndex !== -1 && values[supplierIndex]) {
            materialData.supplier = values[supplierIndex];
          }

          const skuIndex = headers.indexOf('sku') !== -1 ?
            headers.indexOf('sku') : headers.indexOf('code');
          if (skuIndex !== -1 && values[skuIndex]) {
            materialData.sku = values[skuIndex];
          }

          // Completar datos del material
          materialData.userId = currentUser.uid;
          materialData.createdAt = serverTimestamp();
          materialData.updatedAt = serverTimestamp();
          
          return materialData;
        }));
        
        // Guardar materiales en Firebase usando batch
        await saveProcessedMaterialsToFirebase(processedMaterials);
        
        // Actualizar el estado de los materiales en el frontend
        setMaterials(prevMaterials => [...prevMaterials, ...processedMaterials]);
        
        toast({
          title: "Importación exitosa",
          description: `Se han importado ${processedMaterials.length} materiales desde CSV.`
        });
        
        setIsUploading(false);