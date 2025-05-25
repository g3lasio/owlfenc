import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
// Usar el logo correcto de OWL FENCE
const mervinLogoUrl = "https://ik.imagekit.io/lp5czyx2a/ChatGPT%20Image%20May%2010,%202025,%2005_35_38%20PM.png?updatedAt=1748157114019";
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
  AlertCircle
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
}

const STEPS = [
  { id: 'client', title: 'Cliente', icon: User },
  { id: 'details', title: 'Detalles', icon: FileText },
  { id: 'materials', title: 'Materiales', icon: Package },
  { id: 'preview', title: 'Vista Previa', icon: Eye }
];

export default function EstimatesWizardFixed() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [estimate, setEstimate] = useState<EstimateData>({
    client: null,
    items: [],
    projectDetails: '',
    subtotal: 0,
    tax: 0,
    total: 0
  });

  // Data from existing systems
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [contractor, setContractor] = useState<any>(null);

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

  // AI enhancement states
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showMervinMessage, setShowMervinMessage] = useState(false);
  const [showCompanyEditDialog, setShowCompanyEditDialog] = useState(false);
  const [editableCompany, setEditableCompany] = useState({
    companyName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    license: '',
    insurancePolicy: '',
    logo: ''
  });

  // Load data on mount
  useEffect(() => {
    loadClients();
    loadMaterials();
    loadContractorProfile();
  }, [currentUser]);

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    setEstimate(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  }, [estimate.items]);

  // Initialize company data when contractor profile loads
  useEffect(() => {
    if (contractor) {
      setEditableCompany({
        companyName: contractor.companyName || contractor.name || '',
        address: contractor.address || '',
        city: contractor.city || '',
        state: contractor.state || '',
        zipCode: contractor.zipCode || '',
        phone: contractor.phone || '',
        email: contractor.email || '',
        website: contractor.website || '',
        license: contractor.license || '',
        insurancePolicy: contractor.insurancePolicy || '',
        logo: contractor.logo || ''
      });
    }
  }, [contractor]);

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      const clientsData = await getFirebaseClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients from Firebase:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadMaterials = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoadingMaterials(true);
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      const materialsData: Material[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Material, 'id'>;
        const material: Material = {
          id: doc.id,
          ...data,
          price: typeof data.price === 'number' ? data.price : 0
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

  const loadContractorProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setContractor(data);
      }
    } catch (error) {
      console.error('Error loading contractor profile:', error);
    }
  };

  // AI Enhancement Function - Simplified for single field
  const enhanceProjectWithAI = async () => {
    if (!estimate.projectDetails.trim()) {
      toast({
        title: 'Descripción Requerida',
        description: 'Por favor describe tu proyecto para usar Mervin AI',
        variant: 'destructive'
      });
      return;
    }

    setIsAIProcessing(true);
    
    try {
      console.log('🤖 Starting Mervin AI enhancement...');
      
      const response = await fetch('/api/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalText: estimate.projectDetails,
          projectType: 'construction estimate'
        }),
      });

      if (!response.ok) {
        throw new Error('Error al procesar con Mervin AI');
      }
      
      const result = await response.json();
      console.log('✅ Mervin AI Response:', result);
      
      if (result.enhancedDescription) {
        setEstimate(prev => ({ 
          ...prev, 
          projectDetails: result.enhancedDescription 
        }));
        
        toast({
          title: '✨ Mejorado con Mervin AI',
          description: 'La descripción del proyecto ha sido mejorada profesionalmente'
        });
      } else {
        throw new Error('No se pudo generar contenido mejorado');
      }
      
    } catch (error) {
      console.error('Error enhancing with AI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar con Mervin AI. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsAIProcessing(false);
    }
  };

  // Navigation
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

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return estimate.client !== null;
      case 1: return estimate.projectDetails.trim().length > 0;
      case 2: return estimate.items.length > 0;
      case 3: return true;
      default: return false;
    }
  };

  // Filter clients and materials
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
    (client.phone && client.phone.includes(clientSearch)) ||
    (client.mobilePhone && client.mobilePhone.includes(clientSearch))
  );

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.description.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.category.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // Client selection
  const selectClient = (client: Client) => {
    setEstimate(prev => ({ ...prev, client }));
    toast({
      title: 'Client Selected',
      description: `${client.name} has been added to the estimate`
    });
  };

  // Create new client manually
  const createNewClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast({
        title: 'Required Data',
        description: 'Name and email are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const clientData = {
        clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone || '',
        mobilePhone: '',
        address: newClient.address || '',
        city: newClient.city || '',
        state: newClient.state || '',
        zipCode: newClient.zipCode || '',
        notes: newClient.notes || '',
        source: 'Manual - Estimates',
        classification: 'cliente',
        tags: []
      };

      const savedClient = await saveClient(clientData);
      
      const clientWithId = { 
        id: savedClient.id, 
        ...clientData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setClients(prev => [clientWithId, ...prev]);
      setEstimate(prev => ({ ...prev, client: clientWithId }));
      
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
      setShowAddClientDialog(false);
      
      toast({
        title: 'Client Created',
        description: `${clientData.name} has been created and selected`
      });
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: 'Could not create client',
        variant: 'destructive'
      });
    }
  };

  // Add material to estimate
  const addMaterialToEstimate = (material: Material) => {
    const estimateItem: EstimateItem = {
      id: `item-${Date.now()}`,
      materialId: material.id,
      name: material.name,
      description: material.description || '',
      quantity: 1,
      price: material.price,
      unit: material.unit || 'unit',
      total: material.price * 1
    };

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, estimateItem]
    }));

    setShowMaterialDialog(false);
    
    toast({
      title: 'Material Added',
      description: `${material.name} has been added to the estimate`
    });
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
          : item
      )
    }));
  };

  // Update item price
  const updateItemPrice = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, price: newPrice, total: newPrice * item.quantity }
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
    
    toast({
      title: 'Material Removed',
      description: 'The material has been removed from the estimate'
    });
  };

  // Generate estimate preview
  const generateEstimatePreview = () => {
    if (!estimate.client || estimate.items.length === 0) {
      return '<p>Incomplete estimate data</p>';
    }

    const estimateNumber = `EST-${Date.now()}`;
    const estimateDate = new Date().toLocaleDateString();

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header with Company Info and Logo -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="flex: 1;">
            ${contractor?.logo ? `
              <img src="${contractor.logo}" alt="Company Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />
            ` : ''}
            <h2 style="margin: 0; color: #2563eb; font-size: 1.5em;">${contractor?.companyName || 'Your Company'}</h2>
            <p style="margin: 5px 0; color: #666;">
              ${contractor?.address || ''}<br>
              ${contractor?.city ? `${contractor.city}, ` : ''}${contractor?.state || ''} ${contractor?.zipCode || ''}<br>
              ${contractor?.phone || ''}<br>
              ${contractor?.email || ''}
            </p>
            ${contractor?.website ? `<p style="margin: 5px 0; color: #2563eb;">${contractor.website}</p>` : ''}
            ${contractor?.license ? `<p style="margin: 5px 0; font-size: 0.9em; color: #666;">License: ${contractor.license}</p>` : ''}
          </div>
          
          <div style="text-align: right;">
            <h1 style="margin: 0; color: #2563eb; font-size: 2.2em;">ESTIMATE</h1>
            <p style="margin: 10px 0; font-size: 1.1em;"><strong>Estimate #:</strong> ${estimateNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${estimateDate}</p>
          </div>
        </div>
        
        <!-- Client Information -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1; padding-right: 20px;">
            <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Bill To:</h3>
            <p style="margin: 5px 0; font-size: 1.1em; color: #000000;"><strong>${estimate.client.name}</strong></p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client.email || ''}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client.phone || ''}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client.address || ''}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client.city ? `${estimate.client.city}, ` : ''}${estimate.client.state || ''} ${estimate.client.zipCode || ''}</p>
          </div>
        </div>

        <!-- Project Details -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Project Details</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; line-height: 1.6;">
            ${estimate.projectDetails.replace(/\n/g, '<br>')}
          </div>
        </div>

        <!-- Materials & Labor -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Materials & Labor</h3>
          <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: #2563eb; color: white;">
                <th style="border: 1px solid #2563eb; padding: 12px; text-align: left; font-weight: bold;">Description</th>
                <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Qty</th>
                <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Unit Price</th>
                <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.items.map((item, index) => `
                <tr style="background: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                  <td style="border: 1px solid #ddd; padding: 12px; color: #000000;">${item.name}${item.description ? `<br><small style="color: #333333;">${item.description}</small>` : ''}</td>
                  <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.quantity} ${item.unit}</td>
                  <td style="border: 1px solid #ddd; padding: 12px; text-align: right; color: #000000;">$${item.price.toFixed(2)}</td>
                  <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; color: #000000;">$${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div style="text-align: right; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
          <div style="margin-bottom: 10px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 20px; color: #000000;"><strong>Subtotal:</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.subtotal.toFixed(2)}</span>
          </div>
          <div style="margin-bottom: 15px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 20px; color: #000000;"><strong>Tax (16%):</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.tax.toFixed(2)}</span>
          </div>
          <div style="border-top: 2px solid #2563eb; padding-top: 15px; font-size: 1.3em; color: #2563eb;">
            <span style="margin-right: 20px; color: #2563eb;"><strong>TOTAL:</strong></span>
            <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">$${estimate.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 0.9em;">
          <p style="margin: 10px 0;"><strong>This estimate is valid for 30 days from the date shown above.</strong></p>
          <p style="margin: 10px 0;">Thank you for considering ${contractor?.companyName || 'our company'} for your project!</p>
          ${contractor?.insurancePolicy ? `<p style="margin: 5px 0;">Fully Insured - Policy #: ${contractor.insurancePolicy}</p>` : ''}
        </div>
      </div>
    `;
    
    setPreviewHtml(html);
    return html;
  };

  // Download PDF
  const downloadPDF = async () => {
    try {
      const html = generateEstimatePreview();
      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename: `estimate-${estimate.client?.name || 'client'}.pdf` }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `estimate-${estimate.client?.name || 'client'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: 'PDF Downloaded',
          description: 'The estimate has been downloaded as PDF'
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Could not download PDF',
        variant: 'destructive'
      });
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Client Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Seleccionar Cliente
                </div>
                <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nuevo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Nombre *</Label>
                          <Input
                            id="name"
                            value={newClient.name}
                            onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input
                            id="phone"
                            value={newClient.phone}
                            onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Dirección</Label>
                          <Input
                            id="address"
                            value={newClient.address}
                            onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={createNewClient}>
                        Crear Cliente
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nombre, email o teléfono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {estimate.client && (
                <div className="p-4 border border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-primary">Cliente Seleccionado</h3>
                      <p className="text-sm">{estimate.client.name}</p>
                      <p className="text-xs text-muted-foreground">{estimate.client.email}</p>
                    </div>
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto">
                {isLoadingClients ? (
                  <p className="text-center py-4 text-muted-foreground">Cargando clientes...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {clientSearch ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          estimate.client?.id === client.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => selectClient(client)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm truncate">{client.name}</h4>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span className="truncate">{client.email || 'Sin email'}</span>
                              <span className="flex-shrink-0">{client.phone || 'Sin teléfono'}</span>
                            </div>
                          </div>
                          {estimate.client?.id === client.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Project Details
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalles del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="projectDetails" className="text-base font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Project Details
                  </Label>
                  <Button
                    onClick={enhanceProjectWithAI}
                    disabled={isAIProcessing || !estimate.projectDetails.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="sm"
                  >
                    {isAIProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Enhance with Mervin AI
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="projectDetails"
                  placeholder="Describe los detalles completos del proyecto:&#10;&#10;• Alcance del trabajo y especificaciones técnicas&#10;• Cronograma y tiempo estimado&#10;• Proceso paso a paso del trabajo&#10;• Qué está incluido en el precio&#10;• Qué NO está incluido&#10;• Notas adicionales, términos especiales, condiciones..."
                  value={estimate.projectDetails}
                  onChange={(e) => setEstimate(prev => ({ ...prev, projectDetails: e.target.value }))}
                  className="min-h-[120px] text-sm"
                />
                <div className="flex items-start gap-2 mt-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <Brain className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-700">
                    <strong>💡 Tip:</strong> Escribe una descripción básica de tu proyecto y usa <strong>"Enhance with Mervin AI"</strong> para generar automáticamente una descripción profesional completa con todos los detalles técnicos necesarios para el estimado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Materials Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Agregar Materiales ({estimate.items.length})
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!estimate.projectDetails.trim()) {
                        toast({
                          title: 'Descripción requerida',
                          description: 'Por favor describe tu proyecto primero para usar DeepSearch IA',
                          variant: 'destructive'
                        });
                        return;
                      }
                      
                      setIsAIProcessing(true);
                      try {
                        const response = await fetch('/api/deepsearch/materials-only', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            projectDescription: estimate.projectDetails,
                            location: estimate.client?.address || ''
                          })
                        });

                        if (!response.ok) {
                          throw new Error('Error al generar materiales con IA');
                        }

                        const result = await response.json();
                        
                        if (result.success && result.materials) {
                          // Agregar materiales generados por IA al estimado
                          const newItems = result.materials.map((material: any) => ({
                            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            name: material.name,
                            description: material.description || '',
                            category: material.category,
                            quantity: material.quantity,
                            unit: material.unit,
                            price: material.price,
                            total: material.total
                          }));

                          setEstimate(prev => ({
                            ...prev,
                            items: [...prev.items, ...newItems]
                          }));

                          // Mostrar mensaje de Mervin por 6 segundos
                          setShowMervinMessage(true);
                          setTimeout(() => {
                            setShowMervinMessage(false);
                          }, 10000);

                          toast({
                            title: '🎉 DeepSearch IA Completado',
                            description: `Se agregaron ${newItems.length} materiales automáticamente`
                          });
                        }
                      } catch (error) {
                        console.error('Error with DeepSearch:', error);
                        toast({
                          title: 'Error en DeepSearch IA',
                          description: 'No se pudieron generar materiales automáticamente',
                          variant: 'destructive'
                        });
                      } finally {
                        setIsAIProcessing(false);
                      }
                    }}
                    disabled={isAIProcessing || !estimate.projectDetails.trim()}
                  >
                    {isAIProcessing ? (
                      <>
                        <Brain className="h-4 w-4 mr-2 animate-pulse" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        DeepSearch IA
                      </>
                    )}
                  </Button>
                </div>
                <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Seleccionar Material del Inventario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar materiales..."
                          value={materialSearch}
                          onChange={(e) => setMaterialSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {isLoadingMaterials ? (
                          <p className="text-center py-4 text-muted-foreground">Cargando materiales...</p>
                        ) : filteredMaterials.length === 0 ? (
                          <p className="text-center py-4 text-muted-foreground">
                            {materialSearch ? 'No se encontraron materiales' : 'No hay materiales disponibles'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredMaterials.map((material) => (
                              <div
                                key={material.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => addMaterialToEstimate(material)}
                              >
                                <h4 className="font-medium">{material.name}</h4>
                                <p className="text-sm text-muted-foreground">{material.category}</p>
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay materiales agregados al estimado</p>
                  <p className="text-sm">Haz clic en "Agregar Material" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {estimate.items.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm">$</span>
                          <Input
                            type="number"
                            value={item.price.toFixed(2)}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 h-6 text-sm"
                            step="0.01"
                            min="0"
                          />
                          <span className="text-sm">/ {item.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center"
                            min="1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${item.total.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItemFromEstimate(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="text-right space-y-2">
                      <p>Subtotal: <span className="font-medium">${estimate.subtotal.toFixed(2)}</span></p>
                      <p>Impuesto (16%): <span className="font-medium">${estimate.tax.toFixed(2)}</span></p>
                      <p className="text-lg font-bold text-primary">
                        Total: ${estimate.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3: // Preview
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista Previa del Estimado
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCompanyEditDialog(true)}
                    size="sm"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Editar Empresa
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => generateEstimatePreview()}
                    disabled={!estimate.client || estimate.items.length === 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar Vista Previa
                  </Button>
                  <Button
                    onClick={downloadPDF}
                    disabled={!estimate.client || estimate.items.length === 0 || !previewHtml}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!estimate.client || estimate.items.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className="text-lg font-medium">Estimado Incompleto</p>
                  <p className="text-muted-foreground">
                    Necesitas seleccionar un cliente y agregar materiales para generar la vista previa
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div
                    style={{
                      color: '#000000',
                      '--tw-text-opacity': '1'
                    }}
                    className="[&_*]:!text-black [&_td]:!text-black [&_th]:!text-black [&_p]:!text-black [&_span]:!text-black [&_div]:!text-black"
                    dangerouslySetInnerHTML={{ 
                      __html: previewHtml || generateEstimatePreview()
                    }}
                  />
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Crear Nuevo Estimado</h1>
        <p className="text-muted-foreground">
          Sigue los pasos para crear un estimado profesional para tu cliente
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex flex-col items-center ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2 ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-24 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="mb-8">
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <div className="flex gap-2">
          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={downloadPDF}
              disabled={!estimate.client || estimate.items.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Finalizar y Descargar
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceedToNext()}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Overlay futurista de DeepSearch AI */}
      {isAIProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="relative flex flex-col items-center justify-center space-y-6">
            {/* Logo Mervin con efecto futurista */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full blur-xl opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-1 rounded-full">
                <div className="bg-gray-900 rounded-full p-4">
                  <img 
                    src={mervinLogoUrl} 
                    alt="Mervin AI" 
                    className="w-24 h-24 object-contain"
                  />
                </div>
              </div>
              {/* Anillos giratorios */}
              <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-2 border-blue-500/30 rounded-full animate-spin animate-reverse"></div>
              <div className="absolute inset-4 border-2 border-purple-600/30 rounded-full animate-spin"></div>
            </div>

            {/* Texto futurista */}
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                DeepSearch IA
              </h2>
              <p className="text-xl text-gray-300 animate-pulse">
                Analizando proyecto con inteligencia artificial...
              </p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>

            {/* Efecto de partículas */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mensaje emergente de Mervin */}
      {showMervinMessage && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-lg">
          <div className="bg-gradient-to-r from-cyan-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <img 
                    src={mervinLogoUrl} 
                    alt="Mervin" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">¡Hola primo! 👋</h3>
                <p className="text-gray-200 text-sm leading-relaxed">
                  Aquí tienes una lista sugerida de materiales para tu proyecto. Aún no soy perfecto (la IA también aprende), así que si ves algo que no va o falta, ajústalo con toda confianza. Tus aportes me ayudan a ser cada vez más preciso. ¡Gracias por tu apoyo!
                </p>
              </div>
            </div>
            <div className="mt-4 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Diálogo de edición de empresa */}
      <Dialog open={showCompanyEditDialog} onOpenChange={setShowCompanyEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Editar Información de Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo">Logo de la Empresa</Label>
                <div className="flex items-center gap-4">
                  {editableCompany.logo && (
                    <img 
                      src={editableCompany.logo} 
                      alt="Logo actual" 
                      className="w-16 h-16 object-contain border rounded"
                    />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditableCompany(prev => ({ 
                            ...prev, 
                            logo: event.target?.result as string 
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Sube una imagen para el logo de tu empresa (PNG, JPG, etc.)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  value={editableCompany.companyName}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Nombre de tu empresa"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={editableCompany.phone}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={editableCompany.address}
                onChange={(e) => setEditableCompany(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main Street"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={editableCompany.city}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Ciudad"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={editableCompany.state}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="CA"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Código Postal</Label>
                <Input
                  id="zipCode"
                  value={editableCompany.zipCode}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="12345"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editableCompany.email}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={editableCompany.website}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="www.empresa.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="license">Licencia</Label>
                <Input
                  id="license"
                  value={editableCompany.license}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, license: e.target.value }))}
                  placeholder="Número de licencia"
                />
              </div>
              <div>
                <Label htmlFor="insurancePolicy">Póliza de Seguro</Label>
                <Input
                  id="insurancePolicy"
                  value={editableCompany.insurancePolicy}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, insurancePolicy: e.target.value }))}
                  placeholder="Número de póliza"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Actualizar la información del contratista temporalmente para esta sesión
              const updatedContractor = {
                ...contractor,
                companyName: editableCompany.companyName,
                name: editableCompany.companyName,
                address: editableCompany.address,
                city: editableCompany.city,
                state: editableCompany.state,
                zipCode: editableCompany.zipCode,
                phone: editableCompany.phone,
                email: editableCompany.email,
                website: editableCompany.website,
                license: editableCompany.license,
                insurancePolicy: editableCompany.insurancePolicy,
                logo: editableCompany.logo
              };
              setContractor(updatedContractor);
              setShowCompanyEditDialog(false);
              setPreviewHtml(''); // Forzar regeneración de la vista previa
              toast({
                title: '✅ Información Actualizada',
                description: 'Los cambios se aplicarán al estimado. Logo y datos de empresa actualizados.',
              });
            }}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}