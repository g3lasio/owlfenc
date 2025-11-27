import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  FileSymlink,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  UserPlus,
  Upload,
  Download,
  Search,
  X,
  Tag,
  Filter,
  List,
  Grid,
  Sliders,
  AlertTriangle,
  CheckCircle,
  CircleAlert,
  Wrench,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { apiRequest } from "@/lib/queryClient";
// Importaciones del servicio de clientes unificado
import {
  getClients,
  createClient as saveClient,
  updateClient,
  deleteClient,
  importClientsFromCsv,
  importClientsFromVcf,
  importClientsFromCsvWithAI
} from "../services/clientService";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";


// Interfaces
interface Client {
  id: string; // En Firebase, el ID es un string
  userId?: string; // Usuario propietario del cliente
  clientId: string; // Identificador único del cliente
  name: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  source?: string | null;
  tags?: string[] | null;
  classification?: string | null | undefined;
  lastContact?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// Componente de dirección con autocompletado de Mapbox reemplaza el AddressInput básico
// El AddressAutocomplete está importado desde @/components/ui/address-autocomplete

// Schemas para la validación de formularios
const clientFormSchema = z.object({
  userId: z.string().optional(),
  clientId: z.string().optional(),
  name: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  email: z
    .string()
    .email({ message: "Correo electrónico inválido" })
    .optional()
    .or(z.literal("")),
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
  csvData: z
    .string()
    .min(1, { message: "Por favor selecciona un archivo CSV" }),
});

export default function NuevoClientes() {
  const { profile } = useProfile();
  // ✅ USAR Firebase UID en lugar de profile.id
  const firebaseUserId = localStorage.getItem('firebase_user_id');
  const userId = firebaseUserId || profile?.id?.toString() || "1";
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

  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [importType, setImportType] = useState<"csv" | "vcf">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [vcfFile, setVcfFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Estados para la herramienta de reparación
  const [showRepairDialog, setShowRepairDialog] = useState(false);
  const [repairDiagnostics, setRepairDiagnostics] = useState<any>(null);
  const [repairResults, setRepairResults] = useState<any>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Consulta para obtener clientes desde Firebase CON userId correcto
  const {
    data: clients = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["firebaseClients", userId], // Incluir userId en la key
    queryFn: async () => {
      try {
        console.log("Obteniendo clientes desde Firebase para usuario:", userId);
        const data = await getClients(userId); // ✅ PASAR userId
        console.log("Clientes obtenidos:", data);
        return data;
      } catch (err) {
        console.error("Error al obtener clientes de Firebase:", err);
        throw err;
      }
    },
    enabled: !!userId, // Solo ejecutar si tenemos userId
  });

  // Mutation para crear un cliente usando Firebase
  const createClientMutation = useMutation({
    mutationFn: (newClient: any) => saveClient(newClient),
    onSuccess: () => {
      toast({
        title: "Cliente añadido",
        description: "El cliente ha sido añadido correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["firebaseClients", userId] });
      setShowAddClientDialog(false);
      clientForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "No se pudo añadir el cliente: " +
          (error.message || "Error desconocido"),
      });
    },
  });

  // Handler para crear cliente
  const handleCreateClient = (data: z.infer<typeof clientFormSchema>) => {
    const newClient = {
      ...data,
      clientId: `client_${Date.now()}`,
      userId: userId,
    };
    createClientMutation.mutate(newClient);
  };

  // Mutation para actualizar un cliente usando Firebase
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateClient(id, data),
    onSuccess: () => {
      toast({
        title: "Cliente actualizado",
        description: "El cliente ha sido actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["firebaseClients", userId] });
      setShowEditClientDialog(false);
      setCurrentClient(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "No se pudo actualizar el cliente: " +
          (error.message || "Error desconocido"),
      });
    },
  });

