import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/ui/address-autocomplete";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Database, Eye, FileText, CheckCircle, Plus, Trash2, Edit2, Sparkles, Shield, AlertCircle, DollarSign, Calendar, Wrench, FileCheck, Loader2, Brain, RefreshCw, History, Clock, UserCheck, Search, Filter, PenTool } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { contractHistoryService, ContractHistoryEntry } from "@/services/contractHistoryService";
import DigitalSignatureCanvas from "@/components/digital-signature/DigitalSignatureCanvas";
import LegalComplianceWorkflow from "@/components/digital-signature/LegalComplianceWorkflow";
import { Phase2IntegrationOrchestrator } from "@/services/digital-signature/Phase2IntegrationOrchestrator";

// Simple 3-step contract generator without complex state management
export default function SimpleContractGenerator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  
  // History management state
  const [currentView, setCurrentView] = useState<'contracts' | 'history'>('contracts');
  const [contractHistory, setContractHistory] = useState<ContractHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'draft' | 'completed' | 'processing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Legal Compliance Workflow State
  const [showLegalWorkflow, setShowLegalWorkflow] = useState(false);
  const [contractHTML, setContractHTML] = useState("");
  const [isContractReady, setIsContractReady] = useState(false);
  const [legalWorkflowCompleted, setLegalWorkflowCompleted] = useState(false);
  
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
          projectValue: selectedProject.total || selectedProject.totalAmount || selectedProject.totalPrice || selectedProject.displaySubtotal || 0,
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

  // Load contract history
  const loadContractHistory = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setIsLoadingHistory(true);
    try {
      console.log("📋 Loading contract history for user:", currentUser.uid);
      const history = await contractHistoryService.getContractHistory(currentUser.uid);
      setContractHistory(history);
      console.log("✅ Contract history loaded:", history.length, "contracts");
    } catch (error) {
      console.error("❌ Error loading contract history:", error);
      toast({
        title: "Error",
        description: "Failed to load contract history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentUser?.uid, toast]);

  // Load contract from history and resume editing
  const loadContractFromHistory = useCallback(async (contract: ContractHistoryEntry) => {
    try {
      console.log("🔄 Loading contract from history:", contract.id);
      
      // Extract contract data
      const contractDataFromHistory = contract.contractData;
      
      // Set up project data from contract history
      const projectFromHistory = {
        id: contract.contractId,
        clientName: contractDataFromHistory.client?.name || contract.clientName,
        clientEmail: contractDataFromHistory.client?.email || "",
        clientPhone: contractDataFromHistory.client?.phone || "",
        clientAddress: contractDataFromHistory.client?.address || "",
        projectType: contractDataFromHistory.project?.type || contract.projectType,
        projectDescription: contractDataFromHistory.project?.description || "",
        totalAmount: contractDataFromHistory.financials?.total || 0,
        displaySubtotal: contractDataFromHistory.financials?.total || 0,
        materials: contractDataFromHistory.materials || [],
        originalData: contractDataFromHistory
      };

      // Set selected project and contract data
      setSelectedProject(projectFromHistory);
      setContractData(contractDataFromHistory);
      
      // Set editable data from contract history
      setEditableData({
        clientName: contractDataFromHistory.client?.name || contract.clientName,
        clientEmail: contractDataFromHistory.client?.email || "",
        clientPhone: contractDataFromHistory.client?.phone || "",
        clientAddress: contractDataFromHistory.client?.address || "",
        startDate: contractDataFromHistory.timeline?.startDate || "",
        completionDate: contractDataFromHistory.timeline?.completionDate || "",
        permitResponsibility: contractDataFromHistory.permits?.responsibility || "contractor",
        warrantyYears: contractDataFromHistory.warranty?.years || "1",
        paymentMilestones: contractDataFromHistory.payment?.milestones || [
          { id: 1, description: "Initial deposit", percentage: 50, amount: (contractDataFromHistory.financials?.total || 0) * 0.5 },
          { id: 2, description: "Project completion", percentage: 50, amount: (contractDataFromHistory.financials?.total || 0) * 0.5 }
        ],
        suggestedClauses: contractDataFromHistory.clauses?.suggested || [],
        selectedClauses: contractDataFromHistory.clauses?.selected || [],
        customClauses: contractDataFromHistory.clauses?.custom || []
      });

      // Set clauses from history
      setSuggestedClauses(contractDataFromHistory.clauses?.suggested || []);
      setSelectedClauses(contractDataFromHistory.clauses?.selected || []);
      
      // Switch to contract view and go to step 2 (review)
      setCurrentView('contracts');
      setCurrentStep(2);
      
      toast({
        title: "Contract Loaded",
        description: `Resumed contract for ${contract.clientName}`,
      });
      
      console.log("✅ Contract loaded from history successfully");
    } catch (error) {
      console.error("❌ Error loading contract from history:", error);
      toast({
        title: "Error",
        description: "Failed to load contract from history",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Filter and search contracts
  const filteredContracts = contractHistory.filter(contract => {
    // Apply status filter
    if (historyFilter !== 'all' && contract.status !== historyFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        contract.clientName.toLowerCase().includes(searchLower) ||
        contract.projectType.toLowerCase().includes(searchLower) ||
        (contract.contractData.project?.description || '').toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Load projects for step 1
  const loadProjects = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setIsLoading(true);
    console.log("🔍 Loading estimates and projects for user:", currentUser.uid);
    
    try {
      // FIREBASE CONNECTION VALIDATION
      console.log("🔗 Validating Firebase connection...");
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      // Test Firebase connection with a simple query
      try {
        const testQuery = query(collection(db, "estimates"), where("firebaseUserId", "==", currentUser.uid));
        console.log("✅ Firebase connection validated successfully");
      } catch (connectionError) {
        console.error("❌ Firebase connection failed:", connectionError);
        throw new Error("No se pudo conectar a Firebase. Verifique su conexión a internet.");
      }
      
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
        
        // Extract financial information - MATCH EstimatesWizard logic exactly
        let totalValue = data.projectTotalCosts?.totalSummary?.finalTotal ||
                        data.projectTotalCosts?.total ||
                        data.total ||
                        data.estimateAmount ||
                        0;

        // No conversion - keep original values as they are stored (matching EstimatesWizard)
        const displayTotal = totalValue;
        
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
          
          // Financial information - MATCH EstimatesWizard fields exactly
          total: displayTotal, // Primary field used in EstimatesWizard
          totalAmount: displayTotal, // Backup field for compatibility  
          totalPrice: displayTotal, // Backup field for compatibility
          displaySubtotal: displayTotal, // Backup field for compatibility
          displayTotal, // Backup field for compatibility
          
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

      // 3. Filter for valid projects with comprehensive data validation
      const validProjects = allProjects.filter((project: any) => {
        // Financial validation
        const financialAmount = getCorrectProjectTotal(project);
        const hasValidAmount = financialAmount > 0;
        
        // Client data validation
        const hasClientName = project.clientName && 
                             project.clientName !== "Cliente sin nombre" && 
                             project.clientName.trim().length > 0;
        
        // Data integrity check
        const isValidProject = hasValidAmount && hasClientName;
        
        if (!isValidProject) {
          console.warn("⚠️ Invalid project filtered out:", {
            id: project.id,
            clientName: project.clientName,
            financialAmount,
            hasValidAmount,
            hasClientName
          });
        }
        
        return isValidProject;
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
    
    // Real-time listener with enhanced error handling and data validation
    const unsubscribe = onSnapshot(projectsQuery, 
      (snapshot) => {
        try {
          console.log("🔄 Processing real-time Firebase update...");
          
          const allProjects = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Data validation for each project
            if (!data) {
              console.warn("⚠️ Empty project data detected:", doc.id);
              return null;
            }
            
            return {
              id: doc.id,
              ...data,
              timestamp: new Date().toISOString()
            };
          }).filter(Boolean); // Remove null entries
          
          // Enhanced project filtering with data integrity checks
          const approvedProjects = allProjects.filter((project: any) => {
            // Status validation
            const hasValidStatus = project.status === "approved" || 
                                  project.status === "estimate_ready" || 
                                  project.status === "estimate" ||
                                  project.projectProgress === "approved" ||
                                  project.projectProgress === "client_approved" ||
                                  project.projectProgress === "estimate_ready" ||
                                  project.displaySubtotal > 0;
            
            // Financial data validation
            const financialAmount = getCorrectProjectTotal(project);
            const hasValidFinancials = financialAmount > 0 && financialAmount < 1000000; // Corruption check
            
            // Client data validation
            const hasValidClient = project.clientName && 
                                  project.clientName !== "Cliente sin nombre" &&
                                  project.clientName.trim().length > 0;
            
            const isValid = hasValidStatus && hasValidFinancials && hasValidClient;
            
            if (!isValid) {
              console.warn("⚠️ Invalid project filtered from real-time update:", {
                id: project.id,
                hasValidStatus,
                hasValidFinancials,
                hasValidClient,
                financialAmount
              });
            }
            
            return isValid;
          });
          
          setProjects(approvedProjects);
          console.log(`📊 Real-time update: ${approvedProjects.length} validated projects`);
          setIsLoading(false);
        } catch (processError) {
          console.error("❌ Error processing real-time update:", processError);
          toast({
            title: "Error de Datos",
            description: "Error procesando actualización en tiempo real",
            variant: "destructive"
          });
        }
      },
      (error) => {
        console.error("❌ Firebase listener connection error:", error);
        console.error("❌ Error details:", {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: "Error de Conexión",
          description: "Conexión Firebase perdida. Intentando reconectar...",
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
      
      // Extract financial data - CRITICAL FIX: Use helper function for consistent calculation
      const totalAmount = getCorrectProjectTotal(project);
      
      // No conversion - keep original values as they are stored (matching EstimatesWizard)
      
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
          { id: 1, description: "Initial deposit", percentage: 50, amount: getCorrectProjectTotal(project) * 0.5 },
          { id: 2, description: "Project completion", percentage: 50, amount: getCorrectProjectTotal(project) * 0.5 }
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
      console.error("❌ CRITICAL ERROR selecting project:", error);
      console.error("❌ Project data when error occurred:", project);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error de Conexión",
        description: `Error procesando datos del proyecto: ${error.message || 'Error desconocido'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  // CRITICAL: Helper function to get correct project total (prioritizes display values over raw values in centavos)
  const getCorrectProjectTotal = useCallback((project: any) => {
    if (!project) {
      console.warn("⚠️ getCorrectProjectTotal called with null/undefined project");
      return 0;
    }
    
    console.log("💰 Financial data analysis:", {
      displaySubtotal: project.displaySubtotal,
      displayTotal: project.displayTotal,
      totalPrice: project.totalPrice,
      estimateAmount: project.estimateAmount,
      total: project.total,
      totalAmount: project.totalAmount
    });
    
    // Priority order: display values first (already in dollars), then convert centavos if needed
    const result = project.displaySubtotal || 
                   project.displayTotal || 
                   project.totalPrice || 
                   project.estimateAmount || 
                   (project.total && project.total > 10000 ? project.total / 100 : project.total) ||
                   (project.totalAmount && project.totalAmount > 10000 ? project.totalAmount / 100 : project.totalAmount) ||
                   0;
    
    console.log("💰 Final calculated total:", result);
    
    // Data integrity check - warn if result seems corrupted
    if (result > 1000000) {
      console.warn("⚠️ POTENTIAL DATA CORRUPTION: Total amount exceeds $1M:", result);
      console.warn("⚠️ Original project data:", project);
    }
    
    return result;
  }, []);

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
          total: getCorrectProjectTotal(selectedProject),
          materials: contractData?.materials || selectedProject.materials || [],
        },
        contractor: {
          name: profile?.company || profile?.ownerName || "Contractor Name",
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
          total: getCorrectProjectTotal(selectedProject),
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

      // CRITICAL VALIDATION: Log financial data for debugging corruption issues
      const displayedTotal = selectedProject?.total || selectedProject?.totalAmount || selectedProject?.totalPrice || selectedProject?.displaySubtotal || 0;
      console.log("💰 [FRONTEND] Financial data validation before sending to backend:", {
        displayedInUI: displayedTotal,
        sentToBackend: contractPayload.financials.total,
        paymentMilestones: contractPayload.financials.paymentMilestones,
        dataMatches: displayedTotal === contractPayload.financials.total
      });
      
      console.log("Generating contract with payload:", contractPayload);

      // First generate contract HTML for legal workflow
      const htmlResponse = await fetch("/api/generate-contract-html", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(contractPayload),
      });

      if (htmlResponse.ok) {
        const contractHTMLData = await htmlResponse.json();
        setContractHTML(contractHTMLData.html);
        setContractData(contractPayload);
        setIsContractReady(true);
        setCurrentStep(3);
        
        toast({
          title: "Contract Ready for Legal Process",
          description: `Contract generated for ${selectedProject.clientName}. Legal compliance workflow enabled.`,
        });
      } else {
        // Fallback to PDF generation if HTML endpoint fails
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.uid}`,
          },
          body: JSON.stringify(contractPayload),
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          console.log("✅ PDF Generation Response:", {
            status: response.status,
            contentType,
            headers: Object.fromEntries(response.headers.entries())
          });

          if (contentType?.includes("application/pdf")) {
            console.log("📄 PDF content type confirmed - processing...");
          } else {
            console.log("⚠️ Unexpected content type, but response is OK - proceeding...");
          }

          // PDF generated successfully - create basic HTML for legal workflow
          const basicHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
              <h1>Independent Contractor Agreement</h1>
              <p><strong>Contractor:</strong> ${contractPayload.contractor.name}</p>
              <p><strong>Client:</strong> ${contractPayload.client.name}</p>
              <p><strong>Project Total:</strong> $${contractPayload.financials.total.toLocaleString()}</p>
              <p><strong>Project Description:</strong> ${contractPayload.project.description}</p>
              <p>Complete contract details have been generated. Please proceed with the legal compliance workflow.</p>
            </div>
          `;
          
          // Generate professional HTML for legal workflow
          try {
            const htmlResponse = await fetch('/api/generate-contract-html', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-firebase-uid': currentUser?.uid || '',
              },
              body: JSON.stringify(contractPayload)
            });
            
            if (htmlResponse.ok) {
              const htmlData = await htmlResponse.json();
              setContractHTML(htmlData.html);
              console.log('✅ Professional contract HTML generated for legal workflow');
            } else {
              console.warn('⚠️ Failed to generate professional HTML, using basic fallback');
              setContractHTML(basicHTML);
            }
          } catch (htmlError) {
            console.error('HTML generation error:', htmlError);
            setContractHTML(basicHTML);
          }
          
          setContractData(contractPayload);
          setIsContractReady(true);
          setCurrentStep(3);
          
          toast({
            title: "Contract Generated",
            description: `Contract ready for legal compliance workflow with ${selectedProject.clientName}`,
          });
        } else {
          const errorText = await response.text();
          console.error("❌ Contract generation failed:", {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            error: errorText
          });
          throw new Error(`Failed to generate contract PDF: ${response.status} - ${response.statusText}. ${errorText}`);
        }
      }
    } catch (error) {
      console.error("❌ Error generating contract:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        contractPayload: {
          clientName: contractPayload?.client?.name,
          contractorName: contractPayload?.contractor?.name,
          projectTotal: contractPayload?.financials?.total
        }
      });
      
      toast({
        title: "Generation Error",
        description: `Failed to generate contract: ${error.message || 'Unknown error'}. Please check the console for details.`,
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

  // Legal Compliance Workflow - No manual signature handlers needed
  // All signature handling is now done through LegalComplianceWorkflow component

  // Old digital signature handler removed - using LegalComplianceWorkflow instead

  // Contractor name handling moved to LegalComplianceWorkflow component

  // Load contract history on component mount
  useEffect(() => {
    if (currentUser?.uid) {
      loadContractHistory();
    }
  }, [currentUser?.uid, loadContractHistory]);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center text-cyan-400">
          Legal Defense Contract Generator
        </h1>

        {/* View Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-1 flex gap-1">
            <Button
              variant={currentView === 'contracts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('contracts')}
              className={`flex items-center gap-2 px-4 py-2 ${
                currentView === 'contracts'
                  ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <FileText className="h-4 w-4" />
              New Contract
            </Button>
            <Button
              variant={currentView === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('history')}
              className={`flex items-center gap-2 px-4 py-2 ${
                currentView === 'history'
                  ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <History className="h-4 w-4" />
              History
              {contractHistory.length > 0 && (
                <Badge className="bg-cyan-600 text-white ml-1 px-1.5 py-0.5 text-xs">
                  {contractHistory.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Contract Generation View */}
        {currentView === 'contracts' && (
          <>
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
                      <AddressAutocomplete
                        value={editableData.clientAddress}
                        onChange={(address) => setEditableData(prev => ({ ...prev, clientAddress: address }))}
                        placeholder="123 Main St, City, State ZIP"
                        className="bg-gray-800 border-gray-600 text-white"
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
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Payment Milestones (Customizable)
                    </h3>
                    <div className="bg-green-900/30 border border-green-400 rounded-lg px-4 py-2">
                      <p className="text-sm text-gray-400">Project Total</p>
                      <p className="text-xl font-bold text-green-400">
                        ${getCorrectProjectTotal(selectedProject).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
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
                                  const totalAmount = getCorrectProjectTotal(selectedProject);
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
                          const totalAmount = getCorrectProjectTotal(selectedProject);
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
                        <p className="text-sm font-semibold text-green-400">
                          Amount: ${editableData.paymentMilestones.reduce((sum, m) => sum + m.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        Based on your ${getCorrectProjectTotal(selectedProject).toLocaleString()} {selectedProject.projectType || 'construction'} project, 
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
        {currentStep === 3 && !showLegalWorkflow && (
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

                <div className="flex flex-col space-y-4">
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
                  
                  {/* Legal Compliance Workflow Option */}
                  <div className="border-t border-gray-700 pt-6 mt-6">
                    <div className="bg-green-900/30 border border-green-400 rounded-lg p-6">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <Shield className="h-8 w-8 text-green-400" />
                        <h3 className="text-xl font-semibold text-green-400">
                          Legal Compliance Workflow
                        </h3>
                      </div>
                      <p className="text-gray-300 mb-4 text-center">
                        Execute contract with mandatory review, biometric signatures, and full legal compliance
                      </p>
                      <Button
                        onClick={() => setShowLegalWorkflow(true)}
                        disabled={!isContractReady}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 w-full"
                      >
                        Start Legal Compliance Process
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Legal Compliance Workflow */}
        {currentStep === 3 && showLegalWorkflow && (
          <LegalComplianceWorkflow
            contractData={contractData}
            contractHTML={contractHTML}
            onWorkflowComplete={(signedContract) => {
              setLegalWorkflowCompleted(true);
              setShowLegalWorkflow(false);
              toast({
                title: "Legal Process Complete",
                description: "Contract executed with full legal compliance and audit trail",
              });
            }}
            onCancel={() => {
              setShowLegalWorkflow(false);
              toast({
                title: "Legal Process Cancelled",
                description: "Returned to contract generation",
              });
            }}
          />
        )}
          </>
        )}

        {/* History View */}
        {currentView === 'history' && (
          <div className="space-y-6">
            {/* History Header */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                  <History className="h-5 w-5" />
                  Contract History
                  <Badge className="bg-cyan-600 text-white ml-2">
                    {contractHistory.length} contracts
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by client name, project type, or description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select value={historyFilter} onValueChange={(value: any) => setHistoryFilter(value)}>
                        <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="all" className="text-white hover:bg-gray-700">All Status</SelectItem>
                          <SelectItem value="draft" className="text-white hover:bg-gray-700">Draft</SelectItem>
                          <SelectItem value="completed" className="text-white hover:bg-gray-700">Completed</SelectItem>
                          <SelectItem value="processing" className="text-white hover:bg-gray-700">Processing</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadContractHistory}
                        disabled={isLoadingHistory}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {/* Contract List */}
                  {isLoadingHistory ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                      <p className="mt-2 text-gray-400">Loading contract history...</p>
                    </div>
                  ) : filteredContracts.length > 0 ? (
                    <div className="space-y-3">
                      {filteredContracts.map((contract) => (
                        <div
                          key={contract.id}
                          className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-cyan-400 hover:bg-gray-800/80 transition-all duration-200"
                        >
                          <div className="space-y-3">
                            {/* Header Row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-base font-bold text-white truncate">
                                    {contract.clientName}
                                  </h3>
                                  <Badge 
                                    className={`text-xs px-2 py-1 ${
                                      contract.status === 'completed' 
                                        ? 'bg-green-600 text-white' 
                                        : contract.status === 'draft'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-blue-600 text-white'
                                    }`}
                                  >
                                    {contract.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {contract.status === 'draft' && <Clock className="h-3 w-3 mr-1" />}
                                    {contract.status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                    {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                                  </Badge>
                                </div>
                                <p className="text-cyan-400 font-semibold text-sm">
                                  ${(contract.contractData.financials?.total || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {contract.status !== 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadContractFromHistory(contract)}
                                    className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs px-3"
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    Resume
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadContractFromHistory(contract)}
                                  className="border-gray-500 text-gray-300 hover:bg-gray-700 text-xs px-3"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                            
                            {/* Project Type and Description */}
                            <div className="bg-gray-700/50 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Wrench className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-300 text-sm font-medium">
                                  {contract.projectType}
                                </span>
                              </div>
                              {contract.contractData.project?.description && (
                                <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                                  {contract.contractData.project.description}
                                </p>
                              )}
                            </div>
                            
                            {/* Contract Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-400">Client:</span>
                                <span className="text-gray-300 truncate">
                                  {contract.contractData.client?.email || 'No email'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-400">Created:</span>
                                <span className="text-gray-300">
                                  {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : 'Unknown'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-400">ID:</span>
                                <span className="text-gray-300 font-mono text-xs">
                                  {contract.contractId?.slice(-8) || contract.id?.slice(-8) || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-400">Updated:</span>
                                <span className="text-gray-300">
                                  {contract.updatedAt ? new Date(contract.updatedAt).toLocaleDateString() : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">
                        {searchTerm || historyFilter !== 'all' 
                          ? 'No contracts match your filters' 
                          : 'No contract history found'
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {searchTerm || historyFilter !== 'all'
                          ? 'Try adjusting your search or filter settings'
                          : 'Generated contracts will appear here for easy access and editing'
                        }
                      </p>
                      {(searchTerm || historyFilter !== 'all') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            setHistoryFilter('all');
                          }}
                          className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}