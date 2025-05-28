/**
 * Formulario de Contrato Completamente Editable
 * Permite edición libre de todos los campos con sugerencias de IA
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Brain, Lightbulb, Save, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ContractFormData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  projectType: string;
  projectDescription: string;
  totalAmount: string;
  depositAmount: string;
  startDate: Date | null;
  completionDate: Date | null;
  paymentTerms: string;
  warrantyPeriod: string;
  changeOrderPolicy: string;
}

interface EditableContractFormProps {
  initialData?: any;
  onSave: (data: ContractFormData) => void;
}

export default function EditableContractForm({ initialData, onSave }: EditableContractFormProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ContractFormData>({
    clientName: initialData?.clientName || '',
    clientPhone: initialData?.clientPhone || '',
    clientEmail: initialData?.clientEmail || '',
    clientAddress: initialData?.address || '',
    projectType: initialData?.projectType || '',
    projectDescription: initialData?.projectDescription || '',
    totalAmount: initialData?.totalAmount?.toString() || '',
    depositAmount: '',
    startDate: null,
    completionDate: null,
    paymentTerms: '',
    warrantyPeriod: '',
    changeOrderPolicy: ''
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Generar sugerencias automáticas del 50% de depósito
  useEffect(() => {
    if (formData.totalAmount && !formData.depositAmount) {
      const total = parseFloat(formData.totalAmount.replace(/[^0-9.]/g, ''));
      if (total > 0) {
        const suggestedDeposit = (total * 0.5).toFixed(2);
        setFormData(prev => ({ ...prev, depositAmount: suggestedDeposit }));
        toast({
          title: "💡 Sugerencia de IA",
          description: `Depósito del 50% sugerido: $${suggestedDeposit}`,
          variant: "default"
        });
      }
    }
  }, [formData.totalAmount, toast]);

  // Generar sugerencias de términos de pago
  useEffect(() => {
    if (!formData.paymentTerms && formData.depositAmount) {
      const remainingAmount = parseFloat(formData.totalAmount) - parseFloat(formData.depositAmount);
      const suggestedTerms = `${formData.depositAmount} al inicio del proyecto, $${remainingAmount.toFixed(2)} al completar el trabajo. Pagos tardíos sujetos a 1.5% de interés mensual.`;
      setFormData(prev => ({ ...prev, paymentTerms: suggestedTerms }));
    }
  }, [formData.depositAmount, formData.totalAmount]);

  // Generar sugerencias de garantía
  useEffect(() => {
    if (!formData.warrantyPeriod && formData.projectType) {
      const warranty = "2 años en materiales, 1 año en mano de obra. No cubre daños por negligencia del cliente o condiciones climáticas extremas.";
      setFormData(prev => ({ ...prev, warrantyPeriod: warranty }));
    }
  }, [formData.projectType]);

  // Generar política de cambios
  useEffect(() => {
    if (!formData.changeOrderPolicy && formData.projectType) {
      const policy = "Cualquier cambio al trabajo original debe ser solicitado por escrito y aprobado por ambas partes antes de proceder. Los cambios adicionales serán facturados por separado.";
      setFormData(prev => ({ ...prev, changeOrderPolicy: policy }));
    }
  }, [formData.projectType]);

  const handleInputChange = (field: keyof ContractFormData, value: string | Date | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Validación básica
    if (!formData.clientName || !formData.clientAddress || !formData.totalAmount) {
      toast({
        title: "⚠️ Campos requeridos",
        description: "Complete al menos: Nombre del cliente, Dirección y Costo total",
        variant: "destructive"
      });
      return;
    }

    onSave(formData);
    toast({
      title: "✅ Contrato guardado",
      description: "Los datos del contrato han sido guardados exitosamente",
      variant: "default"
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Información del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👤 Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientName">Nombre Completo *</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <Label htmlFor="clientPhone">Teléfono</Label>
            <Input
              id="clientPhone"
              value={formData.clientPhone}
              onChange={(e) => handleInputChange('clientPhone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              type="email"
              value={formData.clientEmail}
              onChange={(e) => handleInputChange('clientEmail', e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
          <div>
            <Label htmlFor="clientAddress">Dirección del Proyecto *</Label>
            <Textarea
              id="clientAddress"
              value={formData.clientAddress}
              onChange={(e) => handleInputChange('clientAddress', e.target.value)}
              placeholder="Dirección completa del proyecto"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detalles del Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔨 Detalles del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="projectType">Tipo de Proyecto</Label>
            <Input
              id="projectType"
              value={formData.projectType}
              onChange={(e) => handleInputChange('projectType', e.target.value)}
              placeholder="ej: Instalación de Cerca Chain Link"
            />
          </div>
          <div>
            <Label htmlFor="projectDescription">Descripción Detallada</Label>
            <Textarea
              id="projectDescription"
              value={formData.projectDescription}
              onChange={(e) => handleInputChange('projectDescription', e.target.value)}
              placeholder="Descripción completa del trabajo a realizar, materiales, especificaciones técnicas..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Información Financiera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💰 Información Financiera
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalAmount">Costo Total *</Label>
            <Input
              id="totalAmount"
              value={formData.totalAmount}
              onChange={(e) => handleInputChange('totalAmount', e.target.value)}
              placeholder="$0.00"
            />
          </div>
          <div>
            <Label htmlFor="depositAmount">Depósito Requerido (50% recomendado)</Label>
            <Input
              id="depositAmount"
              value={formData.depositAmount}
              onChange={(e) => handleInputChange('depositAmount', e.target.value)}
              placeholder="$0.00"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="paymentTerms">Términos de Pago</Label>
            <Textarea
              id="paymentTerms"
              value={formData.paymentTerms}
              onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
              placeholder="Especifique los términos de pago, fechas de vencimiento, penalidades..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cronograma del Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📅 Cronograma del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Fecha de Inicio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate ? format(formData.startDate, "PPP") : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.startDate || undefined}
                  onSelect={(date) => handleInputChange('startDate', date || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Fecha de Finalización</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.completionDate ? format(formData.completionDate, "PPP") : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.completionDate || undefined}
                  onSelect={(date) => handleInputChange('completionDate', date || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Términos Legales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚖️ Términos Legales y Garantías
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="warrantyPeriod">Período de Garantía</Label>
            <Textarea
              id="warrantyPeriod"
              value={formData.warrantyPeriod}
              onChange={(e) => handleInputChange('warrantyPeriod', e.target.value)}
              placeholder="Especifique los términos de garantía para materiales y mano de obra..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="changeOrderPolicy">Política de Cambios y Órdenes Adicionales</Label>
            <Textarea
              id="changeOrderPolicy"
              value={formData.changeOrderPolicy}
              onChange={(e) => handleInputChange('changeOrderPolicy', e.target.value)}
              placeholder="Política para cambios al trabajo original, aprobaciones requeridas..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botón de Guardar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="min-w-32">
          <Save className="mr-2 h-4 w-4" />
          Guardar Contrato
        </Button>
      </div>
    </div>
  );
}