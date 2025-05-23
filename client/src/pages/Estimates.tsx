import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Package, Trash2, Edit, FileDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for the estimate form
  const [currentEstimate, setCurrentEstimate] = useState<Estimate>({
    title: '',
    clientId: '',
    client: null,
    items: [],
    subtotal: 0,
    total: 0,
    notes: '',
    status: 'draft'
  });

  // Dialog states
  const [showClientSearchDialog, setShowClientSearchDialog] = useState(false);
  const [showMaterialSearchDialog, setShowMaterialSearchDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Search states
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Temporary states for material selection
  const [tempSelectedMaterial, setTempSelectedMaterial] = useState<Material | null>(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempDescription, setTempDescription] = useState('');

  // New material form state
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    category: '',
    description: '',
    price: 0,
    unit: '',
    quantity: 1,
    supplier: '',
    sku: ''
  });

  const [previewHtml, setPreviewHtml] = useState('');

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: showClientSearchDialog
  });

  // Fetch materials
  const { data: materials = [] } = useQuery({
    queryKey: ['/api/materials'],
    enabled: showMaterialSearchDialog
  });

  // Filter clients based on search term
  const filteredClients = clients.filter((client: Client) =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(clientSearchTerm))
  );

  // Filter materials based on search term and category
  const filteredMaterials = materials.filter((material: Material) => {
    const matchesSearch = materialSearchTerm === '' || 
      material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
      (material.description && material.description.toLowerCase().includes(materialSearchTerm.toLowerCase())) ||
      material.category.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
      (material.sku && material.sku.toLowerCase().includes(materialSearchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Create material mutation
  const createMaterialMutation = useMutation({
    mutationFn: (materialData: any) => apiRequest('/api/materials', {
      method: 'POST',
      body: JSON.stringify(materialData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      toast({
        title: "Material creado",
        description: "El material se ha agregado al inventario y al estimado",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el material",
        variant: "destructive",
      });
    }
  });

  // Save estimate mutation
  const saveEstimateMutation = useMutation({
    mutationFn: (estimateData: any) => apiRequest('/api/estimates', {
      method: 'POST',
      body: JSON.stringify(estimateData)
    }),
    onSuccess: () => {
      toast({
        title: "Estimado guardado",
        description: "El estimado se ha guardado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el estimado",
        variant: "destructive",
      });
    }
  });

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = currentEstimate.items.reduce((sum, item) => sum + item.total, 0);
    setCurrentEstimate(prev => ({
      ...prev,
      subtotal,
      total: subtotal // You can add tax calculations here if needed
    }));
  }, [currentEstimate.items]);

  const handleSelectClient = (client: Client) => {
    setCurrentEstimate(prev => ({
      ...prev,
      clientId: client.id,
      client
    }));
    setShowClientSearchDialog(false);
    setClientSearchTerm('');
  };

  const handleAddSelectedMaterial = () => {
    if (!tempSelectedMaterial) return;

    const newItem: EstimateItem = {
      id: Date.now().toString(),
      materialId: tempSelectedMaterial.id,
      name: tempSelectedMaterial.name,
      description: tempDescription || tempSelectedMaterial.description,
      price: tempSelectedMaterial.price,
      quantity: tempQuantity,
      unit: tempSelectedMaterial.unit,
      total: tempSelectedMaterial.price * tempQuantity
    };

    setCurrentEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset temporary states
    setTempSelectedMaterial(null);
    setTempQuantity(1);
    setTempDescription('');
    setShowMaterialSearchDialog(false);
    setMaterialSearchTerm('');
    setSelectedCategory('all');

    toast({
      title: "Material agregado",
      description: "El material se ha agregado al estimado",
    });
  };

  const handleSaveMaterial = async () => {
    if (!newMaterial.name || !newMaterial.category || !newMaterial.unit || newMaterial.price <= 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      const materialWithId = await createMaterialMutation.mutateAsync(newMaterial);

      // Add to current estimate
      const newItem: EstimateItem = {
        id: Date.now().toString(),
        materialId: materialWithId.id,
        name: newMaterial.name,
        description: newMaterial.description,
        price: newMaterial.price,
        quantity: newMaterial.quantity,
        unit: newMaterial.unit,
        total: newMaterial.price * newMaterial.quantity
      };

      setCurrentEstimate(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));

      // Reset form
      setNewMaterial({
        name: '',
        category: '',
        description: '',
        price: 0,
        unit: '',
        quantity: 1,
        supplier: '',
        sku: ''
      });

      setShowAddMaterialDialog(false);
    } catch (error) {
      console.error('Error saving material:', error);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setCurrentEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleSaveEstimate = () => {
    if (!currentEstimate.title || !currentEstimate.clientId || currentEstimate.items.length === 0) {
      toast({
        title: "Error",
        description: "Por favor completa el título, selecciona un cliente y agrega al menos un material",
        variant: "destructive",
      });
      return;
    }

    saveEstimateMutation.mutate(currentEstimate);
  };

  const handlePreview = () => {
    const html = generateEstimateHTML();
    setPreviewHtml(html);
    setShowPreviewDialog(true);
  };

  const generateEstimateHTML = () => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          ${currentEstimate.title}
        </h1>
        <div style="margin: 20px 0;">
          <h3>Cliente:</h3>
          <p>${currentEstimate.client?.name || 'No seleccionado'}</p>
          ${currentEstimate.client?.email ? `<p>Email: ${currentEstimate.client.email}</p>` : ''}
          ${currentEstimate.client?.phone ? `<p>Teléfono: ${currentEstimate.client.phone}</p>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Material</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Cantidad</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Precio Unit.</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${currentEstimate.items.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px;">
                  <strong>${item.name}</strong>
                  ${item.description ? `<br><small>${item.description}</small>` : ''}
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.quantity} ${item.unit}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">$${item.price.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8f9fa; font-weight: bold;">
              <td colspan="3" style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total:</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">$${currentEstimate.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        ${currentEstimate.notes ? `
          <div style="margin: 20px 0;">
            <h3>Notas:</h3>
            <p>${currentEstimate.notes}</p>
          </div>
        ` : ''}
      </div>
    `;
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await apiRequest('/api/estimates/generate-pdf', {
        method: 'POST',
        body: JSON.stringify({ html: previewHtml })
      });

      // Handle PDF download here
      toast({
        title: "PDF generado",
        description: "El PDF se ha generado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Crear Estimado</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={currentEstimate.items.length === 0}>
            <Eye className="mr-2 h-4 w-4" />
            Vista Previa
          </Button>
          <Button onClick={handleSaveEstimate} disabled={saveEstimateMutation.isPending}>
            Guardar Estimado
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Estimate Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título del Estimado</Label>
                <Input
                  id="title"
                  value={currentEstimate.title}
                  onChange={(e) => setCurrentEstimate(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Cerca de madera para patio trasero"
                />
              </div>

              <div>
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentEstimate.client?.name || ''}
                    placeholder="Seleccionar cliente..."
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setShowClientSearchDialog(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={currentEstimate.notes}
                  onChange={(e) => setCurrentEstimate(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales sobre el estimado..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Materiales
                <Button onClick={() => setShowMaterialSearchDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Material
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentEstimate.items.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No hay materiales agregados. Haz clic en "Agregar Material" para comenzar.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Precio Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentEstimate.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
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

        {/* Right Column - Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${currentEstimate.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${currentEstimate.total.toFixed(2)}</span>
              </div>

              <div className="space-y-2 pt-4">
                <Badge variant="secondary">
                  {currentEstimate.items.length} materiales
                </Badge>
                {currentEstimate.client && (
                  <div className="text-sm text-muted-foreground">
                    Cliente: {currentEstimate.client.name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}