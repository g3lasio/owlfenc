import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload,
  Shield, 
  Eye,
  Lock,
  Database,
  CheckCircle,
  AlertTriangle,
  Download,
  PenTool,
  Users,
  Clock,
  Zap,
  Play,
  ArrowRight
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  icon: React.ReactNode;
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

export default function CyberpunkLegalDefense() {
  const { toast } = useToast();
  
  // Estados principales del workflow
  const [currentPhase, setCurrentPhase] = useState<'data-command' | 'arsenal-builder' | 'defense-review' | 'digital-execution' | 'completed'>('data-command');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [contractAnalysis, setContractAnalysis] = useState<ContractAnalysis | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Definir pasos del workflow cyberpunk
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'data-command',
      step: 1,
      title: 'Project Data Command',
      description: 'Seize control from the start. Instantly extract all key project data—select from your portfolio or upload an approved estimate. No detail escapes.',
      status: selectedFile ? 'completed' : (currentStep === 1 ? 'processing' : 'pending'),
      progress: selectedFile ? 100 : (currentStep === 1 ? 50 : 0),
      icon: <Database className="h-6 w-6" />,
      estimatedTime: '30 sec'
    },
    {
      id: 'arsenal-builder',
      step: 2,
      title: 'Contract Arsenal Builder',
      description: 'Harness AI-driven legal intelligence. Instantly receive a customized contract proposal, with all critical clauses and shields selected for your project\'s location, type, and risk profile.',
      status: contractAnalysis ? 'completed' : (currentStep === 2 ? 'processing' : 'pending'),
      progress: contractAnalysis ? 100 : (currentStep === 2 ? 50 : 0),
      icon: <Shield className="h-6 w-6" />,
      estimatedTime: '45 sec'
    },
    {
      id: 'defense-review',
      step: 3,
      title: 'Defense Review & Correction',
      description: 'Preview, correct, and strengthen. Every term, clause, and client detail is surfaced for your review—so you stay in command before anything is signed.',
      status: generatedContract ? 'completed' : (currentStep === 3 ? 'processing' : 'pending'),
      progress: generatedContract ? 100 : (currentStep === 3 ? 50 : 0),
      icon: <Eye className="h-6 w-6" />,
      estimatedTime: '2 min'
    },
    {
      id: 'digital-execution',
      step: 4,
      title: 'Digital Execution & Vault',
      description: 'E-sign securely. Both parties sign; final contracts are auto-delivered as certified PDFs and stored in your digital vault—irrefutable, retrievable, and always protected.',
      status: currentStep === 4 ? 'processing' : 'pending',
      progress: currentStep === 4 ? 50 : 0,
      icon: <Lock className="h-6 w-6" />,
      estimatedTime: '1 min'
    }
  ];

  // Manejo de carga de archivos
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);
    
    try {
      await processCompleteWorkflow(file);
    } catch (error) {
      console.error('Error en procesamiento:', error);
      toast({
        title: "⚡ SYSTEM ERROR",
        description: "Neural network disruption detected. Initiating recovery protocols...",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Procesamiento completo del workflow
  const processCompleteWorkflow = async (file: File) => {
    toast({
      title: "🔥 LEGAL DEFENSE ENGINE ACTIVATED",
      description: "Initializing maximum protection protocols...",
    });

    try {
      // Paso 1: Extracción de datos
      setCurrentStep(1);
      const { data, validation } = await extractAndValidateData(file);
      setExtractedData(data);
      setValidationResult(validation);
      
      // Paso 2: Análisis legal
      setCurrentStep(2);
      const analysis = await performLegalRiskAnalysis(data);
      setContractAnalysis(analysis);
      
      // Paso 3: Generación de contrato
      setCurrentStep(3);
      const contractHtml = await generateDefensiveContract(data, analysis);
      setGeneratedContract(contractHtml);
      
      // Paso 4: Preparación para firma
      setCurrentStep(4);
      setCurrentPhase('digital-execution');
      
      toast({
        title: "⚡ MISSION ACCOMPLISHED",
        description: "Legal defense matrix fully operational. Contract ready for deployment.",
      });
      
    } catch (error) {
      await handleProcessingFallback(file);
    }
  };

  // Extracción y validación de datos
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

  // Análisis legal avanzado
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

  // Generación de contrato defensivo
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

  // Sistema de respaldo
  const handleProcessingFallback = async (file: File) => {
    toast({
      title: "🔄 BACKUP PROTOCOLS ENGAGED",
      description: "Switching to emergency defense systems...",
    });

    try {
      const formData = new FormData();
      formData.append('estimatePdf', file);

      const response = await fetch('/api/pdf-contract-processor/pdf-to-contract-simple', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedContract(result.data.contractHtml || '<p>Contrato básico generado</p>');
        setCurrentStep(3);
        
        toast({
          title: "⚡ BACKUP SUCCESSFUL",
          description: "Emergency contract shield deployed.",
        });
      }
    } catch (error) {
      console.error('Error en sistema de respaldo:', error);
    }
  };

  // Obtener clase de estado para animaciones
  const getStepStatusClass = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-400 bg-green-900/30 shadow-green-400/50';
      case 'processing':
        return 'border-cyan-400 bg-cyan-900/30 shadow-cyan-400/50 animate-pulse';
      case 'error':
        return 'border-red-400 bg-red-900/30 shadow-red-400/50';
      default:
        return 'border-gray-500 bg-gray-900/30 shadow-gray-500/20';
    }
  };

  // Componente de esquinas HUD
  const HUDCorners = ({ className = "" }) => (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Esquina superior izquierda */}
      <div className="absolute top-0 left-0 w-4 h-4">
        <div className="absolute top-0 left-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute top-0 left-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
      {/* Esquina superior derecha */}
      <div className="absolute top-0 right-0 w-4 h-4">
        <div className="absolute top-0 right-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute top-0 right-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
      {/* Esquina inferior izquierda */}
      <div className="absolute bottom-0 left-0 w-4 h-4">
        <div className="absolute bottom-0 left-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute bottom-0 left-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
      {/* Esquina inferior derecha */}
      <div className="absolute bottom-0 right-0 w-4 h-4">
        <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-cyan-400"></div>
        <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-cyan-400"></div>
      </div>
    </div>
  );

  // Componente de líneas de escaneo
  const ScanLines = ({ active = false }) => (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${active ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-ping"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden" style={{ fontFamily: 'ui-monospace, monospace' }}>
      {/* Fondo limpio */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header simplificado */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">
            OWL FENC LEGAL DEFENSE
          </h1>
          <p className="text-gray-400 font-mono text-sm">
            CYBERNETIC CONTRACT WARFARE SYSTEM
          </p>
        </div>

        {/* Horizontal Stepper HUD */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-8 mb-8">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative ${
                  step.status === 'completed' ? 'border-green-400 bg-green-400/20' :
                  step.status === 'processing' ? 'border-cyan-400 bg-cyan-400/20 animate-pulse' :
                  step.step === currentStep ? 'border-cyan-400 bg-cyan-400/10' :
                  'border-gray-600 bg-gray-800/30'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  ) : (
                    <span className={`text-sm font-bold ${
                      step.status === 'processing' ? 'text-cyan-400' :
                      step.step === currentStep ? 'text-cyan-400' :
                      'text-gray-500'
                    }`}>
                      {step.step}
                    </span>
                  )}
                  
                  {step.status === 'processing' && (
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping"></div>
                  )}
                </div>

                {/* Connection Line */}
                {index < workflowSteps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    step.status === 'completed' ? 'bg-green-400' :
                    step.status === 'processing' ? 'bg-cyan-400' :
                    'bg-gray-600'
                  }`}></div>
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex justify-center">
            <div className="grid grid-cols-4 gap-16 text-center max-w-4xl">
              {workflowSteps.map((step) => (
                <div key={step.id} className="text-xs">
                  <p className={`font-mono ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'processing' ? 'text-cyan-400' :
                    step.step === currentStep ? 'text-cyan-400' :
                    'text-gray-500'
                  }`}>
                    {step.title.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current Step Card */}
        <div className="max-w-2xl mx-auto">
          {currentPhase === 'data-command' && (
            <Card className="border-2 border-cyan-400 bg-black/80 relative overflow-hidden">
              <HUDCorners />
              {isProcessing && <ScanLines active={true} />}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-4 rounded-full border-2 border-cyan-400 ${isProcessing ? 'animate-pulse' : ''}`}>
                    <Database className="h-8 w-8 text-cyan-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-cyan-400 mb-2">
                  Project Data Command
                </CardTitle>
                <p className="text-gray-300 text-sm">
                  Seize control from the start. Instantly extract all key project data—select from your portfolio or upload an approved estimate. No detail escapes.
                </p>
              </CardHeader>
              
              <CardContent className="px-8 pb-8">
                <div className="border-2 border-dashed border-cyan-400/50 rounded-lg p-8 text-center relative group hover:border-cyan-400 transition-all duration-300">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="pdf-upload-cyberpunk"
                    disabled={isProcessing}
                  />
                  
                  <label htmlFor="pdf-upload-cyberpunk" className="cursor-pointer block">
                    <div className={`mb-6 ${isProcessing ? 'animate-spin' : ''}`}>
                      <Upload className="h-16 w-16 text-cyan-400 mx-auto" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {isProcessing ? 'NEURAL PROCESSING...' : 'DROP PDF OR CLICK TO SELECT'}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">
                      Advanced OCR • Threat Assessment • Legal Compliance
                    </p>
                    {!isProcessing && (
                      <Button className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3 px-6 rounded border-0 shadow-none">
                        EXECUTE COMMAND
                      </Button>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <Card className="mt-6 border-2 border-yellow-400/50 bg-yellow-900/20">
            <CardContent className="py-6">
              <div className="text-center">
                <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2 animate-pulse" />
                <p className="font-bold text-yellow-400">NEURAL NETWORKS ENGAGED</p>
                <p className="text-sm text-gray-300">
                  Step {currentStep} of {workflowSteps.length} - Processing with maximum legal protection protocols
                </p>
                <Progress value={(currentStep / workflowSteps.length) * 100} className="mt-4 [&>div]:bg-yellow-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Animated Background Elements */}
      <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-50"></div>
      <div className="absolute top-1/3 right-20 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-50"></div>
      <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce opacity-50"></div>
    </div>
  );
}