import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Calculator, 
  FileText, 
  User, 
  MapPin, 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  Eye,
  Download,
  Building,
  Clock,
  DollarSign,
  Wrench,
  PlusCircle,
  Edit3,
  Target,
  Calendar,
  Search,
  Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ProjectDescriptionEnhancer } from '@/components/ui/project-description-enhancer';
import { X, Phone, Mail, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getClients, Client as ClientType } from '../lib/clientFirebase';

// Interfaces para el nuevo sistema
interface EstimateItem {
  id: string;
  name: string;
  description: string;
  category: 'material' | 'labor' | 'additional';
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  sortOrder: number;
  isOptional: boolean;
}

interface EstimateData {
  id?: number;
  estimateNumber: string;
  
  // Client Information
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  
  // Project Details
  projectType: string;
  projectSubtype: string;
  projectDescription: string;
  scope: string;
  timeline: string;
  
  // Financial
  items: EstimateItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  
  // Status
  status: 'draft' | 'sent' | 'approved' | 'expired';
  validUntil: string;
  
  // Notes
  notes: string;
  internalNotes: string;
}

interface Estimate {
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDescription: string;
  items: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

export default function EstimateGenerator() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Estados principales
  const [currentStep, setCurrentStep] = useState<'client' | 'project' | 'items' | 'review'>('client');
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [estimate, setEstimate] = useState<Estimate>({
    title: 'New Estimate',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectDescription: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: ''
  });
  const [clients, setClients] = useState<ClientType[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Query para obtener clientes existentes
  const { data: dbClients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: showClientDialog
  });

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newItem, setNewItem] = useState<Partial<EstimateItem>>({
    name: '',
    description: '',
    category: 'material',
    quantity: 1,
    unit: 'piece',
    unitPrice: 0,
    isOptional: false
  });

  // Tipos de proyecto disponibles
  const projectTypes = [
    { value: 'fence', label: 'Fence Installation', subtypes: ['Wood Fence', 'Vinyl Fence', 'Chain Link', 'Metal Fence'] },
    { value: 'roof', label: 'Roofing', subtypes: ['Asphalt Shingles', 'Metal Roof', 'Tile Roof', 'Flat Roof'] },
    { value: 'deck', label: 'Deck Construction', subtypes: ['Wood Deck', 'Composite Deck', 'Stone Deck'] },
    { value: 'patio', label: 'Patio Installation', subtypes: ['Concrete Patio', 'Paver Patio', 'Stone Patio'] },
    { value: 'other', label: 'Other', subtypes: ['Custom Project'] }
  ];

  // Calcular totales automáticamente
  useEffect(() => {
    // Implement calculation logic here if needed.
  }, []);

    // Cargar clientes al montar el componente
    useEffect(() => {
      async function loadClients() {
        if (!currentUser) return;
  
        try {
          setLoadingClients(true);
          const clientsData = await getClients();
          console.log("Clientes cargados:", clientsData);
          setClients(clientsData);
        } catch (error) {
          console.error('Error al cargar clientes:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los clientes existentes.',
            variant: 'destructive'
          });
        } finally {
          setLoadingClients(false);
        }
      }
  
      loadClients();
    }, [currentUser, toast]);

  // Funciones para manejar ítems
  const addItem = () => {
    
  };

  const removeItem = (itemId: string) => {
    
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    
  };

  // Función para cargar un cliente existente
  // Función para guardar automáticamente nuevos clientes
  const saveNewClientAuto = async (clientData: any) => {
    try {
      if (!clientData.name || clientData.name.trim() === '') return null;
      
      const clientToSave = {
        name: clientData.name,
        email: clientData.email || null,
        phone: clientData.phone || null,
        address: clientData.address || null,
        company: clientData.company || null,
        userId: 1 // Usuario por defecto para desarrollo
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientToSave),
      });

      if (response.ok) {
        const newClient = await response.json();
        console.log('✅ Cliente guardado automáticamente:', newClient);
        
        // Actualizar la lista de clientes en memoria
        setClients(prev => [...prev, newClient]);
        
        toast({
          title: "Cliente Guardado",
          description: `${clientData.name} ha sido guardado en tu lista de clientes`
        });
        
        return newClient;
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
    }
    return null;
  };

  const loadExistingClient = (client: ClientType) => {
    setEstimate(prev => ({
      ...prev,
      clientName: client.name || '',
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
      clientAddress: client.address ? 
        `${client.address}${client.city ? `, ${client.city}` : ''}${client.state ? `, ${client.state}` : ''}${client.zipCode ? ` ${client.zipCode}` : ''}` : 
        ''
    }));

    setShowClientDialog(false);

    toast({
      title: "Cliente Seleccionado",
      description: `Se ha cargado la información de ${client.name}`
    });
  };

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone?.includes(clientSearch)
  );

  // Funciones de navegación
  const goToStep = (step: typeof currentStep) => {
    setCurrentStep(step);
  };

  const nextStep = async () => {
    const steps: typeof currentStep[] = ['client', 'project', 'items', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    
    // Si estamos saliendo del paso del cliente, guardar automáticamente si es un cliente nuevo
    if (currentStep === 'client' && estimate.clientName.trim() !== '') {
      const clientData = {
        name: estimate.clientName,
        email: estimate.clientEmail || '',
        phone: estimate.clientPhone || '',
        address: estimate.clientAddress || '',
        company: estimate.company || ''
      };
      
      // Verificar si es un cliente nuevo (no está en la lista)
      const existingClient = clients.find(client => 
        client.name?.toLowerCase() === clientData.name.toLowerCase() ||
        (client.email && clientData.email && client.email.toLowerCase() === clientData.email.toLowerCase())
      );
      
      if (!existingClient && clientData.name.trim() !== '') {
        console.log('🔄 Guardando cliente nuevo automáticamente...');
        await saveNewClientAuto(clientData);
      }
    }
    
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: typeof currentStep[] = ['client', 'project', 'items', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Función para guardar estimado
  const saveEstimate = async () => {
    
  };

  // Función para generar preview con el template premium
  const generatePreview = () => {
   
  };

    // Función para limpiar la búsqueda
    const clearSearch = () => {
      setClientSearch('');
    };

  // Mobile header con navegación
  const renderMobileHeader = () => (
    <div className="md:hidden bg-card border-b border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">Estimate Generator</h1>
        <Badge variant="outline" className="text-xs">
          Step {['client', 'project', 'items', 'review'].indexOf(currentStep) + 1}/4
        </Badge>
      </div>
      
      {/* Progress bar móvil */}
      <div className="w-full bg-muted rounded-full h-2 mb-4">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300" 
          style={{ width: `${(((['client', 'project', 'items', 'review'].indexOf(currentStep) + 1) / 4) * 100)}%` }}
        />
      </div>
      
      {/* Navegación horizontal móvil */}
      <div className="flex justify-between gap-1">
        {[
          { step: 'client', icon: User, label: 'Client' },
          { step: 'project', icon: Building, label: 'Project' },
          { step: 'items', icon: Calculator, label: 'Items' },
          { step: 'review', icon: Eye, label: 'Review' }
        ].map(({ step, icon: Icon, label }) => (
          <button
            key={step}
            onClick={() => goToStep(step as typeof currentStep)}
            className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors ${
              currentStep === step 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Render del sidebar para desktop
  const renderDesktopSidebar = () => (
    <div className="hidden md:flex w-80 bg-card border-r border-border p-6 flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Estimate Generator</h2>
        <p className="text-sm text-muted-foreground">Create professional estimates step by step</p>
        <Separator className="mt-4" />
      </div>

      {/* Progress Steps */}
      <div className="space-y-4 mb-6">
        {[
          { step: 'client', icon: User, label: 'Client Info', desc: 'Customer details' },
          { step: 'project', icon: Building, label: 'Project', desc: 'Project type & scope' },
          { step: 'items', icon: Calculator, label: 'Items', desc: 'Materials & labor' },
          { step: 'review', icon: Eye, label: 'Review', desc: 'Final review' }
        ].map(({ step, icon: Icon, label, desc }) => (
          <button
            key={step}
            onClick={() => goToStep(step as typeof currentStep)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
              currentStep === step 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
            }`}
          >
            <Icon className="h-5 w-5" />
            <div>
              <div className="font-medium">{label}</div>
              <div className="text-xs opacity-75">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      <Separator className="mb-6" />

      {/* Quick Stats */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Items</span>
          <Badge variant="secondary">{estimate.items.length}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-medium">${(estimate.subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-bold text-lg">${(estimate.total / 100).toFixed(2)}</span>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Action Buttons */}
      <div className="space-y-3 mt-auto">
        <Button 
          onClick={saveEstimate} 
          disabled={isSaving}
          className="w-full"
          variant="outline"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Draft'}
        </Button>
        
        <Button 
          onClick={generatePreview}
          className="w-full"
          disabled={estimate.items.length === 0}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </div>
    </div>
  );

  // Render del contenido principal según el paso actual
  const renderMainContent = () => {
    switch (currentStep) {
      case 'client':
        return (
          
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client Information
                  </CardTitle>
                  
                  <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs md:text-sm">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Load Existing Client</span>
                        <span className="sm:hidden">Load Client</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-lg md:text-xl">Select Existing Client</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search by name, email or phone..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="pl-10 text-sm md:text-base"
                          />
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          {clients.length > 0 && (
                            <span>
                              Showing {filteredClients.length} of {clients.length} clients
                            </span>
                          )}
                        </div>
                        
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {loadingClients ? (
                            <div className="flex items-center justify-center py-10">
                            <div className="space-y-2 text-center">
                              <User className="mx-auto h-10 w-10 text-muted-foreground animate-pulse" />
                              <div>Loading clients...</div>
                            </div>
                          </div>
                          ) : filteredClients.length > 0 ? (
                            filteredClients.map((client: any) => (
                              <div 
                                key={client.id}
                                onClick={() => loadExistingClient(client)}
                                className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-medium text-gray-900 group-hover:text-blue-700">
                                        {client.name || 'Unnamed Client'}
                                      </h3>
                                      {client.company && (
                                        <Badge variant="secondary" className="text-xs">
                                          {client.company}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      {client.email && (
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <span className="text-gray-400">📧</span>
                                          {client.email}
                                        </p>
                                      )}
                                      {client.phone && (
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <span className="text-gray-400">📞</span>
                                          {client.phone}
                                        </p>
                                      )}
                                      {client.address && (
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                          <span className="text-gray-400">📍</span>
                                          {client.address}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    Select
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No clients found matching "{clientSearch}"</p>
                              <p className="text-sm mt-1">Try searching by name, email, or phone</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={estimate.clientName}
                      onChange={(e) => setEstimate(prev => ({ ...prev, clientName: e.target.value }))}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={estimate.clientEmail}
                      onChange={(e) => setEstimate(prev => ({ ...prev, clientEmail: e.target.value }))}
                      placeholder="client@email.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientPhone">Phone</Label>
                    <Input
                      id="clientPhone"
                      value={estimate.clientPhone}
                      onChange={(e) => setEstimate(prev => ({ ...prev, clientPhone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimateNumber">Estimate Number</Label>
                    <Input
                      id="estimateNumber"
                      value={estimate.estimateNumber}
                      onChange={(e) => setEstimate(prev => ({ ...prev, estimateNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="clientAddress">Project Address *</Label>
                  <Input
                    id="clientAddress"
                    value={estimate.clientAddress}
                    onChange={(e) => setEstimate(prev => ({ ...prev, clientAddress: e.target.value }))}
                    placeholder="123 Main St, City, State, ZIP"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={nextStep} disabled={!estimate.clientName || !estimate.clientAddress}>
                    Next: Project Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          
        );

      case 'project':
        return (
          
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectType">Project Type *</Label>
                    <Select 
                      value={estimate.projectType} 
                      onValueChange={(value) => setEstimate(prev => ({ ...prev, projectType: value, projectSubtype: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="projectSubtype">Subtype *</Label>
                    <Select 
                      value={estimate.projectSubtype} 
                      onValueChange={(value) => setEstimate(prev => ({ ...prev, projectSubtype: value }))}
                      disabled={!estimate.projectType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subtype" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes
                          .find(type => type.value === estimate.projectType)
                          ?.subtypes.map(subtype => (
                            <SelectItem key={subtype} value={subtype}>
                              {subtype}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="projectDescription">Project Description</Label>
                  <Textarea
                    id="projectDescription"
                    value={estimate.projectDescription}
                    onChange={(e) => setEstimate(prev => ({ ...prev, projectDescription: e.target.value }))}
                    placeholder="Detailed description of the project..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scope">Scope of Work</Label>
                    <Textarea
                      id="scope"
                      value={estimate.scope}
                      onChange={(e) => setEstimate(prev => ({ ...prev, scope: e.target.value }))}
                      placeholder="What work will be included..."
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timeline">Timeline</Label>
                    <Input
                      id="timeline"
                      value={estimate.timeline}
                      onChange={(e) => setEstimate(prev => ({ ...prev, timeline: e.target.value }))}
                      placeholder="e.g., 3-5 business days"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={prevStep} variant="outline">
                    Back: Client Info
                  </Button>
                  <Button onClick={nextStep} disabled={!estimate.projectType || !estimate.projectSubtype}>
                    Next: Add Items
                  </Button>
                </div>
              </CardContent>
            </Card>
          
        );

      case 'items':
        return (
          
            <div className="space-y-6">
              {/* Add New Item Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Add New Item
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="itemName">Item Name *</Label>
                      <Input
                        id="itemName"
                        value={newItem.name || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Wood Posts"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={newItem.category} 
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="labor">Labor</SelectItem>
                          <SelectItem value="additional">Additional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select 
                        value={newItem.unit} 
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, unit: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="piece">Piece</SelectItem>
                          <SelectItem value="linear_ft">Linear Ft</SelectItem>
                          <SelectItem value="sq_ft">Sq Ft</SelectItem>
                          <SelectItem value="hour">Hour</SelectItem>
                          <SelectItem value="day">Day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newItem.description || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the item..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.quantity || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="unitPrice">Unit Price *</Label>
                      <Input
                        id="unitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unitPrice || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Total</Label>
                      <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                        ${((newItem.quantity || 0) * (newItem.unitPrice || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Items List */}
              {estimate.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Estimate Items ({estimate.items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {estimate.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">{item.unit}</span>
                          </div>
                          
                          <div className="text-right min-w-[100px]">
                            <div className="font-medium">${(item.totalPrice / 100).toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              ${(item.unitPrice / 100).toFixed(2)} / {item.unit}
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => removeItem(item.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-4">
                <Button onClick={prevStep} variant="outline">
                  Back: Project Details
                </Button>
                <Button onClick={nextStep} disabled={estimate.items.length === 0}>
                  Next: Review
                </Button>
              </div>
            </div>
          
        );

      case 'review':
        return (
          
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Estimate Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Client Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Client Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Name:</strong> {estimate.clientName}</div>
                      <div><strong>Email:</strong> {estimate.clientEmail || 'Not provided'}</div>
                      <div><strong>Phone:</strong> {estimate.clientPhone || 'Not provided'}</div>
                      <div><strong>Address:</strong> {estimate.clientAddress}</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Project Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Project Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Type:</strong> {estimate.projectType}</div>
                      <div><strong>Subtype:</strong> {estimate.projectSubtype}</div>
                      <div><strong>Timeline:</strong> {estimate.timeline || 'TBD'}</div>
                      <div><strong>Valid Until:</strong> {new Date(estimate.validUntil).toLocaleDateString()}</div>
                    </div>
                    {estimate.scope && (
                      <div className="mt-2">
                        <strong>Scope:</strong> {estimate.scope}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Financial Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Financial Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${(estimate.subtotal / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax ({estimate.taxRate}%):</span>
                        <span>${(estimate.taxAmount / 100).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>${(estimate.total / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={generatePreview} className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview PDF
                    </Button>
                    <Button onClick={saveEstimate} variant="outline" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Send to Client
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-start pt-4">
                <Button onClick={prevStep} variant="outline">
                  Back: Items
                </Button>
              </div>
            </div>
          
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {renderSidebar()}
      
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            <div className="lg:col-span-12">
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Create New Estimate</h1>
                <p className="text-muted-foreground">Generate an estimate for your client</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main content area takes full width now */}

                {/* Main content area with full width */}
                <div className="lg:col-span-12 w-full">
                  <Tabs defaultValue="client" className="mt-0 p-0">
                    <TabsList className="hidden">
                      <TabsTrigger value="client">Client</TabsTrigger>
                      <TabsTrigger value="project">Project</TabsTrigger>
                      <TabsTrigger value="items">Items</TabsTrigger>
                      <TabsTrigger value="review">Review</TabsTrigger>
                    </TabsList>

                    <TabsContent value="client" className="mt-0 p-0" forceMount={currentStep === 'client'}>
                      
                        <Card>
                          <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                            <CardDescription>
                              Enter client details or select an existing client
                            </CardDescription>
                            {/* Botón para seleccionar cliente existente */}
                            <div className="flex justify-end">
                              <Button onClick={() => setShowClientDialog(true)} variant="outline" className="mt-2">
                                <Search className="mr-2 h-4 w-4" />
                                Select Existing Client
                              </Button>
                            </div>

                            {/* Modal para seleccionar cliente */}
                            <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
                              <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                                <DialogHeader className="flex-shrink-0">
                                  <DialogTitle>Select Existing Client</DialogTitle>
                                </DialogHeader>

                                <div className="relative flex-shrink-0 mb-4">
                                  <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search by name, email or phone"
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    className="pl-10 pr-10"
                                  />
                                  {clientSearch && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-2 h-6 w-6"
                                      onClick={clearSearch}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>

                                {/* Contador de resultados */}
                                <div className="text-sm text-muted-foreground mb-2 flex-shrink-0">
                                  {clients.length > 0 && (
                                    <span>
                                      Showing {filteredClients.length} of {clients.length} clients
                                    </span>
                                  )}
                                </div>

                                <div className="flex-1 overflow-y-auto border rounded-md min-h-0" style={{ maxHeight: '400px' }}>
                                  {loadingClients ? (
                                    <div className="flex items-center justify-center py-10">
                                      <div className="space-y-2 text-center">
                                        <User className="mx-auto h-10 w-10 text-muted-foreground animate-pulse" />
                                        <div>Loading clients...</div>
                                      </div>
                                    </div>
                                  ) : filteredClients.length > 0 ? (
                                    <div className="space-y-2 p-2">
                                      {filteredClients.map((client) => (
                                        <div
                                          key={client.id}
                                          className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all duration-200 group"
                                          onClick={() => loadExistingClient(client)}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                              <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                                              <div className="space-y-1 mt-2">
                                                {client.email && (
                                                  <p className="flex items-center text-sm text-gray-600">
                                                    <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{client.email}</span>
                                                  </p>
                                                )}
                                                {client.phone && (
                                                  <p className="flex items-center text-sm text-gray-600">
                                                    <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                                    <span>{client.phone}</span>
                                                  </p>
                                                )}
                                                {client.address && (
                                                  <p className="flex items-center text-sm text-gray-600">
                                                    <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{client.address}</span>
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <Button 
                                              variant="default" 
                                              size="sm" 
                                              className="ml-4 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                loadExistingClient(client);
                                              }}
                                            >
                                              Select
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-gray-500">
                                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p>No clients found matching "{clientSearch}"</p>
                                      <p className="text-sm mt-1">Try searching by name, email, or phone</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="clientName">Client Name *</Label>
                                <Input
                                  id="clientName"
                                  value={estimate.clientName}
                                  onChange={(e) => setEstimate(prev => ({ ...prev, clientName: e.target.value }))}
                                  placeholder="Enter client name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="clientEmail">Email</Label>
                                <Input
                                  id="clientEmail"
                                  type="email"
                                  value={estimate.clientEmail}
                                  onChange={(e) => setEstimate(prev => ({ ...prev, clientEmail: e.target.value }))}
                                  placeholder="client@example.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="clientPhone">Phone</Label>
                                <Input
                                  id="clientPhone"
                                  value={estimate.clientPhone}
                                  onChange={(e) => setEstimate(prev => ({ ...prev, clientPhone: e.target.value }))}
                                  placeholder="(555) 123-4567"
                                />
                              </div>

                              <div>
                                <Label htmlFor="clientAddress">Project Address *</Label>
                                <Input
                                  id="clientAddress"
                                  value={estimate.clientAddress}
                                  onChange={(e) => setEstimate(prev => ({ ...prev, clientAddress: e.target.value }))}
                                  placeholder="123 Main St, City, State, ZIP"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                              <Button onClick={nextStep} disabled={!estimate.clientName || !estimate.clientAddress}>
                                Next: Project Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      
                    </TabsContent>

                    <TabsContent value="project" className="mt-0 p-0" forceMount={currentStep === 'project'}>
                      
                        <Card>
                          <CardHeader>
                            <CardTitle>Project Details</CardTitle>
                            <CardDescription>
                              Describe the project scope and requirements
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="projectTitle">Project Title *</Label>
                              <Input
                                id="projectTitle"
                                value={estimate.title}
                                onChange={(e) => setEstimate(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g. Fence Installation, Kitchen Remodel"
                              />
                            </div>

                            <div>
                              <Label htmlFor="projectDescription">Project Description *</Label>
                              <div className="relative">
                                <Textarea
                                  id="projectDescription"
                                  value={estimate.projectDescription}
                                  onChange={(e) => setEstimate(prev => ({ ...prev, projectDescription: e.target.value }))}
                                  placeholder="Describe the project scope, materials, and special requirements"
                                  className="min-h-[150px]"
                                />
                                <div className="absolute right-2 top-2">
                                  <ProjectDescriptionEnhancer 
                                    originalText={estimate.projectDescription} 
                                    onTextEnhanced={(text) => setEstimate(prev => ({ ...prev, projectDescription: text }))}
                                    projectType={estimate.projectType}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between gap-2 pt-4">
                              <Button variant="outline" onClick={prevStep}>
                                Back: Client Info
                              </Button>
                              <Button 
                                onClick={nextStep} 
                                disabled={!estimate.title || !estimate.projectDescription}
                              >
                                Next: Items & Pricing
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      
                    </TabsContent>

                    <TabsContent value="items" className="mt-0 p-0" forceMount={currentStep === 'items'}>
                      
                        <Card>
                          <CardHeader>
                            <CardTitle>Items & Pricing</CardTitle>
                            <CardDescription>
                              Add materials, labor, and other line items
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* Aquí irá la tabla de items */}
                              <p className="text-center text-muted-foreground py-4">
                                No items added yet. Click below to add materials or labor.
                              </p>

                              <Button variant="outline" className="w-full">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Item
                              </Button>

                              <div className="border rounded-md p-4 mt-6 bg-muted/50">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium">Subtotal:</span>
                                  <span>${estimate.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium">Tax:</span>
                                  <span>${estimate.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold">
                                  <span>Total:</span>
                                  <span>${estimate.total.toFixed(2)}</span>
                                </div>
                              </div>

                              <div className="flex justify-between gap-2 pt-4">
                                <Button variant="outline" onClick={prevStep}>
                                  Back: Project Details
                                </Button>
                                <Button onClick={nextStep}>
                                  Next: Review
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      
                    </TabsContent>

                    <TabsContent value="review" className="mt-0 p-0" forceMount={currentStep === 'review'}>
                      
                        <Card>
                          <CardHeader>
                            <CardTitle>Review & Send</CardTitle>
                            <CardDescription>
                              Review your estimate before sending to the client
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="border rounded-md p-4">
                                <h3 className="font-medium mb-2">Client Information</h3>
                                <p><strong>Name:</strong> {estimate.clientName}</p>
                                <p><strong>Email:</strong> {estimate.clientEmail || 'Not provided'}</p>
                                <p><strong>Phone:</strong> {estimate.clientPhone || 'Not provided'}</p>
                                <p><strong>Address:</strong> {estimate.clientAddress}</p>
                              </div>

                              <div className="border rounded-md p-4">
                                <h3 className="font-medium mb-2">Project Details</h3>
                                <p><strong>Title:</strong> {estimate.title}</p>
                                <p><strong>Description:</strong> {estimate.projectDescription}</p>
                              </div>

                              <div className="border rounded-md p-4">
                                <h3 className="font-medium mb-2">Pricing</h3>
                                <p><strong>Subtotal:</strong> ${estimate.subtotal.toFixed(2)}</p>
                                <p><strong>Tax:</strong> ${estimate.tax.toFixed(2)}</p>
                                <p className="text-lg font-bold"><strong>Total:</strong> ${estimate.total.toFixed(2)}</p>
                              </div>

                              <div>
                                <Label htmlFor="notes">Additional Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={estimate.notes}
                                  onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                                  placeholder="Add any terms, conditions, or additional notes"
                                  className="min-h-[100px]"
                                />
                              </div>

                              <div className="flex justify-between gap-2 pt-4">
                                <Button variant="outline" onClick={prevStep}>
                                  Back: Items & Pricing
                                </Button>
                                <div className="space-x-2">
                                  <Button variant="outline">
                                    Preview PDF
                                  </Button>
                                  <Button>
                                    Save & Send
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}