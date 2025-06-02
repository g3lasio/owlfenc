import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, Shield, CheckCircle, AlertTriangle, FileText, Brain, Zap, Scale, UserPlus, FileCheck, Eye, Calendar, DollarSign, MapPin, Phone, Mail, Building, Clock, PenTool } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ExtractedData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectType?: string;
  projectDescription?: string;
  projectLocation?: string;
  contractorName?: string;
  contractorEmail?: string;
  contractorPhone?: string;
  totalAmount?: string;
  startDate?: string;
  completionDate?: string;
}

interface ContractData extends ExtractedData {
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  contractorAddress: string;
  contractorLicense: string;
  projectLocation: string;
  materialSpecs?: string;
  insuranceInfo?: string;
  downPayment?: string;
  paymentSchedule: any[];
  warrantyPeriod?: string;
  permitRequirements?: string;
  disputeResolution?: string;
  municipalRequirements?: string;
  environmentalCompliance?: string;
  paymentTerms?: string;
  warrantyTerms?: string;
  changeOrderPolicy?: string;
  liabilityClause?: string;
  isComplete: boolean;
  missingFields: string[];
}

interface RiskAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  risks: string[];
  protections: string[];
  recommendations: string[];
}

type WizardStep = 'upload' | 'analysis' | 'legal-review' | 'completion' | 'preview' | 'contract-preview' | 'generation' | 'final';

const SmartContractWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Hello! I\'m Mervin AI, your personal legal expert. Upload your estimate PDF and I\'ll create a professional contract for you.');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Archivo inválido",
        description: "Por favor sube un archivo PDF",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep('analysis');
    setProgress(20);
    setStatusMessage('Mervin AI is analyzing your PDF and extracting project details. I\'ll identify everything needed for your contract...');

    try {
      const formData = new FormData();
      formData.append('estimatePdf', file);

      const response = await fetch('/api/pdf-contract-processor/pdf-to-contract', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF processing failed');
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response format from server');
      }

      setExtractedData(result.data.extractedData || {});
      setRiskAnalysis(result.data.riskAnalysis || null);
      setProgress(80);
      
      // Detect missing fields
      const missingFields = detectMissingFields(result.data.extractedData || {});
      
      // Wait a moment to show the analysis results, then proceed to legal consultation
      setTimeout(() => {
        setCurrentStep('legal-review');
        setStatusMessage('Perfect! I\'ve extracted all the key details. Now I\'m applying my legal expertise to identify risks and recommend protective clauses for your contract...');
        setProgress(90);
      }, 2000);
      
      
    } catch (error) {
      console.error('PDF Processing Error:', error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Could not analyze PDF. Please verify it's a valid estimate.",
        variant: "destructive"
      });
      setCurrentStep('upload');
      setStatusMessage('Processing failed. Please try with another PDF or check if API services are configured.');
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const detectMissingFields = (data: ExtractedData): string[] => {
    const requiredFields = [
      'clientName', 'clientEmail', 'clientPhone', 'clientAddress',
      'projectType', 'projectDescription', 'totalAmount',
      'startDate', 'completionDate'
    ];
    
    return requiredFields.filter(field => !data[field as keyof ExtractedData]);
  };

  const handleDataCompletion = (completedData: ContractData) => {
    // El motor Legal Defense enriquece automáticamente el contrato con términos profesionales
    const enrichedContractData: ContractData = {
      ...completedData,
      // Términos legales automáticos generados por Mervin AI Legal Defense
      contractorLicense: completedData.contractorLicense || 'Professional License Required - To be verified',
      contractorAddress: completedData.contractorAddress || extractedData.contractorAddress || 'Professional Address Required',
      contractorEmail: completedData.contractorEmail || extractedData.contractorEmail || 'Professional Email Required',
      contractorPhone: completedData.contractorPhone || extractedData.contractorPhone || 'Professional Phone Required',
      insuranceInfo: 'General Liability Insurance (minimum $1,000,000), Workers Compensation Insurance, and Professional Liability Insurance as required by state law',
      warrantyPeriod: '12-month workmanship warranty and material warranties as specified by manufacturers',
      permitRequirements: 'Contractor responsible for obtaining all required permits, inspections, and regulatory approvals',
      disputeResolution: 'Binding arbitration through American Arbitration Association for disputes exceeding $5,000',
      municipalRequirements: 'Compliance with all local building codes, zoning requirements, and municipal regulations',
      environmentalCompliance: 'Adherence to EPA regulations, proper disposal of materials, and environmental protection standards',
      paymentTerms: 'Net 30 payment terms with 1.5% monthly interest on overdue amounts exceeding 30 days',
      warrantyTerms: 'Comprehensive warranty covering workmanship defects and material failures under normal use',
      changeOrderPolicy: 'All changes require written approval with detailed cost breakdown and timeline adjustments',
      liabilityClause: 'Limited liability with mutual indemnification and comprehensive insurance coverage requirements'
    };
    
    setContractData(enrichedContractData);
    setCurrentStep('contract-preview');
    setStatusMessage('Excellent! I\'m now generating your professional contract with all the legal protections you need. This is my specialty - creating contracts as robust as those from a $500/hour attorney...');
  };

  const generateContract = async (data: ContractData) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const response = await fetch('/api/anthropic/generate-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contractData: data })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Contract generation failed');
      }

      const result = await response.json();
      
      if (!result.html) {
        throw new Error('No contract HTML received from server');
      }

      setGeneratedContract(result.html);
      setCurrentStep('final');
      setProgress(100);
      setStatusMessage('Contract completed! Advanced legal protections applied based on risk analysis.');

    } catch (error) {
      console.error('Contract Generation Error:', error);
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "Could not generate contract. Please check system configuration.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepProgress = (): number => {
    const stepMap: Record<WizardStep, number> = {
      'upload': 0,
      'analysis': 20,
      'legal-review': 40,
      'completion': 50,
      'preview': 60,
      'contract-preview': 75,
      'generation': 85,
      'final': 100
    };
    return stepMap[currentStep];
  };

  const handleProceedToCompletion = () => {
    setCurrentStep('completion');
    setStatusMessage('Please provide additional information to complete the contract protection analysis.');
  };

  const handleProceedToGeneration = () => {
    setCurrentStep('generation');
    setStatusMessage('Generating protected contract with approved legal clauses...');
    // Auto-generate contract with extracted data
    const contractData: ContractData = {
      clientName: extractedData.clientName || '',
      clientAddress: extractedData.clientAddress || extractedData.projectLocation || '',
      clientEmail: extractedData.clientEmail || '',
      clientPhone: extractedData.clientPhone || '',
      projectType: extractedData.projectType || '',
      projectDescription: extractedData.projectDescription || '',
      projectLocation: extractedData.projectLocation || '',
      contractorName: extractedData.contractorName || '',
      contractorEmail: extractedData.contractorEmail || '',
      contractorPhone: extractedData.contractorPhone || '',
      contractorAddress: '',
      contractorLicense: '',
      totalAmount: extractedData.totalAmount || '',
      startDate: extractedData.startDate || '',
      completionDate: extractedData.completionDate || '',
      paymentTerms: '',
      paymentSchedule: [],
      warrantyTerms: '',
      changeOrderPolicy: '',
      liabilityClause: '',
      isComplete: true,
      missingFields: []
    };
    generateContract(contractData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with Status */}
        <Card className="border-2 border-cyan-300 bg-gradient-to-r from-cyan-50 via-blue-50 to-cyan-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative p-2 bg-black rounded-full">
                <img 
                  src="/attached_assets/Add a heading (1).png" 
                  alt="Mervin AI" 
                  className="h-8 w-8 object-contain"
                />
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-pulse"></div>
              </div>
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Mervin AI - Legal Expert
                </CardTitle>
                <p className="text-sm text-cyan-700 font-medium">Your Trusted AI Attorney - Generating Professional Contracts</p>
                <p className="text-xs text-gray-600">Equivalent to $500/hour legal expertise</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <p className="text-gray-700">{statusMessage}</p>
            </div>
            <div className="mt-4">
              <Progress value={getStepProgress()} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">Progress: {getStepProgress()}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        {riskAnalysis && (
          <Card className="border-l-4 border-l-orange-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Legal Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Badge variant={riskAnalysis.riskLevel === 'HIGH' ? 'destructive' : 
                                riskAnalysis.riskLevel === 'MEDIUM' ? 'default' : 'secondary'}>
                    Risk: {riskAnalysis.riskLevel}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Applied Protections:</p>
                  <p className="text-sm text-gray-600">{riskAnalysis.protections.length} clauses</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Recommendations:</p>
                  <p className="text-sm text-gray-600">{riskAnalysis.recommendations.length} suggestions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        {currentStep === 'upload' && (
          <UploadStep onFileUpload={handleFileUpload} fileInputRef={fileInputRef} />
        )}
        
        {currentStep === 'analysis' && (
          <AnalysisStep isProcessing={isProcessing} progress={progress} />
        )}
        
        {currentStep === 'legal-review' && extractedData && (
          <LegalReviewStep 
            extractedData={extractedData}
            riskAnalysis={riskAnalysis}
            onProceedToCompletion={handleProceedToCompletion}
            onProceedToGeneration={handleProceedToGeneration}
          />
        )}
        
        {currentStep === 'completion' && extractedData && (
          <CompletionStep 
            extractedData={extractedData} 
            onComplete={handleDataCompletion}
            missingFields={detectMissingFields(extractedData)}
          />
        )}

        {currentStep === 'contract-preview' && contractData && (
          <ContractPreviewStep
            contractData={contractData}
            selectedClauses={[]}
            onProceedToGeneration={() => {
              setCurrentStep('generation');
              setStatusMessage('Generating final PDF contract with professional legal protections...');
              generateContract(contractData);
            }}
            onGoBack={() => setCurrentStep('completion')}
          />
        )}
        
        {currentStep === 'generation' && (
          <GenerationStep isProcessing={isProcessing} />
        )}
        
        {currentStep === 'final' && generatedContract && riskAnalysis && (
          <FinalStep 
            contract={generatedContract} 
            riskAnalysis={riskAnalysis}
            contractData={contractData}
          />
        )}

      </div>
    </div>
  );
};

