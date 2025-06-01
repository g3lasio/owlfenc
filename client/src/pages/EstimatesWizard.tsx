import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { MervinWorkingEffect } from '@/components/ui/mervin-working-effect';
// Usar el logo correcto de OWL FENCE
const mervinLogoUrl = "https://ik.imagekit.io/lp5czyx2a/ChatGPT%20Image%20May%2010,%202025,%2005_35_38%20PM.png?updatedAt=1748157114019";
import { getClients as getFirebaseClients, saveClient } from '@/lib/clientFirebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MaterialInventoryService } from '../services/materialInventoryService';
import { 
  Search, 
  Plus, 
  User, 
  Package, 
  FileText, 
  Eye, 
  Send, 
  Save, 
  Trash2, 
  Users, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Check,
  Calculator,
  Building2,
  UserPlus,
  Brain,
  Minus,
  Download,
  RefreshCw,
  AlertCircle,
  Edit,
  Mail,
  X,
  Wrench,
  Combine
} from 'lucide-react';

// Types
interface Client {
  id: string;
  clientId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  source?: string;
  classification?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface Material {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
}

interface EstimateItem {
  id: string;
  materialId: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
}

interface EstimateData {
  client: Client | null;
  items: EstimateItem[];
  projectDetails: string;
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  discountName: string;
}

const STEPS = [
  { id: 'client', title: 'Cliente', icon: User },
  { id: 'details', title: 'Detalles', icon: FileText },
  { id: 'materials', title: 'Materiales', icon: Package },
  { id: 'preview', title: 'Vista Previa', icon: Eye }
];

export default function EstimatesWizardFixed() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const [currentStep, setCurrentStep] = useState(0);
  const [estimate, setEstimate] = useState<EstimateData>({
    client: null,
    items: [],
    projectDetails: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    taxRate: 10, // Default 10% instead of 16%
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0,
    discountName: ''
  });

