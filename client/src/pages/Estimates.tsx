import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MervinAssistant } from '@/components/ui/mervin-assistant';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  PlusCircle, 
  Trash2, 
  ArrowRight, 
  FileDown, 
  Mail, 
  CalendarCheck, 
  Search, 
  RotateCcw, 
  DollarSign,
  MoveVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getClients, Client as FirebaseClient } from '../lib/clientFirebase';

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
}

interface Material {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  supplier?: string;
  sku?: string;
  stock?: number;
}

interface EstimateItem {
  id: string;
  materialId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  total: number;
}

interface Estimate {
  id?: string;
  title: string;
  clientId: string;
  client: Client | null;
  items: EstimateItem[];
  subtotal: number;
  total: number;
  notes: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export default function Estimates() {
  // Set English as the default language
  const defaultLanguage = 'en';
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { profile } = useProfile();
  
  // States for clients
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchClientTerm, setSearchClientTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientSearchDialog, setShowClientSearchDialog] = useState(false);
  
  // States for materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchMaterialTerm, setSearchMaterialTerm] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [showMaterialSearchDialog, setShowMaterialSearchDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    name: '',
    category: '',
    description: '',
    unit: 'pieza',
    price: 0
  });
  
  // States for the estimate
  const [estimate, setEstimate] = useState<Estimate>({
    title: 'New Estimate',
    clientId: '',
    client: null,
    items: [],
    subtotal: 0,
    total: 0,
    notes: '',
    status: 'draft'
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Additional states
  const [tempQuantity, setTempQuantity] = useState<number>(1);
  const [tempSelectedMaterial, setTempSelectedMaterial] = useState<Material | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [editableHtml, setEditableHtml] = useState<string | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // Load clients and materials when component mounts
  useEffect(() => {
    if (!currentUser) return;
    
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load clients
        const clientsData = await getClients();
        // Convert Firebase clients to our Client interface
        const mappedClients: Client[] = clientsData.map(client => ({
          id: client.id,
          clientId: client.clientId,
          name: client.name,
          email: client.email,
          phone: client.phone,
          mobilePhone: client.mobilePhone,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode
        }));
        setClients(mappedClients);
        
        // Load materials
        const materialsRef = collection(db, 'materials');
        const q = query(materialsRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const materialsData: Material[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Material, 'id'>;
          materialsData.push({
            id: doc.id,
            ...data,
            price: typeof data.price === 'number' ? data.price : 0
          } as Material);
        });
        
        setMaterials(materialsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos necesarios.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, toast]);
  
  // Calculate total when items change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    // You can add tax calculation here if needed
    setEstimate(prev => ({
      ...prev,
      subtotal,
      total: subtotal
    }));
  }, [estimate.items]);
  
  // Filter clients when search term changes
  useEffect(() => {
    if (searchClientTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchClientTerm.toLowerCase();
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(term) || 
        client.email?.toLowerCase().includes(term) || 
        client.phone?.includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchClientTerm, clients]);
  
  // Filter materials when search term changes
  useEffect(() => {
    if (searchMaterialTerm.trim() === '') {
      setFilteredMaterials(materials);
    } else {
      const term = searchMaterialTerm.toLowerCase();
      const filtered = materials.filter(material => 
        material.name.toLowerCase().includes(term) || 
        material.description?.toLowerCase().includes(term) || 
        material.category.toLowerCase().includes(term)
      );
      setFilteredMaterials(filtered);
    }
  }, [searchMaterialTerm, materials]);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };
  
  // Select client
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setEstimate(prev => ({
      ...prev,
      clientId: client.id,
      client
    }));
    setShowClientSearchDialog(false);
  };
  
  // Add material to estimate
  const handleAddItemToEstimate = () => {
    if (!tempSelectedMaterial) return;
    
    const newItem: EstimateItem = {
      id: `item_${Date.now()}`,
      materialId: tempSelectedMaterial.id,
      name: tempSelectedMaterial.name,
      description: tempSelectedMaterial.description || "",
      price: tempSelectedMaterial.price,
      quantity: tempQuantity,
      unit: tempSelectedMaterial.unit,
      total: tempSelectedMaterial.price * tempQuantity
    };
    
    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    setTempSelectedMaterial(null);
    setTempQuantity(1);
    setShowMaterialSearchDialog(false);
  };
  
  // Remove item from estimate
  const handleRemoveItem = (id: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };
  
  // Update item quantity
  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return;
    
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          return {
            ...item,
            quantity,
            total: item.price * quantity
          };
        }
        return item;
      })
    }));
  };
  
  // Move item up or down in the list
  const moveItem = (id: string, direction: 'up' | 'down') => {
    const itemIndex = estimate.items.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    
    const newItems = [...estimate.items];
    
    if (direction === 'up' && itemIndex > 0) {
      // Swap with the item above
      [newItems[itemIndex], newItems[itemIndex - 1]] = [newItems[itemIndex - 1], newItems[itemIndex]];
    } else if (direction === 'down' && itemIndex < newItems.length - 1) {
      // Swap with the item below
      [newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]];
    }
    
    setEstimate(prev => ({
      ...prev,
      items: newItems
    }));
  };
  
  // Save new material
  const handleSaveMaterial = async () => {
    if (!currentUser) return;
    
    if (!newMaterial.name || !newMaterial.category || !newMaterial.unit) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor, completa los campos obligatorios: Nombre, Categoría y Unidad.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const materialData = {
        ...newMaterial,
        price: typeof newMaterial.price === 'number' ? newMaterial.price : 0,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'materials'), materialData);
      
      const newMaterialWithId: Material = {
        id: docRef.id,
        ...materialData,
        price: materialData.price as number
      } as Material;
      
      setMaterials(prev => [...prev, newMaterialWithId]);
      
      // Use the new material as the selected material
      setTempSelectedMaterial(newMaterialWithId);
      
      // Reset the form
      setNewMaterial({
        name: '',
        category: '',
        description: '',
        unit: 'pieza',
        price: 0
      });
      
      setShowAddMaterialDialog(false);
      
      toast({
        title: 'Material agregado',
        description: `Se ha agregado el material "${newMaterial.name}" correctamente.`
      });
    } catch (error) {
      console.error('Error al guardar material:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar el material. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
    }
  };
  
  // Generate and save the estimate
  const handleSaveEstimate = async () => {
    if (!currentUser || !estimate.client) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor, selecciona un cliente antes de guardar.',
        variant: 'destructive'
      });
      return;
    }
    
    if (estimate.items.length === 0) {
      toast({
        title: 'Sin materiales',
        description: 'Por favor, agrega al menos un material al estimado.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // En este punto sabemos que estimate.client no es null
      const client = estimate.client;
      
      // Primero, vamos a generar el HTML del estimado usando la misma lógica 
      // que usamos para la vista previa
      const estimateHtml = `
      <style>
        .estimate-preview {
          font-family: 'Arial', sans-serif;
          color: #333;
          max-width: 100%;
          margin: 0 auto;
        }
        
        .estimate-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .company-info h1 {
          margin: 0 0 10px 0;
          color: #1e3a8a;
          font-size: 24px;
        }
        
        .company-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .estimate-title {
          text-align: right;
        }
        
        .estimate-title h2 {
          margin: 0 0 10px 0;
          color: #1e3a8a;
          font-size: 28px;
        }
        
        .estimate-title p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .section {
          margin-bottom: 25px;
        }
        
        .section h3 {
          margin: 0 0 15px 0;
          color: #1e3a8a;
          font-size: 18px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        
        .section p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .grid-item strong {
          display: inline-block;
          min-width: 100px;
          color: #555;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        th {
          text-align: left;
          padding: 10px;
          background-color: #f4f4f8;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }
        
        td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .summary {
          margin-top: 20px;
          text-align: right;
        }
        
        .summary-item {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .total {
          font-size: 18px;
          font-weight: bold;
          color: #1e3a8a;
          margin-top: 10px;
        }
        
        .notes {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        
        .estimate-footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
      
      <div class="estimate-preview">
        <div class="estimate-header">
          <div class="company-info">
            <h1>${profile?.companyName || 'Owl Fence'}</h1>
            <p>${profile?.address || '123 Fence Avenue'}, ${profile?.city || 'San Diego'}, ${profile?.state || 'CA'} ${profile?.zipCode || '92101'}</p>
            <p>${profile?.email || 'info@owlfence.com'} | ${profile?.phone || profile?.mobilePhone || '(555) 123-4567'}</p>
            <p>${profile?.website || 'www.owlfence.com'}</p>
          </div>
          <div class="estimate-title">
            <h2>ESTIMADO</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Estimado #:</strong> EST-${Date.now().toString().slice(-6)}</p>
            <p><strong>Válido hasta:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>Cliente</h3>
          <div class="grid-container">
            <div class="grid-item">
              <p><strong>Nombre:</strong> ${client.name}</p>
              <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
              <p><strong>Teléfono:</strong> ${client.phone || 'N/A'}</p>
            </div>
            <div class="grid-item">
              <p><strong>Dirección:</strong> ${client.address || 'N/A'}</p>
              <p><strong>Ciudad:</strong> ${client.city || 'N/A'}</p>
              <p><strong>Estado/CP:</strong> ${client.state || 'N/A'} ${client.zipCode ? ', ' + client.zipCode : ''}</p>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Detalles y Descripción del Proyecto</h3>
          <p>${estimate.notes || 'Sin descripción detallada del proyecto.'}</p>
        </div>
        
        <div class="section">
          <h3>Materiales y Servicios</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40%">Descripción</th>
                <th style="width: 15%">Cantidad</th>
                <th style="width: 15%">Unidad</th>
                <th style="width: 15%">Precio</th>
                <th style="width: 15%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.items.map(item => `
                <tr>
                  <td>${item.name}${item.description ? `<br><span style="color: #666; font-size: 12px;">${item.description}</span>` : ''}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-item">
              <strong>Subtotal:</strong>
              <span>${formatCurrency(estimate.subtotal)}</span>
            </div>
            <div class="summary-item total">
              <strong>Total:</strong>
              <span>${formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </div>
        
        <div class="estimate-footer">
          <p>Este estimado es válido por 30 días a partir de la fecha de emisión. Precios sujetos a cambios después de este período.</p>
          <p>Para aprobar este estimado, por favor contáctenos por teléfono o email para programar el inicio del proyecto.</p>
        </div>
      </div>
      `;
      
      // Preparar los datos del estimado para guardar
      const estimateData = {
        title: estimate.title,
        clientId: estimate.clientId,
        clientName: client.name,
        clientEmail: client.email || '',
        clientPhone: client.phone || '',
        clientAddress: client.address || '',
        items: estimate.items,
        subtotal: estimate.subtotal,
        total: estimate.total,
        notes: estimate.notes,
        status: estimate.status,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        estimateHtml: estimateHtml // Guardamos el HTML del estimado
      };
      
      // Guardar el estimado en la colección de estimates
      const estimateDocRef = await addDoc(collection(db, 'estimates'), estimateData);
      
      // Crear o actualizar el proyecto relacionado con este estimado
      const projectData = {
        projectId: `EST-${Date.now().toString().slice(-6)}`,
        clientName: client.name,
        clientEmail: client.email || '',
        clientPhone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
        estimateHtml: estimateHtml,
        totalPrice: estimate.total,
        status: 'draft',
        projectProgress: 'estimate_created',
        projectType: 'Residencial', // Valor por defecto, se podría personalizar
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: currentUser.uid,
        estimateId: estimateDocRef.id, // Referencia al estimado creado
        clientNotes: estimate.notes || ''
      };
      
      // Guardar el proyecto en la colección de projects
      await addDoc(collection(db, 'projects'), projectData);
      
      toast({
        title: 'Estimado guardado',
        description: 'El estimado se ha guardado correctamente y está disponible en Proyectos.'
      });
      
      // Reset the form
      setEstimate({
        title: 'Nuevo Estimado',
        clientId: '',
        client: null,
        items: [],
        subtotal: 0,
        total: 0,
        notes: '',
        status: 'draft'
      });
      setSelectedClient(null);
    } catch (error) {
      console.error('Error al guardar estimado:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar el estimado. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Generate Preview
  const handleGeneratePreview = async () => {
    if (!estimate.client) {
      toast({
        title: 'Incomplete Data',
        description: 'Please select a client before generating the preview.',
        variant: 'destructive'
      });
      return;
    }
    
    if (estimate.items.length === 0) {
      toast({
        title: 'No Materials',
        description: 'Please add at least one material to the estimate.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsEditingPreview(false); // Aseguramos que comenzamos en modo vista
    
    // En este punto sabemos que estimate.client no es null
    const client = estimate.client;
    
    // In a real app, you would call an API to generate the HTML
    // For this example, we'll create a better styled HTML template
    const html = `
      <style>
        .estimate-preview {
          font-family: 'Arial', sans-serif;
          color: #333;
          max-width: 100%;
          margin: 0 auto;
        }
        
        .estimate-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .company-info h1 {
          margin: 0 0 10px 0;
          color: #1e3a8a;
          font-size: 24px;
        }
        
        .company-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .estimate-title {
          text-align: right;
        }
        
        .estimate-title h2 {
          margin: 0 0 10px 0;
          color: #1e3a8a;
          font-size: 28px;
        }
        
        .estimate-title p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .section {
          margin-bottom: 25px;
        }
        
        .section h3 {
          margin: 0 0 15px 0;
          color: #1e3a8a;
          font-size: 18px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        
        .section p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .grid-item strong {
          display: inline-block;
          min-width: 100px;
          color: #555;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        th {
          text-align: left;
          padding: 10px;
          background-color: #f4f4f8;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }
        
        td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .summary {
          margin-top: 20px;
          text-align: right;
        }
        
        .summary-item {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .total {
          font-size: 18px;
          font-weight: bold;
          color: #1e3a8a;
          margin-top: 10px;
        }
        
        .notes {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        
        .estimate-footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
      
      <div class="estimate-preview">
        <div class="estimate-header">
          <div class="company-info">
            <h1>${profile?.companyName || 'Owl Fence'}</h1>
            <p>${profile?.address || '123 Fence Avenue'}, ${profile?.city || 'San Diego'}, ${profile?.state || 'CA'} ${profile?.zipCode || '92101'}</p>
            <p>${profile?.email || 'info@owlfence.com'} | ${profile?.phone || profile?.mobilePhone || '(555) 123-4567'}</p>
            <p>${profile?.website || 'www.owlfence.com'}</p>
          </div>
          <div class="estimate-title">
            <h2>ESTIMADO</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Estimado #:</strong> EST-${Date.now().toString().slice(-6)}</p>
            <p><strong>Válido hasta:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>Cliente</h3>
          <div class="grid-container">
            <div class="grid-item">
              <p><strong>Nombre:</strong> ${client.name}</p>
              <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
              <p><strong>Teléfono:</strong> ${client.phone || 'N/A'}</p>
            </div>
            <div class="grid-item">
              <p><strong>Dirección:</strong> ${client.address || 'N/A'}</p>
              <p><strong>Ciudad:</strong> ${client.city || 'N/A'}</p>
              <p><strong>Estado/CP:</strong> ${client.state || 'N/A'} ${client.zipCode ? ', ' + client.zipCode : ''}</p>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Detalles y Descripción del Proyecto</h3>
          <p>${estimate.notes || 'Sin descripción detallada del proyecto.'}</p>
        </div>
        
        <div class="section">
          <h3>Materiales y Servicios</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40%">Descripción</th>
                <th style="width: 15%">Cantidad</th>
                <th style="width: 15%">Unidad</th>
                <th style="width: 15%">Precio</th>
                <th style="width: 15%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.items.map(item => `
                <tr>
                  <td>${item.name}${item.description ? `<br><span style="color: #666; font-size: 12px;">${item.description}</span>` : ''}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-item">
              <strong>Subtotal:</strong>
              <span>${formatCurrency(estimate.subtotal)}</span>
            </div>
            <div class="summary-item total">
              <strong>Total:</strong>
              <span>${formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </div>
        
        <div class="estimate-footer">
          <p>Este estimado es válido por 30 días a partir de la fecha de emisión. Precios sujetos a cambios después de este período.</p>
          <p>Para aprobar este estimado, por favor contáctenos por teléfono o email para programar el inicio del proyecto.</p>
        </div>
      </div>
    `;
    
    setPreviewHtml(html);
    setShowPreviewDialog(true);
  };
  
  // Handle send email
  const handleSendEmail = () => {
    if (!estimate.client || !estimate.client.email) {
      toast({
        title: 'Sin correo electrónico',
        description: 'El cliente no tiene un correo electrónico registrado.',
        variant: 'destructive'
      });
      return;
    }
    
    const clientEmail = estimate.client.email;
    
    setIsSendingEmail(true);
    
    // In a real app, you would call an API to send the email
    // For this example, we'll just show a success message after a delay
    setTimeout(() => {
      toast({
        title: 'Email enviado',
        description: `El estimado se ha enviado correctamente a ${clientEmail}.`
      });
      setIsSendingEmail(false);
    }, 1500);
  };
  
  // Handle download PDF
  const handleDownloadPdf = async () => {
    try {
      if (!previewHtml) {
        // Si no hay HTML de vista previa, generarlo primero
        await handleGeneratePreview();
        if (!previewHtml) {
          return; // Si aún no hay HTML, handleGeneratePreview ya mostró un toast de error
        }
      }
      
      toast({
        title: 'Descarga iniciada',
        description: 'El PDF del estimado se está generando.'
      });
      
      console.log('Preparando descarga de PDF...');
      
      // Importar la función de generación client-side de PDF
      const { generateClientSidePDF } = await import('../lib/pdf');
      
      // Generar un nombre de archivo para el PDF
      const fileName = `Estimado-${estimate.client?.name?.replace(/\s+/g, '-') || 'Sin-Cliente'}-${Date.now()}`;
      
      console.log('Generando PDF en el navegador...');
      
      // Llamar a la función para generar y descargar el PDF en el cliente
      await generateClientSidePDF(previewHtml, fileName);
      
      toast({
        title: 'PDF generado',
        description: 'El PDF del estimado se ha descargado correctamente.'
      });
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el PDF. ' + (error instanceof Error ? error.message : 'Por favor, inténtalo de nuevo.'),
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Nuevo Estimado</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Estimate Information */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Información del Estimado</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="estimate-title" className="text-xs">Título</Label>
                <Input 
                  id="estimate-title" 
                  value={estimate.title} 
                  onChange={(e) => setEstimate(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título del estimado"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  disabled
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Contractor Information */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Información del Contratista</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 gap-1">
              <h3 className="font-medium text-sm">{profile?.companyName || "Owl Fence"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Email:</span> {profile?.email || "info@owlfence.com"}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Teléfono:</span> {profile?.phone || profile?.mobilePhone || "(555) 123-4567"}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Dirección:</span> {profile?.address || "123 Fence Avenue"}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Website:</span> {profile?.website || "www.owlfence.com"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Client Information */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Client Information</span>
              <Button variant="ghost" size="sm" onClick={() => setShowClientSearchDialog(true)} className="h-8">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {estimate.client ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mb-3">
                  <h3 className="font-medium text-sm md:col-span-2 mb-1">{estimate.client.name}</h3>
                  {estimate.client.email && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Email:</span> {estimate.client.email}
                    </p>
                  )}
                  {estimate.client.phone && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Teléfono:</span> {estimate.client.phone}
                    </p>
                  )}
                  {estimate.client.address && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Dirección:</span> {estimate.client.address}
                    </p>
                  )}
                  {estimate.client.city && estimate.client.state && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Ciudad/Estado:</span> {estimate.client.city}, {estimate.client.state} {estimate.client.zipCode || ''}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowClientSearchDialog(true)} className="h-7 text-xs px-2">
                  Cambiar cliente
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="mb-2 text-muted-foreground text-sm">No hay un cliente seleccionado</p>
                <Button onClick={() => setShowClientSearchDialog(true)} size="sm">
                  <Search className="h-4 w-4 mr-1" />
                  Seleccionar cliente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Project details and description */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Detalles y Descripción del Proyecto</span>
              <MervinAssistant 
                originalText={estimate.notes}
                onTextEnhanced={(enhancedText) => setEstimate(prev => ({ ...prev, notes: enhancedText }))}
                className="ml-2"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div>
              <Textarea 
                id="estimate-notes" 
                value={estimate.notes} 
                onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Descripción detallada del proyecto y notas adicionales para el cliente"
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Materials List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Materials and Services</span>
              <Button size="sm" onClick={() => setShowMaterialSearchDialog(true)} className="h-8">
                <PlusCircle className="h-4 w-4 mr-1" />
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {estimate.items.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: 45 }} className="px-1"></TableHead>
                      <TableHead className="px-2">Nombre</TableHead>
                      <TableHead className="px-2 whitespace-nowrap">Unidad</TableHead>
                      <TableHead className="px-2 whitespace-nowrap">Precio</TableHead>
                      <TableHead className="px-2 whitespace-nowrap">Cant.</TableHead>
                      <TableHead className="px-2 whitespace-nowrap">Total</TableHead>
                      <TableHead style={{ width: 40 }} className="px-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimate.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="align-middle p-1">
                          <div className="flex">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => moveItem(item.id, "up")}
                                    className="h-5 w-5"
                                  >
                                    <MoveVertical className="h-3 w-3 rotate-180" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>Mover arriba</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => moveItem(item.id, "down")}
                                    className="h-5 w-5 -ml-1"
                                  >
                                    <MoveVertical className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>Mover abajo</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 font-medium">
                          {item.name}
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{item.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="p-2">{item.unit}</TableCell>
                        <TableCell className="p-2">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="p-2">
                          <Input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                            min={1}
                            className="w-16 h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-2 font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="p-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-5 w-5"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="mb-2 text-muted-foreground text-sm">No materials added</p>
                <Button onClick={() => setShowMaterialSearchDialog(true)} size="sm">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Material
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex-1 mb-3 md:mb-0">
                <p className="text-sm mb-1">
                  <span className="font-medium">Subtotal:</span> {formatCurrency(estimate.subtotal)}
                </p>
                <p className="text-lg font-bold">
                  <span>Total:</span> {formatCurrency(estimate.total)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleGeneratePreview}
                  disabled={!estimate.client || estimate.items.length === 0}
                  size="sm"
                  className="h-9"
                >
                  <ArrowRight className="mr-1 h-4 w-4" />
                  Preview
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleDownloadPdf}
                  disabled={estimate.items.length === 0 || !estimate.client}
                  size="sm"
                  className="h-9"
                >
                  <FileDown className="mr-1 h-4 w-4" />
                  PDF
                </Button>
                
                <Button 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || estimate.items.length === 0 || !estimate.client || !estimate.client.email}
                  size="sm"
                  className="h-9"
                >
                  {isSendingEmail ? (
                    <>
                      <RotateCcw className="mr-1 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-1 h-4 w-4" />
                      Email
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleSaveEstimate} 
                  disabled={isSaving || !estimate.client || estimate.items.length === 0}
                  size="sm"
                  className="h-9"
                >
                  {isSaving ? (
                    <>
                      <RotateCcw className="mr-1 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="mr-1 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Client Search Dialog */}
      <Dialog open={showClientSearchDialog} onOpenChange={setShowClientSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Select Client</DialogTitle>
            <DialogDescription className="text-sm">
              Search and select a client for the estimate.
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Input
              placeholder="Search by name, email or phone..."
              value={searchClientTerm}
              onChange={(e) => setSearchClientTerm(e.target.value)}
              className="mb-3"
            />
            
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {filteredClients.length > 0 ? (
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2">Name</TableHead>
                      <TableHead className="py-2">Email</TableHead>
                      <TableHead className="py-2">Phone</TableHead>
                      <TableHead className="py-2 w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="py-1.5 font-medium">{client.name}</TableCell>
                        <TableCell className="py-1.5">{client.email || '-'}</TableCell>
                        <TableCell className="py-1.5">{client.phone || '-'}</TableCell>
                        <TableCell className="py-1.5">
                          <Button 
                            size="sm" 
                            onClick={() => handleSelectClient(client)}
                            className="h-7 text-xs px-2"
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowClientSearchDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Material Search Dialog */}
      <Dialog open={showMaterialSearchDialog} onOpenChange={setShowMaterialSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Select Material</DialogTitle>
            <DialogDescription className="text-sm">
              Search for an existing material or add a new one.
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <div className="flex justify-between items-center mb-3">
              <Input
                placeholder="Search materials..."
                value={searchMaterialTerm}
                onChange={(e) => setSearchMaterialTerm(e.target.value)}
                className="flex-1 mr-2"
              />
              <Button 
                size="sm" 
                onClick={() => {
                  setShowAddMaterialDialog(true);
                  setShowMaterialSearchDialog(false);
                }}
                className="h-9"
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto border rounded-md mb-4">
              {filteredMaterials.length > 0 ? (
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2">Nombre</TableHead>
                      <TableHead className="py-2">Categoría</TableHead>
                      <TableHead className="py-2">Precio</TableHead>
                      <TableHead className="py-2 w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map(material => (
                      <TableRow key={material.id}>
                        <TableCell className="py-1.5 font-medium">
                          {material.name}
                          {material.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {material.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">{material.category}</TableCell>
                        <TableCell className="py-1.5">{formatCurrency(material.price)}</TableCell>
                        <TableCell className="py-1.5">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setTempSelectedMaterial(material);
                            }}
                            className="h-7 text-xs px-2"
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No se encontraron materiales</p>
                </div>
              )}
            </div>
          </div>
          
          {tempSelectedMaterial && (
            <div className="bg-muted p-3 rounded-md mb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                  <h3 className="font-medium text-sm">{tempSelectedMaterial.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {tempSelectedMaterial.description || 'No description'}
                  </p>
                  <p className="text-xs mt-1">
                    <span className="font-medium">Price:</span> {formatCurrency(tempSelectedMaterial.price)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="quantity" className="whitespace-nowrap text-xs">Quantity:</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(Number(e.target.value))}
                    min={1}
                    className="w-20 h-8 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Total: {formatCurrency(tempSelectedMaterial.price * tempQuantity)}</p>
                </div>
                <Button 
                  size="sm"
                  onClick={handleAddItemToEstimate}
                  className="h-8"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowMaterialSearchDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Material Dialog */}
      <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Nuevo Material</DialogTitle>
            <DialogDescription className="text-sm">
              Agrega un nuevo material a tu inventario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="material-name" className="text-xs">Nombre*</Label>
              <Input 
                id="material-name" 
                value={newMaterial.name} 
                onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del material"
                required
                className="h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="material-category" className="text-xs">Categoría*</Label>
              <Input 
                id="material-category" 
                value={newMaterial.category} 
                onChange={(e) => setNewMaterial(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Categoría del material"
                required
                className="h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="material-description" className="text-xs">Descripción</Label>
              <Textarea 
                id="material-description" 
                value={newMaterial.description} 
                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción detallada"
                className="text-sm resize-none"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="material-price" className="text-xs">Precio*</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Input 
                    id="material-price" 
                    type="number"
                    value={newMaterial.price} 
                    onChange={(e) => setNewMaterial(prev => ({ ...prev, price: Number(e.target.value) }))}
                    min={0}
                    step={0.01}
                    className="pl-9 h-9"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="material-unit" className="text-xs">Unidad*</Label>
                <Select 
                  value={newMaterial.unit} 
                  onValueChange={(value: string) => setNewMaterial(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger id="material-unit" className="h-9">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieza">Pieza</SelectItem>
                    <SelectItem value="metro">Metro</SelectItem>
                    <SelectItem value="metro2">Metro²</SelectItem>
                    <SelectItem value="metro3">Metro³</SelectItem>
                    <SelectItem value="kg">Kilogramo</SelectItem>
                    <SelectItem value="galón">Galón</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                    <SelectItem value="bolsa">Bolsa</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="juego">Juego</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddMaterialDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveMaterial}>
              Save Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col">
          <DialogHeader className="pb-3 shrink-0">
            <DialogTitle className="text-lg">Estimate Preview</DialogTitle>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto mb-4">
            {isEditingPreview ? (
              <div className="border rounded-md bg-white">
                <textarea 
                  className="w-full h-full min-h-[500px] p-4 font-sans text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editableHtml || ""}
                  onChange={(e) => setEditableHtml(e.target.value)}
                  style={{ fontFamily: 'Arial, sans-serif' }}
                />
              </div>
            ) : (
              previewHtml && (
                <div 
                  className="estimate-preview border rounded-md p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: previewHtml as string }}
                />
              )
            )}
          </div>
          
          <DialogFooter className="pt-3 mt-auto shrink-0 border-t">
            <div className="flex items-center mr-auto">
              <Button 
                variant={isEditingPreview ? "default" : "outline"} 
                size="sm" 
                onClick={() => {
                  if (isEditingPreview) {
                    // Guardar cambios y salir del modo edición
                    // Creamos una versión HTML básica con el texto editado
                    const formattedHtml = `
                      <div class="estimate-preview">
                        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
                          ${editableHtml?.split('\n').map(line => `<p>${line}</p>`).join('') || ''}
                        </div>
                      </div>
                    `;
                    setPreviewHtml(formattedHtml);
                    setIsEditingPreview(false);
                  } else {
                    // Entrar en modo edición
                    // Extraemos el texto del HTML, preservando los saltos de línea
                    const plainText = previewHtml?.replace(/<p[^>]*>/gi, '')
                                                 .replace(/<\/p>/gi, '\n')
                                                 .replace(/<br\s*\/?>/gi, '\n')
                                                 .replace(/<[^>]*>/g, '')
                                                 .replace(/&nbsp;/g, ' ')
                                                 .replace(/&amp;/g, '&')
                                                 .replace(/&lt;/g, '<')
                                                 .replace(/&gt;/g, '>')
                                                 .replace(/&quot;/g, '"')
                                                 .trim() || "";
                    setEditableHtml(plainText);
                    setIsEditingPreview(true);
                  }
                }}
              >
                {isEditingPreview ? "Save Changes" : "Edit Text"}
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsEditingPreview(false);
                setShowPreviewDialog(false);
              }}
            >
              Close
            </Button>
            <Button 
              size="sm" 
              onClick={handleDownloadPdf}
              disabled={isEditingPreview}
            >
              <FileDown className="mr-1 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}