// Step Components
const UploadStep: React.FC<{
  onFileUpload: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}> = ({ onFileUpload, fileInputRef }) => {
  return (
    <Card className="border-2 border-dashed border-blue-300">
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Upload Your Estimate PDF</h3>
            <p className="text-gray-600">Intelligent analysis will begin automatically</p>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Select PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileUpload(file);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const AnalysisStep: React.FC<{
  isProcessing: boolean;
  progress: number;
}> = ({ isProcessing, progress }) => {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Brain className="h-8 w-8 text-purple-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Analysis in Progress</h3>
            <p className="text-gray-600">Extracting data and evaluating legal risks...</p>
          </div>
          <Progress value={progress} className="w-full max-w-md mx-auto" />
        </div>
      </CardContent>
    </Card>
  );
};

const CompletionStep: React.FC<{
  extractedData: ExtractedData;
  onComplete: (data: ContractData) => void;
  missingFields: string[];
}> = ({ extractedData, onComplete, missingFields }) => {
  const [formData, setFormData] = useState<Partial<ContractData>>({
    ...extractedData,
    contractorName: 'OWL FENCE LLC',
    contractorEmail: 'contracts@owlfence.com',
    contractorPhone: '(512) 555-0123',
    contractorAddress: '456 Business Ave, Austin, TX 78702',
    contractorLicense: 'TX-CONT-123456',
    projectLocation: extractedData.clientAddress || '',
    materialSpecs: '',
    insuranceInfo: 'Seguro de responsabilidad general hasta $1M',
    downPayment: '',
    paymentSchedule: [],
    warrantyPeriod: '12 months',
    permitRequirements: '',
    disputeResolution: 'arbitration',
    municipalRequirements: '',
    environmentalCompliance: '',
    isComplete: false,
    missingFields: missingFields
  });

  const handleSubmit = () => {
    const completeData: ContractData = {
      clientName: formData.clientName || '',
      clientEmail: formData.clientEmail || '',
      clientPhone: formData.clientPhone || '',
      clientAddress: formData.clientAddress || '',
      projectType: formData.projectType || '',
      projectDescription: formData.projectDescription || '',
      totalAmount: formData.totalAmount || '',
      startDate: formData.startDate || '',
      completionDate: formData.completionDate || '',
      contractorName: formData.contractorName || '',
      contractorEmail: formData.contractorEmail || '',
      contractorPhone: formData.contractorPhone || '',
      contractorAddress: formData.contractorAddress || '',
      contractorLicense: formData.contractorLicense || '',
      projectLocation: formData.projectLocation || '',
      materialSpecs: formData.materialSpecs || '',
      insuranceInfo: formData.insuranceInfo || '',
      downPayment: formData.downPayment || '',
      paymentSchedule: formData.paymentSchedule || [],
      warrantyPeriod: formData.warrantyPeriod || '',
      permitRequirements: formData.permitRequirements || '',
      disputeResolution: formData.disputeResolution || '',
      municipalRequirements: formData.municipalRequirements || '',
      environmentalCompliance: formData.environmentalCompliance || '',
      isComplete: true,
      missingFields: []
    };
    
    onComplete(completeData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Completar Información
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Datos Extraídos */}
        <div>
          <h4 className="font-medium text-green-700 mb-3">✓ Datos Extraídos del PDF</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="bg-green-50 p-3 rounded border border-green-200">
                <Label className="text-xs text-green-600 uppercase">{key}</Label>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Campos Faltantes */}
        {missingFields.length > 0 && (
          <div>
            <h4 className="font-medium text-orange-700 mb-3">⚠ Información Adicional Requerida</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missingFields.includes('permitRequirements') && (
                <div>
                  <Label htmlFor="permitRequirements">Requisitos de Permisos</Label>
                  <Textarea
                    id="permitRequirements"
                    value={formData.permitRequirements || ''}
                    onChange={(e) => setFormData({...formData, permitRequirements: e.target.value})}
                    placeholder="Ej: Permiso municipal de construcción requerido"
                  />
                </div>
              )}
              {missingFields.includes('materialSpecs') && (
                <div>
                  <Label htmlFor="materialSpecs">Especificaciones de Materiales</Label>
                  <Textarea
                    id="materialSpecs"
                    value={formData.materialSpecs || ''}
                    onChange={(e) => setFormData({...formData, materialSpecs: e.target.value})}
                    placeholder="Ej: Madera tratada a presión, postes de cedro"
                  />
                </div>
              )}
              {missingFields.includes('downPayment') && (
                <div>
                  <Label htmlFor="downPayment">Pago Inicial</Label>
                  <Input
                    id="downPayment"
                    value={formData.downPayment || ''}
                    onChange={(e) => setFormData({...formData, downPayment: e.target.value})}
                    placeholder="Ej: 1650"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700">
          <Zap className="h-4 w-4 mr-2" />
          Generar Contrato Blindado
        </Button>

      </CardContent>
    </Card>
  );
};

const GenerationStep: React.FC<{
  isProcessing: boolean;
}> = ({ isProcessing }) => {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-green-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Generando Contrato Blindado</h3>
            <p className="text-gray-600">Aplicando cláusulas de protección legal avanzadas...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LegalReviewStep: React.FC<{
  extractedData: ExtractedData;
  riskAnalysis: RiskAnalysis | null;
  onProceedToCompletion: () => void;
  onProceedToGeneration: () => void;
}> = ({ extractedData, riskAnalysis, onProceedToCompletion, onProceedToGeneration }) => {
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [recommendedClauses, setRecommendedClauses] = useState<string[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedClauses, setSelectedClauses] = useState<Set<number>>(new Set());

  const handleClauseToggle = (index: number) => {
    const newSelected = new Set(selectedClauses);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedClauses(newSelected);
  };

  useEffect(() => {
    // Analyze extracted data and identify missing critical information
    const critical = ['clientName', 'clientEmail', 'clientPhone', 'projectDescription', 'totalAmount', 'contractorName'];
    const missing = critical.filter(field => !extractedData[field as keyof ExtractedData]);
    setMissingFields(missing);

    // Generate legal recommendations based on project type and risk analysis
    const clauses = [
      'Payment milestone structure with mechanic\'s lien rights',
      'Change order authorization requirements',
      'Weather delay and force majeure provisions',
      'Material warranty and workmanship guarantee',
      'Insurance and bonding requirements',
      'Dispute resolution and arbitration clauses',
      'Project completion timeline with penalties',
      'Permit responsibility and compliance terms'
    ];
    setRecommendedClauses(clauses);
    
    // Pre-select high priority clauses
    const highPriorityClauses = new Set([0, 1, 3, 6, 7]); // Payment, Change Orders, Warranty, Timeline, Permits
    setSelectedClauses(highPriorityClauses);
  }, [extractedData]);

  const extractedFieldsCount = Object.keys(extractedData).filter(key => extractedData[key as keyof ExtractedData]).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-blue-500" />
          Legal Expert Review
        </CardTitle>
        <CardDescription>
          Contract analysis complete. Review extracted information and legal recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Extracted Data Summary */}
        <div className="bg-white border border-blue-200 p-4 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800">
            <FileText className="h-4 w-4 text-blue-600" />
            Information Extracted from Document
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-gray-700 break-words">
              <span className="font-medium text-gray-900">Client:</span> <span className="break-all">{extractedData.clientName || 'Not specified'}</span>
            </div>
            <div className="text-gray-700 break-words">
              <span className="font-medium text-gray-900">Project:</span> <span className="break-all">{extractedData.projectType || 'Not specified'}</span>
            </div>
            <div className="text-gray-700 break-words">
              <span className="font-medium text-gray-900">Amount:</span> <span className="break-all">{extractedData.totalAmount || 'Not specified'}</span>
            </div>
            <div className="text-gray-700 break-words">
              <span className="font-medium text-gray-900">Location:</span> <span className="break-all">{extractedData.projectLocation || 'Not specified'}</span>
            </div>
            <div className="text-gray-700 break-words">
              <span className="font-medium text-gray-900">Contractor:</span> <span className="break-all">{extractedData.contractorName || 'Not specified'}</span>
            </div>
            <div className="text-gray-700 break-words col-span-1 md:col-span-2">
              <span className="font-medium text-gray-900">Contact:</span> <span className="break-all">{extractedData.clientEmail || extractedData.clientPhone || 'Not specified'}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Successfully extracted {extractedFieldsCount} data points from uploaded document
          </div>
        </div>

        {/* Risk Analysis Display */}
        {riskAnalysis && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Legal Risk Assessment: <Badge variant={riskAnalysis.riskLevel === 'LOW' ? 'default' : 'destructive'}>
                {riskAnalysis.riskLevel}
              </Badge>
              <br />
              {riskAnalysis.protections.length} protective clauses identified for inclusion
            </AlertDescription>
          </Alert>
        )}

        {/* Missing Information Analysis */}
        {missingFields.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold mb-2 text-yellow-800">Additional Information Required</h3>
            <p className="text-sm text-yellow-700 mb-2">
              To create a comprehensive protective contract, we need {missingFields.length} additional details:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              {missingFields.map((field, index) => (
                <li key={index}>{field.replace(/([A-Z])/g, ' $1').toLowerCase()}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Legal Recommendations */}
        <div className="bg-white border border-green-200 p-4 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2 text-green-800">Legal Expert Recommendations</h3>
          <p className="text-sm text-gray-700 mb-3">
            Based on the project type and risk analysis, I recommend including these protective clauses:
          </p>
          
          {!showRecommendations ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowRecommendations(true)}
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              Customize Legal Protections
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-600 mb-3">
                Select the protective clauses you want to include in your contract. {selectedClauses.size} of {recommendedClauses.length} clauses selected.
              </p>
              {recommendedClauses.map((clause, index) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded border hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id={`clause-${index}`}
                    checked={selectedClauses.has(index)}
                    onCheckedChange={() => handleClauseToggle(index)}
                    className="mt-0.5"
                  />
                  <label 
                    htmlFor={`clause-${index}`}
                    className="text-sm text-gray-700 cursor-pointer flex-1 leading-relaxed"
                  >
                    {clause}
                  </label>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedClauses(new Set(Array.from({length: recommendedClauses.length}, (_, i) => i)))}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedClauses(new Set())}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          {missingFields.length > 0 ? (
            <Button onClick={onProceedToCompletion} className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" />
              Provide Additional Information
            </Button>
          ) : (
            <Button 
              onClick={() => {
                // Activar el motor Legal Defense para enriquecer automáticamente
                const autoEnrichedData: ContractData = {
                  clientName: extractedData.clientName || '',
                  clientEmail: extractedData.clientEmail || '',
                  clientPhone: extractedData.clientPhone || '',
                  clientAddress: extractedData.clientAddress || '',
                  projectType: extractedData.projectType || '',
                  projectDescription: extractedData.projectDescription || '',
                  projectLocation: extractedData.projectLocation || '',
                  contractorName: extractedData.contractorName || '',
                  contractorEmail: extractedData.contractorEmail || '',
                  contractorPhone: extractedData.contractorPhone || '',
                  contractorAddress: extractedData.contractorAddress || 'Professional Business Address Required',
                  contractorLicense: 'State Licensed Contractor - License verification required per state regulations',
                  totalAmount: extractedData.totalAmount || '',
                  startDate: extractedData.startDate || 'To be mutually agreed upon',
                  completionDate: extractedData.completionDate || 'As specified in project timeline',
                  // Términos legales profesionales generados automáticamente por Mervin AI Legal Defense
                  materialSpecs: 'All materials shall meet or exceed industry standards and manufacturer specifications. Contractor warrants all materials against defects.',
                  insuranceInfo: 'General Liability Insurance minimum $2,000,000, Workers Compensation as required by state law, Professional Liability $1,000,000, and Automobile Liability $1,000,000',
                  downPayment: '25% down payment required to commence work, with progress payments tied to completion milestones',
                  paymentSchedule: [
                    { description: 'Contract Execution', amount: '25% of total' },
                    { description: 'Project Commencement', amount: '25% of total' },
                    { description: 'Midpoint Completion', amount: '25% of total' },
                    { description: 'Final Completion', amount: '25% of total' }
                  ],
                  warrantyPeriod: '24-month comprehensive warranty on workmanship, plus full manufacturer warranties on all materials and equipment',
                  permitRequirements: 'Contractor assumes full responsibility for obtaining all required permits, licenses, inspections, and regulatory approvals at contractor expense',
                  disputeResolution: 'Mandatory binding arbitration through American Arbitration Association using Construction Industry Rules for disputes exceeding $5,000',
                  municipalRequirements: 'Full compliance with all local building codes, zoning ordinances, HOA requirements, and municipal regulations',
                  environmentalCompliance: 'Strict adherence to EPA regulations, OSHA safety standards, proper hazardous material disposal, and environmental protection protocols',
                  paymentTerms: 'Net 30 days payment terms. Late payments subject to 1.5% monthly service charge (18% APR). Lien rights reserved.',
                  warrantyTerms: 'Comprehensive warranty covering all workmanship defects, material failures, and system malfunctions under normal use and conditions',
                  changeOrderPolicy: 'All project changes require written authorization with detailed scope, cost analysis, and timeline impact before implementation',
                  liabilityClause: 'Contractor liability limited to contract value. Mutual indemnification for third-party claims. Force majeure protections included.',
                  missingFields: [],
                  isComplete: true
                };
                handleDataCompletion(autoEnrichedData);
              }}
              className="flex-1"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Generate Professional Contract Preview
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

const ContractPreviewStep: React.FC<{
  contractData: ContractData;
  selectedClauses: string[];
  onProceedToGeneration: () => void;
  onGoBack: () => void;
}> = ({ contractData, selectedClauses, onProceedToGeneration, onGoBack }) => {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center border-b">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <Eye className="h-6 w-6 text-blue-600" />
            PROFESSIONAL CONTRACTOR AGREEMENT
          </CardTitle>
          <div className="text-center mt-2">
            <p className="text-sm text-cyan-700 font-medium">
              Generated by Mervin AI - Your Trusted Legal Expert
            </p>
            <p className="text-xs text-gray-600">
              Professional Grade Contract • Equivalent to $500/hour attorney expertise
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Brain className="h-3 w-3" />
                <span>Available in Mervin AI Chat (Coming Soon)</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contract Sections */}
      <div className="space-y-4">
        
        {/* Página 1: Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Contract Information & Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Effective Date:</span>
                <span>{today}</span>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  Contracting Parties
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-2">CLIENT (Property Owner)</h5>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium break-words">{contractData.clientName}</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-500" />
                        <span className="break-all">{contractData.clientAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-gray-500" />
                        <span className="break-all">{contractData.clientEmail}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-gray-500" />
                        <span className="break-all">{contractData.clientPhone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-green-800 mb-2">CONTRACTOR (Service Provider)</h5>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium break-words">{contractData.contractorName}</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-500" />
                        <span className="break-all">{contractData.contractorAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-gray-500" />
                        <span className="break-all">{contractData.contractorEmail}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-gray-500" />
                        <span className="break-all">{contractData.contractorPhone}</span>
                      </div>
                      {contractData.contractorLicense && (
                        <p className="text-xs bg-green-100 px-2 py-1 rounded">
                          {contractData.contractorLicense}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Página 2: Alcance de Servicios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Scope of Services & Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Project Description:</h4>
              <p className="break-words">{contractData.projectDescription}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2">Project Type:</h5>
                <p className="text-sm bg-blue-50 p-2 rounded break-words">{contractData.projectType}</p>
              </div>
              <div>
                <h5 className="font-medium mb-2">Project Location:</h5>
                <p className="text-sm bg-blue-50 p-2 rounded break-words">{contractData.projectLocation}</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h5 className="font-semibold text-yellow-800 mb-2">Material Specifications:</h5>
              <p className="text-sm break-words">{contractData.materialSpecs}</p>
            </div>
          </CardContent>
        </Card>

        {/* Página 3: Cronograma y Fechas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Project Timeline & Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <h5 className="font-semibold text-orange-800 mb-2">Commencement Date</h5>
                <p className="break-words">{contractData.startDate}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h5 className="font-semibold text-orange-800 mb-2">Completion Date</h5>
                <p className="break-words">{contractData.completionDate}</p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h5 className="font-semibold text-red-800 mb-2">Time is of the Essence</h5>
              <p className="text-sm">Performance within specified timeframes is material to this agreement. Extensions require written consent with cause.</p>
            </div>
          </CardContent>
        </Card>

        {/* Página 4: Compensación y Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Compensation & Payment Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <h4 className="font-bold text-2xl text-green-800 break-words">{contractData.totalAmount}</h4>
              <p className="text-sm text-green-600">Total Contract Value</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">Payment Terms:</h5>
              <p className="text-sm break-words">{contractData.paymentTerms}</p>
            </div>

            <div className="grid gap-4">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                <span className="font-medium">Down Payment:</span>
                <span className="break-words">{contractData.downPayment}</span>
              </div>
              
              {contractData.paymentSchedule && contractData.paymentSchedule.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Milestone Payment Schedule:</h5>
                  <div className="space-y-2">
                    {contractData.paymentSchedule.map((payment: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <span className="break-words">{payment.description}</span>
                        <span className="font-medium break-words">{payment.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Página 5: Seguros y Garantías */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Insurance, Warranties & Legal Protections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h5 className="font-semibold text-purple-800 mb-2">Insurance Requirements:</h5>
              <p className="text-sm break-words">{contractData.insuranceInfo}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-semibold text-green-800 mb-2">Warranty Period:</h5>
                <p className="text-sm break-words">{contractData.warrantyPeriod}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-semibold text-green-800 mb-2">Warranty Terms:</h5>
                <p className="text-sm break-words">{contractData.warrantyTerms}</p>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h5 className="font-semibold text-indigo-800 mb-3">Selected Legal Protections ({selectedClauses.length} clauses):</h5>
              <div className="space-y-2">
                {selectedClauses.map((clause, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{clause}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Página 6: Requisitos Legales y Disputas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-red-600" />
              Legal Requirements & Dispute Resolution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-semibold text-yellow-800 mb-2">Permit Requirements:</h5>
                <p className="text-sm break-words">{contractData.permitRequirements}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-semibold text-blue-800 mb-2">Municipal Compliance:</h5>
                <p className="text-sm break-words">{contractData.municipalRequirements}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-semibold text-green-800 mb-2">Environmental Compliance:</h5>
                <p className="text-sm break-words">{contractData.environmentalCompliance}</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h5 className="font-semibold text-red-800 mb-2">Dispute Resolution:</h5>
                <p className="text-sm break-words">{contractData.disputeResolution}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold text-gray-800 mb-2">Change Order Policy:</h5>
                <p className="text-sm break-words">{contractData.changeOrderPolicy}</p>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <h5 className="font-semibold text-indigo-800 mb-2">Liability & Indemnification:</h5>
                <p className="text-sm break-words">{contractData.liabilityClause}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Página 7: Firmas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PenTool className="h-5 w-5 text-gray-600" />
              Contract Execution & Signatures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-gray-600 mb-6">
              By executing this agreement, both parties acknowledge understanding and acceptance of all terms, conditions, and legal obligations contained herein.
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
                <h5 className="font-semibold mb-4">CLIENT SIGNATURE</h5>
                <div className="space-y-3">
                  <div className="border-b border-gray-300 pb-2 mb-4">
                    <p className="text-sm text-gray-600">Signature</p>
                  </div>
                  <p className="font-medium break-words">{contractData.clientName}</p>
                  <p className="text-sm text-gray-600">Client/Property Owner</p>
                  <div className="border-b border-gray-300 pb-2 mt-4">
                    <p className="text-sm text-gray-600">Date</p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
                <h5 className="font-semibold mb-4">CONTRACTOR SIGNATURE</h5>
                <div className="space-y-3">
                  <div className="border-b border-gray-300 pb-2 mb-4">
                    <p className="text-sm text-gray-600">Signature</p>
                  </div>
                  <p className="font-medium break-words">{contractData.contractorName}</p>
                  <p className="text-sm text-gray-600">Licensed Contractor</p>
                  <div className="border-b border-gray-300 pb-2 mt-4">
                    <p className="text-sm text-gray-600">Date</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded border border-cyan-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img 
                  src="/attached_assets/Add a heading (1).png" 
                  alt="Mervin AI" 
                  className="h-4 w-4 object-contain"
                />
                <span className="font-semibold text-cyan-700">Powered by Mervin AI Legal Expert</span>
              </div>
              <p className="text-gray-600">
                This agreement is governed by applicable state and local laws. Generated with $500/hour attorney-level expertise and comprehensive legal protections.
              </p>
              <p className="text-cyan-600 text-xs mt-1">
                Trust Mervin AI for all your legal contract needs • Available in chat (coming soon)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={onGoBack}
          className="flex-1"
        >
          Back to Legal Review
        </Button>
        <Button 
          onClick={onProceedToGeneration}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <FileCheck className="h-4 w-4 mr-2" />
          Generate Final PDF Contract
        </Button>
      </div>
    </div>
  );
};

const FinalStep: React.FC<{
  contract: string;
  riskAnalysis: RiskAnalysis;
  contractData: ContractData | null;
}> = ({ contract, riskAnalysis, contractData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Contrato Completado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Resumen de Protecciones */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Contrato generado con {riskAnalysis.protections.length} cláusulas de protección legal.
            Nivel de riesgo evaluado: <Badge variant="secondary">{riskAnalysis.riskLevel}</Badge>
          </AlertDescription>
        </Alert>

        {/* Preview del Contrato */}
        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
          <div dangerouslySetInnerHTML={{ __html: contract }} />
        </div>

        {/* Acciones */}
        <div className="flex gap-4">
          <Button className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button variant="outline" className="flex-1">
            Enviar por Email
          </Button>
        </div>

      </CardContent>
    </Card>
  );
};

export default SmartContractWizard;