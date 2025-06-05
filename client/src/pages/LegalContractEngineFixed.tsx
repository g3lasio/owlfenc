import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  FileUp, 
  Shield, 
  Zap, 
  CheckCircle, 
  FileText, 
  Upload, 
  Brain,
  Scale,
  Download,
  Eye,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus
} from 'lucide-react';

export default function LegalContractEngineFixed() {
  const { toast } = useToast();
  
  // Estados de navegación por pasos
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreateMode, setIsCreateMode] = useState(false);
  
  // Estados del flujo existente
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [contractStrength, setContractStrength] = useState<number>(0);
  const [legalAdvice, setLegalAdvice] = useState<string[]>([]);
  const [protectionsApplied, setProtectionsApplied] = useState<string[]>([]);

  // Pasos del workflow horizontal
  const STEPS = [
    {
      id: 0,
      title: "Extraer Datos",
      description: "Subir y procesar PDF del estimado",
      icon: Upload,
      color: "blue"
    },
    {
      id: 1,
      title: "Análisis Legal",
      description: "Evaluar riesgos y protecciones",
      icon: Scale,
      color: "green"
    },
    {
      id: 2,
      title: "Generar Contrato",
      description: "Crear contrato blindado",
      icon: Shield,
      color: "purple"
    },
    {
      id: 3,
      title: "Vista Previa",
      description: "Revisar y descargar",
      icon: Eye,
      color: "orange"
    }
  ];

  // Funciones de navegación
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return extractedData !== null;
      case 1: return riskAnalysis !== null;
      case 2: return generatedContract !== "";
      case 3: return true;
      default: return false;
    }
  };

  // Funciones del flujo existente
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      toast({
        title: "📄 PDF Seleccionado",
        description: `Archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    } else {
      toast({
        title: "❌ Archivo inválido",
        description: "Por favor selecciona un archivo PDF válido",
        variant: "destructive"
      });
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData = {
        clientName: "Juan Pérez",
        projectType: "Cerca Residencial",
        totalAmount: "$5,500.00",
        address: "123 Main St, Austin, TX"
      };
      
      setExtractedData(mockData);
      toast({
        title: "✅ Datos extraídos correctamente",
        description: "La información del PDF ha sido procesada",
      });
      
      nextStep();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const performRiskAnalysis = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockRisk = {
        riskLevel: "medio",
        factors: [
          "Proyecto residencial estándar",
          "Cliente con historial positivo",
          "Monto dentro del rango normal"
        ],
        recommendations: [
          "Incluir cláusula de cambios de alcance",
          "Definir claramente tiempos de entrega",
          "Establecer términos de pago específicos"
        ]
      };
      
      setRiskAnalysis(mockRisk);
      setLegalAdvice(mockRisk.recommendations);
      
      toast({
        title: "✅ Análisis de riesgo completado",
        description: "Se han identificado las protecciones necesarias",
      });
      
      nextStep();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar el análisis de riesgo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateContract = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockContract = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1 style="text-align: center; color: #2563eb;">CONTRATO DE SERVICIOS DE CERCADO</h1>
          <h2>DATOS DEL CLIENTE</h2>
          <p><strong>Nombre:</strong> ${extractedData?.clientName}</p>
          <p><strong>Dirección:</strong> ${extractedData?.address}</p>
          <h2>DESCRIPCIÓN DEL PROYECTO</h2>
          <p><strong>Tipo:</strong> ${extractedData?.projectType}</p>
          <p><strong>Monto Total:</strong> ${extractedData?.totalAmount}</p>
          <h2>TÉRMINOS Y CONDICIONES</h2>
          <ul>
            ${legalAdvice.map(advice => `<li>${advice}</li>`).join('')}
          </ul>
          <h2>PROTECCIONES LEGALES</h2>
          <p>Este contrato incluye cláusulas de protección específicas para proyectos de cercado residencial.</p>
        </div>
      `;
      
      setGeneratedContract(mockContract);
      setContractStrength(85);
      setProtectionsApplied([
        "Cláusula de fuerza mayor",
        "Términos de pago protegidos",
        "Garantía de materiales",
        "Resolución de disputas"
      ]);
      
      toast({
        title: "✅ Contrato generado exitosamente",
        description: "Tu contrato blindado está listo",
      });
      
      nextStep();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el contrato",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadContract = () => {
    const blob = new Blob([generatedContract], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-blindado-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "📄 Contrato descargado",
      description: "El archivo ha sido guardado en tu dispositivo",
    });
  };

  const handleCreateNew = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setRiskAnalysis(null);
    setGeneratedContract('');
    setContractStrength(0);
    setLegalAdvice([]);
    setProtectionsApplied([]);
    setCurrentStep(0);
    setIsCreateMode(true);
  };

  const handleBackToDashboard = () => {
    setIsCreateMode(false);
    setCurrentStep(0);
  };

  const getStepColor = (stepIndex: number) => {
    if (stepIndex < currentStep) return "bg-green-500 text-white border-green-500";
    if (stepIndex === currentStep) return "bg-blue-500 text-white border-blue-500";
    return "bg-gray-100 text-gray-400 border-gray-200";
  };

  const getProgressPercentage = () => {
    return ((currentStep) / (STEPS.length - 1)) * 100;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Extraer Datos
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Extraer Datos del PDF</h3>
              <p className="text-muted-foreground">
                Sube el PDF de tu estimado para extraer automáticamente la información del proyecto
              </p>
            </div>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FileUp className="h-12 w-12 text-gray-400 mb-4" />
                  <span className="text-lg font-medium">Haz clic para subir PDF</span>
                  <span className="text-sm text-gray-500 mt-1">O arrastra y suelta aquí</span>
                </label>
              </div>
            ) : (
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="h-10 w-10 text-blue-500" />
                    <div>
                      <p className="font-semibold">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <Brain className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Extraer Datos
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 1: // Análisis Legal
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Scale className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Análisis Legal de Riesgos</h3>
              <p className="text-muted-foreground">
                Evaluando riesgos específicos y generando recomendaciones de protección
              </p>
            </div>
            
            {extractedData && (
              <div className="bg-green-50 p-6 rounded-lg">
                <h4 className="font-semibold mb-4">Datos Extraídos:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Cliente:</span>
                    <p className="font-medium">{extractedData.clientName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Proyecto:</span>
                    <p className="font-medium">{extractedData.projectType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Monto:</span>
                    <p className="font-medium">{extractedData.totalAmount}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Dirección:</span>
                    <p className="font-medium">{extractedData.address}</p>
                  </div>
                </div>
              </div>
            )}
            
            {!riskAnalysis ? (
              <div className="text-center">
                <Button
                  onClick={performRiskAnalysis}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-spin" />
                      Analizando Riesgos...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Iniciar Análisis Legal
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 p-6 rounded-lg">
                <h4 className="font-semibold mb-4">Análisis Completado:</h4>
                <div className="space-y-3">
                  <div>
                    <Badge className={`${riskAnalysis.riskLevel === 'bajo' ? 'bg-green-500' : riskAnalysis.riskLevel === 'medio' ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                      Riesgo {riskAnalysis.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Recomendaciones:</h5>
                    <ul className="space-y-1">
                      {riskAnalysis.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Generar Contrato
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Generar Contrato Blindado</h3>
              <p className="text-muted-foreground">
                Creando contrato profesional con máxima protección legal
              </p>
            </div>
            
            {!generatedContract ? (
              <div className="text-center">
                <div className="bg-purple-50 p-6 rounded-lg mb-4">
                  <p className="text-purple-800 mb-4">
                    Listo para generar tu contrato blindado con todas las protecciones legales.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-purple-600">Protecciones:</span>
                      <p>{legalAdvice.length} cláusulas de seguridad</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Nivel de Riesgo:</span>
                      <p>{riskAnalysis?.riskLevel || 'Evaluado'}</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={generateContract}
                  disabled={isProcessing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-spin" />
                      Generando Contrato...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Generar Contrato Blindado
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold">Contrato Generado Exitosamente</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-white rounded">
                    <div className="text-2xl font-bold text-green-600">{contractStrength}/100</div>
                    <div className="text-sm text-gray-600">Fortaleza Legal</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded">
                    <div className="text-2xl font-bold text-blue-600">{protectionsApplied.length}</div>
                    <div className="text-sm text-gray-600">Protecciones</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded">
                    <div className="text-2xl font-bold text-purple-600">100%</div>
                    <div className="text-sm text-gray-600">Completado</div>
                  </div>
                </div>
                <Button onClick={nextStep} className="w-full bg-green-600 hover:bg-green-700">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Vista Previa del Contrato
                </Button>
              </div>
            )}
          </div>
        );

      case 3: // Vista Previa
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Eye className="h-16 w-16 mx-auto text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Vista Previa del Contrato</h3>
              <p className="text-muted-foreground">
                Revisa tu contrato blindado y descárgalo cuando esté listo
              </p>
            </div>
            
            {generatedContract && (
              <div className="space-y-4">
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={downloadContract}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Contrato
                  </Button>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Contrato Blindado - Vista Previa</span>
                      <Badge className="bg-green-100 text-green-800">
                        Listo para Usar
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: generatedContract }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isCreateMode) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
            <Scale className="h-10 w-10 text-green-600" />
            <Brain className="h-11 w-11 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-green-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🛡️ Generador de Contratos Legales
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Convierte tus estimados en contratos blindados con protección legal máxima
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="h-4 w-4" />
            <span>Protección Legal Nivel Profesional</span>
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        {/* Botón principal */}
        <div className="text-center">
          <Button
            onClick={handleCreateNew}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear Nuevo Contrato
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header con navegación */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Generador de Contratos</h1>
          <div className="w-20"></div>
        </div>

        {/* Indicador de pasos horizontal */}
        <div className="relative mb-8">
          {/* Barra de progreso */}
          <div className="absolute top-6 left-0 w-full h-1 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          
          {/* Círculos de pasos */}
          <div className="relative flex justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 bg-white
                      ${getStepColor(index)}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`font-medium text-sm ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 max-w-24">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido del paso actual */}
      <Card className="mb-8">
        <CardContent className="p-8">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Botones de navegación */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </Button>
        
        <Button
          onClick={nextStep}
          disabled={currentStep === STEPS.length - 1 || !canProceedToNext()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}