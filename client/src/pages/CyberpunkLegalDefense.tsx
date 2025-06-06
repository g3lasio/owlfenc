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
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      {/* Fondo animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-purple-900 opacity-50"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)
        `
      }}></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            OWL FENC LEGAL DEFENSE
          </h1>
          <p className="text-xl text-gray-300 font-mono">
            CYBERNETIC CONTRACT WARFARE SYSTEM // STATUS: OPERATIONAL
          </p>
          <div className="mt-4 flex justify-center">
            <div className="px-4 py-2 bg-gradient-to-r from-cyan-900/50 to-purple-900/50 border border-cyan-400/50 rounded-lg">
              <span className="text-cyan-400 font-mono text-sm">
                NEURAL LINK: ACTIVE // THREAT LEVEL: NEUTRALIZED
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {workflowSteps.map((step, index) => (
            <div key={step.id} className="relative group">
              <Card className={`relative overflow-hidden transition-all duration-500 border-2 shadow-2xl ${getStepStatusClass(step)}`}>
                <HUDCorners />
                <ScanLines active={step.status === 'processing'} />
                
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-3 rounded-full ${
                      step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      step.status === 'processing' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-gray-500/20 text-gray-400'
                    } ${step.status === 'processing' ? 'animate-pulse' : ''}`}>
                      {step.icon}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`font-mono text-xs ${
                        step.status === 'completed' ? 'border-green-400 text-green-400' :
                        step.status === 'processing' ? 'border-cyan-400 text-cyan-400' :
                        'border-gray-500 text-gray-400'
                      }`}
                    >
                      STEP {step.step}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-white mb-2">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="relative">
                  <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    {step.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>PROGRESS</span>
                      <span>{step.progress}%</span>
                    </div>
                    <Progress 
                      value={step.progress} 
                      className={`h-2 ${
                        step.status === 'completed' ? '[&>div]:bg-green-400' :
                        step.status === 'processing' ? '[&>div]:bg-cyan-400' :
                        '[&>div]:bg-gray-500'
                      }`}
                    />
                  </div>

                  {/* Status and Time */}
                  <div className="flex justify-between items-center">
                    <Badge 
                      className={`text-xs ${
                        step.status === 'completed' ? 'bg-green-900/50 text-green-400 border-green-400' :
                        step.status === 'processing' ? 'bg-cyan-900/50 text-cyan-400 border-cyan-400' :
                        step.status === 'error' ? 'bg-red-900/50 text-red-400 border-red-400' :
                        'bg-gray-900/50 text-gray-400 border-gray-500'
                      }`}
                    >
                      {step.status === 'completed' ? 'SECURED' :
                       step.status === 'processing' ? 'EXECUTING' :
                       step.status === 'error' ? 'COMPROMISED' :
                       'STANDBY'}
                    </Badge>
                    {step.estimatedTime && (
                      <span className="text-xs text-gray-500 font-mono">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {step.estimatedTime}
                      </span>
                    )}
                  </div>
                </CardContent>

                {/* Holographic Border Effect */}
                <div className={`absolute inset-0 rounded-lg opacity-50 ${
                  step.status === 'processing' ? 'animate-pulse' : ''
                } ${
                  step.status === 'completed' ? 'shadow-lg shadow-green-400/25' :
                  step.status === 'processing' ? 'shadow-lg shadow-cyan-400/25' :
                  'shadow-lg shadow-gray-500/10'
                }`}></div>
              </Card>

              {/* Connection Line */}
              {index < workflowSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-cyan-400/50 to-purple-400/50 transform -translate-y-1/2 z-20">
                  <ArrowRight className="h-4 w-4 text-cyan-400 absolute -right-2 -top-1.5" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main Action Area */}
        {currentPhase === 'data-command' && (
          <Card className="border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-900/20 to-purple-900/20 shadow-2xl shadow-cyan-400/25 relative overflow-hidden">
            <HUDCorners />
            <ScanLines active={isProcessing} />
            
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Database className="h-8 w-8 text-cyan-400" />
                PROJECT DATA COMMAND CENTER
              </CardTitle>
              <p className="text-gray-300">
                Deploy intelligence extraction protocols. Upload your estimate for immediate data seizure and analysis.
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="border-2 border-dashed border-cyan-400/50 rounded-lg p-12 text-center relative overflow-hidden group hover:border-cyan-400 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload-cyberpunk"
                  disabled={isProcessing}
                />
                
                <label htmlFor="pdf-upload-cyberpunk" className="cursor-pointer relative z-10">
                  <div className={`mb-6 ${isProcessing ? 'animate-spin' : ''}`}>
                    <Upload className="h-20 w-20 text-cyan-400 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {isProcessing ? 'NEURAL PROCESSING...' : 'INITIATE DATA EXTRACTION'}
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Drop your PDF estimate or click to select • Advanced OCR • Threat Assessment • Legal Compliance
                  </p>
                  {!isProcessing && (
                    <Button className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-cyan-400/25">
                      <Play className="h-5 w-5 mr-2" />
                      EXECUTE COMMAND
                    </Button>
                  )}
                </label>
              </div>
            </CardContent>
          </Card>
        )}

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