/**
 * Unified Contract Manager - Main Interface
 * Orchestrates the complete contract workflow from OCR to approval
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload,
  FileText,
  Brain,
  Shield,
  CheckCircle,
  AlertTriangle,
  Zap,
  Download,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ContractData, GeneratedContract, OCRResult, ProcessingStatus } from '@shared/contractSchema';
import { unifiedContractManager } from '@/services/unifiedContractManager';
import UnifiedContractPreview from '@/components/contract/UnifiedContractPreview';
import MissingDataCollector from '@/components/contract/MissingDataCollector';
import ContractPreviewDisplay from '@/components/contract/ContractPreviewDisplay';

type WorkflowStep = 'upload' | 'processing' | 'data-validation' | 'missing-data' | 'contract-generation' | 'preview' | 'legal-review' | 'approval' | 'pdf-generation' | 'email-sending';

const UnifiedContractManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  
  // Data state with persistence
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [contractData, setContractData] = useState<Partial<ContractData>>(() => {
    const saved = sessionStorage.getItem('contract-session-data');
    return saved ? JSON.parse(saved) : {};
  });
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(() => {
    const saved = sessionStorage.getItem('contract-session-generated');
    return saved ? JSON.parse(saved) : null;
  });

  // Load projects for conversion to contracts
  const { data: availableProjects = [] } = useQuery({
    queryKey: ['projects-for-contracts'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Error loading projects');
      return await response.json();
    }
  });

  // Optimized contract generation mutation with unified endpoint
  const generateContractMutation = useMutation({
    mutationFn: async (data: ContractData) => {
      const response = await fetch('/api/legal-defense/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractData: data,
          protectionLevel: 'standard',
          enableOptimizations: true
        })
      });

      if (!response.ok) {
        throw new Error('Error generating contract');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setGeneratedContract(result.contract);
        setCurrentStep('preview');
        
        // Persistir contrato generado
        sessionStorage.setItem('contract-session-generated', JSON.stringify(result.contract));
        sessionStorage.setItem('contract-session-step', 'preview');
        
        toast({
          title: "Contrato generado exitosamente",
          description: "Revise el contrato antes de aprobar"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error generando contrato",
        description: "No se pudo generar el contrato defensivo",
        variant: "destructive"
      });
    }
  });

  // Set up processing status listener
  React.useEffect(() => {
    const handleStatusUpdate = (status: ProcessingStatus) => {
      setProcessingStatus(status);
    };

    unifiedContractManager.onProcessingUpdate(handleStatusUpdate);
    
    return () => {
      unifiedContractManager.removeProcessingCallback(handleStatusUpdate);
    };
  }, []);

  // Handle file upload and OCR processing
  const handleFileUpload = useCallback(async (file: File) => {
    setSelectedFile(file);
    setCurrentStep('processing');

    try {
      const result = await unifiedContractManager.processDocumentWithOCR(file);
      
      if (result.success) {
        setOcrResult(result);
        setContractData(result.extractedData);
        
        // PASO CRÍTICO: Validar datos y persistir inmediatamente
        const extractedData = result.extractedData;
        
        // Persistir datos en sesión
        sessionStorage.setItem('contract-session-data', JSON.stringify(extractedData));
        sessionStorage.setItem('contract-session-step', 'data-validation');
        
        // Verificar si faltan datos críticos
        const missingFields = unifiedContractManager.detectMissingFields(extractedData);
        
        if (missingFields.length > 0) {
          setCurrentStep('missing-data');
          sessionStorage.setItem('contract-session-step', 'missing-data');
          toast({
            title: "Datos incompletos detectados",
            description: `Se requieren ${missingFields.length} campos adicionales para generar un contrato robusto`,
            variant: "destructive"
          });
        } else {
          setCurrentStep('data-validation');
          toast({
            title: "Documento procesado completamente",
            description: `Datos extraídos con ${result.confidence}% de confianza - Listos para generar contrato`
          });
        }
      } else {
        throw new Error('OCR processing failed');
      }
    } catch (error) {
      toast({
        title: "Error procesando documento",
        description: "No se pudieron extraer los datos del PDF",
        variant: "destructive"
      });
      setCurrentStep('upload');
    }
  }, [toast]);

  // Handle project selection for contract generation
  const handleProjectSelection = (project: any) => {
    const projectData = unifiedContractManager.convertProjectToContract(project);
    setContractData(projectData);
    
    // Validar datos del proyecto inmediatamente
    const missingFields = unifiedContractManager.detectMissingFields(projectData);
    
    if (missingFields.length > 0) {
      setCurrentStep('missing-data');
      toast({
        title: "Datos del proyecto incompletos",
        description: `Se requieren ${missingFields.length} campos adicionales para generar un contrato robusto`,
        variant: "destructive"
      });
    } else {
      setCurrentStep('data-validation');
      toast({
        title: "Proyecto seleccionado",
        description: `Datos del proyecto "${project.clientName}" validados - Listos para generar contrato`
      });
    }
  };

  // Handle contract data updates - Solo permitir generación cuando datos estén completos
  const handleDataUpdate = (updatedData: ContractData) => {
    setContractData(updatedData);
    
    // Validar nuevamente antes de generar
    const validation = unifiedContractManager.validateContractData(updatedData);
    
    if (!validation.isValid) {
      toast({
        title: "Datos aún incompletos",
        description: "Complete todos los campos requeridos antes de generar el contrato",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentStep('contract-generation');
    generateContractMutation.mutate(updatedData);
  };

  // Handle contract regeneration
  const handleRegenerate = (updatedData: ContractData) => {
    setCurrentStep('contract-generation');
    generateContractMutation.mutate(updatedData);
  };

  // Handle contract approval
  const handleContractApproval = (approvedContract: GeneratedContract) => {
    setGeneratedContract(approvedContract);
    setCurrentStep('preview');
    
    toast({
      title: "Contrato generado exitosamente",
      description: "Revise las cláusulas de protección antes de aprobar"
    });
  };

  // Get step progress percentage
  const getStepProgress = (): number => {
    const stepMap: Record<WorkflowStep, number> = {
      'upload': 0,
      'processing': 10,
      'data-validation': 20,
      'missing-data': 30,
      'contract-generation': 50,
      'preview': 65,
      'legal-review': 80,
      'approval': 90,
      'pdf-generation': 95,
      'email-sending': 100
    };
    return stepMap[currentStep] || 0;
  };

  // File drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      toast({
        title: "Archivo no válido",
        description: "Solo se aceptan archivos PDF",
        variant: "destructive"
      });
    }
  }, [handleFileUpload, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className=" bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Generador de Contratos Inteligente</h1>
                <p className="text-gray-600">Sistema unificado con protección legal defensiva</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Powered by Anthropic AI</p>
              <Progress value={getStepProgress()} className="w-32 mt-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Processing Status */}
        {processingStatus && currentStep === 'processing' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
                <div className="flex-1">
                  <p className="font-medium">{processingStatus.message}</p>
                  <Progress value={processingStatus.progress} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={currentStep === 'upload' ? 'start' : 'workflow'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="start">Iniciar Nuevo Contrato</TabsTrigger>
            <TabsTrigger value="workflow">Flujo de Trabajo</TabsTrigger>
          </TabsList>

          {/* Start Tab - File Upload and Project Selection */}
          <TabsContent value="start">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PDF Upload */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Subir PDF Existente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileUpload(file);
                      };
                      input.click();
                    }}
                  >
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900">
                      Arrastra un PDF aquí o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      El sistema extraerá automáticamente los datos del contrato
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Project Selection */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Crear desde Proyecto</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    Selecciona un proyecto aprobado para generar el contrato
                  </p>
                  
                  {availableProjects.length > 0 ? (
                    <div className="space-y-2 max-h-48 ">
                      {availableProjects.map((project: any) => (
                        <div
                          key={project.id}
                          className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleProjectSelection(project)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{project.clientName}</p>
                              <p className="text-sm text-gray-500">{project.projectType}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{project.totalPrice ? `$${project.totalPrice.toFixed(2)}` : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No hay proyectos disponibles para generar contratos. 
                        Los proyectos deben estar aprobados por el cliente.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workflow Tab - Contract Generation Process */}
          <TabsContent value="workflow">
            {currentStep === 'processing' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Brain className="h-16 w-16 text-blue-600 animate-pulse mx-auto" />
                    <h3 className="text-xl font-semibold">Procesando Documento</h3>
                    <p className="text-gray-600">
                      Extrayendo datos con Mistral AI...
                    </p>
                    {processingStatus && (
                      <Progress value={processingStatus.progress} className="max-w-md mx-auto" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missing Data Collection Step */}
            {currentStep === 'missing-data' && contractData && ocrResult && (
              <MissingDataCollector
                contractData={contractData}
                missingFields={unifiedContractManager.detectMissingFields(contractData)}
                onDataComplete={handleDataUpdate}
                ocrConfidence={ocrResult.confidence}
              />
            )}

            {/* Data Validation and Preview Step */}
            {(currentStep === 'data-validation' || currentStep === 'contract-generation') && (
              <UnifiedContractPreview
                contractData={contractData}
                generatedContract={generatedContract || undefined}
                onDataUpdate={handleDataUpdate}
                onApprove={handleContractApproval}
                onRegenerate={handleRegenerate}
                isGenerating={generateContractMutation.isPending}
              />
            )}

            {/* Contract Preview with Defensive Clauses */}
            {(currentStep === 'preview' || currentStep === 'legal-review') && generatedContract && (
              <ContractPreviewDisplay
                contract={generatedContract}
                onApprove={() => setCurrentStep('approval')}
                onEdit={() => setCurrentStep('data-validation')}
                onRegenerate={() => handleRegenerate(contractData)}
              />
            )}

            {currentStep === 'approval' && generatedContract && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="h-6 w-6" />
                    <span>Contrato Aprobado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600">
                        El contrato está listo para envío y firma digital
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Cliente: {generatedContract.contractData.clientName}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                      <Button>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar para Firma
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UnifiedContractManager;