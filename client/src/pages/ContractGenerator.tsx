import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Download,
  Send,
  FileSignature,
  Eye, 
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  Shield,
  FileText,
  FileCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ContractDashboard from "@/components/contract/ContractDashboard";
import ContractPreview from "@/components/templates/ContractPreview";
import ContractPreviewEditable from "@/components/contract/ContractPreviewEditable";
import NewContractSurveyFlow from "@/components/contract/NewContractSurveyFlow";
import { formatAnswersForContract } from "@/services/newContractQuestionService";

// Interfaces
interface Contract {
  id: number;
  title: string;
  clientName: string;
  createdAt: string; // ISO date string
  status: 'draft' | 'sent' | 'signed' | 'completed';
  contractType: string;
  html?: string;
}

// Definir los pasos del Contract Generator siguiendo el patrón de EstimatesWizard
const STEPS = [
  { id: 'extract', title: 'Extraer Datos', icon: Upload, description: 'Extraer datos del proyecto' },
  { id: 'analyze', title: 'Análisis Legal', icon: Shield, description: 'Análisis de riesgo legal' },
  { id: 'generate', title: 'Generar Contrato', icon: FileText, description: 'Generación del contrato' },
  { id: 'preview', title: 'Vista Previa', icon: FileCheck, description: 'Revisar y finalizar' }
];

