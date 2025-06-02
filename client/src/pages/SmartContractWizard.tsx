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
import { Upload, Shield, CheckCircle, AlertTriangle, FileText, Brain, Zap, Scale, UserPlus, FileCheck } from 'lucide-react';

interface ExtractedData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectType?: string;
  projectDescription?: string;
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
  materialSpecs: string;
  insuranceInfo: string;
  downPayment: string;
  paymentSchedule: any[];
  warrantyPeriod: string;
  permitRequirements: string;
  disputeResolution: string;
  municipalRequirements: string;
  environmentalCompliance: string;
  isComplete: boolean;
  missingFields: string[];
}

interface RiskAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  risks: string[];
  protections: string[];
  recommendations: string[];
}

type WizardStep = 'upload' | 'analysis' | 'legal-review' | 'completion' | 'preview' | 'generation' | 'final';

const SmartContractWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Upload your estimate PDF to begin contract analysis');
  
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
    setStatusMessage('Analyzing PDF and extracting critical information...');

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
        setStatusMessage('Legal analysis complete. Reviewing extracted information and identifying additional requirements...');
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
    setContractData(completedData);
    setCurrentStep('generation');
    setStatusMessage('Generating protected contract with advanced defensive clauses...');
    generateContract(completedData);
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
      'completion': 40,
      'preview': 60,
      'generation': 80,
      'final': 100
    };
    return stepMap[currentStep];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with Status */}
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-blue-800">Legal Defense Engine</CardTitle>
                <p className="text-sm text-blue-600">Protected Contract Generator</p>
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
        
        {currentStep === 'completion' && extractedData && (
          <CompletionStep 
            extractedData={extractedData} 
            onComplete={handleDataCompletion}
            missingFields={detectMissingFields(extractedData)}
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
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Information Extracted from Document
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Client:</span> {extractedData.clientName || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Project:</span> {extractedData.projectType || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Amount:</span> {extractedData.totalAmount || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Location:</span> {extractedData.projectLocation || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Contractor:</span> {extractedData.contractorName || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Contact:</span> {extractedData.clientEmail || extractedData.clientPhone || 'Not specified'}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
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
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold mb-2 text-green-800">Legal Expert Recommendations</h3>
          <p className="text-sm text-green-700 mb-3">
            Based on the project type and risk analysis, I recommend including these protective clauses:
          </p>
          
          {!showRecommendations ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowRecommendations(true)}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              View Detailed Recommendations
            </Button>
          ) : (
            <div className="space-y-2">
              {recommendedClauses.map((clause, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{clause}</span>
                </div>
              ))}
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
            <Button onClick={onProceedToGeneration} className="flex-1">
              <FileCheck className="h-4 w-4 mr-2" />
              Generate Protected Contract
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
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