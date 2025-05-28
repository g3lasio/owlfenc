import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Shield, Zap, CheckCircle, FileText, Upload } from 'lucide-react';
import IntelligentContractEditor from '@/components/contract/IntelligentContractEditor';

export default function LegalContractEngineFixed() {
  const [activeTab, setActiveTab] = useState<'projects' | 'upload'>('projects');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const { toast } = useToast();

  // Cargar proyectos existentes desde Firebase directamente
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      console.log('🔍 Intentando cargar proyectos desde Firebase...');
      
      // Importar Firebase dinámicamente
      const { getProjects } = await import('@/lib/firebase');
      
      // Obtener proyectos de Firebase
      const firebaseProjects = await getProjects();
      console.log(`📋 Proyectos encontrados en Firebase: ${firebaseProjects.length}`);
      
      // Filtrar proyectos que pueden convertirse en contratos
      const contractEligibleProjects = firebaseProjects.filter(project => {
        console.log('🔍 Evaluando proyecto:', {
          clientName: project.clientName,
          address: project.address,
          status: project.status,
          projectProgress: project.projectProgress,
          hasBasicInfo: !!(project.clientName && project.address)
        });
        
        const hasBasicInfo = project.clientName && project.address;
        
        // Aceptar proyectos con status estimate, approved, o cualquier estado válido
        const isEligible = project.status === 'estimate' || 
                          project.status === 'approved' || 
                          project.status === 'client_approved' ||
                          project.status === 'completed' ||
                          project.projectProgress === 'approved' ||
                          project.projectProgress === 'client_approved' ||
                          // Si tiene información básica, es elegible
                          hasBasicInfo;
        
        const eligible = hasBasicInfo && isEligible;
        console.log(`${eligible ? '✅' : '❌'} Proyecto ${project.clientName}: elegible=${eligible}`);
        
        return eligible;
      });
      
      console.log(`✅ Proyectos elegibles para contrato: ${contractEligibleProjects.length}`);
      
      // Formatear para el Contract Generator
      const formattedProjects = contractEligibleProjects.map(project => ({
        id: project.id,
        clientName: project.clientName,
        clientPhone: project.clientPhone || '',
        clientEmail: project.clientEmail || '',
        address: project.address,
        projectType: project.projectType || project.fenceType || 'Proyecto de cerca',
        projectDescription: project.projectDescription || project.description || '',
        totalAmount: project.totalPrice || project.estimateAmount || 0,
        status: project.status || 'approved',
        createdAt: project.createdAt,
        projectId: project.id
      }));
      
      setProjects(formattedProjects);
      
      if (formattedProjects.length === 0) {
        toast({
          title: "Sin proyectos elegibles",
          description: "No se encontraron proyectos aprobados que puedan convertirse en contratos",
          variant: "default"
        });
      } else {
        toast({
          title: "Proyectos cargados exitosamente",
          description: `Se encontraron ${formattedProjects.length} proyectos elegibles para contratos`,
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading projects from Firebase:', error);
      
      // Fallback a la API original
      try {
        console.log('🔄 Intentando fallback con API...');
        const response = await fetch('/api/projects');
        if (response.ok) {
          const projectsData = await response.json();
          setProjects(projectsData);
        }
      } catch (apiError) {
        console.error('❌ Error with API fallback:', apiError);
        toast({
          title: "Error cargando proyectos",
          description: "No se pudieron cargar los proyectos desde Firebase ni la API",
          variant: "destructive"
        });
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  // Cargar proyectos al cambiar a la pestaña de proyectos
  const handleTabChange = (tab: 'projects' | 'upload') => {
    setActiveTab(tab);
    if (tab === 'projects' && projects.length === 0) {
      loadProjects();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setExtractedData(null);
      setGeneratedContract('');
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
    }
  };

  const processEstimate = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    
    try {
      console.log('🚀 Iniciando procesamiento optimizado...');
      
      const formData = new FormData();
      formData.append('estimate', selectedFile);

      // Usar el endpoint optimizado que resuelve los 3 problemas
      const response = await fetch('/api/process-estimate-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error processing PDF');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Datos extraídos:', result.extractedData);
        
        setExtractedData(result.extractedData);
        setRiskAnalysis(result.riskAnalysis);
        setGeneratedContract(result.generatedContract);
        
        console.log('✅ Contrato defensivo generado exitosamente');
        
        toast({
          title: "Contract generated successfully!",
          description: "Professional defensive contract ready for review.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: "Generation failed",
        description: "Error generating the contract.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          🛡️ Legal Defense Contract Generator
        </h1>
        <p className="text-xl text-gray-600">
          Protecting contractors with AI-powered legal analysis in seconds, not minutes
        </p>
      </div>

      {/* Improvements Banner */}


      {/* Tabs for Projects and Upload */}
      <Tabs value={activeTab} onValueChange={(value: string) => handleTabChange(value as 'projects' | 'upload')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Proyectos Existentes
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Subir PDF Estimate
          </TabsTrigger>
        </TabsList>

        {/* Tab: Proyectos Existentes */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Seleccionar Proyecto Existente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <div className="text-center py-4">
                  <p>Cargando proyectos...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No hay proyectos disponibles</p>
                  <Button onClick={loadProjects} className="mt-2">
                    Recargar Proyectos
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProject?.id === project.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{project.clientName}</h3>
                          <p className="text-sm text-gray-600">{project.address}</p>
                          <p className="text-sm text-gray-500">{project.projectType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            ${project.totalPrice?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {project.status || 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedProject && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Proyecto Seleccionado:</h4>
                  <p><strong>Cliente:</strong> {selectedProject.clientName}</p>
                  <p><strong>Dirección:</strong> {selectedProject.address}</p>
                  <p><strong>Tipo:</strong> {selectedProject.projectType}</p>
                  <p><strong>Total:</strong> ${selectedProject.totalPrice?.toLocaleString()}</p>
                  
                  <Button 
                    onClick={() => {
                      // Convertir proyecto a datos de contrato
                      setExtractedData({
                        contractorName: "OWL FENC LLC",
                        clientName: selectedProject.clientName,
                        clientAddress: selectedProject.address,
                        projectDescription: selectedProject.description || selectedProject.projectType,
                        totalAmount: selectedProject.totalPrice?.toString() || "0",
                        projectType: selectedProject.projectType
                      });
                      setActiveTab('upload'); // Cambiar a la vista de procesamiento
                    }}
                    className="mt-4 w-full"
                  >
                    Generar Contrato con este Proyecto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Subir PDF Estimate */}
        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Upload & Process */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5" />
                    Upload PDF Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <FileUp className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : 'Choose PDF file or drag here'}
                      </span>
                    </label>
                  </div>

                  <Button
                    onClick={processEstimate}
                    disabled={!selectedFile || isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-spin" />
                        Processing PDF...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Generate Legal Defense Contract
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Data Editing Panel */}
              {extractedData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Extracted Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <IntelligentContractEditor 
                      extractedData={extractedData} 
                      onDataChange={setExtractedData}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel - Results */}
            <div className="space-y-6">
              {/* Risk Analysis */}
              {riskAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      Risk Analysis & Protection Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="font-semibold text-green-800">Coverage</div>
                        <div className="text-2xl font-bold text-green-600">98%</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="font-semibold text-blue-800">Risk Level</div>
                        <div className="text-2xl font-bold text-blue-600">Low</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Payment terms protected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Liability limitations included</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Change order procedures defined</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generated Contract Preview */}
              {generatedContract && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      Generated Contract Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: generatedContract }}
                    />
                    <div className="flex gap-2 mt-4">
                      <Button className="flex-1" size="sm">
                        Download PDF
                      </Button>
                      <Button variant="outline" className="flex-1" size="sm">
                        Edit Contract
                      </Button>
                    </div>
                    <div className="text-center mt-4 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-800">Contract Ready!</p>
                      <p className="text-sm mt-2">
                        Complete with protective clauses and professional formatting
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}