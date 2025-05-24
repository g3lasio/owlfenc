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
import { Search, Plus, User, Package, FileText, Eye, Send, Save, Trash2, Users, X } from 'lucide-react';

// Types
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  userId: string;
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
  materialId?: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
}

interface EstimateData {
  title: string;
  clientId: string;
  client: Client | null;
  items: EstimateItem[];
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'approved';
}

export default function EstimatesNew() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Core state
  const [estimate, setEstimate] = useState<EstimateData>({
    title: 'Nuevo Estimado',
    clientId: '',
    client: null,
    items: [],
    notes: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'draft'
  });

  // Client management
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  // Material management
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);

  // New material form
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    price: 0,
    unit: 'unidad',
    category: ''
  });

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, [currentUser]);

  // Load materials on mount
  useEffect(() => {
    loadMaterials();
  }, []);

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16; // 16% tax
    const total = subtotal + tax;

    setEstimate(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  }, [estimate.items]);

  // Load clients from Firebase
  const loadClients = async () => {
    if (!currentUser) return;

    try {
      setIsLoadingClients(true);
      const response = await fetch(`/api/clients?userId=${currentUser.uid}`);
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

  // Load materials from database
  const loadMaterials = async () => {
    try {
      setIsLoadingMaterials(true);
      const response = await fetch('/api/materials');
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
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

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch)
  );

  // Filter materials based on search
  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.description.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.category.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // Select client
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

  // Add material to estimate
  const addMaterialToEstimate = (material: Material, quantity: number = 1) => {
    const newItem: EstimateItem = {
      id: `item_${Date.now()}`,
      materialId: material.id,
      name: material.name,
      description: material.description,
      quantity,
      price: material.price,
      unit: material.unit,
      total: material.price * quantity
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

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, quantity, total: item.price * quantity }
          : item
      )
    }));
  };

  // Update item price
  const updateItemPrice = (itemId: string, price: number) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, price, total: price * item.quantity }
          : item
      )
    }));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Add custom item (not from materials database)
  const addCustomItem = () => {
    const newItem: EstimateItem = {
      id: `item_${Date.now()}`,
      name: 'Nuevo artículo',
      description: '',
      quantity: 1,
      price: 0,
      unit: 'unidad',
      total: 0
    };

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Update custom item
  const updateCustomItem = (itemId: string, field: string, value: string | number) => {
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

  // Generate preview HTML
  const generatePreview = async () => {
    if (!estimate.client || estimate.items.length === 0) {
      toast({
        title: 'Datos incompletos',
        description: 'Selecciona un cliente y agrega al menos un material',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/estimates/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateData: {
            client: estimate.client,
            items: estimate.items,
            notes: estimate.notes,
            subtotal: estimate.subtotal,
            tax: estimate.tax,
            total: estimate.total,
            estimateDate: new Date().toISOString(),
            estimateNumber: `EST-${Date.now()}`,
            contractor: {
              name: 'Tu Empresa',
              email: 'contacto@tuempresa.com',
              phone: '(555) 123-4567',
              address: 'Dirección de tu empresa'
            }
          }
        })
      });

      if (response.ok) {
        const { html } = await response.json();
        setPreviewHtml(html);
        setShowPreview(true);
      } else {
        throw new Error('Error generating preview');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar la vista previa',
        variant: 'destructive'
      });
    }
  };

  // Save estimate
  const saveEstimate = async () => {
    if (!estimate.client || estimate.items.length === 0) {
      toast({
        title: 'Datos incompletos',
        description: 'Selecciona un cliente y agrega al menos un material',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...estimate,
          userId: currentUser?.uid,
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: 'Estimado guardado',
          description: 'El estimado ha sido guardado exitosamente'
        });
      } else {
        throw new Error('Error saving estimate');
      }
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el estimado',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Send estimate by email
  const sendEstimate = async () => {
    if (!estimate.client?.email) {
      toast({
        title: 'Email requerido',
        description: 'El cliente debe tener un email válido',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    try {
      await generatePreview(); // Generate HTML first
      
      const response = await fetch('/api/estimates/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: estimate.client.email,
          estimateData: estimate,
          html: previewHtml
        })
      });

      if (response.ok) {
        toast({
          title: 'Estimado enviado',
          description: `El estimado ha sido enviado a ${estimate.client.email}`
        });
        setEstimate(prev => ({ ...prev, status: 'sent' }));
      } else {
        throw new Error('Error sending estimate');
      }
    } catch (error) {
      console.error('Error sending estimate:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el estimado',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  // Save new material
  const saveNewMaterial = async () => {
    if (!newMaterial.name || !newMaterial.price) {
      toast({
        title: 'Datos incompletos',
        description: 'El nombre y precio son requeridos',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial)
      });

      if (response.ok) {
        const savedMaterial = await response.json();
        setMaterials(prev => [...prev, savedMaterial]);
        setNewMaterial({
          name: '',
          description: '',
          price: 0,
          unit: 'unidad',
          category: ''
        });
        setShowAddMaterialDialog(false);
        toast({
          title: 'Material guardado',
          description: 'El material ha sido agregado a la base de datos'
        });
      } else {
        throw new Error('Error saving material');
      }
    } catch (error) {
      console.error('Error saving material:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el material',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Crear Estimado</h1>
          <p className="text-muted-foreground">Crea estimados profesionales de forma rápida y sencilla</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePreview} disabled={!estimate.client || estimate.items.length === 0}>
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button variant="outline" onClick={saveEstimate} disabled={isSaving || !estimate.client || estimate.items.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button onClick={sendEstimate} disabled={isSending || !estimate.client?.email || estimate.items.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client & Notes */}
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
                    <p className="text-sm text-muted-foreground">{estimate.client.address}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEstimate(prev => ({ ...prev, client: null, clientId: '' }))}
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
                      <div className="max-h-96 overflow-y-auto space-y-2">
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
                              className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                              onClick={() => selectClient(client)}
                            >
                              <h4 className="font-medium">{client.name}</h4>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                              <p className="text-sm text-muted-foreground">{client.phone}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Project Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notas del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Descripción detallada del proyecto, notas especiales, condiciones, etc."
                value={estimate.notes}
                onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Materials & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Materials Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Materiales ({estimate.items.length})
                </div>
                <div className="flex gap-2">
                  <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Seleccionar Material</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar materiales..."
                              value={materialSearch}
                              onChange={(e) => setMaterialSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Material
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Crear Nuevo Material</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="name">Nombre *</Label>
                                  <Input
                                    id="name"
                                    value={newMaterial.name}
                                    onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Nombre del material"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="description">Descripción</Label>
                                  <Input
                                    id="description"
                                    value={newMaterial.description}
                                    onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Descripción del material"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="price">Precio *</Label>
                                    <Input
                                      id="price"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={newMaterial.price}
                                      onChange={(e) => setNewMaterial(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="unit">Unidad</Label>
                                    <Input
                                      id="unit"
                                      value={newMaterial.unit}
                                      onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
                                      placeholder="unidad, m², kg, etc."
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="category">Categoría</Label>
                                  <Input
                                    id="category"
                                    value={newMaterial.category}
                                    onChange={(e) => setNewMaterial(prev => ({ ...prev, category: e.target.value }))}
                                    placeholder="Categoría del material"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setShowAddMaterialDialog(false)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={saveNewMaterial}>
                                    Guardar Material
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
                                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                                  onClick={() => addMaterialToEstimate(material)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium">{material.name}</h4>
                                      <p className="text-sm text-muted-foreground">{material.description}</p>
                                      <Badge variant="secondary" className="text-xs mt-1">
                                        {material.category}
                                      </Badge>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">${material.price.toFixed(2)}</p>
                                      <p className="text-xs text-muted-foreground">por {material.unit}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={addCustomItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Artículo Personalizado
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay materiales agregados aún.</p>
                  <p className="text-sm">Haz clic en "Agregar Material" para comenzar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {estimate.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium">Artículo {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <Label htmlFor={`name-${item.id}`}>Nombre</Label>
                          <Input
                            id={`name-${item.id}`}
                            value={item.name}
                            onChange={(e) => updateCustomItem(item.id, 'name', e.target.value)}
                            placeholder="Nombre del artículo"
                          />
                          <div className="mt-2">
                            <Label htmlFor={`description-${item.id}`}>Descripción</Label>
                            <Input
                              id={`description-${item.id}`}
                              value={item.description}
                              onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                              placeholder="Descripción del artículo"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`quantity-${item.id}`}>Cantidad</Label>
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                          />
                          <div className="mt-2">
                            <Label htmlFor={`unit-${item.id}`}>Unidad</Label>
                            <Input
                              id={`unit-${item.id}`}
                              value={item.unit}
                              onChange={(e) => updateCustomItem(item.id, 'unit', e.target.value)}
                              placeholder="unidad"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`price-${item.id}`}>Precio Unitario</Label>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                          />
                          <div className="mt-2 p-2 bg-muted rounded text-center">
                            <p className="text-sm font-medium">Total</p>
                            <p className="text-lg font-bold">${item.total.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${estimate.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA (16%):</span>
                      <span>${estimate.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>${estimate.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Estimado</DialogTitle>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}