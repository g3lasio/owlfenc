import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getClients as getFirebaseClients, saveClient } from '@/lib/clientFirebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  Check,
  Calculator,
  Building2,
  UserPlus,
  Sparkles,
  Brain
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
  notes: string;
  scope: string;
  timeline: string;
  process: string;
  includes: string;
  excludes: string;
  subtotal: number;
  tax: number;
  total: number;
}

const STEPS = [
  { id: 'client', title: 'Cliente', icon: User },
  { id: 'details', title: 'Detalles', icon: FileText },
  { id: 'materials', title: 'Materiales', icon: Package },
  { id: 'preview', title: 'Vista Previa', icon: Eye }
];

export default function EstimatesWizard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [estimate, setEstimate] = useState<EstimateData>({
    client: null,
    items: [],
    notes: '',
    scope: '',
    timeline: '',
    process: '',
    includes: '',
    excludes: '',
    subtotal: 0,
    tax: 0,
    total: 0
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
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);

  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');

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

  // New material form
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    unit: '',
    sku: '',
    supplier: ''
  });

  // AI enhancement states
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [projectDescription, setProjectDescription] = useState('');

  // Load data on mount
  useEffect(() => {
    loadClients();
    loadMaterials();
    loadContractorProfile();
  }, [currentUser]);

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    setEstimate(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  }, [estimate.items]);

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      // Use Firebase directly like your functional Clients page
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
    if (!currentUser) {
      console.log('No current user, skipping materials load');
      return;
    }
    
    try {
      setIsLoadingMaterials(true);
      console.log('🔄 Cargando materiales de Firebase para usuario:', currentUser.uid);
      
      // Use Firebase directly like your functional Materials page
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      console.log('📦 Documentos de materiales encontrados:', querySnapshot.size);

      const materialsData: Material[] = [];
      querySnapshot.forEach((doc, index) => {
        const data = doc.data() as Omit<Material, 'id'>;
        console.log(`   Material ${index + 1}:`, { id: doc.id, name: data.name, price: data.price, category: data.category });
        
        const material: Material = {
          id: doc.id,
          ...data,
          price: typeof data.price === 'number' ? data.price : 0
        };
        materialsData.push(material);
      });

      console.log('✅ Materiales procesados:', materialsData.length);
      setMaterials(materialsData);
    } catch (error) {
      console.error('❌ Error loading materials from Firebase:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los materiales',
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
      case 1: return estimate.items.length > 0;
      case 2: return true;
      case 3: return true;
      default: return false;
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
      title: 'Cliente seleccionado',
      description: `${client.name} ha sido agregado al estimado`
    });
  };

  // Create new client manually
  const createNewClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast({
        title: 'Datos requeridos',
        description: 'El nombre y email son obligatorios',
        variant: 'destructive'
      });
      return;
    }

    try {
      const clientData = {
        clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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

      const savedClient = await saveClient(clientData);
      
      // Add to local state
      const clientWithId = { 
        id: savedClient.id, 
        ...clientData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setClients(prev => [clientWithId, ...prev]);
      
      // Select the new client automatically
      setEstimate(prev => ({ ...prev, client: clientWithId }));
      
      // Reset form and close dialog
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
      setShowAddClientDialog(false);
      
      toast({
        title: 'Cliente creado',
        description: `${clientData.name} ha sido creado y seleccionado`
      });
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el cliente',
        variant: 'destructive'
      });
    }
  };

  // AI Enhancement Functions
  const enhanceProjectWithAI = async (field: string) => {
    if (!projectDescription.trim()) {
      toast({
        title: 'Descripción requerida',
        description: 'Por favor describe brevemente tu proyecto para usar la IA',
        variant: 'destructive'
      });
      return;
    }

    setIsAIProcessing(true);
    
    try {
      // Analyze project context
      const projectContext = {
        description: projectDescription,
        client: estimate.client?.name || 'Cliente',
        materials: estimate.items.map(item => `${item.name} (${item.quantity} ${item.unit})`).join(', '),
        totalValue: estimate.total
      };

      if (field === 'all') {
        // Process all fields at once
        const fields = ['scope', 'timeline', 'process', 'includes', 'excludes', 'notes'];
        const allPromises = fields.map(async (f) => {
          const prompt = generateAIPrompt(f, projectContext);
          const response = await fetch('/api/ai/enhance-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, field: f, context: projectContext }),
          });
          
          if (!response.ok) throw new Error(`Error processing ${f}`);
          const result = await response.json();
          return { field: f, content: result.content };
        });

        const results = await Promise.all(allPromises);
        
        // Update all fields at once
        const updates = results.reduce((acc, { field: f, content }) => {
          acc[f] = content;
          return acc;
        }, {} as any);
        
        setEstimate(prev => ({ ...prev, ...updates }));
        
        toast({
          title: '🚀 ¡Proyecto completado con IA!',
          description: 'Todos los campos han sido rellenados profesionalmente'
        });
      } else {
        // Process single field
        const prompt = generateAIPrompt(field, projectContext);
        
        const response = await fetch('/api/ai/enhance-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, field, context: projectContext }),
        });

        if (!response.ok) throw new Error('Error al procesar con IA');
        const result = await response.json();
        
        setEstimate(prev => ({ ...prev, [field]: result.content }));
        
        toast({
          title: '✨ Completado con IA',
          description: `El campo "${getFieldDisplayName(field)}" ha sido mejorado con IA`
        });
      }
      
    } catch (error) {
      console.error('Error enhancing with AI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar con IA. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsAIProcessing(false);
    }
  };

  const generateAIPrompt = (field: string, context: any) => {
    const basePrompt = `Actúa como un contratista profesional experto creando un estimado para: ${context.description}
    
Cliente: ${context.client}
Materiales seleccionados: ${context.materials || 'No especificados'}
Valor del proyecto: $${context.totalValue}

Genera contenido profesional y específico para el campo "${getFieldDisplayName(field)}" en español.`;

    switch (field) {
      case 'scope':
        return `${basePrompt}

Crea un alcance de trabajo detallado que incluya:
- Análisis de la situación actual
- Trabajos de preparación necesarios
- Proceso de instalación/construcción principal
- Acabados y detalles finales
- Estándares de calidad a seguir

Formato: Párrafos claros y profesionales (máximo 200 palabras).`;

      case 'timeline':
        return `${basePrompt}

Estima un tiempo realista considerando:
- Complejidad del proyecto
- Condiciones climáticas
- Disponibilidad de materiales
- Permisos necesarios

Formato: Tiempo específico (ej. "2-3 semanas", "10-14 días hábiles").`;

      case 'process':
        return `${basePrompt}

Describe el proceso de trabajo paso a paso:
- Preparación del sitio
- Secuencia de actividades
- Coordinación necesaria
- Control de calidad
- Inspecciones

Formato: Lista numerada o con viñetas (máximo 150 palabras).`;

      case 'includes':
        return `${basePrompt}

Lista específicamente qué incluye el presupuesto:
- Materiales principales
- Mano de obra especializada
- Herramientas y equipo
- Permisos básicos
- Garantías

Formato: Lista clara con viñetas (máximo 120 palabras).`;

      case 'excludes':
        return `${basePrompt}

Lista claramente qué NO incluye el presupuesto:
- Trabajos adicionales fuera del alcance
- Permisos especiales
- Servicios de terceros
- Modificaciones no contempladas
- Contingencias extraordinarias

Formato: Lista clara con viñetas (máximo 100 palabras).`;

      case 'notes':
        return `${basePrompt}

Agrega notas profesionales importantes:
- Recomendaciones de mantenimiento
- Consideraciones especiales del sitio
- Sugerencias para optimizar resultados
- Información sobre garantías
- Próximos pasos

Formato: Párrafos informativos (máximo 120 palabras).`;

      default:
        return basePrompt;
    }
  };

  const getFieldDisplayName = (field: string) => {
    const fieldNames = {
      scope: 'Alcance del Trabajo',
      timeline: 'Tiempo Estimado',
      process: 'Proceso de Trabajo',
      includes: 'Incluye',
      excludes: 'No Incluye',
      notes: 'Notas Adicionales'
    };
    return fieldNames[field as keyof typeof fieldNames] || field;
  };

  // Create new material manually
  const createNewMaterial = async () => {
    if (!newMaterial.name || !newMaterial.price || !newMaterial.unit) {
      toast({
        title: 'Datos requeridos',
        description: 'El nombre, precio y unidad son obligatorios',
        variant: 'destructive'
      });
      return;
    }

    try {
      const materialData = {
        name: newMaterial.name,
        description: newMaterial.description || '',
        category: newMaterial.category || 'General',
        price: parseFloat(newMaterial.price),
        unit: newMaterial.unit,
        sku: newMaterial.sku || '',
        supplier: newMaterial.supplier || '',
        userId: currentUser?.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const materialsRef = collection(db, 'materials');
      const docRef = await addDoc(materialsRef, materialData);
      
      // Add to local state
      const materialWithId = { 
        id: docRef.id, 
        ...materialData,
        createdAt: materialData.createdAt.toDate(),
        updatedAt: materialData.updatedAt.toDate()
      };
      
      setMaterials(prev => [materialWithId, ...prev]);
      
      // Add to estimate automatically
      addMaterialToEstimate(materialWithId);
      
      // Reset form and close dialog
      setNewMaterial({
        name: '',
        description: '',
        category: '',
        price: '',
        unit: '',
        sku: '',
        supplier: ''
      });
      setShowAddMaterialDialog(false);
      
      toast({
        title: 'Material creado',
        description: `${materialData.name} ha sido creado y agregado al estimado`
      });
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el material',
        variant: 'destructive'
      });
    }
  };

  // Material management
  const addMaterialToEstimate = (material: Material, quantity: number = 1) => {
    const newItem: EstimateItem = {
      id: `item_${Date.now()}`,
      materialId: material.id,
      name: material.name,
      description: material.description,
      quantity,
      price: material.price,
      unit: material.unit,
      total: material.price * quantity
    };

    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setShowMaterialDialog(false);
    setMaterialSearch('');
    toast({
      title: 'Material agregado',
      description: `${material.name} ha sido agregado al estimado`
    });
  };

  const updateItem = (itemId: string, field: string, value: string | number) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updatedItem.total = updatedItem.price * updatedItem.quantity;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const removeItem = (itemId: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Generate preview HTML using your exact template
  const generatePreview = () => {
    if (!estimate.client || estimate.items.length === 0) return;

    const itemsHtml = estimate.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.description}</td>
        <td>${item.quantity} ${item.unit}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const contractorName = contractor?.company || contractor?.name || 'Tu Empresa';
    const contractorAddress = contractor?.address || 'Dirección de tu empresa';
    const contractorEmail = contractor?.email || 'contacto@tuempresa.com';
    const contractorPhone = contractor?.phone || '(555) 123-4567';

    const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Estimate Template (General Contractors - Neon Final)</title>
        <style>
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            background: #f8f9fb;
            margin: 0;
            padding: 0;
            color: #181818;
          }
          .container {
            max-width: 800px;
            margin: 40px auto;
            background: #fff;
            box-shadow: 0 4px 24px rgba(20, 240, 248, 0.12);
            border-radius: 18px;
            padding: 34px 36px 20px 36px;
            border: 2px solid #14f0f8;
          }
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 2.5px solid #14f0f8;
            padding-bottom: 18px;
            margin-bottom: 18px;
          }
          .company-details {
            line-height: 1.7;
          }
          .logo {
            max-width: 108px;
            max-height: 60px;
            margin-bottom: 6px;
            background: #f5f7fa;
            border-radius: 8px;
            border: 1px solid #d7e0ee;
            display: block;
          }
          .company-name {
            font-size: 1.22rem;
            font-weight: 700;
            color: #181818;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .company-address {
            font-size: 1rem;
            color: #222;
            margin-bottom: 2px;
          }
          .estimate-title {
            text-align: right;
            font-size: 2rem;
            color: #181818;
            font-weight: 600;
            letter-spacing: 1px;
            text-shadow: 0 2px 12px #e0fcff30;
          }
          .estimate-meta {
            text-align: right;
            font-size: 1rem;
            color: #303030;
            line-height: 1.5;
          }
          .section {
            margin-bottom: 23px;
          }
          .section-title {
            font-size: 1.13rem;
            font-weight: bold;
            color: #181818;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
            background: #e9fdff;
            padding: 4px 12px;
            border-left: 4px solid #14f0f8;
            border-radius: 6px 0 0 6px;
            display: inline-block;
            box-shadow: 0 1px 4px 0 #14f0f816;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            background: #e9fdff;
            border-radius: 7px;
            overflow: hidden;
            margin-bottom: 6px;
            box-shadow: 0 1.5px 6px 0 #10dbe222;
            border: 1.5px solid #14f0f8;
          }
          .details-table th,
          .details-table td {
            padding: 12px 9px;
            text-align: left;
            color: #181818;
          }
          .details-table th {
            background: #bafcff;
            color: #181818;
            font-size: 1.02rem;
            font-weight: 600;
            border-bottom: 1.5px solid #14f0f8;
          }
          .details-table td {
            border-bottom: 1px solid #e6fafd;
            font-size: 1rem;
          }
          .details-table tr:last-child td {
            border-bottom: none;
          }
          .totals-row {
            font-weight: 700;
            background: #bafcff;
            font-size: 1.09rem;
            color: #181818;
          }
          .project-details {
            font-size: 1.06rem;
            color: #233;
            margin: 16px 0 24px 0;
            padding: 18px 22px 13px 22px;
            background: #e1fbfc;
            border-radius: 8px;
            border-left: 4px solid #14f0f8;
            box-shadow: 0 2px 8px rgba(20, 240, 248, 0.07);
          }
          .client-contact a,
          .company-details a {
            display: inline-block;
            margin-right: 10px;
            padding: 4px 10px;
            color: #181818;
            background: #e6fcff;
            border-radius: 7px;
            text-decoration: none;
            font-weight: 500;
            font-size: 1.02rem;
            transition: background 0.2s;
            box-shadow: 0 0 7px 0 #10dbe225;
            border: 1px solid #14f0f8;
          }
          .client-contact a:hover,
          .company-details a:hover {
            background: #14f0f8;
            color: #181818;
          }
          .footer {
            text-align: right;
            margin-top: 16px;
            font-size: 0.89rem;
            color: #14f0f8;
            padding-top: 5px;
            border-top: 1.5px solid #bafcff;
            letter-spacing: 0.12px;
            font-family: "Segoe UI", Arial, sans-serif;
            text-shadow: 0 0 8px #10dbe233;
          }
          .table-wrapper {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #14f0f8 #e9fdff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-details">
              ${contractor?.logo ? `<img src="${contractor.logo}" alt="Company Logo" class="logo" />` : ''}
              <div class="company-name">${contractorName}</div>
              <div class="company-address">${contractorAddress}</div>
              <div>
                <a href="mailto:${contractorEmail}">${contractorEmail}</a>
                <a href="tel:${contractorPhone}">${contractorPhone}</a>
              </div>
            </div>
            <div>
              <div class="estimate-title">ESTIMATE</div>
              <div class="estimate-meta">
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><strong>Estimate #:</strong> EST-${Date.now()}</div>
                <div><strong>Valid Until:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Client</div>
            <div class="table-wrapper">
              <table class="details-table">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                </tr>
                <tr>
                  <td>${estimate.client.name}</td>
                  <td><a href="mailto:${estimate.client.email}">${estimate.client.email}</a></td>
                  <td><a href="tel:${estimate.client.phone}">${estimate.client.phone}</a></td>
                  <td>${estimate.client.address}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Estimate Details</div>
            <div class="table-wrapper">
              <table class="details-table">
                <tr>
                  <th>Item</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
                ${itemsHtml}
                <tr class="totals-row">
                  <td colspan="4" style="text-align: right">Subtotal</td>
                  <td>$${estimate.subtotal.toFixed(2)}</td>
                </tr>
                <tr class="totals-row">
                  <td colspan="4" style="text-align: right">Tax (16%)</td>
                  <td>$${estimate.tax.toFixed(2)}</td>
                </tr>
                <tr class="totals-row">
                  <td colspan="4" style="text-align: right"><strong>Total</strong></td>
                  <td><strong>$${estimate.total.toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>
          </div>

          ${(estimate.scope || estimate.timeline || estimate.process || estimate.includes || estimate.excludes) ? `
          <div class="section project-details">
            ${estimate.scope ? `<b>Scope:</b> ${estimate.scope}<br />` : ''}
            ${estimate.timeline ? `<b>Timeline:</b> ${estimate.timeline}<br />` : ''}
            ${estimate.process ? `<b>Process:</b> ${estimate.process}<br />` : ''}
            ${estimate.includes ? `<b>Includes:</b> ${estimate.includes}<br />` : ''}
            ${estimate.excludes ? `<b>Excludes:</b> ${estimate.excludes}` : ''}
          </div>
          ` : ''}

          ${estimate.notes ? `
          <div class="section project-details">
            <b>Additional Notes:</b><br />
            ${estimate.notes.replace(/\n/g, '<br/>')}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Terms & Conditions</div>
            <div class="terms">
              <ul style="margin: 0 0 0 1.4em; padding: 0; color: #181818">
                <li>
                  This estimate is valid for 30 days from the issue date. Prices may
                  change after this period due to fluctuations in materials, labor,
                  or market conditions.
                </li>
                <li>
                  Project execution, specific terms, and additional conditions will
                  be detailed in the formal contract to be signed by both parties.
                </li>
                <li>For questions, please contact us directly.</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} ${contractorName}. All Rights Reserved.
          </div>
        </div>
      </body>
    </html>`;

    setPreviewHtml(html);
  };

  // Generate preview when reaching step 3
  useEffect(() => {
    if (currentStep === 3) {
      generatePreview();
    }
  }, [currentStep, estimate]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Client Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Seleccionar Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimate.client ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-primary">{estimate.client.name}</h3>
                        <p className="text-sm text-muted-foreground">{estimate.client.email}</p>
                        <p className="text-sm text-muted-foreground">{estimate.client.phone}</p>
                        <p className="text-sm text-muted-foreground">{estimate.client.address}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEstimate(prev => ({ ...prev, client: null }))}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Cliente seleccionado correctamente</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre, email o teléfono..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddClientDialog(true)}
                      className="whitespace-nowrap"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nuevo Cliente
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {isLoadingClients ? (
                      <p className="text-center py-4 text-muted-foreground">Cargando clientes...</p>
                    ) : filteredClients.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        {clientSearch ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                      </p>
                    ) : (
                      filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => selectClient(client)}
                        >
                          <h4 className="font-medium">{client.name}</h4>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
              {/* AI Project Description Input */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <Label className="text-purple-800 font-medium">
                    Descripción del Proyecto para IA
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Describe brevemente tu proyecto (ej: Instalación de cerca perimetral de 100 metros)"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceProjectWithAI('all')}
                    disabled={isAIProcessing || !projectDescription.trim()}
                    className="whitespace-nowrap bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isAIProcessing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Rellenar Todo con IA
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  💡 Describe tu proyecto y la IA completará automáticamente todos los campos profesionalmente
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="scope">Alcance del Trabajo</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceProjectWithAI('scope')}
                    disabled={isAIProcessing || !projectDescription.trim()}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Rellenar con IA
                  </Button>
                </div>
                <Textarea
                  id="scope"
                  placeholder="Describe el alcance completo del trabajo..."
                  value={estimate.scope}
                  onChange={(e) => setEstimate(prev => ({ ...prev, scope: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="timeline">Cronograma y Tiempo</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceProjectWithAI('timeline')}
                    disabled={isAIProcessing || !projectDescription.trim()}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Rellenar con IA
                  </Button>
                </div>
                <Textarea
                  id="timeline"
                  placeholder="Cronograma estimado para completar el proyecto..."
                  value={estimate.timeline}
                  onChange={(e) => setEstimate(prev => ({ ...prev, timeline: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="process">Proceso de Trabajo</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceProjectWithAI('process')}
                    disabled={isAIProcessing || !projectDescription.trim()}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Rellenar con IA
                  </Button>
                </div>
                <Textarea
                  id="process"
                  placeholder="Describe el proceso paso a paso del trabajo..."
                  value={estimate.process}
                  onChange={(e) => setEstimate(prev => ({ ...prev, process: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="includes">Incluye</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceProjectWithAI('includes')}
                    disabled={isAIProcessing || !projectDescription.trim()}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Rellenar con IA
                  </Button>
                </div>
                <Textarea
                  id="includes"
                  placeholder="Qué está incluido en el precio..."
                  value={estimate.includes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, includes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="excludes">No Incluye</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceProjectWithAI('excludes')}
                    disabled={isAIProcessing || !projectDescription.trim()}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Rellenar con IA
                  </Button>
                </div>
                <Textarea
                  id="excludes"
                  placeholder="Qué NO está incluido en el precio..."
                  value={estimate.excludes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, excludes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceProjectWithAI('notes')}
                    disabled={isAIProcessing || !projectDescription.trim()}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Rellenar con IA
                  </Button>
                </div>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionales, términos especiales, condiciones..."
                  value={estimate.notes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Materials Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Agregar Materiales ({estimate.items.length})
                </div>
                <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Material
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Seleccionar Material del Inventario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar materiales..."
                            value={materialSearch}
                            onChange={(e) => setMaterialSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowAddMaterialDialog(true)}
                          className="whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nuevo Material
                        </Button>
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
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No hay materiales agregados aún.</p>
                  <p>Haz clic en "Agregar Material" para comenzar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {estimate.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          ${item.price?.toFixed(2) || '0.00'} c/u
                        </p>
                        <p className="font-medium">
                          ${((item.price || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromEstimate(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total de Materiales:</span>
                      <span>${estimate.subtotal.toFixed(2)}</span>
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
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa del Estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!estimate.client ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Completa los pasos anteriores para ver la vista previa</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-muted/50 p-6 rounded-lg">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={generatePreview}
                      disabled={!estimate.client}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar Vista Previa
                    </Button>
                    <Button 
                      onClick={downloadPDF}
                      disabled={!estimate.client || !previewHtml}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar PDF
                    </Button>
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Wizard de creación de estimados profesionales</h1>
        <p className="text-muted-foreground">The AI Force Crafting the Future Skyline</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
              ${index <= currentStep ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'}
            `}>
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            <span className={`ml-2 text-sm font-medium ${index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.title}
            </span>
            {index < STEPS.length - 1 && (
              <div className={`mx-4 h-px w-12 ${index < currentStep ? 'bg-primary' : 'bg-muted-foreground'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <Button
          onClick={() => {
            if (currentStep === STEPS.length - 1) {
              // Handle final step completion
              toast({
                title: "Estimado completado",
                description: "Tu estimado ha sido generado exitosamente"
              });
            } else {
              setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1));
            }
          }}
          disabled={!canProceedToNextStep()}
        >
          {currentStep === STEPS.length - 1 ? 'Completar' : 'Siguiente'}
          {currentStep !== STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <AddClientForm 
            onClientAdded={(newClient) => {
              setClients(prev => [...prev, newClient]);
              setEstimate(prev => ({ ...prev, client: newClient }));
              setShowAddClientDialog(false);
              toast({
                title: "Cliente agregado",
                description: `${newClient.name} ha sido agregado exitosamente`
              });
            }}
            onCancel={() => setShowAddClientDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Material</DialogTitle>
          </DialogHeader>
          <AddMaterialForm 
            onMaterialAdded={(newMaterial) => {
              setMaterials(prev => [...prev, newMaterial]);
              setShowAddMaterialDialog(false);
              toast({
                title: "Material agregado",
                description: `${newMaterial.name} ha sido agregado al inventario`
              });
            }}
            onCancel={() => setShowAddMaterialDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
