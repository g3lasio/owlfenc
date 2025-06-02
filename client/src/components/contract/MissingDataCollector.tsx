/**
 * Missing Data Collector Component
 * Handles the collection of missing contract data before allowing contract generation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { ContractData } from '@shared/contractSchema';

interface MissingDataCollectorProps {
  contractData: Partial<ContractData>;
  missingFields: string[];
  onDataComplete: (updatedData: ContractData) => void;
  ocrConfidence?: number;
}

const MissingDataCollector: React.FC<MissingDataCollectorProps> = ({
  contractData,
  missingFields,
  onDataComplete,
  ocrConfidence
}) => {
  const [formData, setFormData] = useState<Partial<ContractData>>(contractData);
  const [currentMissingFields, setCurrentMissingFields] = useState<string[]>(missingFields);

  const fieldDisplayNames: Record<string, string> = {
    clientName: 'Nombre del Cliente',
    clientEmail: 'Email del Cliente',
    clientPhone: 'Teléfono del Cliente',
    clientAddress: 'Dirección del Cliente',
    contractorEmail: 'Email del Contratista',
    contractorPhone: 'Teléfono del Contratista',
    contractorAddress: 'Dirección del Contratista',
    contractorLicense: 'Licencia del Contratista',
    projectDescription: 'Descripción del Proyecto',
    projectLocation: 'Ubicación del Proyecto',
    totalAmount: 'Monto Total del Contrato',
    completionDate: 'Fecha de Finalización',
    permitRequirements: 'Requisitos de Permisos',
    materialSpecs: 'Especificaciones de Materiales',
    insuranceInfo: 'Información de Seguros',
    downPayment: 'Pago Inicial',
    paymentSchedule: 'Cronograma de Pagos'
  };

  const fieldDescriptions: Record<string, string> = {
    clientName: 'Nombre completo del cliente para el contrato',
    clientEmail: 'Email para comunicación y envío de documentos',
    clientPhone: 'Teléfono de contacto durante el proyecto',
    clientAddress: 'Dirección completa del cliente',
    contractorEmail: 'Email profesional del contratista',
    contractorPhone: 'Teléfono de contacto del contratista',
    contractorAddress: 'Dirección de oficina del contratista',
    contractorLicense: 'Número de licencia de contratista',
    projectDescription: 'Descripción detallada del trabajo a realizar',
    projectLocation: 'Dirección donde se realizará el proyecto',
    totalAmount: 'Valor total del contrato en dólares',
    completionDate: 'Fecha estimada de finalización del proyecto',
    permitRequirements: 'Permisos municipales requeridos',
    materialSpecs: 'Especificaciones técnicas de materiales',
    insuranceInfo: 'Detalles de cobertura de seguros',
    downPayment: 'Monto del pago inicial requerido',
    paymentSchedule: 'Cronograma detallado de pagos'
  };

  const handleFieldChange = (field: string, value: string) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);

    // Update missing fields list
    const newMissingFields = missingFields.filter(f => {
      if (f === field && value.trim()) return false;
      return !updatedData[f as keyof ContractData] || 
             String(updatedData[f as keyof ContractData]).trim() === '';
    });
    
    setCurrentMissingFields(newMissingFields);
  };

  const handleSubmit = () => {
    if (currentMissingFields.length === 0) {
      onDataComplete(formData as ContractData);
    }
  };

  const getExtractedDataSummary = () => {
    const extractedFields = Object.entries(contractData)
      .filter(([_, value]) => value && String(value).trim() !== '')
      .map(([field, value]) => ({ field, value: String(value) }));

    return extractedFields;
  };

  return (
    <div className="space-y-6">
      {/* OCR Results Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos Extraídos del Documento
            </CardTitle>
            {ocrConfidence && (
              <Badge variant={ocrConfidence > 80 ? "default" : ocrConfidence > 60 ? "secondary" : "destructive"}>
                Confianza: {ocrConfidence}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getExtractedDataSummary().map(({ field, value }) => (
              <div key={field} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    {fieldDisplayNames[field] || field}
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1 truncate">{value}</p>
              </div>
            ))}
          </div>
          
          {getExtractedDataSummary().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-400" />
              <p>No se pudieron extraer datos del documento</p>
              <p className="text-sm">Complete manualmente los campos requeridos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Data Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Información Requerida para Contrato Robusto
            <Badge variant="destructive">{currentMissingFields.length} faltantes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 font-medium">
                ⚠️ Para generar un contrato legalmente robusto, necesitamos completar estos campos:
              </p>
              <ul className="list-disc list-inside text-orange-700 text-sm mt-2">
                {currentMissingFields.map(field => (
                  <li key={field}>{fieldDisplayNames[field] || field}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {currentMissingFields.map(field => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="text-base font-medium">
                    {fieldDisplayNames[field] || field}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    {fieldDescriptions[field] || 'Campo requerido para el contrato'}
                  </p>
                  
                  {field === 'projectDescription' || field === 'materialSpecs' || 
                   field === 'permitRequirements' || field === 'insuranceInfo' ? (
                    <Textarea
                      id={field}
                      placeholder={`Ingrese ${fieldDisplayNames[field]?.toLowerCase()}`}
                      value={formData[field as keyof ContractData] as string || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <Input
                      id={field}
                      type={field.includes('Amount') || field.includes('Payment') ? 'number' : 
                           field.includes('Date') ? 'date' : 
                           field.includes('Email') ? 'email' : 
                           field.includes('Phone') ? 'tel' : 'text'}
                      placeholder={`Ingrese ${fieldDisplayNames[field]?.toLowerCase()}`}
                      value={formData[field as keyof ContractData] as string || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-6 border-t">
              <Button 
                onClick={handleSubmit}
                disabled={currentMissingFields.length > 0}
                className="w-full"
                size="lg"
              >
                {currentMissingFields.length > 0 
                  ? `Complete ${currentMissingFields.length} campos para continuar`
                  : 'Proceder a Generar Contrato Blindado'
                }
              </Button>
              
              {currentMissingFields.length > 0 && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  Los campos marcados con * son obligatorios para garantizar protección legal
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MissingDataCollector;