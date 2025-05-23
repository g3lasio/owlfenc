import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Save } from "lucide-react";

// Importar los nuevos componentes refactorizados
import { ClientInformationStep } from "@/components/estimate/ClientInformationStep";
import { ProjectDetailsStep } from "@/components/estimate/ProjectDetailsStep";
import { MaterialsAndCostsStep } from "@/components/estimate/MaterialsAndCostsStep";
import { ReviewAndSendStep } from "@/components/estimate/ReviewAndSendStep";
import { EstimateSidebar } from "@/components/estimate/EstimateSidebar";

// Interfaces para tipado
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
}

interface Material {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  category?: string;
}

interface Labor {
  id: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
}

interface EstimateData {
  estimateNumber?: string;
  projectType?: string;
  projectSubtype?: string;
  timeline?: string;
  validUntil?: string;
  scope?: string;
  taxRate?: number;
  taxAmount?: number;
}

export default function EstimateGenerator() {
  const { toast } = useToast();
  
  // Estados principales
  const [currentStep, setCurrentStep] = useState<string>('client');
  const [clientData, setClientData] = useState<Client>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });
  
  const [estimateData, setEstimateData] = useState<EstimateData>({
    estimateNumber: `EST-${Date.now()}`,
    taxRate: 8.5
  });
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labor, setLabor] = useState<Labor[]>([]);
  
  // Estados para diálogos
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);
  const [showMaterialSearchDialog, setShowMaterialSearchDialog] = useState(false);
  
  // Estados para nuevos elementos
  const [newClientData, setNewClientData] = useState<Partial<Client>>({});
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({});
  
  // Estados de carga
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Query para obtener clientes existentes
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    initialData: []
  });

  // Query para obtener materiales del inventario
  const { data: inventoryMaterials = [] } = useQuery({
    queryKey: ['/api/materials'],
    initialData: []
  });

  // Funciones principales
  const handleSaveNewClient = async () => {
    if (!newClientData.name || !newClientData.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    const newClient: Client = {
      id: Date.now().toString(),
      name: newClientData.name,
      email: newClientData.email,
      phone: newClientData.phone || '',
      address: newClientData.address || '',
      company: newClientData.company || ''
    };

    setClientData(newClient);
    setNewClientData({});
    setShowClientDialog(false);
    
    toast({
      title: "Success",
      description: "Client information saved successfully"
    });
  };

  const handleSaveNewMaterial = () => {
    if (!newMaterial.name || !newMaterial.unit || !newMaterial.price) {
      toast({
        title: "Error",
        description: "Name, unit, and price are required",
        variant: "destructive"
      });
      return;
    }

    const material: Material = {
      id: Date.now().toString(),
      name: newMaterial.name,
      description: newMaterial.description || '',
      quantity: newMaterial.quantity || 0,
      unit: newMaterial.unit,
      price: newMaterial.price,
      total: (newMaterial.quantity || 0) * (newMaterial.price || 0),
      category: newMaterial.category
    };

    setMaterials([...materials, material]);
    setNewMaterial({});
    setShowAddMaterialDialog(false);
    
    toast({
      title: "Success",
      description: "Material added successfully"
    });
  };

  const handleGenerateAI = async () => {
    if (!estimateData.projectType) {
      toast({
        title: "Error",
        description: "Please select a project type first",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAI(true);
    
    try {
      // Simular generación AI (aquí conectarías con tu servicio AI real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiGeneratedScope = `Comprehensive ${estimateData.projectType.toLowerCase()} project including all necessary materials, labor, and safety considerations. This project will be completed according to local building codes and industry best practices.`;
      
      setEstimateData(prev => ({
        ...prev,
        scope: aiGeneratedScope
      }));
      
      toast({
        title: "Success",
        description: "AI-generated project scope added"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI content",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePreview = () => {
    toast({
      title: "Preview",
      description: "Opening estimate preview..."
    });
    // Aquí implementarías la lógica de preview
  };

  const handleDownload = () => {
    toast({
      title: "Download",
      description: "Generating PDF download..."
    });
    // Aquí implementarías la lógica de descarga
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      // Simular envío de email
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Success",
        description: `Estimate sent to ${clientData.email}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send estimate",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Estimate saved as draft"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save estimate",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navegación entre pasos
  const handleNextStep = () => {
    const steps = ['client', 'project', 'materials', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePreviousStep = () => {
    const steps = ['client', 'project', 'materials', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Render del contenido principal según el paso actual
  const renderMainContent = () => {
    switch (currentStep) {
      case 'client':
        return (
          <ClientInformationStep
            clientData={clientData}
            setClientData={setClientData}
            clients={clients}
            showClientDialog={showClientDialog}
            setShowClientDialog={setShowClientDialog}
            newClientData={newClientData}
            setNewClientData={setNewClientData}
            onSaveNewClient={handleSaveNewClient}
          />
        );
      
      case 'project':
        return (
          <ProjectDetailsStep
            estimateData={estimateData}
            setEstimateData={setEstimateData}
            onGenerateAI={handleGenerateAI}
            isGeneratingAI={isGeneratingAI}
          />
        );
      
      case 'materials':
        return (
          <MaterialsAndCostsStep
            materials={materials}
            setMaterials={setMaterials}
            labor={labor}
            setLabor={setLabor}
            estimateData={estimateData}
            setEstimateData={setEstimateData}
            showAddMaterialDialog={showAddMaterialDialog}
            setShowAddMaterialDialog={setShowAddMaterialDialog}
            showMaterialSearchDialog={showMaterialSearchDialog}
            setShowMaterialSearchDialog={setShowMaterialSearchDialog}
            newMaterial={newMaterial}
            setNewMaterial={setNewMaterial}
            onSaveNewMaterial={handleSaveNewMaterial}
            inventoryMaterials={inventoryMaterials}
          />
        );
      
      case 'review':
        return (
          <ReviewAndSendStep
            clientData={clientData}
            estimateData={estimateData}
            materials={materials}
            labor={labor}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onSend={handleSend}
            onSave={handleSave}
            isLoading={isLoading}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <EstimateSidebar
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        clientData={clientData}
        estimateData={estimateData}
        materials={materials}
        labor={labor}
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            <div className="lg:col-span-12">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Calculator className="h-6 w-6" />
                      Create Estimate
                    </h1>
                    <p className="text-gray-600 mt-1">
                      {estimateData.estimateNumber} • Step {['client', 'project', 'materials', 'review'].indexOf(currentStep) + 1} of 4
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Draft
                    </Button>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="space-y-6">
                {renderMainContent()}
                
                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={currentStep === 'client'}
                  >
                    Previous
                  </Button>
                  
                  <Button
                    onClick={handleNextStep}
                    disabled={currentStep === 'review'}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}