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

interface ManualEstimateFormProps {
  onEstimateGenerated: (html: string) => void;
}

export default function ManualEstimateForm({ onEstimateGenerated }: ManualEstimateFormProps) {
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
  const [projectType, setProjectType] = useState("residential");
  const [fenceType, setFenceType] = useState("");
  const [fenceLength, setFenceLength] = useState("");
  const [fenceHeight, setFenceHeight] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  
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
  
  // Función para generar el estimado básico
  const generateEstimate = () => {
    // En una implementación real, esto generaría un HTML más complejo
    // basado en todos los datos recopilados
    const estimateHtml = `
      <div class="estimate-container">
        <h1>Estimado para: ${clientName}</h1>
        <p><strong>Dirección:</strong> ${clientAddress}</p>
        <p><strong>Ciudad:</strong> ${clientCity}, ${clientState} ${clientZip}</p>
        <p><strong>Tipo de proyecto:</strong> ${projectType === 'residential' ? 'Residencial' : 'Comercial'}</p>
        <p><strong>Tipo de cerca:</strong> ${fenceType}</p>
        <p><strong>Longitud:</strong> ${fenceLength} pies</p>
        <p><strong>Altura:</strong> ${fenceHeight} pies</p>
        <p><strong>Notas adicionales:</strong> ${additionalNotes}</p>
        
        <h2>Desglose de costos</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ítem</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Costo</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Materiales</td>
            <td style="border: 1px solid #ddd; padding: 8px;">$${calculateMaterialCost()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Mano de obra</td>
            <td style="border: 1px solid #ddd; padding: 8px;">$${calculateLaborCost()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>$${calculateTotalCost()}</strong></td>
          </tr>
        </table>
        
        <p style="margin-top: 20px; font-style: italic;">Este estimado es válido por 30 días desde la fecha de emisión.</p>
      </div>
    `;
    
    onEstimateGenerated(estimateHtml);
  };
  
  // Funciones de cálculo simples (en una implementación real serían más complejas)
  const calculateMaterialCost = () => {
    // Cálculo simple basado en longitud y tipo
    const baseRate = fenceType === 'wood' ? 15 : fenceType === 'chain' ? 12 : fenceType === 'vinyl' ? 25 : 20;
    return Math.round(parseFloat(fenceLength || "0") * baseRate);
  };
  
  const calculateLaborCost = () => {
    // Cálculo simple basado en longitud y altura
    const baseRate = 10;
    return Math.round(parseFloat(fenceLength || "0") * parseFloat(fenceHeight || "0") * baseRate / 10);
  };
  
  const calculateTotalCost = () => {
    return calculateMaterialCost() + calculateLaborCost();
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