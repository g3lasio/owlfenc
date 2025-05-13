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
  Timestamp 
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
      
      // Referencia a la colección de materiales del usuario
      const materialsRef = collection(firebaseDb, "user_materials");
      const q = query(
        materialsRef,
        where("userId", "==", currentUser?.uid),
        orderBy("category"),
        orderBy("name")
      );
      
      const snapshot = await getDocs(q);
      
      // Convertir documentos a objetos Material
      const materialsData: Material[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          description: data.description,
          unit: data.unit,
          price: data.price,
          supplier: data.supplier,
          supplierLink: data.supplierLink,
          sku: data.sku,
          stock: data.stock,
          minStock: data.minStock,
          projectId: data.projectId,
          imageUrl: data.imageUrl,
          fileUrls: data.fileUrls,
          tags: data.tags,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
      
      setMaterials(materialsData);
    } catch (error) {
      console.error("Error al cargar materiales:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales",
        variant: "destructive"
      });
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

  // Manejar materiales procesados por IA
  const handleAIProcessedMaterials = async (materials: any[]) => {
    try {
      if (!materials || materials.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron materiales válidos en el archivo",
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
        title: "Materiales importados",
        description: `Se importaron ${materials.length} materiales correctamente`
      });
      
      // Recargar materiales
      loadMaterials();
    } catch (error) {
      console.error("Error al importar materiales:", error);
      toast({
        title: "Error",
        description: "No se pudieron importar los materiales",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
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
      
      const lines = csvContent.split('\\n');
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "Formato CSV inválido",
          variant: "destructive"
        });
        return;
      }
      
      // La primera línea debe ser el encabezado
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Índices para campos requeridos
      const nameIndex = headers.indexOf('nombre');
      const categoryIndex = headers.indexOf('categoria');
      const unitIndex = headers.indexOf('unidad');
      const priceIndex = headers.indexOf('precio');
      
      if (nameIndex === -1 || categoryIndex === -1 || unitIndex === -1 || priceIndex === -1) {
        toast({
          title: "Error",
          description: "El CSV debe contener las columnas: nombre, categoria, unidad, precio",
          variant: "destructive"
        });
        return;
      }
      
      // Procesar cada línea
      let importCount = 0;
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Saltar líneas vacías
        
        const values = lines[i].split(',').map(v => v.trim());
        
        // Obtener valores
        const name = values[nameIndex];
        const category = values[categoryIndex];
        const unit = values[unitIndex];
        const priceStr = values[priceIndex];
        
        if (!name || !category || !unit || !priceStr) continue;
        
        // Convertir precio a centavos
        const price = Math.round(parseFloat(priceStr) * 100);
        
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
        const descIndex = headers.indexOf('descripcion');
        if (descIndex !== -1 && values[descIndex]) {
          materialData.description = values[descIndex];
        }
        
        const supplierIndex = headers.indexOf('proveedor');
        if (supplierIndex !== -1 && values[supplierIndex]) {
          materialData.supplier = values[supplierIndex];
        }
        
        const skuIndex = headers.indexOf('sku');
        if (skuIndex !== -1 && values[skuIndex]) {
          materialData.sku = values[skuIndex];
        }
        
        // Guardar en Firebase
        await addDoc(collection(firebaseDb, "user_materials"), materialData);
        importCount++;
      }
      
      // Mostrar mensaje de éxito
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${importCount} materiales correctamente`
      });
      
      // Cerrar diálogo y recargar
      setIsImportDialogOpen(false);
      setCsvContent("");
      loadMaterials();
    } catch (error) {
      console.error("Error al importar CSV:", error);
      toast({
        title: "Error",
        description: "No se pudieron importar los materiales",
        variant: "destructive"
      });
    }
  };

  // Formatear precio para mostrar
  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  // Renderizar contenido de la página
  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">My Inventory</CardTitle>
              <CardDescription>
                Gestiona tu inventario de materiales y suministros para tus proyectos
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={() => loadMaterials()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsAIImportDialogOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar con IA
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsQuickbooksImportDialogOpen(true)}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Desde QuickBooks
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
              <Button 
                onClick={() => {
                  setIsEditMode(false);
                  form.reset({
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
                    projectId: ""
                  });
                  setIsAddDialogOpen(true);
                }}
              >
                <PackagePlus className="h-4 w-4 mr-2" />
                Agregar Material
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Lista de Materiales</TabsTrigger>
              <TabsTrigger value="inventory">Inventario</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar material..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select 
                value={categoryFilter} 
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <TabsContent value="list" className="space-y-4">
              {loading ? (
                // Skeleton para carga
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredMaterials.length > 0 ? (
                <Table>
                  <TableCaption>Lista de materiales ({filteredMaterials.length})</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{material.category}</Badge>
                        </TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell>{formatPrice(material.price)}</TableCell>
                        <TableCell>
                          {material.supplier}
                          {material.supplierLink && (
                            <a 
                              href={material.supplierLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 inline-block text-primary hover:text-primary/80"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          {material.stock !== undefined ? material.stock : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditDialog(material)}
                            >
                              Editar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteMaterial(material.id, material.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No hay materiales</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'No se encontraron materiales con esos filtros' 
                      : 'Agrega tu primer material para comenzar'}
                  </p>
                  {searchTerm || categoryFilter !== 'all' ? (
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  ) : (
                    <Button 
                      className="mt-4" 
                      onClick={() => {
                        setIsEditMode(false);
                        form.reset();
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <PackagePlus className="h-4 w-4 mr-2" />
                      Agregar Material
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="inventory" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  // Skeleton para carga
                  [...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-3/4" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredMaterials.length > 0 ? (
                  filteredMaterials.map((material) => (
                    <Card key={material.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                          {material.name}
                          <Badge variant="outline">{material.category}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{formatPrice(material.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Unidad:</span>
                            <span>{material.unit}</span>
                          </div>
                          {material.stock !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Inventario:</span>
                              <span 
                                className={material.minStock !== undefined && material.stock < material.minStock 
                                  ? "text-destructive font-medium" 
                                  : ""
                                }
                              >
                                {material.stock} {material.unit}
                                {material.minStock !== undefined && material.stock < material.minStock && 
                                  " (Bajo inventario)"}
                              </span>
                            </div>
                          )}
                          {material.supplier && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Proveedor:</span>
                              <span>
                                {material.supplier}
                                {material.supplierLink && (
                                  <a 
                                    href={material.supplierLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-2 inline-block text-primary hover:text-primary/80"
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </a>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditDialog(material)}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteMaterial(material.id, material.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No hay materiales</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || categoryFilter !== 'all' 
                        ? 'No se encontraron materiales con esos filtros' 
                        : 'Agrega tu primer material para comenzar'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Diálogo para agregar/editar material */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Material" : "Agregar Nuevo Material"}</DialogTitle>
            <DialogDescription>
              Completa los detalles del material. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(saveMaterial)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe el material..." 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de medida *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar unidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Precio por unidad
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Home Depot, Lowe's, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="supplierLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enlace de compra</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU / Código</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock actual</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock mínimo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Sección para subir imagen del producto */}
              <div className="border rounded-md p-4 space-y-4 mt-4">
                <h3 className="font-medium">Imagen del producto</h3>
                
                {/* Previsualización de imagen */}
                {imagePreview && (
                  <div className="relative w-40 h-40 mx-auto mb-2">
                    <img 
                      src={imagePreview}
                      alt="Vista previa"
                      className="object-cover w-full h-full rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Selector de imagen */}
                {!imagePreview && (
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-40 h-40 border-dashed flex flex-col gap-2"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8" />
                      <span>Subir imagen</span>
                    </Button>
                    <input
                      type="file"
                      ref={imageInputRef}
                      className="hidden"
                      onChange={handleImageSelect}
                      accept="image/*"
                    />
                  </div>
                )}
              </div>
              
              {/* Sección para archivos adjuntos */}
              <div className="border rounded-md p-4 space-y-4 mt-4">
                <h3 className="font-medium">Archivos adjuntos</h3>
                
                {/* Lista de archivos seleccionados */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeSelectedFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Lista de archivos ya subidos (en edición) */}
                {uploadedFileUrls.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFileUrls.map((url, index) => {
                      // Extraer nombre del archivo de la URL
                      const fileName = url.split('/').pop() || `Archivo ${index + 1}`;
                      const decodedFileName = decodeURIComponent(
                        fileName.split('_').slice(1).join('_')
                      );
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm truncate text-blue-600 hover:underline"
                            >
                              {decodedFileName}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Botón para agregar archivos */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar archivo
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                />
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <span className="mr-2">Subiendo archivos...</span>
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? "Actualizar Material" : "Guardar Material"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para importar CSV */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importar Materiales</DialogTitle>
            <DialogDescription>
              Puedes importar múltiples materiales desde un archivo CSV. El formato debe incluir las columnas: nombre, categoria, unidad, precio.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-center items-center border-2 border-dashed border-primary/20 rounded-md p-4">
              <div className="text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Copia y pega el contenido de tu archivo CSV aquí
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mb-4"
                  onClick={() => {
                    // Descargar plantilla de ejemplo
                    const template = 'nombre,categoria,unidad,precio,descripcion,proveedor,sku\nPoste de madera,Madera,pieza,15.99,Poste tratado de 4x4,Home Depot,HD-123\nPanel de vinilo,Cercas,pieza,45.25,Panel de vinilo blanco 6x8,Lowe\'s,LW-456';
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'plantilla_materiales.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar plantilla
                </Button>
                <Textarea 
                  className="min-h-[150px]" 
                  placeholder="nombre,categoria,unidad,precio,descripcion,proveedor,sku..."
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={importFromCsv}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Materiales
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Componente de importación con IA */}
      <AIFileImport 
        isOpen={isAIImportDialogOpen}
        onOpenChange={setIsAIImportDialogOpen}
        onMaterialsProcessed={handleAIProcessedMaterials}
      />
      
      {/* Componente de importación desde QuickBooks */}
      <QuickbooksImport
        isOpen={isQuickbooksImportDialogOpen}
        onOpenChange={setIsQuickbooksImportDialogOpen}
        onMaterialsImported={handleQuickbooksImportedMaterials}
      />
    </div>
  );
}