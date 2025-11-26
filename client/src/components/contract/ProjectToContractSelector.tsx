import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Project } from "@shared/schema";
import { Search, FileText, Shield, AlertTriangle, CheckCircle, Upload, RefreshCw } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

interface ProjectToContractSelectorProps {
  onProjectSelected: (project: Project) => void;
  onCancel: () => void;
}

const ProjectToContractSelector: React.FC<ProjectToContractSelectorProps> = ({
  onProjectSelected,
  onCancel
}) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // UNIFIED DATA SOURCE: Load ONLY from 'estimates' collection
  const loadProjectsFromFirebase = async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoading(true);
      console.log("🔥 Loading estimates from Firebase for Contract Selector...");

      const estimatesQuery = query(
        collection(db, "estimates"),
        where("firebaseUserId", "==", currentUser.uid),
      );

      const estimatesSnapshot = await getDocs(estimatesQuery);
      console.log(`📊 [CONTRACT-SELECTOR] Found ${estimatesSnapshot.size} estimates`);
      
      const allEstimates = estimatesSnapshot.docs.map((doc) => {
        const data = doc.data();

        const clientName =
          data.clientInformation?.name ||
          data.clientName ||
          data.client?.name ||
          "Cliente sin nombre";

        const clientEmail =
          data.clientInformation?.email ||
          data.clientEmail ||
          data.client?.email ||
          "";

        let totalValue =
          data.projectTotalCosts?.totalSummary?.finalTotal ||
          data.projectTotalCosts?.total ||
          data.total ||
          data.estimateAmount ||
          0;

        if (totalValue > 10000 && Number.isInteger(totalValue)) {
          totalValue = totalValue / 100;
        }

        const projectTitle =
          data.projectDetails?.name ||
          data.projectName ||
          data.title ||
          `Estimado para ${clientName}`;

        const address =
          data.clientInformation?.address ||
          data.clientInformation?.fullAddress ||
          data.clientAddress ||
          data.client?.address ||
          data.address ||
          "";

        return {
          id: doc.id,
          estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
          title: projectTitle,
          clientName: clientName,
          clientEmail: clientEmail,
          total: totalValue,
          status: data.status || "estimate",
          estimateDate: data.createdAt
            ? data.createdAt.toDate?.() || new Date(data.createdAt)
            : new Date(),
          items: data.projectTotalCosts?.materialCosts?.items || data.items || [],
          projectType: data.projectType || data.projectDetails?.type || "fence",
          address: address,
          originalData: data,
        };
      });

      allEstimates.sort((a, b) =>
        new Date(b.estimateDate).getTime() - new Date(a.estimateDate).getTime()
      );

      const formattedProjects: Project[] = allEstimates.map((estimate) => ({
        id: estimate.id,
        clientName: estimate.clientName,
        clientEmail: estimate.clientEmail,
        total: estimate.total,
        status: estimate.status,
        projectType: estimate.projectType,
        address: estimate.address,
        estimateNumber: estimate.estimateNumber,
        originalData: estimate.originalData,
      }));

      setProjects(formattedProjects);
      console.log(`✅ [CONTRACT-SELECTOR] ${allEstimates.length} estimates loaded`);
    } catch (error) {
      console.error("Error loading estimates from Firebase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar al montar el componente
  useEffect(() => {
    if (currentUser?.uid) {
      loadProjectsFromFirebase();
    }
  }, [currentUser?.uid]);

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

  // Los proyectos se cargan directamente desde Firebase usando loadProjectsFromFirebase
  // No necesitamos el useQuery ya que replicamos la lógica exacta de EstimatesWizard

  // Filtrar proyectos según búsqueda
  const filteredProjects = projects.filter((project: Project) => {
    const matchesSearch = project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    console.log(`🔍 Filtering project ${project.clientName}: matches search = ${matchesSearch}`);
    return matchesSearch;
  });
  
  console.log(`📊 Debug - Projects loaded: ${projects.length}, Filtered: ${filteredProjects.length}`);

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

      {/* Filtros y controles */}
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
        
        <Button 
          onClick={loadProjectsFromFirebase} 
          variant="outline" 
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
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