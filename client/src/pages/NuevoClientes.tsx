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
import { Trash2, FileSymlink, Phone, Mail, MapPin, Star, Edit, UserPlus, Upload, Download, Search, X, Tag, Filter, List, Grid, Sliders } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

// Interfaces
interface Client {
  id: number;
  userId: number;
  clientId: string;
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [importType, setImportType] = useState<"csv" | "vcf">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [vcfFile, setVcfFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Consulta para obtener clientes
  const { 
    data: clients = [], 
    isLoading,
    isError,
    error 
  } = useQuery({
    queryKey: ['/api/clients', { userId }],
    queryFn: () => apiRequest.get(`/api/clients?userId=${userId}`),
  });

  // Mutation para crear un cliente
  const createClientMutation = useMutation({
    mutationFn: (newClient: any) => apiRequest.post('/api/clients', newClient),
    onSuccess: () => {
      toast({
        title: "Cliente añadido",
        description: "El cliente ha sido añadido correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
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

  // Mutation para actualizar un cliente
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => 
      apiRequest.patch(`/api/clients/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Cliente actualizado",
        description: "El cliente ha sido actualizado correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
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

  // Mutation para eliminar un cliente
  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => apiRequest.delete(`/api/clients/${id}`),
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
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
    if (!clients || !Array.isArray(clients)) return;
    
    let result = [...clients];

    // Filtrar por texto de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client => 
        client.name.toLowerCase().includes(term) || 
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
    // Asegurar que userId esté incluido
    const clientData = {
      ...values,
      userId,
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
          const rows = csvData.split('\n').slice(1); // Ignorar encabezados
          
          // Procesar cada fila y crear clientes
          for (const row of rows) {
            if (!row.trim()) continue; // Ignorar filas vacías
            
            const [name, email, phone, address] = row.split(',');
            if (name) {
              const clientData = {
                userId,
                clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                name: name.trim(),
                email: email?.trim() || "",
                phone: phone?.trim() || "",
                address: address?.trim() || "",
                source: "CSV Import",
              };

              // Crear cliente
              await apiRequest.post('/api/clients', clientData);
            }
          }

          // Actualizar lista de clientes
          queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          
          toast({
            title: "Importación exitosa",
            description: `Se han importado los clientes desde CSV.`
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
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
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
                          onChange={field.onChange}
                          placeholder="Buscar dirección..."
                          onAddressDetailsChange={(details) => {
                            // Actualizar los demás campos de dirección
                            if (details.city) clientForm.setValue('city', details.city);
                            if (details.state) clientForm.setValue('state', details.state);
                            if (details.zipCode) clientForm.setValue('zipCode', details.zipCode);
                          }}
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

              <FormField
                control={clientForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuente</FormLabel>
                    <FormControl>
                      <Input placeholder="¿Cómo conoció al cliente?" {...field} />
                    </FormControl>
                    <FormDescription>
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
                  <FormItem>
                    <FormLabel>Etiquetas</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {clientForm.getValues('tags')?.map(tag => (
                        <Badge key={tag} className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
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
                      />
                    </FormControl>
                    <FormDescription>
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
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el cliente"
                        className="min-h-24"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddClientDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar Cliente</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar cliente */}
      <Dialog open={showEditClientDialog} onOpenChange={setShowEditClientDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos del cliente.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleClientFormSubmit)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre*</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} />
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
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={clientForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Dirección"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={clientForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ciudad" {...field} />
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
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Estado" {...field} />
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
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="CP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={clientForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuente</FormLabel>
                    <FormControl>
                      <Input placeholder="¿Cómo conoció al cliente?" {...field} />
                    </FormControl>
                    <FormDescription>
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
                  <FormItem>
                    <FormLabel>Etiquetas</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {clientForm.getValues('tags')?.map(tag => (
                        <Badge key={tag} className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
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
                      />
                    </FormControl>
                    <FormDescription>
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
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el cliente"
                        className="min-h-24"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditClientDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Actualizar Cliente</Button>
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
    </div>
  );
}