  // Mutation para eliminar un cliente usando Firebase
  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["firebaseClients", userId] });
      setShowDeleteDialog(false);
      setCurrentClient(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "No se pudo eliminar el cliente: " +
          (error.message || "Error desconocido"),
      });
    },
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
    const clientsArray = Array.isArray(clients) ? clients : [];

    let result = [...clientsArray];

    // Filtrar por texto de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (client) =>
          (client.name && client.name.toLowerCase().includes(term)) ||
          (client.email && client.email.toLowerCase().includes(term)) ||
          (client.phone && client.phone.includes(term)) ||
          (client.address && client.address.toLowerCase().includes(term)),
      );
    }

    // Filtrar por etiquetas seleccionadas
    if (selectedTags.length > 0) {
      result = result.filter(
        (client) =>
          client.tags &&
          selectedTags.every((tag) => client.tags?.includes(tag)),
      );
    }

    // Filtrar por fuente
    if (activeTab !== "all") {
      if (activeTab === "no_source") {
        result = result.filter((client) => !client.source);
      } else {
        result = result.filter((client) => client.source === activeTab);
      }
    }

    setFilteredClients(result);
  }, [searchTerm, selectedTags, activeTab, clients]);

  // Obtener todas las etiquetas únicas
  const allTags =
    clients && Array.isArray(clients)
      ? clients.reduce((tags: string[], client) => {
          if (client.tags) {
            client.tags.forEach((tag: string) => {
              if (!tags.includes(tag)) {
                tags.push(tag);
              }
            });
          }
          return tags;
        }, [])
      : [];

  // Obtener todas las fuentes únicas
  const allSources =
    clients && Array.isArray(clients)
      ? clients.reduce((sources: string[], client) => {
          if (client.source && !sources.includes(client.source)) {
            sources.push(client.source);
          }
          return sources;
        }, [])
      : [];

  // Función para formatear la fecha
  const formatDate = (date: Date | string) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 🔧 FUNCIONES DE DIAGNÓSTICO Y REPARACIÓN DE CONTACTOS
  const handleDiagnoseContacts = async () => {
    setIsDiagnosing(true);
    setRepairDiagnostics(null);
    setRepairResults(null);
    
    try {
      const response = await apiRequest('/api/clients/repair/diagnose', {
        method: 'GET',
      });
      
      setRepairDiagnostics(response);
      
      if (response.diagnostics?.corruptedClients?.length === 0) {
        toast({
          title: "Sin problemas detectados",
          description: "Todos tus contactos tienen datos correctos.",
        });
      } else {
        toast({
          title: "Diagnóstico completado",
          description: `Se encontraron ${response.diagnostics?.corruptedClients?.length || 0} contactos con posibles problemas.`,
        });
      }
    } catch (error: any) {
      console.error("Error en diagnóstico:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo realizar el diagnóstico: " + (error.message || "Error desconocido"),
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRepairContacts = async (dryRun: boolean = true) => {
    setIsRepairing(true);
    
    try {
      const response = await apiRequest('/api/clients/repair/auto-fix', {
        method: 'POST',
        body: JSON.stringify({ dryRun }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      setRepairResults(response);
      
      if (!dryRun && response.repairsNeeded > 0) {
        // Refrescar la lista de clientes después de reparar - usar el queryKey completo con userId
        queryClient.invalidateQueries({ queryKey: ["firebaseClients", userId] });
        
        toast({
          title: "Reparación completada",
          description: `${response.repairsNeeded} contactos fueron reparados exitosamente.`,
        });
      } else if (dryRun) {
        toast({
          title: "Simulación completada",
          description: response.repairsNeeded > 0 
            ? `${response.repairsNeeded} contactos necesitan reparación. Haz clic en "Aplicar reparaciones" para corregirlos.`
            : "No se necesitan reparaciones.",
        });
      }
    } catch (error: any) {
      console.error("Error en reparación:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo realizar la reparación: " + (error.message || "Error desconocido"),
      });
    } finally {
      setIsRepairing(false);
    }
  };

  // Manejar envío del formulario de cliente
  const handleClientFormSubmit = async (
    values: z.infer<typeof clientFormSchema>,
  ) => {
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
        data: clientData,
      });
    } else {
      // Generar un ID único para el cliente
      const clientId = `client_${Date.now()}`;

      // Crear nuevo cliente
      createClientMutation.mutate({
        ...clientData,
        clientId,
      });
    }
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = () => {
    if (!currentClient) return;
    deleteClientMutation.mutate(currentClient.id);
  };

  // Manejar importación CSV con IA inteligente
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csvFile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona un archivo CSV",
      });
      return;
    }

    setIsAiProcessing(true);

    try {
      console.log("🤖 Iniciando importación inteligente con IA...");
      
      // Leer el archivo CSV
      const reader = new FileReader();
      const csvContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result && typeof e.target.result === 'string') {
            resolve(e.target.result);
          } else {
            reject(new Error('No se pudo leer el archivo'));
          }
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsText(csvFile);
      });
      
      // Usar la función de importación con IA que incluye autenticación
      const importedClients = await importClientsFromCsvWithAI(csvContent);
      console.log("✅ [CLIENTES] Importación CSV inteligente exitosa:", importedClients.length);
      
      // Actualizar lista de clientes
      queryClient.invalidateQueries({ queryKey: ["firebaseClients", userId] });

      toast({
        title: "✨ Importación inteligente completada",
        description: `Se importaron ${importedClients.length} clientes usando IA con mapeo inteligente.`,
      });

      setShowImportDialog(false);
      setCsvFile(null);

    } catch (error: any) {
      console.error("Error en importación inteligente:", error);
      
      toast({
        variant: "destructive",
        title: "Error en importación inteligente",
        description: error.message || "Error desconocido durante la importación con IA",
      });
    } finally {
      setIsAiProcessing(false);
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
          description: "Por favor selecciona un archivo vCard (.vcf)",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target || typeof e.target.result !== "string") return;

        try {
          const vcfData = e.target.result;

          // Procesar datos vCard (formato .vcf)
          const vCards = vcfData
            .split("END:VCARD")
            .filter((card) => card.trim().length > 0)
            .map((card) => card + "END:VCARD");

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
                  const addressParts = addressMatch[1].split(";");
                  // Formato típico: ;;calle;ciudad;estado;código postal;país
                  address = addressParts
                    .slice(2)
                    .filter((part) => part.trim())
                    .join(", ");
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
                await apiRequest.post("/api/clients", clientData);
                importedCount++;
              }
            } catch (cardError) {
              console.error("Error processing individual vCard:", cardError);
              // Continuar con la siguiente tarjeta
            }
          }

          // Actualizar lista de clientes
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });

          toast({
            title: "Importación exitosa",
            description: `Se importaron ${importedCount} contactos de vCard.`,
          });

          setShowImportDialog(false);
          setVcfFile(null);
        } catch (error: any) {
          console.error("Error processing vCard file:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description:
              "Error al procesar el archivo vCard: " +
              (error.message || "Error desconocido"),
          });
        }
      };

      reader.readAsText(vcfFile);
    } catch (error: any) {
      console.error("Error importing vCard contacts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "No se pudieron importar los contactos: " +
          (error.message || "Error desconocido"),
      });
    }
  };

  // Manejar selección de archivo
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "csv" | "vcf",
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      if (type === "csv") {
        setCsvFile(e.target.files[0]);
        csvImportForm.setValue("csvData", "Archivo seleccionado");
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

  // Manejar selección de cliente individual
  const handleClientSelection = (clientId: string) => {
    setSelectedClients((prev) => {
      if (prev.includes(clientId)) {
        // Si ya está seleccionado, lo quitamos
        return prev.filter((id) => id !== clientId);
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
      setSelectedClients(filteredClients.map((client) => client.id));
    }
    setSelectAllChecked(!selectAllChecked);
  };

  // Abrir diálogo de eliminación masiva
  const openBatchDeleteDialog = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Selección vacía",
        description: "Por favor, selecciona al menos un contacto para eliminar",
        variant: "destructive",
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
      queryClient.invalidateQueries({ queryKey: ["firebaseClients", userId] });

      toast({
        title: "Eliminación exitosa",
        description: `Se han eliminado ${selectedClients.length} contactos`,
      });

      // Limpiar selección y cerrar diálogo
      setSelectedClients([]);
      setSelectAllChecked(false);
      setShowBatchDeleteDialog(false);
    } catch (error) {
      console.error("Error al eliminar clientes en lote:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudieron eliminar algunos contactos",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejar entrada de etiquetas
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();

      // Obtener etiquetas actuales
      const currentTags = clientForm.getValues("tags") || [];

      // Añadir la nueva etiqueta si no existe
      if (!currentTags.includes(tagInput.trim())) {
        clientForm.setValue("tags", [...currentTags, tagInput.trim()]);
      }

      // Limpiar el campo de entrada
      setTagInput("");
    }
  };

  // Eliminar una etiqueta
  const removeTag = (tag: string) => {
    const currentTags = clientForm.getValues("tags") || [];
    clientForm.setValue(
      "tags",
      currentTags.filter((t) => t !== tag),
    );
  };

  // Agregar o quitar una etiqueta del filtro
  const toggleTagFilter = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
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
      <div
        className="flex-1  p-6 page-scroll-container"
        style={{ WebkitOverflowScrolling: "touch", height: "100%" }}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <div className="flex gap-2">
            <Dialog
              open={showAddClientDialog}
              onOpenChange={setShowAddClientDialog}
            >
              <DialogTrigger asChild>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear nuevo cliente</DialogTitle>
                  <DialogDescription>
                    Añade la información del nuevo cliente.
                  </DialogDescription>
                </DialogHeader>

                <Form {...clientForm}>
                  <form
                    onSubmit={clientForm.handleSubmit(handleCreateClient)}
                    className="space-y-4"
                  >
                    <FormField
                      control={clientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan Pérez" {...field} />
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
                              <Input placeholder="juan@email.com" {...field} />
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
                              <Input
                                placeholder="+1 (555) 123-4567"
                                {...field}
                              />
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
                            <Input
                              placeholder="123 Calle Principal"
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
                      <Button
                        type="submit"
                        disabled={createClientMutation.isPending}
                        className="bg-cyan-500 hover:bg-cyan-600"
                      >
                        {createClientMutation.isPending
                          ? "Guardando..."
                          : "Guardar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <p className="font-medium mb-2">
              No se pudieron cargar los clientes existentes
            </p>
            <p className="text-sm mb-3">
              Esto puede deberse a problemas de conectividad o configuración de
              la base de datos. Puedes crear nuevos clientes que se guardarán
              una vez que se resuelva la conexión.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["/api/clients"] })
                }
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Reintentar
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-1">
                Comenzar agregando clientes
              </h3>
              <p className="text-gray-500 mb-4">
                Crea tu primer cliente para comenzar a generar estimados.
              </p>
              <Button
                onClick={() => setShowAddClientDialog(true)}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Crear mi primer cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generar una lista de clientes para la visualización
  if (isLoading) {
    return (
      <div
        className="flex-1 p-6 "
        style={{ WebkitOverflowScrolling: "touch", height: "100%" }}
      >
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
    <div
      className=" mb-52 flex-1 p-6 "
      style={{ WebkitOverflowScrolling: "touch", height: "100%" }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Clients</h1>
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

          <Button 
            variant="outline" 
            onClick={() => {
              setShowRepairDialog(true);
              setRepairDiagnostics(null);
              setRepairResults(null);
            }}
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Reparar Contactos
          </Button>

          <Button onClick={openAddForm}>
            <UserPlus className="w-4 h-4 mr-2" />
            New Client
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
            <div className="text-sm text-muted-foreground mr-2">
              Filtrar por etiquetas:
            </div>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
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
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4  flex w-full">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="no_source">Sin fuente</TabsTrigger>
              {allSources.map((source) => (
                <TabsTrigger key={source} value={source}>
                  {source}
                </TabsTrigger>
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
          {filteredClients.map((client) => (
            <Card key={client.id} className="">
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
                    <Badge variant="outline" className="mt-1">
                      {client.source}
                    </Badge>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {client.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a
                        href={`mailto:${client.email}`}
                        className="truncate hover:underline"
                      >
                        {client.email}
                      </a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a
                        href={`tel:${client.phone}`}
                        className="hover:underline"
                      >
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
                      <span>
                        Último contacto: {formatDate(client.lastContact)}
                      </span>
                    </div>
                  )}
                </div>
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {client.tags.map((tag) => (
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
        <div className="border rounded-md ">
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
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Contacto
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                  Dirección
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                  Fuente
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClients.map((client) => (
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
                        {client.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
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
                        <a
                          href={`mailto:${client.email}`}
                          className="truncate hover:underline"
                        >
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                        <a
                          href={`tel:${client.phone}`}
                          className="hover:underline"
                        >
                          {client.phone}
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm truncate hidden md:table-cell max-w-[200px]">
                    {client.address || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">
                    {client.source ? (
                      <Badge variant="outline">{client.source}</Badge>
                    ) : (
                      "—"
                    )}
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

      {/* Add New Client Dialog - Fixed Scrolling */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header - Fixed */}
          <div className="px-6 py-4 border-b bg-background shrink-0">
            <DialogTitle className="text-lg font-semibold">
              Add New Client
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Complete the client information. Only the name is required.
            </DialogDescription>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-6 py-4">
            <Form {...clientForm}>
              <form
                onSubmit={clientForm.handleSubmit(handleClientFormSubmit)}
                className="space-y-6 pr-3"
              >
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <UserPlus className="h-4 w-4" />
                    Basic Information
                  </div>

                  <FormField
                    control={clientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Client full name"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={clientForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="email@example.com"
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
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            Phone
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 123-4567"
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

                {/* Address Information */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MapPin className="h-4 w-4" />
                    Address
                  </div>

                  <FormField
                    control={clientForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Street Address
                        </FormLabel>
                        <FormControl>
                          <AddressAutocomplete
                            value={field.value || ""}
                            onChange={(value) => field.onChange(value)}
                            placeholder="Street address, apartment, suite, etc."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={clientForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            City
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="City"
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
                          <FormLabel className="text-sm font-medium">
                            State
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="State"
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
                          <FormLabel className="text-sm font-medium">
                            ZIP Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ZIP"
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

                {/* Additional Information */}
                <div className="space-y-4 pt-4 border-t pb-4">
                  <div className="text-sm font-medium text-foreground">
                    Additional Information (Optional)
                  </div>

                  <FormField
                    control={clientForm.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          How did you meet this client?
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Referral, Google, Facebook, etc."
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Notes
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional information about the client..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </ScrollArea>

          {/* Footer with Action Buttons - Fixed */}
          <div className="px-6 py-4 border-t bg-muted/20 shrink-0">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddClientDialog(false);
                  clientForm.reset();
                }}
                className="h-11 px-6 font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={clientForm.handleSubmit(handleClientFormSubmit)}
                disabled={createClientMutation.isPending}
                className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md"
              >
                {createClientMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Client"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar cliente */}
      <Dialog
        open={showEditClientDialog}
        onOpenChange={setShowEditClientDialog}
      >
        <DialogContent className="max-w-md max-h-[90vh] ">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos del cliente. Solo el nombre es obligatorio.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form
              onSubmit={clientForm.handleSubmit(handleClientFormSubmit)}
              className="space-y-5"
            >
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Nombre*
                    </FormLabel>
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
                      <FormLabel className="text-base font-medium">
                        Email
                      </FormLabel>
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
                      <FormLabel className="text-base font-medium">
                        Teléfono
                      </FormLabel>
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
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Información de dirección
                </h3>

                <FormField
                  control={clientForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="mb-5">
                      <FormLabel className="text-base font-medium">
                        Dirección
                      </FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value)}
                          placeholder="Buscar dirección..."
                        />
                      </FormControl>

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
                        <FormLabel className="text-base font-medium">
                          Ciudad
                        </FormLabel>
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
                        <FormLabel className="text-base font-medium">
                          Estado
                        </FormLabel>
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
                        <FormLabel className="text-base font-medium">
                          Código Postal
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="CP" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Información adicional
                </h3>

                <FormField
                  control={clientForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Fuente
                      </FormLabel>
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
                      <FormLabel className="text-base font-medium">
                        Etiquetas
                      </FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {clientForm.getValues("tags")?.map((tag) => (
                          <Badge
                            key={tag}
                            className="flex items-center gap-1 py-1.5 px-3"
                          >
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
                      <FormLabel className="text-base font-medium">
                        Notas
                      </FormLabel>
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
                <Button type="submit" className="h-11 min-w-[120px]">
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
              ¿Estás seguro de que deseas eliminar este cliente? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {currentClient && (
            <div className="py-4">
              <h3 className="font-medium">{currentClient.name}</h3>
              {currentClient.email && (
                <p className="text-sm text-muted-foreground">
                  {currentClient.email}
                </p>
              )}
              {currentClient.phone && (
                <p className="text-sm text-muted-foreground">
                  {currentClient.phone}
                </p>
              )}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header - Fixed */}
          <div className="px-6 py-4 border-b bg-background shrink-0">
            <DialogTitle className="text-lg font-semibold">
              Importar contactos
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Importa tus contactos desde un archivo CSV o vCard con mapeo inteligente de IA.
            </DialogDescription>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-6 py-4">
            <Tabs
              value={importType}
              onValueChange={(value) => setImportType(value as "csv" | "vcf")}
              className="w-full pr-3"
            >
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
                      onChange={(e) => handleFileChange(e, "csv")}
                      className="max-w-xs"
                    />
                  </div>
                  {csvFile && (
                    <p className="mt-2 text-sm font-medium">{csvFile.name}</p>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <h4 className="font-medium text-foreground mb-1">
                    ✨ Mapeo Inteligente con IA:
                  </h4>
                  <p>
                    Nuestro sistema de IA puede mapear automáticamente columnas desordenadas.
                    No importa el orden o nombres de las columnas.
                  </p>
                  <p className="mt-2">Formatos soportados:</p>
                  <pre className="bg-muted p-2 rounded-md mt-1 text-xs">
                    <code>
                      • Nombre,Email,Teléfono,Dirección
                      <br />
                      • First Name,Last Name,Phone,Email,Address
                      <br />
                      • Cliente,Correo,Tel,Ubicación
                      <br />
                      • Full_Name,Phone_Number,Email_Address,Street_Address
                    </code>
                  </pre>
                  <p className="mt-2 text-green-600 font-medium">
                    🎯 La IA detectará y mapeará automáticamente cualquier formato
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowImportDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!csvFile || isAiProcessing}>
                    {isAiProcessing ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Procesando con IA...
                      </>
                    ) : (
                      "Importar CSV con IA"
                    )}
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
                      Selecciona un archivo .vcf exportado desde Contactos de
                      Apple u otra aplicación.
                    </p>
                    <Input
                      type="file"
                      accept=".vcf"
                      onChange={(e) => handleFileChange(e, "vcf")}
                      className="max-w-xs"
                    />
                  </div>
                  {vcfFile && (
                    <p className="mt-2 text-sm font-medium">{vcfFile.name}</p>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <h4 className="font-medium text-foreground mb-1">
                    ¿Cómo exportar contactos de Apple?
                  </h4>
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
                  <Button type="submit" disabled={!vcfFile}>
                    Importar vCard
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Eliminación Masiva */}
      <Dialog
        open={showBatchDeleteDialog}
        onOpenChange={setShowBatchDeleteDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar contactos seleccionados</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar {selectedClients.length}{" "}
              contactos? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta acción eliminará permanentemente {selectedClients.length}{" "}
                contactos de tu base de datos.
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
                "Eliminar seleccionados"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔧 Diálogo de Reparación de Contactos */}
      <Dialog open={showRepairDialog} onOpenChange={setShowRepairDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              Herramienta de Reparación de Contactos
            </DialogTitle>
            <DialogDescription>
              Esta herramienta detecta y corrige datos mezclados en tus contactos (direcciones en campos de teléfono, ciudades pegadas a direcciones, etc.)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Paso 1: Diagnóstico */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</div>
                    <h4 className="font-medium">Diagnosticar Contactos</h4>
                  </div>
                  <Button 
                    onClick={handleDiagnoseContacts} 
                    disabled={isDiagnosing}
                    variant="outline"
                    size="sm"
                  >
                    {isDiagnosing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Analizar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Escanea todos tus contactos para identificar datos mal ubicados o corruptos.
                </p>
                
                {/* Resultados del diagnóstico */}
                {repairDiagnostics && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{repairDiagnostics.diagnostics?.totalClients || 0}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-500">{repairDiagnostics.diagnostics?.corruptedClients?.length || 0}</div>
                        <div className="text-xs text-muted-foreground">Con problemas</div>
                      </div>
                    </div>
                    
                    {repairDiagnostics.diagnostics?.corruptedClients?.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Problemas detectados:</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {repairDiagnostics.diagnostics.issues.addressInPhone > 0 && (
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              {repairDiagnostics.diagnostics.issues.addressInPhone} dirección(es) en campo teléfono
                            </div>
                          )}
                          {repairDiagnostics.diagnostics.issues.phoneInAddress > 0 && (
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              {repairDiagnostics.diagnostics.issues.phoneInAddress} teléfono(s) en campo dirección
                            </div>
                          )}
                          {repairDiagnostics.diagnostics.issues.cityMergedWithAddress > 0 && (
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              {repairDiagnostics.diagnostics.issues.cityMergedWithAddress} ciudad(es) pegada(s) a dirección
                            </div>
                          )}
                          {repairDiagnostics.diagnostics.issues.duplicateData > 0 && (
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              {repairDiagnostics.diagnostics.issues.duplicateData} datos duplicados
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Paso 2: Simulación */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-amber-100 text-amber-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</div>
                    <h4 className="font-medium">Simular Reparación</h4>
                  </div>
                  <Button 
                    onClick={() => handleRepairContacts(true)} 
                    disabled={isRepairing || !repairDiagnostics || repairDiagnostics.diagnostics?.corruptedClients?.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    {isRepairing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Simulando...
                      </>
                    ) : (
                      <>
                        <Wrench className="h-4 w-4 mr-2" />
                        Simular
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Muestra qué cambios se harían sin modificar nada. Revisa antes de aplicar.
                </p>

                {/* Resultados de la simulación */}
                {repairResults && repairResults.dryRun && repairResults.repairs?.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Vista previa de cambios ({repairResults.repairs.length}):</h5>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {repairResults.repairs.slice(0, 10).map((repair: any, index: number) => (
                        <div key={index} className="text-xs bg-muted p-2 rounded">
                          <div className="font-medium">{repair.clientName}</div>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="text-red-600">
                              <span className="font-medium">Antes:</span><br/>
                              {repair.before.address && <span>Dir: {repair.before.address}<br/></span>}
                              {repair.before.phone && <span>Tel: {repair.before.phone}<br/></span>}
                              {repair.before.city && <span>Ciudad: {repair.before.city}</span>}
                            </div>
                            <div className="text-green-600">
                              <span className="font-medium">Después:</span><br/>
                              {repair.after.address && <span>Dir: {repair.after.address}<br/></span>}
                              {repair.after.phone && <span>Tel: {repair.after.phone}<br/></span>}
                              {repair.after.city && <span>Ciudad: {repair.after.city}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      {repairResults.repairs.length > 10 && (
                        <div className="text-center text-xs text-muted-foreground">
                          ... y {repairResults.repairs.length - 10} más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 3: Aplicar */}
              <div className="border rounded-lg p-4 border-green-200 bg-green-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</div>
                    <h4 className="font-medium text-green-800">Aplicar Reparaciones</h4>
                  </div>
                  <Button 
                    onClick={() => handleRepairContacts(false)} 
                    disabled={isRepairing || !repairResults || !repairResults.dryRun || repairResults.repairs?.length === 0}
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isRepairing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Reparando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aplicar ({repairResults?.repairs?.length || 0})
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-green-700">
                  Aplica los cambios de forma permanente a todos los contactos afectados.
                </p>

                {/* Resultado de la reparación */}
                {repairResults && !repairResults.dryRun && (
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">¡{repairResults.repairsNeeded} contactos reparados exitosamente!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRepairDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
