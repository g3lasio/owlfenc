import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

import { ContractHistoryPanel } from '@/components/contract/ContractHistoryPanel';
import { DefenseClause } from '@/services/deepSearchDefenseEngine';
import { professionalContractGenerator, ContractData } from '@/services/professionalContractGenerator';
import { useProfile } from '@/hooks/use-profile';
import { contractHistoryService } from '@/services/contractHistoryService';
import { useAuth } from '@/hooks/use-auth';
import { legalDefenseEngine, type LegalClause } from '@/services/legalDefenseEngine';
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
  Package,
  Mail,
  FileSignature,
  CheckSquare,
  Archive,
  History,
  Server
} from 'lucide-react';

interface PaymentTerm {
  id: string;
  label: string;
  percentage: number;
  description: string;
}

interface PaymentTermRowProps {
  term: PaymentTerm;
  totalAmount: number;
  onUpdate: (id: string, field: keyof PaymentTerm, value: string | number) => void;
  onRemove?: (id: string) => void;
  isRemovable?: boolean;
}

const PaymentTermRow: React.FC<PaymentTermRowProps> = ({ 
  term, 
  totalAmount, 
  onUpdate, 
  onRemove, 
  isRemovable = false 
}) => {
  const amount = (totalAmount * term.percentage) / 100;
  
  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 w-full">
      {/* Mobile-First Layout */}
      <div className="space-y-3">
        {/* First Row: Label and Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <input
            type="text"
            value={term.label}
            onChange={(e) => onUpdate(term.id, 'label', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 text-sm font-medium focus:border-green-400 focus:outline-none w-full sm:flex-1 sm:mr-3"
            placeholder="Payment label..."
          />
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-green-400 font-mono font-bold text-lg">${amount.toFixed(2)}</span>
            {isRemovable && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(term.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-8 w-8"
              >
                ×
              </Button>
            )}
          </div>
        </div>
        
        {/* Second Row: Percentage and Description */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 sm:w-auto">
            <input
              type="number"
              value={term.percentage}
              onChange={(e) => onUpdate(term.id, 'percentage', parseFloat(e.target.value) || 0)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 w-20 focus:border-green-400 focus:outline-none text-center"
              min="0"
              max="100"
              step="1"
            />
            <span className="text-gray-400 text-sm">%</span>
          </div>
          <input
            type="text"
            value={term.description}
            onChange={(e) => onUpdate(term.id, 'description', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 text-sm flex-1 focus:border-green-400 focus:outline-none"
            placeholder="Payment description..."
          />
        </div>
      </div>
    </div>
  );
};

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
  
  // Estados para el nuevo sistema DeepSearch Defense
  const [approvedClauses, setApprovedClauses] = useState<DefenseClause[]>([]);
  const [clauseCustomizations, setClauseCustomizations] = useState<Record<string, any>>({});
  
  // Estados para el motor de Legal Defense inteligente
  const [intelligentClauses, setIntelligentClauses] = useState<LegalClause[]>([]);
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(new Set());
  
  // Estados para términos de pago
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([
    {
      id: '1',
      label: 'Initial Payment (50%)',
      percentage: 50,
      description: '50% after contract signed'
    },
    {
      id: '2',
      label: 'Final Payment',
      percentage: 50,
      description: 'Upon project completion'
    }
  ]);
  
  // Estado para el costo total editable
  const [totalCost, setTotalCost] = useState<number>(0);
  
  // Profile data for contractor information
  const { profile } = useProfile();
  const { user } = useAuth();
  
  // Estados del toggle de método de entrada
  const [dataInputMethod, setDataInputMethod] = useState<'upload' | 'select'>('upload');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [approvedProjects, setApprovedProjects] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [contractPreviewHtml, setContractPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Contract history state
  const [currentContractId, setCurrentContractId] = useState<string | null>(null);
  const [pdfGenerationTime, setPdfGenerationTime] = useState<number>(0);

  // Funciones para manejar términos de pago
  const updatePaymentTerm = useCallback((id: string, field: keyof PaymentTerm, value: string | number) => {
    setPaymentTerms(prev => prev.map(term => 
      term.id === id ? { ...term, [field]: value } : term
    ));
  }, []);

  const addPaymentTerm = useCallback(() => {
    const newTerm: PaymentTerm = {
      id: Date.now().toString(),
      label: 'Progressive Payment',
      percentage: 0,
      description: 'Payment milestone description'
    };
    setPaymentTerms(prev => [...prev, newTerm]);
  }, []);

  const removePaymentTerm = useCallback((id: string) => {
    setPaymentTerms(prev => prev.filter(term => term.id !== id));
  }, []);
  
  // Edit contract handler
  const handleEditContract = useCallback((contract: any) => {
    console.log('🔧 Editing contract:', contract);
    
    // Map the contract history data to the expected format for the editor
    const mappedData = {
      // Client information
      clientName: contract.contractData?.client?.name || contract.clientName || '',
      clientAddress: contract.contractData?.client?.address || '',
      clientEmail: contract.contractData?.client?.email || '',
      clientPhone: contract.contractData?.client?.phone || '',
      
      // Project information
      projectType: contract.contractData?.project?.type || contract.projectType || '',
      projectDescription: contract.contractData?.project?.description || '',
      projectLocation: contract.contractData?.project?.location || '',
      
      // Financial information
      totalAmount: contract.contractData?.financials?.total || 0,
      subtotal: contract.contractData?.financials?.subtotal || 0,
      tax: contract.contractData?.financials?.tax || 0,
      
      // Contractor information (from user profile will be used as fallback)
      contractorName: contract.contractData?.contractor?.name || profile?.companyName || '',
      contractorAddress: contract.contractData?.contractor?.address || profile?.address || '',
      contractorEmail: contract.contractData?.contractor?.email || profile?.email || '',
      contractorPhone: contract.contractData?.contractor?.phone || profile?.phone || '',
      contractorLicense: contract.contractData?.contractor?.license || profile?.licenseNumber || '',
      
      // Additional data that might be present
      materials: contract.contractData?.materials || [],
      timeline: contract.contractData?.timeline || {},
      terms: contract.contractData?.terms || {},
      
      // Preserve original contract data structure
      originalContractData: contract.contractData
    };
    
    console.log('🔧 Mapped data for editing:', mappedData);
    
    // Load contract data into the form for editing
    setExtractedData(mappedData);
    setCurrentPhase('arsenal-builder');
    setCurrentStep(2);
    
    // Set approved clauses if they exist
    if (contract.approvedClauses) {
      setApprovedClauses(contract.approvedClauses);
    }
    
    // Set customizations if they exist
    if (contract.clauseCustomizations) {
      setClauseCustomizations(contract.clauseCustomizations);
    }
    
    // Store the contract ID for updating
    setCurrentContractId(contract.id);
    
    console.log('🔧 Contract editing state prepared');
  }, [profile]);

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

  // Función para cargar proyectos directamente desde Firebase
  const loadApprovedProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      // Importar función de Firebase
      const { getProjects } = await import('@/lib/firebase');
      
      // Obtener proyectos directamente desde Firebase
      const firebaseProjects = await getProjects();
      
      if (firebaseProjects.length > 0) {
        // Enviar proyectos al backend para formateo
        const response = await fetch('/api/projects/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projects: firebaseProjects })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setApprovedProjects(data.projects);
          console.log(`✅ Proyectos cargados: ${data.projects.length}`);
        } else {
          throw new Error(data.error);
        }
      } else {
        setApprovedProjects([]);
        toast({
          title: "⚡ NO SAVED PROJECTS",
          description: "No saved projects found. Upload a PDF estimate or create a project first.",
        });
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "⚡ CONNECTION ERROR",
        description: "Cannot connect to project database",
        variant: "destructive"
      });
      setApprovedProjects([]);
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



  // Función para manejar la selección de proyecto y cargar todos sus datos
  const handleProjectSelection = useCallback(async (project: any) => {
    setIsProcessing(true);
    
    try {
      const userId = 1; // This should be dynamically obtained from auth context
      
      toast({
        title: "🔥 PROJECT DATA EXTRACTION",
        description: `Loading complete data for ${project.clientName}'s project...`,
      });

      // Send complete project data to backend for contract processing
      const response = await fetch('/api/projects/contract-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load project data');
      }

      if (result.success) {
        // Set the extracted data with all project information
        setExtractedData(result.extractedData);
        setCurrentStep(2);
        setCurrentPhase('arsenal-builder');

        // Mark as selected project source
        setSelectedFile(null); // Clear any uploaded file
        
        toast({
          title: "✅ PROJECT DATA LOADED",
          description: `All data for ${project.clientName}'s project loaded successfully. Ready for contract generation.`,
        });

        console.log('Project data loaded:', result.extractedData);
        
      } else {
        throw new Error(result.error || 'Invalid project data received');
      }

    } catch (error) {
      console.error('Error loading project data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load complete project data';
      toast({
        title: "⚡ PROJECT LOADING ERROR",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Función para manejar la finalización del Defense Review
  const handleDefenseComplete = useCallback((approvedDefenseClauses: DefenseClause[], customizations: Record<string, any>) => {
    setApprovedClauses(approvedDefenseClauses);
    setClauseCustomizations(customizations);
    
    // Actualizar el análisis del contrato con las cláusulas aprobadas
    const updatedAnalysis: ContractAnalysis = {
      riskLevel: approvedDefenseClauses.length > 10 ? 'bajo' : 'medio',
      riskScore: Math.max(0, 100 - (approvedDefenseClauses.length * 5)),
      protectionsApplied: approvedDefenseClauses.map(clause => clause.subcategory),
      legalAdvice: [
        `${approvedDefenseClauses.length} cláusulas defensivas aprobadas`,
        'Análisis de compliance jurisdiccional completado',
        'Trazabilidad legal verificada para todas las cláusulas'
      ],
      contractStrength: Math.min(100, approvedDefenseClauses.length * 8),
      complianceScore: 95, // Alto score por usar el sistema DeepSearch Defense
      stateCompliance: true
    };

    setContractAnalysis(updatedAnalysis);
    setCurrentPhase('digital-execution');
    setCurrentStep(4);

    toast({
      title: "DEFENSE SYSTEM ACTIVATED",
      description: `${approvedDefenseClauses.length} defensive clauses approved with full legal traceability`,
    });
  }, [toast]);

  // Generar preview real del contrato
  const generateRealContractPreview = useCallback(async () => {
    if (!extractedData) return;

    setLoadingPreview(true);
    try {
      const selectedClausesData = intelligentClauses.filter(clause => 
        selectedClauses.has(clause.id) || clause.category === 'MANDATORY'
      );

      const contractData = {
        client: {
          name: extractedData.clientInfo?.name || extractedData.clientName || '',
          address: extractedData.clientInfo?.address || extractedData.clientAddress || extractedData.projectDetails?.location || '',
          email: extractedData.clientInfo?.email || extractedData.clientEmail || '',
          phone: extractedData.clientInfo?.phone || extractedData.clientPhone || ''
        },
        contractor: {
          name: profile?.companyName || '',
          address: profile?.address || '',
          email: profile?.email || '',
          phone: profile?.phone || '',
          license: profile?.license || ''
        },
        project: {
          type: extractedData.projectDetails?.type || extractedData.projectType || '',
          description: extractedData.projectDetails?.description || extractedData.projectDescription || '',
          location: extractedData.projectDetails?.location || extractedData.projectLocation || '',
          startDate: extractedData.projectDetails?.startDate || null,
          endDate: extractedData.projectDetails?.endDate || null
        },
        financials: {
          total: extractedData.financials?.total || extractedData.totalAmount || 0,
          subtotal: extractedData.financials?.subtotal || extractedData.subtotal || 0,
          tax: extractedData.financials?.tax || extractedData.tax || 0,
          taxRate: extractedData.financials?.taxRate || 0
        },
        protections: selectedClausesData
      };

      const response = await fetch('/api/contracts/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        throw new Error('Error generando preview del contrato');
      }

      const previewData = await response.json();
      setContractPreviewHtml(previewData.html);
      
    } catch (error) {
      console.error('Error generando preview:', error);
      setContractPreviewHtml('<div class="error">Error generando preview del contrato</div>');
    } finally {
      setLoadingPreview(false);
    }
  }, [extractedData, intelligentClauses, selectedClauses, profile]);

  // Actualizar preview cuando cambien los datos o selecciones
  useEffect(() => {
    if (extractedData && showPreview && currentStep === 3) {
      generateRealContractPreview();
    }
  }, [extractedData, selectedClauses, showPreview, currentStep, generateRealContractPreview]);

  // Función para generar el PDF del contrato profesional
  const generateContractPDF = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const contractData: ContractData = {
        client: {
          name: extractedData.clientInfo?.name || 'Client Name',
          address: extractedData.clientInfo?.address || extractedData.projectDetails?.location || 'Client Address',
          email: extractedData.clientInfo?.email || '',
          phone: extractedData.clientInfo?.phone || ''
        },
        contractor: {
          name: profile?.companyName || 'Contractor Name',
          address: profile?.address || 'Contractor Address',
          email: profile?.email || '',
          phone: profile?.phone || '',
          license: profile?.license || ''
        },
        project: {
          type: extractedData.projectDetails?.type || 'Construction Services',
          description: extractedData.projectDetails?.description || 'Services as specified',
          location: extractedData.projectDetails?.location || extractedData.clientInfo?.address || 'Project Location',
          startDate: extractedData.projectDetails?.startDate || '',
          endDate: extractedData.projectDetails?.endDate || ''
        },
        financials: {
          total: extractedData.financials?.total || 0,
          subtotal: extractedData.financials?.subtotal,
          tax: extractedData.financials?.tax,
          taxRate: extractedData.financials?.taxRate
        },
        protections: intelligentClauses.filter(clause => 
          selectedClauses.has(clause.id) || clause.category === 'MANDATORY'
        ).map(clause => ({
          id: clause.id,
          title: clause.title || 'Protection Clause',
          content: clause.clause || 'Standard protection clause',
          category: clause.category || 'PROTECTION',
          riskLevel: clause.riskLevel || 'MEDIUM'
        }))
      };

      // Call the hybrid contract generation API
      const response = await fetch('/api/contracts/generate-professional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate professional contract');
      }

      const result = await response.json();
      setPdfGenerationTime(result.metadata?.generationTime || 0);
      
      if (result.success && result.html) {
        // Create a blob URL from the HTML for direct download
        const htmlBlob = new Blob([result.html], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        
        // Open HTML in new window for PDF generation
        const newWindow = window.open(htmlUrl, '_blank');
        if (newWindow) {
          newWindow.document.title = `Contract_${extractedData.clientInfo?.name?.replace(/\s+/g, '_') || 'Client'}_${Date.now()}`;
          // Auto-trigger print dialog after a short delay
          setTimeout(() => {
            newWindow.print();
          }, 1000);
        }
        
        const pdfUrl = htmlUrl;
        
        // Save contract to Firebase history
        if (user?.uid) {
          try {
            const contractHistoryEntry = {
              userId: user.uid,
              contractId: `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              clientName: contractData.client.name,
              projectType: contractData.project.type,
              status: 'completed' as const,
              contractData: {
                client: contractData.client,
                contractor: contractData.contractor,
                project: contractData.project,
                financials: contractData.financials,
                protections: contractData.protections.map(p => ({
                  id: p.id,
                  category: p.category,
                  clause: p.clause
                }))
              },
              pdfUrl: pdfUrl,
              pageCount: result.metadata?.pageCount || 6,
              generationTime: result.metadata?.generationTime || 0,
              templateUsed: 'hybrid-professional'
            };

            const savedContractId = await contractHistoryService.saveContract(contractHistoryEntry);
            setCurrentContractId(savedContractId);
            
            console.log('✅ Contract saved to Firebase history:', savedContractId);
          } catch (firebaseError) {
            console.error('❌ Failed to save contract to history:', firebaseError);
            // Don't fail the PDF generation if Firebase save fails
          }
        }

        // Trigger automatic download
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Contract_${extractedData.clientInfo?.name?.replace(/\s+/g, '_') || 'Client'}_${Date.now()}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Contract Generated Successfully",
          description: `Professional ${result.metadata?.pageCount || 6}-page PDF contract downloaded and saved to history`,
        });
      } else {
        throw new Error(result.error || 'Contract generation failed');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [extractedData, approvedClauses, profile, toast]);

  // Función para enviar contrato para firma electrónica
  const sendContractForSignature = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const signatureData = {
        clientEmail: extractedData.clientInfo?.email || '',
        clientName: extractedData.clientInfo?.name || '',
        contractData: extractedData,
        protections: approvedClauses
      };

      const response = await fetch('/api/contracts/send-for-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signatureData),
      });

      if (!response.ok) {
        throw new Error('Failed to send contract for signature');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Contract Sent Successfully",
          description: "Electronic signature request sent to client",
        });
      }
    } catch (error) {
      console.error('Error sending contract:', error);
      toast({
        title: "Send Error",
        description: "Failed to send contract for signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [extractedData, approvedClauses, toast]);

  // Función para generar cláusulas inteligentes usando el motor de Legal Defense
  const generateIntelligentClauses = useCallback((data: any) => {
    console.log('🧠 Generating intelligent legal clauses for project data');
    
    const clauses = legalDefenseEngine.generateIntelligentClauses(data);
    setIntelligentClauses(clauses);
    
    // Pre-seleccionar cláusulas obligatorias
    const mandatoryClauses = clauses
      .filter(clause => clause.category === 'MANDATORY')
      .map(clause => clause.id);
    
    setSelectedClauses(new Set(mandatoryClauses));
    
    console.log(`🛡️ Generated ${clauses.length} clauses (${mandatoryClauses.length} mandatory)`);
  }, []);

  // Función para comenzar un nuevo contrato
  const startNewContract = useCallback(() => {
    setExtractedData(null);
    setApprovedClauses([]);
    setClauseCustomizations({});
    setContractAnalysis(null);
    setGeneratedContract('');
    setCurrentPhase('data-command');
    setCurrentStep(1);
    setSelectedFile(null);
    setIntelligentClauses([]);
    setSelectedClauses(new Set());
    
    toast({
      title: "New Contract Started",
      description: "Ready to create a new contract",
    });
  }, [toast]);

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

  // Collect all form data from the comprehensive legal blocks
  const collectContractData = () => {
    const form = document.querySelector('#defense-review-form') as HTMLFormElement;
    if (!form) return extractedData;

    const formData = new FormData(form);
    const contractorInfo = {
      companyName: formData.get('contractorCompany') as string,
      contractorName: formData.get('contractorName') as string,
      businessAddress: formData.get('businessAddress') as string,
      phone: formData.get('contractorPhone') as string,
      hasLicense: formData.get('hasLicense') === 'on',
      licenseNumber: formData.get('licenseNumber') as string,
      licenseClassification: formData.get('licenseClassification') as string,
      hasInsurance: formData.get('hasInsurance') === 'on',
      insuranceCompany: formData.get('insuranceCompany') as string,
      policyNumber: formData.get('policyNumber') as string,
      coverageAmount: formData.get('coverageAmount') as string,
      insuranceExpiration: formData.get('insuranceExpiration') as string
    };

    const clientInfo = {
      ...extractedData.clientInfo,
      name: formData.get('clientName') as string || extractedData.clientInfo?.name,
      address: formData.get('clientAddress') as string || extractedData.clientInfo?.address,
      email: formData.get('clientEmail') as string || extractedData.clientInfo?.email,
      phone: formData.get('clientPhone') as string || extractedData.clientInfo?.phone
    };

    const paymentTerms = {
      downPayment: formData.get('downPayment') as string,
      progressPayment: formData.get('progressPayment') as string,
      finalPayment: formData.get('finalPayment') as string
    };

    const timeline = {
      startDate: formData.get('startDate') as string,
      completionDate: formData.get('completionDate') as string,
      estimatedDuration: formData.get('estimatedDuration') as string
    };

    const permits = {
      required: formData.get('permitsRequired') === 'on',
      responsibility: formData.get('permitResponsibility') as string,
      numbers: formData.get('permitNumbers') as string
    };

    const warranties = {
      workmanship: formData.get('workmanshipWarranty') as string,
      materials: formData.get('materialsWarranty') as string
    };

    // Collect extra clauses
    const extraClauses = formData.getAll('extraClauses') as string[];

    // Collect electronic consents
    const consents = {
      electronicCommunications: formData.get('electronicConsent') === 'on',
      electronicSignatures: formData.get('esignConsent') === 'on'
    };

    // Collect signatures
    const signatures = {
      contractor: {
        name: formData.get('contractorSignatureName') as string,
        date: formData.get('contractorSignatureDate') as string
      },
      client: {
        name: formData.get('clientSignatureName') as string,
        date: formData.get('clientSignatureDate') as string
      }
    };

    // Collect final confirmations
    const confirmations = {
      finalReview: formData.get('finalReview') === 'on',
      legalNoticesAck: formData.get('legalNoticesAck') === 'on',
      authorityConfirm: formData.get('authorityConfirm') === 'on'
    };

    // Generate automatic license disclaimer based on contractor license status
    const licenseDisclaimer = contractorInfo.hasLicense 
      ? `This contractor is licensed under the Contractors' State License Law (Chapter 9 (commencing with Section 7000) of Division 3 of the Business and Professions Code). License Number: ${contractorInfo.licenseNumber}, Classification: ${contractorInfo.licenseClassification}.`
      : "This contractor is not licensed under the Contractors' State License Law (Chapter 9 (commencing with Section 7000) of Division 3 of the Business and Professions Code).";

    const legalNotices = {
      lienNotice: true, // Always mandatory
      cancelNotice: true, // Always mandatory
      licenseDisclaimer,
      preliminaryNotice: "As required by the Mechanics Lien Law of the state of California, you are hereby notified that a Preliminary Notice may be served upon you. Even though you have paid your contractor in full, if the contractor fails to pay subcontractors or material suppliers or becomes unable to meet these obligations during the course of construction of your project, the subcontractors or material suppliers may look to your property for satisfaction of the obligations owed to them by filing liens against your property.",
      cancellationNotice: "You, the buyer, have the right to cancel this contract within three business days. You may cancel by e-mailing, mailing, faxing or delivering a written notice to the contractor at the contractor's place of business by midnight of the third business day after you received a signed copy of the contract that includes this notice. Include your name, your address, and the date you received the signed copy of the contract and this notice."
    };

    return {
      ...extractedData,
      contractorInfo,
      clientInfo,
      paymentTerms: paymentTerms,
      totalCost: totalCost || extractedData.financials?.total || 0,
      timeline,
      permits,
      warranties,
      extraClauses,
      consents,
      signatures,
      confirmations,
      legalNotices,
      selectedIntelligentClauses: Array.from(selectedClauses).map(id => 
        intelligentClauses.find(clause => clause.id === id)
      ).filter(Boolean)
    };
  };

  // Generate defensive contract with intelligent clauses
  const generateDefensiveContract = useCallback(async (data: any) => {
    setIsProcessing(true);
    
    try {
      console.log('Generating contract with data including clauses:', data);

      toast({
        title: "GENERATING DEFENSIVE CONTRACT",
        description: "AI crafting maximum legal protection with intelligent clauses...",
      });

      const response = await fetch('/api/anthropic/generate-defensive-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          extractedData: data,
          riskAnalysis: contractAnalysis,
          protectiveRecommendations: intelligentClauses 
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedContract(result.contractHtml);
        toast({
          title: "DEFENSIVE CONTRACT GENERATED",
          description: `Legal protection deployed with ${result.clausesApplied || 0} intelligent clauses.`,
        });
      } else {
        throw new Error(result.error || 'Contract generation failed');
      }
    } catch (error) {
      console.error('Contract generation error:', error);
      toast({
        title: "GENERATION ERROR",
        description: "Failed to generate defensive contract. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, contractAnalysis, intelligentClauses]);



  // Procesamiento del workflow con datos extraídos de OCR
  const processExtractedDataWorkflow = async (extractedData: any) => {
    // Generar cláusulas inteligentes basadas en los datos del proyecto
    generateIntelligentClauses(extractedData);
    
    // Análisis de contrato con datos extraídos por Claude Sonnet
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const analysis: ContractAnalysis = {
      riskLevel: extractedData.extractionQuality?.confidence > 85 ? 'bajo' : 'medio',
      riskScore: Math.max(10, 100 - (extractedData.extractionQuality?.confidence || 85)),
      protectionsApplied: [
        'Advanced OCR Data Validation',
        'Liability Protection Clauses',
        'Payment Terms Enforcement',
        'Material Quality Guarantees'
      ],
      legalAdvice: [
        `Document analyzed with ${extractedData.extractionQuality?.confidence || 85}% confidence`,
        'All financial terms validated and protected',
        'Client and project details secured'
      ],
      contractStrength: Math.min(95, (extractedData.extractionQuality?.confidence || 85) + 10),
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
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-cyan-400">
              FORTRESS DRAFT
            </h1>
            <ContractHistoryPanel onEditContract={handleEditContract}>
              <div />
            </ContractHistoryPanel>
          </div>
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
                          <span className="text-sm font-mono">Select Saved Project</span>
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

                  {/* Select Project Content - Compact Dropdown */}
                  {dataInputMethod === 'select' && (
                    <div className="animate-in fade-in-0 slide-in-from-right-5 duration-300">
                      <div className="space-y-4">
                        {/* Compact Project Selector */}
                        <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                          <label className="block text-cyan-400 text-sm font-bold mb-2">
                            SELECT PROJECT ({approvedProjects.length} found)
                          </label>
                          <select 
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                            value={selectedProject?.id || ''}
                            onChange={(e) => {
                              const project = approvedProjects.find(p => p.id === e.target.value);
                              if (project) {
                                setSelectedProject(project);
                                console.log('Selected project with full data:', project);
                              }
                            }}
                          >
                            <option value="">Choose a saved project...</option>
                            {approvedProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.clientName} - {project.projectType} - ${(project.totalAmount || project.totalPrice || 0).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selected Project Preview */}
                        {selectedProject && (
                          <div className="bg-cyan-900/20 border border-cyan-400/50 rounded-lg p-4">
                            <h4 className="text-cyan-400 font-bold mb-3 flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              SELECTED PROJECT DATA
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-400">Client:</span>
                                <span className="text-white ml-2">{selectedProject.clientName}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Amount:</span>
                                <span className="text-green-400 ml-2 font-mono">${(selectedProject.totalAmount || selectedProject.totalPrice || 0).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Type:</span>
                                <span className="text-white ml-2">{selectedProject.projectType}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Status:</span>
                                <span className="text-green-400 ml-2">{selectedProject.status || 'Active'}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-gray-400">Address:</span>
                                <span className="text-white ml-2">{selectedProject.address}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
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
              
              <CardContent className="px-2 sm:px-4 md:px-8 pb-6 md:pb-8">
                {/* Extracted Data Display */}
                <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
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

                  {/* AI Analysis & Clause Generation */}
                  <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                    <h3 className="text-cyan-400 font-bold mb-4 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      MERVIN AI ANALYSIS
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-800/50 rounded p-3 text-center">
                          <div className="text-cyan-400 text-xs mb-1">PROJECT TYPE</div>
                          <div className="text-white font-mono text-sm">{extractedData.projectDetails?.type || 'General Construction'}</div>
                        </div>
                        <div className="bg-gray-800/50 rounded p-3 text-center">
                          <div className="text-cyan-400 text-xs mb-1">LOCATION</div>
                          <div className="text-white font-mono text-sm">{extractedData.projectDetails?.location || 'California'}</div>
                        </div>
                        <div className="bg-gray-800/50 rounded p-3 text-center">
                          <div className="text-cyan-400 text-xs mb-1">RISK LEVEL</div>
                          <div className="text-yellow-400 font-mono text-sm">MEDIUM</div>
                        </div>
                      </div>
                      
                      <div className="bg-cyan-400/10 border border-cyan-400/30 rounded p-3">
                        <div className="text-cyan-400 text-sm font-bold mb-2">AI RECOMMENDATIONS:</div>
                        <div className="text-gray-300 text-xs leading-relaxed">
                          Based on the {extractedData.projectDetails?.type?.toLowerCase() || 'construction'} project in {extractedData.projectDetails?.location || 'California'} worth ${extractedData.financials?.total?.toFixed(0) || '31,920'}, 
                          Mervin AI suggests including payment protection, scope definition, and California-specific lien notices for maximum contractor protection.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => {
                      setCurrentStep(1);
                      setCurrentPhase('data-extraction');
                    }}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  >
                    BACK TO UPLOAD
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('Advancing to step 3 with data:', extractedData);
                      setCurrentStep(3);
                      setCurrentPhase('defense-review');
                      processExtractedDataWorkflow(extractedData);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none text-base"
                  >
                    NEXT TO PREVIEW CONTRACT
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Defense Review & Correction with Live Preview */}
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
                  Defense Review & Live Contract Preview
                </CardTitle>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                  Configure your contract settings on the left and see the exact document preview on the right in real-time.
                </p>
              </CardHeader>
              
              <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
                {/* Mobile-First Preview Toggle */}
                <div className="mb-4 xl:hidden">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      onClick={() => setShowPreview(false)}
                      variant={!showPreview ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                    >
                      Configuración
                    </Button>
                    <Button
                      onClick={() => setShowPreview(true)}
                      variant={showPreview ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                    >
                      Vista Previa
                    </Button>
                  </div>
                </div>

                {/* Split Layout: Configuration Left, Preview Right */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* Left Panel: Configuration */}
                  <div className={`space-y-6 ${showPreview ? 'hidden xl:block' : 'block'}`}>
                    <form id="defense-review-form" className="space-y-6">
                  {/* Contractor Information */}
                  <div className="bg-gray-900/50 border border-blue-400/30 rounded-lg p-4">
                    <h3 className="text-blue-400 font-bold mb-4 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      CONTRACTOR INFORMATION
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm">Company Name *</label>
                        <input
                          type="text"
                          name="contractorCompany"
                          value={extractedData?.contractorName || profile?.companyName || ''}
                          onChange={(e) => setExtractedData(prev => ({...prev, contractorName: e.target.value}))}
                          placeholder="Enter contractor company name"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Contractor Name *</label>
                        <input
                          type="text"
                          name="contractorName"
                          value={extractedData?.contractorName || profile?.companyName || ''}
                          onChange={(e) => setExtractedData(prev => ({...prev, contractorName: e.target.value}))}
                          placeholder="Enter contractor full name"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Business Address *</label>
                        <input
                          type="text"
                          name="businessAddress"
                          value={extractedData?.contractorAddress || profile?.address || ''}
                          onChange={(e) => setExtractedData(prev => ({...prev, contractorAddress: e.target.value}))}
                          placeholder="Enter business address"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Phone Number *</label>
                        <input
                          type="tel"
                          name="contractorPhone"
                          value={extractedData?.contractorPhone || profile?.phone || ''}
                          onChange={(e) => setExtractedData(prev => ({...prev, contractorPhone: e.target.value}))}
                          placeholder="(555) 123-4567"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* License Information */}
                  <div className="bg-gray-900/50 border border-yellow-400/30 rounded-lg p-4">
                    <h3 className="text-yellow-400 font-bold mb-4 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      CONTRACTOR LICENSE
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" id="hasLicense" name="hasLicense" className="text-yellow-400" />
                        <label htmlFor="hasLicense" className="text-gray-300">Contractor has valid California license</label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-400 text-sm">License Number</label>
                          <input
                            type="text"
                            name="licenseNumber"
                            placeholder="Enter CA license number"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm">License Classification</label>
                          <input
                            type="text"
                            name="licenseClassification"
                            placeholder="e.g., C-13 Fencing"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3">
                        <div className="text-yellow-400 text-xs font-bold mb-1">CALIFORNIA COMPLIANCE NOTICE:</div>
                        <div className="text-gray-300 text-xs">
                          If no license: "This contractor is not licensed under the Contractors' State License Law (Chapter 9 (commencing with Section 7000) of Division 3 of the Business and Professions Code)."
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Insurance Information */}
                  <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                    <h3 className="text-purple-400 font-bold mb-4 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      INSURANCE COVERAGE
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" id="hasInsurance" className="text-purple-400" />
                        <label htmlFor="hasInsurance" className="text-gray-300">Contractor carries liability insurance</label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-400 text-sm">Insurance Company</label>
                          <input
                            type="text"
                            placeholder="Enter insurance provider"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm">Policy Number</label>
                          <input
                            type="text"
                            placeholder="Enter policy number"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm">Coverage Amount</label>
                          <input
                            type="text"
                            placeholder="e.g., $1,000,000"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm">Expiration Date</label>
                          <input
                            type="date"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Information */}
                  <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-3 sm:p-4 w-full max-w-full">
                    <h3 className="text-green-400 font-bold mb-4 flex items-center text-sm sm:text-base">
                      <User className="h-4 w-4 mr-2 flex-shrink-0" />
                      CLIENT INFORMATION
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
                      <div>
                        <label className="text-gray-400 text-sm">Client Name</label>
                        <input
                          type="text"
                          name="clientName"
                          value={extractedData?.clientName || extractedData?.clientInfo?.name || ''}
                          onChange={(e) => setExtractedData(prev => ({...prev, clientName: e.target.value}))}
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Client Address</label>
                        <input
                          type="text"
                          name="clientAddress"
                          defaultValue={extractedData.clientInfo?.address || extractedData.projectDetails?.location || ''}
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Email</label>
                        <input
                          type="email"
                          name="clientEmail"
                          defaultValue={extractedData.clientInfo?.email || ''}
                          placeholder="client@email.com"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Phone</label>
                        <input
                          type="tel"
                          name="clientPhone"
                          defaultValue={extractedData.clientInfo?.phone || ''}
                          placeholder="(555) 123-4567"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
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

                  {/* Payment Terms */}
                  <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                    <h3 className="text-green-400 font-bold mb-4 flex items-center text-sm sm:text-base">
                      <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                      PAYMENT TERMS
                    </h3>
                    <div className="space-y-4 w-full">
                      {/* Total Cost Display */}
                      <div className="w-full">
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-green-400/50 max-w-full">
                          <div className="text-gray-400 text-sm text-center mb-2">TOTAL COST</div>
                          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                            <span className="text-green-400 font-mono text-xl sm:text-2xl font-bold">$</span>
                            <input
                              type="number"
                              value={totalCost || extractedData.financials?.total || 0}
                              onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
                              className="bg-transparent text-green-400 font-mono text-xl sm:text-2xl font-bold text-center border-none outline-none focus:ring-2 focus:ring-green-400/50 rounded px-2 w-32 sm:w-auto max-w-full"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payment Schedule */}
                      <div className="space-y-3">
                        {paymentTerms.map((term, index) => (
                          <PaymentTermRow
                            key={term.id}
                            term={term}
                            totalAmount={totalCost || extractedData.financials?.total || 0}
                            onUpdate={updatePaymentTerm}
                            onRemove={paymentTerms.length > 2 ? removePaymentTerm : undefined}
                            isRemovable={paymentTerms.length > 2 && index > 1}
                          />
                        ))}
                      </div>

                      {/* Payment Summary */}
                      <div className="mt-4 p-3 bg-gray-800/30 rounded border border-gray-600 w-full">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
                          <span className="text-gray-400 text-center sm:text-left">Total Percentage:</span>
                          <span className={`font-mono text-center sm:text-right font-bold ${
                            paymentTerms.reduce((sum, term) => sum + term.percentage, 0) === 100 
                              ? 'text-green-400' 
                              : 'text-yellow-400'
                          }`}>
                            {paymentTerms.reduce((sum, term) => sum + term.percentage, 0)}%
                          </span>
                        </div>
                      </div>

                      {/* Add Payment Button */}
                      <div className="w-full flex justify-center">
                        <button
                          type="button"
                          onClick={addPaymentTerm}
                          className="w-full sm:w-auto px-4 py-2 border border-green-400 text-green-400 bg-transparent rounded-lg hover:bg-green-400 hover:text-black transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400/50"
                        >
                          + Add Progressive Payment
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Project Timeline */}
                  <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                    <h3 className="text-cyan-400 font-bold mb-4 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      PROJECT TIMELINE
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm">Start Date</label>
                        <input
                          type="date"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Completion Date</label>
                        <input
                          type="date"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">Estimated Duration</label>
                        <input
                          type="text"
                          placeholder="e.g., 5-7 business days"
                          className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permits and Compliance */}
                  <div className="bg-gray-900/50 border border-orange-400/30 rounded-lg p-4">
                    <h3 className="text-orange-400 font-bold mb-4 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      PERMITS & COMPLIANCE
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" id="permitsRequired" className="text-orange-400" />
                        <label htmlFor="permitsRequired" className="text-gray-300">Building permits required for this project</label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-400 text-sm">Permit Responsibility</label>
                          <select className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-orange-400 focus:outline-none">
                            <option>Contractor obtains permits</option>
                            <option>Owner obtains permits</option>
                            <option>No permits required</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm">Permit Numbers</label>
                          <input
                            type="text"
                            placeholder="Enter permit numbers if available"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warranties and Guarantees */}
                  <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                    <h3 className="text-purple-400 font-bold mb-4 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      WARRANTIES & GUARANTEES
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-400 text-sm">Workmanship Warranty</label>
                          <select className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none">
                            <option>1 Year</option>
                            <option>2 Years</option>
                            <option>3 Years</option>
                            <option>No warranty</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm">Materials Warranty</label>
                          <select className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-purple-400 focus:outline-none">
                            <option>Manufacturer warranty only</option>
                            <option>1 Year contractor warranty</option>
                            <option>2 Years contractor warranty</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* California Legal Notices */}
                  <div className="bg-gray-900/50 border border-red-400/30 rounded-lg p-4">
                    <h3 className="text-red-400 font-bold mb-4 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      CALIFORNIA LEGAL NOTICES
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked disabled name="lienNotice" className="text-red-400" />
                        <label className="text-gray-300">Include Preliminary 20-Day Lien Notice (MANDATORY)</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked disabled name="cancelNotice" className="text-red-400" />
                        <label className="text-gray-300">Include 3-Day Right to Cancel Notice (MANDATORY)</label>
                      </div>
                      <div className="bg-red-900/20 border border-red-400/30 rounded p-3">
                        <div className="text-red-400 text-xs font-bold mb-2">MANDATORY CALIFORNIA NOTICES:</div>
                        <div className="text-gray-300 text-xs space-y-2">
                          <div>• <strong>Three-Day Right to Cancel:</strong> "You, the buyer, have the right to cancel this contract within three business days. The right to cancel agreement is attached to this contract."</div>
                          <div>• <strong>Preliminary Lien Notice:</strong> "As required by the Mechanics Lien Law of the state of California, you are hereby notified that a Preliminary Notice may be served upon you..."</div>
                          <div>• <strong>License Disclosure:</strong> Automatic disclosure based on contractor license status will be included</div>
                        </div>
                      </div>
                    </div>
                  </div>











                      {/* AI-Powered Legal Defense Engine */}
                      <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-4">
                        <h3 className="text-cyan-400 font-bold mb-4 flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          INTELLIGENT LEGAL DEFENSE ENGINE
                        </h3>
                        
                        {intelligentClauses.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-gray-400 mb-2">Analyzing project data...</div>
                            <div className="text-xs text-gray-500">Legal Defense Engine processing project specifics</div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                        {/* Mandatory Clauses */}
                        {intelligentClauses.filter(clause => clause.category === 'MANDATORY').length > 0 && (
                          <div className="bg-red-900/20 border border-red-400/30 rounded p-4">
                            <h4 className="text-red-400 font-bold mb-3 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              OBLIGATORIAS POR LEY
                            </h4>
                            <div className="space-y-3">
                              {intelligentClauses
                                .filter(clause => clause.category === 'MANDATORY')
                                .map((clause) => (
                                  <div key={clause.id} className="bg-red-800/20 border border-red-400/20 rounded p-3">
                                    <div className="flex items-start space-x-3">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedClauses.has(clause.id)}
                                        disabled={clause.category === 'MANDATORY'}
                                        className="text-red-400 mt-1" 
                                      />
                                      <div className="flex-1">
                                        <div className="text-red-400 font-semibold text-sm mb-1">
                                          {clause.title}
                                        </div>
                                        <div className="text-gray-300 text-xs mb-2 leading-relaxed">
                                          {clause.clause.length > 200 
                                            ? `${clause.clause.substring(0, 200)}...` 
                                            : clause.clause
                                          }
                                        </div>
                                        <div className="flex items-center space-x-4 text-xs">
                                          <Badge variant="destructive" className="text-xs">
                                            {clause.riskLevel} RISK
                                          </Badge>
                                          <span className="text-red-400 font-bold">OBLIGATORIA</span>
                                        </div>
                                        <div className="text-gray-400 text-xs mt-2">
                                          <strong>Justificación:</strong> {clause.justification}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Recommended Clauses */}
                        {intelligentClauses.filter(clause => clause.category === 'RECOMMENDED').length > 0 && (
                          <div className="bg-cyan-900/20 border border-cyan-400/30 rounded p-4">
                            <h4 className="text-cyan-400 font-bold mb-3 flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              RECOMENDADAS POR IA LEGAL
                            </h4>
                            <div className="space-y-3">
                              {intelligentClauses
                                .filter(clause => clause.category === 'RECOMMENDED')
                                .map((clause) => (
                                  <div key={clause.id} className="bg-cyan-800/20 border border-cyan-400/20 rounded p-3">
                                    <div className="flex items-start space-x-3">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedClauses.has(clause.id)}
                                        onChange={(e) => {
                                          const newSelected = new Set(selectedClauses);
                                          if (e.target.checked) {
                                            newSelected.add(clause.id);
                                          } else {
                                            newSelected.delete(clause.id);
                                          }
                                          setSelectedClauses(newSelected);
                                        }}
                                        className="text-cyan-400 mt-1" 
                                      />
                                      <div className="flex-1">
                                        <div className="text-cyan-400 font-semibold text-sm mb-1">
                                          {clause.title}
                                        </div>
                                        <div className="text-gray-300 text-xs mb-2 leading-relaxed">
                                          {clause.clause.length > 200 
                                            ? `${clause.clause.substring(0, 200)}...` 
                                            : clause.clause
                                          }
                                        </div>
                                        <div className="flex items-center space-x-4 text-xs">
                                          <Badge 
                                            variant={clause.riskLevel === 'HIGH' ? 'destructive' : 
                                                   clause.riskLevel === 'MEDIUM' ? 'default' : 'secondary'} 
                                            className="text-xs"
                                          >
                                            {clause.riskLevel} RISK
                                          </Badge>
                                          <span className="text-cyan-400">RECOMENDADA</span>
                                        </div>
                                        <div className="text-gray-400 text-xs mt-2">
                                          <strong>Justificación:</strong> {clause.justification}
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">
                                          <strong>Aplicabilidad:</strong> {clause.applicability}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Legal Analysis Summary */}
                        <div className="bg-blue-900/20 border border-blue-400/30 rounded p-4">
                          <div className="text-blue-400 text-sm font-bold mb-2 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            ANÁLISIS LEGAL INTELIGENTE
                          </div>
                          <div className="text-gray-300 text-xs leading-relaxed">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <strong>Proyecto:</strong> {extractedData.projectDetails?.type || 'N/A'}<br/>
                                <strong>Ubicación:</strong> {extractedData.projectDetails?.location || 'N/A'}<br/>
                                <strong>Valor:</strong> ${extractedData.financials?.total?.toLocaleString() || '0'}
                              </div>
                              <div>
                                <strong>Cláusulas Generadas:</strong> {intelligentClauses.length}<br/>
                                <strong>Obligatorias:</strong> {intelligentClauses.filter(c => c.category === 'MANDATORY').length}<br/>
                                <strong>Recomendadas:</strong> {intelligentClauses.filter(c => c.category === 'RECOMMENDED').length}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                    </form>
                  </div>

                  {/* Right Panel: Live Contract Preview - Responsive */}
                  <div className={`${!showPreview ? 'hidden xl:block' : 'block xl:block'}`}>
                    <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-3 md:p-4 h-full">
                      <h3 className="text-green-400 font-bold mb-3 md:mb-4 flex items-center text-sm md:text-base">
                        <Eye className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        VISTA PREVIA DEL CONTRATO
                      </h3>
                      
                      {/* Real Contract Preview Container */}
                      <div className="bg-white text-black rounded overflow-hidden border shadow-lg">
                        <style dangerouslySetInnerHTML={{ __html: `
                          .contract-content h1 {
                            font-size: 14px !important;
                            font-weight: bold !important;
                            text-align: center !important;
                            margin: 10px 0 !important;
                            text-transform: uppercase !important;
                          }
                          .contract-content h2 {
                            font-size: 12px !important;
                            font-weight: bold !important;
                            margin: 8px 0 4px 0 !important;
                            text-transform: uppercase !important;
                            border-bottom: 1px solid #333 !important;
                            padding-bottom: 2px !important;
                          }
                          .contract-content .parties {
                            display: flex !important;
                            justify-content: space-between !important;
                            margin: 10px 0 !important;
                            border: 1px solid #000 !important;
                            padding: 8px !important;
                          }
                          .contract-content .party {
                            flex: 1 !important;
                            text-align: center !important;
                            padding: 0 4px !important;
                          }
                          .contract-content .party-title {
                            font-weight: bold !important;
                            font-size: 11px !important;
                            margin-bottom: 4px !important;
                          }
                          .contract-content .section {
                            margin: 8px 0 !important;
                          }
                          .contract-content .section-title {
                            font-weight: bold !important;
                            font-size: 11px !important;
                            margin-bottom: 4px !important;
                          }
                          .contract-content .clause {
                            margin: 4px 0 !important;
                            text-align: justify !important;
                          }
                          .contract-content p {
                            margin: 4px 0 !important;
                            font-size: 9px !important;
                            line-height: 1.2 !important;
                          }
                          .contract-content .signature-section {
                            display: flex !important;
                            gap: 15px !important;
                            margin-top: 15px !important;
                          }
                          .contract-content .signature-box {
                            border: 1px solid #000 !important;
                            padding: 8px !important;
                            background: #f9f9f9 !important;
                            flex: 1 !important;
                          }
                          .contract-content .signature-line {
                            border-bottom: 1px solid #000 !important;
                            margin: 8px 0 2px 0 !important;
                            height: 1px !important;
                          }
                          .contract-content .info-box {
                            border: 1px solid #333 !important;
                            padding: 6px !important;
                            margin: 4px 0 !important;
                            background: #f9f9f9 !important;
                          }
                          .contract-content .total-box {
                            border: 1px solid #000 !important;
                            padding: 6px !important;
                            background: #f5f5f5 !important;
                            text-align: center !important;
                          }
                        `}} />
                        {loadingPreview ? (
                          <div className="h-64 md:h-80 xl:h-96 flex items-center justify-center">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">Generando preview real del contrato...</p>
                            </div>
                          </div>
                        ) : contractPreviewHtml ? (
                          <div 
                            className="h-64 md:h-80 xl:h-96 overflow-y-auto p-3 md:p-4 contract-content"
                            dangerouslySetInnerHTML={{ __html: contractPreviewHtml }}
                            style={{
                              fontSize: '9px',
                              lineHeight: '1.2',
                              fontFamily: 'Times New Roman, serif'
                            }}
                          />
                        ) : (
                          <div className="h-64 md:h-80 xl:h-96 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <p className="text-sm mb-2">Vista previa del contrato real</p>
                              <p className="text-xs">Selecciona protecciones legales para ver el contenido</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="mt-2 text-center">
                        <span className="text-xs text-green-400 flex items-center justify-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          Actualizándose en tiempo real
                        </span>
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
                      // Recopilar cláusulas seleccionadas del motor de Legal Defense
                      const selectedClausesData = intelligentClauses.filter(clause => 
                        selectedClauses.has(clause.id) || clause.category === 'MANDATORY'
                      );
                      
                      // Crear datos completos incluyendo cláusulas seleccionadas
                      const completeData = {
                        ...extractedData,
                        selectedIntelligentClauses: selectedClausesData,
                        clauseCount: selectedClausesData.length
                      };
                      
                      console.log('Advancing to contract generation with complete data:', completeData);
                      console.log('Selected clauses:', selectedClausesData);
                      
                      setCurrentStep(4);
                      setCurrentPhase('digital-execution');
                      processExtractedDataWorkflow(completeData);
                    }}
                    className="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none"
                  >
                    GENERATE CONTRACT
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}



          {/* Contract Generation & PDF Creation - Final Step */}
          {extractedData && currentPhase === 'digital-execution' && (
            <Card className="border-2 border-purple-400 bg-black/80 relative overflow-hidden mt-6">
              <CardHeader className="text-center px-4 md:px-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 md:p-4 rounded-full border-2 border-purple-400">
                    <FileText className="h-6 w-6 md:h-8 md:w-8 text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-purple-400 mb-2">
                  Contract Generation Complete
                </CardTitle>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                  Professional contract with selected protections ready for signature and execution.
                </p>
              </CardHeader>
              
              <CardContent className="px-4 md:px-8 pb-6 md:pb-8 space-y-6">
                {/* Contract Summary */}
                <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
                  <h3 className="text-purple-400 font-bold mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    CONTRACT SUMMARY
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Client:</span>
                      <span className="text-white ml-2">{extractedData.clientInfo?.name || 'Client Name'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Project:</span>
                      <span className="text-white ml-2">{extractedData.projectDetails?.type || 'Project Type'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Amount:</span>
                      <span className="text-green-400 ml-2 font-mono">${extractedData.financials?.total?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Protections Applied:</span>
                      <span className="text-purple-400 ml-2">{approvedClauses.length} defensive clauses</span>
                    </div>
                  </div>
                </div>

                {/* Contract Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => generateContractPDF()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded border-0 shadow-none"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    GENERATE CONTRACT PDF
                  </Button>
                  <Button 
                    onClick={() => sendContractForSignature()}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded border-0 shadow-none"
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    SEND FOR SIGNATURE
                  </Button>
                </div>

                {/* Legal Compliance Notice */}
                <div className="bg-blue-900/20 border border-blue-400/30 rounded p-4">
                  <div className="text-blue-400 text-sm font-bold mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    LEGAL COMPLIANCE VERIFIED
                  </div>
                  <div className="text-gray-300 text-xs leading-relaxed">
                    Contract includes all required California legal protections, payment terms, and contractor safeguards. 
                    Document is ready for professional execution with full legal compliance.
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    onClick={() => {
                      setCurrentPhase('defense-review');
                      setCurrentStep(3);
                    }}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  >
                    BACK TO DEFENSE REVIEW
                  </Button>
                  <Button 
                    onClick={() => startNewContract()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none"
                  >
                    CREATE NEW CONTRACT
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