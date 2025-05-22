import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Download,
  Send,
  FileSignature,
  Eye, 
  PlusCircle 
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

const ContractGenerator = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados
  const [view, setView] = useState<'dashboard' | 'survey' | 'preview'>('dashboard');
  const [contractData, setContractData] = useState<Record<string, any>>({});
  const [contractHtml, setContractHtml] = useState<string>("");
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Load the contract template
  const contractTemplateQuery = useQuery({
    queryKey: ['contractTemplate'],
    queryFn: async () => {
      try {
        // Cargar desde la carpeta public (accesible para el backend también)
        const response = await fetch('/templates/contract-template.html');
        if (!response.ok) {
          throw new Error('Error loading contract template from public folder');
        }
        console.log("Plantilla cargada correctamente desde /public/templates");
        return await response.text();
      } catch (error) {
        console.error("Error loading template from public folder:", error);
        
        // Intentar cargar desde la ruta alternativa
        try {
          console.log("Intentando cargar plantilla con ruta alternativa...");
          const response = await fetch('/client/public/templates/contract-template.html');
          if (!response.ok) {
            throw new Error('Error loading contract template from alternative path');
          }
          return await response.text();
        } catch (altError) {
          console.error("Error loading template from alternative path:", altError);
          throw new Error('No se pudo cargar la plantilla de contrato');
        }
      }
    },");
          return templateModule.default;
        } catch (secondError) {
          console.error("Error loading template with direct import:", secondError);
          
          // Tercera opción: Intentar con ruta relativa
          try {
            const fallbackResponse = await fetch('/src/templates/contract-template.html');
            if (!fallbackResponse.ok) {
              throw new Error('Error loading contract template from src folder');
            }
            console.log("Plantilla cargada desde src/templates");
            return await fallbackResponse.text();
          } catch (thirdError) {
            console.error("All template loading methods failed:", thirdError);
            throw new Error("No se pudo cargar la plantilla del contrato por ningún método");
          }
        }
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
      
      // Cambiar a la vista de previsualización
      setView("preview");

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

  // Iniciar nuevo contrato
  const handleCreateNew = () => {
    setContractData({});
    setContractHtml("");
    setSelectedContract(null);
    setView("survey");
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
          {view !== "dashboard" && (
            <Button variant="outline" onClick={() => setView("dashboard")}>
              Volver al Dashboard
            </Button>
          )}
        </div>

        {/* Vistas condicionales */}
        {view === "dashboard" && (
          <ContractDashboard 
            contracts={contractsQuery.data || []}
            isLoading={contractsQuery.isLoading}
            onPreview={handlePreview}
            onDownload={(id) => downloadMutation.mutate(id)}
            onCreateNew={handleCreateNew}
            onSendEmail={(id) => sendEmailMutation.mutate(id)}
            onSign={(id) => signContractMutation.mutate(id)}
          />
        )}

        {view === "survey" && (
          <NewContractSurveyFlow 
            onComplete={handleSurveyComplete}
            onPreview={handleSurveyPreview}
          />
        )}

        {view === "preview" && (
          <ContractPreviewEditable 
            html={contractHtml}
            contractData={contractData}
            onApprove={handleApproveContract}
            onEdit={handleEditField}
            onDownload={handleDownloadPDF}
            onSendEmail={handleSendEmail}
            onSign={handleSign}
          />
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