  // Data from existing systems
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [contractor, setContractor] = useState<any>(null);

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);

  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Smart Search states
  const [showSmartSearchDialog, setShowSmartSearchDialog] = useState(false);
  const [smartSearchMode, setSmartSearchMode] = useState<'materials' | 'labor' | 'both'>('both');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showMervinWorking, setShowMervinWorking] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

  // New client form
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: ''
  });

  // AI enhancement states - using the existing isAIProcessing from Smart Search
  const [showMervinMessage, setShowMervinMessage] = useState(false);

  // Estimates history states
  const [showEstimatesHistory, setShowEstimatesHistory] = useState(false);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [showCompanyEditDialog, setShowCompanyEditDialog] = useState(false);
  
  // Email dialog states
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Smart Search Handler
  const handleSmartSearch = async () => {
    if (!estimate.projectDetails.trim()) {
      toast({
        title: 'Descripción requerida',
        description: 'Por favor describe tu proyecto primero para usar Smart Search IA',
        variant: 'destructive'
      });
      return;
    }

    setIsAIProcessing(true);
    setAiProgress(0);
    
    try {
      let endpoint = '';
      let successMessage = '';
      
      switch (smartSearchMode) {
        case 'materials':
          endpoint = '/api/deepsearch/materials-only';
          successMessage = 'materiales';
          break;
        case 'labor':
          endpoint = '/api/labor-deepsearch/generate-items';
          successMessage = 'servicios de labor';
          break;
        case 'both':
          endpoint = '/api/labor-deepsearch/combined';
          successMessage = 'materiales y labor';
          break;
      }

      setAiProgress(30);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDescription: estimate.projectDetails,
          location: estimate.client?.address || ''
        })
      });

      setAiProgress(70);

      if (!response.ok) {
        throw new Error('Error al generar con Smart Search IA');
      }

      const result = await response.json();
      setAiProgress(90);

      if (result.success) {
        const newItems: EstimateItem[] = [];
        
        // Agregar materiales si existen Y guardarlos automáticamente al inventario
        if (result.materials && result.materials.length > 0) {
          result.materials.forEach((material: any) => {
            newItems.push({
              id: `ai_mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              materialId: material.id || '',
              name: material.name,
              description: material.description || '',
              quantity: material.quantity,
              price: material.price,
              unit: material.unit,
              total: material.total
            });
          });

          // Auto-guardar materiales al inventario de Firebase
          if (currentUser?.uid) {
            console.log('🚀 STARTING AUTO-SAVE for materials:', result.materials.length);
            console.log('📋 Materials data:', result.materials);
            console.log('👤 Current user UID:', currentUser.uid);
            
            MaterialInventoryService.addMaterialsFromDeepSearch(
              result.materials,
              currentUser.uid,
              estimate.projectDetails
            ).then((saveResults) => {
              console.log('✅ AUTO-SAVE SUCCESS! Results:', saveResults);
              if (saveResults.added > 0) {
                toast({
                  title: "Materials Auto-Saved",
                  description: `${saveResults.added} materials automatically added to your inventory`,
                });
              }
            }).catch((error) => {
              console.error('❌ AUTO-SAVE FAILED:', error);
              toast({
                title: "Auto-save Warning",
                description: "Some materials couldn't be saved to inventory",
                variant: "destructive"
              });
            });
          } else {
            console.warn('⚠️ No user UID available for auto-save');
          }
        }

        // Agregar servicios de labor si existen (usando 'items' para labor endpoint)
        if (result.items) {
          result.items.forEach((service: any) => {
            // Mapear unidades de construcción reales
            const unitMapping: Record<string, string> = {
              'linear_ft': 'ft lineal',
              'square_ft': 'ft²',
              'cubic_yard': 'yd³',
              'square': 'escuadra',
              'project': 'proyecto',
              'per_unit': 'unidad'
            };

            newItems.push({
              id: `ai_lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              materialId: service.id || '',
              name: service.name,
              description: service.description || '',
              quantity: service.quantity || 1,
              price: service.unitPrice || service.totalCost || 0,
              unit: unitMapping[service.unit] || service.unit || 'servicio',
              total: service.totalCost || (service.unitPrice * service.quantity) || 0
            });
          });

          // Auto-guardar servicios de labor como "materiales" en el inventario para reutilización futura
          if (currentUser?.uid) {
            // Convertir servicios de labor a formato de material para el inventario
            const laborMaterials = result.items.map((service: any) => ({
              name: service.name,
              category: 'Labor Services',
              description: service.description || `Labor service: ${service.name}`,
              unit: service.unit || 'servicio',
              price: service.unitPrice || service.totalCost || 0,
              source: 'deepsearch-labor',
              tags: ['labor', 'service', 'ai-generated']
            }));

            MaterialInventoryService.addMaterialsFromDeepSearch(
              laborMaterials,
              currentUser.uid,
              estimate.projectDetails
            ).then((saveResults) => {
              console.log('🔧 Auto-save labor services to inventory completed:', saveResults);
            }).catch((error) => {
              console.error('❌ Error auto-saving labor services to inventory:', error);
            });
          }
        }

        // También manejar labor si viene del endpoint combinado
        if (result.labor) {
          result.labor.forEach((service: any) => {
            // Mapear unidades de construcción reales
            const unitMapping: Record<string, string> = {
              'linear_ft': 'ft lineal',
              'square_ft': 'ft²',
              'cubic_yard': 'yd³',
              'square': 'escuadra',
              'project': 'proyecto',
              'per_unit': 'unidad'
            };

            newItems.push({
              id: `ai_lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              materialId: service.id || '',
              name: service.name,
              description: service.description || '',
              quantity: service.quantity || 1,
              price: service.unitPrice || service.totalPrice || service.totalCost || 0,
              unit: unitMapping[service.unit] || service.unit || 'servicio',
              total: service.totalCost || service.totalPrice || (service.unitPrice * service.quantity) || 0
            });
          });

          // Auto-guardar servicios de labor del endpoint combinado al inventario
          if (currentUser?.uid) {
            // Convertir servicios de labor a formato de material para el inventario
            const combinedLaborMaterials = result.labor.map((service: any) => ({
              name: service.name,
              category: 'Labor Services',
              description: service.description || `Labor service: ${service.name}`,
              unit: service.unit || 'servicio',
              price: service.unitPrice || service.totalCost || 0,
              source: 'deepsearch-combined',
              tags: ['labor', 'service', 'ai-generated', 'combined-analysis']
            }));

            MaterialInventoryService.addMaterialsFromDeepSearch(
              combinedLaborMaterials,
              currentUser.uid,
              estimate.projectDetails
            ).then((saveResults) => {
              console.log('🔧 Auto-save combined labor services to inventory completed:', saveResults);
            }).catch((error) => {
              console.error('❌ Error auto-saving combined labor services to inventory:', error);
            });
          }
        }

        setEstimate(prev => ({
          ...prev,
          items: [...prev.items, ...newItems]
        }));

        setAiProgress(100);
        setShowSmartSearchDialog(false);

        // Mostrar mensaje de Mervin
        setShowMervinMessage(true);
        setTimeout(() => {
          setShowMervinMessage(false);
        }, 10000);

        toast({
          title: '🎉 Smart Search IA Completado',
          description: `Se agregaron ${newItems.length} ${successMessage} automáticamente`
        });
      }
    } catch (error) {
      console.error('Error with Smart Search:', error);
      toast({
        title: 'Error en Smart Search IA',
        description: 'No se pudieron generar los elementos automáticamente',
        variant: 'destructive'
      });
    } finally {
      setIsAIProcessing(false);
      setAiProgress(0);
    }
  };
  const [emailData, setEmailData] = useState({
    toEmail: '',
    subject: '',
    message: '',
    sendCopy: true
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [editableCompany, setEditableCompany] = useState({
    companyName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    license: '',
    insurancePolicy: '',
    logo: ''
  });

  // Load data on mount
  useEffect(() => {
    loadClients();
    loadMaterials();
    loadContractorProfile();
  }, [currentUser]);

  // Calculate totals when items, tax rate, or discount change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate discount amount
    let discountAmount = 0;
    if (estimate.discountValue > 0) {
      if (estimate.discountType === 'percentage') {
        discountAmount = subtotal * (estimate.discountValue / 100);
      } else {
        discountAmount = estimate.discountValue;
      }
    }
    
    // Apply discount to subtotal
    const subtotalAfterDiscount = subtotal - discountAmount;
    
    // Calculate tax on discounted amount
    const tax = subtotalAfterDiscount * (estimate.taxRate / 100);
    const total = subtotalAfterDiscount + tax;

    setEstimate(prev => ({
      ...prev,
      subtotal,
      tax,
      total,
      discountAmount
    }));
  }, [estimate.items, estimate.taxRate, estimate.discountType, estimate.discountValue]);

  // Initialize company data when contractor profile loads
  useEffect(() => {
    if (contractor) {
      setEditableCompany({
        companyName: contractor.companyName || contractor.name || '',
        address: contractor.address || '',
        city: contractor.city || '',
        state: contractor.state || '',
        zipCode: contractor.zipCode || '',
        phone: contractor.phone || '',
        email: contractor.email || '',
        website: contractor.website || '',
        license: contractor.license || '',
        insurancePolicy: contractor.insurancePolicy || '',
        logo: contractor.logo || ''
      });
    }
  }, [contractor]);

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      const clientsData = await getFirebaseClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients from Firebase:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadMaterials = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoadingMaterials(true);
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      const materialsData: Material[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Material, 'id'>;
        const material: Material = {
          id: doc.id,
          ...data,
          price: typeof data.price === 'number' ? data.price : 0
        };
        materialsData.push(material);
      });

      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading materials from Firebase:', error);
      toast({
        title: 'Error',
        description: 'Could not load materials',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const loadContractorProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setContractor(data);
      }
    } catch (error) {
      console.error('Error loading contractor profile:', error);
    }
  };

  // Load saved estimates from Firebase
  const loadSavedEstimates = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setIsLoadingEstimates(true);
      console.log('📥 Cargando estimados desde Firebase...');

      // Import Firebase functions
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      let allEstimates = [];

      // Try loading from projects collection first (simpler query)
      try {
        const projectsQuery = query(
          collection(db, 'projects'),
          where('firebaseUserId', '==', currentUser.uid)
        );

        const projectsSnapshot = await getDocs(projectsQuery);
        const projectEstimates = projectsSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.status === 'estimate' || data.estimateNumber;
          })
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
              title: data.projectName || 'Estimado sin título',
              clientName: data.clientInformation?.name || 'Cliente sin nombre',
              clientEmail: data.clientInformation?.email || '',
              total: data.projectTotalCosts?.total || 0,
              status: data.status || 'estimate',
              estimateDate: data.createdAt ? data.createdAt.toDate?.() || new Date(data.createdAt) : new Date(),
              items: data.projectTotalCosts?.materialCosts?.items || [],
              projectType: data.projectType || 'fence',
              projectId: doc.id,
              pdfUrl: data.pdfUrl || null
            };
          });

        allEstimates = [...allEstimates, ...projectEstimates];
        console.log(`📊 Cargados ${projectEstimates.length} estimados desde proyectos`);
      } catch (projectError) {
        console.warn('No se pudieron cargar estimados desde proyectos:', projectError);
      }

      // Try loading from estimates collection (if it exists)
      try {
        const estimatesQuery = query(
          collection(db, 'estimates'),
          where('firebaseUserId', '==', currentUser.uid)
        );

        const estimatesSnapshot = await getDocs(estimatesQuery);
        const firebaseEstimates = estimatesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
            title: data.title || data.projectName || 'Estimado sin título',
            clientName: data.clientName || 'Cliente sin nombre',
            clientEmail: data.clientEmail || '',
            total: data.total || data.estimateAmount || 0,
            status: data.status || 'draft',
            estimateDate: data.createdAt ? data.createdAt.toDate?.() || new Date(data.createdAt) : new Date(),
            items: data.items || [],
            projectType: data.projectType || data.fenceType || 'fence',
            projectId: data.projectId || doc.id,
            pdfUrl: data.pdfUrl || null
          };
        });

        allEstimates = [...allEstimates, ...firebaseEstimates];
        console.log(`📋 Cargados ${firebaseEstimates.length} estimados adicionales`);
      } catch (estimatesError) {
        console.warn('No se pudieron cargar estimados desde colección estimates:', estimatesError);
      }

      // Deduplicate and sort
      const uniqueEstimates = allEstimates
        .filter((estimate, index, self) => 
          index === self.findIndex(e => e.estimateNumber === estimate.estimateNumber)
        )
        .sort((a, b) => new Date(b.estimateDate).getTime() - new Date(a.estimateDate).getTime());

      setSavedEstimates(uniqueEstimates);
      console.log(`✅ Total: ${uniqueEstimates.length} estimados únicos cargados`);

      if (uniqueEstimates.length === 0) {
        toast({
          title: 'Sin estimados',
          description: 'No se encontraron estimados guardados. Crea tu primer estimado para verlo aquí.',
          duration: 4000
        });
      }

    } catch (error) {
      console.error('❌ Error cargando estimados:', error);
      toast({
        title: 'Error al cargar estimados',
        description: 'No se pudieron cargar los estimados guardados. Verifica tu conexión.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingEstimates(false);
    }
  };

  // AI Enhancement Function - Using new Mervin Working Effect
  const enhanceProjectWithAI = async () => {
    if (!estimate.projectDetails.trim()) {
      toast({
        title: 'Descripción Requerida',
        description: 'Por favor describe tu proyecto para usar Mervin AI',
        variant: 'destructive'
      });
      return;
    }

    setIsAIProcessing(true);
    setShowMervinWorking(true);
    
    try {
      console.log('🤖 Starting Mervin AI enhancement...');
      
      const response = await fetch('/api/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalText: estimate.projectDetails,
          projectType: 'construction estimate'
        }),
      });

      if (!response.ok) {
        throw new Error('Error al procesar con Mervin AI');
      }
      
      const result = await response.json();
      console.log('✅ Mervin AI Response:', result);
      
      if (result.enhancedDescription) {
        setEstimate(prev => ({ 
          ...prev, 
          projectDetails: result.enhancedDescription 
        }));
        
        toast({
          title: '✨ Mejorado con Mervin AI',
          description: 'La descripción del proyecto ha sido mejorada profesionalmente'
        });
      } else {
        throw new Error('No se pudo generar contenido mejorado');
      }
      
    } catch (error) {
      console.error('Error enhancing with AI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar con Mervin AI. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsAIProcessing(false);
      setShowMervinWorking(false);
    }
  };

  // Navigation
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return estimate.client !== null;
      case 1: return estimate.projectDetails.trim().length > 0;
      case 2: return estimate.items.length > 0;
      case 3: return true;
      default: return false;
    }
  };

  // Robust save function that syncs to Firebase and projects dashboard
  const handleSaveEstimate = async () => {
    if (!currentUser?.uid) {
      toast({
        title: 'Error de autenticación',
        description: 'Debes estar conectado para guardar estimados',
        variant: 'destructive'
      });
      return;
    }

    if (!estimate.client || estimate.items.length === 0) {
      toast({
        title: 'Datos incompletos',
        description: 'Selecciona un cliente y agrega al menos un material',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Generate HTML content first (fallback if needed)
      let htmlContent = '';
      try {
        htmlContent = generateEstimatePreview();
      } catch (htmlError) {
        console.warn('Error generating HTML preview, using basic format:', htmlError);
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Estimado para ${estimate.client.name}</h1>
            <p>Cliente: ${estimate.client.name}</p>
            <p>Email: ${estimate.client.email || 'No especificado'}</p>
            <p>Proyecto: ${estimate.projectDetails}</p>
            <h3>Materiales:</h3>
            <ul>
              ${estimate.items.map(item => `
                <li>${item.name} - ${item.quantity} ${item.unit} x $${item.price.toFixed(2)} = $${item.total.toFixed(2)}</li>
              `).join('')}
            </ul>
            <p><strong>Total: $${estimate.total.toFixed(2)}</strong></p>
          </div>
        `;
      }

      // 2. Prepare complete estimate data for Firebase and backend
      const estimateNumber = `EST-${Date.now()}`;
      
      // Get contractor data from profile
      const contractorData = {
        companyName: profile?.companyName || 'Your Company',
        companyAddress: profile?.address || '',
        companyCity: profile?.city || '',
        companyState: profile?.state || '',
        companyZip: profile?.zipCode || '',
        companyPhone: profile?.phone || '',
        companyEmail: profile?.email || currentUser?.email || '',
        companyLicense: profile?.licenseNumber || '',
        companyLogo: profile?.logoUrl || '/owl-logo.png'
      };

      const estimateData = {
        // Firebase user association
        firebaseUserId: currentUser.uid,
        userId: currentUser.uid,
        
        // Basic info with complete identification
        estimateNumber: estimateNumber,
        title: `Estimado para ${estimate.client.name}`,
        status: 'draft',
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        
        // Complete client information
        clientId: estimate.client.id,
        clientName: estimate.client.name,
        clientEmail: estimate.client.email || '',
        clientPhone: estimate.client.phone || '',
        clientAddress: estimate.client.address || '',
        clientCity: estimate.client.city || '',
        clientState: estimate.client.state || '',
        clientZipCode: estimate.client.zipCode || '',
        
        // Complete contractor information
        contractorCompanyName: contractorData.companyName,
        contractorAddress: contractorData.companyAddress,
        contractorCity: contractorData.companyCity,
        contractorState: contractorData.companyState,
        contractorZip: contractorData.companyZip,
        contractorPhone: contractorData.companyPhone,
        contractorEmail: contractorData.companyEmail,
        contractorLicense: contractorData.companyLicense,
        contractorLogo: contractorData.companyLogo,
        
        // Complete project details
        projectType: 'fence',
        projectSubtype: 'custom',
        projectDescription: estimate.projectDetails || 'Proyecto de cerca personalizado',
        scope: estimate.projectDetails || 'Instalación completa según especificaciones',
        timeline: '2-3 semanas',
        notes: `Estimado generado el ${new Date().toLocaleDateString()}`,
        
        // Complete financial data with proper calculations
        items: estimate.items.map((item, index) => ({
          id: item.id,
          materialId: item.materialId,
          name: item.name,
          description: item.description || item.name,
          category: 'material',
          quantity: item.quantity,
          unit: item.unit || 'unit',
          unitPrice: Math.round(item.price * 100), // Store in cents
          totalPrice: Math.round(item.total * 100), // Store in cents
          sortOrder: index,
          isOptional: false
        })),
        
        // Financial totals (stored in cents for precision)
        subtotal: Math.round(estimate.subtotal * 100),
        taxRate: Math.round((estimate.taxRate || 10) * 100), // Store as basis points
        taxAmount: Math.round(estimate.tax * 100),
        discount: 0, // Default discount
        total: Math.round(estimate.total * 100),
        
        // Display-friendly totals (for dashboard compatibility)
        displaySubtotal: estimate.subtotal,
        displayTax: estimate.tax,
        displayTotal: estimate.total,
        
        // Additional metadata for dashboard
        itemsCount: estimate.items.length,
        estimateDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Guardando estimado completo:', {
        estimateNumber,
        clientName: estimateData.clientName,
        contractorCompany: estimateData.contractorCompanyName,
        totalItems: estimateData.items.length,
        subtotal: estimateData.displaySubtotal,
        total: estimateData.displayTotal
      });

      // Guardar también en Firebase para máxima compatibilidad
      try {
        const firebaseDoc = {
          ...estimateData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: 'estimate',
          source: 'estimates-wizard'
        };

        const estimateRef = await addDoc(collection(db, 'estimates'), firebaseDoc);
        console.log('✅ También guardado en Firebase:', estimateRef.id);

        const projectRef = await addDoc(collection(db, 'projects'), {
          ...firebaseDoc,
          projectId: estimateData.projectId,
          status: 'estimate',
          type: 'project'
        });
        console.log('✅ Proyecto creado en Firebase:', projectRef.id);
      } catch (firebaseError) {
        console.warn('⚠️ No se pudo guardar en Firebase, pero PostgreSQL funcionó:', firebaseError);
      }

      console.log('💾 Guardando estimado:', estimateData);

      // 3. Save directly to Firebase (primary storage)
      console.log('💾 Guardando directamente en Firebase...');
      
      const estimateDoc = {
        ...estimateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'estimate',
        source: 'estimates-wizard'
      };

      // Save to Firebase estimates collection
      const estimateRef = await addDoc(collection(db, 'estimates'), estimateDoc);
      console.log('✅ Estimado guardado en Firebase estimates:', estimateRef.id);

      // Also save to Firebase projects collection for dashboard integration
      const projectDoc = {
        ...estimateData,
        projectId: estimateRef.id,
        estimateId: estimateRef.id,
        type: 'project',
        source: 'estimate',
        status: 'estimate',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const projectRef = await addDoc(collection(db, 'projects'), projectDoc);
      console.log('✅ Estimado guardado en Firebase projects:', projectRef.id);

      // 4. Save to localStorage as final backup
      try {
        const localData = {
          ...estimateData,
          savedAt: new Date().toISOString(),
          estimateId: estimateRef.id,
          projectId: projectRef.id
        };
        
        const existingEstimates = JSON.parse(localStorage.getItem('savedEstimates') || '[]');
        existingEstimates.push(localData);
        localStorage.setItem('savedEstimates', JSON.stringify(existingEstimates));
        console.log('✅ Estimado guardado en localStorage como respaldo');
      } catch (localError) {
        console.warn('⚠️ No se pudo guardar en localStorage:', localError);
      }

      // 5. Success feedback
      toast({
        title: '✅ Estimado guardado exitosamente',
        description: `${estimateNumber} se guardó en tus estimados y proyectos`,
        duration: 5000
      });

      // 6. Optional: Auto-advance to preview
      if (currentStep === 3) {
        setPreviewHtml(htmlContent);
        setShowPreview(true);
      }

    } catch (error) {
      console.error('❌ Error guardando estimado:', error);
      
      // 7. Fallback: Try to save minimal data locally or show helpful error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      toast({
        title: 'Error al guardar',
        description: `No se pudo guardar el estimado: ${errorMessage}. Los datos se mantienen en la sesión actual.`,
        variant: 'destructive',
        duration: 8000
      });

      // Try to save to localStorage as absolute fallback
      try {
        const fallbackData = {
          estimate,
          timestamp: new Date().toISOString(),
          userId: currentUser.uid
        };
        localStorage.setItem(`estimate_fallback_${Date.now()}`, JSON.stringify(fallbackData));
        console.log('💾 Fallback: Datos guardados localmente');
      } catch (localError) {
        console.error('❌ Error incluso en fallback local:', localError);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filter clients and materials
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
    (client.phone && client.phone.includes(clientSearch)) ||
    (client.mobilePhone && client.mobilePhone.includes(clientSearch))
  );

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.description.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.category.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // Client selection
  const selectClient = (client: Client) => {
    setEstimate(prev => ({ ...prev, client }));
    toast({
      title: 'Client Selected',
      description: `${client.name} has been added to the estimate`,
      duration: 3000
    });
  };

  // Create new client manually
  const createNewClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast({
        title: 'Datos Requeridos',
        description: 'Nombre y email son requeridos',
        variant: 'destructive'
      });
      return;
    }

    if (!currentUser?.uid) {
      toast({
        title: 'Error de Autenticación',
        description: 'Usuario no autenticado. Por favor, inicia sesión.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const clientData = {
        clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId: currentUser.uid, // Esta es la clave que faltaba
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone || '',
        mobilePhone: '',
        address: newClient.address || '',
        city: newClient.city || '',
        state: newClient.state || '',
        zipCode: newClient.zipCode || '',
        notes: newClient.notes || '',
        source: 'Manual - Estimates',
        classification: 'cliente',
        tags: []
      };

      console.log('💾 Guardando nuevo cliente:', clientData);
      const savedClient = await saveClient(clientData);
      console.log('✅ Cliente guardado exitosamente:', savedClient);
      
      const clientWithId = { 
        id: savedClient.id, 
        ...clientData,
        createdAt: savedClient.createdAt || new Date(),
        updatedAt: savedClient.updatedAt || new Date()
      };
      
      // Actualizar la lista local de clientes
      setClients(prev => [clientWithId, ...prev]);
      
      // Seleccionar el cliente recién creado
      setEstimate(prev => ({ ...prev, client: clientWithId }));
      
      // Limpiar el formulario
      setNewClient({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        notes: ''
      });
      
      // Cerrar el diálogo
      setShowAddClientDialog(false);
      
      toast({
        title: '✅ Cliente Creado Exitosamente',
        description: `${clientData.name} ha sido guardado y seleccionado para este estimado`,
        duration: 4000
      });

      // Forzar recarga de clientes para sincronizar
      setTimeout(() => {
        loadClients();
      }, 1000);

    } catch (error) {
      console.error('❌ Error creating client:', error);
      toast({
        title: 'Error al Crear Cliente',
        description: error instanceof Error ? error.message : 'No se pudo crear el cliente. Verifica tu conexión e intenta nuevamente.',
        variant: 'destructive',
        duration: 6000
      });
    }
  };

  // Add material to estimate
  const addMaterialToEstimate = (material: Material) => {
    const estimateItem: EstimateItem = {
      id: `item-${Date.now()}`,
      materialId: material.id,
      name: material.name,
      description: material.description || '',
      quantity: 1,
      price: material.price,
      unit: material.unit || 'unit',
      total: material.price * 1
    };

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, estimateItem]
    }));

    setShowMaterialDialog(false);
    
    toast({
      title: 'Material Added',
      description: `${material.name} has been added to the estimate`
    });
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
          : item
      )
    }));
  };

  // Update item price
  const updateItemPrice = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, price: newPrice, total: newPrice * item.quantity }
          : item
      )
    }));
  };

  // Remove item from estimate
  const removeItemFromEstimate = (itemId: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    
    toast({
      title: 'Material Removed',
      description: 'The material has been removed from the estimate',
      duration: 3000
    });
  };

  // Generate estimate preview with validation and authority
  const generateEstimatePreview = () => {
    // Validación de datos críticos y generación de alertas usando profile en lugar de contractor
    const missingData = [];
    if (!estimate.client) missingData.push('Cliente');
    if (estimate.items.length === 0) missingData.push('Materiales');
    if (!estimate.projectDetails || estimate.projectDetails.trim() === '') missingData.push('Detalles del proyecto');
    if (!profile?.companyName) missingData.push('Nombre de empresa');
    if (!profile?.address || !profile?.phone || !profile?.email) missingData.push('Información de contacto de empresa');

    // Si hay datos críticos faltantes, mostrar el template con alertas
    if (missingData.length > 0) {
      const alertHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; border: 3px solid #f59e0b;">
          <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; display: flex; align-items: center;">
              ⚠️ Estimado Incompleto - Información Faltante
            </h3>
            <p style="color: #92400e; margin: 10px 0;">El preview muestra "${estimate.projectDetails.replace(/\n/g, '<br>')}" por ejemplo</p>
            <p style="color: #92400e; margin: 10px 0;">Controles compactos y oscuros como solicitaste</p>
            <p style="color: #92400e; margin: 10px 0;">Reset button incluye el nuevo campo</p>
            <p style="color: #92400e; margin: 10px 0;">¿Podrías probar ahora el preview agregando un nombre al descuento (como "Military" o "Senior") para ver que funciona</p>
            <p style="color: #92400e; margin: 10px 0;">Para generar un estimado profesional completo, necesitas completar:</p>
            <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
              ${missingData.map(item => `<li style="margin: 5px 0;">${item}</li>`).join('')}
            </ul>
            <p style="color: #92400e; margin: 10px 0; font-weight: bold;">
              ¿Podrías ajustar estos datos para que el estimado sea completo?
            </p>
          </div>
          ${generateBasicPreview()}
        </div>
      `;
      setPreviewHtml(alertHtml);
      return alertHtml;
    }

    // Generar estimado completo
    const estimateNumber = `EST-${Date.now()}`;
    const estimateDate = new Date().toLocaleDateString();

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header with Company Info and Logo -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="flex: 1;">
            ${profile?.logo ? `
              <img src="${profile.logo}" alt="Company Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />
            ` : ''}
            <h2 style="margin: 0; color: #2563eb; font-size: 1.5em;">${profile?.companyName || 'Your Company'}</h2>
            <p style="margin: 5px 0; color: #666;">
              ${profile?.address || ''}<br>
              ${profile?.city ? `${profile.city}, ` : ''}${profile?.state || ''} ${profile?.zipCode || ''}<br>
              ${profile?.phone || ''}<br>
              ${profile?.email || ''}
            </p>
            ${profile?.website ? `<p style="margin: 5px 0; color: #2563eb;">${profile.website}</p>` : ''}
            ${profile?.license ? `<p style="margin: 5px 0; font-size: 0.9em; color: #666;">License: ${profile.license}</p>` : ''}
          </div>
          
          <div style="text-align: right;">
            <h1 style="margin: 0; color: #2563eb; font-size: 2.2em;">ESTIMADO PROFESIONAL</h1>
            <p style="margin: 10px 0; font-size: 1.1em;"><strong>Estimado #:</strong> ${estimateNumber}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${estimateDate}</p>
          </div>
        </div>
        
        <!-- Client Information -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1; padding-right: 20px;">
            <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">FACTURAR A:</h3>
            <p style="margin: 5px 0; font-size: 1.1em; color: #000000;"><strong>${estimate.client?.name || 'Cliente no especificado'}</strong></p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.email || ''}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.phone || ''}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.address || ''}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.city ? `${estimate.client.city}, ` : ''}${estimate.client?.state || ''} ${estimate.client?.zipCode || ''}</p>
          </div>
        </div>

        <!-- Project Details -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">MATERIALES Y SERVICIOS:</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; line-height: 1.6;">
            ${estimate.projectDetails.replace(/\n/g, '<br>')}
          </div>
        </div>

        <!-- Materials & Labor Table -->
        <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: left; font-weight: bold;">Descripción</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Cant.</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Unidad</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Precio Unit.</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${estimate.items.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                <td style="border: 1px solid #ddd; padding: 12px; color: #000000;">
                  <strong>${item.name}</strong>
                  ${item.description ? `<br><small style="color: #333333;">${item.description}</small>` : ''}
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.unit}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; color: #000000;">$${item.price.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; color: #000000;">$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="text-align: right; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
          <div style="margin-bottom: 10px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Subtotal:</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.subtotal.toFixed(2)}</span>
          </div>
          ${estimate.discountAmount > 0 ? `
            <div style="margin-bottom: 10px; font-size: 1.1em; color: #22c55e;">
              <span style="margin-right: 40px; color: #22c55e;"><strong>Descuento ${estimate.discountName ? '(' + estimate.discountName + ')' : ''} (${estimate.discountType === 'percentage' ? estimate.discountValue + '%' : 'Fijo'}):</strong></span>
              <span style="font-weight: bold; color: #22c55e;">-$${estimate.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="margin-bottom: 15px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Impuesto (${estimate.taxRate}%):</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.tax.toFixed(2)}</span>
          </div>
          <div style="border-top: 2px solid #2563eb; padding-top: 15px; font-size: 1.3em; color: #2563eb;">
            <span style="margin-right: 40px; color: #2563eb;"><strong>TOTAL:</strong></span>
            <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">$${estimate.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 0.9em;">
          <p style="margin: 10px 0;"><strong>This estimate is valid for 30 days from the date shown above.</strong></p>
          <p style="margin: 10px 0;">Thank you for considering ${profile?.companyName || 'our company'} for your project!</p>
          ${profile?.insurancePolicy ? `<p style="margin: 5px 0;">Fully Insured - Policy #: ${profile.insurancePolicy}</p>` : ''}
        </div>
      </div>
    `;
    
    setPreviewHtml(html);
    return html;
  };

  // Función auxiliar para generar preview básico cuando faltan datos
  const generateBasicPreview = () => {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9fafb; opacity: 0.7;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #6b7280;">Vista Previa del Estimado</h2>
          <p style="color: #6b7280;">Completa la información para ver el estimado final</p>
        </div>
        
        <div style="border: 2px dashed #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #6b7280;">Información de la Empresa</h3>
          <p style="color: #6b7280;">${contractor?.companyName || '[Nombre de empresa requerido]'}</p>
        </div>
        
        <div style="border: 2px dashed #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #6b7280;">Cliente</h3>
          <p style="color: #6b7280;">${estimate.client?.name || '[Cliente requerido]'}</p>
        </div>
        
        <div style="border: 2px dashed #d1d5db; padding: 20px; border-radius: 8px;">
          <h3 style="color: #6b7280;">Materiales y Servicios</h3>
          <p style="color: #6b7280;">${estimate.items.length > 0 ? `${estimate.items.length} materiales agregados` : '[Materiales requeridos]'}</p>
        </div>
      </div>
    `;
  };

  // Save estimate to database
  const saveEstimate = async () => {
    try {
      console.log('💾 Iniciando guardado del estimado...');
      
      // Asegurar que tenemos datos mínimos
      if (!estimate.client || estimate.items.length === 0) {
        toast({
          title: '⚠️ Datos Incompletos',
          description: 'Necesitas seleccionar un cliente y agregar materiales',
          variant: 'destructive',
          duration: 3000
        });
        return null;
      }

      // 🚀 DATOS COMPLETOS PARA TRANSFERENCIA AL DASHBOARD
      // Obtener información completa del contratista
      let contractorInfo = {};
      try {
        const profileData = localStorage.getItem('contractorProfile');
        if (profileData) {
          contractorInfo = JSON.parse(profileData);
        }
      } catch (error) {
        console.warn('Usando datos por defecto del contratista');
      }

      const estimateData = {
        // ===== IDENTIFICACIÓN Y METADATOS =====
        firebaseUserId: currentUser?.uid || 'dev-user-123',
        estimateNumber: `EST-${Date.now()}`,
        projectId: `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        status: 'estimate',
        createdAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        
        // ===== CLIENT INFORMATION - Datos estructurados del cliente =====
        clientInformation: {
          id: estimate.client.id || null,
          name: estimate.client.name || '',
          email: estimate.client.email || '',
          phone: estimate.client.phone || '',
          address: estimate.client.address || '',
          city: estimate.client.city || '',
          state: estimate.client.state || '',
          zipCode: estimate.client.zipCode || '',
          fullAddress: `${estimate.client.address || ''}, ${estimate.client.city || ''}, ${estimate.client.state || ''} ${estimate.client.zipCode || ''}`.trim(),
          contactPreference: 'email',
          lastContact: new Date().toISOString()
        },
        
        // ===== CONTRACT INFORMATION - Información del contratista =====
        contractInformation: {
          companyName: contractorInfo.companyName || 'Owl Fence',
          companyAddress: contractorInfo.address || '',
          companyCity: contractorInfo.city || '',
          companyState: contractorInfo.state || '',
          companyZip: contractorInfo.zip || '',
          companyPhone: contractorInfo.phone || '',
          companyEmail: contractorInfo.email || '',
          companyWebsite: contractorInfo.website || '',
          licenseNumber: contractorInfo.license || '',
          insurancePolicy: contractorInfo.insurancePolicy || '',
          logoUrl: contractorInfo.logoUrl || '/owl-logo.png',
          fullAddress: `${contractorInfo.address || ''}, ${contractorInfo.city || ''}, ${contractorInfo.state || ''} ${contractorInfo.zip || ''}`.trim(),
          businessType: 'Construction Services',
          yearsInBusiness: contractorInfo.yearsInBusiness || 'N/A'
        },
        
        // ===== PROJECT TOTAL COSTS - Desglose completo de costos =====
        projectTotalCosts: {
          materialCosts: {
            items: estimate.items.map((item, index) => ({
              name: item.name,
              description: item.description || item.name,
              category: 'material',
              quantity: item.quantity,
              unit: item.unit || 'unit',
              unitPrice: item.price,
              totalPrice: item.total,
              unitPriceCents: Math.round(item.price * 100),
              totalPriceCents: Math.round(item.total * 100),
              sortOrder: index,
              isOptional: false
            })),
            subtotal: estimate.subtotal,
            subtotalCents: Math.round(estimate.subtotal * 100),
            itemsCount: estimate.items.length
          },
          laborCosts: {
            estimatedHours: Math.ceil(estimate.items.length * 2),
            hourlyRate: 45.00,
            totalLabor: Math.round(estimate.total * 0.3),
            description: 'Professional installation and labor services'
          },
          additionalCosts: {
            taxRate: estimate.taxRate || 10,
            taxRateBasisPoints: Math.round((estimate.taxRate || 10) * 100),
            taxAmount: estimate.tax,
            taxAmountCents: Math.round(estimate.tax * 100),
            discountType: estimate.discountType || null,
            discountValue: estimate.discountValue || 0,
            discountAmount: estimate.discountAmount || 0,
            discountAmountCents: Math.round((estimate.discountAmount || 0) * 100)
          },
          totalSummary: {
            subtotal: estimate.subtotal,
            tax: estimate.tax,
            discount: estimate.discountAmount || 0,
            finalTotal: estimate.total,
            subtotalCents: Math.round(estimate.subtotal * 100),
            taxCents: Math.round(estimate.tax * 100),
            discountCents: Math.round((estimate.discountAmount || 0) * 100),
            finalTotalCents: Math.round(estimate.total * 100)
          }
        },
        
        // ===== DETALLES DEL PROYECTO =====
        projectDetails: {
          name: `Proyecto para ${estimate.client.name}`,
          type: 'fence',
          subtype: 'custom',
          description: estimate.projectDetails || 'Proyecto de cerca personalizado',
          scope: 'Instalación completa de cerca',
          timeline: '2-3 semanas',
          startDate: null,
          completionDate: null,
          priority: 'normal',
          notes: `Estimado generado el ${new Date().toLocaleDateString()}`,
          terms: 'Estimado válido por 30 días. Materiales y mano de obra incluidos.'
        },
        
        // ===== CAMPOS LEGACY PARA COMPATIBILIDAD =====
        clientId: estimate.client.id || null,
        clientName: estimate.client.name || '',
        clientEmail: estimate.client.email || '',
        clientPhone: estimate.client.phone || '',
        contractorCompanyName: contractorInfo.companyName || 'Owl Fence',
        subtotal: Math.round(estimate.subtotal * 100),
        total: Math.round(estimate.total * 100),
        items: estimate.items.map((item, index) => ({
          name: item.name,
          description: item.description || item.name,
          category: 'material' as const,
          quantity: item.quantity,
          unit: item.unit || 'unit',
          unitPrice: Math.round(item.price * 100),
          totalPrice: Math.round(item.total * 100),
          sortOrder: index,
          isOptional: false
        })),
        taxRate: estimate.taxRate || 10,
        taxAmount: Math.round(estimate.tax * 100),
        estimateAmount: Math.round(estimate.total * 100)
      };

      console.log('📤 Enviando datos al servidor:', estimateData);

      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimateData),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('✅ Estimado guardado exitosamente:', responseData);
        toast({
          title: '💾 Estimado Guardado',
          description: `Estimado guardado correctamente en la base de datos`,
          duration: 3000
        });
        return responseData;
      } else {
        console.error('❌ Error del servidor:', responseData);
        throw new Error(responseData.error || 'Error al guardar el estimado');
      }
    } catch (error) {
      console.error('❌ Error saving estimate:', error);
      toast({
        title: '❌ Error al Guardar',
        description: 'No se pudo guardar el estimado. Revisa los datos e inténtalo de nuevo.',
        variant: 'destructive',
        duration: 5000
      });
      return null;
    }
  };





  // Initialize email data when dialog opens
  useEffect(() => {
    if (showEmailDialog && estimate.client) {
      setEmailData({
        toEmail: estimate.client.email || '',
        subject: `Professional Estimate from ${profile?.companyName || 'Your Company'}`,
        message: `Dear ${estimate.client.name},\n\nI hope this message finds you well. Please find attached your professional estimate for the ${estimate.projectDetails || 'construction project'}.\n\nWe have carefully prepared this estimate considering your specific needs and using the highest quality materials. The estimate includes all details of the work to be performed, as well as the associated costs.\n\nIf you have any questions about the estimate or would like to make any adjustments, please don't hesitate to contact us. We are here to ensure that the project meets all your expectations.\n\nWe look forward to the opportunity to work with you on this project.\n\nBest regards,\n${profile?.companyName || 'Your Company'}\n${profile?.phone || ''}\n${profile?.email || ''}\n\nNext Steps:\n• Review the attached estimate\n• Contact us with any questions\n• We'll schedule a follow-up call within 2 business days`,
        sendCopy: true
      });
    }
  }, [showEmailDialog, estimate.client, profile]);

  // Send email function
  const sendEstimateEmail = async () => {
    if (!estimate.client?.email) {
      toast({
        title: 'Error',
        description: 'El cliente no tiene un email registrado',
        variant: 'destructive'
      });
      return;
    }

    if (!emailData.toEmail || !emailData.subject || !emailData.message) {
      toast({
        title: 'Error', 
        description: 'Por favor complete todos los campos requeridos',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingEmail(true);
    
    try {
      // Generate the estimate HTML
      const estimateHtml = generateEstimatePreview();
      
      // Send email with estimate
      const response = await fetch('/api/send-estimate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailData.toEmail,
          subject: emailData.subject,
          message: emailData.message,
          estimateHtml: estimateHtml,
          clientName: estimate.client.name,
          companyName: profile?.companyName || 'Your Company',
          companyEmail: profile?.email || '',
          sendCopy: emailData.sendCopy
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: '✅ Email Enviado',
          description: `El estimado fue enviado exitosamente a ${emailData.toEmail}`,
          duration: 5000
        });
        setShowEmailDialog(false);
      } else {
        throw new Error(result.error || 'Error al enviar el email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: '❌ Error al Enviar',
        description: 'No se pudo enviar el email. Por favor intente nuevamente.',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Download PDF
  const downloadPDF = async () => {
    try {
      // Primero guardar el estimado automáticamente
      const savedEstimate = await saveEstimate();
      
      // Usar EXACTAMENTE el mismo HTML del preview para eliminar discrepancias
      const html = generateEstimatePreview();
      
      // Agregar estilos optimizados para PDF sin cambiar el contenido
      const pdfOptimizedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            /* Resetear márgenes y optimizar para PDF */
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #000 !important;
              background: #fff;
            }
            /* Asegurar que todos los textos sean negros en PDF */
            * { color: #000 !important; }
            .text-muted-foreground, .text-gray-600, .text-gray-500 { color: #000 !important; }
            
            /* Optimizaciones para impresión */
            @media print {
              body { margin: 0; padding: 15px; }
              * { color: #000 !important; }
            }
            
            /* Asegurar que las imágenes se mantengan */
            img { max-width: 100%; height: auto; }
            
            /* Mantener colores de marca solo para elementos específicos */
            h1, h2, h3 { color: #2563eb !important; }
            .border-bottom { border-bottom: 3px solid #2563eb !important; }
            thead tr { background: #2563eb !important; color: white !important; }
            thead th { color: white !important; }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;

      // 🐒 USAR TEMPLATE UNIFICADO CON PDFMONKEY
      const { generateUnifiedEstimateHTML, convertEstimateDataToTemplate } = 
        await import('../lib/unified-estimate-template');
      
      // Obtener datos de la empresa
      let companyData = {};
      try {
        const profile = localStorage.getItem('contractorProfile');
        if (profile) companyData = JSON.parse(profile);
      } catch (error) {
        console.warn('Usando datos por defecto');
      }
      
      // Generar HTML con template unificado (mismo que el preview)
      const templateData = convertEstimateDataToTemplate(estimate, companyData);
      const unifiedHtml = generateUnifiedEstimateHTML(templateData);
      
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html: unifiedHtml, 
          filename: `estimate-${estimate.client?.name || 'client'}.pdf` 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `estimate-${estimate.client?.name || 'client'}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: '✅ PDF Descargado',
        description: 'El estimado se ha descargado correctamente como PDF'
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: '❌ Error al Descargar PDF',
        description: 'No se pudo generar el PDF. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Client Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Seleccionar Cliente
                </div>
                <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nuevo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md sm:max-w-lg border-0 bg-transparent p-0 shadow-none">
                    {/* Futuristic Sci-Fi Container */}
                    <div className="relative bg-gradient-to-b from-slate-900/95 via-slate-800/98 to-slate-900/95 backdrop-blur-xl overflow-hidden">
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/60"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/60"></div>
                      
                      {/* Scanning Lines */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                        <div className="absolute bottom-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse delay-500"></div>
                      </div>
                      
                      {/* Arc Reactor Effect */}
                      <div className="absolute top-4 right-4 w-4 h-4 rounded-full border-2 border-cyan-400 opacity-60">
                        <div className="absolute inset-1 rounded-full bg-cyan-400/30 animate-pulse"></div>
                        <div className="absolute inset-2 rounded-full bg-cyan-400 animate-ping"></div>
                      </div>
                      
                      {/* Main Content */}
                      <div className="relative p-6 space-y-6">
                        {/* Header with Holographic Effect */}
                        <div className="text-center pb-4 border-b border-cyan-400/20">
                          <div className="text-xs font-mono text-cyan-400 mb-1 tracking-wider">CLIENT MATRIX</div>
                          <div className="text-lg font-bold text-white">CREAR NUEVO CLIENTE</div>
                          <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent mt-2"></div>
                        </div>
                        
                        {/* Form Fields with Cyberpunk Styling */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-cyan-400 text-xs font-mono tracking-wide">
                                NOMBRE [REQUIRED]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="name"
                                  value={newClient.name}
                                  onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="John Doe"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-cyan-400 text-xs font-mono tracking-wide">
                                EMAIL [REQUIRED]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="email"
                                  type="email"
                                  value={newClient.email}
                                  onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="john@example.com"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="phone" className="text-cyan-400 text-xs font-mono tracking-wide">
                                TELÉFONO [OPTIONAL]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="phone"
                                  value={newClient.phone}
                                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="(555) 123-4567"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="address" className="text-cyan-400 text-xs font-mono tracking-wide">
                                DIRECCIÓN [OPTIONAL]
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="address"
                                  value={newClient.address}
                                  onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                                  className="
                                    bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-400
                                    focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
                                    transition-all duration-300
                                  "
                                  placeholder="123 Main St"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/5 to-blue-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons with Cyberpunk Styling */}
                        <div className="flex gap-3 pt-4 border-t border-cyan-400/20">
                          <button
                            onClick={() => setShowAddClientDialog(false)}
                            className="
                              flex-1 px-4 py-2 border border-red-400/40 bg-gradient-to-r from-red-500/10 to-red-600/10
                              text-red-400 hover:text-red-300 hover:border-red-400/60 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20
                              transition-all duration-300 rounded font-mono text-sm tracking-wide
                            "
                          >
                            CANCELAR
                          </button>
                          <button
                            onClick={createNewClient}
                            className="
                              flex-1 px-4 py-2 border border-green-400/40 bg-gradient-to-r from-green-500/10 to-green-600/10
                              text-green-400 hover:text-green-300 hover:border-green-400/60 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-green-600/20
                              transition-all duration-300 rounded font-mono text-sm tracking-wide
                              disabled:opacity-50 disabled:cursor-not-allowed
                            "
                            disabled={!newClient.name || !newClient.email}
                          >
                            CREAR CLIENTE
                          </button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nombre, email o teléfono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {estimate.client && (
                <div className="p-4 border border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-primary">Cliente Seleccionado</h3>
                      <p className="text-sm">{estimate.client.name}</p>
                      <p className="text-xs text-muted-foreground">{estimate.client.email}</p>
                    </div>
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto">
                {isLoadingClients ? (
                  <p className="text-center py-4 text-muted-foreground">Cargando clientes...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {clientSearch ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          estimate.client?.id === client.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => selectClient(client)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm truncate">{client.name}</h4>
                            <div className="flex flex-col sm:flex-row sm:gap-3 text-xs text-muted-foreground">
                              <span className="truncate">{client.email || 'Sin email'}</span>
                              <span className="flex-shrink-0">{client.phone || 'Sin teléfono'}</span>
                            </div>
                          </div>
                          {estimate.client?.id === client.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2 mt-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Project Details
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalles del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <Label htmlFor="projectDetails" className="text-base font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Project Details
                  </Label>
                  <Button
                    onClick={enhanceProjectWithAI}
                    disabled={isAIProcessing || !estimate.projectDetails.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto"
                    size="sm"
                  >
                    {isAIProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="hidden sm:inline">Procesando...</span>
                        <span className="sm:hidden">Procesando...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Mejorar enhance with Mervin AI</span>
                        <span className="sm:hidden">Mejorar Mervin AI</span>
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="projectDetails"
                  placeholder="Describe los detalles completos del proyecto:&#10;&#10;• Alcance del trabajo y especificaciones técnicas&#10;• Cronograma y tiempo estimado&#10;• Proceso paso a paso del trabajo&#10;• Qué está incluido en el precio&#10;• Qué NO está incluido&#10;• Notas adicionales, términos especiales, condiciones..."
                  value={estimate.projectDetails}
                  onChange={(e) => setEstimate(prev => ({ ...prev, projectDetails: e.target.value }))}
                  className="min-h-[120px] text-sm"
                />
                <div className="flex items-start gap-2 mt-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <Brain className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-700">
                    <strong>💡 Tip:</strong> Escribe una descripción básica de tu proyecto y usa <strong>"Enhance with Mervin AI"</strong> para generar automáticamente una descripción profesional completa con todos los detalles técnicos necesarios para el estimado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Materials Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Agregar Materiales ({estimate.items.length})
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Smart Search IA - Interfaz Futurista Tony Stark */}
                  <div className="relative">
                    <button 
                      disabled={!estimate.projectDetails.trim() || isAIProcessing}
                      className={`
                        relative overflow-hidden px-3 sm:px-4 py-2 w-full sm:min-w-[160px] text-sm font-medium transition-all duration-300
                        bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900
                        border border-cyan-400/30 rounded-lg
                        hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                        group
                      `}
                      onClick={() => setShowSmartSearchDialog(!showSmartSearchDialog)}
                    >
                      {/* Efecto de luz de fondo */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-blue-400/5 to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative flex items-center gap-2 text-white">
                        {isAIProcessing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-cyan-400 font-mono">{aiProgress}%</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 text-cyan-400" />
                            <span>SMART SEARCH</span>
                            <ChevronDown className={`h-3 w-3 text-cyan-400 transition-transform duration-300 ${showSmartSearchDialog ? 'rotate-180' : ''}`} />
                          </>
                        )}
                      </div>
                    </button>

                    {/* Dropdown Futurista Holográfico */}
                    {showSmartSearchDialog && !isAIProcessing && (
                      <div className="absolute top-full mt-2 left-0 right-0 sm:left-0 sm:right-auto z-20 sm:min-w-[320px]">
                        {/* Panel Holográfico Principal */}
                        <div className="
                          bg-gradient-to-b from-slate-900/95 via-slate-800/98 to-slate-900/95 
                          backdrop-blur-xl border border-cyan-400/30 rounded-xl shadow-2xl shadow-cyan-400/10
                          overflow-hidden
                        ">
                          {/* Header con línea neon */}
                          <div className="border-b border-cyan-400/20 p-4">
                            <div className="text-xs font-mono text-cyan-400 mb-1 tracking-wider">SELECT ANALYSIS TYPE</div>
                            <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                          </div>
                          
                          <div className="p-3 space-y-2">
                            {/* Inventory Quantum */}
                            <button
                              onClick={() => {
                                setSmartSearchMode('materials');
                                setShowSmartSearchDialog(false);
                                handleSmartSearch();
                              }}
                              className="
                                group w-full p-3 rounded-lg transition-all duration-300
                                border border-blue-400/20 bg-gradient-to-r from-blue-500/5 to-blue-600/5
                                hover:border-blue-400/50 hover:bg-gradient-to-r hover:from-blue-500/15 hover:to-blue-600/15
                                hover:shadow-lg hover:shadow-blue-400/20
                              "
                            >
                              <div className="flex items-center gap-3">
                                {/* Icono Futurista */}
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                                  <div className="w-5 h-5 border-2 border-blue-400 rounded-sm relative">
                                    <div className="absolute inset-1 border border-blue-400/50" />
                                  </div>
                                </div>
                                
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                    INVENTORY QUANTUM
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Materials matrix with pricing vectors
                                  </div>
                                </div>
                                
                                {/* Flecha animada */}
                                <div className="text-blue-400 group-hover:translate-x-1 transition-transform">
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </div>
                            </button>

                            {/* Labor DeepSearch */}
                            <button
                              onClick={() => {
                                setSmartSearchMode('labor');
                                setShowSmartSearchDialog(false);
                                handleSmartSearch();
                              }}
                              className="
                                group w-full p-3 rounded-lg transition-all duration-300
                                border border-orange-400/20 bg-gradient-to-r from-orange-500/5 to-amber-600/5
                                hover:border-orange-400/50 hover:bg-gradient-to-r hover:from-orange-500/15 hover:to-amber-600/15
                                hover:shadow-lg hover:shadow-orange-400/20
                              "
                            >
                              <div className="flex items-center gap-3">
                                {/* Icono Futurista */}
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400/20 to-amber-600/20 border border-orange-400/30 flex items-center justify-center">
                                  <div className="relative">
                                    <Wrench className="h-5 w-5 text-orange-400" />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                                  </div>
                                </div>
                                
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">
                                    LABOR DEEPSEARCH
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Service algorithms & workforce optimization
                                  </div>
                                </div>
                                
                                {/* Flecha animada */}
                                <div className="text-orange-400 group-hover:translate-x-1 transition-transform">
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </div>
                            </button>

                            {/* Project Synapse - Recomendado */}
                            <button
                              onClick={() => {
                                setSmartSearchMode('both');
                                setShowSmartSearchDialog(false);
                                handleSmartSearch();
                              }}
                              className="
                                group w-full p-3 rounded-lg transition-all duration-300
                                border border-green-400/40 bg-gradient-to-r from-green-500/10 to-emerald-600/10
                                hover:border-green-400/70 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-emerald-600/20
                                hover:shadow-lg hover:shadow-green-400/25
                                ring-1 ring-green-400/20
                              "
                            >
                              <div className="flex items-center gap-3">
                                {/* Icono Futurista con efecto especial */}
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400/20 to-emerald-600/20 border border-green-400/40 flex items-center justify-center relative">
                                  <div className="relative">
                                    <div className="w-5 h-5 rounded-full border-2 border-green-400 relative">
                                      <div className="absolute inset-1 rounded-full bg-green-400/30" />
                                      <div className="absolute inset-2 rounded-full bg-green-400 animate-pulse" />
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
                                      PROJECT SYNAPSE
                                    </div>
                                    <div className="px-2 py-0.5 bg-green-400/20 border border-green-400/40 rounded text-xs text-green-400 font-mono">
                                      OPTIMAL
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">
                                    Complete neural network analysis
                                  </div>
                                </div>
                                
                                {/* Flecha animada con brillo */}
                                <div className="text-green-400 group-hover:translate-x-1 transition-transform">
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </div>
                            </button>
                          </div>

                          {/* Footer con línea neon */}
                          <div className="border-t border-cyan-400/20 p-2">
                            <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overlay para cerrar el dropdown */}
                    {showSmartSearchDialog && !isAIProcessing && (
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowSmartSearchDialog(false)}
                      />
                    )}
                  </div>

                  {/* Barra de progreso futurista cuando está procesando */}
                  {isAIProcessing && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-800 border border-cyan-400/30 rounded-lg">
                        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full transition-all duration-300"
                            style={{ width: `${aiProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-cyan-400 font-mono">{aiProgress}%</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">Neural processing...</span>
                    </div>
                  )}
                </div>
                <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Agregar Material</span>
                        <span className="sm:hidden">Agregar</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Seleccionar Material del Inventario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar materiales..."
                          value={materialSearch}
                          onChange={(e) => setMaterialSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {isLoadingMaterials ? (
                          <p className="text-center py-4 text-muted-foreground">Cargando materiales...</p>
                        ) : filteredMaterials.length === 0 ? (
                          <p className="text-center py-4 text-muted-foreground">
                            {materialSearch ? 'No se encontraron materiales' : 'No hay materiales disponibles'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredMaterials.map((material) => (
                              <div
                                key={material.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => addMaterialToEstimate(material)}
                              >
                                <h4 className="font-medium">{material.name}</h4>
                                <p className="text-sm text-muted-foreground">{material.category}</p>
                                <p className="text-sm font-medium text-primary">
                                  ${material.price?.toFixed(2) || '0.00'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay materiales agregados al estimado</p>
                  <p className="text-sm">Haz clic en "Agregar Material" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {estimate.items.map((item, index) => (
                    <div key={item.id} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm">$</span>
                            <Input
                              type="number"
                              value={item.price.toFixed(2)}
                              onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-16 sm:w-20 h-6 text-sm"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-sm">/ {item.unit}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-12 sm:w-16 h-7 text-center text-sm"
                              min="1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right min-w-16">
                            <p className="font-medium text-sm sm:text-base">${item.total.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItemFromEstimate(item.id)}
                            className="text-destructive hover:text-destructive h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4 space-y-3">
                    {/* Sleek Dark Tax and Discount Controls */}
                    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 rounded-xl px-3 py-3 border border-gray-700 shadow-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
                          {/* Tax Rate - Sleek Dark */}
                          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <span className="text-gray-300 text-xs font-medium tracking-wide">IMPUESTO</span>
                            <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 border border-gray-600 flex-1 sm:flex-initial">
                              <input
                                type="number"
                                value={estimate.taxRate}
                                onChange={(e) => setEstimate(prev => ({ 
                                  ...prev, 
                                  taxRate: parseFloat(e.target.value) || 0 
                                }))}
                                className="w-8 bg-transparent text-white text-xs text-center focus:outline-none"
                                min="0"
                                max="100"
                                step="0.1"
                              />
                              <span className="text-gray-400 text-xs ml-1">%</span>
                            </div>
                          </div>

                          {/* Discount - Sleek Dark */}
                          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <span className="text-gray-300 text-xs font-medium tracking-wide">DESC.</span>
                            <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial">
                              {/* Discount Name */}
                              <input
                                type="text"
                                value={estimate.discountName || ''}
                                onChange={(e) => setEstimate(prev => ({ 
                                  ...prev, 
                                  discountName: e.target.value 
                                }))}
                                className="w-16 sm:w-20 bg-gray-800 text-white text-xs border border-gray-600 rounded px-1 sm:px-2 py-1 focus:outline-none focus:border-blue-500"
                                placeholder="Tipo"
                              />
                              {/* Discount Type */}
                              <select
                                value={estimate.discountType}
                                onChange={(e) => setEstimate(prev => ({ 
                                  ...prev, 
                                  discountType: e.target.value as 'percentage' | 'fixed' 
                                }))}
                                className="bg-gray-800 text-white text-xs border border-gray-600 rounded px-1 py-1 focus:outline-none focus:border-blue-500 min-w-0"
                              >
                                <option value="percentage">%</option>
                                <option value="fixed">$</option>
                              </select>
                              {/* Discount Value */}
                              <div className="bg-gray-800 rounded-lg px-1 sm:px-2 py-1 border border-gray-600">
                                <input
                                  type="number"
                                  value={estimate.discountValue}
                                  onChange={(e) => setEstimate(prev => ({ 
                                    ...prev, 
                                    discountValue: parseFloat(e.target.value) || 0 
                                  }))}
                                  className="w-10 sm:w-12 bg-transparent text-white text-xs text-center focus:outline-none"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Reset button with glow effect */}
                        {(estimate.discountValue > 0 || estimate.taxRate !== 10 || estimate.discountName) && (
                          <button
                            onClick={() => setEstimate(prev => ({ 
                              ...prev, 
                              taxRate: 10,
                              discountValue: 0,
                              discountType: 'percentage',
                              discountName: ''
                            }))}
                            className="text-xs text-gray-400 hover:text-blue-400 transition-colors duration-200 underline hover:glow"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Premium Totals Summary */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Subtotal:</span>
                          <span className="font-semibold text-gray-900">${estimate.subtotal.toFixed(2)}</span>
                        </div>
                        
                        {estimate.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600 font-medium">
                              Descuento ({estimate.discountType === 'percentage' ? `${estimate.discountValue}%` : `$${estimate.discountValue}`}):
                            </span>
                            <span className="font-semibold text-emerald-600">-${estimate.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Impuesto ({estimate.taxRate}%):</span>
                          <span className="font-semibold text-gray-900">${estimate.tax.toFixed(2)}</span>
                        </div>
                        
                        <div className="border-t border-gray-300 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-800">Total:</span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              ${estimate.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3: // Preview
        return (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex flex-col space-y-4">
                  {/* Title Row */}
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Vista Previa del Estimado
                  </div>
                  
                  {/* Action Buttons - Responsive Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => setShowCompanyEditDialog(true)}
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <Building2 className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Editar</span> Empresa
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateEstimatePreview()}
                      disabled={!estimate.client || estimate.items.length === 0}
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Actualizar</span> Vista
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSaveEstimate()}
                      disabled={!estimate.client || estimate.items.length === 0 || isSaving}
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">{isSaving ? 'Guardando...' : 'Guardar'}</span><span className="sm:hidden">Est.</span><span className="hidden sm:inline"> Estimado</span>
                    </Button>
                    <Button
                      onClick={() => setShowPreview(true)}
                      disabled={!estimate.client || estimate.items.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1 text-xs"
                      size="sm"
                    >
                      <Eye className="h-3 w-3 mr-1" />
<span className="hidden sm:inline">Preview & Send</span><span className="sm:hidden">Preview</span>
                    </Button>
                    <Button
                      onClick={downloadPDF}
                      disabled={!estimate.client || estimate.items.length === 0 || !previewHtml}
                      size="sm"
                      className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Descargar</span> PDF
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!estimate.client || estimate.items.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className="text-lg font-medium">Estimado Incompleto</p>
                  <p className="text-muted-foreground">
                    Necesitas seleccionar un cliente y agregar materiales para generar la vista previa
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <div
                      style={{
                        color: '#000000',
                        '--tw-text-opacity': '1',
                        minWidth: '320px'
                      }}
                      className="[&_*]:!text-black [&_td]:!text-black [&_th]:!text-black [&_p]:!text-black [&_span]:!text-black [&_div]:!text-black [&_table]:w-full [&_table]:min-w-full [&_td]:text-xs [&_th]:text-xs [&_td]:px-2 [&_th]:px-2 [&_td]:py-1 [&_th]:py-1"
                      dangerouslySetInnerHTML={{ 
                        __html: previewHtml || generateEstimatePreview()
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 truncate">Crear Nuevo Estimado</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Sigue los pasos para crear un estimado profesional para tu cliente
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowEstimatesHistory(true);
              loadSavedEstimates();
            }}
            className="border-blue-300 text-blue-600 hover:bg-blue-50 w-full sm:w-auto shrink-0"
          >
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Mis </span>Estimados
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center max-w-4xl mx-auto px-4">
          <div className="flex items-center w-full max-w-2xl">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={`flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 mb-2 transition-all duration-300 ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-110'
                          : isCompleted
                          ? 'border-green-600 bg-green-600 text-white shadow-md'
                          : 'border-muted-foreground/40 bg-background'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 sm:h-6 sm:w-6" />
                      ) : (
                        <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
                      )}
                    </div>
                    <span className={`text-xs sm:text-sm font-medium text-center transition-colors duration-300 ${
                      isActive ? 'text-primary font-semibold' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 flex items-center px-2 sm:px-4">
                      <div
                        className={`w-full h-1 rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-green-600' : 'bg-muted-foreground/20'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Step Content */}
      <div className="mb-8">
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={downloadPDF}
              disabled={!estimate.client || estimate.items.length === 0}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Finalizar y </span>Descargar
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceedToNext()}
              className="w-full sm:w-auto"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Overlay futurista de DeepSearch AI */}


      {/* Mensaje emergente de Mervin */}
      {showMervinMessage && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-lg">
          <div className="bg-gradient-to-r from-cyan-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <img 
                    src={mervinLogoUrl} 
                    alt="Mervin" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">¡Hola primo! 👋</h3>
                <p className="text-gray-200 text-sm leading-relaxed">
                  Aquí tienes una lista sugerida de materiales para tu proyecto. Aún no soy perfecto (la IA también aprende), así que si ves algo que no va o falta, ajústalo con toda confianza. Tus aportes me ayudan a ser cada vez más preciso. ¡Gracias por tu apoyo!
                </p>
              </div>
            </div>
            <div className="mt-4 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Diálogo de edición de empresa */}
      <Dialog open={showCompanyEditDialog} onOpenChange={setShowCompanyEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Editar Información de Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo">Logo de la Empresa</Label>
                <div className="flex items-center gap-4">
                  {editableCompany.logo && (
                    <img 
                      src={editableCompany.logo} 
                      alt="Logo actual" 
                      className="w-16 h-16 object-contain border rounded"
                    />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditableCompany(prev => ({ 
                            ...prev, 
                            logo: event.target?.result as string 
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Sube una imagen para el logo de tu empresa (PNG, JPG, etc.)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  value={editableCompany.companyName}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Nombre de tu empresa"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={editableCompany.phone}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={editableCompany.address}
                onChange={(e) => setEditableCompany(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main Street"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={editableCompany.city}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Ciudad"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={editableCompany.state}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="CA"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Código Postal</Label>
                <Input
                  id="zipCode"
                  value={editableCompany.zipCode}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="12345"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editableCompany.email}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={editableCompany.website}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="www.empresa.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="license">Licencia</Label>
                <Input
                  id="license"
                  value={editableCompany.license}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, license: e.target.value }))}
                  placeholder="Número de licencia"
                />
              </div>
              <div>
                <Label htmlFor="insurancePolicy">Póliza de Seguro</Label>
                <Input
                  id="insurancePolicy"
                  value={editableCompany.insurancePolicy}
                  onChange={(e) => setEditableCompany(prev => ({ ...prev, insurancePolicy: e.target.value }))}
                  placeholder="Número de póliza"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Actualizar la información del contratista temporalmente para esta sesión
              const updatedContractor = {
                ...contractor,
                companyName: editableCompany.companyName,
                name: editableCompany.companyName,
                address: editableCompany.address,
                city: editableCompany.city,
                state: editableCompany.state,
                zipCode: editableCompany.zipCode,
                phone: editableCompany.phone,
                email: editableCompany.email,
                website: editableCompany.website,
                license: editableCompany.license,
                insurancePolicy: editableCompany.insurancePolicy,
                logo: editableCompany.logo
              };
              setContractor(updatedContractor);
              setShowCompanyEditDialog(false);
              setPreviewHtml(''); // Forzar regeneración de la vista previa
              toast({
                title: '✅ Información Actualizada',
                description: 'Los cambios se aplicarán al estimado. Logo y datos de empresa actualizados.',
              });
            }}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal del Historial de Estimados */}
      <Dialog open={showEstimatesHistory} onOpenChange={setShowEstimatesHistory}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mis Estimados Guardados
            </DialogTitle>
            <DialogDescription>
              Historial completo de todos los estimados creados y guardados
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingEstimates ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando estimados...
                </div>
              </div>
            ) : savedEstimates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No hay estimados guardados</p>
                <p className="text-muted-foreground">
                  Crea y descarga tu primer estimado para verlo aquí
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto px-2">
                <div className="space-y-2">
                  {savedEstimates.map((estimate) => (
                    <div key={estimate.id} className="border rounded-lg p-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate">{estimate.estimateNumber}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                              estimate.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              estimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              estimate.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {estimate.status === 'draft' ? 'Borrador' :
                               estimate.status === 'sent' ? 'Enviado' :
                               estimate.status === 'approved' ? 'Aprobado' : estimate.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 text-sm text-gray-600">
                            <div className="truncate">
                              <span className="font-medium">Cliente:</span> {estimate.clientName}
                            </div>
                            <div className="truncate">
                              <span className="font-medium">Total:</span> ${(estimate.total / 100).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {estimate.projectType || 'Cerca'} • {new Date(estimate.estimateDate).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (estimate.pdfUrl) {
                                window.open(estimate.pdfUrl, '_blank');
                              } else {
                                toast({
                                  title: 'PDF no disponible',
                                  description: 'Este estimado no tiene PDF generado',
                                  variant: 'destructive'
                                });
                              }
                            }}
                            className="h-8 px-2"
                          >
                            <Download className="h-3 w-3" />
                            <span className="hidden sm:inline ml-1">PDF</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: 'Función próximamente',
                                description: 'Pronto podrás editar estimados guardados'
                              });
                            }}
                            className="h-8 px-2"
                          >
                            <Edit className="h-3 w-3" />
                            <span className="hidden sm:inline ml-1">Editar</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstimatesHistory(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setShowEstimatesHistory(false);
              // Resetear formulario para crear nuevo estimado
              setCurrentStep(0);
              setEstimate({
                client: null,
                items: [],
                projectDetails: '',
                subtotal: 0,
                tax: 0,
                total: 0,
                taxRate: 10,
                discountType: 'percentage',
                discountValue: 0,
                discountAmount: 0,
                discountName: ''
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Estimado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete PDF Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              Professional Estimate Preview
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Complete preview of your professional estimate as it will appear in the PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Complete PDF Preview */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div 
                className="p-8 bg-white"
                style={{ 
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: '1.6',
                  color: '#333'
                }}
              >
                {/* Header with Company Logo and Info */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <img 
                      src={mervinLogoUrl} 
                      alt="Company Logo" 
                      className="h-16 w-16 object-contain"
                    />
                    <div>
                      <h1 className="text-2xl font-bold text-blue-900">{profile?.companyName || 'Your Company'}</h1>
                      <p className="text-gray-600">{profile?.address || 'Company Address'}</p>
                      <p className="text-gray-600">{profile?.city}, {profile?.state} {profile?.zipCode}</p>
                      <p className="text-gray-600">Phone: {profile?.phone || 'Phone Number'}</p>
                      <p className="text-gray-600">Email: {profile?.email || 'Email Address'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">PROFESSIONAL ESTIMATE</h2>
                    <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-gray-600">Estimate #: EST-{new Date().getFullYear()}-{String(Date.now()).slice(-4)}</p>
                  </div>
                </div>

                {/* Client Information */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Bill To:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">{estimate.client?.name || 'Client Name'}</p>
                      <p className="text-gray-600">{estimate.client?.address || 'Client Address'}</p>
                      <p className="text-gray-600">{estimate.client?.city}, {estimate.client?.state} {estimate.client?.zipCode}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone: {estimate.client?.phone || 'Phone Number'}</p>
                      <p className="text-gray-600">Email: {estimate.client?.email || 'Email Address'}</p>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                {estimate.projectDetails && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Project Description:</h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{estimate.projectDetails}</p>
                  </div>
                )}

                {/* Items Table */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Items & Services:</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="border border-gray-300 p-3 text-left">Description</th>
                        <th className="border border-gray-300 p-3 text-center">Quantity</th>
                        <th className="border border-gray-300 p-3 text-center">Unit</th>
                        <th className="border border-gray-300 p-3 text-right">Unit Price</th>
                        <th className="border border-gray-300 p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.items.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-300 p-3">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                          <td className="border border-gray-300 p-3 text-center">{item.unit}</td>
                          <td className="border border-gray-300 p-3 text-right">${item.price.toFixed(2)}</td>
                          <td className="border border-gray-300 p-3 text-right font-medium">${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="mb-8">
                  <div className="flex justify-end">
                    <div className="w-80">
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Subtotal:</span>
                          <span className="font-medium">${estimate.subtotal.toFixed(2)}</span>
                        </div>
                        
                        {estimate.discountAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount ({estimate.discountName || 'Discount'}):</span>
                            <span>-${estimate.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-gray-700">Tax ({estimate.taxRate}%):</span>
                          <span className="font-medium">${estimate.tax.toFixed(2)}</span>
                        </div>
                        
                        <div className="border-t border-gray-300 pt-2">
                          <div className="flex justify-between text-lg font-bold text-blue-900">
                            <span>Total:</span>
                            <span>${estimate.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Terms & Conditions:</h3>
                  <div className="text-sm text-gray-700 space-y-2 bg-gray-50 p-4 rounded-lg">
                    <p>• This estimate is valid for 30 days from the date issued.</p>
                    <p>• A 50% deposit is required to begin work.</p>
                    <p>• Final payment is due upon completion of the project.</p>
                    <p>• All materials and workmanship are guaranteed for one year.</p>
                    <p>• Changes to the scope of work may affect the final price.</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-6 border-t border-gray-300">
                  <p className="text-gray-600">Thank you for choosing {profile?.companyName || 'our services'}!</p>
                  <p className="text-sm text-gray-500 mt-2">
                    For questions about this estimate, please contact us at {profile?.phone || 'phone'} or {profile?.email || 'email'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4 flex justify-between">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Close Preview
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowPreview(false);
                  setShowEmailDialog(true);
                }}
                disabled={!estimate.client?.email}
                className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
              <Button 
                onClick={downloadPDF}
                disabled={!estimate.client || estimate.items.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              Send Professional Estimate
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Send your professional estimate directly to the client with a personalized message
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Client Information Card */}
            {estimate.client && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-blue-900">Client Information</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <p className="text-gray-900">{estimate.client.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{estimate.client.email || 'Not provided'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Project:</span>
                    <p className="text-gray-900">{estimate.projectDetails || 'No description'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Email Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="toEmail" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Client Email Address *
                  </Label>
                  <Input
                    id="toEmail"
                    type="email"
                    value={emailData.toEmail}
                    onChange={(e) => setEmailData(prev => ({ ...prev, toEmail: e.target.value }))}
                    placeholder="client@email.com"
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Email Subject *
                  </Label>
                  <Input
                    id="subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Professional Estimate - Your Project"
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sendCopy" className="text-sm font-medium text-gray-700">
                      Email Options
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="sendCopy"
                      checked={emailData.sendCopy}
                      onChange={(e) => setEmailData(prev => ({ ...prev, sendCopy: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="sendCopy" className="text-sm text-gray-700 cursor-pointer">
                      Send a copy to my email ({profile?.email || 'your email'})
                    </Label>
                  </div>
                </div>
              </div>

              {/* Right Column - Message */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="message" className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Edit className="h-4 w-4" />
                    Personal Message *
                  </Label>
                  <Textarea
                    id="message"
                    value={emailData.message}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Your personalized message to the client..."
                    rows={12}
                    className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be included in the email along with your estimate
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-800">Email Preview</h4>
              </div>
              <div className="bg-white border rounded-lg p-4 text-sm">
                <div className="border-b pb-2 mb-3">
                  <p><strong>To:</strong> {emailData.toEmail || 'client@email.com'}</p>
                  <p><strong>From:</strong> {profile?.email || 'your@email.com'}</p>
                  <p><strong>Subject:</strong> {emailData.subject || 'Professional Estimate'}</p>
                </div>
                <div className="text-gray-700 whitespace-pre-line">
                  {emailData.message || 'Your personalized message will appear here...'}
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  📎 Professional estimate will be attached as HTML content
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4 flex justify-between">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={sendEstimateEmail}
              disabled={isSendingEmail || !emailData.toEmail || !emailData.subject || !emailData.message}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 min-w-[140px]"
            >
              {isSendingEmail ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Estimate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mervin Working Effect */}
      <MervinWorkingEffect 
        isVisible={showMervinWorking} 
        onComplete={() => setShowMervinWorking(false)}
      />
    </div>
  );
}