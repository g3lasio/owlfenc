import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Edit3, Save, X } from 'lucide-react';

interface ExtractedData {
  clientInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
  };
  contractorInfo: {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    licenseNumbers: string;
  };
  projectDetails: {
    type: string;
    location: string;
    description: string;
    scopeOfWork: string;
    specifications: string;
  };
  financialInfo: {
    totalAmount: number;
    subtotal: number;
    taxes: number;
    paymentTerms: string;
    depositRequired: number;
  };
  timeline: {
    estimatedStartDate: string;
    estimatedCompletionDate: string;
    duration: string;
    schedule: string;
  };
}

interface EditableExtractedDataProps {
  extractedData: ExtractedData;
  onDataChange: (updatedData: ExtractedData) => void;
  onConfirm: () => void;
  riskLevel: string;
  protectiveRecommendations: any;
}

export default function EditableExtractedData({ 
  extractedData, 
  onDataChange, 
  onConfirm,
  riskLevel,
  protectiveRecommendations 
}: EditableExtractedDataProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [tempData, setTempData] = useState<ExtractedData>(extractedData);

  const handleEditStart = (section: string) => {
    setEditingSection(section);
    setTempData(extractedData);
  };

  const handleEditSave = () => {
    onDataChange(tempData);
    setEditingSection(null);
  };

  const handleEditCancel = () => {
    setTempData(extractedData);
    setEditingSection(null);
  };

  const updateTempData = (section: keyof ExtractedData, field: string, value: string | number) => {
    setTempData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const EditableField = ({ 
    label, 
    value, 
    section, 
    field, 
    type = 'text',
    isTextarea = false 
  }: {
    label: string;
    value: string | number;
    section: keyof ExtractedData;
    field: string;
    type?: string;
    isTextarea?: boolean;
  }) => {
    const isEditing = editingSection === section;
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-300">{label}</Label>
        {isEditing ? (
          isTextarea ? (
            <Textarea
              value={tempData[section][field as keyof typeof tempData[typeof section]] || ''}
              onChange={(e) => updateTempData(section, field, e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          ) : (
            <Input
              type={type}
              value={tempData[section][field as keyof typeof tempData[typeof section]] || ''}
              onChange={(e) => updateTempData(section, field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          )
        ) : (
          <div className="p-3 bg-gray-800 border border-gray-700 rounded-md text-white min-h-[40px] flex items-center">
            {type === 'number' && value !== undefined ? (
              typeof value === 'number' ? `$${value.toLocaleString()}` : value
            ) : (
              value || 'No especificado'
            )}
          </div>
        )}
      </div>
    );
  };

  const SectionCard = ({ 
    title, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    sectionKey: string; 
    children: React.ReactNode;
  }) => {
    const isEditing = editingSection === sectionKey;
    
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditStart(sectionKey)}
              className="text-blue-400 hover:text-blue-300 hover:bg-gray-800"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditSave}
                className="text-green-400 hover:text-green-300 hover:bg-gray-800"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCancel}
                className="text-red-400 hover:text-red-300 hover:bg-gray-800"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Información del Cliente */}
      <SectionCard title="Información del Cliente" sectionKey="clientInfo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            label="Nombre Completo"
            value={extractedData.clientInfo.name}
            section="clientInfo"
            field="name"
          />
          <EditableField
            label="Teléfono"
            value={extractedData.clientInfo.phone}
            section="clientInfo"
            field="phone"
            type="tel"
          />
          <EditableField
            label="Dirección"
            value={extractedData.clientInfo.address}
            section="clientInfo"
            field="address"
          />
          <EditableField
            label="Email"
            value={extractedData.clientInfo.email}
            section="clientInfo"
            field="email"
            type="email"
          />
          <EditableField
            label="Ciudad"
            value={extractedData.clientInfo.city}
            section="clientInfo"
            field="city"
          />
          <div className="grid grid-cols-2 gap-4">
            <EditableField
              label="Estado"
              value={extractedData.clientInfo.state}
              section="clientInfo"
              field="state"
            />
            <EditableField
              label="Código Postal"
              value={extractedData.clientInfo.zipCode}
              section="clientInfo"
              field="zipCode"
            />
          </div>
        </div>
      </SectionCard>

      {/* Información del Proyecto */}
      <SectionCard title="Detalles del Proyecto" sectionKey="projectDetails">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            label="Tipo de Proyecto"
            value={extractedData.projectDetails.type}
            section="projectDetails"
            field="type"
          />
          <EditableField
            label="Ubicación del Proyecto"
            value={extractedData.projectDetails.location}
            section="projectDetails"
            field="location"
          />
          <div className="md:col-span-2">
            <EditableField
              label="Descripción del Proyecto"
              value={extractedData.projectDetails.description}
              section="projectDetails"
              field="description"
              isTextarea={true}
            />
          </div>
          <div className="md:col-span-2">
            <EditableField
              label="Alcance del Trabajo"
              value={extractedData.projectDetails.scopeOfWork}
              section="projectDetails"
              field="scopeOfWork"
              isTextarea={true}
            />
          </div>
          <div className="md:col-span-2">
            <EditableField
              label="Especificaciones"
              value={extractedData.projectDetails.specifications}
              section="projectDetails"
              field="specifications"
              isTextarea={true}
            />
          </div>
        </div>
      </SectionCard>

      {/* Información Financiera */}
      <SectionCard title="Información Financiera" sectionKey="financialInfo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            label="Monto Total"
            value={extractedData.financialInfo.totalAmount}
            section="financialInfo"
            field="totalAmount"
            type="number"
          />
          <EditableField
            label="Subtotal"
            value={extractedData.financialInfo.subtotal}
            section="financialInfo"
            field="subtotal"
            type="number"
          />
          <EditableField
            label="Impuestos"
            value={extractedData.financialInfo.taxes}
            section="financialInfo"
            field="taxes"
            type="number"
          />
          <EditableField
            label="Depósito Requerido"
            value={extractedData.financialInfo.depositRequired}
            section="financialInfo"
            field="depositRequired"
            type="number"
          />
          <div className="md:col-span-2">
            <EditableField
              label="Términos de Pago"
              value={extractedData.financialInfo.paymentTerms}
              section="financialInfo"
              field="paymentTerms"
            />
          </div>
        </div>
      </SectionCard>

      {/* Cronograma */}
      <SectionCard title="Cronograma del Proyecto" sectionKey="timeline">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            label="Fecha de Inicio Estimada"
            value={extractedData.timeline.estimatedStartDate}
            section="timeline"
            field="estimatedStartDate"
            type="date"
          />
          <EditableField
            label="Fecha de Finalización Estimada"
            value={extractedData.timeline.estimatedCompletionDate}
            section="timeline"
            field="estimatedCompletionDate"
            type="date"
          />
          <EditableField
            label="Duración Estimada"
            value={extractedData.timeline.duration}
            section="timeline"
            field="duration"
          />
          <EditableField
            label="Horario de Trabajo"
            value={extractedData.timeline.schedule}
            section="timeline"
            field="schedule"
          />
        </div>
      </SectionCard>

      {/* Análisis de Riesgo Legal */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            ⚖️ Análisis de Riesgo Legal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-300">Nivel de Riesgo</Label>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                riskLevel === 'HIGH' ? 'bg-red-600 text-white' :
                riskLevel === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                'bg-green-600 text-white'
              }`}>
                {riskLevel} ({
                  riskLevel === 'HIGH' ? '4-5 puntos' :
                  riskLevel === 'MEDIUM' ? '2-3 puntos' :
                  '0-1 puntos'
                })
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-300">Protecciones Recomendadas</Label>
              <ul className="mt-2 space-y-2">
                {protectiveRecommendations && Object.entries(protectiveRecommendations).map(([key, value]) => (
                  <li key={key} className="flex items-start space-x-2">
                    <span className="text-blue-400 mt-1">○</span>
                    <span className="text-gray-300">{String(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-gray-700" />

      {/* Botón de Confirmación */}
      <div className="flex justify-center">
        <Button
          onClick={onConfirm}
          disabled={editingSection !== null}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
        >
          {editingSection ? 'Guarda los cambios antes de continuar' : 'Generar Contrato Legal Defensivo'}
        </Button>
      </div>
    </div>
  );
}