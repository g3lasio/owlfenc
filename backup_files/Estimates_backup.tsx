import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  PlusCircle, 
  Trash2, 
  ArrowRight, 
  FileDown, 
  Mail, 
  CalendarCheck, 
  Search, 
  RotateCcw, 
  DollarSign,
  MoveVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getClients, Client as FirebaseClient } from '../lib/clientFirebase';

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
}

interface Material {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  supplier?: string;
  sku?: string;
  stock?: number;
}

interface EstimateItem {
  id: string;
  materialId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  total: number;
}

interface Estimate {
  id?: string;
  title: string;
  clientId: string;
  client: Client | null;
  items: EstimateItem[];
  subtotal: number;
  total: number;
  notes: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export default function Estimates() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // States for clients
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchClientTerm, setSearchClientTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientSearchDialog, setShowClientSearchDialog] = useState(false);
  
  // States for materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchMaterialTerm, setSearchMaterialTerm] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [showMaterialSearchDialog, setShowMaterialSearchDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    name: '',
    category: '',
    description: '',
    unit: 'pieza',
    price: 0
  });
  
  // States for the estimate
  const [estimate, setEstimate] = useState<Estimate>({
    title: 'Nuevo Estimado',
    clientId: '',
    client: null,
    items: [],
    subtotal: 0,
    total: 0,
    notes: '',
    status: 'draft'
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Additional states
  const [tempQuantity, setTempQuantity] = useState<number>(1);
  const [tempSelectedMaterial, setTempSelectedMaterial] = useState<Material | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // Load clients and materials when component mounts
  useEffect(() => {
    if (!currentUser) return;
    
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load clients
        const clientsData = await getClients();
        // Convert Firebase clients to our Client interface
        const mappedClients: Client[] = clientsData.map(client => ({
          id: client.id,
          clientId: client.clientId,
          name: client.name,
          email: client.email,
          phone: client.phone,
          mobilePhone: client.mobilePhone,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode
        }));
        setClients(mappedClients);
        
        // Load materials
        const materialsRef = collection(db, 'materials');
        const q = query(materialsRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const materialsData: Material[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Material, 'id'>;
          materialsData.push({
            id: doc.id,
            ...data,
            price: typeof data.price === 'number' ? data.price : 0
          } as Material);
        });
        
        setMaterials(materialsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos necesarios.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, toast]);
  
  // Calculate total when items change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    // You can add tax calculation here if needed
    setEstimate(prev => ({
      ...prev,
      subtotal,
      total: subtotal
    }));
  }, [estimate.items]);
  
  // Filter clients when search term changes
  useEffect(() => {
    if (searchClientTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchClientTerm.toLowerCase();
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(term) || 
        client.email?.toLowerCase().includes(term) || 
        client.phone?.includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchClientTerm, clients]);
  
  // Filter materials when search term changes
  useEffect(() => {
    if (searchMaterialTerm.trim() === '') {
      setFilteredMaterials(materials);
    } else {
      const term = searchMaterialTerm.toLowerCase();
      const filtered = materials.filter(material => 
        material.name.toLowerCase().includes(term) || 
        material.description?.toLowerCase().includes(term) || 
        material.category.toLowerCase().includes(term)
      );
      setFilteredMaterials(filtered);
    }
  }, [searchMaterialTerm, materials]);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };
  
  // Select client
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setEstimate(prev => ({
      ...prev,
      clientId: client.id,
      client
    }));
    setShowClientSearchDialog(false);
  };
  
  // Add material to estimate
  const handleAddItemToEstimate = () => {
    if (!tempSelectedMaterial) return;
    
    const newItem: EstimateItem = {
      id: `item_${Date.now()}`,
      materialId: tempSelectedMaterial.id,
      name: tempSelectedMaterial.name,
      description: tempSelectedMaterial.description,
      price: tempSelectedMaterial.price,
      quantity: tempQuantity,
      unit: tempSelectedMaterial.unit,
      total: tempSelectedMaterial.price * tempQuantity
    };
    
    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    setTempSelectedMaterial(null);
    setTempQuantity(1);
    setShowMaterialSearchDialog(false);
  };
  
  // Remove item from estimate
  const handleRemoveItem = (id: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };
  
  // Update item quantity
  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          return {
            ...item,
            quantity,
            total: item.price * quantity
          };
        }
        return item;
      })
    }));
  };
  
  // Move item up or down in the list
  const moveItem = (id: string, direction: 'up' | 'down') => {
    const itemIndex = estimate.items.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    
    const newItems = [...estimate.items];
    
    if (direction === 'up' && itemIndex > 0) {
      // Swap with the item above
      [newItems[itemIndex], newItems[itemIndex - 1]] = [newItems[itemIndex - 1], newItems[itemIndex]];
    } else if (direction === 'down' && itemIndex < newItems.length - 1) {
      // Swap with the item below
      [newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]];
    }
    
    setEstimate(prev => ({
      ...prev,
      items: newItems
    }));
  };
  
  // Save new material
  const handleSaveMaterial = async () => {
    if (!currentUser) return;
    
    if (!newMaterial.name || !newMaterial.category || !newMaterial.unit) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor, completa los campos obligatorios: Nombre, Categoría y Unidad.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const materialData = {
        ...newMaterial,
        price: typeof newMaterial.price === 'number' ? newMaterial.price : 0,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'materials'), materialData);
      
      const newMaterialWithId: Material = {
        id: docRef.id,
        ...materialData,
        price: materialData.price as number
      } as Material;
      
      setMaterials(prev => [...prev, newMaterialWithId]);
      
      // Use the new material as the selected material
      setTempSelectedMaterial(newMaterialWithId);
      
      // Reset the form
      setNewMaterial({
        name: '',
        category: '',
        description: '',
        unit: 'pieza',
        price: 0
      });
      
      setShowAddMaterialDialog(false);
      
      toast({
        title: 'Material agregado',
        description: `Se ha agregado el material "${newMaterial.name}" correctamente.`
      });
    } catch (error) {
      console.error('Error al guardar material:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar el material. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
    }
  };
  
  // Generate and save the estimate
  const handleSaveEstimate = async () => {
    if (!currentUser || !estimate.client) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor, selecciona un cliente antes de guardar.',
        variant: 'destructive'
      });
      return;
    }
    
    if (estimate.items.length === 0) {
      toast({
        title: 'Sin materiales',
        description: 'Por favor, agrega al menos un material al estimado.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // En este punto sabemos que estimate.client no es null
      const client = estimate.client;
      
      // In a real application, you would call an API endpoint to generate HTML
      // For now, we'll just prepare the structure for Firebase
      const estimateData = {
        title: estimate.title,
        clientId: estimate.clientId,
        clientName: client.name,
        clientEmail: client.email || '',
        clientPhone: client.phone || '',
        clientAddress: client.address || '',
        items: estimate.items,
        subtotal: estimate.subtotal,
        total: estimate.total,
        notes: estimate.notes,
        status: estimate.status,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'estimates'), estimateData);
      
      toast({
        title: 'Estimado guardado',
        description: 'El estimado se ha guardado correctamente.'
      });
      
      // Reset the form
      setEstimate({
        title: 'Nuevo Estimado',
        clientId: '',
        client: null,
        items: [],
        subtotal: 0,
        total: 0,
        notes: '',
        status: 'draft'
      });
      setSelectedClient(null);
    } catch (error) {
      console.error('Error al guardar estimado:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar el estimado. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Generate Preview
  const handleGeneratePreview = async () => {
    if (!estimate.client) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor, selecciona un cliente antes de generar la vista previa.',
        variant: 'destructive'
      });
      return;
    }
    
    if (estimate.items.length === 0) {
      toast({
        title: 'Sin materiales',
        description: 'Por favor, agrega al menos un material al estimado.',
        variant: 'destructive'
      });
      return;
    }
    
    // En este punto sabemos que estimate.client no es null
    const client = estimate.client;
    
    // In a real app, you would call an API to generate the HTML
    // For this example, we'll create a simple HTML template
    const html = `
      <div class="estimate-preview">
        <div class="estimate-header">
          <div class="company-info">
            <h1>Owl Fence</h1>
            <p>Expertos en cercas</p>
            <p>info@owlfence.com | (555) 123-4567</p>
          </div>
          <div class="estimate-title">
            <h2>ESTIMADO</h2>
            <p>Fecha: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="client-info">
          <h3>Cliente</h3>
          <p><strong>Nombre:</strong> ${client.name}</p>
          <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
          <p><strong>Teléfono:</strong> ${client.phone || 'N/A'}</p>
          <p><strong>Dirección:</strong> ${client.address || 'N/A'}</p>
        </div>
        
        <div class="estimate-items">
          <h3>Materiales y Servicios</h3>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.items.map(item => `
                <tr>
                  <td>${item.name}${item.description ? ` - ${item.description}` : ''}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="estimate-summary">
          <div class="summary-item">
            <strong>Subtotal:</strong>
            <span>${formatCurrency(estimate.subtotal)}</span>
          </div>
          <div class="summary-item total">
            <strong>Total:</strong>
            <span>${formatCurrency(estimate.total)}</span>
          </div>
        </div>
        
        ${estimate.notes ? `
          <div class="estimate-notes">
            <h3>Notas</h3>
            <p>${estimate.notes}</p>
          </div>
        ` : ''}
        
        <div class="estimate-footer">
          <p>Este estimado es válido por 30 días.</p>
          <p>Para aceptar este estimado, por favor contacte a Owl Fence.</p>
        </div>
      </div>
    `;
    
    setPreviewHtml(html);
    setShowPreviewDialog(true);
  };
  
  // Handle send email
  const handleSendEmail = () => {
    if (!estimate.client || !estimate.client.email) {
      toast({
        title: 'Email no disponible',
        description: 'El cliente seleccionado no tiene un email registrado.',
        variant: 'destructive'
      });
      return;
    }
    
    // En este punto sabemos que estimate.client y estimate.client.email no son null
    const clientEmail = estimate.client.email;
    
    setIsSendingEmail(true);
    
    // In a real app, you would call an API to send the email
    // For this example, we'll just show a success message after a delay
    setTimeout(() => {
      toast({
        title: 'Email enviado',
        description: `El estimado se ha enviado correctamente a ${clientEmail}.`
      });
      setIsSendingEmail(false);
    }, 1500);
  };
  
  // Handle download PDF
  const handleDownloadPdf = () => {
    toast({
      title: 'Descarga iniciada',
      description: 'El PDF del estimado se está generando.'
    });
    
    // In a real app, you would call an API to generate and download the PDF
    // For this example, we'll just show a success message after a delay
    setTimeout(() => {
      toast({
        title: 'PDF generado',
        description: 'El PDF del estimado se ha generado correctamente.'
      });
    }, 1500);
  };
  
  return (
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Nuevo Estimado</h1>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleGeneratePreview}
              disabled={!estimate.client || estimate.items.length === 0}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Vista previa
            </Button>
            
            <Button 
              onClick={handleSaveEstimate} 
              disabled={isSaving || !estimate.client || estimate.items.length === 0}
            >
              {isSaving ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Guardar Estimado
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left column - Client and Estimate Details */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedClient ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <h3 className="font-semibold text-lg">{selectedClient.name}</h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowClientSearchDialog(true)}
                        >
                          Cambiar
                        </Button>
                      </div>
                      
                      <div className="text-sm space-y-1 text-muted-foreground">
                        {selectedClient.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            <span>{selectedClient.email}</span>
                          </div>
                        )}
                        
                        {selectedClient.phone && (
                          <div className="flex items-center">
                            <span className="ri-phone-line mr-2"></span>
                            <span>{selectedClient.phone}</span>
                          </div>
                        )}
                        
                        {selectedClient.address && (
                          <div className="flex items-start">
                            <span className="ri-map-pin-line mr-2 mt-0.5"></span>
                            <span>
                              {selectedClient.address}
                              {selectedClient.city && `, ${selectedClient.city}`}
                              {selectedClient.state && `, ${selectedClient.state}`}
                              {selectedClient.zipCode && ` ${selectedClient.zipCode}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <span className="ri-user-line text-xl"></span>
                      </div>
                      <h3 className="font-medium mb-2">Ningún cliente seleccionado</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Selecciona un cliente para este estimado
                      </p>
                      <Button onClick={() => setShowClientSearchDialog(true)}>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar Cliente
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Detalles del Estimado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="estimate-title">Título</Label>
                    <Input
                      id="estimate-title"
                      value={estimate.title}
                      onChange={(e) => setEstimate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Título del estimado"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="estimate-notes">Notas</Label>
                    <Textarea
                      id="estimate-notes"
                      value={estimate.notes}
                      onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Detalles adicionales o notas importantes..."
                      className="mt-1"
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-base">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(estimate.subtotal)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(estimate.total)}</span>
                  </div>
                  
                  <div className="pt-4 flex flex-col gap-2">
                    <Button 
                      onClick={handleDownloadPdf}
                      disabled={!estimate.client || estimate.items.length === 0}
                      variant="outline"
                      className="w-full"
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </Button>
                    
                    <Button 
                      onClick={handleSendEmail}
                      disabled={!estimate.client || !estimate.client.email || estimate.items.length === 0 || isSendingEmail}
                      className="w-full"
                    >
                      {isSendingEmail ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Enviar por Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right column - Materials Table */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Materiales y Servicios</CardTitle>
                <Button onClick={() => setShowMaterialSearchDialog(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar Material
                </Button>
              </CardHeader>
              <CardContent>
                {estimate.items.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-md">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No hay materiales agregados</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Agrega materiales para crear tu estimado
                    </p>
                    <Button onClick={() => setShowMaterialSearchDialog(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agregar Material
                    </Button>
                  </div>
                ) : (
                  <div className="">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead className="w-[120px]">Precio</TableHead>
                          <TableHead className="w-[120px]">Cantidad</TableHead>
                          <TableHead className="w-[120px]">Total</TableHead>
                          <TableHead className="w-[80px] text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estimate.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => moveItem(item.id, 'up')}
                                        disabled={estimate.items.indexOf(item) === 0}
                                      >
                                        <span className="ri-arrow-up-s-line"></span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Mover arriba</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => moveItem(item.id, 'down')}
                                        disabled={estimate.items.indexOf(item) === estimate.items.length - 1}
                                      >
                                        <span className="ri-arrow-down-s-line"></span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Mover abajo</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                  className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">{item.unit}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Client Search Dialog */}
      <Dialog open={showClientSearchDialog} onOpenChange={setShowClientSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
            <DialogDescription>
              Busca y selecciona un cliente para este estimado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchClientTerm}
                onChange={(e) => setSearchClientTerm(e.target.value)}
                className="flex-1"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Buscar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">
                <RotateCcw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p>Cargando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-md">
                <p className="text-muted-foreground mb-2">No se encontraron clientes</p>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Nuevo Cliente
                </Button>
              </div>
            ) : (
              <div className=" max-h-96">
                <div className="grid gap-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => handleSelectClient(client)}
                    >
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <div className="text-sm text-muted-foreground">
                          {client.email && <span>{client.email} · </span>}
                          {client.phone && <span>{client.phone}</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientSearchDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Material Search Dialog */}
      <Dialog open={showMaterialSearchDialog} onOpenChange={setShowMaterialSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Agregar Material</DialogTitle>
            <DialogDescription>
              Busca y selecciona un material para agregar al estimado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="flex gap-2 mb-4 justify-between">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Buscar materiales..."
                  value={searchMaterialTerm}
                  onChange={(e) => setSearchMaterialTerm(e.target.value)}
                  className="flex-1"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Search className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Buscar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Button onClick={() => setShowAddMaterialDialog(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Material
              </Button>
            </div>
            
            {tempSelectedMaterial ? (
              <div className="mb-4 p-4 border rounded-md">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{tempSelectedMaterial.name}</h3>
                    {tempSelectedMaterial.description && (
                      <p className="text-sm text-muted-foreground">{tempSelectedMaterial.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTempSelectedMaterial(null)}>
                    Cambiar
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="material-price">Precio</Label>
                    <Input
                      id="material-price"
                      type="number"
                      value={tempSelectedMaterial.price}
                      readOnly
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="material-quantity">Cantidad</Label>
                    <div className="flex gap-2 items-center mt-1">
                      <Input
                        id="material-quantity"
                        type="number"
                        min="1"
                        value={tempQuantity}
                        onChange={(e) => setTempQuantity(parseInt(e.target.value) || 1)}
                      />
                      <span className="text-sm text-muted-foreground w-16">{tempSelectedMaterial.unit}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-3 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Total:</p>
                    <p className="font-medium">{formatCurrency(tempSelectedMaterial.price * tempQuantity)}</p>
                  </div>
                  
                  <Button onClick={handleAddItemToEstimate}>
                    Agregar a Estimado
                  </Button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <RotateCcw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p>Cargando materiales...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-md">
                <p className="text-muted-foreground mb-2">No se encontraron materiales</p>
                <Button onClick={() => setShowAddMaterialDialog(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Nuevo Material
                </Button>
              </div>
            ) : (
              <div className=" max-h-96">
                <div className="grid gap-2">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => setTempSelectedMaterial(material)}
                    >
                      <div>
                        <p className="font-medium">{material.name}</p>
                        {material.description && (
                          <p className="text-sm text-muted-foreground">{material.description}</p>
                        )}
                        <div className="text-sm font-medium mt-1">
                          {formatCurrency(material.price)} / {material.unit}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaterialSearchDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Material Dialog */}
      <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Material</DialogTitle>
            <DialogDescription>
              Completa los datos del nuevo material.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="new-material-name">Nombre *</Label>
              <Input
                id="new-material-name"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del material"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="new-material-category">Categoría *</Label>
              <Select
                value={newMaterial.category}
                onValueChange={(value) => setNewMaterial(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="new-material-category" className="mt-1">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Madera">Madera</SelectItem>
                  <SelectItem value="Metal">Metal</SelectItem>
                  <SelectItem value="Cercas">Cercas</SelectItem>
                  <SelectItem value="Concreto">Concreto</SelectItem>
                  <SelectItem value="Tornillería">Tornillería</SelectItem>
                  <SelectItem value="Herramientas">Herramientas</SelectItem>
                  <SelectItem value="Acabados">Acabados</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="new-material-description">Descripción</Label>
              <Textarea
                id="new-material-description"
                value={newMaterial.description}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del material"
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-material-price">Precio *</Label>
                <Input
                  id="new-material-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newMaterial.price}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="new-material-unit">Unidad *</Label>
                <Select
                  value={newMaterial.unit}
                  onValueChange={(value) => setNewMaterial(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger id="new-material-unit" className="mt-1">
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieza">Pieza</SelectItem>
                    <SelectItem value="metro">Metro</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                    <SelectItem value="kg">Kilogramo</SelectItem>
                    <SelectItem value="lb">Libra</SelectItem>
                    <SelectItem value="galón">Galón</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                    <SelectItem value="bolsa">Bolsa</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="juego">Juego</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMaterialDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMaterial}>
              Guardar Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] ">
          <DialogHeader>
            <DialogTitle>Vista Previa del Estimado</DialogTitle>
          </DialogHeader>
          
          {previewHtml && (
            <div 
              className="estimate-preview border rounded-md p-6 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={handleDownloadPdf}>
              <FileDown className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}