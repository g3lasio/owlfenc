import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  ArrowRight, 
  Info, 
  Search, 
  Download, 
  Eye, 
  Clock, 
  PlusCircle 
} from "lucide-react";
import ContractPreview from "@/components/templates/ContractPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import ChatAssistant from "@/components/contract/ChatAssistant";
import ContractOptions from "@/components/contract/ContractOptions";
import QuestionFlowChat from "@/components/contract/QuestionFlowChat";

// Interfaces
interface Contract {
  id: number;
  title: string;
  clientName: string;
  createdAt: string; // ISO date string
  status: 'draft' | 'sent' | 'signed' | 'completed';
  contractType: string;
  html?: string;
}

// Zod schema para validar los datos del formulario
const contractFormSchema = z.object({
  estimateInfo: z.string().optional(),
  clientName: z.string().min(2, "El nombre del cliente es requerido"),
  clientEmail: z.string().email("Correo electrónico inválido").optional().or(z.literal("")),
  clientPhone: z.string().optional().or(z.literal("")),
  clientAddress: z.string().min(5, "La dirección del cliente es requerida"),
  fenceType: z.string().min(2, "El tipo de cerca es requerido"),
  fenceHeight: z.string().min(1, "La altura de la cerca es requerida"),
  fenceLength: z.string().min(1, "La longitud de la cerca es requerida"),
  projectTotal: z.string().min(1, "El total del proyecto es requerido"),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

const ContractGenerator = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("options");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [contractHtml, setContractHtml] = useState<string>("");
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isClientSelectOpen, setIsClientSelectOpen] = useState(false);
  
  // Consulta para obtener la lista de contratos
  const contractsQuery = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/contracts');
        if (!response.ok) {
          throw new Error('Error al cargar contratos');
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error cargando contratos:", error);
        // En desarrollo, retornar datos de muestra si el backend no está listo
        if (process.env.NODE_ENV === 'development') {
          return sampleContracts;
        }
        throw error;
      }
    }
  });
  
  // Consulta para obtener la lista de clientes
  const clientsQuery = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error('Error al cargar clientes');
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error cargando clientes:", error);
        return [];
      }
    }
  });
  
  // Mutación para descargar un contrato como PDF
  const downloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}/download`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Error al descargar contrato');
      }
      
      return await response.blob();
    },
    onSuccess: (data, id) => {
      // Crear URL y descargar
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Contrato descargado",
        description: "El contrato ha sido descargado como PDF",
      });
    },
    onError: (error) => {
      console.error('Error descargando contrato:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el contrato. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
    }
  });

  // Formulario para datos del contrato
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      estimateInfo: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      fenceType: "",
      fenceHeight: "",
      fenceLength: "",
      projectTotal: "",
    },
  });

  // Manejar la subida de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      toast({
        title: "Archivo seleccionado",
        description: `Archivo: ${e.target.files[0].name}`,
      });
    }
  };

  // Procesar el PDF del estimado
  const handleProcessEstimate = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo primero",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      // Enviar solicitud para procesar el PDF
      const response = await fetch("/api/generar-contrato", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al procesar el estimado");
      }

      const data = await response.json();
      
      // Actualizar estados con los datos extraídos
      setExtractedData(data.datos_extraidos);
      setContractHtml(data.contrato_html || "");

      // Actualizar el formulario con los datos extraídos
      form.reset({
        estimateInfo: JSON.stringify(data.datos_extraidos, null, 2),
        clientName: data.datos_extraidos.cliente?.nombre || "",
        clientEmail: data.datos_extraidos.cliente?.email || "",
        clientPhone: data.datos_extraidos.cliente?.telefono || "",
        clientAddress: data.datos_extraidos.cliente?.direccion || "",
        fenceType: data.datos_extraidos.proyecto?.tipoObra || "",
        fenceHeight: data.datos_extraidos.proyecto?.altura || "",
        fenceLength: data.datos_extraidos.proyecto?.longitud || "",
        projectTotal: data.datos_extraidos.proyecto?.total?.toString() || "",
      });

      // Cambiar al tab de revisión
      setActiveTab("review-data");

      toast({
        title: "¡Procesamiento exitoso!",
        description: "Se ha procesado el PDF correctamente",
      });
    } catch (error) {
      console.error("Error procesando PDF:", error);
      toast({
        title: "Error de procesamiento",
        description: "No se pudo procesar el PDF. Inténtalo de nuevo o ingresa los datos manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generar contrato a partir de los datos validados
  const onSubmit = async (data: ContractFormValues) => {
    setIsGeneratingContract(true);
    try {
      // Preparar datos para la generación del contrato
      const contractData = {
        projectDetails: {
          clientName: data.clientName,
          address: data.clientAddress,
          email: data.clientEmail || "",
          phone: data.clientPhone || "",
          fenceType: data.fenceType,
          fenceHeight: data.fenceHeight,
          fenceLength: data.fenceLength,
          total: parseFloat(data.projectTotal.replace(/,/g, "")),
          depositAmount: parseFloat(data.projectTotal.replace(/,/g, "")) * 0.5, // 50% de anticipo por defecto
        },
      };

      // Generar contrato con la API
      const response = await fetch("/api/generate-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        throw new Error("Error al generar el contrato");
      }

      const result = await response.json();
      setContractHtml(result.html);
      
      // Cambiar al tab de vista previa
      setActiveTab("preview-contract");

      toast({
        title: "¡Contrato generado!",
        description: "El contrato ha sido generado correctamente",
      });
    } catch (error) {
      console.error("Error generando contrato:", error);
      toast({
        title: "Error de generación",
        description: "No se pudo generar el contrato. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContract(false);
    }
  };

  // Manejar selección de opciones de contrato
  const handleOptionSelect = (option: 'new' | 'template' | 'modify' | 'upload' | 'chat-assistant' | 'guided-flow' | 'my-contracts') => {
    setSelectedOption(option);
    
    // Redireccionar basado en la opción seleccionada
    if (option === 'upload') {
      setActiveTab("upload-estimate");
    } else if (option === 'new') {
      // Para crear nuevo, ir directo al formulario vacío
      setActiveTab("review-data");
    } else if (option === 'chat-assistant') {
      setActiveTab("chat-assistant");
    } else if (option === 'guided-flow') {
      setActiveTab("guided-flow");
      form.reset({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientAddress: "",
        fenceType: "",
        fenceHeight: "",
        fenceLength: "",
        projectTotal: "",
      });
    } else if (option === 'my-contracts') {
      setActiveTab("my-contracts");
    } else {
      // Para otras opciones, también mostramos el formulario pero podríamos
      // cargarlo con datos diferentes según la opción
      setActiveTab("review-data");
    }
  };
  
  // Vista previa de un contrato existente
  const handlePreview = async (contract: Contract) => {
    setSelectedContract(contract);
    
    // Si ya tenemos el HTML, mostrarlo directamente
    if (contract.html) {
      setContractHtml(contract.html);
      setIsPreviewOpen(true);
      return;
    }
    
    // De lo contrario, obtenerlo del servidor
    try {
      const response = await fetch(`/api/contracts/${contract.id}`);
      if (!response.ok) {
        throw new Error('Error al cargar el contrato');
      }
      
      const data = await response.json();
      setContractHtml(data.html || '');
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error cargando contrato:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la vista previa del contrato",
        variant: "destructive",
      });
    }
  };
  
  // Filtrar contratos por término de búsqueda
  const filteredContracts = contractsQuery.data ? 
    contractsQuery.data.filter((contract: Contract) => 
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];
    
  // Función auxiliar para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    }).format(date);
  };
  
  // Interfaz para los datos del cliente
  interface Client {
    id: number | string;
    name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    address?: string;
  }
  
  // Manejar selección de cliente desde contactos guardados
  const handleClientSelect = (client: Client) => {
    form.setValue("clientName", client.name || client.fullName || "");
    form.setValue("clientEmail", client.email || "");
    form.setValue("clientPhone", client.phone || client.phoneNumber || "");
    form.setValue("clientAddress", client.address || "");
    setIsClientSelectOpen(false);
    
    toast({
      title: "Cliente seleccionado",
      description: "Los datos del cliente han sido cargados en el formulario",
    });
  };

  // Manejar datos completos del chat asistente
  const handleChatDataComplete = (data: any) => {
    // Actualizar el formulario con los datos recopilados por el chat
    form.reset({
      clientName: data.clientName || "",
      clientEmail: data.clientEmail || "",
      clientPhone: data.clientPhone || "",
      clientAddress: data.clientAddress || "",
      fenceType: data.fenceType || "",
      fenceHeight: data.fenceHeight || "",
      fenceLength: data.fenceLength || "",
      projectTotal: data.projectTotal || "",
    });
    
    // Cambiar a la tab de revisión
    setActiveTab("review-data");
    
    toast({
      title: "Información recopilada",
      description: "Se ha completado la recopilación de información. Revisa los datos antes de generar el contrato.",
    });
  };

  // Descargar contrato como PDF
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: contractHtml,
          filename: `contrato-${Date.now()}.pdf`,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al generar el PDF");
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `contrato-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF descargado",
        description: "El contrato ha sido descargado como PDF",
      });
    } catch (error) {
      console.error("Error descargando PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  // Datos de ejemplo para desarrollo
  const sampleContracts: Contract[] = [
    {
      id: 1,
      title: "Contrato de Cercado - Residencia García",
      clientName: "Eduardo García",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "completed",
      contractType: "Cerca de Privacidad",
    },
    {
      id: 2,
      title: "Contrato de Cercado - Negocio Flores",
      clientName: "María Flores",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: "signed",
      contractType: "Cerca Comercial",
    },
    {
      id: 3,
      title: "Contrato de Cercado - Residencia López",
      clientName: "Juan López",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: "draft",
      contractType: "Cerca de Vinilo",
    },
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Generación de Contratos</h1>
            <p className="text-muted-foreground">
              Genera contratos profesionales a partir de estimados aprobados o información manual
            </p>
          </div>
          {activeTab === "my-contracts" && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="options">Inicio</TabsTrigger>
            <TabsTrigger value="my-contracts">Mis Contratos</TabsTrigger>
            <TabsTrigger value="upload-estimate">1. Cargar Estimado</TabsTrigger>
            <TabsTrigger value="review-data">2. Revisar Información</TabsTrigger>
            <TabsTrigger value="preview-contract">3. Vista Previa</TabsTrigger>
            <TabsTrigger value="chat-assistant">Asistente</TabsTrigger>
            <TabsTrigger value="guided-flow">Flujo Guiado</TabsTrigger>
          </TabsList>

          {/* Tab para opciones iniciales */}
          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>¿Cómo deseas generar el contrato?</CardTitle>
                <CardDescription>
                  Selecciona una de las siguientes opciones para comenzar a generar tu contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContractOptions onSelectOption={handleOptionSelect} />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab para mis contratos */}
          <TabsContent value="my-contracts" className="space-y-4">
            <div className="flex justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar contratos..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contractsQuery.isLoading ? (
                // Esqueletos de carga
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader className="p-4">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-4 w-1/3 mt-2" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                    <CardFooter className="p-4 flex justify-between">
                      <Skeleton className="h-9 w-16" />
                      <Skeleton className="h-9 w-16" />
                    </CardFooter>
                  </Card>
                ))
              ) : contractsQuery.isError ? (
                <div className="col-span-full flex justify-center py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      Error al cargar contratos. Intenta refrescar la página.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => contractsQuery.refetch()}
                    >
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="col-span-full flex justify-center py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No se encontraron contratos con ese criterio de búsqueda.' : 'No has creado ningún contrato todavía.'}
                    </p>
                    <Button 
                      onClick={() => handleOptionSelect('new')}
                      className="mt-4"
                    >
                      Crear Tu Primer Contrato
                    </Button>
                  </div>
                </div>
              ) : (
                // Lista de contratos
                filteredContracts.map((contract: Contract) => (
                  <Card key={contract.id} className="overflow-hidden">
                    <CardHeader className="p-4">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{contract.title}</CardTitle>
                        <Badge 
                          variant={
                            contract.status === 'signed' ? 'default' :
                            contract.status === 'completed' ? 'default' :
                            contract.status === 'sent' ? 'outline' : 'secondary'
                          }
                        >
                          {
                            contract.status === 'draft' ? 'Borrador' :
                            contract.status === 'sent' ? 'Enviado' :
                            contract.status === 'signed' ? 'Firmado' : 'Completado'
                          }
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(contract.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm">
                        <span className="font-medium">Cliente:</span> {contract.clientName}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Tipo:</span> {contract.contractType}
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreview(contract)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => downloadMutation.mutate(contract.id)}
                        disabled={downloadMutation.isPending}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          {/* Tab para el asistente virtual */}
          <TabsContent value="chat-assistant">
            <Card>
              <CardHeader>
                <CardTitle>Asistente Virtual</CardTitle>
                <CardDescription>
                  Nuestro asistente te guiará a través del proceso de generación de contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChatAssistant 
                  initialData={{
                    clientName: form.getValues("clientName"),
                    clientEmail: form.getValues("clientEmail"),
                    clientPhone: form.getValues("clientPhone"),
                    clientAddress: form.getValues("clientAddress"),
                    fenceType: form.getValues("fenceType"),
                    fenceHeight: form.getValues("fenceHeight"),
                    fenceLength: form.getValues("fenceLength"),
                    projectTotal: form.getValues("projectTotal")
                  }}
                  onDataComplete={handleChatDataComplete}
                  onFileUpload={setSelectedFile}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab para el flujo guiado de preguntas */}
          <TabsContent value="guided-flow">
            <Card>
              <CardHeader>
                <CardTitle>Generación Guiada de Contratos</CardTitle>
                <CardDescription>
                  Te guiaré paso a paso a través de preguntas específicas para construir tu contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionFlowChat 
                  initialData={{
                    clientName: form.getValues("clientName"),
                    clientEmail: form.getValues("clientEmail"),
                    clientPhone: form.getValues("clientPhone"),
                    clientAddress: form.getValues("clientAddress"),
                    fenceType: form.getValues("fenceType"),
                    fenceHeight: form.getValues("fenceHeight"),
                    fenceLength: form.getValues("fenceLength"),
                    projectTotal: form.getValues("projectTotal")
                  }}
                  onComplete={handleChatDataComplete}
                  onFileUpload={setSelectedFile}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab para cargar estimado */}
          <TabsContent value="upload-estimate">
            <Card>
              <CardHeader>
                <CardTitle>Cargar Estimado Aprobado</CardTitle>
                <CardDescription>
                  Sube un PDF de un estimado aprobado para generar automáticamente el contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Consejo</AlertTitle>
                    <AlertDescription>
                      Para mejores resultados, usa un PDF legible y con texto seleccionable.
                      El sistema extraerá automáticamente la información del cliente y del proyecto.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-10 mb-6">
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Arrastra o selecciona un archivo</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Arrastra un PDF aquí o haz clic para seleccionar un archivo
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild>
                      <span>
                        <FileText className="h-4 w-4 mr-2" />
                        Seleccionar archivo
                      </span>
                    </Button>
                  </label>
                  {selectedFile && (
                    <p className="mt-4 text-sm">
                      Archivo seleccionado: <span className="font-medium">{selectedFile.name}</span>
                    </p>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("options")}
                  >
                    Volver
                  </Button>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("chat-assistant")}
                    >
                      Necesito ayuda
                    </Button>
                    <Button 
                      onClick={handleProcessEstimate} 
                      disabled={!selectedFile || isProcessing}
                    >
                      {isProcessing ? "Procesando..." : "Procesar Estimado"}
                      {!isProcessing && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab para revisar y editar datos */}
          <TabsContent value="review-data">
            <Card>
              <CardHeader>
                <CardTitle>Revisar y Completar Información</CardTitle>
                <CardDescription>
                  Revisa y completa la información necesaria para el contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Sección de datos del cliente */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Datos del Cliente</h3>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsClientSelectOpen(true)}
                        >
                          Seleccionar Cliente Guardado
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="clientName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del Cliente*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nombre completo" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correo Electrónico</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="email@ejemplo.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="(123) 456-7890" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dirección*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Dirección completa" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Sección de datos del proyecto */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Detalles del Proyecto</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="fenceType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Cerca*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: Privacidad, Vinilo, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fenceHeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Altura (pies)*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: 6" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fenceLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Longitud (pies)*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: 100" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="projectTotal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total del Proyecto ($)*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: 5000.00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Datos extraídos (en modo oculto para desarrolladores) */}
                    <div className="hidden">
                      <FormField
                        control={form.control}
                        name="estimateInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Datos Extraídos (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={10}
                                className="font-mono text-xs"
                                readOnly
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setActiveTab("options")}
                      >
                        Volver
                      </Button>
                      <div className="flex space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setActiveTab("chat-assistant")}
                        >
                          Solicitar ayuda
                        </Button>
                        <Button type="submit" disabled={isGeneratingContract}>
                          {isGeneratingContract ? "Generando..." : "Generar Contrato"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab para vista previa del contrato */}
          <TabsContent value="preview-contract">
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Contrato</CardTitle>
                <CardDescription>
                  Revisa el contrato generado antes de descargarlo o enviarlo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractHtml ? (
                  <>
                    <div className="mb-6">
                      <ContractPreview html={contractHtml} />
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("review-data")}
                      >
                        Volver a Editar
                      </Button>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab("chat-assistant")}
                        >
                          Asistente
                        </Button>
                        <Button onClick={handleDownloadPDF}>
                          <FileText className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-10">
                    <p className="text-muted-foreground">
                      No hay contrato generado aún. Completa los pasos anteriores para generar un contrato.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => setActiveTab("upload-estimate")}
                    >
                      Volver al Inicio
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Diálogo para vista previa del contrato */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa del contrato</DialogTitle>
          </DialogHeader>
          {contractHtml ? (
            <>
              <ContractPreview html={contractHtml} />
              <div className="flex justify-between mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Cerrar
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedContract) {
                      downloadMutation.mutate(selectedContract.id);
                    }
                  }}
                  disabled={!selectedContract || downloadMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center p-10">
              <p className="text-muted-foreground">
                Cargando vista previa...
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para crear nuevo contrato */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Contrato</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Selecciona el método para generar un nuevo contrato:
          </p>
          <div className="grid gap-4 py-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => {
                setIsCreateDialogOpen(false);
                handleOptionSelect('upload');
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Cargar estimado existente
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => {
                setIsCreateDialogOpen(false);
                handleOptionSelect('new');
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Crear contrato manualmente
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => {
                setIsCreateDialogOpen(false);
                handleOptionSelect('guided-flow');
              }}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Usar flujo guiado de preguntas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para seleccionar cliente */}
      <Dialog open={isClientSelectOpen} onOpenChange={setIsClientSelectOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seleccionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <Input
              placeholder="Buscar cliente..."
              className="w-full"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {clientsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : clientsQuery.isError ? (
            <div className="py-4 text-center">
              <p className="text-muted-foreground">Error al cargar los clientes</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => clientsQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : clientsQuery.data?.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-muted-foreground">No tienes clientes guardados</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {clientsQuery.data
                  .filter((client: Client) => 
                    !searchTerm || 
                    (client.name || client.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (client.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (client.phone || client.phoneNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((client: Client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-accent cursor-pointer"
                      onClick={() => handleClientSelect(client)}
                    >
                      <div>
                        <p className="font-medium">{client.name || client.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.email}
                          {client.phone || client.phoneNumber ? ` • ${client.phone || client.phoneNumber}` : ""}
                        </p>
                        {client.address && <p className="text-sm text-muted-foreground">{client.address}</p>}
                      </div>
                      <Button variant="ghost" size="sm">
                        Seleccionar
                      </Button>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractGenerator;