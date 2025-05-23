import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function EstimateGenerator() {
  const { toast } = useToast();
  
  // Estados principales
  const [currentStep, setCurrentStep] = useState<'client' | 'project' | 'items' | 'review'>('client');
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [estimate, setEstimate] = useState<EstimateData>({
    estimateNumber: `EST-${Date.now()}`,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectType: '',
    projectSubtype: '',
    projectDescription: '',
    scope: '',
    timeline: '',
    items: [],
    subtotal: 0,
    taxRate: 8.75,
    taxAmount: 0,
    total: 0,
    status: 'draft',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    internalNotes: ''
  });
  
  // Query para obtener clientes existentes
  const { data: clients = [] } = useQuery({
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
    const subtotal = estimate.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = (subtotal * estimate.taxRate) / 100;
    const total = subtotal + taxAmount;
    
    setEstimate(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      total
    }));
  }, [estimate.items, estimate.taxRate]);

  // Funciones para manejar ítems
  const addItem = () => {
    if (!newItem.name || !newItem.unitPrice) {
      toast({
        title: "Error",
        description: "Please fill in item name and unit price",
        variant: "destructive"
      });
      return;
    }

    const item: EstimateItem = {
      id: `item-${Date.now()}`,
      name: newItem.name!,
      description: newItem.description || '',
      category: newItem.category as 'material' | 'labor' | 'additional',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'piece',
      unitPrice: newItem.unitPrice!,
      totalPrice: (newItem.quantity || 1) * (newItem.unitPrice || 0),
      sortOrder: estimate.items.length,
      isOptional: newItem.isOptional || false
    };

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    // Reset form
    setNewItem({
      name: '',
      description: '',
      category: 'material',
      quantity: 1,
      unit: 'piece',
      unitPrice: 0,
      isOptional: false
    });

    toast({
      title: "Item Added",
      description: "Item has been added to the estimate"
    });
  };

  const removeItem = (itemId: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
          : item
      )
    }));
  };

  // Función para cargar un cliente existente
  const loadExistingClient = (client: any) => {
    setEstimate(prev => ({
      ...prev,
      clientName: client.name || '',
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
      clientAddress: client.address || ''
    }));
    
    setShowClientDialog(false);
    
    toast({
      title: "Cliente Cargado",
      description: `Información de ${client.name} cargada exitosamente`
    });
  };

  // Filtrar clientes por búsqueda
  const filteredClients = clients.filter((client: any) =>
    client.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone?.includes(clientSearch)
  );

  // Funciones de navegación
  const goToStep = (step: typeof currentStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const steps: typeof currentStep[] = ['client', 'project', 'items', 'review'];
    const currentIndex = steps.indexOf(currentStep);
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
    setIsSaving(true);
    try {
      // Aquí iría la llamada a la API para guardar
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simular guardado
      
      toast({
        title: "Estimate Saved",
        description: `Estimate ${estimate.estimateNumber} has been saved successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save estimate",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Función para generar preview con el template premium
  const generatePreview = () => {
    setShowPreview(true);
    toast({
      title: "Preview Generated",
      description: "Estimate preview is ready using premium template"
    });
  };

  // Render del sidebar
  const renderSidebar = () => (
    <div className="w-80 bg-card border-r border-border p-6 flex flex-col">
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
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Load Existing Client</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Select Existing Client</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name, email or phone..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client: any) => (
                            <div 
                              key={client.id}
                              onClick={() => loadExistingClient(client)}
                              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium text-gray-900">{client.name}</h3>
                                  <p className="text-sm text-gray-600">{client.email}</p>
                                  <p className="text-sm text-gray-600">{client.phone}</p>
                                  {client.address && (
                                    <p className="text-sm text-gray-500 mt-1">{client.address}</p>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm">
                                  Select
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            {clientSearch ? 'No clients found matching your search' : 'No clients available'}
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {renderSidebar()}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderMainContent()}
      </div>
    </div>
  );
}