import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, User, Package, FileText, Eye, Send, Save, Trash2, Users, X, Calculator, Building2 } from 'lucide-react';

// Types matching your existing system
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

interface EstimateItem {
  id: string;
  materialId: number;
  name: string;
  description: string;
  quantity: number;
  price: number; // In dollars
  unit: string;
  total: number;
}

interface EstimateData {
  title: string;
  clientId: number | null;
  client: Client | null;
  items: EstimateItem[];
  notes: string;
  scope: string;
  timeline: string;
  process: string;
  includes: string;
  excludes: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'approved';
}

export default function EstimatesIntegrated() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Core estimate state
  const [estimate, setEstimate] = useState<EstimateData>({
    title: 'Nuevo Estimado',
    clientId: null,
    client: null,
    items: [],
    notes: '',
    scope: '',
    timeline: '',
    process: '',
    includes: '',
    excludes: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'draft'
  });

  // Data from existing systems
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [contractor, setContractor] = useState<any>(null);

  // Search and UI state
  const [clientSearch, setClientSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Helper function to parse estimate items from HTML
  const parseEstimateItemsFromHtml = (html: string): EstimateItem[] => {
    const items: EstimateItem[] = [];
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const rows = tempDiv.querySelectorAll('tr');
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const name = cells[0]?.textContent?.trim() || '';
          const quantity = parseFloat(cells[1]?.textContent?.trim() || '0');
          const price = parseFloat(cells[2]?.textContent?.replace(/[^0-9.]/g, '') || '0');
          const total = parseFloat(cells[3]?.textContent?.replace(/[^0-9.]/g, '') || '0');
          
          if (name && quantity > 0 && price > 0) {
            items.push({
              id: `item-${index}`,
              materialId: 0,
              name,
              description: '',
              quantity,
              price,
              unit: 'unidad',
              total
            });
          }
        }
      });
    } catch (error) {
      console.error('Error parsing estimate items from HTML:', error);
    }
    
    return items;
  };

  const loadProjectForEdit = async (projectId: string) => {
    if (!currentUser) return;

    try {
      toast({
        title: 'Cargando datos del proyecto...',
        description: 'Preparando estimado para edición'
      });

      const { getProjectById } = await import('@/lib/firebase');
      const projectData = await getProjectById(projectId);

      if (projectData) {
        let clientData = null;
        if (projectData.clientName && clients.length > 0) {
          clientData = clients.find(c => c.name === projectData.clientName);
        }

        let estimateItems: EstimateItem[] = [];
        if (projectData.estimateHtml) {
          estimateItems = parseEstimateItemsFromHtml(projectData.estimateHtml);
        }

        setEstimate({
          title: `Estimado - ${projectData.clientName}`,
          clientId: clientData?.id || null,
          client: clientData || {
            id: 0,
            clientId: '',
            name: projectData.clientName || '',
            email: projectData.clientEmail || null,
            phone: projectData.clientPhone || null,
            address: projectData.address || null,
            city: projectData.clientCity || null,
            state: projectData.clientState || null,
            zip: null,
            notes: null
          },
          items: estimateItems,
          notes: projectData.clientNotes || projectData.internalNotes || '',
          scope: projectData.projectScope || projectData.projectDescription || '',
          timeline: '',
          process: '',
          includes: '',
          excludes: '',
          subtotal: 0,
          tax: 0,
          total: projectData.totalPrice ? (projectData.totalPrice / 100) : 0,
          status: projectData.status || 'draft'
        });

        toast({
          title: 'Proyecto cargado exitosamente',
          description: 'Ahora puedes editar el estimado existente'
        });
      }
    } catch (error) {
      console.error('Error loading project for edit:', error);
      toast({
        title: 'Error al cargar proyecto',
        description: 'No se pudieron cargar los datos del proyecto',
        variant: 'destructive'
      });
    }
  };

  // Load clients from your existing API
  useEffect(() => {
    loadClients();
  }, [currentUser]);

  // Load materials from your existing API
  useEffect(() => {
    loadMaterials();
  }, []);

  // Load contractor profile
  useEffect(() => {
    loadContractorProfile();
  }, [currentUser]);

  // Check for edit parameter and load project data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editProjectId = urlParams.get('edit');
    
    if (editProjectId) {
      loadProjectForEdit(editProjectId);
    }
  }, [currentUser, clients]);

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16; // 16% IVA
    const total = subtotal + tax;

    setEstimate(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  }, [estimate.items]);

  const loadClients = async () => {
    if (!currentUser) return;

    try {
      setIsLoadingClients(true);
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
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
    try {
      setIsLoadingMaterials(true);
      
      if (!currentUser) {
        console.error("No authenticated user found");
        return;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      } else {
        console.error("Failed to load materials:", response.statusText);
        toast({
          title: "Error",
          description: "No se pudieron cargar los materiales del usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los materiales',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const loadContractorProfile = async () => {
    if (!currentUser) return;

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

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
    (client.phone && client.phone.includes(clientSearch))
  );

  // Filter materials based on search
  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    (material.description && material.description.toLowerCase().includes(materialSearch.toLowerCase())) ||
    material.category.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // Select client from your existing client database
  const selectClient = (client: Client) => {
    setEstimate(prev => ({
      ...prev,
      clientId: client.id,
      client
    }));
    setShowClientDialog(false);
    setClientSearch('');
    toast({
      title: 'Cliente seleccionado',
      description: `${client.name} ha sido agregado al estimado`
    });
  };

  // Add material from your existing materials database
  const addMaterialToEstimate = (material: Material, quantity: number = 1) => {
    // MATEMÁTICA DIRECTA: usar precio exacto sin conversiones
    const newItem: EstimateItem = {
      id: `item_${Date.now()}`,
      materialId: material.id,
      name: material.name,
      description: material.description || '',
      quantity,
      price: material.price, // Precio directo sin conversiones
      unit: material.unit,
      total: material.price * quantity // Cálculo directo: precio × cantidad
    };

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setShowMaterialDialog(false);
    setMaterialSearch('');
    toast({
      title: 'Material agregado',
      description: `${material.name} ha sido agregado al estimado`
    });
  };

  // Update item quantity or price
  const updateItem = (itemId: string, field: string, value: string | number) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updatedItem.total = updatedItem.price * updatedItem.quantity;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  // Remove item from estimate
  const removeItem = (itemId: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{estimate.title}</h1>
          <p className="text-gray-600 mt-2">
            Sistema integrado de estimados con tu base de datos existente
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/projects'}
          >
            <FileText className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client & Project Details */}
        <div className="space-y-6">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.client ? (
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium">{estimate.client.name}</h4>
                    <p className="text-sm text-muted-foreground">{estimate.client.email}</p>
                    <p className="text-sm text-muted-foreground">{estimate.client.phone}</p>
                    <p className="text-sm text-muted-foreground">
                      {[estimate.client.address, estimate.client.city, estimate.client.state, estimate.client.zip]
                        .filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEstimate(prev => ({ ...prev, client: null, clientId: null }))}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cambiar Cliente
                  </Button>
                </div>
              ) : (
                <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Seleccionar Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Seleccionar Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nombre, email o teléfono..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-96 ">
                        {filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                            onClick={() => selectClient(client)}
                          >
                            <h4 className="font-medium">{client.name}</h4>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalles del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scope">Alcance del Trabajo</Label>
                <Textarea
                  id="scope"
                  placeholder="Descripción del alcance del proyecto..."
                  value={estimate.scope}
                  onChange={(e) => setEstimate(prev => ({ ...prev, scope: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="timeline">Tiempo Estimado</Label>
                <Input
                  id="timeline"
                  placeholder="ej. 2-3 semanas"
                  value={estimate.timeline}
                  onChange={(e) => setEstimate(prev => ({ ...prev, timeline: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas internas o comentarios..."
                  value={estimate.notes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Materials */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Materiales y Servicios
                </div>
                <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Agregar Material</DialogTitle>
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
                      <div className="max-h-96 ">
                        {filteredMaterials.map((material) => (
                          <div
                            key={material.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                            onClick={() => addMaterialToEstimate(material)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{material.name}</h4>
                                <p className="text-sm text-muted-foreground">{material.description}</p>
                                <Badge variant="secondary" className="mt-1">
                                  {material.category}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${(material.price / 100).toFixed(2)}</p>
                                <p className="text-sm text-muted-foreground">por {material.unit}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2" />
                  <p>No hay materiales agregados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {estimate.items.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{item.name}</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Precio</Label>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <p className="font-bold">${item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${estimate.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span>${estimate.tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${estimate.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2 mt-6">
                <Button className="w-full" size="lg">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Estimado
                </Button>
                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
                <Button variant="outline" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar por Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}