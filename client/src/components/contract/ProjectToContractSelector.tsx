import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import { Search, FileText, Shield, AlertTriangle, CheckCircle, Upload } from "lucide-react";

interface ProjectToContractSelectorProps {
  onProjectSelected: (project: Project) => void;
  onCancel: () => void;
}

const ProjectToContractSelector: React.FC<ProjectToContractSelectorProps> = ({
  onProjectSelected,
  onCancel
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Función para manejar la subida de PDF de estimado externo
  const handleUploadEstimate = () => {
    fileInputRef.current?.click();
  };

  // Función para procesar el archivo PDF subido
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('estimate', file);

      // Llamar al endpoint que procesará el PDF con OCR
      const response = await fetch('/api/process-estimate-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error processing PDF');
      }

      const extractedData = await response.json();
      
      // Crear un proyecto ficticio con los datos extraídos para pasarlo al generador
      const estimateProject: Project = {
        id: Date.now(), // ID temporal
        projectId: `EXT-${Date.now()}`,
        clientName: extractedData.clientName || 'External Client',
        clientEmail: extractedData.clientEmail || '',
        clientPhone: extractedData.clientPhone || '',
        address: extractedData.address || 'Address from PDF',
        city: extractedData.city || '',
        state: extractedData.state || '',
        zipCode: extractedData.zipCode || '',
        projectType: extractedData.projectType || 'External Estimate',
        description: extractedData.description || 'Project from external PDF estimate',
        status: 'approved',
        projectProgress: 'approved',
        totalPrice: extractedData.totalAmount || 0,
        createdAt: new Date(),
        // Datos adicionales extraídos del PDF
        extractedData: extractedData
      };

      // Pasar el proyecto creado al generador de contratos
      onProjectSelected(estimateProject);
      
    } catch (error) {
      console.error('Error uploading estimate:', error);
      alert('Error processing the PDF. Please try again.');
    }
  };

  // Cargar proyectos que pueden convertirse a contrato
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-for-contracts', filterStatus],
    queryFn: async () => {
      try {
        console.log('🔄 Cargando proyectos para contratos...');
        
        // Cargar desde múltiples fuentes para obtener datos completos
        let allProjects = [];
        
        // 1. Intentar cargar proyectos desde el endpoint principal
        try {
          const projectsResponse = await fetch('/api/projects');
          if (projectsResponse.ok) {
            const projects = await projectsResponse.json();
            console.log('📊 Proyectos cargados desde /api/projects:', projects.length);
            allProjects = [...allProjects, ...projects];
          }
        } catch (error) {
          console.warn('⚠️ Error cargando desde /api/projects:', error);
        }
        
        // 2. Cargar estimados con datos estructurados completos
        try {
          const estimatesResponse = await fetch('/api/estimates');
          if (estimatesResponse.ok) {
            const estimates = await estimatesResponse.json();
            console.log('💰 Estimados cargados desde /api/estimates:', estimates.length);
            
            // Convertir estimates con datos estructurados a formato de proyecto
            const estimateProjects = estimates.map((est: any) => {
              // Extraer datos de las estructuras organizadas que creamos
              const clientInfo = est.clientInformation || {};
              const projectCosts = est.projectTotalCosts || {};
              const contractInfo = est.contractInformation || {};
              
              return {
                id: est.id || est.estimateNumber,
                projectId: est.projectId || est.estimateNumber,
                clientName: clientInfo.name || est.clientName || 'Cliente no especificado',
                clientEmail: clientInfo.email || est.clientEmail || '',
                clientPhone: clientInfo.phone || est.clientPhone || '',
                address: clientInfo.fullAddress || clientInfo.address || est.address || 'Dirección no especificada',
                city: clientInfo.city || est.city || '',
                state: clientInfo.state || est.state || '',
                zipCode: clientInfo.zipCode || est.zipCode || '',
                projectType: est.projectType || 'fence',
                description: est.projectDescription || est.description || `Proyecto de ${est.projectType || 'construcción'}`,
                status: est.status || 'estimate',
                projectProgress: est.status || 'estimate_created',
                
                // Información financiera completa desde projectTotalCosts
                totalPrice: projectCosts.totalSummary?.finalTotal || 
                           (est.total && typeof est.total === 'number' ? est.total : 
                           (est.total && typeof est.total === 'string' ? parseFloat(est.total) : 
                           (est.totalCents ? est.totalCents / 100 : 0))),
                           
                subtotal: projectCosts.totalSummary?.subtotal || 
                         (est.subtotal && typeof est.subtotal === 'number' ? est.subtotal :
                         (est.subtotalCents ? est.subtotalCents / 100 : 0)),
                         
                taxAmount: projectCosts.totalSummary?.tax || 
                          (est.taxAmount && typeof est.taxAmount === 'number' ? est.taxAmount :
                          (est.taxAmountCents ? est.taxAmountCents / 100 : 0)),
                
                // Información del contratista
                contractorInfo: contractInfo,
                
                // Datos completos para referencia
                clientInformation: clientInfo,
                projectTotalCosts: projectCosts,
                contractInformation: contractInfo,
                
                createdAt: est.createdAt || new Date(),
                estimateNumber: est.estimateNumber,
                
                // Verificar si tiene información básica completa
                hasBasicInfo: !!(clientInfo.name && (projectCosts.totalSummary?.finalTotal || est.total))
              };
            });
            
            allProjects = [...allProjects, ...estimateProjects];
          }
        } catch (error) {
          console.warn('⚠️ Error cargando desde /api/estimates:', error);
        }
        
        // 3. Eliminar duplicados basado en ID o nombre del cliente
        const uniqueProjects = allProjects.filter((project, index, self) => 
          index === self.findIndex(p => 
            p.id === project.id || 
            (p.clientName === project.clientName && p.address === project.address)
          )
        );
        
        console.log('✅ Total proyectos únicos cargados:', uniqueProjects.length);
        
        // 4. Filtrar proyectos elegibles para contratos
        const eligibleProjects = uniqueProjects.filter(project => {
          const hasRequiredData = project.clientName && 
                                 project.totalPrice > 0 &&
                                 (project.address || project.projectType);
          
          // Un proyecto es elegible si tiene los datos básicos necesarios
          // No importa el estado - cualquier estimado puede convertirse en contrato
          const isEligible = hasRequiredData;
          
          console.log('🔍 Evaluando proyecto:', {
            clientName: project.clientName,
            address: project.address,
            totalPrice: project.totalPrice,
            status: project.status,
            projectProgress: project.projectProgress,
            hasRequiredData: hasRequiredData
          });
          
          if (isEligible) {
            console.log('✅ Proyecto', project.clientName + ':', 'elegible para contrato');
          } else {
            console.log('❌ Proyecto', project.clientName + ':', 'datos insuficientes');
          }
          
          return isEligible;
        });
        
        console.log('✅ Proyectos elegibles para contrato:', eligibleProjects.length);
        
        // Filtrar según el estado seleccionado
        if (filterStatus === 'all') {
          return eligibleProjects;
        }
        
        // Aplicar filtros específicos
        return eligibleProjects.filter((project: any) => {
          if (filterStatus === 'approved') {
            // Incluir proyectos aprobados Y estimados listos para convertir en contrato
            return project.status === 'client_approved' || project.status === 'approved' || 
                   project.projectProgress === 'approved' || project.projectProgress === 'completed' ||
                   project.status === 'draft' || project.status === 'estimate' ||
                   project.projectProgress === 'estimate_created';
          }
          if (filterStatus === 'pending') {
            return project.status === 'pending' || project.projectProgress === 'pending' ||
                   project.status === 'estimate_sent';
          }
          return true;
        });
      } catch (error) {
        console.error('Error loading projects:', error);
        return [];
      }
    }
  });

  // Filtrar proyectos según búsqueda
  const filteredProjects = projects.filter((project: Project) => 
    project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.projectType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'client_approved': 
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'estimate_sent': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'contract_needed': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'draft':
      case 'estimate':
      case 'estimate_created': return <Shield className="w-4 h-4 text-cyan-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'client_approved': 
      case 'approved': return 'Client Approved';
      case 'estimate_sent': return 'Estimate Sent';
      case 'contract_needed': return 'Contract Needed';
      case 'draft': return 'Ready for Contract';
      case 'estimate': return 'Ready for Contract';
      case 'estimate_created': return 'Ready for Contract';
      default: return status || 'Ready for Contract';
    }
  };

  const getRiskLevel = (project: Project) => {
    // Análisis básico de riesgo basado en el proyecto
    let riskScore = 0;
    
    if (project.totalPrice && project.totalPrice > 500000) riskScore += 2; // Proyectos grandes
    if (project.projectType === 'roofing') riskScore += 1; // Techos tienen más riesgo
    if (!project.permitStatus || project.permitStatus === 'pending') riskScore += 1; // Sin permisos
    if (!project.clientEmail) riskScore += 1; // Falta información del cliente
    
    if (riskScore >= 3) return { level: 'alto', color: 'red', text: 'High Risk' };
    if (riskScore >= 2) return { level: 'medio', color: 'yellow', text: 'Medium Risk' };
    return { level: 'bajo', color: 'green', text: 'Low Risk' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
            <span className="break-words">Select Project for Legal Contract</span>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            The digital defense attorney will convert your approved estimate into a contract that protects you
          </p>
        </div>
        <Button variant="outline" onClick={onCancel} className="w-full md:w-auto text-sm">
          Cancel
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, address or project type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="approved">Client Approved</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Proyectos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Projects Available</h3>
            <p className="text-muted-foreground mb-6">
              No estimates or projects found that can be converted to contracts. Create an estimate first with client name, address, and total amount.
            </p>
            
            {/* Alternative: Upload External Estimate PDF */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Alternative Option</h4>
              <p className="text-blue-700 text-sm mb-4">
                Upload an external estimate PDF and our AI will extract all the necessary information to generate your protective contract
              </p>
              <Button 
                onClick={() => handleUploadEstimate()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Estimate PDF
              </Button>
            </div>
          </div>
        ) : (
          filteredProjects.map((project: Project) => {
            const risk = getRiskLevel(project);
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.clientName}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {getStatusIcon(project.projectProgress || 'draft')}
                        {getStatusLabel(project.projectProgress || 'draft')}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${
                        risk.color === 'red' ? 'border-red-500 text-red-700' :
                        risk.color === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                        'border-green-500 text-green-700'
                      }`}
                    >
                      {risk.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">{project.projectType || 'General Project'}</p>
                    <p className="text-xs text-muted-foreground">{project.address}</p>
                  </div>
                  
                  {project.totalPrice && project.totalPrice > 0 ? (
                    <p className="text-lg font-bold text-green-600">
                      ${typeof project.totalPrice === 'number' ? 
                        project.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 
                        parseFloat(project.totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Price pending
                    </p>
                  )}

                  <div className="flex gap-2 text-xs">
                    {project.permitStatus && (
                      <Badge variant="secondary" className="text-xs">
                        Permits: {project.permitStatus}
                      </Badge>
                    )}
                    {project.projectType && (
                      <Badge variant="secondary" className="text-xs">
                        {project.projectType}
                      </Badge>
                    )}
                  </div>

                  <Button 
                    className="w-full mt-4" 
                    onClick={() => onProjectSelected(project)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Generate Protective Contract
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Hidden file input for PDF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Digital Defense Attorney Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-8 h-8 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                🤖 Digital Defense Attorney - Mervin AI
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                Our legal DeepSearch engine analyzes each project and generates contracts that protect you as a contractor:
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Protection clauses against scope changes</li>
                <li>• Payment terms that secure your cash flow</li>
                <li>• Protection against excessive liabilities</li>
                <li>• Legal language that favors the contractor</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectToContractSelector;