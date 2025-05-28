/**
 * Motor de Abogado Defensor Digital - Versión Optimizada
 * 
 * Interfaz principal para generar contratos legales automáticamente desde estimados aprobados
 * usando el motor de IA especializado en protección legal del contratista.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import {
  Shield,
  Brain,
  Zap,
  CheckCircle,
  AlertTriangle,
  Search,
  Loader2,
  Download,
  Eye,
  FileText
} from "lucide-react";
import ProjectToContractSelector from "@/components/contract/ProjectToContractSelector";
import LegalDefenseEngine, { LegalRiskAnalysis } from "@/services/legalDefenseEngine";
import EditableExtractedData from "@/components/contract/EditableExtractedData";

interface GeneratedContract {
  id: string;
  projectId: string;
  clientName: string;
  html: string;
  riskAnalysis: LegalRiskAnalysis;
  protections: string[];
  generatedAt: string;
}

const LegalContractEngineFixed: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados principales
  const [activeView, setActiveView] = useState<'selector' | 'generator' | 'preview' | 'editData'>('selector');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<LegalRiskAnalysis | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
    <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header Principal - Responsive */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
            <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            <span className="break-words">Digital Defense Attorney Engine</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Mervin AI converts your approved estimates into legally protective contracts
          </p>
        </div>
        {activeView !== 'selector' && (
          <Button 
            variant="outline" 
            onClick={() => setActiveView('selector')}
            className="w-full md:w-auto text-xs md:text-sm"
          >
            <Search className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Select Another</span>
            <span className="sm:hidden">Select</span>
          </Button>
        )}
      </div>

      {/* Navegación por pestañas - Mobile Responsive */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="selector" className="flex-1 flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm p-2">
            <Search className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Select Project</span>
            <span className="sm:hidden">Select</span>
          </TabsTrigger>
          <TabsTrigger value="generator" className="flex-1 flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm p-2" disabled={!selectedProject}>
            <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Generate Contract</span>
            <span className="sm:hidden">Generate</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1 flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm p-2" disabled={!generatedContract}>
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Preview</span>
            <span className="sm:hidden">View</span>
          </TabsTrigger>
        </TabsList>

        {/* Vista de Selección de Proyectos */}
        <TabsContent value="selector" className="space-y-4 md:space-y-6">
          <ProjectToContractSelector
            onProjectSelected={handleProjectSelected}
            onCancel={() => console.log('Selection cancelled')}
          />
        </TabsContent>

        {/* Vista de Generación */}
        <TabsContent value="generator" className="space-y-4 md:space-y-6">
          {selectedProject && (
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              {/* Información del Proyecto */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <FileText className="w-4 h-4 md:w-5 md:h-5" />
                    Project Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Client</p>
                    <p className="font-medium text-sm md:text-base">{selectedProject.clientName}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Address</p>
                    <p className="font-medium text-sm md:text-base break-words">{selectedProject.address}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Project Type</p>
                    <p className="font-medium text-sm md:text-base">{selectedProject.projectType || 'General'}</p>
                  </div>
                  {selectedProject.totalPrice && (
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Total Value</p>
                      <p className="font-bold text-lg md:text-xl text-green-600">
                        ${(selectedProject.totalPrice / 100).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Análisis de Riesgo Legal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                    Legal Risk Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  {riskAnalysis ? (
                    <>
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground mb-2">Risk Level</p>
                        <Badge className={getRiskColor(riskAnalysis.riskLevel)}>
                          {riskAnalysis.riskLevel.toUpperCase()} ({riskAnalysis.riskScore} points)
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground mb-2">Recommended Protections</p>
                        <ul className="text-xs md:text-sm space-y-1">
                          {riskAnalysis.protectiveRecommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Shield className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                              <span className="break-words">{rec}</span>
                            </li>
                          ))}
                        </ul>
                        {riskAnalysis.protectiveRecommendations.length > 3 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            +{riskAnalysis.protectiveRecommendations.length - 3} additional protections
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analyzing legal risks...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Botón de Generación */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-4 md:pt-6">
              <div className="text-center space-y-3 md:space-y-4">
                <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-2">Generate Protective Contract</h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    The digital defense attorney will create a contract that protects your interests as a contractor
                  </p>
                </div>
                <Button 
                  onClick={handleGenerateDefensiveContract}
                  disabled={isGenerating || !selectedProject}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto text-sm md:text-base"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                      <span className="hidden sm:inline">Generating Defensive Contract...</span>
                      <span className="sm:hidden">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      <span className="hidden sm:inline">Generate Defensive Contract</span>
                      <span className="sm:hidden">Generate</span>
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

export default LegalContractEngineFixed;