import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  getClients as getFirebaseClients,
  saveClient,
  updateClient as updateFirebaseClient,
  deleteClient as deleteFirebaseClient,
  importClientsFromCsv,
  importClientsFromVcf
} from "../lib/clientFirebase";
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
import { Trash2, FileSymlink, Phone, Mail, MapPin, Star, Edit, UserPlus, Upload, Download, Search } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Assuming AddressAutocomplete component is defined elsewhere and imported
// This is a placeholder, replace with your actual implementation
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

// Usar la interfaz de cliente de Firebase
import { Client } from "../lib/clientFirebase";

// Schemas para la validación de formularios
const clientFormSchema = z.object({
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
  classification: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

const csvImportSchema = z.object({
  csvData: z.string().min(1, { message: "Por favor selecciona un archivo CSV" }),
});

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("_all");
  const [activeTab, setActiveTab] = useState("all");
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showEditClientDialog, setShowEditClientDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [importType, setImportType] = useState<"csv" | "apple">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [appleContactsFile, setAppleContactsFile] = useState<File | null>(null);
  const { toast } = useToast();

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
      classification: "cliente", // Valor predeterminado: cliente
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

  // Cargar clientes al inicio
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        console.log("Cargando clientes desde Firebase...");
        const data = await getFirebaseClients();
        console.log("Clientes cargados:", data);
        setClients(data);
        setFilteredClients(data);
      } catch (error) {
        console.error('Error fetching clients from Firebase:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los clientes."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [toast]);

  // Filtrar clientes cuando cambian los filtros
  useEffect(() => {
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

    // Filtrar por etiqueta
    if (selectedTag && selectedTag !== "_all") {
      result = result.filter(client => 
        client.tags && client.tags.includes(selectedTag)
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
  }, [searchTerm, selectedTag, activeTab, clients]);

  // Obtener todas las etiquetas únicas
  const allTags = clients.reduce((tags, client) => {
    if (client.tags) {
      client.tags.forEach(tag => {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }
    return tags;
  }, [] as string[]);

  // Obtener todas las fuentes únicas
  const allSources = clients.reduce((sources, client) => {
    if (client.source && !sources.includes(client.source)) {
      sources.push(client.source);
    }
    return sources;
  }, [] as string[]);

  // Función para formatear la fecha
  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Manejar envío del formulario de cliente
  const handleClientFormSubmit = async (values: z.infer<typeof clientFormSchema>) => {
    try {
      if (currentClient) {
        // Actualizar cliente existente usando Firebase
        console.log("Actualizando cliente en Firebase:", currentClient.id, values);
        const updatedClient = await updateFirebaseClient(currentClient.id, values);

        // Actualizar la lista de clientes
        setClients(prevClients => 
          prevClients.map(client => 
            client.id === updatedClient.id ? updatedClient : client
          )
        );

        toast({
          title: "Cliente actualizado",
          description: `${updatedClient.name} se ha actualizado correctamente.`
        });

        setShowEditClientDialog(false);
      } else {
        // Crear nuevo cliente usando Firebase
        console.log("Creando nuevo cliente en Firebase:", values);
        const newClient = await saveClient({
          clientId: `client_${Date.now()}`,
          ...values
        });

        // Añadir el nuevo cliente a la lista
        setClients(prevClients => [...prevClients, newClient]);

        toast({
          title: "Cliente añadido",
          description: `${newClient.name} se ha añadido correctamente.`
        });

        setShowAddClientDialog(false);
      }

      // Resetear el formulario
      clientForm.reset();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: currentClient 
          ? "No se pudo actualizar el cliente" 
          : "No se pudo añadir el cliente"
      });
    }
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = async () => {
    if (!currentClient) return;

    try {
      // Eliminar cliente usando Firebase
      console.log("Eliminando cliente en Firebase:", currentClient.id);
      await deleteFirebaseClient(currentClient.id);

      // Eliminar el cliente de la lista
      setClients(prevClients => 
        prevClients.filter(client => client.id !== currentClient.id)
      );

      toast({
        title: "Cliente eliminado",
        description: `${currentClient.name} se ha eliminado correctamente.`
      });

      setShowDeleteDialog(false);
      setCurrentClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el cliente"
      });
    }
  };

  // Manejar importación CSV
  const handleCsvImport = async (values: z.infer<typeof csvImportSchema>) => {
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

          // Usar la función de Firebase para importar CSV
          console.log("Importando CSV a Firebase");
          const importedClients = await importClientsFromCsv(csvData);

          // Añadir los nuevos clientes a la lista
          setClients(prevClients => [...prevClients, ...importedClients]);

          toast({
            title: "Importación exitosa",
            description: `Se han importado ${importedClients.length} clientes desde CSV.`
          });

          setShowImportDialog(false);
          csvImportForm.reset();
          setCsvFile(null);
        } catch (error) {
          console.error('Error processing CSV:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al procesar el archivo CSV"
          });
        }
      };

      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error importing clients:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron importar los clientes"
      });
    }
  };

  // Manejar selección de archivo CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      csvImportForm.setValue('csvData', 'Archivo seleccionado');
    }
  };

  // Manejar importación de contactos de Apple
  const handleAppleContactsImport = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      if (!appleContactsFile) {
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

          // Usar la función de Firebase para importar contactos de Apple
          console.log("Importando contactos de Apple a Firebase");
          const importedClients = await importClientsFromVcf(vcfData);

          // Añadir los nuevos clientes a la lista
          setClients(prevClients => [...prevClients, ...importedClients]);

          toast({
            title: "Importación exitosa",
            description: `Se importaron ${importedClients.length} contactos de Apple.`
          });

          setShowImportDialog(false);
          setAppleContactsFile(null);
        } catch (error) {
          console.error('Error processing vCard file:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al procesar el archivo vCard"
          });
        }
      };

      reader.readAsText(appleContactsFile);
    } catch (error) {
      console.error('Error importing Apple contacts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron importar los contactos de Apple"
      });
    }
  };

  // Manejar apertura del formulario de edición
  const openEditForm = (client: Client) => {
    setCurrentClient(client);

    // Establecer valores del formulario
    clientForm.reset({
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
      classification: client.classification || "cliente", // Usar valor existente o predeterminado
      tags: client.tags || [],
    });

    setShowEditClientDialog(true);
  };

  // Abrir formulario para añadir un nuevo cliente
  const openAddForm = () => {
    console.log("Iniciando apertura del formulario para añadir cliente");
    setCurrentClient(null);
    clientForm.reset();
    // Eliminar el setTimeout que podría estar causando problemas
    setShowAddClientDialog(true);
    console.log("Estado de diálogo actualizado a:", true);
  };

  // Abrir diálogo de eliminación
  const openDeleteDialog = (client: Client) => {
    setCurrentClient(client);
    setShowDeleteDialog(true);
  };

  // Monitor cambios en los estados de los diálogos
  useEffect(() => {
    console.log("Estado del diálogo añadir cliente:", showAddClientDialog);
  }, [showAddClientDialog]);

  useEffect(() => {
    console.log("Estado del diálogo importar:", showImportDialog);
    console.log("Tipo de importación actual:", importType);
  }, [showImportDialog, importType]);

  // Generar una lista de clientes para la visualización
  if (isLoading) {
    return (
      <div className="page-container">
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

  if (clients.length === 0) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <UserPlus className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No hay clientes</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Aún no has agregado ningún cliente. Añade tu primer cliente para comenzar a gestionar tus contactos.
        </p>
        <div className="flex gap-4">
          <Button 
            onClick={() => {
              console.log("Botón Añadir Cliente pulsado");
              openAddForm();
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Añadir Cliente
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              console.log("Botón Importar Clientes pulsado");
              console.log("Estado actual del diálogo de importación:", showImportDialog);
              setShowImportDialog(true);
              console.log("Nuevo estado del diálogo de importación establecido a:", true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> Importar Clientes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            onClick={() => {
              console.log("Botón Añadir Cliente pulsado (vista principal)");
              openAddForm();
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Añadir Cliente
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              console.log("Botón Importar pulsado (vista principal)");
              console.log("Estado actual del diálogo de importación:", showImportDialog);
              // Actualizar directamente sin asincronía
              setShowImportDialog(true);
              console.log("Nuevo estado del diálogo de importación establecido a:", true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          {filteredClients.length > 0 && (
            <Button 
              variant="ghost" 
              onClick={() => {
                // Implementar exportación
                toast({
                  title: "Exportar Clientes",
                  description: "Función de exportación próximamente disponible"
                });
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, email, teléfono o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-72">
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas las etiquetas</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Source Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full md:w-auto flex flex-wrap">
            <TabsTrigger value="all">Todos</TabsTrigger>
            {allSources.map(source => (
              <TabsTrigger key={source} value={source}>
                {source}
              </TabsTrigger>
            ))}
            <TabsTrigger value="no_source">Sin fuente</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No se encontraron clientes con los filtros actuales</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => openEditForm(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive" 
                      onClick={() => openDeleteDialog(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center flex-wrap gap-1">
                  {client.classification && (
                    <Badge variant="secondary" className="mr-1">
                      {client.classification === "cliente" ? "Cliente" : 
                       client.classification === "proveedor" ? "Proveedor" : 
                       client.classification === "empleado" ? "Empleado" : 
                       client.classification === "subcontratista" ? "Subcontratista" : 
                       "Otro"}
                    </Badge>
                  )}
                  {client.source ? (
                    <Badge variant="outline" className="mr-1">
                      {client.source}
                    </Badge>
                  ) : null}
                  <span className="text-xs">
                    Desde {formatDate(client.createdAt)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {client.phone && (
                  <p className="text-sm mb-1 flex items-center">
                    <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                    {client.phone}
                    {client.mobilePhone && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Móvil: {client.mobilePhone}
                      </span>
                    )}
                  </p>
                )}
                {client.email && (
                  <p className="text-sm mb-1 flex items-center">
                    <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                    {client.email}
                  </p>
                )}
                {client.address && (
                  <p className="text-sm mb-1 flex items-center">
                    <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                    {client.address}
                    {client.city && client.state && (
                      <span>, {client.city}, {client.state}</span>
                    )}
                    {client.zipCode && <span> {client.zipCode}</span>}
                  </p>
                )}
                {client.notes && (
                  <p className="text-sm mt-2 text-muted-foreground italic">
                    "{client.notes.length > 100 
                      ? `${client.notes.substring(0, 97)}...` 
                      : client.notes}"
                  </p>
                )}
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {client.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex justify-start mt-4 gap-2">
                  <Button size="sm" variant="outline">
                    <Star className="mr-1 h-3 w-3" /> Crear Proyecto
                  </Button>
                  <Button size="sm" variant="ghost">
                    <FileSymlink className="mr-1 h-3 w-3" /> Ver Historial
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog 
        open={showAddClientDialog} 
        onOpenChange={(open) => {
          if (!open) {
            clientForm.reset();
          }
          setShowAddClientDialog(open);
        }}
        modal={true}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Añadir Cliente</DialogTitle>
            <DialogDescription>
              Ingresa la información del nuevo cliente.
            </DialogDescription>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleClientFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="correo@ejemplo.com" {...field} />
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
                        <Input placeholder="(503) 555-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="mobilePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono Móvil</FormLabel>
                      <FormControl>
                        <Input placeholder="(503) 555-5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(address, details) => {
                            field.onChange(address);
                            if (details) {
                              clientForm.setValue('city', details.city || '');
                              clientForm.setValue('state', details.state || '');
                              clientForm.setValue('zipCode', details.zipCode || '');
                            }
                          }}
                          placeholder="123 Calle Principal"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={clientForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ciudad" {...field} readOnly />
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
                          <Input placeholder="OR" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={clientForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="97204" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origen</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar origen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Referido">Referido</SelectItem>
                          <SelectItem value="Página web">Página web</SelectItem>
                          <SelectItem value="Google">Google</SelectItem>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="classification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clasificación</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar clasificación" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="proveedor">Proveedor</SelectItem>
                          <SelectItem value="empleado">Empleado</SelectItem>
                          <SelectItem value="subcontratista">Subcontratista</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={clientForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el cliente" 
                        className="min-h-[100px]"
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
                  onClick={() => {
                    console.log("Botón Cancelar pulsado");
                    setShowAddClientDialog(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  onClick={() => console.log("Botón Guardar Cliente pulsado")}
                >
                  Guardar Cliente
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditClientDialog} onOpenChange={setShowEditClientDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Actualiza la información del cliente.
            </DialogDescription>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleClientFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="correo@ejemplo.com" {...field} />
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
                        <Input placeholder="(503) 555-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="mobilePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono Móvil</FormLabel>
                      <FormControl>
                        <Input placeholder="(503) 555-5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(address, details) => {
                            field.onChange(address);
                            if (details) {
                              clientForm.setValue('city', details.city || '');
                              clientForm.setValue('state', details.state || '');
                              clientForm.setValue('zipCode', details.zipCode || '');
                            }
                          }}
                          placeholder="123 Calle Principal"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={clientForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ciudad" {...field} readOnly />
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
                          <Input placeholder="OR" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={clientForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="97204" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origen</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar origen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Sin origen</SelectItem>
                          <SelectItem value="Referido">Referido</SelectItem>
                          <SelectItem value="Página web">Página web</SelectItem>
                          <SelectItem value="Google">Google</SelectItem>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="classification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clasificación</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "cliente"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar clasificación" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="proveedor">Proveedor</SelectItem>
                          <SelectItem value="empleado">Empleado</SelectItem>
                          <SelectItem value="subcontratista">Subcontratista</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={clientForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el cliente" 
                        className="min-h-[100px]"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a {currentClient?.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
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

      {/* Import Dialog */}
      <Dialog 
        open={showImportDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setCsvFile(null);
            setAppleContactsFile(null);
          }
          setShowImportDialog(open);
        }}
        modal={true}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Clientes</DialogTitle>
            <DialogDescription>
              Importa clientes desde un archivo CSV o desde tus contactos de Apple.
            </DialogDescription>
          </DialogHeader>
          <Tabs 
            value={importType} 
            onValueChange={(value) => setImportType(value as "csv" | "apple")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="csv">Archivo CSV</TabsTrigger>
              <TabsTrigger value="apple">Contactos Apple</TabsTrigger>
            </TabsList>
            <TabsContent value="csv">
              <Form {...csvImportForm}>
                <form onSubmit={csvImportForm.handleSubmit(handleCsvImport)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Archivo CSV</Label>
                    <Input 
                      id="csv-file" 
                      type="file" 
                      accept=".csv" 
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      El archivo CSV debe incluir una fila de encabezado con nombres de columnas como:
                      Nombre, Email, Teléfono, Dirección, etc.
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <h4 className="text-sm font-medium mb-2">Ejemplo de formato CSV:</h4>
                    <code className="text-xs">
                      Nombre,Email,Teléfono,Dirección,Ciudad,Estado,Código Postal<br />
                      Juan Pérez,juan@ejemplo.com,(503) 555-1234,123 Calle Principal,Portland,OR,97204
                    </code>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log("Botón Cancelar Import CSV pulsado");
                        setShowImportDialog(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!csvFile}
                      onClick={() => console.log("Botón Importar CSV pulsado")}
                    >
                      Importar Clientes
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="apple">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apple-vcard-file">Archivo vCard (.vcf)</Label>
                  <Input 
                    id="apple-vcard-file" 
                    type="file" 
                    accept=".vcf" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setAppleContactsFile(e.target.files[0]);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exporta tus contactos de la app de Contactos de Apple como archivo .vcf y súbelo aquí.
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <h4 className="text-sm font-medium mb-2">Cómo exportar contactos desde Apple:</h4>
                  <ol className="text-xs space-y-1 text-muted-foreground list-decimal pl-4">
                    <li>Abre la app Contactos en tu iPhone/iPad o Mac</li>
                    <li>Selecciona los contactos que deseas exportar</li>
                    <li>Selecciona Archivo &gt; Exportar &gt; Exportar vCard</li>
                    <li>Guarda el archivo .vcf y luego súbelo aquí</li>
                  </ol>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      console.log("Botón Cancelar Import Apple pulsado");
                      setShowImportDialog(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    disabled={!appleContactsFile}
                    onClick={(e) => {
                      console.log("Botón Importar Contactos Apple pulsado");
                      handleAppleContactsImport(e);
                    }}
                  >
                    Importar Contactos
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}