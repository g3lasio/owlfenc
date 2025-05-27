import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import NewContractSurveyFlow from "@/components/contract/NewContractSurveyFlow";
import ContractPreviewEditable from "@/components/contract/ContractPreviewEditable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAnswersForContract } from "@/services/newContractQuestionService";
import { generateContractWithAnthropic } from "@/services/anthropicContractService";
import { 
  FileText, 
  Zap, 
  Shield, 
  Brain, 
  Plus,
  Download,
  Send,
  Eye,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Clock,
  ArrowLeft
} from "lucide-react";

interface Contract {
  id: number;
  title: string;
  clientName: string;
  createdAt: string;
  status: 'draft' | 'sent' | 'signed' | 'completed';
  contractType: string;
  html?: string;
}

const CyberpunkContractGenerator = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados principales
  const [view, setView] = useState<'dashboard' | 'survey' | 'preview'>('dashboard');
  const [contractData, setContractData] = useState<Record<string, any>>({});
  const [contractHtml, setContractHtml] = useState<string>("");
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Query para cargar contratos reales del backend
  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const response = await fetch('/api/contracts');
      if (!response.ok) {
        if (response.status === 401) {
          return []; // Usuario no autenticado, devolver array vacío
        }
        throw new Error('Error loading contracts');
      }
      return await response.json();
    },
    retry: false
  });

  // Cargar plantilla de contrato
  const contractTemplateQuery = useQuery({
    queryKey: ['contractTemplate'],
    queryFn: async () => {
      const response = await fetch('/templates/contract-template.html');
      if (!response.ok) {
        throw new Error('Error loading contract template');
      }
      return await response.text();
    }
  });

  // Mutación para generar contrato
  const generateContractMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const template = contractTemplateQuery.data || "";
      return generateContractWithAnthropic(data, template, 'professional');
    },
    onSuccess: (result) => {
      if (result.success) {
        setContractHtml(result.html);
        setView("preview");
        toast({
          title: "🎯 Contrato Generado",
          description: "Tu contrato inteligente está listo para revisión",
        });
      } else {
        throw new Error(result.error || 'Error generating contract');
      }
    },
    onError: (error) => {
      toast({
        title: "Error de Generación",
        description: "No se pudo generar el contrato. Inténtalo nuevamente.",
        variant: "destructive",
      });
    }
  });

  // Mutación para descargar contrato
  const downloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}/download`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "⬇️ Descarga Completa",
        description: "El contrato se ha descargado exitosamente",
      });
    }
  });

  // Mutación para enviar por email
  const sendEmailMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}/send-email`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Send failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "📧 Email Enviado",
        description: "El contrato se envió exitosamente al cliente",
      });
    }
  });

  // Mutación para firmar contrato
  const signContractMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}/sign`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Sign failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: "✍️ Contrato Firmado",
        description: "El contrato ha sido marcado como firmado",
      });
    }
  });

  const handleSurveyComplete = (data: Record<string, any>) => {
    setContractData(data);
    generateContractMutation.mutate(data);
  };

  const handleSurveyPreview = (data: Record<string, any>) => {
    setContractData(data);
    // Generar vista previa rápida sin IA
    generateBasicContract(data);
  };

  const generateBasicContract = async (data: Record<string, any>) => {
    setIsGeneratingContract(true);
    try {
      let templateHtml = contractTemplateQuery.data || "";
      const formattedData = formatAnswersForContract(data);
      
      // Reemplazar variables en la plantilla
      Object.entries(formattedData).forEach(([section, sectionData]) => {
        if (typeof sectionData === 'object' && sectionData !== null) {
          Object.entries(sectionData).forEach(([key, value]) => {
            const placeholder = `{{${section}.${key}}}`;
            templateHtml = templateHtml.replace(new RegExp(placeholder, 'g'), value as string || "");
          });
        }
      });
      
      setContractHtml(templateHtml);
      setView("preview");
    } catch (error) {
      console.error("Error generating preview:", error);
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const handlePreview = (contract: Contract) => {
    setSelectedContract(contract);
    setIsPreviewOpen(true);
  };

  const handleCreateNew = () => {
    setContractData({});
    setContractHtml("");
    setSelectedContract(null);
    setView("survey");
  };

  const contracts = contractsQuery.data || [];

  return (
    <div className="min-h-screen bg-black text-cyan-400 relative overflow-hidden">
      {/* Fondo cyberpunk animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA3N2ZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
      </div>

      {/* Scanning lines animadas */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanning-line absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-scan"></div>
      </div>

      <div className="relative z-10 flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header cyberpunk */}
          <div className="cyber-panel mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="arc-reactor">
                  <div className="reactor-core">
                    <Brain className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    GENERADOR DE CONTRATOS IA
                  </h1>
                  <p className="text-cyan-300/70 mt-1">
                    Sistema inteligente de contratos protegidos para contratistas
                  </p>
                </div>
              </div>
              
              {view !== "dashboard" && (
                <Button 
                  variant="outline" 
                  onClick={() => setView("dashboard")}
                  className="cyber-button border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  VOLVER AL PANEL
                </Button>
              )}
            </div>
          </div>

          {/* Dashboard de contratos */}
          {view === "dashboard" && (
            <div className="space-y-6">
              {/* Stats cyberpunk */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="cyber-stat-card">
                  <div className="stat-icon bg-cyan-500/20">
                    <FileText className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">{contracts.length}</div>
                    <div className="text-cyan-300/70 text-sm">CONTRATOS TOTALES</div>
                  </div>
                </div>
                
                <div className="cyber-stat-card">
                  <div className="stat-icon bg-green-500/20">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {contracts.filter((c: Contract) => c.status === 'signed' || c.status === 'completed').length}
                    </div>
                    <div className="text-cyan-300/70 text-sm">FIRMADOS</div>
                  </div>
                </div>
                
                <div className="cyber-stat-card">
                  <div className="stat-icon bg-blue-500/20">
                    <Send className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {contracts.filter((c: Contract) => c.status === 'sent').length}
                    </div>
                    <div className="text-cyan-300/70 text-sm">ENVIADOS</div>
                  </div>
                </div>
                
                <div className="cyber-stat-card">
                  <div className="stat-icon bg-yellow-500/20">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {contracts.filter((c: Contract) => c.status === 'draft').length}
                    </div>
                    <div className="text-cyan-300/70 text-sm">BORRADORES</div>
                  </div>
                </div>
              </div>

              {/* Botón crear nuevo contrato */}
              <div className="cyber-panel p-6 text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/30 mb-4">
                    <Plus className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-cyan-400 mb-2">
                    Crear Nuevo Contrato Inteligente
                  </h3>
                  <p className="text-cyan-300/70 mb-6">
                    Usa IA avanzada para generar contratos que protejan tu negocio
                  </p>
                </div>
                
                <Button 
                  onClick={handleCreateNew}
                  className="cyber-button-primary px-8 py-3 text-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  INICIAR GENERADOR IA
                </Button>
              </div>

              {/* Lista de contratos existentes */}
              {contracts.length > 0 && (
                <div className="cyber-panel">
                  <h3 className="text-xl font-bold text-cyan-400 mb-6 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    CONTRATOS GENERADOS
                  </h3>
                  
                  <div className="grid gap-4">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="contract-card">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className={`status-badge ${
                                contract.status === 'completed' ? 'status-completed' :
                                contract.status === 'signed' ? 'status-signed' :
                                contract.status === 'sent' ? 'status-sent' :
                                'status-draft'
                              }`}>
                                {contract.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                                {contract.status === 'signed' && <Shield className="w-4 h-4" />}
                                {contract.status === 'sent' && <Send className="w-4 h-4" />}
                                {contract.status === 'draft' && <FileText className="w-4 h-4" />}
                                {contract.status.toUpperCase()}
                              </div>
                              <h4 className="text-cyan-400 font-semibold">{contract.title}</h4>
                            </div>
                            
                            <div className="text-cyan-300/70 text-sm space-y-1">
                              <div>Cliente: {contract.clientName}</div>
                              <div>Tipo: {contract.contractType}</div>
                              <div>Creado: {new Date(contract.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(contract)}
                              className="cyber-button-sm"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadMutation.mutate(contract.id)}
                              className="cyber-button-sm"
                              disabled={downloadMutation.isPending}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendEmailMutation.mutate(contract.id)}
                              className="cyber-button-sm"
                              disabled={sendEmailMutation.isPending}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Survey flow */}
          {view === "survey" && (
            <div className="cyber-panel">
              <NewContractSurveyFlow 
                onComplete={handleSurveyComplete}
                onPreview={handleSurveyPreview}
              />
            </div>
          )}

          {/* Preview */}
          {view === "preview" && (
            <div className="cyber-panel">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-cyan-400 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  VISTA PREVIA DEL CONTRATO
                </h3>
              </div>
              
              <ContractPreviewEditable 
                contractHtml={contractHtml}
                contractData={contractData}
                onSave={(data) => {
                  toast({
                    title: "💾 Contrato Guardado",
                    description: "Los cambios se han guardado correctamente",
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialog para vista previa */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl h-[80vh] bg-black border-cyan-400/30">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              Vista Previa: {selectedContract?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={selectedContract.html}
                className="w-full h-full border border-cyan-400/20 rounded"
                title="Contract Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Loading overlay */}
      {(generateContractMutation.isPending || isGeneratingContract) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="cyber-panel p-8 text-center">
            <div className="arc-reactor mb-6">
              <div className="reactor-core animate-pulse">
                <Brain className="w-12 h-12 text-cyan-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-cyan-400 mb-2">
              GENERANDO CONTRATO INTELIGENTE
            </h3>
            <p className="text-cyan-300/70">
              La IA está procesando tu contrato...
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        
        .cyber-panel {
          background: rgba(0, 20, 40, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 0;
          position: relative;
          backdrop-filter: blur(10px);
        }
        
        .cyber-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 49%, rgba(0, 255, 255, 0.1) 50%, transparent 51%);
          pointer-events: none;
        }
        
        .cyber-panel::after {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #00ffff, transparent, #00ffff);
          border-radius: inherit;
          z-index: -1;
          opacity: 0.3;
        }
        
        .arc-reactor {
          width: 60px;
          height: 60px;
          border: 2px solid #00ffff;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
        }
        
        .reactor-core {
          width: 40px;
          height: 40px;
          border: 1px solid rgba(0, 255, 255, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 255, 255, 0.1);
          position: relative;
        }
        
        .cyber-stat-card {
          background: rgba(0, 20, 40, 0.6);
          border: 1px solid rgba(0, 255, 255, 0.3);
          padding: 1.5rem;
          display: flex;
          items-center;
          space-x: 1rem;
          position: relative;
          overflow: hidden;
        }
        
        .cyber-stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent);
          animation: shimmer 3s infinite;
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 255, 255, 0.3);
        }
        
        .cyber-button {
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid rgba(0, 255, 255, 0.5);
          color: #00ffff;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .cyber-button:hover {
          background: rgba(0, 255, 255, 0.2);
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }
        
        .cyber-button-primary {
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 255, 0.2));
          border: 1px solid #00ffff;
          color: #00ffff;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        
        .cyber-button-primary:hover {
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 150, 255, 0.3));
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.4);
          transform: translateY(-2px);
        }
        
        .cyber-button-sm {
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid rgba(0, 255, 255, 0.3);
          color: #00ffff;
          padding: 0.5rem;
        }
        
        .cyber-button-sm:hover {
          background: rgba(0, 255, 255, 0.2);
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }
        
        .contract-card {
          background: rgba(0, 30, 60, 0.4);
          border: 1px solid rgba(0, 255, 255, 0.2);
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .contract-card:hover {
          border-color: rgba(0, 255, 255, 0.5);
          box-shadow: 0 4px 20px rgba(0, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
          border: 1px solid;
        }
        
        .status-completed {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-color: #10b981;
        }
        
        .status-signed {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border-color: #22c55e;
        }
        
        .status-sent {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border-color: #3b82f6;
        }
        
        .status-draft {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border-color: #f59e0b;
        }
      `}</style>
    </div>
  );
};

export default CyberpunkContractGenerator;