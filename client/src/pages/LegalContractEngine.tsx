/**
 * Página del Motor de Abogado Defensor Digital
 * 
 * Interfaz principal para generar contratos legales automáticamente desde estimados aprobados
 * usando el motor de IA especializado en protección legal del contratista.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import {
  Scale,
  FileText,
  Shield,
  Brain,
  Zap,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  Loader2,
  Download,
  Eye,
  Send
} from "lucide-react";
import ProjectToContractSelector from "@/components/contract/ProjectToContractSelector";
import LegalDefenseEngine, { LegalRiskAnalysis } from "@/services/legalDefenseEngine";

interface GeneratedContract {
  id: string;
  projectId: string;
  clientName: string;
  html: string;
  riskAnalysis: LegalRiskAnalysis;
  protections: string[];
  generatedAt: string;
}

const LegalContractEngine: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados principales
  const [activeView, setActiveView] = useState<'selector' | 'generator' | 'preview'>('selector');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState<LegalRiskAnalysis | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Cargar contratos existentes
  const { data: existingContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['legal-contracts'],
    queryFn: async () => {
      const response = await fetch('/api/contracts?type=legal');
      if (!response.ok) throw new Error('Error loading contracts');
      return await response.json();
    }
  });

  // Handler para seleccionar proyecto
  const handleProjectSelected = async (project: Project) => {
    console.log('🎯 Proyecto seleccionado para contrato legal:', project.clientName);
    setSelectedProject(project);
    setActiveView('generator');
    
    // Analizar riesgos inmediatamente
    try {
      const analysis = await LegalDefenseEngine.analyzeLegalRisks(project);
      setRiskAnalysis(analysis);
      
      toast({
        title: "🔍 Análisis legal completado",
        description: `Riesgo detectado: ${analysis.riskLevel} - ${analysis.protectiveRecommendations.length} recomendaciones`,
      });
    } catch (error) {
      console.error('Error en análisis de riesgo:', error);
    }
  };

  // Generar contrato defensivo
  const handleGenerateDefensiveContract = async () => {
    if (!selectedProject) return;
    
    setIsGenerating(true);
    
    try {
      console.log('🛡️ Iniciando generación de contrato defensivo...');
      
      const result = await LegalDefenseEngine.generateDefensiveContract(selectedProject);
      
      const contract: GeneratedContract = {
        id: `legal-${Date.now()}`,
        projectId: selectedProject.id.toString(),
        clientName: selectedProject.clientName,
        html: result.html,
        riskAnalysis: result.analysis,
        protections: result.protections,
        generatedAt: new Date().toISOString()
      };
      
      setGeneratedContract(contract);
      setActiveView('preview');
      
      toast({
        title: "🎉 Contrato defensivo generado",
        description: `${result.protections.length} protecciones legales aplicadas para tu seguridad`,
      });
      
      // Invalidar cache para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['legal-contracts'] });
      
    } catch (error) {
      console.error('Error generando contrato defensivo:', error);
      toast({
        title: "❌ Error en generación",
        description: "No se pudo generar el contrato defensivo. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Descargar contrato
  const handleDownloadContract = () => {
    if (!generatedContract) return;
    
    const blob = new Blob([generatedContract.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-legal-${generatedContract.clientName.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "📄 Descarga iniciada",
      description: "Contrato legal descargado exitosamente",
    });
  };

  // Convertir a PDF
  const handleGeneratePDF = async () => {
    if (!generatedContract) return;
    
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: generatedContract.html,
          filename: `contrato-legal-${generatedContract.clientName.replace(/\s+/g, '-')}.pdf`
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrato-legal-${generatedContract.clientName.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "🎯 PDF generado",
          description: "Contrato legal descargado como PDF",
        });
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast({
        title: "❌ Error de PDF",
        description: "No se pudo generar el PDF",
        variant: "destructive"
      });
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'crítico': return 'bg-red-100 text-red-800 border-red-300';
      case 'alto': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medio': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'bajo': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header Principal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Motor de Abogado Defensor Digital
          </h1>
          <p className="text-muted-foreground mt-2">
            Mervin AI convierte tus estimados aprobados en contratos que te protegen legalmente
          </p>
        </div>
        {activeView !== 'selector' && (
          <Button variant="outline" onClick={() => setActiveView('selector')}>
            <Search className="w-4 h-4 mr-2" />
            Seleccionar Otro Proyecto
          </Button>
        )}
      </div>

      {/* Navegación por pestañas */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="selector" className="flex-1">
            <Search className="w-4 h-4 mr-2" />
            Seleccionar Proyecto
          </TabsTrigger>
          <TabsTrigger value="generator" className="flex-1" disabled={!selectedProject}>
            <Brain className="w-4 h-4 mr-2" />
            Generar Contrato
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1" disabled={!generatedContract}>
            <Eye className="w-4 h-4 mr-2" />
            Vista Previa
          </TabsTrigger>
        </TabsList>

        {/* Vista de Selección de Proyectos */}
        <TabsContent value="selector" className="space-y-6">
          <ProjectToContractSelector
            onProjectSelected={handleProjectSelected}
            onCancel={() => console.log('Selección cancelada')}
          />
        </TabsContent>

        {/* Vista de Generación */}
        <TabsContent value="generator" className="space-y-6">
          {selectedProject && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Información del Proyecto */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Información del Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedProject.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dirección</p>
                    <p className="font-medium">{selectedProject.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Proyecto</p>
                    <p className="font-medium">{selectedProject.projectType || 'General'}</p>
                  </div>
                  {selectedProject.totalPrice && (
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-lg text-green-600">
                        ${(selectedProject.totalPrice / 100).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Análisis de Riesgo Legal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Análisis de Riesgo Legal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {riskAnalysis ? (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Nivel de Riesgo</p>
                        <Badge className={getRiskColor(riskAnalysis.riskLevel)}>
                          {riskAnalysis.riskLevel.toUpperCase()} ({riskAnalysis.riskScore} puntos)
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Protecciones Recomendadas</p>
                        <ul className="text-sm space-y-1">
                          {riskAnalysis.protectiveRecommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Shield className="w-3 h-3 mt-1 text-blue-500 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                        {riskAnalysis.protectiveRecommendations.length > 3 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            +{riskAnalysis.protectiveRecommendations.length - 3} protecciones adicionales
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analizando riesgos legales...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Botón de Generación */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Generar Contrato Protector</h3>
                  <p className="text-muted-foreground">
                    El abogado defensor digital creará un contrato que protege tus intereses como contratista
                  </p>
                </div>
                <Button 
                  onClick={handleGenerateDefensiveContract}
                  disabled={isGenerating || !selectedProject}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generando Contrato Defensivo...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Generar Contrato Defensivo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista de Previsualización */}
        <TabsContent value="preview" className="space-y-6">
          {generatedContract && (
            <>
              {/* Información del Contrato Generado */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Protecciones Aplicadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Badge className={getRiskColor(generatedContract.riskAnalysis.riskLevel)}>
                        Riesgo: {generatedContract.riskAnalysis.riskLevel}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {generatedContract.protections.length} protecciones legales incluidas
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{generatedContract.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      Generado: {new Date(generatedContract.generatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Acciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsPreviewOpen(true)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Contrato
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownloadContract}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar HTML
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGeneratePDF}
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generar PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Protecciones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    Protecciones Legales Incluidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {generatedContract.protections.map((protection, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800">{protection}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Vista Previa del Contrato */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Contrato Legal</DialogTitle>
          </DialogHeader>
          {generatedContract && (
            <div 
              className="border rounded-lg p-6 bg-white"
              dangerouslySetInnerHTML={{ __html: generatedContract.html }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalContractEngine;
  projectId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  fenceType: string;
  length?: number;
  height?: number;
  totalPrice?: number;
  status: string;
  estimateHtml?: string;
  details?: string;
  createdAt: string;
  updatedAt: string;
}

const LegalContractEnginePage: React.FC = () => {
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const { toast } = useToast();

  // Obtener proyectos reales desde la API
  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['/api/estimates'],
    queryFn: () => fetch('/api/estimates').then(res => {
      if (!res.ok) throw new Error('Error al cargar estimados');
      return res.json();
    })
  });

  // Convertir datos del backend al formato esperado por el motor legal
  const convertBackendProject = (project: BackendProject) => {
    let details = {};
    try {
      details = project.details ? JSON.parse(project.details) : {};
    } catch (e) {
      console.warn('Error parsing project details:', e);
    }

    return {
      id: project.projectId,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone || '',
      projectAddress: `${project.address}${project.city ? ', ' + project.city : ''}${project.state ? ', ' + project.state : ''}${project.zip ? ' ' + project.zip : ''}`,
      projectType: project.fenceType || 'Fence Installation',
      projectDescription: `${project.fenceType} project${project.length ? ` - ${project.length} linear feet` : ''}${project.height ? ` at ${project.height} feet height` : ''}`,
      totalAmount: project.totalPrice ? project.totalPrice / 100 : 0, // Convert from cents
      items: [], // Podríamos extraer esto de details si está disponible
      timeline: "Por determinar",
      contractorName: "Owl Fence Pro Services", // Esto vendría del perfil del usuario
      contractorAddress: "Austin, TX", // Esto vendría del perfil del usuario
      contractorLicense: "TX-LIC-123456", // Esto vendría del perfil del usuario
      state: project.state || "Texas",
      createdAt: new Date(project.createdAt),
      status: project.status === 'completed' ? 'approved' as const : 'pending' as const
    };
  };

  // Convertir proyectos a formato de estimados
  const estimates = projects.map(convertBackendProject);
  
  // Filtrar estimados
  const filteredEstimates = estimates.filter(estimate =>
    estimate.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.projectType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Seleccionar el primer estimado disponible si no hay uno seleccionado
  useEffect(() => {
    if (estimates.length > 0 && !selectedEstimate) {
      setSelectedEstimate(estimates[0]);
    }
  }, [estimates, selectedEstimate]);

  const handleContractGenerated = (contractHtml: string) => {
    setGeneratedContract(contractHtml);
    toast({
      title: "🎉 Contrato legal generado",
      description: "El abogado defensor digital ha completado tu contrato",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="border-b border-cyan-500/30 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Scale className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400">Legal Contract Engine</h1>
              <p className="text-cyan-300/80">Abogado Defensor Digital - Powered by Anthropic AI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="bg-black/50 border border-cyan-500/30">
            <TabsTrigger value="generator" className="text-cyan-400">
              <Brain className="h-4 w-4 mr-2" />
              Generador de Contratos
            </TabsTrigger>
            <TabsTrigger value="estimates" className="text-cyan-400">
              <FileText className="h-4 w-4 mr-2" />
              Estimados Disponibles
            </TabsTrigger>
          </TabsList>

          {/* Generador de Contratos */}
          <TabsContent value="generator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel de Características */}
              <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Características del Motor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Análisis automático</strong> de estimados aprobados
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Protección legal</strong> especializada para contratistas
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Cláusulas adaptativas</strong> por jurisdicción y tipo de proyecto
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Análisis de riesgo</strong> automático e inteligente
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Formato descargable</strong> HTML y PDF
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generador Principal */}
              <div className="lg:col-span-2">
                {isLoading ? (
                  <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
                      <p className="text-cyan-400">Cargando estimados desde tu base de datos...</p>
                    </CardContent>
                  </Card>
                ) : error ? (
                  <Card className="border-red-500/30 bg-red-500/10 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
                      <p className="text-red-400 mb-4">Error al cargar estimados</p>
                      <p className="text-sm text-red-300/80">
                        No se pudieron obtener los datos del backend. Verifica la conexión.
                      </p>
                    </CardContent>
                  </Card>
                ) : estimates.length === 0 ? (
                  <Card className="border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <FileText className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
                      <p className="text-yellow-400 mb-4">No hay estimados disponibles</p>
                      <p className="text-sm text-yellow-300/80 mb-4">
                        Necesitas tener estimados aprobados para generar contratos.
                      </p>
                      <Button 
                        onClick={() => window.location.href = '/estimates-wizard'}
                        className="bg-yellow-500 text-black hover:bg-yellow-400"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Nuevo Estimado
                      </Button>
                    </CardContent>
                  </Card>
                ) : selectedEstimate ? (
                  <EstimateToContractGenerator
                    estimate={selectedEstimate}
                    onContractGenerated={handleContractGenerated}
                  />
                ) : (
                  <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <FileText className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
                      <p className="text-cyan-400">Selecciona un estimado para generar su contrato</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Lista de Estimados */}
          <TabsContent value="estimates" className="space-y-6">
            {/* Búsqueda */}
            <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="text-cyan-400">Buscar Estimados</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Buscar por cliente, proyecto o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-cyan-500/30 bg-black/50"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Estimados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEstimates.map((estimate) => (
                <Card
                  key={estimate.id}
                  className={`border cursor-pointer transition-all ${
                    selectedEstimate.id === estimate.id
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-cyan-500/30 bg-black/50 hover:border-cyan-400/50'
                  }`}
                  onClick={() => setSelectedEstimate(estimate)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-cyan-400">{estimate.clientName}</h3>
                        <p className="text-sm text-gray-300">ID: {estimate.id}</p>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs ${
                          estimate.status === 'approved' 
                            ? 'bg-green-500/20 text-green-400'
                            : estimate.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {estimate.status === 'approved' ? 'Aprobado' : 
                           estimate.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div><strong>Proyecto:</strong> {estimate.projectType}</div>
                      <div><strong>Valor:</strong> ${estimate.totalAmount.toLocaleString()}</div>
                      <div><strong>Ubicación:</strong> {estimate.projectAddress}</div>
                    </div>
                    
                    {estimate.status === 'approved' && (
                      <div className="mt-3 flex items-center text-green-400 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Listo para generar contrato
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredEstimates.length === 0 && (
              <Card className="border-cyan-500/30 bg-black/50">
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No se encontraron estimados que coincidan con tu búsqueda</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LegalContractEnginePage;