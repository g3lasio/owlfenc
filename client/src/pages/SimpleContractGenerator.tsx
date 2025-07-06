import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Database, Eye, FileText, CheckCircle, Plus, Trash2, Edit2, Sparkles, Shield, AlertCircle, DollarSign, Calendar, Wrench, FileCheck, Loader2, Brain, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Simple 3-step contract generator without complex state management
export default function SimpleContractGenerator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  
  // Editable fields state
  const [editableData, setEditableData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    startDate: "",
    completionDate: "",
    permitResponsibility: "contractor",
    warrantyYears: "1",
    paymentMilestones: [
      { id: 1, description: "Initial deposit", percentage: 50, amount: 0 },
      { id: 2, description: "Project completion", percentage: 50, amount: 0 }
    ]
  });
  
  const [suggestedClauses, setSuggestedClauses] = useState<any[]>([]);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
  
  const { currentUser } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  // Fetch AI-suggested legal clauses
  const fetchAISuggestedClauses = useCallback(async () => {
    if (!selectedProject) return;
    
    setIsLoadingClauses(true);
    try {
      const response = await fetch('/api/legal-defense/suggest-clauses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectType: selectedProject.projectType || 'construction',
          projectValue: selectedProject.totalAmount || selectedProject.totalPrice || selectedProject.displaySubtotal || 0,
          location: selectedProject.clientAddress || editableData.clientAddress || '',
          projectDescription: selectedProject.projectDescription || ''
        }),
      });

      if (!response.ok) throw new Error('Failed to load clause suggestions');
      
      const data = await response.json();
      setSuggestedClauses(data.clauses || []);
      setSelectedClauses(data.clauses?.filter((c: any) => c.mandatory).map((c: any) => c.id) || []);
    } catch (error) {
      console.error('Error loading clause suggestions:', error);
      // Use default clauses if AI fails
      const defaultClauses = [
        { id: 'liability', title: 'Limitation of Liability', description: 'Limits contractor liability to contract value', mandatory: true, risk: 'high' },
        { id: 'indemnity', title: 'Indemnification', description: 'Client indemnifies contractor from third-party claims', mandatory: true, risk: 'high' },
        { id: 'warranty', title: 'Warranty Terms', description: 'Limited warranty on workmanship and materials', mandatory: false, risk: 'medium' },
        { id: 'payment', title: 'Payment Terms', description: 'Late payment penalties and collection rights', mandatory: true, risk: 'medium' },
        { id: 'scope', title: 'Scope Changes', description: 'Additional work requires written change orders', mandatory: false, risk: 'low' },
        { id: 'force-majeure', title: 'Force Majeure', description: 'Protection from unforeseeable circumstances', mandatory: false, risk: 'medium' }
      ];
      
      setSuggestedClauses(defaultClauses);
      setSelectedClauses(defaultClauses.filter(c => c.mandatory).map(c => c.id));
    } finally {
      setIsLoadingClauses(false);
    }
  }, [selectedProject, editableData.clientAddress]);

  // Load projects for step 1
  const loadProjects = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setIsLoading(true);
    console.log("🔍 Loading estimates and projects for user:", currentUser.uid);
    
    try {
      // Load projects directly from Firebase to avoid backend issues
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      let allProjects = [];
      
      // 1. Load from estimates collection (primary source)
      console.log("📋 Loading from estimates collection...");
      const estimatesQuery = query(
        collection(db, "estimates"),
        where("firebaseUserId", "==", currentUser.uid)
      );
      
      const estimatesSnapshot = await getDocs(estimatesQuery);
      const firebaseEstimates = estimatesSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Extract client information properly
        const clientName = data.clientName || 
                          data.clientInformation?.name || 
                          data.client?.name || 
                          "Cliente sin nombre";
        
        const clientEmail = data.clientEmail || 
                           data.clientInformation?.email || 
                           data.client?.email || 
                           "";
                           
        const clientPhone = data.clientPhone || 
                           data.clientInformation?.phone || 
                           data.client?.phone || 
                           "";
        
        // Extract project details
        const projectType = data.projectType || 
                           data.projectDetails?.type || 
                           data.fenceType || 
                           "Construction";
        
        const projectDescription = data.projectDescription || 
                                  data.projectDetails || 
                                  data.description || 
                                  "";
        
        // Extract financial information
        let totalAmount = data.projectTotalCosts?.totalSummary?.finalTotal ||
                         data.projectTotalCosts?.total ||
                         data.total ||
                         data.estimateAmount ||
                         data.displayTotal ||
                         0;
        
        // Convert from cents if needed
        if (totalAmount > 10000) {
          totalAmount = totalAmount / 100;
        }
        
        return {
          id: doc.id,
          estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
          
          // Client information
          clientName,
          clientEmail,
          clientPhone,
          clientAddress: data.clientAddress || data.address || "",
          
          // Project information
          projectType,
          projectDescription,
          description: projectDescription,
          
          // Financial information
          totalAmount,
          totalPrice: totalAmount,
          displaySubtotal: totalAmount,
          displayTotal: totalAmount,
          
          // Items and costs
          items: data.items || data.projectTotalCosts?.materialCosts?.items || [],
          
          // Status
          status: data.status || "estimate",
          projectProgress: "estimate_ready",
          
          // Metadata
          createdAt: data.createdAt || new Date(),
          source: "estimates",
          originalData: data
        };
      });
      
      allProjects = [...allProjects, ...firebaseEstimates];
      console.log(`📋 Loaded ${firebaseEstimates.length} estimates from Firebase`);
      
      // 2. Also load from projects collection as backup
      console.log("🏗️ Loading from projects collection...");
      const projectsQuery = query(
        collection(db, "projects"),
        where("firebaseUserId", "==", currentUser.uid)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      const firebaseProjects = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: "projects"
      }));
      
      allProjects = [...allProjects, ...firebaseProjects];
      console.log(`🏗️ Loaded ${firebaseProjects.length} projects from Firebase`);

      // 3. Filter for valid projects with financial data
      const validProjects = allProjects.filter((project: any) => {
        const hasValidAmount = (project.totalAmount || project.totalPrice || project.displaySubtotal || 0) > 0;
        const hasClientName = project.clientName && project.clientName !== "Cliente sin nombre";
        return hasValidAmount && hasClientName;
      });
      
      setProjects(validProjects);
      console.log(`✅ Total loaded: ${validProjects.length} valid projects`);
      
      if (validProjects.length === 0) {
        console.log("❌ No valid projects found. User needs to create estimates first.");
        toast({
          title: "No Projects Found",
          description: "Create estimates first to generate contracts.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("❌ Error loading projects:", error);
      setProjects([]);
      toast({
        title: "Error Loading Projects",
        description: "Could not connect to load your projects. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  // Set up real-time Firebase listener for projects
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log("🔄 Setting up real-time project listener for user:", currentUser.uid);
    
    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", currentUser.uid)
    );
    
    // Real-time listener
    const unsubscribe = onSnapshot(projectsQuery, 
      (snapshot) => {
        const allProjects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter approved projects with expanded criteria
        const approvedProjects = allProjects.filter((project: any) => 
          project.status === "approved" || 
          project.status === "estimate_ready" || 
          project.status === "estimate" ||
          project.projectProgress === "approved" ||
          project.projectProgress === "client_approved" ||
          project.projectProgress === "estimate_ready" ||
          project.displaySubtotal > 0
        );
        
        setProjects(approvedProjects);
        console.log(`📊 Real-time update: ${approvedProjects.length} approved projects`);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase listener error:", error);
        toast({
          title: "Connection Error",
          description: "Real-time updates unavailable. Please refresh the page.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser?.uid, toast]);
  
  // Initialize editable data when project is selected
  useEffect(() => {
    if (selectedProject) {
      const totalAmount = selectedProject.totalAmount || selectedProject.totalPrice || selectedProject.displaySubtotal || 0;
      setEditableData(prev => ({
        ...prev,
        clientName: selectedProject.clientName || selectedProject.client?.name || selectedProject.client || '',
        clientEmail: selectedProject.clientEmail || selectedProject.client?.email || '',
        clientPhone: selectedProject.clientPhone || selectedProject.client?.phone || '',
        clientAddress: selectedProject.clientAddress || selectedProject.client?.address || selectedProject.address || '',
        paymentMilestones: [
          { id: 1, description: "Initial deposit", percentage: 50, amount: totalAmount * 0.5 },
          { id: 2, description: "Project completion", percentage: 50, amount: totalAmount * 0.5 }
        ]
      }));
    }
  }, [selectedProject]);

  // Step 1: Select project and move to step 2 with direct data processing
  const handleProjectSelect = useCallback(async (project: any) => {
    console.log("🎯 Selecting project:", project);
    setIsLoading(true);
    
    try {
      // Validate project data
      if (!project) {
        throw new Error("No project data provided");
      }
      
      // Extract client data from various possible sources with comprehensive fallbacks
      const clientName = project.clientName || 
                        project.clientInformation?.name || 
                        project.client?.name || 
                        project.client || 
                        "Cliente sin nombre";
      
      const clientEmail = project.clientEmail || 
                         project.clientInformation?.email || 
                         project.client?.email || 
                         "";
      
      const clientPhone = project.clientPhone || 
                         project.clientInformation?.phone || 
                         project.client?.phone || 
                         "";
      
      const clientAddress = project.clientAddress || 
                           project.address || 
                           project.clientInformation?.address || 
                           project.client?.address || 
                           "";
      
      // Extract project details
      const projectType = project.projectType || 
                         project.projectDetails?.type || 
                         project.fenceType || 
                         "Construction";
      
      const projectDescription = project.projectDescription || 
                                project.description || 
                                project.projectDetails || 
                                `${projectType} project for ${clientName}`;
      
      // Extract financial data
      let totalAmount = project.totalAmount || 
                       project.totalPrice || 
                       project.displaySubtotal || 
                       project.displayTotal || 
                       project.total || 
                       project.estimateAmount || 
                       0;
      
      // Convert from cents if needed
      if (totalAmount > 10000) {
        totalAmount = totalAmount / 100;
      }
      
      // Process project data comprehensively
      const contractData = {
        clientInfo: {
          name: clientName,
          address: clientAddress,
          email: clientEmail,
          phone: clientPhone,
        },
        projectDetails: {
          description: projectDescription,
          type: projectType,
        },
        financials: {
          total: totalAmount,
        },
        materials: project.items || project.materials || [],
        originalData: project.originalData || project
      };
      
      console.log("📋 Processed contract data:", contractData);
      
      setSelectedProject(project);
      setContractData(contractData);
      
      // Initialize editable data with comprehensive project data
      setEditableData({
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        startDate: "",
        completionDate: "",
        permitResponsibility: "contractor",
        warrantyYears: "1",
        paymentMilestones: [
          { id: 1, description: "Initial deposit", percentage: 50, amount: totalAmount * 0.5 },
          { id: 2, description: "Project completion", percentage: 50, amount: totalAmount * 0.5 }
        ],
        suggestedClauses: [],
        selectedClauses: [],
        customClauses: []
      });
      
      setCurrentStep(2);
      
      // Load AI-suggested clauses
      loadSuggestedClauses(project);
      
      toast({
        title: "Project Selected",
        description: `Ready to generate contract for ${project.clientName}`,
      });
      
      console.log("Project selected and processed:", {
        projectId: project.id,
        clientName: project.clientName,
        totalAmount: contractData.financials.total
      });
    } catch (error) {
      console.error("Error selecting project:", error);
      toast({
        title: "Error",
        description: "Failed to process project data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  // Generate contract using backend API with comprehensive data
  const handleGenerateContract = useCallback(async () => {
    if (!selectedProject || !currentUser?.uid) return;
    
    setIsLoading(true);
    try {
      // Collect comprehensive contract data
      const contractPayload = {
        userId: currentUser.uid,
        client: {
          name: editableData.clientName || contractData?.clientInfo?.name || selectedProject.clientName,
          address: editableData.clientAddress || contractData?.clientInfo?.address || selectedProject.address || selectedProject.clientAddress || "",
          email: editableData.clientEmail || contractData?.clientInfo?.email || selectedProject.clientEmail || "",
          phone: editableData.clientPhone || contractData?.clientInfo?.phone || selectedProject.clientPhone || "",
        },
        project: {
          description: contractData?.projectDetails?.description || selectedProject.description || selectedProject.projectDescription || selectedProject.projectType || "",
          type: selectedProject.projectType || "Construction Project",
          total: parseFloat((contractData?.financials?.total || selectedProject.totalAmount || selectedProject.totalPrice || selectedProject.displaySubtotal || selectedProject.total || 0).toString()),
          materials: contractData?.materials || selectedProject.materials || [],
        },
        contractor: {
          name: profile?.ownerName || profile?.company || "Contractor Name",
          company: profile?.company || "Company Name",
          address: profile?.address ? 
            `${profile.address}${profile.city ? `, ${profile.city}` : ''}${profile.state ? `, ${profile.state}` : ''}${profile.zipCode ? ` ${profile.zipCode}` : ''}` : 
            "Business Address",
          phone: profile?.phone || profile?.mobilePhone || "Business Phone", 
          email: profile?.email || "business@email.com",
          license: profile?.licenseNumber || profile?.license || "License Number"
        },
        timeline: {
          startDate: editableData.startDate || new Date().toISOString().split('T')[0],
          completionDate: editableData.completionDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedDuration: editableData.startDate && editableData.completionDate ? 
            `${Math.ceil((new Date(editableData.completionDate).getTime() - new Date(editableData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days` : 
            "To be agreed",
        },
        financials: {
          total: parseFloat((contractData?.financials?.total || selectedProject.totalAmount || selectedProject.totalPrice || selectedProject.displaySubtotal || selectedProject.total || 0).toString()),
          paymentMilestones: editableData.paymentMilestones,
        },
        permitInfo: {
          required: true,
          responsibility: editableData.permitResponsibility,
          numbers: "",
        },
        warranty: {
          years: editableData.warrantyYears,
        },
        legalClauses: {
          selected: selectedClauses,
          clauses: suggestedClauses.filter(c => selectedClauses.includes(c.id))
        },
        insuranceInfo: {
          general: { required: true, amount: "$1,000,000" },
          workers: { required: true, amount: "$500,000" },
          bond: { required: false, amount: "0" },
        },
        warranties: {
          workmanship: "2 years",
          materials: "Manufacturer warranty",
        },
        additionalTerms: "",
        
        // Pass the complete selected project data for contractor extraction
        originalRequest: selectedProject,
      };

      console.log("Generating contract with payload:", contractPayload);

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(contractPayload),
      });

      if (response.ok && response.headers.get("content-type")?.includes("application/pdf")) {
        // PDF generated successfully
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `contract_${selectedProject.clientName}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setGeneratedContract("PDF Generated Successfully");
        setCurrentStep(3);
        
        toast({
          title: "Contract Generated",
          description: `Professional PDF contract downloaded for ${selectedProject.clientName}`,
        });
      } else {
        const errorText = await response.text();
        console.error("Contract generation failed:", errorText);
        throw new Error(`Failed to generate contract PDF: ${response.status}`);
      }
    } catch (error) {
      console.error("Error generating contract:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [contractData, selectedProject, currentUser?.uid, toast]);

  // Reset to start new contract
  const handleNewContract = useCallback(() => {
    setCurrentStep(1);
    setSelectedProject(null);
    setContractData(null);
    setGeneratedContract("");
    setEditableData({
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      startDate: "",
      completionDate: "",
      permitResponsibility: "contractor",
      warrantyYears: "1",
      paymentMilestones: [
        { id: 1, description: "Initial deposit", percentage: 50, amount: 0 },
        { id: 2, description: "Project completion", percentage: 50, amount: 0 }
      ]
    });
    setSuggestedClauses([]);
    setSelectedClauses([]);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center text-cyan-400">
          Legal Defense Contract Generator
        </h1>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center space-x-2 ${
                  currentStep >= step ? "text-cyan-400" : "text-gray-500"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    currentStep >= step
                      ? "border-cyan-400 bg-cyan-400 text-black"
                      : "border-gray-500"
                  }`}
                >
                  {step}
                </div>
                <span className="text-sm hidden md:inline">
                  {step === 1 && "Select Project"}
                  {step === 2 && "Review & Generate"}
                  {step === 3 && "Download & Complete"}
                </span>
                {step < 3 && <div className="w-8 h-0.5 bg-gray-600"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Project Selection */}
        {currentStep === 1 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Database className="h-5 w-5" />
                Step 1: Select Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading projects...</p>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.slice(0, 10).map((project) => (
                      <div
                        key={project.id}
                        className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-cyan-400 hover:bg-gray-800/80 cursor-pointer transition-all duration-200"
                        onClick={() => handleProjectSelect(project)}
                      >
                        {/* Contenido principal del card */}
                        <div className="space-y-3">
                          {/* Cliente y monto - Línea principal */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-white truncate">
                                {project.clientName || project.client?.name || project.client || `Project ${project.estimateNumber || project.id}`}
                              </h3>
                              <p className="text-cyan-400 font-semibold text-sm mt-1">
                                ${(project.totalAmount || project.totalPrice || project.displaySubtotal || 0).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black shrink-0 text-xs px-3"
                            >
                              Select
                            </Button>
                          </div>
                          
                          {/* Tipo de proyecto */}
                          <div className="bg-gray-700/50 rounded-lg px-3 py-2">
                            <span className="text-gray-300 text-sm">
                              {project.projectType || project.description || "Construction Project"}
                            </span>
                          </div>
                          
                          {/* Información de contacto compacta */}
                          <div className="grid grid-cols-1 gap-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 min-w-0 w-12 shrink-0">Email:</span>
                              <span className="text-gray-300 truncate">
                                {project.clientEmail || project.client?.email || "Not provided"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 min-w-0 w-12 shrink-0">Phone:</span>
                              <span className="text-gray-300">
                                {project.clientPhone || project.client?.phone || "Not provided"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No approved projects found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Create an estimate first to generate contracts
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review & Generate */}
        {currentStep === 2 && selectedProject && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Eye className="h-5 w-5" />
                Step 2: Review & Customize Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Editable Client Information */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    Client Information (Editable)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Client Name</Label>
                      <Input
                        value={editableData.clientName}
                        onChange={(e) => setEditableData(prev => ({ ...prev, clientName: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Client Email</Label>
                      <Input
                        type="email"
                        value={editableData.clientEmail}
                        onChange={(e) => setEditableData(prev => ({ ...prev, clientEmail: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="client@email.com"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Client Phone</Label>
                      <Input
                        value={editableData.clientPhone}
                        onChange={(e) => setEditableData(prev => ({ ...prev, clientPhone: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Client Address</Label>
                      <Input
                        value={editableData.clientAddress}
                        onChange={(e) => setEditableData(prev => ({ ...prev, clientAddress: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="123 Main St, City, State ZIP"
                      />
                    </div>
                  </div>
                </div>

                {/* Editable Timeline */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Project Timeline (Editable)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Start Date</Label>
                      <Input
                        type="date"
                        value={editableData.startDate}
                        onChange={(e) => setEditableData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="To be agreed with client"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty for "To be agreed with client and contractor"</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Completion Date</Label>
                      <Input
                        type="date"
                        value={editableData.completionDate}
                        onChange={(e) => setEditableData(prev => ({ ...prev, completionDate: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="To be determined"
                      />
                      <p className="text-xs text-gray-500 mt-1">Based on project complexity</p>
                    </div>
                  </div>
                </div>

                {/* Contractor Information (Read-only from Profile) */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contractor Information (From Company Profile)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Company Name</Label>
                      <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                        {profile?.company || "Not set in profile"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400">Owner Name</Label>
                      <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                        {profile?.ownerName || "Not set in profile"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400">Business Address</Label>
                      <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                        {profile?.address ? 
                          `${profile.address}${profile.city ? `, ${profile.city}` : ''}${profile.state ? `, ${profile.state}` : ''}${profile.zipCode ? ` ${profile.zipCode}` : ''}` : 
                          "Not set in profile"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400">Business Phone</Label>
                      <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                        {profile?.phone || profile?.mobilePhone || "Not set in profile"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400">Business Email</Label>
                      <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                        {profile?.email || "Not set in profile"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400">License Number</Label>
                      <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
                        {profile?.licenseNumber || profile?.license || "Not set in profile"}
                      </div>
                    </div>
                  </div>
                  {(!profile?.company || !profile?.address) && (
                    <div className="mt-3 text-sm text-yellow-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Please complete your Company Profile to ensure accurate contractor information
                    </div>
                  )}
                </div>

                {/* Dynamic Payment Milestones */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment Milestones (Customizable)
                  </h3>
                  <div className="space-y-4">
                    {editableData.paymentMilestones.map((milestone, index) => (
                      <div key={milestone.id} className="border border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-cyan-400">Milestone {index + 1}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (editableData.paymentMilestones.length > 1) {
                                const newMilestones = editableData.paymentMilestones.filter((_, i) => i !== index);
                                setEditableData(prev => ({ ...prev, paymentMilestones: newMilestones }));
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                            disabled={editableData.paymentMilestones.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="text-gray-400">Description</Label>
                            <Input
                              value={milestone.description}
                              onChange={(e) => {
                                const newMilestones = [...editableData.paymentMilestones];
                                newMilestones[index].description = e.target.value;
                                setEditableData(prev => ({ ...prev, paymentMilestones: newMilestones }));
                              }}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="Payment description"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-gray-400">Percentage</Label>
                              <Input
                                type="number"
                                value={milestone.percentage}
                                onChange={(e) => {
                                  const newMilestones = [...editableData.paymentMilestones];
                                  const newPercentage = parseInt(e.target.value) || 0;
                                  newMilestones[index].percentage = newPercentage;
                                  const totalAmount = selectedProject.totalAmount || selectedProject.totalPrice || selectedProject.displaySubtotal || 0;
                                  newMilestones[index].amount = totalAmount * (newPercentage / 100);
                                  setEditableData(prev => ({ ...prev, paymentMilestones: newMilestones }));
                                }}
                                className="bg-gray-800 border-gray-600 text-white"
                                min="0"
                                max="100"
                                placeholder="%"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-400">Amount</Label>
                              <div className="text-lg font-semibold text-green-400 mt-2">
                                ${milestone.amount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newId = Math.max(...editableData.paymentMilestones.map(m => m.id)) + 1;
                          const remainingPercentage = 100 - editableData.paymentMilestones.reduce((sum, m) => sum + m.percentage, 0);
                          const totalAmount = selectedProject.totalAmount || selectedProject.totalPrice || selectedProject.displaySubtotal || 0;
                          const newMilestone = {
                            id: newId,
                            description: `Milestone ${newId}`,
                            percentage: remainingPercentage > 0 ? remainingPercentage : 0,
                            amount: totalAmount * (remainingPercentage / 100)
                          };
                          setEditableData(prev => ({ 
                            ...prev, 
                            paymentMilestones: [...prev.paymentMilestones, newMilestone]
                          }));
                        }}
                        className="border-cyan-400 text-cyan-400"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Milestone
                      </Button>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-400">
                          Total: {editableData.paymentMilestones.reduce((sum, m) => sum + m.percentage, 0)}%
                        </p>
                        <p className="text-xs text-yellow-400">
                          {editableData.paymentMilestones.reduce((sum, m) => sum + m.percentage, 0) !== 100 && "⚠️ Should equal 100%"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable Warranties & Permits */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Warranties & Permits (Options)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Warranty Period</Label>
                      <Select
                        value={editableData.warrantyYears}
                        onValueChange={(value) => setEditableData(prev => ({ ...prev, warrantyYears: value }))}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Year</SelectItem>
                          <SelectItem value="2">2 Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-400">Permit Responsibility</Label>
                      <Select
                        value={editableData.permitResponsibility}
                        onValueChange={(value) => setEditableData(prev => ({ ...prev, permitResponsibility: value }))}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contractor">Contractor obtains permits</SelectItem>
                          <SelectItem value="client">Client obtains permits</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* AI-Powered Legal Clauses */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Powered Legal Defense Clauses
                  </h3>
                  
                  {/* Loading state for AI clauses */}
                  {isLoadingClauses && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
                      <span className="text-gray-400">Analyzing project for optimal legal protection...</span>
                    </div>
                  )}
                  
                  {/* AI Generated Clauses */}
                  {!isLoadingClauses && suggestedClauses.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400 mb-4">
                        Based on your ${(selectedProject.totalAmount || 0).toLocaleString()} {selectedProject.projectType || 'construction'} project, 
                        AI recommends these protection clauses:
                      </p>
                      
                      {suggestedClauses.map((clause) => (
                        <div key={clause.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                          <Checkbox
                            checked={selectedClauses.includes(clause.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedClauses(prev => [...prev, clause.id]);
                              } else {
                                setSelectedClauses(prev => prev.filter(id => id !== clause.id));
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white">{clause.title}</span>
                              {clause.risk === 'high' && (
                                <Badge variant="destructive" className="text-xs">High Risk</Badge>
                              )}
                              {clause.risk === 'medium' && (
                                <Badge variant="secondary" className="text-xs">Medium Risk</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{clause.description}</p>
                          </div>
                        </div>
                      ))}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchAISuggestedClauses}
                        className="w-full mt-4 border-cyan-400 text-cyan-400"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate AI Suggestions
                      </Button>
                    </div>
                  )}
                  
                  {/* Fallback if no clauses */}
                  {!isLoadingClauses && suggestedClauses.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">Click to get AI-powered legal protection suggestions</p>
                      <Button
                        size="sm"
                        onClick={fetchAISuggestedClauses}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Get AI Suggestions
                      </Button>
                    </div>
                  )}
                </div>

                {/* Project Description Preview */}
                {selectedProject.projectDescription && (
                  <div className="border border-gray-600 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-cyan-400">📝 Scope of Work</h3>
                    <div className="text-gray-300 text-sm max-h-32 overflow-y-auto">
                      {selectedProject.projectDescription.slice(0, 300)}...
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  >
                    Back to Projects
                  </Button>
                  <Button
                    onClick={handleGenerateContract}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8"
                  >
                    {isLoading ? "Generating..." : "Generate Contract"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                Step 3: Contract Generated Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6">
                <div className="bg-green-900/30 border border-green-400 rounded-lg p-6">
                  <FileText className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-400 mb-2">
                    Contract Ready!
                  </h3>
                  <p className="text-gray-300">
                    Professional legal contract has been generated and downloaded for{" "}
                    <span className="text-white font-semibold">
                      {selectedProject?.clientName}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleGenerateContract}
                    variant="outline"
                    className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                  >
                    Download Again
                  </Button>
                  <Button
                    onClick={handleNewContract}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8"
                  >
                    Generate New Contract
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}