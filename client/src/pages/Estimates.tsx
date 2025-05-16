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
      description: tempSelectedMaterial.description || "",
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
        
        <div class="estimate-notes">
          <h3>Notas</h3>
          <p>${estimate.notes || 'Sin notas adicionales.'}</p>
        </div>
        
        <div class="estimate-footer">
          <p>Este estimado es válido por 30 días a partir de la fecha de emisión.</p>
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
        title: 'Sin correo electrónico',
        description: 'El cliente no tiene un correo electrónico registrado.',
        variant: 'destructive'
      });
      return;
    }
    
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
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract Information */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Información del Contrato</CardTitle>
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
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select 
                    value={estimate.status} 
                    onValueChange={(value: 'draft' | 'sent' | 'approved' | 'rejected') => setEstimate(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    disabled
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Client Information */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Información del Cliente</span>
              <Button variant="ghost" size="sm" onClick={() => setShowClientSearchDialog(true)}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estimate.client ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-lg mb-2">{estimate.client.name}</h3>
                  {estimate.client.email && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Email:</span> {estimate.client.email}
                    </p>
                  )}
                  {estimate.client.phone && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Teléfono:</span> {estimate.client.phone}
                    </p>
                  )}
                  {estimate.client.mobilePhone && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Móvil:</span> {estimate.client.mobilePhone}
                    </p>
                  )}
                </div>
                <div>
                  {estimate.client.address && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Dirección:</span> {estimate.client.address}
                    </p>
                  )}
                  {estimate.client.city && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Ciudad:</span> {estimate.client.city}
                    </p>
                  )}
                  {estimate.client.state && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Estado:</span> {estimate.client.state}
                    </p>
                  )}
                  {estimate.client.zipCode && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Código Postal:</span> {estimate.client.zipCode}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Button variant="outline" size="sm" onClick={() => setShowClientSearchDialog(true)}>
                    Cambiar cliente
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="mb-4 text-muted-foreground">No hay un cliente seleccionado</p>
                <Button onClick={() => setShowClientSearchDialog(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Seleccionar cliente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Materials List */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Materiales y Servicios</span>
              <Button size="sm" onClick={() => setShowMaterialSearchDialog(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Agregar Material
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estimate.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 50 }}></TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead style={{ width: 80 }}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimate.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="align-middle">
                        <div className="flex flex-col">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => moveItem(item.id, "up")}
                                  className="h-6 w-6"
                                >
                                  <MoveVertical className="h-4 w-4 rotate-180" />
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
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => moveItem(item.id, "down")}
                                  className="h-6 w-6"
                                >
                                  <MoveVertical className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mover abajo</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                          min={1}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(item.total)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="mb-4 text-muted-foreground">No hay materiales agregados</p>
                <Button onClick={() => setShowMaterialSearchDialog(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Agregar Material
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Estimate details */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Detalles del Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="estimate-notes">Notas</Label>
                <Textarea 
                  id="estimate-notes" 
                  value={estimate.notes} 
                  onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales para el cliente"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Summary */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex-1 mb-4 md:mb-0">
                <p className="mb-2">
                  <span className="font-medium">Subtotal:</span> {formatCurrency(estimate.subtotal)}
                </p>
                <p className="text-xl font-bold">
                  <span>Total:</span> {formatCurrency(estimate.total)}
                </p>
              </div>
              
              <div className="space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row">
                <Button 
                  variant="outline" 
                  onClick={handleGeneratePreview}
                  disabled={!estimate.client || estimate.items.length === 0}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Vista previa
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleDownloadPdf}
                  disabled={estimate.items.length === 0 || !estimate.client}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
                
                <Button 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || estimate.items.length === 0 || !estimate.client || !estimate.client.email}
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
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Client Search Dialog */}
      <Dialog open={showClientSearchDialog} onOpenChange={setShowClientSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Seleccionar Cliente</DialogTitle>
            <DialogDescription>
              Busca y selecciona un cliente para el estimado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <Input
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchClientTerm}
              onChange={(e) => setSearchClientTerm(e.target.value)}
              className="mb-3"
            />
            
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {filteredClients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell>{client.name}</TableCell>
                        <TableCell>{client.email || '-'}</TableCell>
                        <TableCell>{client.phone || '-'}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleSelectClient(client)}>
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No se encontraron clientes</p>
                </div>
              )}
            </div>
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
            <DialogTitle>Seleccionar Material</DialogTitle>
            <DialogDescription>
              Busca un material existente o agrega uno nuevo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <Input
                placeholder="Buscar material..."
                value={searchMaterialTerm}
                onChange={(e) => setSearchMaterialTerm(e.target.value)}
                className="flex-1 mr-2"
              />
              <Button onClick={() => {
                setShowAddMaterialDialog(true);
                setShowMaterialSearchDialog(false);
              }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nuevo
              </Button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {filteredMaterials.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map(material => (
                      <TableRow key={material.id}>
                        <TableCell>{material.name}</TableCell>
                        <TableCell>{material.description || '-'}</TableCell>
                        <TableCell>{material.category}</TableCell>
                        <TableCell>{formatCurrency(material.price)}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setTempSelectedMaterial(material);
                            }}
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No se encontraron materiales</p>
                </div>
              )}
            </div>
          </div>
          
          {tempSelectedMaterial && (
            <div className="bg-muted p-4 rounded-md mb-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-medium">{tempSelectedMaterial.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tempSelectedMaterial.description || 'Sin descripción'}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">Precio:</span> {formatCurrency(tempSelectedMaterial.price)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="quantity" className="whitespace-nowrap">Cantidad:</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(Number(e.target.value))}
                    min={1}
                    className="w-20"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Total: {formatCurrency(tempSelectedMaterial.price * tempQuantity)}</p>
                </div>
                <Button 
                  onClick={handleAddItemToEstimate}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Agregar al Estimado
                </Button>
              </div>
            </div>
          )}
          
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
            <DialogTitle>Nuevo Material</DialogTitle>
            <DialogDescription>
              Agrega un nuevo material a tu inventario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="material-name">Nombre*</Label>
              <Input 
                id="material-name" 
                value={newMaterial.name} 
                onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del material"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="material-category">Categoría*</Label>
              <Input 
                id="material-category" 
                value={newMaterial.category} 
                onChange={(e) => setNewMaterial(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Categoría del material"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="material-description">Descripción</Label>
              <Textarea 
                id="material-description" 
                value={newMaterial.description} 
                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción detallada"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="material-price">Precio*</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Input 
                    id="material-price" 
                    type="number"
                    value={newMaterial.price} 
                    onChange={(e) => setNewMaterial(prev => ({ ...prev, price: Number(e.target.value) }))}
                    min={0}
                    step={0.01}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="material-unit">Unidad*</Label>
                <Select 
                  value={newMaterial.unit} 
                  onValueChange={(value: string) => setNewMaterial(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger id="material-unit">
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieza">Pieza</SelectItem>
                    <SelectItem value="metro">Metro</SelectItem>
                    <SelectItem value="metro2">Metro²</SelectItem>
                    <SelectItem value="metro3">Metro³</SelectItem>
                    <SelectItem value="kg">Kilogramo</SelectItem>
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Estimado</DialogTitle>
          </DialogHeader>
          
          {previewHtml && (
            <div 
              className="estimate-preview border rounded-md p-6 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml as string }}
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
    </div>
  );
}