/**
 * Generador de Contratos Simplificado
 * Arquitectura clara con 2 flujos principales: Proyectos Existentes + PDF Upload
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { contractTemplateService, ContractData, ContractTemplate } from '@/services/contractTemplateService';
import { simpleOcrService, OcrResult } from '@/services/simpleOcrService';

interface Project {
  id: string;
  estimateNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress: string;
  projectType: string;
  projectDescription?: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function ContractGeneratorSimplified() {
  const { toast } = useToast();
  
  // Estados principales
  const [activeTab, setActiveTab] = useState<'projects' | 'upload'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [contractData, setContractData] = useState<Partial<ContractData>>({});
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estados para PDF Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  
  // Estados para proyectos
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Templates disponibles
  const [templates] = useState<ContractTemplate[]>(contractTemplateService.getAvailableTemplates());



  // Cargar proyectos del usuario desde Firebase
  const loadUserProjects = async () => {
    setLoadingProjects(true);
    try {
      const { getProjects } = await import('@/lib/firebase');
      const firebaseProjects = await getProjects();
      
      // Filtrar proyectos que tienen datos suficientes para generar contratos
      const contractReadyProjects = firebaseProjects.filter((project: any) => 
        project.clientName && 
        project.address && 
        (project.totalPrice || project.estimateAmount)
      );

      // Convertir a formato compatible con el generador de contratos
      const formattedProjects = contractReadyProjects.map((project: any) => ({
        id: project.id,
        estimateNumber: project.projectId || project.id,
        clientName: project.clientName,
        clientEmail: project.clientEmail || '',
        clientPhone: project.clientPhone || '',
        clientAddress: project.address,
        projectType: project.projectType || project.fenceType || 'Proyecto de construcción',
        projectDescription: project.projectDescription || project.description || '',
        total: project.totalPrice || project.estimateAmount || 0,
        status: project.status || 'draft',
        createdAt: project.createdAt?.toDate ? project.createdAt.toDate().toISOString() : new Date().toISOString()
      }));

      setProjects(formattedProjects);
      toast({
        title: "Proyectos cargados",
        description: `Se encontraron ${formattedProjects.length} proyectos disponibles`
      });
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos desde Firebase",
        variant: "destructive"
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  // Cargar proyectos automáticamente al inicializar
  useEffect(() => {
    loadUserProjects();
  }, []);

  // Manejo de selección de proyecto
  const handleProjectSelection = (project: Project) => {
    setSelectedProject(project);
    const projectData = simpleOcrService.convertProjectToContractData(project);
    setContractData(projectData);
    toast({
      title: "Proyecto seleccionado",
      description: `Datos cargados para ${project.clientName}`
    });
  };

  // Manejo de upload de PDF
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo PDF válido",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const result = await simpleOcrService.extractDataFromPdf(file);
      setOcrResult(result);
      
      if (result.success) {
        const correctedData = simpleOcrService.suggestCorrections(result.extractedData);
        setContractData(correctedData);
        toast({
          title: "PDF procesado exitosamente",
          description: "Datos extraídos. Puedes editarlos antes de generar el contrato."
        });
      } else {
        toast({
          title: "Procesamiento parcial",
          description: `Se encontraron algunos errores: ${result.errors.join(', ')}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Error procesando PDF",
        description: "Intenta nuevamente o ingresa los datos manualmente",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generar contrato
  const generateContract = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Selecciona un tipo de contrato",
        variant: "destructive"
      });
      return;
    }

    const validation = contractTemplateService.validateContractData(contractData);
    if (!validation.isValid) {
      toast({
        title: "Datos incompletos",
        description: `Completa los siguientes campos: ${validation.errors.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const contract = await contractTemplateService.generateContract(selectedTemplate, contractData as ContractData);
      setGeneratedContract(contract);
      toast({
        title: "Contrato generado exitosamente",
        description: "Tu contrato está listo para revisión"
      });
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: "Error generando contrato",
        description: "Intenta nuevamente",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Actualizar datos del contrato
  const updateContractData = (field: keyof ContractData, value: string) => {
    setContractData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">
            Generador de Contratos Legal Defense
          </h1>
          <p className="text-green-600 text-lg">
            Sistema simplificado para generar contratos defensivos que protegen a contratistas
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'projects' | 'upload')} className="space-y-6">
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
                  <FileText className="w-5 h-5" />
                  Seleccionar Proyecto Existente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loadingProjects ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500">Cargando proyectos...</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No se encontraron proyectos disponibles</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-3">Selecciona un proyecto para generar contrato:</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {projects.map(project => (
                          <div 
                            key={project.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedProject?.id === project.id 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                            onClick={() => handleProjectSelection(project)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm truncate">{project.clientName}</h3>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    project.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    project.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {project.status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{project.projectType}</p>
                                <p className="text-xs text-gray-400">#{project.estimateNumber}</p>
                              </div>
                              <div className="text-right ml-2">
                                <p className="font-bold text-green-600 text-sm">
                                  ${project.total.toFixed(2)}
                                </p>
                                {selectedProject?.id === project.id && (
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 mx-auto" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Upload PDF */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Subir PDF Estimate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="pdf-upload"
                      className={`cursor-pointer flex flex-col items-center gap-2 ${
                        isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-12 h-12 text-green-500" />
                      <span className="text-lg font-medium">
                        {isProcessing ? 'Procesando...' : 'Haz clic para subir PDF'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Solo archivos PDF. Máximo 10MB.
                      </span>
                    </label>
                  </div>

                  {uploadedFile && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="font-medium">Archivo seleccionado:</p>
                      <p className="text-sm text-gray-600">{uploadedFile.name}</p>
                    </div>
                  )}

                  {ocrResult && (
                    <div className={`p-4 rounded-lg ${
                      ocrResult.success ? 'bg-green-50' : 'bg-yellow-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {ocrResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                        <span className="font-medium">
                          {ocrResult.success ? 'Datos extraídos exitosamente' : 'Extracción parcial'}
                        </span>
                      </div>
                      {ocrResult.errors.length > 0 && (
                        <ul className="text-sm text-gray-600">
                          {ocrResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sección de Edición de Datos */}
        {(selectedProject || ocrResult) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Datos del Contrato (Editables)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selección de Template */}
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Datos del Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Cliente</Label>
                  <Input
                    value={contractData.clientName || ''}
                    onChange={(e) => updateContractData('clientName', e.target.value)}
                    placeholder="Nombre completo del cliente"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Teléfono del Cliente</Label>
                  <Input
                    value={contractData.clientPhone || ''}
                    onChange={(e) => updateContractData('clientPhone', e.target.value)}
                    placeholder="(000) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email del Cliente</Label>
                  <Input
                    type="email"
                    value={contractData.clientEmail || ''}
                    onChange={(e) => updateContractData('clientEmail', e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monto Total</Label>
                  <Input
                    value={contractData.totalAmount || ''}
                    onChange={(e) => updateContractData('totalAmount', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>
              </div>

              {/* Dirección del Cliente */}
              <div className="space-y-2">
                <Label>Dirección del Cliente</Label>
                <Input
                  value={contractData.clientAddress || ''}
                  onChange={(e) => updateContractData('clientAddress', e.target.value)}
                  placeholder="Dirección completa"
                />
              </div>

              {/* Descripción del Proyecto */}
              <div className="space-y-2">
                <Label>Descripción del Proyecto</Label>
                <Textarea
                  value={contractData.projectDescription || ''}
                  onChange={(e) => updateContractData('projectDescription', e.target.value)}
                  placeholder="Descripción detallada del trabajo a realizar"
                  rows={4}
                />
              </div>

              {/* Botón Generar */}
              <Button 
                onClick={generateContract}
                disabled={isProcessing || !selectedTemplate}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isProcessing ? 'Generando Contrato...' : 'Generar Contrato Legal Defense'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview del Contrato */}
        {generatedContract && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Preview del Contrato Generado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
                <div dangerouslySetInnerHTML={{ __html: generatedContract }} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline">Editar Contrato</Button>
                <Button>Descargar PDF</Button>
                <Button variant="outline">Enviar al Cliente</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}