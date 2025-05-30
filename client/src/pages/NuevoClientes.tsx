import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Trash2, FileSymlink, Phone, Mail, MapPin, Star, Edit, UserPlus, Upload, Download, Search, X, Tag, Filter, List, Grid, Sliders, AlertTriangle, CheckCircle, CircleAlert } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
// Importaciones de Firebase
import { 
  getClients, 
  saveClient, 
  updateClient, 
  deleteClient,
  importClientsFromCsv,
  importClientsFromVcf
} from "../lib/clientFirebase";
// Importación del componente de importación inteligente
import { ImportWizard } from "@/components/ImportWizard";
import { ContactImportWizard } from "@/components/ContactImportWizard";

// Interfaces
interface Client {
  id: string;         // En Firebase, el ID es un string
  userId?: string;    // Usuario propietario del cliente
  clientId: string;   // Identificador único del cliente
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  source?: string;
  tags?: string[];
  classification?: string;
  lastContact?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Address Autocomplete Component
const AddressAutocomplete = ({ value, onChange, placeholder }: {
  value: string | undefined;
  onChange: (value: string, details?: any) => void;
  placeholder: string;
}) => {
  return (
    <Input 
      placeholder={placeholder} 
      value={value || ""} 
      onChange={e => onChange(e.target.value)} 
    />
  );
};

// Schemas para la validación de formularios
const clientFormSchema = z.object({
  userId: z.number().optional(),
  clientId: z.string().optional(),
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  email: z.string().email({ message: "Correo electrónico inválido" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobilePhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

const csvImportSchema = z.object({
  csvData: z.string().min(1, { message: "Por favor selecciona un archivo CSV" }),
});

export default function NuevoClientes() {
  const { profile } = useProfile();
  // ID por defecto para pruebas, si no hay perfil disponible
  const userId = profile?.id || 1;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estados
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("_all");
  const [activeTab, setActiveTab] = useState("all");
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showEditClientDialog, setShowEditClientDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSmartImportDialog, setShowSmartImportDialog] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [importType, setImportType] = useState<"csv" | "vcf">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [vcfFile, setVcfFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Consulta para obtener clientes desde Firebase
  const { 
    data: clients = [], 
    isLoading,
    isError,
    error 
  } = useQuery({
    queryKey: ['firebaseClients'],
    queryFn: async () => {
      try {
        console.log("Obteniendo clientes desde Firebase...");
        const data = await getClients();
        console.log("Clientes obtenidos:", data);
        return data;
      } catch (err) {
        console.error("Error al obtener clientes de Firebase:", err);
        throw err;
      }
    },
  });

  // Mutation para crear un cliente usando Firebase
  const createClientMutation = useMutation({
    mutationFn: (newClient: any) => saveClient(newClient),
    onSuccess: () => {
      toast({
        title: "Cliente añadido",
        description: "El cliente ha sido añadido correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['firebaseClients'] });
      setShowAddClientDialog(false);
      clientForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el cliente: " + (error.message || "Error desconocido")
      });
    }
  });

  // Mutation para actualizar un cliente usando Firebase
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      updateClient(id, data),
    onSuccess: () => {
      toast({
        title: "Cliente actualizado",
        description: "El cliente ha sido actualizado correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['firebaseClients'] });
      setShowEditClientDialog(false);
      setCurrentClient(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el cliente: " + (error.message || "Error desconocido")
      });
    }
  });

  // Mutation para eliminar un cliente usando Firebase
  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['firebaseClients'] });
      setShowDeleteDialog(false);
      setCurrentClient(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el cliente: " + (error.message || "Error desconocido")
      });
    }
  });

  // Formulario para añadir/editar cliente
  const clientForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      mobilePhone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      notes: "",
      source: "",
      tags: [],
    },
  });

  // Formulario para importar CSV
  const csvImportForm = useForm<z.infer<typeof csvImportSchema>>({
    resolver: zodResolver(csvImportSchema),
    defaultValues: {
      csvData: "",
    },
  });

  // Filtrar clientes cuando cambian los filtros
  useEffect(() => {
    // Verificar que clients sea un array válido para evitar errores
    if (!Array.isArray(clients)) {
      setFilteredClients([]);
      return;
    }
    
    let result = [...clients];

    // Filtrar por texto de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client => 
        (client.name && client.name.toLowerCase().includes(term)) || 
        (client.email && client.email.toLowerCase().includes(term)) ||
        (client.phone && client.phone.includes(term)) ||
        (client.address && client.address.toLowerCase().includes(term))
      );
    }

    // Filtrar por etiquetas seleccionadas
    if (selectedTags.length > 0) {
      result = result.filter(client => 
        client.tags && selectedTags.every(tag => client.tags?.includes(tag))
      );
    }

    // Filtrar por fuente
    if (activeTab !== "all") {
      if (activeTab === "no_source") {
        result = result.filter(client => !client.source);
      } else {
        result = result.filter(client => client.source === activeTab);
      }
    }

    setFilteredClients(result);
  }, [searchTerm, selectedTags, activeTab, clients]);

  // Obtener todas las etiquetas únicas
  const allTags = clients && Array.isArray(clients) ? clients.reduce((tags: string[], client) => {
    if (client.tags) {
      client.tags.forEach((tag: string) => {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }
    return tags;
  }, []) : [];

  // Obtener todas las fuentes únicas
  const allSources = clients && Array.isArray(clients) ? clients.reduce((sources: string[], client) => {
    if (client.source && !sources.includes(client.source)) {
      sources.push(client.source);
    }
    return sources;
  }, []) : [];

  // Función para formatear la fecha
  const formatDate = (date: Date | string) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Manejar envío del formulario de cliente
  const handleClientFormSubmit = async (values: z.infer<typeof clientFormSchema>) => {
    // Preparar datos del cliente para Firebase
    // Convertimos el userId a string para mantener consistencia
    const clientData = {
      ...values,
      userId: userId.toString(),
    };

    if (currentClient) {
      // Actualizar cliente existente
      updateClientMutation.mutate({ 
        id: currentClient.id, 
        data: clientData 
      });
    } else {
      // Generar un ID único para el cliente
      const clientId = `client_${Date.now()}`;
      
      // Crear nuevo cliente
      createClientMutation.mutate({
        ...clientData,
        clientId
      });
    }
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = () => {
    if (!currentClient) return;
    deleteClientMutation.mutate(currentClient.id);
  };

  // Manejar importación CSV
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!csvFile) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Por favor selecciona un archivo CSV"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target || typeof e.target.result !== 'string') return;

        try {
          const csvData = e.target.result;
          
          // Usar la función de Firebase para importar clientes desde CSV
          console.log("Iniciando importación de clientes desde CSV...");
          const importedClients = await importClientsFromCsv(csvData);
          console.log(`Importados ${importedClients.length} clientes desde CSV`);

          // Actualizar lista de clientes
          queryClient.invalidateQueries({ queryKey: ['firebaseClients'] });
          
          toast({
            title: "Importación exitosa",
            description: `Se han importado ${importedClients.length} clientes desde CSV.`
          });

          setShowImportDialog(false);
          csvImportForm.reset();
          setCsvFile(null);
          
        } catch (error: any) {
          console.error('Error processing CSV:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al procesar el archivo CSV: " + (error.message || "Error desconocido")
          });
        }
      };

      reader.readAsText(csvFile);
    } catch (error: any) {
      console.error('Error importing clients:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron importar los clientes: " + (error.message || "Error desconocido")
      });
    }
  };

  // Manejar importación de contactos vCard
  const handleVcfImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!vcfFile) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Por favor selecciona un archivo vCard (.vcf)"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target || typeof e.target.result !== 'string') return;

        try {
          const vcfData = e.target.result;
          
          // Procesar datos vCard (formato .vcf)
          const vCards = vcfData.split('END:VCARD')
            .filter(card => card.trim().length > 0)
            .map(card => card + 'END:VCARD');
          
          // Contador para clientes importados
          let importedCount = 0;
          
          for (const vCard of vCards) {
            try {
              // Extraer datos básicos del vCard
              const nameMatch = vCard.match(/FN:(.*?)(?:\r\n|\n)/);
              const emailMatch = vCard.match(/EMAIL.*?:(.*?)(?:\r\n|\n)/);
              const phoneMatch = vCard.match(/TEL.*?:(.*?)(?:\r\n|\n)/);
              const addressMatch = vCard.match(/ADR.*?:(.*?)(?:\r\n|\n)/);

              const name = nameMatch ? nameMatch[1].trim() : null;
              
              if (name) {
                const email = emailMatch ? emailMatch[1].trim() : "";
                const phone = phoneMatch ? phoneMatch[1].trim() : "";
                let address = "";
                
                if (addressMatch) {
                  const addressParts = addressMatch[1].split(';');
                  // Formato típico: ;;calle;ciudad;estado;código postal;país
                  address = addressParts.slice(2).filter(part => part.trim()).join(', ');
                }

                const clientData = {
                  userId,
                  clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  name,
                  email,
                  phone,
                  address,
                  source: "vCard Import",
                };

                // Crear cliente
                await apiRequest.post('/api/clients', clientData);
                importedCount++;
              }
            } catch (cardError) {
              console.error('Error processing individual vCard:', cardError);
              // Continuar con la siguiente tarjeta
            }
          }

          // Actualizar lista de clientes
          queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          
          toast({
            title: "Importación exitosa",
            description: `Se importaron ${importedCount} contactos de vCard.`
          });

          setShowImportDialog(false);
          setVcfFile(null);
          
        } catch (error: any) {
          console.error('Error processing vCard file:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al procesar el archivo vCard: " + (error.message || "Error desconocido")
          });
        }
      };

      reader.readAsText(vcfFile);
    } catch (error: any) {
      console.error('Error importing vCard contacts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron importar los contactos: " + (error.message || "Error desconocido")
      });
    }
  };

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'vcf') => {
    if (e.target.files && e.target.files.length > 0) {
      if (type === 'csv') {
        setCsvFile(e.target.files[0]);
        csvImportForm.setValue('csvData', 'Archivo seleccionado');
      } else {
        setVcfFile(e.target.files[0]);
      }
    }
  };
  
  // Manejar la importación inteligente de clientes
  const handleSmartImportComplete = async (importedClients: Client[]) => {
    try {
      console.log("Procesando importación inteligente de clientes...", importedClients);
      
      // Asignar el userId a los clientes importados si existe un perfil
      const clientsWithUserId = importedClients.map(client => ({
        ...client,
        userId: profile?.id?.toString() || "dev-user-123"
      }));
      
      // Guardar los clientes en Firebase
      for (const client of clientsWithUserId) {
        await saveClient(client);
      }
      
      // Actualizar la lista de clientes
      queryClient.invalidateQueries({ queryKey: ['firebaseClients'] });
      
      toast({
        title: "Importación inteligente exitosa",
        description: `Se han importado ${importedClients.length} clientes correctamente.`
      });
      
      // Cerrar el diálogo de importación inteligente
      setShowSmartImportDialog(false);
    } catch (error: any) {
      console.error('Error en la importación inteligente:', error);
      toast({
        variant: "destructive",
        title: "Error en la importación inteligente",
        description: error.message || "No se pudieron importar los clientes"
      });
    }
  };

  // Manejar apertura del formulario de edición
  const openEditForm = (client: Client) => {
    setCurrentClient(client);

    // Establecer valores del formulario
    clientForm.reset({
      userId: client.userId,
      clientId: client.clientId,
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      mobilePhone: client.mobilePhone || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      notes: client.notes || "",
      source: client.source || "",
      tags: client.tags || [],
    });

    setShowEditClientDialog(true);
  };

  // Abrir formulario para añadir un nuevo cliente
  const openAddForm = () => {
    setCurrentClient(null);
    clientForm.reset({
      userId,
      name: "",
      email: "",
      phone: "",
      mobilePhone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      notes: "",
      source: "",
      tags: [],
    });
    setShowAddClientDialog(true);
  };

  // Abrir diálogo de eliminación
  const openDeleteDialog = (client: Client) => {
    setCurrentClient(client);
    setShowDeleteDialog(true);
  };
  
  // Manejar selección de cliente individual
  const handleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        // Si ya está seleccionado, lo quitamos
        return prev.filter(id => id !== clientId);
      } else {
        // Si no está seleccionado, lo añadimos
        return [...prev, clientId];
      }
    });
  };
  
  // Seleccionar o deseleccionar todos los clientes
  const handleSelectAll = () => {
    if (selectAllChecked) {
      // Si ya están todos seleccionados, deseleccionamos todos
      setSelectedClients([]);
    } else {
      // Si no están todos seleccionados, seleccionamos todos
      setSelectedClients(filteredClients.map(client => client.id));
    }
    setSelectAllChecked(!selectAllChecked);
  };
  
  // Abrir diálogo de eliminación masiva
  const openBatchDeleteDialog = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Selección vacía",
        description: "Por favor, selecciona al menos un contacto para eliminar",
        variant: "destructive"
      });
      return;
    }
    setShowBatchDeleteDialog(true);
  };
  
  // Eliminar clientes seleccionados en lote
  const deleteSelectedClients = async () => {
    try {
      setIsProcessing(true);
      
      // Eliminar cada cliente seleccionado
      for (const clientId of selectedClients) {
        await deleteClient(clientId);
      }
      
      // Actualizar lista de clientes
      queryClient.invalidateQueries({ queryKey: ['firebaseClients'] });
      
      toast({
        title: "Eliminación exitosa",
        description: `Se han eliminado ${selectedClients.length} contactos`
      });
      
      // Limpiar selección y cerrar diálogo
      setSelectedClients([]);
      setSelectAllChecked(false);
      setShowBatchDeleteDialog(false);
    } catch (error) {
      console.error('Error al eliminar clientes en lote:', error);
      toast({
        title: "Error al eliminar",
        description: "No se pudieron eliminar algunos contactos",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejar entrada de etiquetas
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      
      // Obtener etiquetas actuales
      const currentTags = clientForm.getValues('tags') || [];
      
      // Añadir la nueva etiqueta si no existe
      if (!currentTags.includes(tagInput.trim())) {
        clientForm.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      
      // Limpiar el campo de entrada
      setTagInput("");
    }
  };

  // Eliminar una etiqueta
  const removeTag = (tag: string) => {
    const currentTags = clientForm.getValues('tags') || [];
    clientForm.setValue('tags', currentTags.filter(t => t !== tag));
  };

  // Agregar o quitar una etiqueta del filtro
  const toggleTagFilter = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setActiveTab("all");
  };

  if (isError) {
    return (
      <div className="flex-1 p-6 page-scroll-container" style={{WebkitOverflowScrolling: 'touch', height: '100%'}}>
        <h1 className="text-2xl font-bold mb-6">Clientes</h1>
        <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
          <p className="font-bold">Error al cargar los clientes</p>
          <p>{String(error)}</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/clients'] })}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Generar una lista de clientes para la visualización
  if (isLoading) {
    return (
      <div className="flex-1 p-6 page-scroll-container" style={{WebkitOverflowScrolling: 'touch', height: '100%'}}>
        <h1 className="text-2xl font-bold mb-6">Clientes</h1>
        <div className="mb-6 space-y-4">
          <Skeleton className="h-10 w-full md:w-3/4" />
          <div className="flex flex-wrap gap-2">
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

  return (
    <div className="flex-1 p-6 page-scroll-container" style={{WebkitOverflowScrolling: 'touch', height: '100%'}}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex flex-wrap gap-2">
          {selectedClients.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={openBatchDeleteDialog} 
              className="animate-in fade-in"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar seleccionados ({selectedClients.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" onClick={() => setShowSmartImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importación Inteligente
          </Button>
          <Button onClick={openAddForm}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-primary/10" : ""}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-primary/10" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filtros de etiquetas */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <Sliders className="h-4 w-4 mr-1 text-muted-foreground" />
            <div className="text-sm text-muted-foreground mr-2">Filtrar por etiquetas:</div>
            {allTags.map(tag => (
              <Badge 
                key={tag} 
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}

        {/* Pestañas para filtrar por fuente */}
        {allSources.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 overflow-auto flex w-full">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="no_source">Sin fuente</TabsTrigger>
              {allSources.map(source => (
                <TabsTrigger key={source} value={source}>{source}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Lista de clientes */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No hay clientes</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedTags.length > 0 || activeTab !== "all" 
              ? "No se encontraron clientes con los filtros aplicados." 
              : "Comienza agregando tu primer cliente o importando contactos."}
          </p>
          {(searchTerm || selectedTags.length > 0 || activeTab !== "all") && (
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map(client => (
            <Card key={client.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-start">
                  <span className="truncate">{client.name}</span>
                  <div className="flex">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openEditForm(client)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openDeleteDialog(client)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                {client.source && (
                  <CardDescription>
                    <Badge variant="outline" className="mt-1">{client.source}</Badge>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {client.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a href={`mailto:${client.email}`} className="truncate hover:underline">
                        {client.email}
                      </a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a href={`tel:${client.phone}`} className="hover:underline">
                        {client.phone}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  {client.lastContact && (
                    <div className="flex items-center text-muted-foreground text-xs">
                      <span>Último contacto: {formatDate(client.lastContact)}</span>
                    </div>
                  )}
                </div>
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {client.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-3 text-center text-sm font-medium text-muted-foreground w-10">
                  <Checkbox 
                    id="select-all"
                    checked={selectAllChecked}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos los contactos"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contacto</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Dirección</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Fuente</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-muted/30">
                  <td className="px-2 py-3 text-center">
                    <Checkbox 
                      id={`select-client-${client.id}`}
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => handleClientSelection(client.id)}
                      aria-label={`Seleccionar ${client.name}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{client.name}</div>
                    {client.tags && client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {client.email && (
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                        <a href={`mailto:${client.email}`} className="truncate hover:underline">
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                        <a href={`tel:${client.phone}`} className="hover:underline">
                          {client.phone}
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm truncate hidden md:table-cell max-w-[200px]">
                    {client.address || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">
                    {client.source ? <Badge variant="outline">{client.source}</Badge> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditForm(client)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openDeleteDialog(client)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Diálogo para añadir cliente */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Añadir nuevo cliente</DialogTitle>
            <DialogDescription>
              Completa los datos del cliente. Solo el nombre es obligatorio.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleClientFormSubmit)} className="space-y-5">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Nombre*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nombre del cliente" 
                        className="h-11" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Email" 
                          type="email"
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Teléfono" 
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-2 pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Información de dirección</h3>
                
                <FormField
                  control={clientForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="mb-5">
                      <FormLabel className="text-base font-medium">Dirección</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(value, details) => {
                            field.onChange(value);
                            // Actualizar los demás campos de dirección
                            if (details?.city) clientForm.setValue('city', details.city);
                            if (details?.state) clientForm.setValue('state', details.state);
                            if (details?.zipCode) clientForm.setValue('zipCode', details.zipCode);
                          }}
                          placeholder="Buscar dirección..."
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Selecciona una dirección del autocompletado para llenar automáticamente ciudad, estado y código postal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField
                    control={clientForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Ciudad</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ciudad" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Estado</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Estado" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Código Postal</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="CP" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Información adicional</h3>
                
                <FormField
                  control={clientForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Fuente</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="¿Cómo conoció al cliente?" 
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Ejemplo: Referencia, Google, Facebook, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="tags"
                  render={() => (
                    <FormItem className="mt-5">
                      <FormLabel className="text-base font-medium">Etiquetas</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {clientForm.getValues('tags')?.map(tag => (
                          <Badge key={tag} className="flex items-center gap-1 py-1.5 px-3">
                            {tag}
                            <X 
                              className="h-3.5 w-3.5 cursor-pointer ml-1" 
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Añadir etiqueta (presiona Enter)"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInput}
                          className="h-11"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Añade etiquetas para categorizar a tus clientes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="mt-5">
                      <FormLabel className="text-base font-medium">Notas</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notas adicionales sobre el cliente"
                          className="min-h-[100px] resize-y"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6 pt-2 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddClientDialog(false)}
                  className="h-11"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="h-11 min-w-[120px]"
                >
                  Guardar Cliente
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar cliente */}
      <Dialog open={showEditClientDialog} onOpenChange={setShowEditClientDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos del cliente. Solo el nombre es obligatorio.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleClientFormSubmit)} className="space-y-5">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Nombre*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nombre del cliente" 
                        className="h-11" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Email" 
                          type="email"
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Teléfono" 
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-2 pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Información de dirección</h3>
                
                <FormField
                  control={clientForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="mb-5">
                      <FormLabel className="text-base font-medium">Dirección</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(value, details) => {
                            field.onChange(value);
                            // Actualizar los demás campos de dirección
                            if (details?.city) clientForm.setValue('city', details.city);
                            if (details?.state) clientForm.setValue('state', details.state);
                            if (details?.zipCode) clientForm.setValue('zipCode', details.zipCode);
                          }}
                          placeholder="Buscar dirección..."
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Selecciona una dirección del autocompletado para llenar automáticamente ciudad, estado y código postal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField
                    control={clientForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Ciudad</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ciudad" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Estado</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Estado" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Código Postal</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="CP" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Información adicional</h3>
                
                <FormField
                  control={clientForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Fuente</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="¿Cómo conoció al cliente?" 
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Ejemplo: Referencia, Google, Facebook, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="tags"
                  render={() => (
                    <FormItem className="mt-5">
                      <FormLabel className="text-base font-medium">Etiquetas</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {clientForm.getValues('tags')?.map(tag => (
                          <Badge key={tag} className="flex items-center gap-1 py-1.5 px-3">
                            {tag}
                            <X 
                              className="h-3.5 w-3.5 cursor-pointer ml-1" 
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Añadir etiqueta (presiona Enter)"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInput}
                          className="h-11"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Añade etiquetas para categorizar a tus clientes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="mt-5">
                      <FormLabel className="text-base font-medium">Notas</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notas adicionales sobre el cliente"
                          className="min-h-[100px] resize-y"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6 pt-2 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditClientDialog(false)}
                  className="h-11"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="h-11 min-w-[120px]"
                >
                  Actualizar Cliente
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>













































































































































































































































      {/* Diálogo para eliminar cliente */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          {currentClient && (
            <div className="py-4">
              <h3 className="font-medium">{currentClient.name}</h3>
              {currentClient.email && <p className="text-sm text-muted-foreground">{currentClient.email}</p>}
              {currentClient.phone && <p className="text-sm text-muted-foreground">{currentClient.phone}</p>}
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDeleteClient}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para importar clientes */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar contactos</DialogTitle>
            <DialogDescription>
              Importa tus contactos desde un archivo CSV o vCard.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={importType} onValueChange={(value) => setImportType(value as "csv" | "vcf")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">Archivo CSV</TabsTrigger>
              <TabsTrigger value="vcf">Archivo vCard</TabsTrigger>
            </TabsList>
            
            <TabsContent value="csv" className="mt-4">
              <form onSubmit={handleCsvImport} className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-md p-6 text-center">
                  <div className="flex flex-col items-center">
                    <FileSymlink className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="font-medium mb-1">Archivo CSV</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecciona un archivo CSV con tus contactos.
                    </p>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileChange(e, 'csv')}
                      className="max-w-xs"
                    />
                  </div>
                  {csvFile && (
                    <p className="mt-2 text-sm font-medium">{csvFile.name}</p>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <h4 className="font-medium text-foreground mb-1">Formato esperado:</h4>
                  <p>La primera línea debe contener encabezados: Nombre,Email,Teléfono,Dirección</p>
                  <p className="mt-2">Ejemplo:</p>
                  <pre className="bg-muted p-2 rounded-md mt-1 overflow-x-auto">
                    <code>
                      Nombre,Email,Teléfono,Dirección<br/>
                      Juan Pérez,juan@ejemplo.com,555-123-4567,Calle 123
                    </code>
                  </pre>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowImportDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!csvFile}
                  >
                    Importar CSV
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="vcf" className="mt-4">
              <form onSubmit={handleVcfImport} className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-md p-6 text-center">
                  <div className="flex flex-col items-center">
                    <FileSymlink className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="font-medium mb-1">Archivo vCard</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecciona un archivo .vcf exportado desde Contactos de Apple u otra aplicación.
                    </p>
                    <Input
                      type="file"
                      accept=".vcf"
                      onChange={(e) => handleFileChange(e, 'vcf')}
                      className="max-w-xs"
                    />
                  </div>
                  {vcfFile && (
                    <p className="mt-2 text-sm font-medium">{vcfFile.name}</p>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <h4 className="font-medium text-foreground mb-1">¿Cómo exportar contactos de Apple?</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Abre la aplicación Contactos en tu Mac o iPhone</li>
                    <li>Selecciona los contactos que deseas exportar</li>
                    <li>Ve a Archivo &gt; Exportar &gt; Exportar vCard</li>
                    <li>Guarda el archivo .vcf en tu dispositivo</li>
                    <li>Súbelo aquí para importar</li>
                  </ol>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowImportDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!vcfFile}
                  >
                    Importar vCard
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Eliminación Masiva */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar contactos seleccionados</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar {selectedClients.length} contactos? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta acción eliminará permanentemente {selectedClients.length} contactos de tu base de datos.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowBatchDeleteDialog(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={deleteSelectedClients}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Eliminando...
                </>
              ) : (
                'Eliminar seleccionados'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Importación Inteligente con mayor control de edición */}
      <ContactImportWizard 
        isOpen={showSmartImportDialog}
        onClose={() => setShowSmartImportDialog(false)}
        onImportComplete={handleSmartImportComplete}
      />
    </div>
  );
}