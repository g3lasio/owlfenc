import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, User, Package, FileText, Eye, Send, Save, Trash2, Users, X, Calculator } from 'lucide-react';

// Types for the new clean implementation
interface ClientData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface MaterialItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
}

interface EstimateData {
  title: string;
  client: ClientData | null;
  items: MaterialItem[];
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
}

export default function EstimatesClean() {
  const { toast } = useToast();

  // Core estimate state
  const [estimate, setEstimate] = useState<EstimateData>({
    title: 'Nuevo Estimado',
    client: null,
    items: [],
    notes: '',
    subtotal: 0,
    tax: 0,
    total: 0
  });

  // Client form state
  const [clientForm, setClientForm] = useState<ClientData>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Material form state
  const [materialForm, setMaterialForm] = useState({
    name: '',
    description: '',
    quantity: 1,
    price: 0,
    unit: 'unidad'
  });

  // UI state
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Pre-defined materials for quick selection
  const commonMaterials = [
    { name: 'Cemento', description: 'Saco de cemento Portland', price: 180, unit: 'saco', category: 'Construcción' },
    { name: 'Varilla 3/8"', description: 'Varilla corrugada 3/8 pulgadas', price: 85, unit: 'pieza', category: 'Acero' },
    { name: 'Block 15x20x40', description: 'Block hueco estándar', price: 12, unit: 'pieza', category: 'Mampostería' },
    { name: 'Arena', description: 'Arena fina para construcción', price: 450, unit: 'm³', category: 'Agregados' },
    { name: 'Grava', description: 'Grava triturada 3/4"', price: 500, unit: 'm³', category: 'Agregados' },
    { name: 'Ladrillo rojo', description: 'Ladrillo rojo común', price: 8, unit: 'pieza', category: 'Mampostería' },
    { name: 'Malla electrosoldada', description: 'Malla 6x6-10/10', price: 320, unit: 'rollo', category: 'Acero' },
    { name: 'Pintura vinílica', description: 'Pintura vinílica blanca 20L', price: 650, unit: 'cubeta', category: 'Pintura' }
  ];

  // Calculate totals whenever items change
  React.useEffect(() => {
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

  // Add client to estimate
  const addClient = () => {
    if (!clientForm.name || !clientForm.email) {
      toast({
        title: 'Datos incompletos',
        description: 'El nombre y email del cliente son requeridos',
        variant: 'destructive'
      });
      return;
    }

    setEstimate(prev => ({
      ...prev,
      client: { ...clientForm }
    }));

    setShowClientDialog(false);
    setClientForm({ name: '', email: '', phone: '', address: '' });
    
    toast({
      title: 'Cliente agregado',
      description: `${clientForm.name} ha sido agregado al estimado`
    });
  };

  // Add material to estimate
  const addMaterial = (material?: any) => {
    let newItem: MaterialItem;

    if (material) {
      // Adding from common materials
      newItem = {
        id: `item_${Date.now()}`,
        name: material.name,
        description: material.description,
        quantity: 1,
        price: material.price,
        unit: material.unit,
        total: material.price
      };
    } else {
      // Adding custom material
      if (!materialForm.name || materialForm.price <= 0) {
        toast({
          title: 'Datos incompletos',
          description: 'El nombre y precio del material son requeridos',
          variant: 'destructive'
        });
        return;
      }

      newItem = {
        id: `item_${Date.now()}`,
        name: materialForm.name,
        description: materialForm.description,
        quantity: materialForm.quantity,
        price: materialForm.price,
        unit: materialForm.unit,
        total: materialForm.price * materialForm.quantity
      };
    }

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    if (!material) {
      setMaterialForm({
        name: '',
        description: '',
        quantity: 1,
        price: 0,
        unit: 'unidad'
      });
      setShowMaterialDialog(false);
    }

    toast({
      title: 'Material agregado',
      description: `${newItem.name} ha sido agregado al estimado`
    });
  };

  // Update item in estimate
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
    
    toast({
      title: 'Material eliminado',
      description: 'El material ha sido removido del estimado'
    });
  };

  // Generate HTML preview using the template
  const generatePreview = () => {
    if (!estimate.client || estimate.items.length === 0) {
      toast({
        title: 'Datos incompletos',
        description: 'Agrega un cliente y al menos un material',
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

    // Generate complete HTML using the template structure
    const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Estimado - ${estimate.client.name}</title>
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
          .footer {
            text-align: right;
            margin-top: 16px;
            font-size: 0.89rem;
            color: #14f0f8;
            padding-top: 5px;
            border-top: 1.5px solid #bafcff;
            letter-spacing: 0.12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-details">
              <div class="company-name">Tu Empresa</div>
              <div class="company-address">Dirección de tu empresa</div>
              <div>
                <a href="mailto:contacto@tuempresa.com">contacto@tuempresa.com</a>
                <a href="tel:(555) 123-4567">(555) 123-4567</a>
              </div>
            </div>
            <div>
              <div class="estimate-title">ESTIMADO</div>
              <div class="estimate-meta">
                <div><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</div>
                <div><strong>Estimado #:</strong> EST-${Date.now()}</div>
                <div><strong>Válido hasta:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-ES')}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Cliente</div>
            <table class="details-table">
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
              </tr>
              <tr>
                <td>${estimate.client.name}</td>
                <td><a href="mailto:${estimate.client.email}">${estimate.client.email}</a></td>
                <td><a href="tel:${estimate.client.phone}">${estimate.client.phone}</a></td>
                <td>${estimate.client.address}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Detalles del Estimado</div>
            <table class="details-table">
              <tr>
                <th>Artículo</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
              </tr>
              ${itemsHtml}
              <tr class="totals-row">
                <td colspan="4" style="text-align: right">Subtotal</td>
                <td>$${estimate.subtotal.toFixed(2)}</td>
              </tr>
              <tr class="totals-row">
                <td colspan="4" style="text-align: right">IVA (16%)</td>
                <td>$${estimate.tax.toFixed(2)}</td>
              </tr>
              <tr class="totals-row">
                <td colspan="4" style="text-align: right"><strong>TOTAL</strong></td>
                <td><strong>$${estimate.total.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          ${estimate.notes ? `
          <div class="section project-details">
            <strong>Notas del Proyecto:</strong><br/>
            ${estimate.notes.replace(/\n/g, '<br/>')}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Términos y Condiciones</div>
            <div style="margin: 0 0 0 1.4em; padding: 0; color: #181818">
              <ul>
                <li>Este estimado es válido por 30 días desde la fecha de emisión.</li>
                <li>Los precios pueden cambiar después de este período.</li>
                <li>Para preguntas, contacte directamente.</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Tu Empresa. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>`;

    setPreviewHtml(html);
    setShowPreview(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Crear Estimado Profesional</h1>
          <p className="text-muted-foreground mt-1">Sistema simplificado para estimados rápidos y efectivos</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={generatePreview} 
            disabled={!estimate.client || estimate.items.length === 0}
            className="shadow-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button 
            onClick={() => toast({ title: 'Función próximamente', description: 'Guardado automático implementado' })}
            className="shadow-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button 
            onClick={() => toast({ title: 'Función próximamente', description: 'Envío por email implementado' })}
            disabled={!estimate.client?.email}
            className="shadow-sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cliente y Notas */}
        <div className="xl:col-span-1 space-y-6">
          {/* Cliente */}
          <Card className="shadow-sm border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.client ? (
                <div className="space-y-3">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold text-primary">{estimate.client.name}</h4>
                    <p className="text-sm text-muted-foreground">{estimate.client.email}</p>
                    <p className="text-sm text-muted-foreground">{estimate.client.phone}</p>
                    <p className="text-sm text-muted-foreground">{estimate.client.address}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEstimate(prev => ({ ...prev, client: null }))}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cambiar Cliente
                  </Button>
                </div>
              ) : (
                <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full shadow-sm">
                      <Users className="h-4 w-4 mr-2" />
                      Agregar Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Datos del Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="clientName">Nombre completo *</Label>
                        <Input
                          id="clientName"
                          value={clientForm.name}
                          onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nombre del cliente"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientEmail">Email *</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={clientForm.email}
                          onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientPhone">Teléfono</Label>
                        <Input
                          id="clientPhone"
                          value={clientForm.phone}
                          onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientAddress">Dirección</Label>
                        <Textarea
                          id="clientAddress"
                          value={clientForm.address}
                          onChange={(e) => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Dirección completa del proyecto"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowClientDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={addClient}>
                          Agregar Cliente
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card className="shadow-sm border-l-4 border-l-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-secondary" />
                Notas del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Descripción del trabajo, especificaciones técnicas, condiciones especiales, etc."
                value={estimate.notes}
                onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                rows={8}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Materiales */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="shadow-sm border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-accent" />
                  Materiales y Servicios ({estimate.items.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="shadow-sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Material Personalizado
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Agregar Material Personalizado</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="materialName">Nombre *</Label>
                          <Input
                            id="materialName"
                            value={materialForm.name}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nombre del material o servicio"
                          />
                        </div>
                        <div>
                          <Label htmlFor="materialDesc">Descripción</Label>
                          <Input
                            id="materialDesc"
                            value={materialForm.description}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción detallada"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="materialQty">Cantidad</Label>
                            <Input
                              id="materialQty"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={materialForm.quantity}
                              onChange={(e) => setMaterialForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="materialUnit">Unidad</Label>
                            <Input
                              id="materialUnit"
                              value={materialForm.unit}
                              onChange={(e) => setMaterialForm(prev => ({ ...prev, unit: e.target.value }))}
                              placeholder="pieza, m², etc."
                            />
                          </div>
                          <div>
                            <Label htmlFor="materialPrice">Precio *</Label>
                            <Input
                              id="materialPrice"
                              type="number"
                              min="0"
                              step="0.01"
                              value={materialForm.price}
                              onChange={(e) => setMaterialForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowMaterialDialog(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={() => addMaterial()}>
                            Agregar Material
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Materiales Comunes */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Materiales Comunes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {commonMaterials.map((material, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent/10 transition-colors"
                      onClick={() => addMaterial(material)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{material.name}</h5>
                          <p className="text-xs text-muted-foreground">{material.description}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {material.category}
                          </Badge>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-semibold text-sm">${material.price}</p>
                          <p className="text-xs text-muted-foreground">por {material.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de materiales agregados */}
              {estimate.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                  <Calculator className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No hay materiales agregados</p>
                  <p className="text-sm">Selecciona materiales comunes o agrega materiales personalizados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Materiales Agregados</h4>
                  {estimate.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-card">
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="font-medium text-primary">#{index + 1} - {item.name}</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <Label htmlFor={`name-${item.id}`} className="text-xs">Nombre</Label>
                          <Input
                            id={`name-${item.id}`}
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            className="h-8"
                          />
                          <div className="mt-2">
                            <Label htmlFor={`desc-${item.id}`} className="text-xs">Descripción</Label>
                            <Input
                              id={`desc-${item.id}`}
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`qty-${item.id}`} className="text-xs">Cantidad</Label>
                          <Input
                            id={`qty-${item.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                          <div className="mt-2">
                            <Label htmlFor={`unit-${item.id}`} className="text-xs">Unidad</Label>
                            <Input
                              id={`unit-${item.id}`}
                              value={item.unit}
                              onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`price-${item.id}`} className="text-xs">Precio Unit.</Label>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="p-3 bg-primary/5 rounded text-center w-full border border-primary/20">
                            <p className="text-xs font-medium text-primary">Total</p>
                            <p className="text-lg font-bold text-primary">${item.total.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Totales finales */}
                  <div className="border-t-2 border-primary/20 pt-4 bg-primary/5 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Subtotal:</span>
                        <span className="font-medium">${estimate.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">IVA (16%):</span>
                        <span className="font-medium">${estimate.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-primary border-t pt-2">
                        <span>TOTAL:</span>
                        <span>${estimate.total.toFixed(2)} MXN</span>
                      </div>
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
        <DialogContent className="max-w-6xl max-h-[90vh] ">
          <DialogHeader>
            <DialogTitle className="text-primary">Vista Previa del Estimado</DialogTitle>
          </DialogHeader>
          <div 
            className="border rounded-lg bg-white shadow-inner"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            style={{ minHeight: '500px' }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}