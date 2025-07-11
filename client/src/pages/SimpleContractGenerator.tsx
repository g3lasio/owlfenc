import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/ui/address-autocomplete";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Database, Eye, FileText, CheckCircle, Plus, Trash2, Edit2, Sparkles, Shield, AlertCircle, DollarSign, Calendar, Wrench, FileCheck, Loader2, Brain, RefreshCw, History, Clock, UserCheck, Search, Filter, PenTool, Download, Mail, Phone, MessageCircle, Send, Lock, Truck, Share2, ExternalLink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { contractHistoryService, ContractHistoryEntry } from "@/services/contractHistoryService";

// Interface for completed contracts
interface CompletedContract {
  contractId: string;
  clientName: string;
  totalAmount: number;
  isCompleted: boolean;
  isDownloadable: boolean;
  contractorSigned: boolean;
  clientSigned: boolean;
  contractorSignedAt?: Date;
  clientSignedAt?: Date;
  createdAt: Date;
  signedPdfPath?: string;
}

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
  const [historyTab, setHistoryTab] = useState<'drafts' | 'in-progress' | 'completed'>('drafts');
  const [contractHistory, setContractHistory] = useState<ContractHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'draft' | 'completed' | 'processing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Completed contracts state
  const [completedContracts, setCompletedContracts] = useState<any[]>([]);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);

  // In-progress contracts state
  const [inProgressContracts, setInProgressContracts] = useState<any[]>([]);
  const [isLoadingInProgress, setIsLoadingInProgress] = useState(false);
  
  // Auto-save state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentContractId, setCurrentContractId] = useState<string | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  
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
  const [isContractReady, setIsContractReady] = useState(false);
  const [contractHTML, setContractHTML] = useState<string>("");
  
  // Dual Signature State
  const [isDualSignatureActive, setIsDualSignatureActive] = useState(false);
  const [dualSignatureStatus, setDualSignatureStatus] = useState<string>("");
  const [contractorSignUrl, setContractorSignUrl] = useState<string>("");
  const [clientSignUrl, setClientSignUrl] = useState<string>("");
  
  // Multi-Channel Delivery State
  const [deliveryMethods, setDeliveryMethods] = useState({
    email: true,
    sms: true,
    whatsapp: false
  });
  const [isMultiChannelActive, setIsMultiChannelActive] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string>("");
  
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

  // Load completed contracts
  const loadCompletedContracts = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setIsLoadingCompleted(true);
    try {
      console.log("📋 Loading completed contracts for user:", currentUser.uid);
      const response = await fetch(`/api/dual-signature/completed/${currentUser.uid}`);
      
      if (!response.ok) throw new Error('Failed to load completed contracts');
      
      const data = await response.json();
      setCompletedContracts(data.contracts || []);
      console.log("✅ Completed contracts loaded:", data.total, "contracts");
    } catch (error) {
      console.error("❌ Error loading completed contracts:", error);
      toast({
        title: "Error",
        description: "Failed to load completed contracts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompleted(false);
    }
  }, [currentUser?.uid, toast]);

  // Load in-progress contracts
  const loadInProgressContracts = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setIsLoadingInProgress(true);
    try {
      console.log("📋 Loading in-progress contracts for user:", currentUser.uid);
      const response = await fetch(`/api/dual-signature/in-progress/${currentUser.uid}`);
      
      if (!response.ok) throw new Error('Failed to load in-progress contracts');
      
      const data = await response.json();
      setInProgressContracts(data.contracts || []);
      console.log("✅ In-progress contracts loaded:", data.contracts?.length || 0, "contracts");
    } catch (error) {
      console.error("❌ Error loading in-progress contracts:", error);
      toast({
        title: "Error",
        description: "Failed to load in-progress contracts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInProgress(false);
    }
  }, [currentUser?.uid, toast]);

  // Resend signature links
  const resendSignatureLinks = useCallback(async (contractId: string, methods: string[]) => {
    try {
      console.log("📱 Resending signature links for contract:", contractId, "via:", methods);
      
      const response = await fetch('/api/dual-signature/resend-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          methods
        }),
      });
      
      if (!response.ok) throw new Error('Failed to resend signature links');
      
      const data = await response.json();
      
      // Show success message and handle specific delivery methods
      toast({
        title: "Links Sent Successfully",
        description: `Contract signature links sent via ${methods.join(', ')}`,
      });
      
      // Handle specific delivery methods that need direct user action
      if (methods.includes('sms') || methods.includes('whatsapp')) {
        data.results.forEach((result: string) => {
          if (result.includes('SMS link generated:')) {
            const smsLink = result.replace('SMS link generated: ', '');
            window.open(smsLink, '_blank');
          }
          if (result.includes('WhatsApp link generated:')) {
            const whatsappLink = result.replace('WhatsApp link generated: ', '');
            window.open(whatsappLink, '_blank');
          }
        });
      }
      
      return data;
    } catch (error) {
      console.error("❌ Error resending signature links:", error);
      toast({
        title: "Error",
        description: "Failed to resend signature links",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Download signed PDF with authentication
  const downloadSignedPdf = useCallback(async (contractId: string, clientName: string) => {
    try {
      console.log("📥 Downloading signed PDF for contract:", contractId);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download contracts",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/dual-signature/download/${contractId}`, {
        headers: {
          'x-user-id': currentUser.uid
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download PDF');
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `contract_${clientName.replace(/\s+/g, '_')}_signed.pdf`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log("✅ PDF downloaded successfully");
      toast({
        title: "Download Complete",
        description: `Signed contract for ${clientName} downloaded successfully`,
      });
    } catch (error: any) {
      console.error("❌ Error downloading PDF:", error);
      toast({
        title: "Download Error",
        description: error.message || "Failed to download contract PDF",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Share contract function with enhanced mobile app support
  const shareContract = useCallback(async (contractId: string, clientName: string) => {
    try {
      console.log("📤 Sharing contract:", contractId);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast({
          title: "Authentication Required",
          description: "Please log in to share contracts",
          variant: "destructive"
        });
        return;
      }

      // Check if Web Share API is available (mobile devices)
      if (navigator.share) {
        try {
          // First try to share the actual PDF file for mobile apps
          const response = await fetch(`/api/dual-signature/download/${contractId}`, {
            headers: {
              'x-user-id': currentUser.uid
            }
          });
          
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], `contract_${clientName.replace(/\s+/g, '_')}_signed.pdf`, {
              type: 'application/pdf'
            });
            
            // Try to share the file directly (works with most mobile apps)
            await navigator.share({
              title: `Signed Contract - ${clientName}`,
              text: `Signed contract for ${clientName} project`,
              files: [file]
            });
            
            toast({
              title: "Shared Successfully", 
              description: `Contract shared via mobile app`,
            });
          } else {
            throw new Error('Failed to load contract for sharing');
          }
        } catch (shareError: any) {
          // Fallback to URL sharing if file sharing fails
          const downloadUrl = `/api/dual-signature/download/${contractId}`;
          const fullUrl = `${window.location.origin}${downloadUrl}`;
          
          await navigator.share({
            title: `Signed Contract - ${clientName}`,
            text: `Signed contract for ${clientName} project`,
            url: fullUrl
          });
          
          toast({
            title: "Share Link Sent",
            description: `Contract download link shared`,
          });
        }
      } else {
        // Fallback for desktop - copy download link to clipboard
        const downloadUrl = `/api/dual-signature/download/${contractId}`;
        const fullUrl = `${window.location.origin}${downloadUrl}`;
        
        await navigator.clipboard.writeText(fullUrl);
        toast({
          title: "Link Copied",
          description: `Download link copied to clipboard - share it with anyone who needs the signed contract`,
        });
      }
      
    } catch (error: any) {
      console.error("❌ Error sharing contract:", error);
      toast({
        title: "Share Failed",
        description: error.message || "Failed to share contract",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Copy contract link to clipboard
  const copyContractLink = useCallback(async (contractId: string, clientName: string) => {
    try {
      const downloadUrl = `/api/dual-signature/download/${contractId}`;
      const fullUrl = `${window.location.origin}${downloadUrl}`;
      
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Link Copied",
        description: `Contract link for ${clientName} copied to clipboard`,
      });
    } catch (error) {
      console.error("❌ Error copying link:", error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  }, [toast]);

  // View contract in new window/tab
  const viewContract = useCallback(async (contractId: string, clientName: string) => {
    try {
      console.log("👀 Opening contract for viewing:", contractId);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view contracts",
          variant: "destructive"
        });
        return;
      }

      // Open the contract PDF in a new window/tab for viewing
      const downloadUrl = `/api/dual-signature/download/${contractId}`;
      const viewUrl = `${downloadUrl}?view=true&userId=${currentUser.uid}`;
      
      // Open in new window with PDF viewer
      const newWindow = window.open(viewUrl, '_blank');
      
      if (newWindow) {
        // Focus the new window
        newWindow.focus();
        
        toast({
          title: "Contract Opened",
          description: `Viewing signed contract for ${clientName}`,
        });
      } else {
        // If popup blocked, show alternative
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to view contracts, or use Download instead",
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error("❌ Error viewing contract:", error);
      toast({
        title: "View Error",
        description: error.message || "Failed to open contract for viewing",
        variant: "destructive",
      });
    }
  }, [toast]);

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

  // Auto-save function with debounce
  const performAutoSave = useCallback(async () => {
    if (!currentUser?.uid || !selectedProject || !editableData.clientName) {
      console.log("🔄 Auto-save skipped: missing required data");
      return;
    }

    try {
      setIsAutoSaving(true);
      setAutoSaveStatus('saving');
      
      console.log("💾 [AUTO-SAVE] Starting auto-save...");
      
      // Build comprehensive contract data for auto-save
      const autoSaveContractData = {
        userId: currentUser.uid,
        contractId: currentContractId || `CNT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientName: editableData.clientName,
        projectType: selectedProject.projectType || 'Construction',
        status: 'draft' as const,
        contractData: {
          client: {
            name: editableData.clientName,
            email: editableData.clientEmail,
            phone: editableData.clientPhone,
            address: editableData.clientAddress,
          },
          contractor: {
            name: profile?.company || profile?.ownerName || "Company Name",
            company: profile?.company || "Company Name",
            address: `${profile?.address || ""} ${profile?.city || ""} ${profile?.state || ""} ${profile?.zipCode || ""}`.trim(),
            phone: profile?.phone || profile?.mobilePhone || "",
            email: profile?.email || "",
            license: profile?.license || "",
          },
          project: {
            type: selectedProject.projectType || 'Construction',
            description: selectedProject.projectDescription || selectedProject.description || "",
            location: editableData.clientAddress || selectedProject.clientAddress || "",
            scope: selectedProject.projectDescription || "",
          },
          financials: {
            total: getCorrectProjectTotal(selectedProject),
            subtotal: getCorrectProjectTotal(selectedProject),
            tax: 0,
            materials: 0,
            labor: 0,
            permits: 0,
            other: 0,
          },
          timeline: {
            startDate: editableData.startDate,
            completionDate: editableData.completionDate,
            estimatedDuration: "As specified in project details"
          },
          protections: selectedClauses.map(clauseId => ({
            id: clauseId,
            category: 'legal',
            clause: suggestedClauses.find(c => c.id === clauseId)?.title || clauseId
          })),
          formFields: {
            permitResponsibility: editableData.permitResponsibility,
            warrantyYears: editableData.warrantyYears,
            startDate: editableData.startDate,
            completionDate: editableData.completionDate,
          },
          paymentTerms: editableData.paymentMilestones,
          materials: selectedProject.materials || [],
          terms: {
            warranty: editableData.warrantyYears,
            permits: editableData.permitResponsibility,
          }
        }
      };

      // Save contract using existing service
      const savedContractId = await contractHistoryService.saveContract(autoSaveContractData);
      
      // Update current contract ID if this is the first save
      if (!currentContractId) {
        setCurrentContractId(savedContractId);
      }
      
      setLastAutoSave(new Date());
      setAutoSaveStatus('saved');
      
      console.log("✅ [AUTO-SAVE] Contract auto-saved successfully:", savedContractId);
      
      // Clear saved status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error("❌ [AUTO-SAVE] Error auto-saving contract:", error);
      setAutoSaveStatus('error');
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 5000);
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentUser?.uid, selectedProject, editableData, currentContractId, selectedClauses, suggestedClauses, profile, getCorrectProjectTotal]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    // Set new timer for 2 seconds after the last change
    const newTimer = setTimeout(() => {
      performAutoSave();
    }, 2000);
    
    setAutoSaveTimer(newTimer);
  }, [autoSaveTimer, performAutoSave]);

  // Load contract from history and resume editing
  const loadContractFromHistory = useCallback(async (contract: ContractHistoryEntry) => {
    try {
      console.log("🔄 Loading contract from history:", contract.id);
      
      // Set current contract ID for auto-save updates
      setCurrentContractId(contract.id || null);
      
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
      const contractTotal = contractDataFromHistory.financials?.total || 0;
      
      // Ensure payment milestones always have amount field defined
      let paymentMilestones = contractDataFromHistory.paymentTerms || [
        { id: 1, description: "Initial deposit", percentage: 50, amount: contractTotal * 0.5 },
        { id: 2, description: "Project completion", percentage: 50, amount: contractTotal * 0.5 }
      ];
      
      // Fix any milestones that don't have amount field or have it as undefined
      paymentMilestones = paymentMilestones.map(milestone => ({
        ...milestone,
        amount: milestone.amount ?? (contractTotal * (milestone.percentage || 0) / 100)
      }));
      
      setEditableData({
        clientName: contractDataFromHistory.client?.name || contract.clientName,
        clientEmail: contractDataFromHistory.client?.email || "",
        clientPhone: contractDataFromHistory.client?.phone || "",
        clientAddress: contractDataFromHistory.client?.address || "",
        startDate: contractDataFromHistory.formFields?.startDate || contractDataFromHistory.timeline?.startDate || "",
        completionDate: contractDataFromHistory.formFields?.completionDate || contractDataFromHistory.timeline?.completionDate || "",
        permitResponsibility: contractDataFromHistory.formFields?.permitResponsibility || "contractor",
        warrantyYears: contractDataFromHistory.formFields?.warrantyYears || "1",
        paymentMilestones
      });

      // Set clauses from history
      setSuggestedClauses(contractDataFromHistory.protections?.map(p => ({
        id: p.id,
        title: p.clause,
        category: p.category
      })) || []);
      setSelectedClauses(contractDataFromHistory.protections?.map(p => p.id) || []);
      
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
      // Note: Suggested clauses functionality can be added in the future if needed
      
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

  // Direct PDF download function - uses working PDF endpoint
  const handleDownloadPDF = useCallback(async () => {
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
          name: profile?.company || profile?.ownerName || "Company Name",
          company: profile?.company || "Company Name",
          address: `${profile?.address || ""} ${profile?.city || ""} ${profile?.state || ""} ${profile?.zipCode || ""}`.trim(),
          phone: profile?.phone || profile?.mobilePhone || "",
          email: profile?.email || "",
          license: profile?.license || "",
        },
        financials: {
          total: getCorrectProjectTotal(selectedProject),
          subtotal: getCorrectProjectTotal(selectedProject),
          tax: 0,
          discount: 0
        },
        timeline: {
          startDate: editableData.startDate || new Date().toISOString().split('T')[0],
          completionDate: editableData.completionDate || "",
          estimatedDuration: "As specified in project details"
        },
        paymentTerms: editableData.paymentMilestones || [
          { id: 1, description: "Initial deposit", percentage: 50, amount: getCorrectProjectTotal(selectedProject) * 0.5 },
          { id: 2, description: "Project completion", percentage: 50, amount: getCorrectProjectTotal(selectedProject) * 0.5 }
        ]
      };

      console.log("📄 [PDF DOWNLOAD] Generating PDF with payload:", contractPayload);

      // Call the working PDF endpoint that was confirmed in the system
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-firebase-uid': currentUser?.uid || '',
        },
        body: JSON.stringify(contractPayload)
      });

      if (response.ok) {
        // Convert response to blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${selectedProject.clientName?.replace(/\s+/g, '_') || 'client'}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "PDF Downloaded",
          description: `Contract PDF downloaded successfully for ${selectedProject.clientName}`,
        });
      } else {
        const errorText = await response.text();
        console.error("❌ PDF download failed:", errorText);
        throw new Error(`Failed to download PDF: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error downloading PDF:", error);
      toast({
        title: "Download Error", 
        description: `Failed to download PDF: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, currentUser?.uid, profile, editableData, contractData, getCorrectProjectTotal, toast]);

  // Generate contract using backend API with comprehensive data (for legal workflow)
  const handleGenerateContract = useCallback(async () => {
    if (!selectedProject || !currentUser?.uid) return;
    
    setIsLoading(true);
    let contractPayload = null; // Initialize at function scope
    
    try {
      // Collect comprehensive contract data
      contractPayload = {
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
        contractPayload: contractPayload ? {
          clientName: contractPayload.client?.name,
          contractorName: contractPayload.contractor?.name,
          projectTotal: contractPayload.financials?.total
        } : 'Not created yet'
      });
      
      toast({
        title: "Generation Error",
        description: `Failed to generate contract: ${error.message || 'Unknown error'}. Please check the console for details.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, currentUser?.uid, profile, editableData, selectedClauses, suggestedClauses, getCorrectProjectTotal, toast]);

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
    // Reset dual signature state
    setIsDualSignatureActive(false);
    setDualSignatureStatus("");
    setContractorSignUrl("");
    setClientSignUrl("");
  }, []);

  // Dual Signature Handler - Initiate dual signature workflow
  const handleDualSignature = useCallback(async () => {
    if (!selectedProject || !currentUser?.uid || !contractHTML) {
      toast({
        title: "Error",
        description: "Contract must be generated before initiating dual signature",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsDualSignatureActive(true);
    setDualSignatureStatus("Initiating dual signature workflow...");

    try {
      // Prepare contract data for dual signature
      const dualSignaturePayload = {
        userId: currentUser.uid,
        contractHTML: contractHTML,
        contractData: {
          contractorName: profile?.company || profile?.ownerName || "Contractor Name",
          contractorEmail: profile?.email || currentUser.email || "",
          contractorPhone: profile?.phone || profile?.mobilePhone || "",
          contractorCompany: profile?.company || "Company Name",
          clientName: editableData.clientName || selectedProject.clientName,
          clientEmail: editableData.clientEmail || selectedProject.clientEmail || "",
          clientPhone: editableData.clientPhone || selectedProject.clientPhone || "",
          clientAddress: editableData.clientAddress || selectedProject.clientAddress || "",
          projectDescription: selectedProject.projectDescription || selectedProject.projectType || "Construction Project",
          totalAmount: getCorrectProjectTotal(selectedProject),
          startDate: editableData.startDate || new Date().toISOString().split('T')[0],
          completionDate: editableData.completionDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      };

      console.log("🖊️ [DUAL-SIGNATURE] Initiating dual signature workflow:", dualSignaturePayload);

      const response = await fetch('/api/dual-signature/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(dualSignaturePayload),
      });

      if (!response.ok) {
        throw new Error(`Dual signature initiation failed: ${response.status}`);
      }

      const result = await response.json();
      
      setContractorSignUrl(result.contractorSignUrl || "");
      setClientSignUrl(result.clientSignUrl || "");
      setDualSignatureStatus("Dual signature links generated successfully");

      toast({
        title: "Dual Signature Initiated",
        description: `Contract sent to both parties. Contract ID: ${result.contractId}`,
      });

    } catch (error) {
      console.error("❌ [DUAL-SIGNATURE] Error:", error);
      setDualSignatureStatus("Failed to initiate dual signature");
      toast({
        title: "Dual Signature Error",
        description: `Failed to initiate dual signature: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, currentUser, contractHTML, profile, editableData, getCorrectProjectTotal, toast]);

  // Multi-Channel Secure Delivery Handler - Send via Email, SMS, and WhatsApp
  const handleMultiChannelDelivery = useCallback(async () => {
    if (!selectedProject || !currentUser?.uid || !contractHTML) {
      toast({
        title: "Error",
        description: "Contract must be generated before sending secure links",
        variant: "destructive",
      });
      return;
    }

    // Check if at least one delivery method is selected
    const selectedMethods = Object.entries(deliveryMethods).filter(([_, enabled]) => enabled);
    if (selectedMethods.length === 0) {
      toast({
        title: "No Delivery Method Selected",
        description: "Please select at least one delivery method",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsMultiChannelActive(true);
    setDeliveryStatus("Initiating secure multi-channel delivery...");

    try {
      // Prepare contract data for secure delivery
      const secureDeliveryPayload = {
        userId: currentUser.uid,
        contractHTML: contractHTML,
        deliveryMethods: deliveryMethods,
        contractData: {
          contractorName: profile?.company || profile?.ownerName || "Contractor Name",
          contractorEmail: profile?.email || currentUser.email || "",
          contractorPhone: profile?.phone || profile?.mobilePhone || "",
          contractorCompany: profile?.company || "Company Name",
          clientName: editableData.clientName || selectedProject.clientName,
          clientEmail: editableData.clientEmail || selectedProject.clientEmail || "",
          clientPhone: editableData.clientPhone || selectedProject.clientPhone || "",
          clientAddress: editableData.clientAddress || selectedProject.clientAddress || "",
          projectDescription: selectedProject.projectDescription || selectedProject.projectType || "Construction Project",
          totalAmount: getCorrectProjectTotal(selectedProject),
          startDate: editableData.startDate || new Date().toISOString().split('T')[0],
          completionDate: editableData.completionDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        securityFeatures: {
          encryption: "256-bit SSL",
          verification: true,
          auditTrail: true,
          timeStamps: true
        }
      };

      console.log("🔐 [MULTI-CHANNEL] Initiating secure delivery:", secureDeliveryPayload);

      const response = await fetch('/api/multi-channel/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(secureDeliveryPayload),
      });

      if (!response.ok) {
        throw new Error(`Multi-channel delivery failed: ${response.status}`);
      }

      const result = await response.json();
      
      setContractorSignUrl(result.contractorSignUrl || "");
      setClientSignUrl(result.clientSignUrl || "");
      
      // Create status message based on selected delivery methods
      const methodNames = selectedMethods.map(([method, _]) => {
        switch(method) {
          case 'email': return 'Secure Email';
          case 'sms': return 'SMS';
          case 'whatsapp': return 'WhatsApp Business';
          default: return method;
        }
      });
      
      setDeliveryStatus(`Secure links sent via: ${methodNames.join(', ')}`);

      toast({
        title: "Secure Links Sent",
        description: `Contract delivered via ${methodNames.length} secure channel${methodNames.length > 1 ? 's' : ''}. Contract ID: ${result.contractId}`,
      });

    } catch (error) {
      console.error("❌ [MULTI-CHANNEL] Error:", error);
      setDeliveryStatus("Failed to send secure contract links");
      toast({
        title: "Delivery Error",
        description: `Failed to send secure links: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, currentUser, contractHTML, profile, editableData, deliveryMethods, getCorrectProjectTotal, toast]);

  // Legal Compliance Workflow - No manual signature handlers needed
  // All signature handling is now done through LegalComplianceWorkflow component

  // Old digital signature handler removed - using LegalComplianceWorkflow instead

  // Contractor name handling moved to LegalComplianceWorkflow component

  // Auto-save trigger when editableData changes
  useEffect(() => {
    // Only trigger auto-save if we have a selected project and user is editing
    if (selectedProject && currentUser?.uid && currentStep === 2) {
      triggerAutoSave();
    }
  }, [
    editableData.clientName,
    editableData.clientEmail,
    editableData.clientPhone,
    editableData.clientAddress,
    editableData.startDate,
    editableData.completionDate,
    editableData.permitResponsibility,
    editableData.warrantyYears,
    editableData.paymentMilestones,
    selectedClauses,
    selectedProject,
    currentUser?.uid,
    currentStep,
    triggerAutoSave
  ]);

  // Cleanup auto-save timer on component unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // Load contract history on component mount
  useEffect(() => {
    if (currentUser?.uid) {
      loadContractHistory();
      loadCompletedContracts();
    }
  }, [currentUser?.uid, loadContractHistory, loadCompletedContracts]);

  // Load in-progress contracts when switching to in-progress tab
  useEffect(() => {
    if (historyTab === 'in-progress' && currentUser?.uid) {
      loadInProgressContracts();
    }
  }, [historyTab, currentUser?.uid, loadInProgressContracts]);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center text-cyan-400">
          Legal Defense Contract Generator
        </h1>

        {/* View Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-1 flex gap-1 flex-wrap">
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
              onClick={() => {
                setCurrentView('history');
                loadContractHistory();
                loadCompletedContracts();
              }}
              className={`flex items-center gap-2 px-4 py-2 ${
                currentView === 'history'
                  ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <History className="h-4 w-4" />
              History
              {(contractHistory.length > 0 || completedContracts.length > 0) && (
                <Badge className="bg-cyan-600 text-white ml-1 px-1.5 py-0.5 text-xs">
                  {contractHistory.length + completedContracts.length}
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
              
              {/* Auto-save Status Indicator */}
              <div className="flex items-center justify-between mt-2 text-sm">
                <div className="flex items-center gap-2">
                  {autoSaveStatus === 'saving' && (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-yellow-400">Saving changes...</span>
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-400">
                        Changes saved {lastAutoSave && `at ${lastAutoSave.toLocaleTimeString()}`}
                      </span>
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-400">Error saving changes</span>
                    </>
                  )}
                  {autoSaveStatus === 'idle' && (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-400">Auto-save enabled</span>
                    </>
                  )}
                </div>
                {currentContractId && (
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {currentContractId.slice(-8)}
                  </span>
                )}
              </div>
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
                                ${(milestone.amount || 0).toLocaleString()}
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
                          Amount: ${editableData.paymentMilestones.reduce((sum, m) => sum + (m.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        {currentStep === 3 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                Step 3: Contract Generated Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Compact Action Cards */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Quick Download */}
                  <div className="bg-blue-900/30 border border-blue-400 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Download className="h-5 w-5 text-blue-400" />
                      <h3 className="font-semibold text-blue-400">Quick Download</h3>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Download PDF for immediate use
                    </p>
                    <Button
                      onClick={handleDownloadPDF}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 w-full disabled:opacity-50 text-sm"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {isLoading ? "Generating..." : "Download PDF"}
                    </Button>
                    <div className="flex items-center justify-center text-xs text-gray-400 mt-2 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Instant • Print Ready</span>
                    </div>
                  </div>

                  {/* Digital Signature Delivery */}
                  <div className="bg-cyan-900/20 border border-cyan-400 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Send className="h-5 w-5 text-cyan-400" />
                      <h3 className="font-semibold text-cyan-400">Send for Signature</h3>
                      <Badge className="bg-cyan-600 text-white text-xs">Secure</Badge>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Send contract to both parties for digital signature
                    </p>
                    
                    {/* Delivery Methods */}
                    <div className="space-y-3 mb-4">
                      <div className="text-sm font-medium text-cyan-400 mb-2">Delivery Methods:</div>
                      
                      {/* Email Option */}
                      <label className={`flex items-center gap-3 p-3 rounded border-2 cursor-pointer transition-all ${
                        deliveryMethods.email 
                          ? 'border-cyan-400 bg-cyan-400/10' 
                          : 'border-gray-600 hover:border-cyan-400'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={deliveryMethods.email}
                          onChange={(e) => setDeliveryMethods(prev => ({ ...prev, email: e.target.checked }))}
                          className="text-cyan-400 focus:ring-cyan-400"
                        />
                        <Mail className="h-4 w-4 text-cyan-400" />
                        <div className="flex-1">
                          <span className="text-white font-medium">Email</span>
                          <p className="text-xs text-gray-400">Professional email delivery</p>
                        </div>
                        {deliveryMethods.email && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                      </label>
                      
                      {/* SMS Option */}
                      <label className={`flex items-center gap-3 p-3 rounded border-2 cursor-pointer transition-all ${
                        deliveryMethods.sms 
                          ? 'border-green-400 bg-green-400/10' 
                          : 'border-gray-600 hover:border-green-400'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={deliveryMethods.sms}
                          onChange={(e) => setDeliveryMethods(prev => ({ ...prev, sms: e.target.checked }))}
                          className="text-green-400 focus:ring-green-400"
                        />
                        <Phone className="h-4 w-4 text-green-400" />
                        <div className="flex-1">
                          <span className="text-white font-medium">SMS Text</span>
                          <p className="text-xs text-gray-400">Direct mobile delivery</p>
                        </div>
                        {deliveryMethods.sms && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                      </label>
                      
                      {/* WhatsApp Option */}
                      <label className={`flex items-center gap-3 p-3 rounded border-2 cursor-pointer transition-all ${
                        deliveryMethods.whatsapp 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-gray-600 hover:border-green-500'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={deliveryMethods.whatsapp}
                          onChange={(e) => setDeliveryMethods(prev => ({ ...prev, whatsapp: e.target.checked }))}
                          className="text-green-500 focus:ring-green-500"
                        />
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <span className="text-white font-medium">WhatsApp</span>
                          <p className="text-xs text-gray-400">Business messaging</p>
                        </div>
                        {deliveryMethods.whatsapp && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                      </label>
                    </div>

                    {/* Send Button */}
                    <Button
                      onClick={handleMultiChannelDelivery}
                      disabled={isLoading || !contractHTML || isMultiChannelActive}
                      className={`w-full py-3 font-medium transition-all ${
                        isLoading 
                          ? 'bg-yellow-600 text-black' 
                          : isMultiChannelActive
                          ? 'bg-green-600 text-white'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending...</span>
                        </div>
                      ) : isMultiChannelActive ? (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Sent Successfully</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Send className="h-4 w-4" />
                          <span>Send for Signature</span>
                        </div>
                      )}
                    </Button>
                    
                    <div className="flex items-center justify-center text-xs text-gray-400 mt-2 gap-1">
                      <Shield className="h-3 w-3" />
                      <span>Encrypted • Secure • Professional</span>
                    </div>
                  </div>
                </div>

                {/* CLASSIFIED: Multi-Channel Transmission Status */}
                {isMultiChannelActive && (
                  <div className="relative bg-gradient-to-br from-black via-gray-900 to-black border-2 border-green-400 rounded-lg p-4 shadow-2xl shadow-green-400/20">
                    {/* Status Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Truck className="h-5 w-5 text-green-400 animate-pulse" />
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-green-400 text-sm tracking-wider">TRANSMISSION STATUS</h3>
                          <p className="text-xs text-gray-500 tracking-widest">REAL-TIME MONITORING</p>
                        </div>
                      </div>
                      <Badge className="bg-green-600 text-black text-xs font-mono animate-pulse">
                        ACTIVE
                      </Badge>
                    </div>

                    {/* Delivery Status Monitor */}
                    {deliveryStatus && (
                      <div className="bg-black/60 border border-green-400/30 rounded p-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-green-400 tracking-wider">SYSTEM STATUS:</span>
                        </div>
                        <div className="font-mono text-sm text-green-300 animate-pulse">
                          {deliveryStatus}
                        </div>
                        
                        {/* Progress Indicators */}
                        <div className="mt-3 space-y-2">
                          {deliveryMethods.email && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-cyan-400">EMAIL VECTOR:</span>
                              <span className="text-green-400 font-bold">DEPLOYED</span>
                            </div>
                          )}
                          {deliveryMethods.sms && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-green-400">SMS VECTOR:</span>
                              <span className="text-green-400 font-bold">TRANSMITTED</span>
                            </div>
                          )}
                          {deliveryMethods.whatsapp && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-green-500">WHATSAPP VECTOR:</span>
                              <span className="text-green-400 font-bold">OPERATIONAL</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Secure Access Links */}
                    <div className="space-y-3">
                      {contractorSignUrl && (
                        <div className="bg-black/40 border border-cyan-400/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-cyan-400" />
                            <h4 className="text-cyan-400 font-bold text-xs tracking-wider">CONTRACTOR ACCESS PORTAL</h4>
                            <Badge className="bg-cyan-600 text-black text-xs font-mono">SECURED</Badge>
                          </div>
                          <div className="bg-black/60 rounded p-2 border border-cyan-400/30">
                            <a 
                              href={contractorSignUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-cyan-300 hover:text-cyan-200 underline text-xs break-all font-mono"
                            >
                              {contractorSignUrl}
                            </a>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                            <Lock className="h-3 w-3" />
                            <span>256-bit encrypted • Device verified • Audit logged</span>
                          </div>
                        </div>
                      )}
                      
                      {clientSignUrl && (
                        <div className="bg-black/40 border border-green-400/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-green-400" />
                            <h4 className="text-green-400 font-bold text-xs tracking-wider">CLIENT ACCESS PORTAL</h4>
                            <Badge className="bg-green-600 text-black text-xs font-mono">SECURED</Badge>
                          </div>
                          <div className="bg-black/60 rounded p-2 border border-green-400/30">
                            <a 
                              href={clientSignUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-300 hover:text-green-200 underline text-xs break-all font-mono"
                            >
                              {clientSignUrl}
                            </a>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                            <Lock className="h-3 w-3" />
                            <span>Biometric protected • Time-locked • Audit trail active</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {contractorSignUrl && clientSignUrl && (
                      <>
                        {/* Deployment Status Grid */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="bg-black/40 border border-cyan-400/30 rounded p-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-cyan-400 font-bold">CONTRACTOR:</span>
                              <Badge className="bg-cyan-600 text-black text-xs font-mono">DELIVERED</Badge>
                            </div>
                          </div>
                          <div className="bg-black/40 border border-green-400/30 rounded p-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-green-400 font-bold">CLIENT:</span>
                              <Badge className="bg-green-600 text-black text-xs font-mono">DELIVERED</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Active Delivery Vectors */}
                        <div className="mt-4 bg-black/60 border border-green-400/30 rounded p-3">
                          <div className="text-xs font-bold text-green-400 mb-2 tracking-wider">ACTIVE VECTORS:</div>
                          <div className="flex gap-2 flex-wrap">
                            {deliveryMethods.email && (
                              <Badge className="bg-cyan-600 text-black text-xs font-mono">
                                <Mail className="h-3 w-3 mr-1" />
                                SMTP CHANNEL
                              </Badge>
                            )}
                            {deliveryMethods.sms && (
                              <Badge className="bg-green-600 text-black text-xs font-mono">
                                <Phone className="h-3 w-3 mr-1" />
                                GSM NETWORK
                              </Badge>
                            )}
                            {deliveryMethods.whatsapp && (
                              <Badge className="bg-green-500 text-black text-xs font-mono">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                WHATSAPP API
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Real-time Security Metrics */}
                        <div className="mt-4 bg-black/60 border border-green-400/30 rounded p-3">
                          <div className="text-xs font-bold text-green-400 mb-2 tracking-wider">SECURITY METRICS:</div>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">ENCRYPTION:</span>
                              <span className="text-green-400">ACTIVE</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">FIREWALL:</span>
                              <span className="text-green-400">SECURED</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">MONITORING:</span>
                              <span className="text-green-400">LIVE</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">STATUS:</span>
                              <span className="text-green-400">OPERATIONAL</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Corner Security Indicators */}
                    <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-green-400"></div>
                    <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-green-400"></div>
                    <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-green-400"></div>
                    <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-green-400"></div>
                  </div>
                )}

                {/* Legacy Signature Status (fallback) */}
                {isDualSignatureActive && !isMultiChannelActive && (
                  <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-green-400 mb-2">Signature Status</h4>
                    <p className="text-xs text-gray-300 mb-2">{dualSignatureStatus}</p>
                    
                    {contractorSignUrl && clientSignUrl && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Contractor:</span>
                          <Badge className="bg-blue-600 text-white text-xs">Sent</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Client:</span>
                          <Badge className="bg-blue-600 text-white text-xs">Sent</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Actions */}
                <div className="border-t border-gray-700 pt-4 text-center">
                  <Button
                    onClick={handleNewContract}
                    variant="outline"
                    size="sm"
                    className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                  >
                    Generate New Contract
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


          </>
        )}

        {/* Unified History View with Tabs */}
        {currentView === 'history' && (
          <div className="space-y-6">
            {/* History Header */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                  <History className="h-5 w-5" />
                  Contract Management
                  <Badge className="bg-cyan-600 text-white ml-2">
                    {contractHistory.length + completedContracts.length} total
                  </Badge>
                </CardTitle>
                <p className="text-sm text-cyan-300 mt-2">
                  Manage draft contracts and view completed signed documents
                </p>
              </CardHeader>
              <CardContent>
                <Tabs value={historyTab} onValueChange={(value: any) => setHistoryTab(value)}>
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
                    <TabsTrigger 
                      value="drafts" 
                      className="data-[state=active]:bg-cyan-600 data-[state=active]:text-black"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Drafts ({contractHistory.filter(c => c.status !== 'completed').length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="in-progress" 
                      className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black"
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      In Progress ({inProgressContracts.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="completed" 
                      className="data-[state=active]:bg-green-600 data-[state=active]:text-black"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed ({completedContracts.filter(c => c.isCompleted).length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Drafts Tab */}
                  <TabsContent value="drafts" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-cyan-300">
                        Contracts stopped at step 2 - ready to resume editing
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadContractHistory}
                        disabled={isLoadingHistory}
                        className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    {isLoadingHistory ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">Loading contract drafts...</p>
                      </div>
                    ) : contractHistory.filter(c => c.status !== 'completed').length > 0 ? (
                      <div className="space-y-3">
                        {contractHistory.filter(c => c.status !== 'completed').map((contract, index) => (
                          <div
                            key={contract.id || `draft-${index}`}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-white text-lg">{contract.clientName}</h3>
                                <p className="text-cyan-400 font-semibold">
                                  ${(contract.contractData.financials?.total || 0).toLocaleString()}
                                </p>
                              </div>
                              <Badge className={`${
                                contract.status === 'draft' ? 'bg-yellow-600 text-black' : 'bg-blue-600 text-white'
                              }`}>
                                {contract.status === 'draft' && <Clock className="h-3 w-3 mr-1" />}
                                {contract.status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                {contract.status.toUpperCase()}
                              </Badge>
                            </div>

                            {/* Project Info */}
                            <div className="bg-gray-700 rounded-lg p-3 mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Wrench className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-300 text-sm font-medium">
                                  {contract.projectType}
                                </span>
                              </div>
                              {contract.contractData.project?.description && (
                                <p className="text-gray-400 text-xs">
                                  {contract.contractData.project.description}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-3">
                              <h4 className="text-cyan-400 font-semibold text-sm mb-2">Draft Actions:</h4>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadContractFromHistory(contract)}
                                  className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Resume Editing
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadContractFromHistory(contract)}
                                  className="border-gray-400 text-gray-400 hover:bg-gray-400 hover:text-black text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">No draft contracts found</p>
                        <p className="text-sm text-gray-500">
                          Contracts stopped at step 2 will appear here for easy resuming
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* In Progress Contracts Tab */}
                  <TabsContent value="in-progress" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-yellow-300">
                        Contracts with signature links sent - awaiting signatures
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadInProgressContracts}
                        disabled={isLoadingInProgress}
                        className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingInProgress ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    {isLoadingInProgress ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">Loading in-progress contracts...</p>
                      </div>
                    ) : inProgressContracts.length > 0 ? (
                      <div className="space-y-3">
                        {inProgressContracts.map((contract, index) => (
                          <div
                            key={contract.id || `contract-${index}`}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-white text-lg">{contract.clientName}</h3>
                                <p className="text-yellow-400 font-semibold">
                                  ${(contract.totalAmount || 0).toLocaleString()}
                                </p>
                              </div>
                              <Badge className="bg-yellow-600 text-black">
                                IN PROGRESS
                              </Badge>
                            </div>

                            {/* Signature Status */}
                            <div className="bg-gray-700 rounded-lg p-3 mb-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-gray-300 text-sm">Contractor:</span>
                                  <Badge className={`ml-2 text-xs ${
                                    contract.contractorSigned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                  }`}>
                                    {contract.contractorSigned ? 'SIGNED' : 'PENDING'}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-gray-300 text-sm">Client:</span>
                                  <Badge className={`ml-2 text-xs ${
                                    contract.clientSigned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                  }`}>
                                    {contract.clientSigned ? 'SIGNED' : 'PENDING'}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Direct Signature Links */}
                            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                              <h4 className="text-blue-400 font-semibold text-sm mb-2">Direct Signature Links:</h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-300 text-sm">Contractor Link:</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (contract.contractorSignUrl) {
                                        window.open(contract.contractorSignUrl, '_blank');
                                      } else {
                                        toast({
                                          title: "Link Not Available",
                                          description: "Contractor signature link not found",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                    className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Open Contractor Link
                                  </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-300 text-sm">Client Link:</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (contract.clientSignUrl) {
                                        window.open(contract.clientSignUrl, '_blank');
                                      } else {
                                        toast({
                                          title: "Link Not Available",
                                          description: "Client signature link not found",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                    className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black text-xs"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Open Client Link
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileCheck className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">No contracts in progress</p>
                        <p className="text-sm text-gray-500">
                          Contracts with sent signature links will appear here
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Completed Contracts Tab */}
                  <TabsContent value="completed" className="space-y-4 mt-6">
                    {/* Refresh Button */}
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-green-300">
                        Digitally signed contracts with secure document delivery
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadCompletedContracts}
                        disabled={isLoadingCompleted}
                        className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCompleted ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    {isLoadingCompleted ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                        <p className="mt-2 text-gray-400">Loading completed contracts...</p>
                      </div>
                    ) : completedContracts.length > 0 ? (
                      <div className="space-y-3">
                        {completedContracts.map((contract, index) => (
                          <div
                            key={contract.contractId || `completed-${index}`}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-white text-lg">{contract.clientName}</h3>
                                <p className="text-green-400 font-semibold">
                                  ${(contract.totalAmount || 0).toLocaleString()}
                                </p>
                              </div>
                              <Badge className="bg-green-600 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                COMPLETED
                              </Badge>
                            </div>

                            {/* Signature Status */}
                            <div className="bg-gray-700 rounded-lg p-3 mb-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-gray-300 text-sm">Contractor:</span>
                                  <Badge className="ml-2 text-xs bg-green-600 text-white">SIGNED</Badge>
                                </div>
                                <div>
                                  <span className="text-gray-300 text-sm">Client:</span>
                                  <Badge className="ml-2 text-xs bg-green-600 text-white">SIGNED</Badge>
                                </div>
                              </div>
                            </div>

                            {/* Download Actions */}
                            {contract.isDownloadable && (
                              <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                                <h4 className="text-green-400 font-semibold text-sm mb-2">Signed Contract:</h4>
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => viewContract(contract.contractId, contract.clientName)}
                                    className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black text-xs"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadSignedPdf(contract.contractId, contract.clientName)}
                                    className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black text-xs"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => shareContract(contract.contractId, contract.clientName)}
                                    className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs"
                                  >
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Share
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">No completed contracts found</p>
                        <p className="text-sm text-gray-500">
                          Signed contracts will appear here for secure download and sharing
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}


      </div>
    </div>
  );
}