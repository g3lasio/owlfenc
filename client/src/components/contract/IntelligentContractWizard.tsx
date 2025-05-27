// client/src/components/contract/IntelligentContractWizard.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Lightbulb,
  Sparkles,
  Shield,
  FileText,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useProfile } from "@/hooks/use-profile";
import { 
  ContractTemplate, 
  SmartField, 
  selectOptimalTemplate, 
  generateSmartFields, 
  validateContractData,
  suggestFieldValues 
} from "@/services/intelligentContractService";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  fields: SmartField[];
  category: 'basic' | 'project' | 'legal' | 'financial' | 'completion';
  estimatedTime: number; // minutos
}

interface IntelligentContractWizardProps {
  onComplete: (data: Record<string, any>) => void;
  onPreview: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

const IntelligentContractWizard: React.FC<IntelligentContractWizardProps> = ({
  onComplete,
  onPreview,
  initialData = {}
}) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  
  // Estados principales
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([]);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }>({ isValid: true, errors: [], warnings: [], suggestions: [] });

  // Estados de UX
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Efecto para inicializar el wizard
  useEffect(() => {
    initializeWizard();
  }, []);

  // Auto-guardar cada 30 segundos
  useEffect(() => {
    if (autoSaveEnabled && Object.keys(formData).length > 0) {
      const timer = setTimeout(() => {
        localStorage.setItem('contract_draft', JSON.stringify(formData));
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [formData, autoSaveEnabled]);

  const initializeWizard = () => {
    // Determinar tipo de proyecto inicial
    const projectType = formData.project?.type || 'general';
    const projectComplexity = formData.project?.complexity || 'intermediate';
    const state = formData.client?.state || formData.legal?.governingState || 'California';

    // Seleccionar plantilla óptima
    const template = selectOptimalTemplate(projectType, projectComplexity, state);
    setSelectedTemplate(template);

    // Generar campos inteligentes
    const smartFields = generateSmartFields(template, formData);
    
    // Organizar en pasos lógicos
    const steps = createIntelligentSteps(smartFields, template);
    setWizardSteps(steps);

    toast({
      title: "🎯 Asistente Inteligente Activado",
      description: `Plantilla optimizada: ${template.name}. Te guiaré paso a paso.`,
    });
  };

  const createIntelligentSteps = (fields: SmartField[], template: ContractTemplate): WizardStep[] => {
    const steps: WizardStep[] = [
      {
        id: 'project-overview',
        title: 'Información del Proyecto',
        description: 'Detalles básicos para optimizar tu contrato',
        category: 'basic',
        estimatedTime: 3,
        fields: fields.filter(f => f.field.includes('project.type') || f.field.includes('project.scope'))
      },
      {
        id: 'client-details',
        title: 'Información del Cliente',
        description: 'Datos del cliente y ubicación del trabajo',
        category: 'basic',
        estimatedTime: 2,
        fields: fields.filter(f => f.field.startsWith('client.'))
      },
      {
        id: 'financial-terms',
        title: 'Términos Financieros',
        description: 'Precio, pagos y condiciones económicas',
        category: 'financial',
        estimatedTime: 4,
        fields: fields.filter(f => f.field.startsWith('payment.'))
      }
    ];

    // Agregar pasos adicionales según la complejidad de la plantilla
    if (template.legalComplexity === 'advanced') {
      steps.push({
        id: 'legal-protections',
        title: 'Protecciones Legales',
        description: 'Seguros, bonos y cláusulas de protección',
        category: 'legal',
        estimatedTime: 5,
        fields: fields.filter(f => f.field.startsWith('insurance.') || f.field.startsWith('legal.'))
      });
    }

    steps.push({
      id: 'final-review',
      title: 'Revisión Final',
      description: 'Verificar y completar el contrato',
      category: 'completion',
      estimatedTime: 2,
      fields: fields.filter(f => f.field.startsWith('signatures.') || f.field.includes('notes'))
    });

    return steps;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    const field = getCurrentStepFields().find(f => f.id === fieldId);
    if (!field) return;

    const newData = { ...formData };
    
    // Actualizar valor usando la estructura de campo jerárquica
    const fieldPath = field.field.split('.');
    let current = newData;
    
    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!current[fieldPath[i]]) {
        current[fieldPath[i]] = {};
      }
      current = current[fieldPath[i]];
    }
    
    current[fieldPath[fieldPath.length - 1]] = value;
    setFormData(newData);

    // Validación en tiempo real para campos críticos
    if (field.legalImportance === 'critical') {
      validateCurrentStep();
    }

    // Auto-sugerencias contextuales
    if (field.autoFill) {
      provideSuggestions(fieldId, value);
    }
  };

  const validateCurrentStep = () => {
    if (!selectedTemplate) return;
    
    const result = validateContractData(formData, selectedTemplate);
    setValidation(result);
    
    // Mostrar alertas según el resultado
    if (result.errors.length > 0) {
      toast({
        title: "⚠️ Campos Requeridos",
        description: `${result.errors.length} campo(s) necesitan atención`,
        variant: "destructive"
      });
    }
  };

  const provideSuggestions = (fieldId: string, currentValue: any) => {
    const suggestions = suggestFieldValues(fieldId, formData, profile);
    
    if (suggestions.length > 0) {
      toast({
        title: "💡 Sugerencias Disponibles",
        description: "Haz clic en el campo para ver opciones inteligentes",
      });
    }
  };

  const handleNext = () => {
    validateCurrentStep();
    
    if (validation.errors.length === 0) {
      if (currentStep < wizardSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePreview = () => {
    onPreview(formData);
  };

  const handleComplete = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      onComplete(formData);
      localStorage.removeItem('contract_draft');
      setIsLoading(false);
      
      toast({
        title: "🎉 ¡Contrato Generado!",
        description: "Tu contrato está listo para revisión y firma",
      });
    }, 1000);
  };

  const getCurrentStepFields = (): SmartField[] => {
    return wizardSteps[currentStep]?.fields || [];
  };

  const calculateProgress = (): number => {
    if (wizardSteps.length === 0) return 0;
    return ((currentStep + 1) / wizardSteps.length) * 100;
  };

  const getEstimatedTimeRemaining = (): number => {
    return wizardSteps.slice(currentStep + 1).reduce((total, step) => total + step.estimatedTime, 0);
  };

  if (wizardSteps.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Preparando tu asistente inteligente...</p>
        </div>
      </div>
    );
  }

  const currentStepData = wizardSteps[currentStep];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header con progreso */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Generador Inteligente de Contratos</h2>
            <p className="text-muted-foreground">
              Paso {currentStep + 1} de {wizardSteps.length} • 
              <Clock className="inline-block w-4 h-4 ml-2 mr-1" />
              {getEstimatedTimeRemaining()} min restantes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectedTemplate && (
              <Badge variant="outline" className="bg-green-50">
                <Shield className="w-4 h-4 mr-1" />
                {selectedTemplate.name}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-1" />
              Vista Previa
            </Button>
          </div>
        </div>
        
        <Progress value={calculateProgress()} className="h-2" />
      </div>

      {/* Alertas de validación */}
      {validation.errors.length > 0 && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Campos requeridos:</strong>
            <ul className="mt-1 ml-4 list-disc">
              {validation.errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.suggestions.length > 0 && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <strong>Sugerencias:</strong>
            <ul className="mt-1 ml-4 list-disc">
              {validation.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm">{suggestion}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Contenido del paso actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className={`p-2 rounded-full mr-3 ${
              currentStepData.category === 'basic' ? 'bg-blue-100 text-blue-600' :
              currentStepData.category === 'financial' ? 'bg-green-100 text-green-600' :
              currentStepData.category === 'legal' ? 'bg-purple-100 text-purple-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {currentStepData.category === 'basic' && <FileText className="w-5 h-5" />}
              {currentStepData.category === 'financial' && <DollarSign className="w-5 h-5" />}
              {currentStepData.category === 'legal' && <Shield className="w-5 h-5" />}
              {currentStepData.category === 'completion' && <CheckCircle className="w-5 h-5" />}
            </div>
            {currentStepData.title}
          </CardTitle>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {getCurrentStepFields().map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="flex items-center">
                {field.prompt}
                {field.required && <span className="text-red-500 ml-1">*</span>}
                {field.legalImportance === 'critical' && (
                  <Badge variant="outline" size="sm" className="ml-2 text-xs bg-red-50">
                    Crítico
                  </Badge>
                )}
              </Label>
              
              {field.type === 'text' && (
                <Input
                  id={field.id}
                  value={getFieldValue(field.field) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={`Ingresa ${field.prompt.toLowerCase()}`}
                  className={validation.errors.some(e => e.includes(field.prompt)) ? 'border-red-300' : ''}
                />
              )}
              
              {field.type === 'multiline' && (
                <Textarea
                  id={field.id}
                  value={getFieldValue(field.field) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={`Describe ${field.prompt.toLowerCase()}`}
                  rows={3}
                  className={validation.errors.some(e => e.includes(field.prompt)) ? 'border-red-300' : ''}
                />
              )}
              
              {field.type === 'choice' && field.options && (
                <Select value={getFieldValue(field.field) || ''} onValueChange={(value) => handleFieldChange(field.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {field.type === 'address' && (
                <AddressAutocomplete
                  value={getFieldValue(field.field) || ''}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  placeholder="Ingresa la dirección completa"
                />
              )}
              
              {field.validation?.pattern && (
                <p className="text-xs text-muted-foreground">
                  Formato requerido: {field.validation.pattern}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navegación */}
      <div className="flex justify-between mt-6">
        <Button 
          variant="outline" 
          onClick={handlePrevious} 
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handlePreview}>
            Vista Previa
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={isLoading || validation.errors.length > 0}
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 mr-1 animate-spin" />
                Generando...
              </>
            ) : currentStep === wizardSteps.length - 1 ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Generar Contrato
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  function getFieldValue(fieldPath: string): any {
    const parts = fieldPath.split('.');
    let current = formData;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
};

export default IntelligentContractWizard;