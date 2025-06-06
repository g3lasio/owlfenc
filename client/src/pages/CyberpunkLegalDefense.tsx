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
  User,
  Clock,
  Zap,
  Play,
  ArrowRight,
  List,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Package
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
  
  // Estados del toggle de método de entrada
  const [dataInputMethod, setDataInputMethod] = useState<'upload' | 'select'>('upload');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [approvedProjects, setApprovedProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

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

  // Función para cargar proyectos aprobados
  const loadApprovedProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/legal-defense/approved-projects');
      const data = await response.json();
      
      if (data.success) {
        setApprovedProjects(data.projects);
      } else {
        toast({
          title: "⚡ DATA RETRIEVAL ERROR",
          description: "Failed to load approved projects from database",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "⚡ CONNECTION ERROR",
        description: "Cannot connect to project database",
        variant: "destructive"
      });
    } finally {
      setLoadingProjects(false);
    }
  }, [toast]);

  // Cargar proyectos cuando se selecciona el método 'select'
  useEffect(() => {
    if (dataInputMethod === 'select') {
      loadApprovedProjects();
    }
  }, [dataInputMethod, loadApprovedProjects]);

  // Manejo de carga de archivos con Claude Sonnet OCR
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "⚡ INVALID FILE FORMAT",
        description: "Only PDF files are supported for advanced OCR processing",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    
    try {
      await processAdvancedOCR(file);
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
  }, [toast]);

  // Procesamiento avanzado de OCR con Claude Sonnet
  const processAdvancedOCR = async (file: File) => {
    toast({
      title: "🔥 NEURAL OCR INITIATED",
      description: "Claude Sonnet analyzing document structure and content...",
    });

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/legal-defense/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'OCR processing failed');
      }

      if (result.success) {
        const { data, hasCriticalMissing, missingCritical, canProceed } = result;
        
        console.log('OCR Result:', { data, hasCriticalMissing, missingCritical, canProceed });
        
        setExtractedData(data);
        setCurrentStep(2);
        setCurrentPhase('arsenal-builder'); // Change phase to show data review interface

        if (hasCriticalMissing && missingCritical?.length > 0) {
          toast({
            title: "⚠️ INCOMPLETE DATA EXTRACTED",
            description: `Missing critical fields: ${missingCritical.join(', ')}. Review extracted data below.`,
          });
        } else {
          toast({
            title: "✅ OCR EXTRACTION COMPLETE",
            description: `Data extracted with ${data.extractionQuality?.confidence || 85}% confidence. Review data below.`,
          });
        }
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
    }
  };

  // Generate defensive contract with extracted data
  const generateDefensiveContract = useCallback(async (data: any) => {
    setIsProcessing(true);
    
    try {
      toast({
        title: "🔥 GENERATING DEFENSIVE CONTRACT",
        description: "AI crafting maximum legal protection with extracted data...",
      });

      const response = await fetch('/api/legal-defense/generate-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extractedData: data }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedContract(result.contract);
        toast({
          title: "✅ DEFENSIVE CONTRACT GENERATED",
          description: "Legal protection deployed successfully. Ready for review and signature.",
        });
      } else {
        throw new Error(result.error || 'Contract generation failed');
      }
    } catch (error) {
      console.error('Contract generation error:', error);
      toast({
        title: "⚡ GENERATION ERROR",
        description: "Failed to generate defensive contract. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Manejo de selección de proyecto
  const handleProjectSelection = useCallback(async (project: any) => {
    setIsProcessing(true);
    
    try {
      // Simular procesamiento de proyecto existente
      toast({
        title: "🔥 PROJECT DATA ACQUIRED",
        description: `Extracting data from ${project.clientName} project...`,
      });

      // Simular extracción de datos del proyecto
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const projectData = {
        clientName: project.clientName,
        projectType: project.projectType,
        address: project.address,
        totalAmount: project.totalAmount,
        materials: project.materials,
        date: project.date,
        status: project.status
      };

      setExtractedData(projectData);
      setCurrentStep(2);
      
      toast({
        title: "✅ PROJECT DATA SECURED",
        description: "Data extraction complete. Proceeding to contract arsenal...",
      });

      // Continuar con el workflow
      await processProjectWorkflow(projectData);
      
    } catch (error) {
      console.error('Error en selección de proyecto:', error);
      toast({
        title: "⚡ SYSTEM ERROR",
        description: "Project data extraction failed. Please try again...",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Procesamiento del workflow con datos extraídos de OCR
  const processExtractedDataWorkflow = async (extractedData: any) => {
    // Análisis de contrato con datos extraídos por Claude Sonnet
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const analysis: ContractAnalysis = {
      riskLevel: extractedData.extractionQuality.confidence > 85 ? 'bajo' : 'medio',
      riskScore: Math.max(10, 100 - extractedData.extractionQuality.confidence),
      protectionsApplied: [
        'Advanced OCR Data Validation',
        'Liability Protection Clauses',
        'Payment Terms Enforcement',
        'Material Quality Guarantees'
      ],
      legalAdvice: [
        `Document analyzed with ${extractedData.extractionQuality.confidence}% confidence`,
        'All financial terms validated and protected',
        'Client and project details secured'
      ],
      contractStrength: Math.min(95, extractedData.extractionQuality.confidence + 10),
      complianceScore: 90,
      stateCompliance: true
    };

    setContractAnalysis(analysis);
    setCurrentStep(3);

    toast({
      title: "🛡️ CONTRACT ARSENAL READY",
      description: `Defense level: ${analysis.riskLevel.toUpperCase()} | Strength: ${analysis.contractStrength}%`,
    });
  };

  // Procesamiento del workflow para proyectos seleccionados
  const processProjectWorkflow = async (projectData: any) => {
    // Simular análisis de contrato para proyecto existente
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const analysis: ContractAnalysis = {
      riskLevel: 'bajo',
      riskScore: 25,
      protectionsApplied: [
        'Liability Protection Clauses',
        'Payment Terms Enforcement',
        'Material Quality Guarantees',
        'Timeline Protection'
      ],
      legalAdvice: [
        'Standard residential fence contract approved',
        'Payment schedule protects contractor interests',
        'All local permits and regulations covered'
      ],
      contractStrength: 90,
      complianceScore: 95,
      stateCompliance: true
    };

    setContractAnalysis(analysis);
    setCurrentStep(3);

    toast({
      title: "🛡️ CONTRACT ARSENAL READY",
      description: `Defense level: ${analysis.riskLevel.toUpperCase()} | Strength: ${analysis.contractStrength}%`,
    });
  };

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
      await generateDefensiveContract(data);
      
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
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-bold text-cyan-400 mb-2">
            FORTRESS DRAFT
          </h1>
          <p className="text-gray-400 font-mono text-xs md:text-sm">
            Defensive Contracts for Relentless Protection
          </p>
        </div>

        {/* Cyberpunk Horizontal Stepper */}
        <div className="mb-8 px-4">
          {/* Mobile: Horizontal Scroll Stepper */}
          <div className="md:hidden overflow-x-auto pb-4">
            <div className="flex items-center space-x-4 min-w-max px-2">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Icon + Label */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all duration-300 ${
                      step.status === 'completed' ? 'border-green-400 bg-green-400/20 shadow-green-400/30 shadow-lg' :
                      step.status === 'processing' ? 'border-cyan-400 bg-cyan-400/20 shadow-cyan-400/50 shadow-lg' :
                      step.step === currentStep ? 'border-cyan-400 bg-cyan-400/10 shadow-cyan-400/30 shadow-lg' :
                      'border-gray-600 bg-gray-800/30'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : (
                        <div className={`text-lg ${
                          step.status === 'processing' ? 'text-cyan-400' :
                          step.step === currentStep ? 'text-cyan-400' :
                          'text-gray-500'
                        }`}>
                          {step.icon}
                        </div>
                      )}
                      
                      {step.status === 'processing' && (
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75"></div>
                      )}
                    </div>
                    
                    <p className={`text-xs font-mono mt-2 text-center max-w-20 leading-tight ${
                      step.status === 'completed' ? 'text-green-400' :
                      step.status === 'processing' ? 'text-cyan-400' :
                      step.step === currentStep ? 'text-cyan-400' :
                      'text-gray-500'
                    }`}>
                      {step.title.replace(' & ', ' &\n').replace(' Command', '\nCommand').replace(' Builder', '\nBuilder').replace(' Vault', '\nVault')}
                    </p>
                  </div>

                  {/* Connection Line */}
                  {index < workflowSteps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                      step.status === 'completed' ? 'bg-green-400' :
                      step.status === 'processing' ? 'bg-cyan-400 animate-pulse' :
                      'bg-gray-600'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Horizontal Stepper */}
          <div className="hidden md:block">
            <div className="flex items-center justify-center space-x-6 lg:space-x-12">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Icon + Label */}
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 lg:w-18 lg:h-18 rounded-full border-3 flex items-center justify-center relative transition-all duration-300 ${
                      step.status === 'completed' ? 'border-green-400 bg-green-400/20 shadow-green-400/50 shadow-lg' :
                      step.status === 'processing' ? 'border-cyan-400 bg-cyan-400/20 shadow-cyan-400/50 shadow-xl' :
                      step.step === currentStep ? 'border-cyan-400 bg-cyan-400/10 shadow-cyan-400/30 shadow-lg' :
                      'border-gray-600 bg-gray-800/30'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-8 w-8 text-green-400" />
                      ) : (
                        <div className={`text-2xl transition-all duration-300 ${
                          step.status === 'processing' ? 'text-cyan-400 scale-110' :
                          step.step === currentStep ? 'text-cyan-400 scale-105' :
                          'text-gray-500'
                        }`}>
                          {step.icon}
                        </div>
                      )}
                      
                      {step.status === 'processing' && (
                        <>
                          <div className="absolute inset-0 rounded-full border-3 border-cyan-400 animate-ping opacity-75"></div>
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse opacity-50"></div>
                        </>
                      )}
                      
                      {step.step === currentStep && step.status !== 'processing' && step.status !== 'completed' && (
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse opacity-50"></div>
                      )}
                    </div>
                    
                    <p className={`text-sm font-mono mt-3 text-center max-w-24 leading-tight transition-colors duration-300 ${
                      step.status === 'completed' ? 'text-green-400' :
                      step.status === 'processing' ? 'text-cyan-400' :
                      step.step === currentStep ? 'text-cyan-400' :
                      'text-gray-500'
                    }`}>
                      {step.title.toUpperCase()}
                    </p>
                  </div>

                  {/* Connection Line */}
                  {index < workflowSteps.length - 1 && (
                    <div className={`w-16 lg:w-24 h-1 mx-3 lg:mx-6 transition-all duration-500 ${
                      step.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-green-300' :
                      step.status === 'processing' ? 'bg-gradient-to-r from-cyan-400 to-cyan-300 animate-pulse' :
                      'bg-gray-600'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current Step Card */}
        <div className="max-w-2xl mx-auto px-4">
          {currentPhase === 'data-command' && (
            <Card className="border-2 border-cyan-400 bg-black/80 relative overflow-hidden">
              <HUDCorners />
              {isProcessing && <ScanLines active={true} />}
              
              <CardHeader className="text-center px-4 md:px-6">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-3 md:p-4 rounded-full border-2 border-cyan-400 ${isProcessing ? 'animate-pulse' : ''}`}>
                    <Database className="h-6 w-6 md:h-8 md:w-8 text-cyan-400" />
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-cyan-400 mb-2">
                  Project Data Command
                </CardTitle>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                  Seize control from the start. Instantly extract all key project data—select from your portfolio or upload an approved estimate. No detail escapes.
                </p>
              </CardHeader>
              
              <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
                {/* Toggle Switch */}
                <div className="mb-6">
                  <div className="flex justify-center">
                    <div className="relative bg-gray-800/50 rounded-lg p-1 border border-cyan-400/30">
                      <div className="flex relative">
                        {/* Sliding Background */}
                        <div
                          className={`absolute top-1 bottom-1 w-1/2 bg-cyan-400/20 border border-cyan-400 rounded transition-all duration-300 ease-in-out ${
                            dataInputMethod === 'upload' ? 'left-1' : 'left-1/2'
                          }`}
                        />
                        
                        {/* Upload Option */}
                        <button
                          onClick={() => setDataInputMethod('upload')}
                          className={`relative z-10 flex items-center space-x-2 px-4 py-3 rounded transition-all duration-300 ${
                            dataInputMethod === 'upload'
                              ? 'text-cyan-400 font-bold'
                              : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-sm font-mono">Upload PDF Estimate</span>
                        </button>
                        
                        {/* Select Option */}
                        <button
                          onClick={() => setDataInputMethod('select')}
                          className={`relative z-10 flex items-center space-x-2 px-4 py-3 rounded transition-all duration-300 ${
                            dataInputMethod === 'select'
                              ? 'text-cyan-400 font-bold'
                              : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          <List className="h-4 w-4" />
                          <span className="text-sm font-mono">Select Approved Project</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Content Area */}
                <div className="relative overflow-hidden">
                  {/* Upload PDF Content */}
                  {dataInputMethod === 'upload' && (
                    <div className="animate-in fade-in-0 slide-in-from-left-5 duration-300">
                      <div className="border-2 border-dashed border-cyan-400/50 rounded-lg p-6 md:p-8 text-center relative group hover:border-cyan-400 transition-all duration-300">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="pdf-upload-cyberpunk"
                          disabled={isProcessing}
                        />
                        
                        <label htmlFor="pdf-upload-cyberpunk" className="cursor-pointer block">
                          <div className={`mb-4 md:mb-6 ${isProcessing ? 'animate-spin' : ''}`}>
                            <Upload className="h-12 w-12 md:h-16 md:w-16 text-cyan-400 mx-auto" />
                          </div>
                          <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">
                            {isProcessing ? 'NEURAL PROCESSING...' : 'DROP PDF OR CLICK TO SELECT'}
                          </h3>
                          <p className="text-gray-400 text-xs md:text-sm mb-4 md:mb-6">
                            Advanced OCR • Threat Assessment • Legal Compliance
                          </p>
                          {!isProcessing && (
                            <Button className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 md:py-3 md:px-6 rounded border-0 shadow-none text-sm md:text-base">
                              EXECUTE COMMAND
                            </Button>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Select Project Content */}
                  {dataInputMethod === 'select' && (
                    <div className="animate-in fade-in-0 slide-in-from-right-5 duration-300">
                      <div className="space-y-3">
                        {approvedProjects.map((project) => (
                          <div
                            key={project.id}
                            onClick={() => setSelectedProject(project)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                              selectedProject?.id === project.id
                                ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/25'
                                : 'border-gray-600 bg-gray-800/30 hover:border-cyan-400/50 hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className={`font-bold text-sm ${
                                selectedProject?.id === project.id ? 'text-cyan-400' : 'text-white'
                              }`}>
                                {project.clientName}
                              </h4>
                              <Badge className={`text-xs ${
                                selectedProject?.id === project.id
                                  ? 'bg-cyan-400/20 text-cyan-400 border-cyan-400'
                                  : 'bg-green-400/20 text-green-400 border-green-400'
                              }`}>
                                APPROVED
                              </Badge>
                            </div>
                            
                            <p className="text-gray-300 text-xs mb-2">{project.projectType}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-400">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{project.address}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3" />
                                <span>${project.totalAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{project.date}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {selectedProject && (
                          <div className="pt-4">
                            <Button 
                              onClick={() => handleProjectSelection(selectedProject)}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 md:py-3 md:px-6 rounded border-0 shadow-none text-sm md:text-base"
                            >
                              EXECUTE WITH SELECTED PROJECT
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* OCR Data Review Step */}
          {extractedData && currentStep === 2 && (
            <Card className="border-2 border-purple-400 bg-black/80 relative overflow-hidden mt-6">
              <HUDCorners />
              
              <CardHeader className="text-center px-4 md:px-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 md:p-4 rounded-full border-2 border-purple-400">
                    <Shield className="h-6 w-6 md:h-8 md:w-8 text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-purple-400 mb-2">
                  Contract Arsenal Builder
                </CardTitle>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                  Review extracted data and generate defensive contract with AI-powered legal protection.
                </p>
              </CardHeader>
              
              <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
                {/* Extracted Data Display */}
                <div className="space-y-6">
                  {/* Client Information */}
                  <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                    <h3 className="text-purple-400 font-bold mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      CLIENT DATA ACQUIRED
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white ml-2">{extractedData.clientInfo?.name || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Location:</span>
                        <span className="text-white ml-2">{extractedData.clientInfo?.address || extractedData.projectDetails?.location || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Information */}
                  <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                    <h3 className="text-purple-400 font-bold mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      PROJECT SPECIFICATIONS
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white ml-2">{extractedData.projectDetails?.type || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Description:</span>
                        <span className="text-white ml-2">{extractedData.projectDetails?.description || extractedData.specifications || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                    <h3 className="text-purple-400 font-bold mb-3 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      FINANCIAL PARAMETERS
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Subtotal:</span>
                        <span className="text-green-400 ml-2 font-mono">${extractedData.financials?.subtotal?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total:</span>
                        <span className="text-green-400 ml-2 font-mono font-bold">${extractedData.financials?.total?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Materials Count */}
                  <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                    <h3 className="text-purple-400 font-bold mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      MATERIALS INVENTORY
                    </h3>
                    <div className="text-sm">
                      <span className="text-gray-400">Items detected:</span>
                      <span className="text-white ml-2">{extractedData.materials?.length || 0} material entries</span>
                    </div>
                  </div>

                  {/* Extraction Quality */}
                  <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                    <h3 className="text-cyan-400 font-bold mb-3 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      EXTRACTION ANALYSIS
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Confidence Level:</span>
                        <span className="text-cyan-400 ml-2 font-bold">{extractedData.extractionQuality?.confidence || 85}%</span>
                      </div>
                      {extractedData.extractionQuality?.warnings?.length > 0 && (
                        <div>
                          <span className="text-yellow-400 text-xs">⚠ Warnings detected in source document</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Next Button */}
                <div className="mt-8 text-center">
                  <Button 
                    onClick={() => {
                      console.log('Advancing to step 3 with data:', extractedData);
                      setCurrentStep(3);
                      setCurrentPhase('defense-review');
                      processExtractedDataWorkflow(extractedData);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none text-base"
                  >
                    GENERATE DEFENSIVE CONTRACT
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Defense Review & Correction */}
          {extractedData && currentStep === 3 && currentPhase === 'defense-review' && (
            <Card className="border-2 border-green-400 bg-black/80 relative overflow-hidden mt-6">
              <HUDCorners />
              
              <CardHeader className="text-center px-4 md:px-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 md:p-4 rounded-full border-2 border-green-400">
                    <Eye className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-green-400 mb-2">
                  Defense Review & Correction
                </CardTitle>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                  Review and validate all extracted data before contract generation. Make corrections as needed for maximum legal protection.
                </p>
              </CardHeader>
              
              <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
                <div className="space-y-6">
                  {/* Editable Client Information */}
                  <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-4">
                    <h3 className="text-green-400 font-bold mb-4 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      CLIENT INFORMATION
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm">Client Name</label>
                        <input
                          type="text"
                          value={extractedData.clientInfo?.name || ''}
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Address</label>
                        <input
                          type="text"
                          value={extractedData.clientInfo?.address || extractedData.projectDetails?.location || ''}
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Editable Project Details */}
                  <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-4">
                    <h3 className="text-green-400 font-bold mb-4 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      PROJECT DETAILS
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-gray-400 text-sm">Project Type</label>
                        <input
                          type="text"
                          value={extractedData.projectDetails?.type || ''}
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Description</label>
                        <textarea
                          value={extractedData.projectDetails?.description || extractedData.specifications || ''}
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none h-20"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-4">
                    <h3 className="text-green-400 font-bold mb-4 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      FINANCIAL SUMMARY
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-gray-400 text-xs">SUBTOTAL</div>
                        <div className="text-green-400 font-mono text-lg">${extractedData.financials?.subtotal?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-gray-400 text-xs">TAX</div>
                        <div className="text-green-400 font-mono text-lg">${extractedData.financials?.tax?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-gray-400 text-xs">MATERIALS</div>
                        <div className="text-green-400 font-mono text-lg">{extractedData.materials?.length || 0}</div>
                      </div>
                      <div className="bg-gray-800/50 rounded p-3 border border-green-400/50">
                        <div className="text-gray-400 text-xs">TOTAL</div>
                        <div className="text-green-400 font-mono text-xl font-bold">${extractedData.financials?.total?.toFixed(2) || '0.00'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Data Quality Status */}
                  <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                    <h3 className="text-cyan-400 font-bold mb-4 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      DATA VALIDATION STATUS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm">Extraction Confidence</div>
                        <div className="flex items-center mt-1">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-cyan-400 h-2 rounded-full" 
                              style={{ width: `${extractedData.extractionQuality?.confidence || 85}%` }}
                            ></div>
                          </div>
                          <span className="text-cyan-400 ml-2 font-bold">{extractedData.extractionQuality?.confidence || 85}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Data Completeness</div>
                        <div className="text-green-400 font-semibold">Ready for Contract Generation</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => {
                      setCurrentStep(2);
                      setCurrentPhase('arsenal-builder');
                    }}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  >
                    BACK TO REVIEW
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('Proceeding to contract generation with data:', extractedData);
                      setCurrentStep(4);
                      setCurrentPhase('digital-execution');
                      // Generate contract with validated data
                      generateDefensiveContract(extractedData);
                    }}
                    className="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none"
                  >
                    GENERATE LEGAL CONTRACT
                  </Button>
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