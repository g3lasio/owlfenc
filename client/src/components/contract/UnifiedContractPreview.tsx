/**
 * Unified Contract Preview Component
 * Handles contract preview, data validation, missing field management, and approval workflow
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Edit3, 
  Save, 
  Send, 
  Shield,
  Eye,
  Download,
  Clock,
  User,
  MapPin,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContractData, GeneratedContract, MissingFieldInfo } from '@shared/contractSchema';
import { unifiedContractManager } from '@/services/unifiedContractManager';

interface UnifiedContractPreviewProps {
  contractData: Partial<ContractData>;
  generatedContract?: GeneratedContract;
  onDataUpdate: (data: ContractData) => void;
  onApprove: (contract: GeneratedContract) => void;
  onRegenerate: (data: ContractData) => void;
  isGenerating?: boolean;
}

export const UnifiedContractPreview: React.FC<UnifiedContractPreviewProps> = ({
  contractData,
  generatedContract,
  onDataUpdate,
  onApprove,
  onRegenerate,
  isGenerating = false
}) => {
  const { toast } = useToast();
  const [editingData, setEditingData] = useState<Partial<ContractData>>(contractData);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [missingFieldDetails, setMissingFieldDetails] = useState<MissingFieldInfo[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] }>({
    isValid: false,
    errors: [],
    warnings: []
  });
  const [activeTab, setActiveTab] = useState<'preview' | 'data' | 'validation'>('preview');

  // Update validation when data changes
  useEffect(() => {
    const missing = unifiedContractManager.detectMissingFields(editingData);
    const details = unifiedContractManager.getMissingFieldDetails(missing);
    const validation = unifiedContractManager.validateContractData(editingData);

    setMissingFields(missing);
    setMissingFieldDetails(details);
    setValidationResult(validation);

    // Auto-switch to data tab if there are missing required fields
    if (missing.length > 0 && !generatedContract) {
      setActiveTab('data');
    }
  }, [editingData, generatedContract]);

  // Handle field updates
  const updateField = (field: keyof ContractData, value: string) => {
    const updatedData = { ...editingData, [field]: value };
    setEditingData(updatedData);
  };

  // Auto-complete missing data
  const handleAutoComplete = async () => {
    try {
      toast({
        title: "Completando datos...",
        description: "Usando IA para completar información faltante"
      });

      const completedData = await unifiedContractManager.autoCompleteData(editingData);
      setEditingData(completedData);

      toast({
        title: "Datos completados",
        description: "Se han sugerido valores para campos faltantes"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron completar los datos automáticamente",
        variant: "destructive"
      });
    }
  };

  // Save changes and regenerate contract if needed
  const handleSaveChanges = () => {
    if (validationResult.isValid) {
      onDataUpdate(editingData as ContractData);
      setIsEditing(false);
      
      if (!generatedContract) {
        onRegenerate(editingData as ContractData);
      }

      toast({
        title: "Cambios guardados",
        description: "Los datos del contrato han sido actualizados"
      });
    } else {
      toast({
        title: "Datos incompletos",
        description: "Por favor complete los campos requeridos",
        variant: "destructive"
      });
    }
  };

  // Approve contract for signing
  const handleApprove = () => {
    if (generatedContract && validationResult.isValid) {
      const approvedContract: GeneratedContract = {
        ...generatedContract,
        status: 'approved',
        approvedAt: new Date().toISOString()
      };
      
      onApprove(approvedContract);
      
      toast({
        title: "Contrato aprobado",
        description: "El contrato está listo para envío y firma"
      });
    }
  };

  // Calculate completion percentage
  const getCompletionPercentage = (): number => {
    const totalFields = 10;
    const completedFields = Object.values(editingData).filter(value => 
      value && String(value).trim() !== ''
    ).length;
    return Math.round((completedFields / totalFields) * 100);
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Vista Previa del Contrato</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {generatedContract ? 'Contrato generado - Revisar y aprobar' : 'Completar datos para generar contrato'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={validationResult.isValid ? "default" : "secondary"}>
                {completionPercentage}% Completo
              </Badge>
              {generatedContract && (
                <Badge variant="outline">
                  <Shield className="h-3 w-3 mr-1" />
                  Contrato Defensivo
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <Progress value={completionPercentage} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Vista Previa</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center space-x-2">
            <Edit3 className="h-4 w-4" />
            <span>Datos</span>
            {missingFields.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {missingFields.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Validación</span>
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contrato Generado</CardTitle>
                <div className="space-x-2">
                  {generatedContract && validationResult.isValid && (
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar Contrato
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setActiveTab('data')}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar Datos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-muted-foreground">Generando contrato defensivo...</p>
                  </div>
                </div>
              ) : generatedContract ? (
                <div 
                  className="border rounded-lg p-6 bg-white max-h-96 "
                  dangerouslySetInnerHTML={{ __html: generatedContract.html }}
                />
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Complete los datos requeridos para generar el contrato.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Editing Tab */}
        <TabsContent value="data">
          <div className="space-y-4">
            {/* Missing fields alert */}
            {missingFields.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Faltan {missingFields.length} campos requeridos</span>
                    <Button size="sm" variant="outline" onClick={handleAutoComplete}>
                      Completar Automáticamente
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Información del Cliente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Nombre del Cliente *</Label>
                    <Input
                      id="clientName"
                      value={editingData.clientName || ''}
                      onChange={(e) => updateField('clientName', e.target.value)}
                      className={missingFields.includes('clientName') ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={editingData.clientPhone || ''}
                      onChange={(e) => updateField('clientPhone', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="clientAddress">Dirección del Cliente *</Label>
                    <Input
                      id="clientAddress"
                      value={editingData.clientAddress || ''}
                      onChange={(e) => updateField('clientAddress', e.target.value)}
                      className={missingFields.includes('clientAddress') ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={editingData.clientEmail || ''}
                      onChange={(e) => updateField('clientEmail', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Información del Proyecto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectType">Tipo de Proyecto *</Label>
                    <Input
                      id="projectType"
                      value={editingData.projectType || ''}
                      onChange={(e) => updateField('projectType', e.target.value)}
                      className={missingFields.includes('projectType') ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectLocation">Ubicación *</Label>
                    <Input
                      id="projectLocation"
                      value={editingData.projectLocation || ''}
                      onChange={(e) => updateField('projectLocation', e.target.value)}
                      className={missingFields.includes('projectLocation') ? 'border-red-500' : ''}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="projectDescription">Descripción del Proyecto *</Label>
                    <Textarea
                      id="projectDescription"
                      value={editingData.projectDescription || ''}
                      onChange={(e) => updateField('projectDescription', e.target.value)}
                      className={missingFields.includes('projectDescription') ? 'border-red-500' : ''}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Información Financiera</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalAmount">Monto Total *</Label>
                    <Input
                      id="totalAmount"
                      value={editingData.totalAmount || ''}
                      onChange={(e) => updateField('totalAmount', e.target.value)}
                      className={missingFields.includes('totalAmount') ? 'border-red-500' : ''}
                      placeholder="$0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="depositAmount">Depósito</Label>
                    <Input
                      id="depositAmount"
                      value={editingData.depositAmount || ''}
                      onChange={(e) => updateField('depositAmount', e.target.value)}
                      placeholder="$0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="paymentTerms">Términos de Pago</Label>
                    <Textarea
                      id="paymentTerms"
                      value={editingData.paymentTerms || ''}
                      onChange={(e) => updateField('paymentTerms', e.target.value)}
                      placeholder="50% al inicio, 50% al completar el trabajo"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setActiveTab('validation')}>
                Validar Datos
              </Button>
              <Button onClick={handleSaveChanges} disabled={!validationResult.isValid}>
                <Save className="h-4 w-4 mr-2" />
                Guardar y Generar
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Validación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Validation status */}
              <div className="flex items-center space-x-3">
                {validationResult.isValid ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className="font-medium">
                    {validationResult.isValid ? 'Datos válidos' : 'Datos incompletos'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {validationResult.isValid 
                      ? 'Todos los campos requeridos están completos'
                      : 'Se requieren datos adicionales para generar el contrato'
                    }
                  </p>
                </div>
              </div>

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Errores encontrados:</p>
                      {validationResult.errors.map((error, index) => (
                        <p key={index} className="text-sm">• {error}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Advertencias:</p>
                      {validationResult.warnings.map((warning, index) => (
                        <p key={index} className="text-sm">• {warning}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Missing fields details */}
              {missingFieldDetails.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Campos Faltantes:</h4>
                  {missingFieldDetails.map((field, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{field.displayName}</p>
                          <p className="text-sm text-muted-foreground">{field.reason}</p>
                        </div>
                        <Badge variant={field.required ? "destructive" : "secondary"}>
                          {field.required ? 'Requerido' : 'Opcional'}
                        </Badge>
                      </div>
                      {field.suggestedValue && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => updateField(field.field as keyof ContractData, field.suggestedValue!)}
                        >
                          Usar: {field.suggestedValue}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Contract protections if generated */}
              {generatedContract?.riskAnalysis && (
                <div className="space-y-3">
                  <h4 className="font-medium">Análisis de Protección Legal:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Nivel de Riesgo:</p>
                      <Badge variant={
                        generatedContract.riskAnalysis.riskLevel === 'crítico' ? 'destructive' :
                        generatedContract.riskAnalysis.riskLevel === 'alto' ? 'destructive' :
                        generatedContract.riskAnalysis.riskLevel === 'medio' ? 'default' : 'secondary'
                      }>
                        {generatedContract.riskAnalysis.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Protecciones Aplicadas:</p>
                      <p className="text-sm text-muted-foreground">
                        {generatedContract.protections.length} cláusulas protectoras
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedContractPreview;