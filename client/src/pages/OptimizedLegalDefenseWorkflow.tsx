
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  FileUpload,
  Shield, 
  Scale, 
  Brain,
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  PenTool,
  Users,
  Clock,
  Eye,
  Zap,
  Award
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  estimatedTime?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number;
}

interface ContractAnalysis {
  riskLevel: 'bajo' | 'medio' | 'alto' | 'crítico';
  riskScore: number;
  protectionsApplied: string[];
  legalAdvice: string[];
  contractStrength: number;
  complianceScore: number;
  stateCompliance: boolean;
}

export default function OptimizedLegalDefenseWorkflow() {
  const { toast } = useToast();
  
  // Estados principales del workflow
  const [currentPhase, setCurrentPhase] = useState<'upload' | 'validation' | 'analysis' | 'generation' | 'review' | 'signature' | 'completed'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [contractAnalysis, setContractAnalysis] = useState<ContractAnalysis | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Definir pasos del workflow
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'upload',
      title: 'Carga de Estimado PDF',
      description: 'Análisis inteligente del documento y extracción de datos',
      status: selectedFile ? 'completed' : 'pending',
      progress: selectedFile ? 100 : 0,
      estimatedTime: '30 segundos'
    },
    {
      id: 'validation',
      title: 'Validación Legal Inteligente',
      description: 'Verificación de completitud y compliance por estado',
      status: validationResult ? 'completed' : 'pending',
      progress: validationResult ? 100 : 0,
      estimatedTime: '45 segundos'
    },
    {
      id: 'analysis',
      title: 'Análisis de Riesgo Veterano',
      description: 'Evaluación defensiva y protecciones específicas por industria',
      status: contractAnalysis ? 'completed' : 'pending',
      progress: contractAnalysis ? 100 : 0,
      estimatedTime: '60 segundos'
    },
    {
      id: 'generation',
      title: 'Generación de Contrato Blindado',
      description: 'Creación de contrato con máxima protección legal',
      status: generatedContract ? 'completed' : 'pending',
      progress: generatedContract ? 100 : 0,
      estimatedTime: '90 segundos'
    },
    {
      id: 'review',
      title: 'Revisión y Personalización',
      description: 'Ajustes finales y validación de términos',
      status: 'pending',
      progress: 0,
      estimatedTime: '5 minutos'
    },
    {
      id: 'signature',
      title: 'Proceso de Firma Digital',
      description: 'Firma electrónica legal por ambas partes',
      status: 'pending',
      progress: 0,
      estimatedTime: '2 minutos'
    }
  ];

  // Función 1: Manejo inteligente de archivos
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "❌ Archivo Inválido",
        description: "Solo se aceptan archivos PDF",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "❌ Archivo Muy Grande",
        description: "El archivo debe ser menor a 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setCurrentPhase('validation');
    
    toast({
      title: "📄 PDF Cargado Exitosamente",
      description: `${file.name} - Iniciando análisis inteligente...`,
    });

    // Iniciar proceso automático
    await startIntelligentProcessing(file);
  }, []);

  // Función 2: Procesamiento inteligente completo
  const startIntelligentProcessing = async (file: File) => {
    setIsProcessing(true);

    try {
      // Paso 1: Extracción y validación
      setCurrentStep(1);
      const extractionResult = await extractAndValidateData(file);
      setExtractedData(extractionResult.data);
      setValidationResult(extractionResult.validation);

      if (!extractionResult.validation.isValid) {
        toast({
          title: "⚠️ Datos Incompletos Detectados",
          description: `${extractionResult.validation.errors.length} errores encontrados. Revisión requerida.`,
          variant: "destructive"
        });
        setCurrentPhase('validation');
        return;
      }

      // Paso 2: Análisis de riesgo legal
      setCurrentStep(2);
      setCurrentPhase('analysis');
      const analysisResult = await performLegalRiskAnalysis(extractionResult.data);
      setContractAnalysis(analysisResult);

      // Paso 3: Generación del contrato
      setCurrentStep(3);
      setCurrentPhase('generation');
      const contractResult = await generateDefensiveContract(extractionResult.data, analysisResult);
      setGeneratedContract(contractResult);

      setCurrentPhase('review');
      toast({
        title: "🎉 Contrato Blindado Generado",
        description: `Fortaleza legal: ${analysisResult.contractStrength}/100 - ${analysisResult.protectionsApplied.length} protecciones aplicadas`,
      });

    } catch (error) {
      console.error('Error en procesamiento:', error);
      toast({
        title: "❌ Error en Procesamiento",
        description: "Fallo en la generación. Intentando método de respaldo...",
        variant: "destructive"
      });
      
      // Activar fallback robusto
      await handleProcessingFallback(file);
    } finally {
      setIsProcessing(false);
    }
  };

  // Función 3: Extracción y validación robusta
  const extractAndValidateData = async (file: File): Promise<{
    data: any;
    validation: ValidationResult;
  }> => {
    const formData = new FormData();
    formData.append('estimatePdf', file);

    const response = await fetch('/api/pdf-contract-processor/extract-and-validate', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      data: result.extractedData,
      validation: {
        isValid: result.validation.isValid,
        errors: result.validation.errors || [],
        warnings: result.validation.warnings || [],
        completeness: result.validation.completeness || 0
      }
    };
  };

  // Función 4: Análisis legal avanzado
  const performLegalRiskAnalysis = async (projectData: any): Promise<ContractAnalysis> => {
    const response = await fetch('/api/legal-defense/advanced-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectData,
        includeStateCompliance: true,
        industrySpecificAnalysis: true,
        veteranProtections: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en análisis legal: ${response.status}`);
    }

    return await response.json();
  };

  // Función 5: Generación de contrato defensivo
  const generateDefensiveContract = async (projectData: any, analysis: ContractAnalysis): Promise<string> => {
    const response = await fetch('/api/pdf-contract-processor/pdf-to-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectData,
        riskAnalysis: analysis,
        enhancementLevel: 'maximum_protection',
        includeVeteranClauses: true,
        stateCompliance: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generando contrato: ${response.status}`);
    }

    const result = await response.json();
    return result.data.contractHtml;
  };

  // Función 6: Sistema de respaldo robusto
  const handleProcessingFallback = async (file: File) => {
    toast({
      title: "🔄 Activando Sistema de Respaldo",
      description: "Generando contrato con protecciones básicas...",
    });

    try {
      // Usar método simplificado del backend
      const formData = new FormData();
      formData.append('estimatePdf', file);

      const response = await fetch('/api/pdf-contract-processor/pdf-to-contract-simple', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedContract(result.data.contractHtml);
        setCurrentPhase('review');
        
        toast({
          title: "✅ Contrato Generado (Modo Respaldo)",
          description: "Contrato con protecciones básicas generado exitosamente",
        });
      }
    } catch (fallbackError) {
      console.error('Error en fallback:', fallbackError);
      toast({
        title: "❌ Error Crítico",
        description: "No se pudo generar el contrato. Contacta soporte técnico.",
        variant: "destructive"
      });
    }
  };

  // Función 7: Descarga de contrato
  const downloadContract = () => {
    if (!generatedContract || !extractedData) return;

    const blob = new Blob([generatedContract], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-blindado-${extractedData.clientName?.replace(/\s+/g, '-') || 'cliente'}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "📥 Contrato Descargado",
      description: "Archivo guardado exitosamente",
    });
  };

  // Función 8: Iniciar proceso de firma
  const initiateSignatureProcess = () => {
    setCurrentPhase('signature');
    toast({
      title: "🔐 Iniciando Firma Digital",
      description: "Preparando proceso de firma electrónica legal...",
    });
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'upload': return <FileUpload className="h-5 w-5" />;
      case 'validation': return <CheckCircle className="h-5 w-5" />;
      case 'analysis': return <Brain className="h-5 w-5" />;
      case 'generation': return <Shield className="h-5 w-5" />;
      case 'review': return <Eye className="h-5 w-5" />;
      case 'signature': return <PenTool className="h-5 w-5" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'upload': return 'text-blue-600';
      case 'validation': return 'text-yellow-600';
      case 'analysis': return 'text-purple-600';
      case 'generation': return 'text-green-600';
      case 'review': return 'text-orange-600';
      case 'signature': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header del Sistema */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="h-12 w-12 text-blue-600" />
          <Scale className="h-10 w-10 text-green-600" />
          <Brain className="h-11 w-11 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-green-600 to-purple-600 bg-clip-text text-transparent mb-4">
          🛡️ Legal Defense Engine - Workflow Optimizado
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Proceso Completo: PDF → Análisis → Contrato Blindado → Firma Digital
        </p>
      </div>

      {/* Indicador de Progreso Global */}
      <Card className="mb-6 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-gold-500" />
            Progreso del Workflow Legal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    step.status === 'completed' ? 'bg-green-100 text-green-600' :
                    step.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                    step.status === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getPhaseIcon(step.id)}
                  </div>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    step.status === 'completed' ? 'default' :
                    step.status === 'processing' ? 'secondary' :
                    step.status === 'error' ? 'destructive' :
                    'outline'
                  }>
                    {step.status === 'completed' ? 'Completado' :
                     step.status === 'processing' ? 'Procesando' :
                     step.status === 'error' ? 'Error' :
                     'Pendiente'}
                  </Badge>
                  {step.estimatedTime && step.status === 'pending' && (
                    <span className="text-xs text-gray-500">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {step.estimatedTime}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Área Principal de Trabajo */}
      {currentPhase === 'upload' && (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUpload className="h-6 w-6 text-blue-600" />
              Carga Inteligente de Estimado PDF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload-optimized"
                disabled={isProcessing}
              />
              <label htmlFor="pdf-upload-optimized" className="cursor-pointer">
                <FileUpload className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Arrastra tu PDF de estimado aquí o haz clic para seleccionar
                </h3>
                <p className="text-gray-500">
                  Sistema inteligente de extracción • Validación automática • Compliance legal
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de Validación */}
      {currentPhase === 'validation' && validationResult && (
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-yellow-600" />
              Validación Legal Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Completitud de Datos:</span>
                <div className="flex items-center gap-2">
                  <Progress value={validationResult.completeness} className="w-32" />
                  <span className="text-sm font-semibold">{validationResult.completeness}%</span>
                </div>
              </div>
              
              {validationResult.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Errores detectados:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {validationResult.warnings.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>Advertencias:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de Análisis */}
      {currentPhase === 'analysis' && contractAnalysis && (
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Análisis de Riesgo Legal Veterano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{contractAnalysis.contractStrength}/100</div>
                <div className="text-sm text-gray-600">Fortaleza Legal</div>
              </div>
              <div className="text-center">
                <Badge className={`text-white ${
                  contractAnalysis.riskLevel === 'bajo' ? 'bg-green-500' :
                  contractAnalysis.riskLevel === 'medio' ? 'bg-yellow-500' :
                  contractAnalysis.riskLevel === 'alto' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}>
                  {contractAnalysis.riskLevel.toUpperCase()}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">Nivel de Riesgo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{contractAnalysis.protectionsApplied.length}</div>
                <div className="text-sm text-gray-600">Protecciones</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de Generación/Review */}
      {(currentPhase === 'generation' || currentPhase === 'review') && generatedContract && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-600" />
                Contrato Blindado Generado
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => document.getElementById('contract-preview')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Revisar
                </Button>
                <Button
                  onClick={downloadContract}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                <Button
                  onClick={initiateSignatureProcess}
                  className="bg-gradient-to-r from-blue-600 to-green-600"
                  size="sm"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Iniciar Firma
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              id="contract-preview"
              className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: generatedContract }}
            />
          </CardContent>
        </Card>
      )}

      {/* Área de Firma Digital */}
      {currentPhase === 'signature' && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-6 w-6 text-red-600" />
              Proceso de Firma Digital Legal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Firma Electrónica Legal</h3>
              <p className="text-gray-600 mb-4">
                El contrato está listo para ser firmado por ambas partes con validez legal completa
              </p>
              <div className="space-y-4">
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  <PenTool className="h-4 w-4 mr-2" />
                  Firmar como Contratista
                </Button>
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Enviar al Cliente para Firma
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicador de Procesamiento */}
      {isProcessing && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="text-center">
              <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
              <p className="font-semibold">Abogado Digital Trabajando...</p>
              <p className="text-sm text-gray-600">
                Paso {currentStep} de {workflowSteps.length} - Procesando con máxima protección legal
              </p>
              <Progress value={(currentStep / workflowSteps.length) * 100} className="mt-4" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
