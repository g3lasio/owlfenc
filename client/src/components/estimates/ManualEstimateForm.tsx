import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface Client {
  id: number;
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
}

interface Template {
  id: number;
  name: string;
  type: string;
  html: string;
  isDefault: boolean;
}

interface Material {
  id: number;
  category: string;
  name: string;
  description: string | null;
  price: number; // Cents
  unit: string;
  supplier: string | null;
  notes: string | null;
}

interface Contractor {
  id: number;
  name: string;
  company: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  license: string | null;
  logo?: string;
}

interface ManualEstimateFormProps {
  onEstimateGenerated: (html: string) => void;
}

export default function ManualEstimateForm({ onEstimateGenerated }: ManualEstimateFormProps) {
  // Estado para datos del contratista
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [isLoadingContractor, setIsLoadingContractor] = useState(true);
  
  // Estado para clientes y cliente seleccionado
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  // Datos del cliente
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientState, setClientState] = useState("");
  const [clientZip, setClientZip] = useState("");
  
  // Datos del proyecto
  const [projectType, setProjectType] = useState("fencing");
  const [projectSubtype, setProjectSubtype] = useState("");
  const [projectLength, setProjectLength] = useState("");
  const [projectHeight, setProjectHeight] = useState("");
  const [projectArea, setProjectArea] = useState(""); // Para techos, en pies cuadrados
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // Características adicionales
  const [includeDemolition, setIncludeDemolition] = useState(false);
  const [includePainting, setIncludePainting] = useState(false);
  const [includeLattice, setIncludeLattice] = useState(false);
  const [gates, setGates] = useState<{type: string; width: number; quantity: number}[]>([]);
  
  // Estado para materiales, templates y precios
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  
  // Opciones de generación
  const [useAI, setUseAI] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [adjustedLaborRate, setAdjustedLaborRate] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Estado de navegación
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  
  // Función para cargar clientes
  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error('Error al obtener clientes');
        }
        const data = await response.json();
        setClients(data);
        setIsLoadingClients(false);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes. Por favor intenta de nuevo.",
          variant: "destructive"
        });
        setIsLoadingClients(false);
      }
    }
    
    fetchClients();
  }, [toast]);
  
  // Función para manejar la selección de un cliente existente
  const handleClientSelect = (clientId: string) => {
    if (clientId === "new") {
      setIsNewClient(true);
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setClientAddress("");
      setClientCity("");
      setClientState("");
      setClientZip("");
    } else {
      setIsNewClient(false);
      setSelectedClientId(clientId);
      
      // Encontrar el cliente seleccionado y llenar los campos
      const selectedClient = clients.find(c => c.clientId === clientId);
      if (selectedClient) {
        setClientName(selectedClient.name);
        setClientEmail(selectedClient.email || "");
        setClientPhone(selectedClient.phone || "");
        setClientAddress(selectedClient.address || "");
        setClientCity(selectedClient.city || "");
        setClientState(selectedClient.state || "");
        setClientZip(selectedClient.zip || "");
      }
    }
  };
  
  // Función para crear un nuevo cliente
  const createNewClient = async () => {
    try {
      // Validar datos mínimos
      if (!clientName) {
        toast({
          title: "Error",
          description: "El nombre del cliente es obligatorio",
          variant: "destructive"
        });
        return;
      }
      
      const clientData = {
        name: clientName,
        email: clientEmail || null,
        phone: clientPhone || null,
        address: clientAddress || null,
        city: clientCity || null,
        state: clientState || null,
        zip: clientZip || null
      };
      
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        throw new Error('Error al crear el cliente');
      }
      
      const newClient = await response.json();
      setClients([...clients, newClient]);
      setSelectedClientId(newClient.clientId);
      
      toast({
        title: "Cliente creado",
        description: "Cliente agregado correctamente",
      });
      
    } catch (error) {
      console.error('Error creando cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el cliente. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  // Función para manejar la dirección desde Google Maps
  const handleAddressChange = (address: string, details?: any) => {
    setClientAddress(address);
    if (details) {
      setClientCity(details.city || "");
      setClientState(details.state || "");
      setClientZip(details.zipCode || "");
    }
  };
  
  // Función para manejar la navegación de pasos
  const goToNextStep = () => {
    // Validaciones según el paso actual
    if (currentStep === 1) {
      // Si estamos creando un nuevo cliente, validar campos obligatorios
      if (isNewClient && !clientName) {
        toast({
          title: "Campo requerido",
          description: "Por favor ingresa el nombre del cliente",
          variant: "destructive"
        });
        return;
      }
      
      // Si es un cliente existente, verificar que haya seleccionado uno
      if (!isNewClient && !selectedClientId) {
        toast({
          title: "Selección requerida",
          description: "Por favor selecciona un cliente existente o crea uno nuevo",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Avanzar al siguiente paso
    setCurrentStep(currentStep + 1);
  };
  
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Cargar datos del contratista
  useEffect(() => {
    async function fetchContractorData() {
      try {
        const response = await fetch('/api/contractor/profile');
        if (!response.ok) {
          throw new Error('Error al obtener datos del contratista');
        }
        const data = await response.json();
        setContractor(data);
        setIsLoadingContractor(false);
      } catch (error) {
        console.error('Error cargando datos del contratista:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del contratista. Por favor verifica tu perfil.",
          variant: "destructive"
        });
        setIsLoadingContractor(false);
      }
    }
    
    fetchContractorData();
  }, [toast]);
  
  // Cargar materiales
  useEffect(() => {
    async function fetchMaterials() {
      try {
        // Determinar la categoría de materiales basada en el tipo de proyecto
        let category = "";
        if (projectType === "fencing") {
          category = "fencing";
        } else if (projectType === "roofing") {
          category = "roofing";
        } else {
          category = "general";
        }
        
        const response = await fetch(`/api/materials?category=${category}`);
        if (!response.ok) {
          throw new Error('Error al obtener materiales');
        }
        
        const data = await response.json();
        setMaterials(data);
        setIsLoadingMaterials(false);
      } catch (error) {
        console.error('Error cargando materiales:', error);
        setIsLoadingMaterials(false);
      }
    }
    
    fetchMaterials();
  }, [projectType]);
  
  // Cargar templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/templates?type=estimate');
        if (!response.ok) {
          throw new Error('Error al obtener plantillas');
        }
        
        const data = await response.json();
        setTemplates(data);
        
        // Seleccionar la plantilla por defecto si existe
        const defaultTemplate = data.find(t => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        } else if (data.length > 0) {
          setSelectedTemplateId(data[0].id);
        }
      } catch (error) {
        console.error('Error cargando templates:', error);
      }
    }
    
    fetchTemplates();
  }, []);
  
  // Función para preparar los datos del estimado
  const prepareEstimateData = (): any => {
    // Características adicionales
    const additionalFeatures: any = {
      demolition: includeDemolition,
      painting: includePainting,
      lattice: includeLattice
    };
    
    // Agregar puertas si se han definido
    if (gates.length > 0) {
      additionalFeatures.gates = gates;
    }

    const contractorId = contractor?.id || 1; // ID por defecto para pruebas

    // Datos básicos del proyecto
    return {
      contractorId,
      contractorName: contractor?.name || "Mi Empresa",
      contractorCompany: contractor?.company || "",
      contractorAddress: contractor?.address || "",
      contractorPhone: contractor?.phone || "",
      contractorEmail: contractor?.email || "",
      contractorLicense: contractor?.license || "",
      contractorLogo: contractor?.logo || "",
      
      // Datos del cliente
      clientName,
      clientEmail,
      clientPhone,
      projectAddress: clientAddress,
      clientCity,
      clientState,
      clientZip,
      
      // Detalles del proyecto
      projectType,
      projectSubtype,
      projectDimensions: {
        length: projectLength ? parseFloat(projectLength) : undefined,
        height: projectHeight ? parseFloat(projectHeight) : undefined,
        area: projectArea ? parseFloat(projectArea) : undefined
      },
      additionalFeatures,
      notes: additionalNotes,
      
      // Opciones de generación
      useAI,
      customPrompt
    };
  };

  // Función para calcular el estimado
  const calculateEstimate = async () => {
    try {
      setIsCalculating(true);
      
      const estimateData = prepareEstimateData();
      
      // Validar datos mínimos
      if (!estimateData.clientName || !estimateData.projectAddress) {
        toast({
          title: "Datos incompletos",
          description: "Se requiere nombre del cliente y dirección del proyecto",
          variant: "destructive"
        });
        setIsCalculating(false);
        return;
      }
      
      // Validar dimensiones según el tipo de proyecto
      if (projectType === "fencing") {
        if (!estimateData.projectDimensions.length || !estimateData.projectDimensions.height) {
          toast({
            title: "Dimensiones incompletas",
            description: "Para proyectos de cerca se requiere longitud y altura",
            variant: "destructive"
          });
          setIsCalculating(false);
          return;
        }
      } else if (projectType === "roofing") {
        if (!estimateData.projectDimensions.area) {
          toast({
            title: "Dimensiones incompletas",
            description: "Para proyectos de techo se requiere el área",
            variant: "destructive"
          });
          setIsCalculating(false);
          return;
        }
      }
      
      // Enviar datos al backend para cálculo
      const response = await fetch('/api/estimates/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData),
      });
      
      if (!response.ok) {
        throw new Error('Error calculando el estimado');
      }
      
      const result = await response.json();
      setEstimateResult(result);
      
      // Avanzar al siguiente paso (revisión)
      setCurrentStep(4);
      
    } catch (error) {
      console.error('Error calculando estimado:', error);
      toast({
        title: "Error en cálculo",
        description: "No se pudo generar el estimado. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Función para ajustar la tasa de mano de obra
  const handleLaborRateAdjustment = (newRate: number) => {
    if (!estimateResult) return;
    
    setAdjustedLaborRate(newRate);
    
    // En una implementación completa, esto recalcularía todos los costos
    // basados en la nueva tasa de mano de obra
  };
  
  // Función para generar el HTML del estimado
  const generateEstimateHTML = async () => {
    try {
      // Si no hay estimado calculado, mostrar error
      if (!estimateResult) {
        toast({
          title: "Error",
          description: "Primero debes calcular un estimado",
          variant: "destructive"
        });
        return;
      }
      
      // Si hay una tasa de mano de obra ajustada, actualizarla en el resultado
      let finalEstimate = estimateResult;
      if (adjustedLaborRate !== null) {
        // Crear una copia del estimado con la tasa ajustada
        // En una implementación real, esto sería más complejo y
        // recalcularía todos los valores afectados
        finalEstimate = {
          ...estimateResult,
          adjustedLaborRate
        };
      }
      
      // Obtener HTML usando el template seleccionado
      const response = await fetch('/api/estimates/generate-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimate: finalEstimate,
          templateId: selectedTemplateId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error generando HTML del estimado');
      }
      
      const { html } = await response.json();
      
      // Enviar el HTML al componente padre
      onEstimateGenerated(html);
      
    } catch (error) {
      console.error('Error generando HTML del estimado:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el estimado. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  // Función para enviar el estimado por email
  const sendEstimateByEmail = async () => {
    try {
      if (!estimateResult || !clientEmail) {
        toast({
          title: "Error",
          description: "Se requiere un estimado calculado y email del cliente",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar formato de email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        toast({
          title: "Email inválido",
          description: "Por favor ingresa un email válido para el cliente",
          variant: "destructive"
        });
        return;
      }
      
      // Enviar email con el estimado
      const response = await fetch('/api/estimates/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimate: estimateResult,
          templateId: selectedTemplateId,
          email: clientEmail,
          subject: `Estimado de proyecto para ${clientName}`,
          message: `Estimado ${clientName}, adjunto encontrará el estimado solicitado para su proyecto. Por favor no dude en contactarnos si tiene alguna pregunta.`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error enviando email');
      }
      
      toast({
        title: "Email enviado",
        description: `El estimado ha sido enviado a ${clientEmail}`,
      });
      
    } catch (error) {
      console.error('Error enviando email:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el email. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>Selecciona un cliente existente o crea uno nuevo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs para seleccionar cliente existente o nuevo */}
            <Tabs defaultValue={isNewClient ? "new" : "existing"} onValueChange={(value) => setIsNewClient(value === "new")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Cliente Existente</TabsTrigger>
                <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="mt-4">
                {isLoadingClients ? (
                  <div className="flex items-center justify-center p-4">
                    <p>Cargando clientes...</p>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <p className="mb-2">No hay clientes disponibles</p>
                    <Button onClick={() => setIsNewClient(true)} variant="outline">Crear Nuevo Cliente</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Select value={selectedClientId} onValueChange={handleClientSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.clientId} value={client.clientId}>
                            {client.name} {client.address ? `- ${client.address}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedClientId && (
                      <div className="border rounded-md p-4 bg-muted/20">
                        <h3 className="font-medium mb-2">Información del Cliente</h3>
                        <p><strong>Nombre:</strong> {clientName}</p>
                        {clientEmail && <p><strong>Email:</strong> {clientEmail}</p>}
                        {clientPhone && <p><strong>Teléfono:</strong> {clientPhone}</p>}
                        {clientAddress && <p><strong>Dirección:</strong> {clientAddress}</p>}
                        {(clientCity || clientState || clientZip) && (
                          <p><strong>Ciudad/Estado:</strong> {clientCity}, {clientState} {clientZip}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="new" className="mt-4 space-y-4">
                {/* Formulario para nuevo cliente */}
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nombre del Cliente *</Label>
                  <Input 
                    id="clientName" 
                    value={clientName} 
                    onChange={(e) => setClientName(e.target.value)} 
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input 
                      id="clientEmail" 
                      type="email"
                      value={clientEmail} 
                      onChange={(e) => setClientEmail(e.target.value)} 
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Teléfono</Label>
                    <Input 
                      id="clientPhone" 
                      value={clientPhone} 
                      onChange={(e) => setClientPhone(e.target.value)} 
                      placeholder="123-456-7890"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Dirección</Label>
                  <AddressAutocomplete
                    value={clientAddress}
                    onChange={handleAddressChange}
                    placeholder="Ingresa la dirección del cliente"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientCity">Ciudad</Label>
                    <Input 
                      id="clientCity" 
                      value={clientCity} 
                      onChange={(e) => setClientCity(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clientState">Estado</Label>
                    <Input 
                      id="clientState" 
                      value={clientState} 
                      onChange={(e) => setClientState(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clientZip">Código Postal</Label>
                    <Input 
                      id="clientZip" 
                      value={clientZip} 
                      onChange={(e) => setClientZip(e.target.value)} 
                    />
                  </div>
                </div>
                
                {/* Botón para guardar el cliente */}
                <Button 
                  onClick={createNewClient} 
                  type="button" 
                  variant="outline" 
                  className="w-full mt-4"
                >
                  Guardar Cliente
                </Button>
              </TabsContent>
            </Tabs>
            
            {/* Información del proyecto */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Información del Proyecto</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectType">Tipo de Proyecto</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residencial</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={goToNextStep} className="ml-auto">Siguiente</Button>
          </CardFooter>
        </Card>
      )}
      
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Cerca</CardTitle>
            <CardDescription>Especifica las características de la cerca a instalar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fenceType">Tipo de Cerca</Label>
              <Select value={fenceType} onValueChange={setFenceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de cerca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wood">Madera</SelectItem>
                  <SelectItem value="chain">Cadena (Chain Link)</SelectItem>
                  <SelectItem value="vinyl">Vinilo</SelectItem>
                  <SelectItem value="aluminum">Aluminio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fenceLength">Longitud (pies)</Label>
                <Input 
                  id="fenceLength" 
                  type="number" 
                  min="0"
                  value={fenceLength} 
                  onChange={(e) => setFenceLength(e.target.value)} 
                  placeholder="Ej: 100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fenceHeight">Altura (pies)</Label>
                <Input 
                  id="fenceHeight" 
                  type="number" 
                  min="0"
                  value={fenceHeight} 
                  onChange={(e) => setFenceHeight(e.target.value)} 
                  placeholder="Ej: 6"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Notas Adicionales</Label>
              <Textarea 
                id="additionalNotes" 
                value={additionalNotes} 
                onChange={(e) => setAdditionalNotes(e.target.value)} 
                placeholder="Cualquier detalle adicional o requerimiento especial"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>Anterior</Button>
            <Button onClick={goToNextStep}>Siguiente</Button>
          </CardFooter>
        </Card>
      )}
      
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Revisar y Generar Estimado</CardTitle>
            <CardDescription>Verifica la información y genera el estimado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Cliente</h3>
              <p className="text-sm text-muted-foreground">{clientName}</p>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Dirección</h3>
              <p className="text-sm text-muted-foreground">{clientAddress}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Tipo de Cerca</h3>
              <p className="text-sm text-muted-foreground">
                {fenceType === 'wood' ? 'Madera' : 
                 fenceType === 'chain' ? 'Cadena (Chain Link)' : 
                 fenceType === 'vinyl' ? 'Vinilo' : 
                 fenceType === 'aluminum' ? 'Aluminio' : 'No especificado'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Longitud</h3>
                <p className="text-sm text-muted-foreground">{fenceLength} pies</p>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Altura</h3>
                <p className="text-sm text-muted-foreground">{fenceHeight} pies</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Estimación de Costos</h3>
              <div className="bg-muted rounded-md p-3">
                <div className="flex justify-between">
                  <span>Materiales:</span>
                  <span>${calculateMaterialCost()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mano de obra:</span>
                  <span>${calculateLaborCost()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>${calculateTotalCost()}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>Anterior</Button>
            <Button onClick={generateEstimate}>Generar Estimado</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}