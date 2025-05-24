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
    const priceInDollars = material.price / 100; // Convert from cents to dollars
    
    const newItem: EstimateItem = {
      id: `item_${Date.now()}`,
      materialId: material.id,
      name: material.name,
      description: material.description || '',
      quantity,
      price: priceInDollars,
      unit: material.unit,
      total: priceInDollars * quantity
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

  // Generate preview using the premium template you provided
  const generatePreview = () => {
    if (!estimate.client || estimate.items.length === 0) {
      toast({
        title: 'Datos incompletos',
        description: 'Selecciona un cliente y agrega al menos un material',
        variant: 'destructive'
      });
      return;
    }

    // Generate items rows HTML
    const itemsHtml = estimate.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.description}</td>
        <td>${item.quantity} ${item.unit}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    // Format client address
    const clientAddress = [
      estimate.client.address,
      estimate.client.city,
      estimate.client.state,
      estimate.client.zip
    ].filter(Boolean).join(', ');

    // Format contractor info
    const contractorName = contractor?.company || contractor?.name || 'Tu Empresa';
    const contractorAddress = contractor?.address || 'Dirección de tu empresa';
    const contractorEmail = contractor?.email || 'contacto@tuempresa.com';
    const contractorPhone = contractor?.phone || '(555) 123-4567';

    // Use the exact premium template you provided
    const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Estimate Template (General Contractors - Neon Final)</title>
        <style>
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            background: #f8f9fb;
            margin: 0;
            padding: 0;
            color: #181818;
          }
          .container {
            max-width: 800px;
            margin: 40px auto;
            background: #fff;
            box-shadow: 0 4px 24px rgba(20, 240, 248, 0.12);
            border-radius: 18px;
            padding: 34px 36px 20px 36px;
            border: 2px solid #14f0f8;
          }
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 2.5px solid #14f0f8;
            padding-bottom: 18px;
            margin-bottom: 18px;
          }
          .company-details {
            line-height: 1.7;
          }
          .logo {
            max-width: 108px;
            max-height: 60px;
            margin-bottom: 6px;
            background: #f5f7fa;
            border-radius: 8px;
            border: 1px solid #d7e0ee;
            display: block;
          }
          .company-name {
            font-size: 1.22rem;
            font-weight: 700;
            color: #181818;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .company-address {
            font-size: 1rem;
            color: #222;
            margin-bottom: 2px;
          }
          .estimate-title {
            text-align: right;
            font-size: 2rem;
            color: #181818;
            font-weight: 600;
            letter-spacing: 1px;
            text-shadow: 0 2px 12px #e0fcff30;
          }
          .estimate-meta {
            text-align: right;
            font-size: 1rem;
            color: #303030;
            line-height: 1.5;
          }
          .section {
            margin-bottom: 23px;
          }
          .section-title {
            font-size: 1.13rem;
            font-weight: bold;
            color: #181818;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
            background: #e9fdff;
            padding: 4px 12px;
            border-left: 4px solid #14f0f8;
            border-radius: 6px 0 0 6px;
            display: inline-block;
            box-shadow: 0 1px 4px 0 #14f0f816;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            background: #e9fdff;
            border-radius: 7px;
            overflow: hidden;
            margin-bottom: 6px;
            box-shadow: 0 1.5px 6px 0 #10dbe222;
            border: 1.5px solid #14f0f8;
          }
          .details-table th,
          .details-table td {
            padding: 12px 9px;
            text-align: left;
            color: #181818;
          }
          .details-table th {
            background: #bafcff;
            color: #181818;
            font-size: 1.02rem;
            font-weight: 600;
            border-bottom: 1.5px solid #14f0f8;
          }
          .details-table td {
            border-bottom: 1px solid #e6fafd;
            font-size: 1rem;
          }
          .details-table tr:last-child td {
            border-bottom: none;
          }
          .totals-row {
            font-weight: 700;
            background: #bafcff;
            font-size: 1.09rem;
            color: #181818;
          }
          .project-details {
            font-size: 1.06rem;
            color: #233;
            margin: 16px 0 24px 0;
            padding: 18px 22px 13px 22px;
            background: #e1fbfc;
            border-radius: 8px;
            border-left: 4px solid #14f0f8;
            box-shadow: 0 2px 8px rgba(20, 240, 248, 0.07);
          }
          .client-contact a,
          .company-details a {
            display: inline-block;
            margin-right: 10px;
            padding: 4px 10px;
            color: #181818;
            background: #e6fcff;
            border-radius: 7px;
            text-decoration: none;
            font-weight: 500;
            font-size: 1.02rem;
            transition: background 0.2s;
            box-shadow: 0 0 7px 0 #10dbe225;
            border: 1px solid #14f0f8;
          }
          .client-contact a:hover,
          .company-details a:hover {
            background: #14f0f8;
            color: #181818;
          }
          .footer {
            text-align: right;
            margin-top: 16px;
            font-size: 0.89rem;
            color: #14f0f8;
            padding-top: 5px;
            border-top: 1.5px solid #bafcff;
            letter-spacing: 0.12px;
            font-family: "Segoe UI", Arial, sans-serif;
            text-shadow: 0 0 8px #10dbe233;
          }
          .table-wrapper {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #14f0f8 #e9fdff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-details">
              ${contractor?.logo ? `<img src="${contractor.logo}" alt="Company Logo" class="logo" />` : ''}
              <div class="company-name">${contractorName}</div>
              <div class="company-address">${contractorAddress}</div>
              <div>
                <a href="mailto:${contractorEmail}">${contractorEmail}</a>
                <a href="tel:${contractorPhone}">${contractorPhone}</a>
              </div>
            </div>
            <div>
              <div class="estimate-title">ESTIMATE</div>
              <div class="estimate-meta">
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><strong>Estimate #:</strong> EST-${Date.now()}</div>
                <div><strong>Valid Until:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Client</div>
            <div class="table-wrapper">
              <table class="details-table">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                </tr>
                <tr>
                  <td>${estimate.client.name}</td>
                  <td><a href="mailto:${estimate.client.email || ''}">${estimate.client.email || 'N/A'}</a></td>
                  <td><a href="tel:${estimate.client.phone || ''}">${estimate.client.phone || 'N/A'}</a></td>
                  <td>${clientAddress || 'N/A'}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Estimate Details</div>
            <div class="table-wrapper">
              <table class="details-table">
                <tr>
                  <th>Item</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
                ${itemsHtml}
                <tr class="totals-row">
                  <td colspan="4" style="text-align: right">Subtotal</td>
                  <td>$${estimate.subtotal.toFixed(2)}</td>
                </tr>
                <tr class="totals-row">
                  <td colspan="4" style="text-align: right">Tax (16%)</td>
                  <td>$${estimate.tax.toFixed(2)}</td>
                </tr>
                <tr class="totals-row">
                  <td colspan="4" style="text-align: right"><strong>Total</strong></td>
                  <td><strong>$${estimate.total.toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>
          </div>

          ${(estimate.scope || estimate.timeline || estimate.process || estimate.includes || estimate.excludes) ? `
          <div class="section project-details">
            ${estimate.scope ? `<b>Scope:</b> ${estimate.scope}<br />` : ''}
            ${estimate.timeline ? `<b>Timeline:</b> ${estimate.timeline}<br />` : ''}
            ${estimate.process ? `<b>Process:</b> ${estimate.process}<br />` : ''}
            ${estimate.includes ? `<b>Includes:</b> ${estimate.includes}<br />` : ''}
            ${estimate.excludes ? `<b>Excludes:</b> ${estimate.excludes}` : ''}
          </div>
          ` : ''}

          ${estimate.notes ? `
          <div class="section project-details">
            <b>Additional Notes:</b><br />
            ${estimate.notes.replace(/\n/g, '<br/>')}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Terms & Conditions</div>
            <div class="terms">
              <ul style="margin: 0 0 0 1.4em; padding: 0; color: #181818">
                <li>
                  This estimate is valid for 30 days from the issue date. Prices may
                  change after this period due to fluctuations in materials, labor,
                  or market conditions.
                </li>
                <li>
                  Project execution, specific terms, and additional conditions will
                  be detailed in the formal contract to be signed by both parties.
                </li>
                <li>For questions, please contact us directly.</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} ${contractorName}. All Rights Reserved.
          </div>
        </div>
      </body>
    </html>`;

    setPreviewHtml(html);
    setShowPreview(true);
  };

  // Save estimate to your existing system
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Crear Estimado Profesional
          </h1>
          <p className="text-muted-foreground">Conectado con tu base de clientes y materiales</p>
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
          <Button disabled={!estimate.client?.email || estimate.items.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            Enviar
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
                <Label htmlFor="process">Proceso de Trabajo</Label>
                <Textarea
                  id="process"
                  placeholder="Pasos del proceso de trabajo..."
                  value={estimate.process}
                  onChange={(e) => setEstimate(prev => ({ ...prev, process: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="includes">Incluye</Label>
                <Textarea
                  id="includes"
                  placeholder="Servicios y materiales incluidos..."
                  value={estimate.includes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, includes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="excludes">No Incluye</Label>
                <Textarea
                  id="excludes"
                  placeholder="Servicios y materiales no incluidos..."
                  value={estimate.excludes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, excludes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas especiales, condiciones, etc."
                  value={estimate.notes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Materials */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Materiales ({estimate.items.length})
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
                                    <p className="font-medium">${(material.price / 100).toFixed(2)}</p>
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay materiales agregados aún.</p>
                  <p className="text-sm">Selecciona materiales de tu inventario.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {estimate.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium">#{index + 1} - {item.name}</h4>
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
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          />
                          <div className="mt-2">
                            <Label htmlFor={`description-${item.id}`}>Descripción</Label>
                            <Input
                              id={`description-${item.id}`}
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
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
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                          <div className="mt-2">
                            <Label htmlFor={`unit-${item.id}`}>Unidad</Label>
                            <Input
                              id={`unit-${item.id}`}
                              value={item.unit}
                              onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
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
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
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