const ContractGenerator = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para navegación por pasos
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreateMode, setIsCreateMode] = useState(false);
  
  // Estados existentes adaptados
  const [contractData, setContractData] = useState<Record<string, any>>({});
  const [contractHtml, setContractHtml] = useState<string>("");
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Nuevos estados para el flujo por pasos
  const [extractedData, setExtractedData] = useState<any>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Load the contract template
  const contractTemplateQuery = useQuery({
    queryKey: ['contractTemplate'],
    queryFn: async () => {
      try {
        // Cargar exclusivamente desde la carpeta public
        const response = await fetch('/templates/contract-template.html');
        if (!response.ok) {
          throw new Error('Error loading contract template from public folder');
        }
        console.log("Plantilla cargada correctamente desde /public/templates");
        return await response.text();
      } catch (error) {
        console.error("Error loading template from public folder:", error);
        throw new Error('No se pudo cargar la plantilla de contrato');
      }
    }
  });

  // Consulta para obtener la lista de contratos
  const contractsQuery = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/contracts');
        if (!response.ok) {
          throw new Error('Error al cargar contratos');
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error cargando contratos:", error);
        // En desarrollo, retornar datos de muestra si el backend no está listo
        if (process.env.NODE_ENV === 'development') {
          return sampleContracts;
        }
        throw error;
      }
    }
  });
  
  // Mutación para enviar contrato por email
  const sendEmailMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}/send-email`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar contrato por email');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contrato enviado",
        description: "El contrato ha sido enviado por email al cliente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
    },
    onError: (error) => {
      console.error('Error enviando contrato:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el contrato por email. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para firmar contrato
  const signContractMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}/sign`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error al firmar contrato');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contrato firmado",
        description: "Tu firma ha sido añadida al contrato",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
    },
    onError: (error) => {
      console.error('Error firmando contrato:', error);
      toast({
        title: "Error",
        description: "No se pudo firmar el contrato. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para descargar un contrato como PDF
  const downloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}/download`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Error al descargar contrato');
      }
      
      return await response.blob();
    },
    onSuccess: (data, id) => {
      // Crear URL y descargar
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Contrato descargado",
        description: "El contrato ha sido descargado como PDF",
      });
    },
    onError: (error) => {
      console.error('Error descargando contrato:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el contrato. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
    }
  });

  // Generar contrato a partir de los datos recopilados y la plantilla
  const generateContract = async (data: Record<string, any>) => {
    setIsGeneratingContract(true);
    try {
      // Obtener la plantilla HTML
      let templateHtml = contractTemplateQuery.data || "";
      
      if (!templateHtml) {
        throw new Error("No se pudo cargar la plantilla del contrato");
      }
      
      // Formatear datos para la plantilla (usando el formato de la nueva plantilla)
      const formattedData = formatAnswersForContract(data);
      
      // Guardar los datos del contrato para su uso posterior
      setContractData(formattedData);
      
      // Reemplazar variables en la plantilla
      Object.entries(formattedData).forEach(([section, sectionData]) => {
        if (typeof sectionData === 'object' && sectionData !== null) {
          Object.entries(sectionData).forEach(([key, value]) => {
            const placeholder = `{{${section}.${key}}}`;
            templateHtml = templateHtml.replace(new RegExp(placeholder, 'g'), value as string || "");
          });
        }
      });
      
      // Intentar generar contrato con la API si está disponible
      try {
        const response = await fetch("/api/generate-contract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData),
        });

        if (response.ok) {
          const result = await response.json();
          setContractHtml(result.html);
        } else {
          // Si la API falla, usar la plantilla procesada localmente
          setContractHtml(templateHtml);
        }
      } catch (apiError) {
        console.warn("Error en API de generación, usando plantilla local:", apiError);
        // Usar la plantilla procesada localmente
        setContractHtml(templateHtml);
      }
      
      // Avanzar al paso de previsualización
      setCurrentStep(3);

      toast({
        title: "¡Contrato generado!",
        description: "El contrato ha sido generado correctamente",
      });
    } catch (error) {
      console.error("Error generando contrato:", error);
      toast({
        title: "Error de generación",
        description: "No se pudo generar el contrato. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContract(false);
    }
  };
  
  // Vista previa de un contrato existente
  const handlePreview = async (contract: Contract) => {
    setSelectedContract(contract);
    
    // Si ya tenemos el HTML, mostrarlo directamente
    if (contract.html) {
      setContractHtml(contract.html);
      setIsPreviewOpen(true);
      return;
    }
    
    // De lo contrario, obtenerlo del servidor
    try {
      const response = await fetch(`/api/contracts/${contract.id}`);
      if (!response.ok) {
        throw new Error('Error al cargar el contrato');
      }
      
      const data = await response.json();
      setContractHtml(data.html || '');
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error cargando contrato:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la vista previa del contrato",
        variant: "destructive",
      });
    }
  };
  
  // Descargar contrato como PDF
  const handleDownloadPDF = async () => {
    try {
      // Preparar los datos para generar PDF, enviando tanto el HTML como la plantilla
      // para garantizar que el PDF se vea igual que la vista previa
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: contractHtml,
          filename: `contrato-${Date.now()}.pdf`,
          templatePath: '/templates/contract-template.html',
          contractData: contractData, // Enviar los datos estructurados del contrato
        }),
      });

      if (!response.ok) {
        throw new Error("Error al generar el PDF");
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `contrato-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF descargado",
        description: "El contrato ha sido descargado como PDF",
      });
    } catch (error) {
      console.error("Error descargando PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  // Enviar contrato por email
  const handleSendEmail = async () => {
    if (selectedContract) {
      sendEmailMutation.mutate(selectedContract.id);
    } else {
      // Si es un contrato nuevo, guardarlo primero y luego enviarlo
      toast({
        title: "Guardando contrato",
        description: "El contrato debe ser guardado antes de enviarlo",
      });
      // Aquí implementarías la lógica para guardar el contrato nuevo
    }
  };

  // Firmar contrato
  const handleSign = async () => {
    if (selectedContract) {
      signContractMutation.mutate(selectedContract.id);
    } else {
      toast({
        title: "Guardando contrato",
        description: "El contrato debe ser guardado antes de firmarlo",
      });
      // Aquí implementarías la lógica para guardar el contrato nuevo
    }
  };

  // Manejar la edición de campos en el preview
  const handleEditField = (key: string, value: string) => {
    const newContractData = { ...contractData };
    
    // Modificar el valor anidado
    const keys = key.split('.');
    let current = newContractData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setContractData(newContractData);
    
    // Regenerar el contrato con los datos actualizados
    generateContract(newContractData);
  };

  // Manejar aprobación del contrato
  const handleApproveContract = () => {
    // Aquí se implementaría la lógica para guardar el contrato aprobado
    toast({
      title: "Contrato aprobado",
      description: "El contrato ha sido aprobado correctamente",
    });
  };

  // Manejar la finalización del survey para mostrar la vista previa
  const handleSurveyComplete = (data: Record<string, any>) => {
    setContractData(data);
    generateContract(data);
  };

  // Manejar la vista previa desde el survey
  const handleSurveyPreview = (data: Record<string, any>) => {
    setContractData(data);
    generateContract(data);
  };

  // Funciones de navegación por pasos
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
      case 0: // Extract Data
        return extractedData !== null;
      case 1: // Legal Risk Analysis
        return riskAnalysis !== null;
      case 2: // Generate Contract
        return contractHtml !== "";
      case 3: // Preview
        return true;
      default:
        return false;
    }
  };

  // Iniciar nuevo contrato (modo de creación por pasos)
  const handleCreateNew = () => {
    setContractData({});
    setContractHtml("");
    setSelectedContract(null);
    setExtractedData(null);
    setRiskAnalysis(null);
    setCurrentStep(0);
    setIsCreateMode(true);
  };

  // Volver al dashboard
  const handleBackToDashboard = () => {
    setIsCreateMode(false);
    setCurrentStep(0);
    setContractData({});
    setContractHtml("");
    setExtractedData(null);
    setRiskAnalysis(null);
  };

  // Datos de ejemplo para desarrollo
  const sampleContracts: Contract[] = [
    {
      id: 1,
      title: "Contrato de Cercado - Residencia García",
      clientName: "Eduardo García",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "completed",
      contractType: "Cerca de Privacidad",
    },
    {
      id: 2,
      title: "Contrato de Cercado - Negocio Flores",
      clientName: "María Flores",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: "signed",
      contractType: "Cerca Comercial",
    },
    {
      id: 3,
      title: "Contrato de Cercado - Residencia Martínez",
      clientName: "Roberto Martínez",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "sent",
      contractType: "Cerca de Aluminio",
    },
    {
      id: 4,
      title: "Contrato de Cercado - Propiedad Vázquez",
      clientName: "Ana Vázquez",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: "draft",
      contractType: "Cerca de Vinilo",
    },
  ];

  // Renderizar contenido según el paso actual
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Extract Data
        return (
          <NewContractSurveyFlow 
            onComplete={(data) => {
              setExtractedData(data);
              setContractData(data);
              nextStep();
            }}
            onPreview={(data) => {
              setExtractedData(data);
              setContractData(data);
            }}
          />
        );
      
      case 1: // Legal Risk Analysis
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Análisis de Riesgo Legal</h3>
              <p className="text-muted-foreground">
                Analizando datos del contrato para identificar riesgos legales y problemas de cumplimiento
              </p>
            </div>
            
            {isAnalyzing ? (
              <div className="text-center py-8">
                <div className="relative">
                  <div className="animate-spin h-12 w-12 border-4 border-yellow-200 border-t-yellow-500 rounded-full mx-auto mb-4"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Analizando riesgos legales...</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>✓ Revisando cláusulas de protección</div>
                    <div>✓ Verificando cumplimiento normativo</div>
                    <div>✓ Evaluando términos de responsabilidad</div>
                  </div>
                </div>
              </div>
            ) : riskAnalysis ? (
              <div className="bg-card p-6 rounded-lg border">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold">Análisis de Riesgo Completado</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">BAJO</div>
                    <div className="text-sm text-muted-foreground">Riesgo General</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">95%</div>
                    <div className="text-sm text-muted-foreground">Puntuación de Cumplimiento</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">3</div>
                    <div className="text-sm text-muted-foreground">Recomendaciones</div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">Protecciones Identificadas:</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Cláusulas de limitación de responsabilidad incluidas</li>
                    <li>• Términos de pago adecuados para protección del contratista</li>
                    <li>• Condiciones de modificaciones del proyecto establecidas</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-yellow-50 p-6 rounded-lg mb-4">
                  <p className="text-yellow-800 mb-4">
                    Iniciará el análisis automático de riesgos legales basado en los datos extraídos del proyecto.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setIsAnalyzing(true);
                    setTimeout(() => {
                      setRiskAnalysis({ risk: 'low', score: 95, recommendations: 3 });
                      setIsAnalyzing(false);
                    }, 3000);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700"
                  disabled={!extractedData}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Iniciar Análisis de Riesgo
                </Button>
              </div>
            )}
          </div>
        );
      
      case 2: // Generate Contract
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Generar Contrato</h3>
              <p className="text-muted-foreground">
                Creando contrato profesional basado en los datos extraídos y análisis de riesgo
              </p>
            </div>
            
            {isGeneratingContract ? (
              <div className="text-center py-8">
                <div className="relative">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-4"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Generando contrato profesional...</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>✓ Aplicando plantilla legal</div>
                    <div>✓ Insertando datos del proyecto</div>
                    <div>✓ Añadiendo cláusulas de protección</div>
                    <div>✓ Aplicando análisis de riesgo</div>
                  </div>
                </div>
              </div>
            ) : contractHtml ? (
              <div className="bg-card p-6 rounded-lg border">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold">Contrato Generado Exitosamente</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{extractedData?.clientName || 'Cliente'}</div>
                    <div className="text-sm text-muted-foreground">Nombre del Cliente</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{extractedData?.totalAmount || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">Monto Total</div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <h5 className="font-medium text-green-800 mb-2">Características del Contrato:</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Cláusulas de protección legal incluidas</li>
                    <li>• Términos y condiciones personalizados</li>
                    <li>• Formato profesional y legalmente sólido</li>
                    <li>• Listo para firma y envío</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep(3)} className="bg-blue-600 hover:bg-blue-700">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Vista Previa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-blue-50 p-6 rounded-lg mb-4">
                  <p className="text-blue-800 mb-4">
                    Está listo para generar el contrato usando la información extraída y el análisis de riesgo completado.
                  </p>
                  {extractedData && (
                    <div className="text-sm text-blue-600 space-y-1">
                      <div>Cliente: {extractedData.clientName}</div>
                      <div>Proyecto: {extractedData.projectType}</div>
                      <div>Monto: {extractedData.totalAmount}</div>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => generateContract(contractData)}
                  disabled={!extractedData || !riskAnalysis}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generar Contrato Profesional
                </Button>
                {(!extractedData || !riskAnalysis) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete los pasos anteriores para continuar
                  </p>
                )}
              </div>
            )}
          </div>
        );
      
      case 3: // Preview
        return contractHtml ? (
          <ContractPreviewEditable 
            html={contractHtml}
            contractData={contractData}
            onApprove={handleApproveContract}
            onEdit={handleEditField}
            onDownload={handleDownloadPDF}
            onSendEmail={handleSendEmail}
            onSign={handleSign}
          />
        ) : (
          <div className="text-center py-8">
            <p>No contract available for preview</p>
          </div>
        );
      
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Generador de Contratos</h1>
            <p className="text-muted-foreground">
              Crea, gestiona y envía contratos profesionales a tus clientes
            </p>
          </div>
          {isCreateMode && (
            <Button variant="outline" onClick={handleBackToDashboard}>
              Volver al Dashboard
            </Button>
          )}
        </div>

        {/* Mostrar Dashboard o flujo de creación por pasos */}
        {!isCreateMode ? (
          <ContractDashboard 
            contracts={contractsQuery.data || []}
            isLoading={contractsQuery.isLoading}
            onPreview={handlePreview}
            onDownload={(id) => downloadMutation.mutate(id)}
            onCreateNew={handleCreateNew}
            onSendEmail={(id) => sendEmailMutation.mutate(id)}
            onSign={(id) => signContractMutation.mutate(id)}
          />
        ) : (
          <div className="space-y-8">
            {/* Step Navigation - Circular Progress Style */}
            <div className="bg-card p-8 rounded-lg border">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-8 overflow-x-auto">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    const isClickable = index <= currentStep;

                    return (
                      <div key={step.id} className="flex items-center">
                        <button
                          onClick={() => isClickable && setCurrentStep(index)}
                          disabled={!isClickable}
                          className={`flex flex-col items-center space-y-2 p-4 rounded-xl transition-all duration-300 min-w-[120px] ${
                            isActive 
                              ? 'bg-cyan-500 text-white shadow-lg transform scale-105' 
                              : isCompleted 
                                ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer shadow-md' 
                                : isClickable
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isActive 
                              ? 'bg-white/20 ring-4 ring-white/30' 
                              : isCompleted 
                                ? 'bg-white/20' 
                                : 'bg-white/10'
                          }`}>
                            {isCompleted ? (
                              <Check className="h-6 w-6" />
                            ) : (
                              <Icon className="h-6 w-6" />
                            )}
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-sm">{step.title}</div>
                            <div className="text-xs opacity-80">{step.description}</div>
                          </div>
                        </button>
                        
                        {index < STEPS.length - 1 && (
                          <div className="flex items-center mx-4">
                            <div
                              className={`w-12 h-1 rounded-full transition-all duration-500 ${
                                isCompleted ? 'bg-green-500' : 'bg-gray-600'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progreso del Contrato</span>
                  <span>{Math.round(((currentStep + 1) / STEPS.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Current Step Content */}
            <div className="mb-8">
              {renderCurrentStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                {currentStep === STEPS.length - 1 ? (
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={!contractHtml}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Finalizar y </span>Descargar
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceedToNext()}
                    className="w-full sm:w-auto"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Diálogo para vista previa del contrato existente */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa del contrato</DialogTitle>
          </DialogHeader>
          {contractHtml ? (
            <>
              <ContractPreview html={contractHtml} />
              <div className="flex justify-between mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Cerrar
                </Button>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (selectedContract) {
                        sendEmailMutation.mutate(selectedContract.id);
                      }
                    }}
                    disabled={sendEmailMutation.isPending || !selectedContract}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (selectedContract) {
                        signContractMutation.mutate(selectedContract.id);
                      }
                    }}
                    disabled={signContractMutation.isPending || !selectedContract}
                  >
                    <FileSignature className="mr-2 h-4 w-4" />
                    Firmar
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      if (selectedContract) {
                        downloadMutation.mutate(selectedContract.id);
                      } else {
                        handleDownloadPDF();
                      }
                      setIsPreviewOpen(false);
                    }}
                    disabled={downloadMutation.isPending}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-10">
              <p className="text-muted-foreground">
                Cargando vista previa...
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractGenerator;