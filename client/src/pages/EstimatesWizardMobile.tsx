import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getClients as getFirebaseClients, saveClient } from '@/lib/clientFirebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Search, 
  Plus, 
  User, 
  Package, 
  FileText, 
  Eye, 
  Send, 
  Save, 
  Trash2, 
  Users, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Calculator,
  Building2,
  UserPlus,
  Brain,
  Minus,
  Download,
  RefreshCw,
  AlertCircle,
  Edit,
  Mail,
  X,
  Menu
} from 'lucide-react';

// Types
interface Client {
  id: string;
  clientId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  source?: string;
  classification?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface Material {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
}

interface EstimateItem {
  id: string;
  materialId: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
}

interface EstimateData {
  client: Client | null;
  items: EstimateItem[];
  projectDetails: string;
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  discountName: string;
}

const STEPS = [
  { id: 'client', title: 'Cliente', icon: User },
  { id: 'details', title: 'Detalles', icon: FileText },
  { id: 'materials', title: 'Materiales', icon: Package },
  { id: 'preview', title: 'Vista Previa', icon: Eye }
];

export default function EstimatesWizardMobile() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const [currentStep, setCurrentStep] = useState(0);
  const [estimate, setEstimate] = useState<EstimateData>({
    client: null,
    items: [],
    projectDetails: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    taxRate: 10,
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0,
    discountName: ''
  });

  // Data from existing systems
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);

  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');

  // New client form
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: ''
  });

  // Load clients and materials on component mount
  useEffect(() => {
    if (currentUser) {
      loadClientsFromFirebase();
      loadMaterialsFromFirebase();
    }
  }, [currentUser]);

  // Calculate totals whenever items change
  useEffect(() => {
    calculateTotals();
  }, [estimate.items, estimate.taxRate, estimate.discountType, estimate.discountValue]);

  const loadClientsFromFirebase = async () => {
    if (!currentUser) return;
    
    try {
      const clientsData = await getFirebaseClients(currentUser.uid);
      setClients(clientsData as Client[]);
    } catch (error) {
      console.error('Error loading clients from Firebase:', error);
      toast({
        title: 'Error',
        description: 'Could not load clients',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadMaterialsFromFirebase = async () => {
    if (!currentUser) return;
    
    try {
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const materialsData: Material[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const material: Material = {
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          price: data.price || 0,
          unit: data.unit || 'unit',
          category: data.category || 'General'
        };
        materialsData.push(material);
      });
      
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading materials from Firebase:', error);
      toast({
        title: 'Error',
        description: 'Could not load materials',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // Filter clients and materials
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.category.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // Add material to estimate
  const addMaterialToEstimate = (material: Material) => {
    const newItem: EstimateItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      materialId: material.id,
      name: material.name,
      description: material.description,
      quantity: 1,
      price: material.price,
      unit: material.unit,
      total: material.price
    };

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setShowMaterialDialog(false);
    setMaterialSearch('');
    
    toast({
      title: 'Material agregado',
      description: `${material.name} fue agregado al estimado`
    });
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    }));
  };

  // Update item price
  const updateItemPrice = (itemId: string, price: number) => {
    if (price < 0) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, price, total: item.quantity * price }
          : item
      )
    }));
  };

  // Remove item from estimate
  const removeItemFromEstimate = (itemId: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    
    let discountAmount = 0;
    if (estimate.discountType === 'percentage') {
      discountAmount = (subtotal * estimate.discountValue) / 100;
    } else {
      discountAmount = estimate.discountValue;
    }

    const taxableAmount = subtotal - discountAmount;
    const tax = (taxableAmount * estimate.taxRate) / 100;
    const total = taxableAmount + tax;

    setEstimate(prev => ({
      ...prev,
      subtotal,
      discountAmount,
      tax: tax > 0 ? tax : 0,
      total: total > 0 ? total : 0
    }));
  };

  // Add new client
  const addNewClient = async () => {
    if (!newClient.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del cliente es requerido',
        variant: 'destructive'
      });
      return;
    }

    try {
      const clientData = {
        ...newClient,
        clientId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser?.uid || '',
        createdAt: new Date(),
        source: 'estimate_wizard'
      };

      const savedClient = await saveClient(clientData);
      
      const newClientObj: Client = {
        id: savedClient.id,
        clientId: savedClient.id,
        ...clientData
      };

      setClients(prev => [newClientObj, ...prev]);
      setEstimate(prev => ({ ...prev, client: newClientObj }));
      setShowAddClientDialog(false);
      
      // Reset form
      setNewClient({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        notes: ''
      });

      toast({
        title: 'Cliente agregado',
        description: `${newClient.name} fue agregado y seleccionado`
      });

    } catch (error) {
      console.error('Error adding client:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar el cliente',
        variant: 'destructive'
      });
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render current step content
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Client Selection
        return (
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Seleccionar Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Add Client */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
                  <DialogTrigger asChild>
                    <Button size="default" className="flex-shrink-0">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nuevo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-md mx-4">
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                          id="name"
                          value={newClient.name}
                          onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newClient.email}
                          onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={newClient.phone}
                          onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                          id="address"
                          value={newClient.address}
                          onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="123 Main St"
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setShowAddClientDialog(false)} className="w-full sm:w-auto">
                        Cancelar
                      </Button>
                      <Button onClick={addNewClient} className="w-full sm:w-auto">
                        Agregar Cliente
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Current Selection */}
              {estimate.client && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-800">{estimate.client.name}</h4>
                      <p className="text-sm text-green-600">{estimate.client.email || 'Sin email'}</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Seleccionado
                    </Badge>
                  </div>
                </div>
              )}

              {/* Clients List - Mobile Optimized */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {isLoadingClients ? (
                  <p className="text-center py-4 text-muted-foreground">Cargando clientes...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {clientSearch ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                  </p>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        estimate.client?.id === client.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setEstimate(prev => ({ ...prev, client }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">{client.name}</h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {client.email || 'Sin email'}
                          </p>
                          {client.phone && (
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          )}
                        </div>
                        {estimate.client?.id === client.id && (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Project Details
        return (
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Detalles del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectDetails">Descripción del Proyecto *</Label>
                <Textarea
                  id="projectDetails"
                  value={estimate.projectDetails}
                  onChange={(e) => setEstimate(prev => ({ ...prev, projectDetails: e.target.value }))}
                  placeholder="Describe detalladamente el trabajo a realizar..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Una descripción detallada ayuda a generar un estimado más preciso
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Materials Selection - COMPLETELY MOBILE RESPONSIVE
        return (
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="text-lg">Materiales ({estimate.items.length})</span>
                  </div>
                </div>
                
                {/* Mobile Optimized Action Buttons */}
                <div className="flex flex-col space-y-2 w-full">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="w-full justify-center"
                    disabled={!estimate.projectDetails.trim()}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    DeepSearch IA
                  </Button>
                  
                  <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Seleccionar Material</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 flex-1 overflow-hidden">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar materiales..."
                            value={materialSearch}
                            onChange={(e) => setMaterialSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 max-h-64">
                          {isLoadingMaterials ? (
                            <p className="text-center py-4 text-muted-foreground">Cargando materiales...</p>
                          ) : filteredMaterials.length === 0 ? (
                            <p className="text-center py-4 text-muted-foreground">
                              {materialSearch ? 'No se encontraron materiales' : 'No hay materiales disponibles'}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {filteredMaterials.map((material) => (
                                <div
                                  key={material.id}
                                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                  onClick={() => addMaterialToEstimate(material)}
                                >
                                  <h4 className="font-medium text-sm">{material.name}</h4>
                                  <p className="text-xs text-muted-foreground">{material.category}</p>
                                  <p className="text-sm font-medium text-primary">
                                    ${material.price?.toFixed(2) || '0.00'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {estimate.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay materiales agregados</p>
                  <p className="text-sm">Agrega materiales para comenzar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {estimate.items.map((item, index) => (
                    <div key={item.id} className="p-3 border rounded-lg space-y-3">
                      {/* Item Header - Mobile First */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItemFromEstimate(item.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Price Input - Full Width on Mobile */}
                      <div className="space-y-2">
                        <Label className="text-xs">Precio por {item.unit}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">$</span>
                          <Input
                            type="number"
                            value={item.price.toFixed(2)}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="flex-1 h-9 text-sm"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      {/* Quantity Controls - Mobile Optimized */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Cantidad:</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center text-sm"
                              min="1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Total Price */}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-bold text-lg">${item.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Totals Summary - Mobile Optimized */}
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                    <h3 className="font-medium text-center">Resumen del Estimado</h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold">${estimate.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {estimate.discountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-emerald-600">
                            Descuento ({estimate.discountType === 'percentage' ? `${estimate.discountValue}%` : `$${estimate.discountValue}`}):
                          </span>
                          <span className="font-semibold text-emerald-600">-${estimate.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Impuesto ({estimate.taxRate}%):</span>
                        <span className="font-semibold">${estimate.tax.toFixed(2)}</span>
                      </div>
                      
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold">Total:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            ${estimate.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3: // Preview
        return (
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!estimate.client || estimate.items.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className="text-lg font-medium">Estimado Incompleto</p>
                  <p className="text-muted-foreground text-sm">
                    Necesitas seleccionar un cliente y agregar materiales
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Client Info */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Cliente</h3>
                    <p className="text-sm">{estimate.client.name}</p>
                    <p className="text-sm text-muted-foreground">{estimate.client.email}</p>
                  </div>
                  
                  {/* Items Summary */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Materiales ({estimate.items.length})</h3>
                    <div className="space-y-1">
                      {estimate.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="truncate">{item.quantity}x {item.name}</span>
                          <span className="font-medium">${item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total del Estimado</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${estimate.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button className="w-full" size="default">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar PDF
                    </Button>
                    <Button variant="outline" className="w-full" size="default">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar por Email
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold">Nuevo Estimado</h1>
            <p className="text-xs text-muted-foreground">{STEPS[currentStep].title}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentStep + 1} / {STEPS.length}
          </div>
        </div>
      </div>

      {/* Progress Steps - Mobile Optimized */}
      <div className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mb-1 ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs font-medium text-center">{step.title}</span>
                {index < STEPS.length - 1 && (
                  <div className="hidden sm:block w-full h-0.5 bg-muted absolute top-4 left-1/2 transform translate-x-1/2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20">
        {renderCurrentStep()}
      </div>

      {/* Navigation Footer - Sticky */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="flex justify-between gap-3 max-w-lg mx-auto">
          <Button 
            onClick={prevStep} 
            disabled={currentStep === 0}
            variant="outline"
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button 
            onClick={nextStep} 
            disabled={currentStep === STEPS.length - 1}
            className="flex-1"
          >
            {currentStep === STEPS.length - 1 ? 'Completar' : 'Siguiente'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}