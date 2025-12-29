import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePageContext } from "@/contexts/PageContext";
import { useFeatureAccess, usePermissions } from "@/hooks/usePermissions";
import { auth } from "@/lib/firebase";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FileText, PlusCircle, Search, Download, Eye, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ContractPreview from "@/components/templates/ContractPreview";
import QuestionFlowChat from "@/components/contract/QuestionFlowChat";

// Tipos de contrato
interface Contract {
  id: number;
  title: string;
  clientName: string;
  createdAt: string; // ISO date string
  status: 'draft' | 'sent' | 'signed' | 'completed';
  contractType: string;
  html?: string;
}

const Contracts = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setPageContext, clearPageContext } = usePageContext();
  const featureAccess = useFeatureAccess();
  const { userPlan } = usePermissions();
  const [activeTab, setActiveTab] = useState("mis-contratos");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [contractHtml, setContractHtml] = useState<string>("");
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Listen to authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // 👁️ Registrar contexto de página
  useEffect(() => {
    if (selectedContract) {
      setPageContext({
        type: 'contract-editor',
        contractId: selectedContract.id.toString(),
        status: selectedContract.status
      });
    } else {
      setPageContext({ type: 'contract-list' });
    }

    return () => clearPageContext();
  }, [selectedContract]);

  // Cargar la lista de contratos del usuario autenticado
  const contractsQuery = useQuery({
    queryKey: ['/api/dual-signature/all', user?.uid],
    enabled: !!user?.uid, // Solo ejecutar si hay usuario autenticado
    queryFn: async () => {
      if (!user?.uid) {
        return { success: false, contracts: [], stats: { total: 0, draft: 0, progress: 0, completed: 0 } };
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/dual-signature/all/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar contratos');
        }
        
        const data = await response.json();
        console.log('📋 [CONTRACTS] Loaded contracts:', data);
        return data.contracts || [];
      } catch (error) {
        console.error("Error fetching contracts:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los contratos",
          variant: "destructive"
        });
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

  // Mutación para crear un nuevo contrato
  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Error al crear contrato');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Actualizar la caché de contratos
      queryClient.invalidateQueries({
        queryKey: ['/api/dual-signature/all', user?.uid],
      });
      
      // Mostrar mensaje de éxito
      toast({
        title: "Contrato creado",
        description: "El contrato ha sido creado exitosamente",
      });
      
      // Cerrar diálogo y mostrar vista previa
      setIsCreateDialogOpen(false);
      
      // Establecer el HTML para la vista previa
      if (data.html) {
        setContractHtml(data.html);
        setActiveTab("vista-previa");
      }
    },
    onError: (error) => {
      console.error('Error creando contrato:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el contrato. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
    }
  });

  // Para vista previa de un contrato existente
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

  // Manejar la finalización del flujo de preguntas
  const handleQuestionFlowComplete = async (data: any) => {
    // Mapear los datos del formulario al formato esperado por el API
    const contractData = {
      contractor: {
        name: data.contractor?.name || "",
        address: data.contractor?.address || "",
        phone: data.contractor?.phone || "",
        email: data.contractor?.email || "",
        license: data.contractor?.license || "",
      },
      client: {
        name: data.client?.name || "",
        address: data.client?.address || "",
        phone: data.client?.phone || "",
        email: data.client?.email || "",
      },
      project: {
        description: `Instalación de cerca de ${data.project?.fenceType || ""}`,
        fenceType: data.project?.fenceType || "",
        fenceHeight: data.project?.fenceHeight || "",
        fenceLength: data.project?.fenceLength || "",
        fenceMaterial: data.project?.fenceMaterial || "",
        startDate: data.project?.startDate || new Date().toISOString().split('T')[0],
        completionDate: "", // Se calculará en el backend
      },
      payment: {
        totalCost: data.payment?.totalCost || "",
        depositAmount: data.payment?.depositAmount || "",
        schedule: data.payment?.schedule || "",
        formOfPayment: data.payment?.formOfPayment || "Transferencia bancaria",
      },
      title: `Contrato de Cercado - ${data.client?.name || "Cliente"}`,
      contractType: "fence",
    };
    
    // Crear contrato
    createContractMutation.mutate(contractData);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">
            Administra tus contratos de cercado y crea nuevos documentos en minutos
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button 
            onClick={() => {
              if (!featureAccess.canCreateContract()) {
                featureAccess.showContractUpgrade();
                return;
              }
              setIsCreateDialogOpen(true);
            }}
            disabled={!featureAccess.canCreateContract()}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Contrato
          </Button>
          {userPlan && userPlan.limits.contracts !== -1 && (
            <span className="text-xs text-muted-foreground">
              {featureAccess.remainingContracts()}/{userPlan.limits.contracts} contratos este mes
            </span>
          )}
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="mis-contratos">Mis Contratos</TabsTrigger>
          <TabsTrigger value="crear-nuevo">Crear Nuevo</TabsTrigger>
          <TabsTrigger value="vista-previa">Vista Previa</TabsTrigger>
        </TabsList>
        
        {/* Tab de Mis Contratos */}
        <TabsContent value="mis-contratos" className="space-y-4">
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
                <Card key={i} className="">
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
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="mt-4"
                  >
                    Crear Tu Primer Contrato
                  </Button>
                </div>
              </div>
            ) : (
              // Lista de contratos
              filteredContracts.map((contract: Contract) => (
                <Card key={contract.id} className="">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{contract.title}</CardTitle>
                      <Badge 
                        variant={
                          contract.status === 'signed' ? 'default' :
                          contract.status === 'completed' ? 'default' :
                          contract.status === 'sent' ? 'outline' : 'secondary'
                        }
                        className={contract.status === 'completed' ? 'bg-green-500' : ''}
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
        
        {/* Tab de Crear Nuevo */}
        <TabsContent value="crear-nuevo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Contrato</CardTitle>
              <CardDescription>
                Responde las preguntas secuenciales para generar un contrato personalizado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionFlowChat 
                onComplete={handleQuestionFlowComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab de Vista Previa */}
        <TabsContent value="vista-previa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Contrato</CardTitle>
              <CardDescription>
                Revisa el contrato generado antes de confirmar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contractHtml ? (
                <div className="space-y-4">
                  <ContractPreview html={contractHtml} />
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setActiveTab("crear-nuevo")}>
                      Editar
                    </Button>
                    <Button onClick={() => {
                      // Aquí iría la lógica para descargar el PDF
                      toast({
                        title: "Contrato guardado",
                        description: "El contrato ha sido guardado y está listo para descargar",
                      });
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">
                    Genera un contrato utilizando el flujo de preguntas para ver la vista previa aquí
                  </p>
                  <Button 
                    onClick={() => setActiveTab("crear-nuevo")}
                    className="mt-4"
                  >
                    Crear Contrato
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Diálogo para crear nuevo contrato */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Flujo Guiado de Creación de Contrato</DialogTitle>
          </DialogHeader>
          <div className="flex-1 ">
            <QuestionFlowChat 
              onComplete={(data) => {
                handleQuestionFlowComplete(data);
                setIsCreateDialogOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para vista previa */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedContract ? selectedContract.title : "Vista Previa del Contrato"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 h-full max-h-[calc(80vh-120px)]">
            <div className="p-4">
              <ContractPreview html={contractHtml} />
            </div>
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsPreviewOpen(false)}
            >
              Cerrar
            </Button>
            {selectedContract && (
              <Button 
                onClick={() => {
                  if (selectedContract) {
                    downloadMutation.mutate(selectedContract.id);
                    setIsPreviewOpen(false);
                  }
                }}
                disabled={downloadMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Datos de muestra para desarrollo
const sampleContracts: Contract[] = [
  {
    id: 1,
    title: "Contrato de Cercado - Residencia García",
    clientName: "Eduardo García",
    createdAt: "2025-04-15T08:30:00Z",
    status: "completed",
    contractType: "Cerca de Privacidad",
  },
  {
    id: 2,
    title: "Contrato de Cercado - Negocio Flores",
    clientName: "María Flores",
    createdAt: "2025-04-28T14:20:00Z",
    status: "signed",
    contractType: "Cerca Comercial",
  },
  {
    id: 3,
    title: "Contrato de Cercado - Residencia López",
    clientName: "Juan López",
    createdAt: "2025-05-10T10:15:00Z",
    status: "draft",
    contractType: "Cerca de Vinilo",
  },
];

export default Contracts;