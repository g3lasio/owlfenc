/**
 * Editor Inteligente de Contratos con IA Proactiva
 * Sugiere campos faltantes y calcula valores automáticamente
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

interface ContractData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  projectType: string;
  projectDescription: string;
  totalAmount: string;
  depositAmount?: string;
  startDate?: Date;
  completionDate?: Date;
  paymentTerms?: string;
}

interface AISuggestion {
  field: string;
  value: string;
  reason: string;
  confidence: number;
}

interface IntelligentContractEditorProps {
  extractedData: any;
  onDataChange: (data: ContractData) => void;
}

export default function IntelligentContractEditor({ extractedData, onDataChange }: IntelligentContractEditorProps) {
  const [contractData, setContractData] = useState<ContractData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    projectType: '',
    projectDescription: '',
    totalAmount: '',
    depositAmount: '',
    paymentTerms: ''
  });

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Cargar datos extraídos y generar sugerencias inteligentes
  useEffect(() => {
    if (extractedData) {
      const newData: ContractData = {
        clientName: extractedData.clientInfo?.name || '',
        clientPhone: extractedData.clientInfo?.phone || '',
        clientEmail: extractedData.clientInfo?.email || '',
        clientAddress: `${extractedData.clientInfo?.address || ''} ${extractedData.clientInfo?.city || ''} ${extractedData.clientInfo?.state || ''} ${extractedData.clientInfo?.zipCode || ''}`.trim(),
        projectType: extractedData.projectDetails?.type || '',
        projectDescription: extractedData.projectDetails?.description || '',
        totalAmount: extractedData.financialInfo?.total?.toString() || '',
      };

      setContractData(newData);
      generateAISuggestions(newData);
    }
  }, [extractedData]);

  // IA Proactiva - Genera sugerencias inteligentes
  const generateAISuggestions = (data: ContractData) => {
    setIsAnalyzing(true);
    const suggestions: AISuggestion[] = [];

    // Calcular depósito automáticamente (50%)
    if (data.totalAmount && !data.depositAmount) {
      const total = parseFloat(data.totalAmount.replace(/[,$]/g, ''));
      if (!isNaN(total)) {
        const deposit = (total * 0.5).toFixed(2);
        suggestions.push({
          field: 'depositAmount',
          value: deposit,
          reason: `Depósito recomendado del 50% para proyectos de construcción`,
          confidence: 95
        });
      }
    }

    // Sugerir términos de pago si faltan
    if (!data.paymentTerms) {
      suggestions.push({
        field: 'paymentTerms',
        value: '50% al inicio, 50% al completar el trabajo',
        reason: 'Términos de pago estándar para proteger al contratista',
        confidence: 90
      });
    }

    // Detectar campos faltantes críticos
    if (!data.clientPhone) {
      suggestions.push({
        field: 'clientPhone',
        value: '',
        reason: 'Teléfono del cliente requerido para comunicación durante el proyecto',
        confidence: 100
      });
    }

    // Sugerir fechas de inicio
    if (!data.startDate) {
      const suggestedStart = new Date();
      suggestedStart.setDate(suggestedStart.getDate() + 7); // 1 semana desde hoy
      suggestions.push({
        field: 'startDate',
        value: suggestedStart.toISOString(),
        reason: 'Fecha de inicio sugerida: 1 semana para preparación',
        confidence: 80
      });
    }

    setAiSuggestions(suggestions);
    setIsAnalyzing(false);
  };

  // Aplicar sugerencia de IA
  const applySuggestion = (suggestion: AISuggestion) => {
    const updatedData = { ...contractData };
    
    if (suggestion.field === 'startDate') {
      updatedData.startDate = new Date(suggestion.value);
    } else {
      (updatedData as any)[suggestion.field] = suggestion.value;
    }

    setContractData(updatedData);
    onDataChange(updatedData);
    
    // Remover sugerencia aplicada
    setAiSuggestions(prev => prev.filter(s => s.field !== suggestion.field));
  };

  // Actualizar campo
  const updateField = (field: keyof ContractData, value: string | Date) => {
    const updatedData = { ...contractData, [field]: value };
    setContractData(updatedData);
    onDataChange(updatedData);
  };

  return (
    <div className="space-y-6">
      {/* Panel de Sugerencias IA */}
      {aiSuggestions.length > 0 && (
        <Card className="border-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Brain className="h-5 w-5" />
              DeepSearch AI - Sugerencias Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-gray-800">
                      {getFieldLabel(suggestion.field)}
                    </span>
                    <Badge variant="secondary">{suggestion.confidence}% confianza</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{suggestion.reason}</p>
                  {suggestion.value && (
                    <p className="text-sm font-medium text-green-600 mt-1">
                      Sugerencia: {suggestion.value}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={() => applySuggestion(suggestion)}
                  size="sm"
                  className="ml-3"
                >
                  Aplicar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Información del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientName">Nombre Completo</Label>
            <Input
              id="clientName"
              value={contractData.clientName}
              onChange={(e) => updateField('clientName', e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <Label htmlFor="clientPhone">Teléfono</Label>
            <Input
              id="clientPhone"
              value={contractData.clientPhone}
              onChange={(e) => updateField('clientPhone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              type="email"
              value={contractData.clientEmail}
              onChange={(e) => updateField('clientEmail', e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
          <div>
            <Label htmlFor="clientAddress">Dirección Completa</Label>
            <Textarea
              id="clientAddress"
              value={contractData.clientAddress}
              onChange={(e) => updateField('clientAddress', e.target.value)}
              placeholder="Dirección completa del proyecto"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detalles del Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="projectType">Tipo de Proyecto</Label>
            <Input
              id="projectType"
              value={contractData.projectType}
              onChange={(e) => updateField('projectType', e.target.value)}
              placeholder="ej: Instalación de Cerca Chain Link"
            />
          </div>
          <div>
            <Label htmlFor="projectDescription">Descripción Detallada</Label>
            <Textarea
              id="projectDescription"
              value={contractData.projectDescription}
              onChange={(e) => updateField('projectDescription', e.target.value)}
              placeholder="Descripción completa del trabajo a realizar"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Información Financiera */}
      <Card>
        <CardHeader>
          <CardTitle>Información Financiera</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalAmount">Costo Total</Label>
            <Input
              id="totalAmount"
              value={contractData.totalAmount}
              onChange={(e) => updateField('totalAmount', e.target.value)}
              placeholder="$0.00"
            />
          </div>
          <div>
            <Label htmlFor="depositAmount">Depósito Requerido</Label>
            <Input
              id="depositAmount"
              value={contractData.depositAmount}
              onChange={(e) => updateField('depositAmount', e.target.value)}
              placeholder="$0.00"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="paymentTerms">Términos de Pago</Label>
            <Textarea
              id="paymentTerms"
              value={contractData.paymentTerms}
              onChange={(e) => updateField('paymentTerms', e.target.value)}
              placeholder="Describe los términos de pago"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cronograma del Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle>Cronograma del Proyecto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Fecha de Inicio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {contractData.startDate ? format(contractData.startDate, "PPP") : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={contractData.startDate}
                  onSelect={(date) => updateField('startDate', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Fecha de Finalización</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {contractData.completionDate ? format(contractData.completionDate, "PPP") : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={contractData.completionDate}
                  onSelect={(date) => updateField('completionDate', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Botón de Guardar */}
      <div className="flex justify-end">
        <Button onClick={() => onDataChange(contractData)} className="px-8">
          <Save className="mr-2 h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}

// Helper function para obtener etiquetas de campos
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    depositAmount: 'Depósito Requerido',
    paymentTerms: 'Términos de Pago',
    clientPhone: 'Teléfono del Cliente',
    startDate: 'Fecha de Inicio',
    completionDate: 'Fecha de Finalización'
  };
  return labels[field] || field;
}