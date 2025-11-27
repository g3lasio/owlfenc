import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  getClients,
  createClient,
  updateClient,
  deleteClient,
  deleteClientsBatch,
  importClientsFromCsvWithAI,
  importClientsFromVcf,
  type Client
} from "../services/clientService";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Upload, Search, Filter, Grid, List, Plus, Trash2 } from "lucide-react";
import { ClientForm, type ClientFormData } from "../components/clients/ClientForm";
import { ClientCard } from "../components/clients/ClientCard";
import { ClientDetailModal } from "../components/clients/ClientDetailModal";
import { ExportClientsButton } from "../components/clients/ExportClientsButton";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  
  // Loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

  const { toast } = useToast();

  // Cargar clientes al inicio
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        console.log("🔄 [CLIENTES] Cargando clientes desde Firebase...");
        const data = await getClients();
        console.log("✅ [CLIENTES] Clientes cargados exitosamente:", data.length);
        setClients(data);
        setFilteredClients(data);
      } catch (error) {
        console.error("Error loading clients:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los clientes"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [toast]);

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

  // Manejar creación de cliente
  const handleCreateClient = async (data: ClientFormData) => {
    try {
      console.log("🔄 [CLIENTES] Creando cliente:", data);
      const newClient = await createClient(data);
      console.log("✅ [CLIENTES] Cliente creado exitosamente:", newClient);
      
      setClients(prev => [...prev, newClient]);
      setShowAddDialog(false);
      
      toast({
        title: "Cliente creado",
        description: `${data.name} ha sido agregado exitosamente.`
      });
    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el cliente"
      });
    }
  };

  // Manejar actualización de cliente
  const handleUpdateClient = async (data: ClientFormData) => {
    if (!currentClient) return;

    try {
      console.log("🔄 [CLIENTES] Actualizando cliente:", currentClient.id, data);
      const updatedClient = await updateClient(currentClient.id, data);
      console.log("✅ [CLIENTES] Cliente actualizado exitosamente:", updatedClient);
      
      setClients(prev => prev.map(client => 
        client.id === currentClient.id ? updatedClient : client
      ));
      setShowEditDialog(false);
      setCurrentClient(null);
      
      toast({
        title: "Cliente actualizado",
        description: `${data.name} ha sido actualizado exitosamente.`
      });
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el cliente"
      });
    }
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = async () => {
    if (!currentClient) return;

    setIsDeleting(true);
    const clientName = currentClient.name;
    const clientId = currentClient.id;
    
    // Cerrar diálogo inmediatamente para dar feedback visual
    setShowDeleteDialog(false);
    setCurrentClient(null);

    try {
      console.log("🔄 [CLIENTES] Eliminando cliente:", clientId);
      
      // Actualización optimista - eliminar del estado local primero
      setClients(prev => prev.filter(client => client.id !== clientId));
      
      // Luego eliminar del servidor
      await deleteClient(clientId);
      console.log("✅ [CLIENTES] Cliente eliminado exitosamente");
      
      toast({
        title: "Cliente eliminado",
        description: `${clientName} ha sido eliminado.`
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      // Revertir cambio optimista si falla - recargar clientes
      const data = await getClients();
      setClients(data);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el cliente"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Manejar eliminación masiva de todos los clientes
  const handleDeleteAllClients = async () => {
    if (clients.length === 0) return;
    
    setIsDeletingAll(true);
    setDeleteProgress({ current: 0, total: clients.length });
    
    try {
      const clientIds = clients.map(c => c.id);
      console.log(`🗑️ [CLIENTES] Iniciando eliminación masiva de ${clientIds.length} clientes...`);
      
      const result = await deleteClientsBatch(clientIds);
      
      console.log(`✅ [CLIENTES] Eliminación masiva completada: ${result.deleted}/${result.total}`);
      
      // Limpiar estado local
      setClients([]);
      setFilteredClients([]);
      setShowDeleteAllDialog(false);
      
      toast({
        title: "Contactos eliminados",
        description: `Se eliminaron ${result.deleted} contactos exitosamente.`
      });
    } catch (error) {
      console.error("Error eliminando contactos:", error);
      // Recargar clientes en caso de error
      const data = await getClients();
      setClients(data);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron eliminar todos los contactos"
      });
    } finally {
      setIsDeletingAll(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
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
          
          const allClients = await getClients();
          setClients(allClients);
          setFilteredClients(allClients);
          
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
          
          const allClients = await getClients();
          setClients(allClients);
          setFilteredClients(allClients);
          
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
          {clients.length > 0 && (
            <Button 
              onClick={() => setShowDeleteAllDialog(true)} 
              variant="destructive"
              size="sm"
              disabled={isDeletingAll}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeletingAll ? `Eliminando...` : `Eliminar Todos (${clients.length})`}
            </Button>
          )}
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

      {/* Delete ALL Confirmation Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Eliminar TODOS los Contactos</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>¿Estás seguro de que quieres eliminar <strong>{clients.length} contactos</strong>?</p>
              <p className="text-red-500 font-medium">Esta acción NO se puede deshacer.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)} disabled={isDeletingAll}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAllClients}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? `Eliminando ${clients.length} contactos...` : `Sí, Eliminar ${clients.length} Contactos`}
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
