import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { 
  type Client,
  type ClientInput,
  importClientsFromCsvWithAI,
  importClientsFromVcf
} from "../services/clientService";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Upload, Search, Filter, Grid, List, Plus } from "lucide-react";
import { ClientForm, type ClientFormData } from "../components/clients/ClientForm";
import { ClientCard } from "../components/clients/ClientCard";
import { ClientDetailModal } from "../components/clients/ClientDetailModal";
import { ExportClientsButton } from "../components/clients/ExportClientsButton";

export default function Clients() {
  // 🚀 CONSOLIDATION: Using TanStack Query instead of Firebase useState + useEffect
  const { user: currentUser } = useAuth();
  
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("_all");
  const [selectedClassification, setSelectedClassification] = useState("_all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);

  // Import states
  const [importType, setImportType] = useState<"csv" | "apple">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [appleContactsFile, setAppleContactsFile] = useState<File | null>(null);

  const { toast } = useToast();

  // 🚀 TANSTACK QUERY for loading clients - replacing Firebase useEffect
  const {
    data: clients = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      console.log("🔄 [CLIENTS] Loading clients via /api/clients...");
      
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/clients", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load clients: ${response.status}`);
      }

      const clientsData: Client[] = await response.json();
      console.log("✅ [CLIENTS] Loaded clients:", clientsData.length);
      return clientsData;
    },
    enabled: !!currentUser, // Only run when user is authenticated
  });

  // 🚀 TANSTACK QUERY MUTATIONS - replacing Firebase CRUD operations
  const createClientMutation = useMutation({
    mutationFn: async (clientData: ClientInput) => {
      console.log("🔄 Creating client via /api/clients POST...");
      
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/clients", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create client: ${response.status}`);
      }

      const newClient: Client = await response.json();
      console.log("✅ Client created:", newClient);
      return newClient;
    },
    onSuccess: () => {
      // Invalidate and refetch clients
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowAddDialog(false);
      toast({
        title: "Cliente creado",
        description: "El cliente ha sido agregado exitosamente."
      });
    },
    onError: (error) => {
      console.error("❌ Error creating client:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el cliente"
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, clientData }: { id: string; clientData: Partial<ClientInput> }) => {
      console.log("🔄 Updating client via /api/clients PUT...");
      
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update client: ${response.status}`);
      }

      const updatedClient: Client = await response.json();
      console.log("✅ Client updated:", updatedClient);
      return updatedClient;
    },
    onSuccess: () => {
      // Invalidate and refetch clients
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowEditDialog(false);
      setCurrentClient(null);
      toast({
        title: "Cliente actualizado",
        description: "El cliente ha sido actualizado exitosamente."
      });
    },
    onError: (error) => {
      console.error("❌ Error updating client:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el cliente"
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      console.log("🔄 Deleting client via /api/clients DELETE...");
      
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete client: ${response.status}`);
      }

      console.log("✅ Client deleted:", clientId);
      return clientId;
    },
    onSuccess: () => {
      // Invalidate and refetch clients
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowDeleteDialog(false);
      setCurrentClient(null);
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente."
      });
    },
    onError: (error) => {
      console.error("❌ Error deleting client:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el cliente"
      });
    },
  });

  // Filtrar clientes
  useEffect(() => {
    let filtered = clients;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm) ||
        client.mobilePhone?.includes(searchTerm) ||
        client.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por etiqueta
    if (selectedTag !== "_all") {
      filtered = filtered.filter(client => 
        client.tags?.includes(selectedTag)
      );
    }

    // Filtro por clasificación
    if (selectedClassification !== "_all") {
      filtered = filtered.filter(client => 
        (client.classification || "cliente") === selectedClassification
      );
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm, selectedTag, selectedClassification]);

  // Obtener tags únicos
  const uniqueTags = Array.from(
    new Set(clients.flatMap(client => client.tags || []))
  ).sort();

  // 🚀 CONSOLIDATION: Handle functions using TanStack Query mutations
  const handleCreateClient = async (data: ClientFormData) => {
    // Mapear datos del formulario a ClientInput
    const clientData: ClientInput = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      // Campos opcionales del clientService
      mobilePhone: null,
      city: null,
      state: null,
      zipCode: null,
      notes: null,
      source: "manual_entry",
      classification: "cliente",
      tags: null,
    };
    
    createClientMutation.mutate(clientData);
  };

  const handleUpdateClient = async (data: ClientFormData) => {
    if (!currentClient) return;

    // Mapear datos del formulario a ClientInput
    const clientData: Partial<ClientInput> = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    };
    
    updateClientMutation.mutate({ id: currentClient.id, clientData });
  };

  const handleDeleteClient = async () => {
    if (!currentClient) return;
    
    deleteClientMutation.mutate(currentClient.id);
  };

  // Manejar importación CSV
  const handleCsvImport = async () => {
    if (!csvFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvData = e.target?.result as string;
          console.log("🔄 [CLIENTES] Importando desde CSV...");
          
          const importedClients = await importClientsFromCsvWithAI(csvData);
          console.log("✅ [CLIENTES] Importación CSV inteligente exitosa:", importedClients.length);
          
          // Invalidate and refetch clients after CSV import
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
          
          toast({
            title: "Importación inteligente exitosa",
            description: `Se procesaron ${importedClients.length} clientes usando IA para mapeo inteligente.`
          });
          
          setShowImportDialog(false);
          setCsvFile(null);
        } catch (error) {
          console.error('Error processing CSV file:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al procesar el archivo CSV"
          });
        }
      };
      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron importar los datos CSV"
      });
    }
  };

  // Manejar importación de contactos de Apple
  const handleAppleContactsImport = async () => {
    if (!appleContactsFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const vcfData = e.target?.result as string;
          console.log("🔄 [CLIENTES] Importando contactos de Apple...");
          
          const importedClients = await importClientsFromVcf(vcfData);
          console.log("✅ [CLIENTES] Importación Apple exitosa:", importedClients.length);
          
          // Invalidate and refetch clients after Apple contacts import
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
          
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

  // Manejar creación de proyecto
  const handleCreateProject = (client: Client) => {
    // TODO: Implementar navegación a página de proyectos con cliente pre-seleccionado
    toast({
      title: "Función en desarrollo",
      description: `Crear proyecto para ${client.name} estará disponible pronto.`
    });
  };

  // Manejar ver historial
  const handleViewHistory = (client: Client) => {
    // TODO: Implementar navegación a página de historial del cliente
    toast({
      title: "Función en desarrollo", 
      description: `Historial de ${client.name} estará disponible pronto.`
    });
  };

  // Loading state
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
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
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
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Añadir Cliente
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar Clientes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex items-center gap-2">
          <ExportClientsButton clients={filteredClients} />
          <Button onClick={() => setShowImportDialog(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Cliente
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
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
          <Select value={selectedClassification} onValueChange={setSelectedClassification}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Clasificación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas las clasificaciones</SelectItem>
              <SelectItem value="cliente">Clientes</SelectItem>
              <SelectItem value="proveedor">Proveedores</SelectItem>
              <SelectItem value="empleado">Empleados</SelectItem>
              <SelectItem value="subcontratista">Subcontratistas</SelectItem>
              <SelectItem value="prospecto">Prospectos</SelectItem>
            </SelectContent>
          </Select>
          {uniqueTags.length > 0 && (
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas las etiquetas</SelectItem>
                {uniqueTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredClients.length} de {clients.length} clientes
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className={`grid gap-4 ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onEdit={(client) => {
              setCurrentClient(client);
              setShowEditDialog(true);
            }}
            onDelete={(client) => {
              setCurrentClient(client);
              setShowDeleteDialog(true);
            }}
            onView={(client) => {
              setCurrentClient(client);
              setShowDetailModal(true);
            }}
            onCreateProject={handleCreateProject}
            onViewHistory={handleViewHistory}
          />
        ))}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir Cliente</DialogTitle>
            <DialogDescription>
              Ingresa la información del nuevo cliente.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            onSubmit={handleCreateClient}
            submitButtonText="Crear Cliente"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Modifica la información del cliente.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            initialData={currentClient ? {
              name: currentClient.name,
              email: currentClient.email || "",
              phone: currentClient.phone || "",
              mobilePhone: currentClient.mobilePhone || "",
              address: currentClient.address || "",
              city: currentClient.city || "",
              state: currentClient.state || "",
              zipCode: currentClient.zipCode || "",
              notes: currentClient.notes || "",
              source: currentClient.source || "",
              classification: currentClient.classification || "cliente",
              tags: currentClient.tags || [],
            } : undefined}
            onSubmit={handleUpdateClient}
            submitButtonText="Actualizar Cliente"
          />
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
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Detail Modal */}
      <ClientDetailModal
        client={currentClient}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setCurrentClient(null);
        }}
        onEdit={(client) => {
          setCurrentClient(client);
          setShowDetailModal(false);
          setShowEditDialog(true);
        }}
        onDelete={(client) => {
          setCurrentClient(client);
          setShowDetailModal(false);
          setShowDeleteDialog(true);
        }}
        onCreateProject={handleCreateProject}
        onViewHistory={handleViewHistory}
      />

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Clientes</DialogTitle>
            <DialogDescription>
              Importa clientes desde un archivo CSV o desde tus contactos de Apple.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={importType} onValueChange={(value) => setImportType(value as "csv" | "apple")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="csv">Archivo CSV</TabsTrigger>
              <TabsTrigger value="apple">Contactos Apple</TabsTrigger>
            </TabsList>
            
            <TabsContent value="csv" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Archivo CSV</Label>
                <Input 
                  id="csv-file" 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
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
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCsvImport} disabled={!csvFile}>
                  Importar CSV
                </Button>
              </DialogFooter>
            </TabsContent>
            
            <TabsContent value="apple" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apple-vcard-file">Archivo vCard (.vcf)</Label>
                <Input 
                  id="apple-vcard-file" 
                  type="file" 
                  accept=".vcf" 
                  onChange={(e) => setAppleContactsFile(e.target.files?.[0] || null)}
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
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAppleContactsImport} disabled={!appleContactsFile}>
                  Importar Contactos
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

// Interfaz de cliente importada desde el servicio unificado

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
