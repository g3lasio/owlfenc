import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/use-profile';
import { Link } from 'wouter';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  MoveVertical,
  Edit,
  Save,
  X
} from 'lucide-react';

// Services and Context
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
            <p><strong>Estimado #:</strong> EST-${Date.now().toString().slice(-8)}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>Cliente</h3>
          <div class="grid-container">
            <div class="grid-item">
              <p><strong>Nombre:</strong> ${client.name}</p>
              ${client.email ? `<p><strong>Email:</strong> ${client.email}</p>` : ''}
            </div>
            <div class="grid-item">
              ${client.phone ? `<p><strong>Teléfono:</strong> ${client.phone}</p>` : ''}
              ${client.address ? `<p><strong>Dirección:</strong> ${client.address}, ${client.city || ''}, ${client.state || ''} ${client.zipCode || ''}</p>` : ''}
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Materiales y Servicios</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Descripción</th>
                <th style="width: 15%;">Precio</th>
                <th style="width: 15%;">Cantidad</th>
                <th style="width: 15%;">Unidad</th>
                <th style="width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.items.map(item => `
                <tr>
                  <td>
                    <strong>${item.name}</strong>
                    ${item.description ? `<br><span style="font-size: 12px; color: #555;">${item.description}</span>` : ''}
                  </td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="summary">
          <div class="summary-item">
            <strong>Subtotal:</strong> ${formatCurrency(estimate.subtotal)}
          </div>
          <div class="total">
            <strong>Total:</strong> ${formatCurrency(estimate.total)}
          </div>
        </div>
        
        ${estimate.notes ? `
          <div class="notes">
            <h3>Notas:</h3>
            <p>${estimate.notes.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}
        
        <div class="estimate-footer">
          <p>Este estimado es válido por 30 días a partir de la fecha de emisión. Precios sujetos a cambios después de este período.</p>
          <p>Para aprobar este estimado, por favor contáctenos por teléfono o email para programar el inicio del proyecto.</p>
        </div>
      </div>
      `;
      
      // Ahora guardamos el estimado en Firestore
      const estimateToSave = {
        ...estimate,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        html: estimateHtml // Guardamos el HTML generado
      };
      
      // Eliminamos el ID de client para evitar problemas con Firestore
      delete estimateToSave.client;
      
      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'estimates'), estimateToSave);
      
      toast({
        title: 'Estimado guardado',
        description: 'El estimado se ha guardado correctamente.'
      });
      
      // Reiniciar el formulario
      setEstimate({
        title: 'New Estimate',
        clientId: '',
        client: null,
        items: [],
        subtotal: 0,
        total: 0,
        notes: '',
        status: 'draft'
      });
      
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
        title: 'Cliente requerido',
        description: 'Please select a client before generating the preview.',
        variant: 'destructive'
      });
      return;
    }
    
    if (estimate.items.length === 0) {
      toast({
        title: 'Sin materiales',
        description: 'Please add at least one material to the estimate.',
        variant: 'destructive'
      });
      return;
    }
    
    console.log('Generando preview del estimado...');
    
    // Determine logo URL
    let logoUrl = '/owl-logo.png'; // Default logo
    
    // Use company logo if available
    if (profile?.logo) {
      console.log('Usando logo del perfil de la empresa:', profile.logo);
      logoUrl = profile.logo;
    }
    
    console.log('Preparando plantilla HTML con logo...');
    
    // Generate HTML
    const html = `
      <style>
        .estimate-preview {
          font-family: 'Arial', sans-serif;
          color: #333;
          max-width: 100%;
          margin: 0 auto;
        }
        
        .company-logo {
          max-width: 200px;
          max-height: 80px;
          margin-bottom: 10px;
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
            <img src="${logoUrl}" alt="Logo" class="company-logo" crossorigin="anonymous" onerror="this.style.display='none'; console.error('Error cargando logo en preview');" />
            <h1>${profile?.companyName || 'Owl Fence'}</h1>
            <p>${profile?.address || '123 Fence Avenue'}, ${profile?.city || 'San Diego'}, ${profile?.state || 'CA'} ${profile?.zipCode || '92101'}</p>
            <p>${profile?.email || 'info@owlfence.com'} | ${profile?.phone || profile?.mobilePhone || '(555) 123-4567'}</p>
            <p>${profile?.website || 'www.owlfence.com'}</p>
          </div>
          <div class="estimate-title">
            <h2>ESTIMADO</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Estimado #:</strong> EST-${Date.now().toString().slice(-8)}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>Cliente</h3>
          <div class="grid-container">
            <div class="grid-item">
              <p><strong>Nombre:</strong> ${estimate.client.name}</p>
              ${estimate.client.email ? `<p><strong>Email:</strong> ${estimate.client.email}</p>` : ''}
            </div>
            <div class="grid-item">
              ${estimate.client.phone ? `<p><strong>Teléfono:</strong> ${estimate.client.phone}</p>` : ''}
              ${estimate.client.address ? `<p><strong>Dirección:</strong> ${estimate.client.address}, ${estimate.client.city || ''}, ${estimate.client.state || ''} ${estimate.client.zipCode || ''}</p>` : ''}
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Materiales y Servicios</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Descripción</th>
                <th style="width: 15%;">Precio</th>
                <th style="width: 15%;">Cantidad</th>
                <th style="width: 15%;">Unidad</th>
                <th style="width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.items.map(item => `
                <tr>
                  <td>
                    <strong>${item.name}</strong>
                    ${item.description ? `<br><span style="font-size: 12px; color: #555;">${item.description}</span>` : ''}
                  </td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="summary">
          <div class="summary-item">
            <strong>Subtotal:</strong> ${formatCurrency(estimate.subtotal)}
          </div>
          <div class="total">
            <strong>Total:</strong> ${formatCurrency(estimate.total)}
          </div>
        </div>
        
        ${estimate.notes ? `
          <div class="notes">
            <h3>Notas:</h3>
            <p>${estimate.notes.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}
        
        <div class="estimate-footer">
          <p>Este estimado es válido por 30 días a partir de la fecha de emisión. Precios sujetos a cambios después de este período.</p>
          <p>Para aprobar este estimado, por favor contáctenos por teléfono o email para programar el inicio del proyecto.</p>
        </div>
      </div>
    `;
    
    console.log('HTML para preview generado correctamente');
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
      if (isEditingPreview) {
        toast({
          title: 'Guardar cambios',
          description: 'Por favor, guarde los cambios antes de descargar el PDF.',
        });
        return;
      }
      
      if (!previewHtml) {
        console.log('No hay HTML de vista previa, generando primero...');
        // Si no hay HTML de vista previa, generarlo primero sin mostrar el diálogo
        // Esto ejecutará handleGeneratePreview internamente
        await handleGeneratePreview();
        
        // Cerramos el diálogo ya que solo queremos el HTML, no mostrar el preview
        setShowPreviewDialog(false);
        
        if (!previewHtml) {
          console.error('No se pudo generar el HTML para el PDF después de intentar');
          toast({
            title: 'Error en la Generación',
            description: 'No se pudo generar el contenido del PDF. Por favor intente nuevamente.',
            variant: 'destructive'
          });
          return;
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
      
      // Si estamos en modo de edición, asegurarnos de formatear correctamente el HTML
      let finalHtml = previewHtml;
      
      // Asegurarnos de que el logo esté correctamente incluido en el HTML final
      if (!finalHtml.includes('img src=') && profile) {
        console.log('El HTML no incluye imagen de logo, intentando añadirla...');
        
        // Determinamos la URL del logo
        let logoUrl = '/owl-logo.png'; // Logo por defecto
        
        // Si el perfil tiene un logo personalizado, lo usamos
        if (profile?.logo) {
          console.log('Usando logo del perfil de la empresa:', profile.logo);
          // Verificar si el logo es una URL externa o relativa
          if (profile.logo.startsWith('http') || profile.logo.startsWith('data:')) {
            logoUrl = profile.logo;
          } else {
            // Si es una ruta relativa, asegurarnos de que tenga el formato correcto
            logoUrl = profile.logo.startsWith('/') ? profile.logo : `/${profile.logo}`;
          }
        }
        
        // Verificar si el logo se puede cargar
        const preloadImg = new Image();
        preloadImg.onload = () => console.log('Logo para PDF verificado correctamente');
        preloadImg.onerror = () => {
          console.warn('Error verificando logo para PDF, usando alternativa');
          logoUrl = '/owl-logo.png';
        };
        preloadImg.src = logoUrl;
        
        // Añadir el logo al HTML
        const logoHtml = `<img src="${logoUrl}" alt="Logo" class="company-logo" crossorigin="anonymous" style="max-width: 200px; max-height: 80px; margin-bottom: 10px;" />`;
        
        // Insertar el logo en el HTML
        finalHtml = finalHtml.replace('<div class="company-info">', `<div class="company-info">${logoHtml}`);
      }
      
      // Generar el PDF
      await generateClientSidePDF(finalHtml, fileName);
      
      toast({
        title: 'PDF generado',
        description: 'El PDF del estimado se ha generado correctamente.'
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al generar el PDF. Por favor, inténtalo de nuevo.',
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
            <CardTitle className="text-base">Estimate Information</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Título del Estimado</Label>
                <Input 
                  id="title" 
                  value={estimate.title} 
                  onChange={(e) => setEstimate({...estimate, title: e.target.value})}
                  placeholder="Ej. Instalación de cerca de madera"
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea 
                  id="notes" 
                  value={estimate.notes} 
                  onChange={(e) => setEstimate({...estimate, notes: e.target.value})}
                  placeholder="Agregue notas importantes sobre el estimado aquí..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label>Estado</Label>
                <Select 
                  value={estimate.status}
                  onValueChange={(value) => setEstimate({...estimate, status: value as 'draft' | 'sent' | 'approved' | 'rejected'})}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(!profile?.companyName || !profile?.email || !profile?.phone) && (
                <div className="mt-2 bg-amber-50 p-2 rounded text-xs text-amber-700 border border-amber-200">
                  <p>Información incompleta. Actualiza tu <Link href="/settings/profile">perfil de empresa</Link> para mostrar datos correctos en tus estimados.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Client Information */}
        <Card className="lg:col-span-1">
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
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-2">No client selected</p>
                <Button size="sm" onClick={() => setShowClientSearchDialog(true)}>
                  <Search className="h-4 w-4 mr-1" />
                  Select Client
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Materials & Items */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Materiales & Items</span>
              <Button variant="ghost" size="sm" onClick={() => setShowMaterialSearchDialog(true)} className="h-8">
                <PlusCircle className="h-4 w-4 mr-1" />
                Agregar Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {estimate.items.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-center">Unidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimate.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.name}</span>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <span className="text-xs">-</span>
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <span className="text-xs">+</span>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => moveItem(item.id, 'up')}
                                    className="h-6 w-6"
                                  >
                                    <MoveVertical className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mover arriba/abajo</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-6 w-6"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
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
                  className="flex items-center"
                >
                  <ArrowRight className="mr-1 h-4 w-4" />
                  Vista previa
                </Button>
                <Button 
                  onClick={handleSaveEstimate}
                  disabled={isSaving || !estimate.client || estimate.items.length === 0}
                  className="flex items-center"
                >
                  {isSaving ? (
                    <>
                      <RotateCcw className="mr-1 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      Guardar
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !estimate.client || !estimate.client.email || estimate.items.length === 0}
                  className="flex items-center"
                >
                  <Mail className="mr-1 h-4 w-4" />
                  Enviar por email
                </Button>
                <Button 
                  onClick={handleDownloadPdf}
                  disabled={!estimate.client || estimate.items.length === 0}
                  className="flex items-center"
                >
                  <FileDown className="mr-1 h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Client Search Dialog */}
      <Dialog open={showClientSearchDialog} onOpenChange={setShowClientSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
            <DialogDescription>
              Busca y selecciona un cliente para el estimado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <Input
              value={searchClientTerm}
              onChange={(e) => setSearchClientTerm(e.target.value)}
              placeholder="Buscar por nombre, email o teléfono..."
              className="mb-4"
            />
            
            <div className="max-h-[300px] overflow-y-auto">
              {filteredClients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectClient(client)}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          {client.email && (
                            <div className="text-xs text-muted-foreground">
                              {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="text-xs text-muted-foreground">
                              {client.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">Seleccionar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No se encontraron clientes.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between mt-4">
            <Link href="/clients/new">
              <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowClientSearchDialog(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Material Search Dialog */}
      <Dialog open={showMaterialSearchDialog} onOpenChange={setShowMaterialSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Agregar Material</DialogTitle>
            <DialogDescription>
              Busca y selecciona materiales para agregar al estimado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <Input
                value={searchMaterialTerm}
                onChange={(e) => setSearchMaterialTerm(e.target.value)}
                placeholder="Buscar por nombre, descripción o categoría..."
                className="mr-2"
              />
              <Button onClick={() => setShowAddMaterialDialog(true)} size="sm">
                <PlusCircle className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
              {filteredMaterials.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => (
                      <TableRow 
                        key={material.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${material.id === tempSelectedMaterial?.id ? 'bg-muted' : ''}`}
                        onClick={() => setTempSelectedMaterial(material)}
                      >
                        <TableCell className="font-medium">
                          {material.name}
                          {material.description && (
                            <div className="text-xs text-muted-foreground">
                              {material.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{material.category}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(material.price)}
                          <div className="text-xs text-muted-foreground">
                            {material.unit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant={material.id === tempSelectedMaterial?.id ? "default" : "ghost"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTempSelectedMaterial(material);
                            }}
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
                  <p className="text-muted-foreground">No se encontraron materiales.</p>
                </div>
              )}
            </div>
          </div>
          
          {tempSelectedMaterial && (
            <div className="mt-4 p-4 bg-muted/40 rounded-md">
              <div className="text-sm font-medium mb-2">
                Material seleccionado: {tempSelectedMaterial.name}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="quantity"
                      type="number"
                      value={tempQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setTempQuantity(val);
                        }
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">{tempSelectedMaterial.unit}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="font-medium">
                    {formatCurrency(tempSelectedMaterial.price * tempQuantity)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowMaterialSearchDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddItemToEstimate}
              disabled={!tempSelectedMaterial}
            >
              Agregar Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add New Material Dialog */}
      <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Material</DialogTitle>
            <DialogDescription>
              Completa la información del nuevo material.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input 
                id="name" 
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                placeholder="Ej. Poste de madera"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Input 
                id="category" 
                value={newMaterial.category}
                onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                placeholder="Ej. Madera, Metal, Herramientas"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea 
                id="description" 
                value={newMaterial.description || ''}
                onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                placeholder="Descripción detallada del material..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Precio</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    id="price" 
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMaterial.price}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setNewMaterial({...newMaterial, price: isNaN(val) ? 0 : val});
                    }}
                    className="pl-6"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="unit">Unidad</Label>
                <Select 
                  value={newMaterial.unit}
                  onValueChange={(value) => setNewMaterial({...newMaterial, unit: value})}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieza">Pieza</SelectItem>
                    <SelectItem value="metro">Metro</SelectItem>
                    <SelectItem value="kg">Kilogramo</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                    <SelectItem value="m2">Metro cuadrado</SelectItem>
                    <SelectItem value="m3">Metro cúbico</SelectItem>
                    <SelectItem value="hora">Hora</SelectItem>
                    <SelectItem value="día">Día</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMaterialDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveMaterial}>
              Save Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={(open) => {
        // Only allow closing the dialog if not in edit mode
        if (!isEditingPreview || !open) {
          setShowPreviewDialog(open);
        } else if (isEditingPreview && !open) {
          // Show warning if trying to close while editing
          toast({
            title: 'Unsaved Changes',
            description: 'Please save or discard your changes before closing.',
            variant: 'destructive'
          });
        }
      }}>
        <DialogContent className="sm:max-w-[800px] md:max-w-[900px] h-[85vh] flex flex-col">
          <DialogHeader className="pb-3 shrink-0">
            <DialogTitle className="text-lg">Estimate Preview</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Review your estimate and make any necessary changes before generating the PDF.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto mb-4">
            {/* Use our new component that handles both viewing and editing */}
            {previewHtml && (
              <div className="estimate-preview-wrapper">
                {isEditingPreview ? (
                  <div className="border rounded-md bg-white p-4">
                    <Textarea 
                      className="w-full min-h-[500px] font-mono text-sm"
                      value={editableHtml || ""}
                      onChange={(e) => setEditableHtml(e.target.value)}
                      placeholder="Edit the HTML content of your estimate..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Edit the content directly. HTML tags are supported.
                    </p>
                  </div>
                ) : (
                  <div 
                    className="estimate-preview border rounded-md p-4 bg-white"
                    dangerouslySetInnerHTML={{ __html: previewHtml as string }}
                    ref={(el) => {
                      if (el) {
                        // Process all images to ensure they load correctly
                        setTimeout(() => {
                          console.log('Preview HTML rendered, checking images...');
                          const imgs = el.querySelectorAll('img');
                          
                          if (imgs.length > 0) {
                            console.log(`Found ${imgs.length} images in the preview`);
                            
                            imgs.forEach(img => {
                              // Add crossorigin attribute
                              img.setAttribute('crossorigin', 'anonymous');
                              
                              // Add error handler
                              img.onerror = function() {
                                console.error('Error loading image in preview:', img.src);
                                
                                // Try fallback for logo
                                if (img.alt === 'Logo') {
                                  console.log('Attempting to load fallback logo');
                                  img.src = '/owl-logo.png';
                                } else {
                                  // Hide non-logo images that fail to load
                                  img.style.display = 'none';
                                }
                              };
                            });
                          } else {
                            console.warn('No images found in the preview HTML');
                          }
                        }, 100);
                      }
                    }}
                  />
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-3 mt-auto shrink-0 border-t">
            <div className="flex items-center justify-between w-full">
              <Button 
                variant={isEditingPreview ? "default" : "outline"} 
                onClick={() => {
                  if (isEditingPreview) {
                    // Save changes and exit edit mode
                    try {
                      // Use the edited HTML content directly
                      setPreviewHtml(editableHtml || "");
                      setIsEditingPreview(false);
                      
                      toast({
                        title: 'Changes Saved',
                        description: 'Your estimate has been updated successfully.'
                      });
                    } catch (error) {
                      console.error('Error saving edited content:', error);
                      toast({
                        title: 'Error Saving Changes',
                        description: 'There was a problem updating your estimate.',
                        variant: 'destructive'
                      });
                    }
                  } else {
                    // Enter edit mode - prepare HTML for editing
                    setEditableHtml(previewHtml);
                    setIsEditingPreview(true);
                  }
                }}
              >
                {isEditingPreview ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Text
                  </>
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (isEditingPreview) {
                      // Confirm before discarding changes
                      if (confirm('Discard your changes?')) {
                        setIsEditingPreview(false);
                        setEditableHtml(previewHtml); // Reset to original
                      }
                    } else {
                      setShowPreviewDialog(false);
                    }
                  }}
                >
                  {isEditingPreview ? 'Cancel' : 'Close'}
                </Button>
                
                <Button 
                  onClick={handleDownloadPdf}
                  disabled={isEditingPreview}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}