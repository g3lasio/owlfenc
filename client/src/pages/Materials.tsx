import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, FileUp, Plus, Search, Trash } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '../components/layout/AppLayout';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import Papa from 'papaparse';
import { analyzeCSVWithAnthropic } from '../services/anthropicService';

// Definir interfaz para Material
interface Material {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  supplier?: string;
  supplierLink?: string;
  sku?: string;
  createdAt: any;
  updatedAt: any;
  userId: string;
}

// Categorías comunes de materiales
const COMMON_CATEGORIES = [
  'Madera',
  'Metal',
  'Cercas',
  'Concreto',
  'Tornillería',
  'Herramientas',
  'Acabados',
  'Otro'
];

// Unidades comunes de medida
const COMMON_UNITS = [
  'pieza',
  'metro',
  'pie',
  'kg',
  'lb',
  'galón',
  'litro',
  'bolsa',
  'caja',
  'par',
  'juego'
];

/**
 * Componente principal para la gestión de materiales
 */
export default function Materials() {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    name: '',
    category: '',
    description: '',
    unit: 'pieza',
    price: 0,
    supplier: '',
    supplierLink: '',
    sku: ''
  });
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  const [, navigate] = useLocation();

  // Comprobar autenticación y cargar materiales al montar
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadMaterials();
  }, [currentUser, navigate]);

  // Filtrar materiales cuando cambia el término de búsqueda o la categoría
  useEffect(() => {
    filterMaterials();
  }, [materials, searchTerm, selectedCategory]);

  /**
   * Cargar materiales desde Firestore
   */
  const loadMaterials = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      const materialsData: Material[] = [];
      const categoriesSet = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Material, 'id'>;
        const material: Material = {
          id: doc.id,
          ...data,
          price: typeof data.price === 'number' ? data.price : 0
        };
        
        materialsData.push(material);
        
        // Guardar categoría para filtrado
        if (data.category) {
          categoriesSet.add(data.category);
        }
      });

      // Ordenar materiales por nombre
      materialsData.sort((a, b) => a.name.localeCompare(b.name));
      
      // Actualizar estados
      setMaterials(materialsData);
      setCategories(Array.from(categoriesSet));
      
      console.log(`Cargados ${materialsData.length} materiales`);
    } catch (error) {
      console.error('Error al cargar materiales:', error);
      toast({
        title: "Error al cargar materiales",
        description: "No se pudieron cargar los materiales. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filtrar materiales según término de búsqueda y categoría seleccionada
   */
  const filterMaterials = () => {
    let filtered = [...materials];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(term) || 
        m.description?.toLowerCase().includes(term) || 
        m.sku?.toLowerCase().includes(term) || 
        m.supplier?.toLowerCase().includes(term)
      );
    }
    
    // Filtrar por categoría seleccionada
    if (selectedCategory && selectedCategory !== 'todas') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }
    
    setFilteredMaterials(filtered);
  };

  /**
   * Guardar un nuevo material
   */
  const saveMaterial = async () => {
    if (!currentUser) return;
    
    try {
      // Verificar campos obligatorios
      if (!newMaterial.name || !newMaterial.category || !newMaterial.unit) {
        toast({
          title: "Datos incompletos",
          description: "Por favor, completa los campos obligatorios: Nombre, Categoría y Unidad.",
          variant: "destructive"
        });
        return;
      }
      
      // Convertir el precio a número
      const price = typeof newMaterial.price === 'number' ? newMaterial.price : 
                    parseFloat(String(newMaterial.price || '0')) || 0;
                    
      // Crear documento en Firestore
      const materialData = {
        ...newMaterial,
        price,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'materials'), materialData);
      
      // Actualizar la lista de materiales
      const newMaterialWithId: Material = {
        id: docRef.id,
        ...materialData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Material;
      
      setMaterials(prev => [...prev, newMaterialWithId]);
      
      // Limpiar formulario
      setNewMaterial({
        name: '',
        category: '',
        description: '',
        unit: 'pieza',
        price: 0,
        supplier: '',
        supplierLink: '',
        sku: ''
      });
      
      setShowAddDialog(false);
      
      toast({
        title: "Material agregado",
        description: `Se ha agregado el material "${newMaterial.name}" correctamente.`
      });
    } catch (error) {
      console.error('Error al guardar material:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el material. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  /**
   * Actualizar un material existente
   */
  const updateMaterial = async () => {
    if (!currentUser || !editingMaterial) return;
    
    try {
      // Verificar campos obligatorios
      if (!editingMaterial.name || !editingMaterial.category || !editingMaterial.unit) {
        toast({
          title: "Datos incompletos",
          description: "Por favor, completa los campos obligatorios: Nombre, Categoría y Unidad.",
          variant: "destructive"
        });
        return;
      }
      
      // Convertir valores numéricos
      const materialData = {
        ...editingMaterial,
        price: typeof editingMaterial.price === 'number' ? editingMaterial.price : 
               parseFloat(String(editingMaterial.price || '0')) || 0,
        updatedAt: serverTimestamp()
      };
      
      // Actualizar documento en Firestore
      const materialRef = doc(db, 'materials', editingMaterial.id);
      await updateDoc(materialRef, materialData);
      
      // Actualizar la lista de materiales
      setMaterials(prev => prev.map(m => 
        m.id === editingMaterial.id ? {...materialData, id: m.id} as Material : m
      ));
      
      setShowEditDialog(false);
      
      toast({
        title: "Material actualizado",
        description: `Se ha actualizado el material "${editingMaterial.name}" correctamente.`
      });
    } catch (error) {
      console.error('Error al actualizar material:', error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el material. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  /**
   * Eliminar un material
   */
  const deleteMaterial = async () => {
    if (!currentUser || !deletingMaterial) return;
    
    try {
      // Eliminar documento de Firestore
      const materialRef = doc(db, 'materials', deletingMaterial.id);
      await deleteDoc(materialRef);
      
      // Actualizar la lista de materiales
      setMaterials(prev => prev.filter(m => m.id !== deletingMaterial.id));
      
      setShowDeleteDialog(false);
      
      toast({
        title: "Material eliminado",
        description: `Se ha eliminado el material "${deletingMaterial.name}" correctamente.`
      });
    } catch (error) {
      console.error('Error al eliminar material:', error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el material. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  /**
   * Manejar selección de material individual
   */
  const toggleMaterialSelection = (materialId: string) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  /**
   * Seleccionar todos los materiales visibles
   */
  const toggleSelectAll = () => {
    if (selectedMaterials.size === filteredMaterials.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedMaterials(new Set());
    } else {
      // Seleccionar todos los materiales visibles
      setSelectedMaterials(new Set(filteredMaterials.map(m => m.id)));
    }
  };

  /**
   * Eliminar materiales seleccionados en lote
   */
  const deleteBatchMaterials = async () => {
    if (!currentUser || selectedMaterials.size === 0) return;
    
    try {
      const materialsToDelete = Array.from(selectedMaterials);
      const deletePromises = materialsToDelete.map(materialId => {
        const materialRef = doc(db, 'materials', materialId);
        return deleteDoc(materialRef);
      });
      
      await Promise.all(deletePromises);
      
      // Actualizar la lista de materiales
      setMaterials(prev => prev.filter(m => !selectedMaterials.has(m.id)));
      
      // Limpiar selección
      setSelectedMaterials(new Set());
      setShowBatchDeleteDialog(false);
      
      toast({
        title: "Materiales eliminados",
        description: `Se han eliminado ${materialsToDelete.length} materiales correctamente.`
      });
    } catch (error) {
      console.error('Error al eliminar materiales:', error);
      toast({
        title: "Error al eliminar",
        description: "No se pudieron eliminar algunos materiales. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  /**
   * Manejar la subida de un archivo CSV
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) {
      return;
    }

    setIsUploading(true);

    try {
      // Leer el archivo como texto
      const fileText = await readFileAsText(file);
      
      let processedMaterials: Partial<Material>[] = [];
      
      try {
        // Intentar procesar el CSV con Claude
        processedMaterials = await analyzeCSVWithAnthropic(fileText) as Partial<Material>[];
        console.log('Procesamiento con Anthropic exitoso:', processedMaterials);
      } catch (aiError) {
        console.warn('Error al procesar con Anthropic, usando procesamiento fallback:', aiError);
        
        // Procesamiento fallback con PapaParse si Claude falla
        const parseResult = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
          Papa.parse(fileText, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject
          });
        });
        
        if (parseResult.errors.length > 0) {
          console.warn('Errores en CSV:', parseResult.errors);
        }
        
        processedMaterials = parseResult.data.map(row => ({
          name: row.name || row.Name || row.nombre || row.Nombre || row.NOMBRE || '',
          category: row.category || row.Category || row.categoría || row.Categoría || row.CATEGORIA || '',
          description: row.description || row.Description || row.descripción || row.Descripción || '',
          unit: row.unit || row.Unit || row.unidad || row.Unidad || 'pieza',
          price: parseFloat(row.price || row.Price || row.precio || row.Precio || '0') || 0,
          supplier: row.supplier || row.Supplier || row.proveedor || row.Proveedor || '',
          supplierLink: row.supplierLink || row.SupplierLink || row['Supplier Link'] || '',
          sku: row.sku || row.SKU || row.código || row.Código || ''
        })).filter(m => m.name && m.name.trim() !== '');
      }
      
      if (processedMaterials.length === 0) {
        toast({
          title: "Sin materiales",
          description: "No se encontraron materiales válidos en el archivo CSV.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }
      
      // Guardar materiales en Firebase
      const batch: Material[] = [];
      for (const material of processedMaterials) {
        const materialData = {
          ...material,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        try {
          const docRef = await addDoc(collection(db, 'materials'), materialData);
          batch.push({
            id: docRef.id,
            ...materialData,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Material);
        } catch (error) {
          console.error('Error al guardar material:', error);
        }
      }
      
      // Actualizar estado con nuevos materiales
      setMaterials(prev => [...prev, ...batch]);
      
      toast({
        title: "Importación exitosa",
        description: `Se han importado ${batch.length} materiales desde CSV.`
      });
    } catch (error) {
      console.error('Error al procesar archivo CSV:', error);
      toast({
        title: "Error en importación",
        description: "No se pudo procesar el archivo CSV. Verifica el formato e inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Limpiar el campo de archivo para permitir subir el mismo archivo nuevamente
      event.target.value = '';
    }
  };

  /**
   * Leer un archivo como texto
   */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  /**
   * Formatear precio para mostrar
   */
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  /**
   * Abrir diálogo de edición con datos del material
   */
  const openEditDialog = (material: Material) => {
    setEditingMaterial({...material});
    setShowEditDialog(true);
  };

  /**
   * Abrir diálogo de confirmación de eliminación
   */
  const openDeleteDialog = (material: Material) => {
    setDeletingMaterial(material);
    setShowDeleteDialog(true);
  };

  /**
   * Renderizar la tabla de materiales
   */
  const renderMaterialsTable = () => {
    return (
      <div className="space-y-4">
        {/* Vista de tabla para pantallas grandes */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedMaterials.size === filteredMaterials.length && filteredMaterials.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedMaterials.has(material.id)}
                      onCheckedChange={() => toggleMaterialSelection(material.id)}
                      aria-label={`Seleccionar ${material.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{material.name}</div>
                      {material.description && (
                        <div className="text-sm text-muted-foreground">{material.description}</div>
                      )}
                      {material.sku && (
                        <div className="text-xs text-muted-foreground">SKU: {material.sku}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {material.category}
                    </span>
                  </TableCell>
                  <TableCell>{material.unit}</TableCell>
                  <TableCell>{formatPrice(material.price)}</TableCell>
                  <TableCell>
                    {material.supplier && (
                      <div className="text-sm">
                        {material.supplierLink ? (
                          <a
                            href={material.supplierLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {material.supplier}
                          </a>
                        ) : (
                          material.supplier
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(material)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(material)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Vista de tarjetas para móviles */}
        <div className="md:hidden space-y-4">
          {filteredMaterials.map((material) => (
            <Card key={material.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox 
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => toggleMaterialSelection(material.id)}
                        aria-label={`Seleccionar ${material.name}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{material.name}</h3>
                        {material.description && (
                          <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                        )}
                        {material.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {material.sku}</p>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {material.category}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Precio</span>
                      <span className="font-medium">{formatPrice(material.price)}</span>
                      <span className="text-muted-foreground ml-1">por {material.unit}</span>
                    </div>
                    {material.supplier && (
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Proveedor</span>
                        {material.supplierLink ? (
                          <a
                            href={material.supplierLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {material.supplier}
                          </a>
                        ) : (
                          <span className="text-sm">{material.supplier}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(material)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(material)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header de navegación mejorado */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')}
                className="p-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                <span className="hidden sm:inline">Regresar al Dashboard</span>
              </button>
              <div className="h-6 w-px bg-border hidden sm:block"></div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Inventario de Materiales</h1>
            </div>
            
            {/* Indicador de materiales */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{materials.length} materiales</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">
            Gestiona el inventario de materiales para tus proyectos de cercado
          </p>
        </div>

        {/* Controles de búsqueda y filtrado optimizados */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar materiales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            {selectedMaterials.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setShowBatchDeleteDialog(true)}
                className="flex-1 sm:flex-none"
              >
                <Trash className="mr-2 h-4 w-4" />
                Eliminar ({selectedMaterials.size})
              </Button>
            )}
            <Button onClick={() => setShowAddDialog(true)} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Agregar</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <label className="cursor-pointer">
                <FileUp className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
                <span className="sm:hidden">CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </div>

        {/* Sección principal de materiales */}
        <div className="w-full mb-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle>Inventario Completo</CardTitle>
              <CardDescription>
                {filteredMaterials.length} materiales disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredMaterials.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sin materiales</AlertTitle>
                  <AlertDescription>
                    No hay materiales que coincidan con los filtros actuales.
                  </AlertDescription>
                </Alert>
              ) : (
                renderMaterialsTable()
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para agregar material */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Agregar Nuevo Material</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Completa los detalles del material para agregarlo al inventario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="required">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Poste de madera 4x4"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="required">Categoría</Label>
                <Select
                  value={newMaterial.category}
                  onValueChange={(value) => setNewMaterial({...newMaterial, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                placeholder="Poste de madera tratada para uso exterior"
                value={newMaterial.description || ''}
                onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit" className="required">Unidad</Label>
                <Select
                  value={newMaterial.unit}
                  onValueChange={(value) => setNewMaterial({...newMaterial, unit: value})}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newMaterial.price || ''}
                  onChange={(e) => setNewMaterial({...newMaterial, price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="ABC-123"
                  value={newMaterial.sku || ''}
                  onChange={(e) => setNewMaterial({...newMaterial, sku: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Input
                  id="supplier"
                  placeholder="Home Depot"
                  value={newMaterial.supplier || ''}
                  onChange={(e) => setNewMaterial({...newMaterial, supplier: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplierLink">Enlace del Proveedor</Label>
              <Input
                id="supplierLink"
                type="url"
                placeholder="https://www.homedepot.com/..."
                value={newMaterial.supplierLink || ''}
                onChange={(e) => setNewMaterial({...newMaterial, supplierLink: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
            </DialogClose>
            <Button onClick={saveMaterial} className="w-full sm:w-auto">
              Agregar Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar material */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del material.
            </DialogDescription>
          </DialogHeader>
          
          {editingMaterial && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="required">Nombre</Label>
                  <Input
                    id="edit-name"
                    placeholder="Poste de madera 4x4"
                    value={editingMaterial.name}
                    onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="required">Categoría</Label>
                  <Select
                    value={editingMaterial.category}
                    onValueChange={(value) => setEditingMaterial({...editingMaterial, category: value})}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category || "categoria_sin_nombre"}>
                          {category || "Categoría sin nombre"}
                        </SelectItem>
                      ))}
                      {/* Incluir la categoría actual si no está en las comunes */}
                      {!COMMON_CATEGORIES.includes(editingMaterial.category) && editingMaterial.category && (
                        <SelectItem value={editingMaterial.category || "categoria_sin_nombre"}>
                          {editingMaterial.category || "Categoría sin nombre"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Input
                  id="edit-description"
                  placeholder="Poste de madera tratada para uso exterior"
                  value={editingMaterial.description || ''}
                  onChange={(e) => setEditingMaterial({...editingMaterial, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-unit" className="required">Unidad</Label>
                  <Select
                    value={editingMaterial.unit}
                    onValueChange={(value) => setEditingMaterial({...editingMaterial, unit: value})}
                  >
                    <SelectTrigger id="edit-unit">
                      <SelectValue placeholder="Selecciona una unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                      {/* Incluir la unidad actual si no está en las comunes */}
                      {!COMMON_UNITS.includes(editingMaterial.unit) && editingMaterial.unit && (
                        <SelectItem value={editingMaterial.unit}>
                          {editingMaterial.unit}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Precio</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editingMaterial.price || ''}
                    onChange={(e) => setEditingMaterial({...editingMaterial, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input
                    id="edit-sku"
                    placeholder="ABC-123"
                    value={editingMaterial.sku || ''}
                    onChange={(e) => setEditingMaterial({...editingMaterial, sku: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Proveedor</Label>
                  <Input
                    id="edit-supplier"
                    placeholder="Home Depot"
                    value={editingMaterial.supplier || ''}
                    onChange={(e) => setEditingMaterial({...editingMaterial, supplier: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-supplierLink">Enlace del Proveedor</Label>
                <Input
                  id="edit-supplierLink"
                  type="url"
                  placeholder="https://www.homedepot.com/..."
                  value={editingMaterial.supplierLink || ''}
                  onChange={(e) => setEditingMaterial({...editingMaterial, supplierLink: e.target.value})}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
            </DialogClose>
            <Button onClick={updateMaterial} className="w-full sm:w-auto">
              Actualizar Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar material?</DialogTitle>
            <DialogDescription>
              {deletingMaterial && (
                <>
                  ¿Estás seguro de que quieres eliminar el material "<strong>{deletingMaterial.name}</strong>"? Esta acción no se puede deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={deleteMaterial} className="w-full sm:w-auto">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminación en lote */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación en lote</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar {selectedMaterials.size} materiales seleccionados? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">Materiales a eliminar:</p>
            <ul className="text-sm space-y-1">
              {materials
                .filter(m => selectedMaterials.has(m.id))
                .map(material => (
                  <li key={material.id} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    {material.name} ({material.category})
                  </li>
                ))
              }
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteBatchMaterials}>
              Eliminar {selectedMaterials.size} materiales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}