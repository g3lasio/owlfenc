import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-profile';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MervinAssistant } from '@/components/ui/mervin-assistant';
import { 
  ArrowDown, 
  ArrowUp, 
  Edit, 
  FileDown, 
  Mail, 
  Minus, 
  Plus, 
  Search, 
  Trash 
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getClients } from '@/lib/clientFirebase';

export default function Estimates() {
  // Using the auth context
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { profile } = useProfile();
  
  // States for data
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchClientTerm, setSearchClientTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchMaterialTerm, setSearchMaterialTerm] = useState('');
  
  // Dialog states
  const [showClientSearchDialog, setShowClientSearchDialog] = useState(false);
  const [showMaterialSearchDialog, setShowMaterialSearchDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);
  
  // New material state
  const [newMaterial, setNewMaterial] = useState<Material>({
    id: '',
    name: '',
    category: 'wood',
    description: '',
    unit: 'pieza',
    price: 0,
  });
  
  // Estimate state
  const [estimate, setEstimate] = useState<Estimate>({
    title: 'Nuevo Estimado',
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
  
  // Function to handle image errors in the preview
  const handleImageError = useCallback((img: HTMLImageElement): void => {
    console.error('Error cargando imagen en preview:', img.src);
    // Si es el logo de la empresa, intentar con el logo local
    if ((img.alt.includes('Logo') || img.alt.includes('logo')) && !img.src.includes('owl-logo.png')) {
      console.log('Intentando cargar logo alternativo en preview');
      img.src = '/owl-logo.png';
      // Agregar clase para destacar que es un logo de respaldo
      img.classList.add('fallback-logo');
    }
  }, []);
  
  // Handle preview reference setup with image error handling
  const handlePreviewRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || !previewHtml) return;
    
    // Insertar HTML
    el.innerHTML = previewHtml;
    
    console.log('Preview HTML renderizado, verificando imágenes...');
    
    // Procesar imágenes
    const imgs = el.querySelectorAll('img');
    if (imgs.length > 0) {
      console.log(`Encontradas ${imgs.length} imágenes en el preview`);
      imgs.forEach(img => {
        // Verificar si la imagen ya está cargada
        if (img.complete) {
          // Si la imagen ya está completa pero tiene error, aplicar fallback
          if (img.naturalWidth === 0) {
            console.warn('Imagen cargada con errores:', img.src);
            handleImageError(img);
          } else {
            console.log('Imagen precargada correctamente:', img.src);
          }
        }
        
        // Listener para cuando la imagen carga correctamente
        img.onload = function() {
          console.log('Imagen cargada correctamente:', img.src);
        };
        
        // Listener para errores de carga
        img.onerror = function() {
          handleImageError(img);
        };
      });
    } else {
      console.warn('No se encontraron imágenes en el preview HTML');
    }
  }, [previewHtml, handleImageError]);
  
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
  
  // Handle new material form changes
  const handleMaterialChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      const numericValue = parseFloat(value);
      setNewMaterial(prev => ({
        ...prev,
        [name]: isNaN(numericValue) ? 0 : numericValue
      }));
    } else {
      setNewMaterial(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Save new material
  const handleSaveMaterial = async () => {
    if (!newMaterial.name || !newMaterial.category || !newMaterial.unit) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor, completa los campos requeridos.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Save to Firebase
      // Crear una copia del objeto sin el id
      const { id, ...materialDocData } = newMaterial;
      
      // Añadir datos adicionales
      const fullMaterialData = {
        ...materialDocData,
        userId: currentUser?.uid,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'materials'), fullMaterialData);
      
      const savedMaterial: Material = {
        ...newMaterial,
        id: docRef.id
      };
      
      // Update local state
      setMaterials(prev => [...prev, savedMaterial]);
      setFilteredMaterials(prev => [...prev, savedMaterial]);
      
      // Reset form
      setNewMaterial({
        id: '',
        name: '',
        category: 'wood',
        description: '',
        unit: 'pieza',
        price: 0
      });
      
      setShowAddMaterialDialog(false);
      
      toast({
        title: 'Material guardado',
        description: 'El material se ha guardado correctamente.'
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
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <img 
                src="${profile?.logo || '/owl-logo.png'}" 
                alt="Logo" 
                style="max-height: 60px; max-width: 180px; margin-right: 15px;" 
                onerror="this.onerror=null; this.src='/owl-logo.png'; console.log('Fallback a logo local');"
              />
              <h1>${profile?.companyName || 'Owl Fence'}</h1>
            </div>
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
        items: estimate.items,
        subtotal: estimate.subtotal,
        total: estimate.total,
        notes: estimate.notes,
        status: estimate.status,
        html: estimateHtml,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: currentUser.uid
      };
      
      // Guardar en Firebase
      const docRef = await addDoc(collection(db, 'estimates'), estimateData);
      
      toast({
        title: 'Estimado guardado',
        description: 'El estimado se ha guardado correctamente.'
      });
      
      // Redirigir al usuario o mostrar el PDF para descargar
      // Por ahora simplemente mostramos la vista previa
      setPreviewHtml(estimateHtml);
      setShowPreviewDialog(true);
      
    } catch (error) {
      console.error('Error al guardar estimado:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el estimado.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle estimate preview
  const handlePreview = () => {
    if (!estimate.client) {
      toast({
        title: 'Cliente no seleccionado',
        description: 'Por favor, selecciona un cliente antes de generar la vista previa.',
        variant: 'destructive'
      });
      return;
    }
    
    // En este punto sabemos que estimate.client no es null
    const client = estimate.client;
    
    const html = `
    <style>
      .estimate-preview {
        font-family: 'Arial', sans-serif;
        color: #333;
        max-width: 100%;
        margin: 0 auto;
        padding: 20px;
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
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <img 
              src="${profile?.logo || '/owl-logo.png'}" 
              alt="Logo" 
              style="max-height: 60px; max-width: 180px; margin-right: 15px;" 
              onerror="this.onerror=null; this.src='/owl-logo.png'; console.log('Fallback a logo local');"
            />
            <h1>${profile?.companyName || 'Owl Fence'}</h1>
          </div>
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
    
    console.log('HTML para preview generado correctamente');
    setPreviewHtml(html);
    setShowPreviewDialog(true);
  };
  
  // Handle send email
  const handleSendEmail = () => {
    if (!estimate.client || !estimate.client.email) {
      toast({
        title: 'Email no disponible',
        description: 'El cliente seleccionado no tiene un email registrado.',
        variant: 'destructive'
      });
      return;
    }
    
    // En este punto sabemos que estimate.client y estimate.client.email no son null
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
      
      const previewElement = document.querySelector('.estimate-preview');
      if (!previewElement) {
        console.error('No se pudo encontrar el elemento de vista previa');
        return;
      }
      
      // Use html2canvas to convert the preview div to a canvas
      const canvas = await html2canvas(previewElement as HTMLElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // This is needed if you have images from external sources
        logging: true // Enable logging for debugging
      });
      
      // Create a new PDF with the dimensions of the canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate the dimensions to fit the PDF page
      const imgWidth = 210; // A4 width in mm (297 is height)
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add the image to the PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // If the content is longer than one page, add more pages as needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate a filename based on the client name and date
      const clientName = estimate.client?.name || 'Cliente';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Estimado_${clientName.replace(/\s+/g, '_')}_${date}.pdf`;
      
      // Save the PDF
      pdf.save(filename);
      
      toast({
        title: 'PDF descargado',
        description: 'El estimado se ha descargado como PDF correctamente.'
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle enhancing the notes with AI
  const handleEnhancedNotes = (enhancedText: string) => {
    setEstimate(prev => ({
      ...prev,
      notes: enhancedText
    }));
    
    toast({
      title: 'Texto mejorado',
      description: 'La descripción del proyecto ha sido mejorada.'
    });
  };
  
  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Crear Estimado</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Estimate Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Detalles del Estimado</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePreview}
                >
                  Vista Previa
                </Button>
                <Button 
                  size="sm"
                  disabled={isSaving || !estimate.client || estimate.items.length === 0}
                  onClick={handleSaveEstimate}
                >
                  {isSaving ? 'Guardando...' : 'Guardar Estimado'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="estimateTitle">Título del Estimado</Label>
                <Input 
                  id="estimateTitle" 
                  value={estimate.title}
                  onChange={(e) => setEstimate(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nuevo Estimado"
                />
              </div>
              
              <div>
                <Label>Cliente</Label>
                <div className="flex items-center gap-2 mt-1">
                  {estimate.client ? (
                    <div className="flex-1 p-3 border rounded-md">
                      <div className="font-medium">{estimate.client.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {estimate.client.email || 'Sin email'} | {estimate.client.phone || 'Sin teléfono'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {estimate.client.address || 'Sin dirección'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 p-3 border rounded-md text-muted-foreground italic">
                      No se ha seleccionado un cliente
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowClientSearchDialog(true)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="notes">Descripción del Proyecto</Label>
                  <div className="flex items-center">
                    <MervinAssistant 
                      originalText={estimate.notes}
                      projectType="fencing"
                      onTextEnhanced={handleEnhancedNotes}
                      className="mr-1"
                    />
                    <span className="text-xs text-muted-foreground">Mejorar con IA</span>
                  </div>
                </div>
                <Textarea 
                  id="notes" 
                  value={estimate.notes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Descripción detallada del proyecto..."
                  rows={5}
                />
                {estimate.notes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {estimate.notes.length} caracteres
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Materiales y Servicios</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddMaterialDialog(true)}
                >
                  Nuevo Material
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowMaterialSearchDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir Material
                </Button>
              </div>
            </div>
            
            {estimate.items.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-md">
                <p className="text-muted-foreground">
                  No hay materiales añadidos al estimado
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Haz clic en "Añadir Material" para comenzar
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: '40%' }}>Descripción</TableHead>
                      <TableHead style={{ width: '15%' }}>Cantidad</TableHead>
                      <TableHead style={{ width: '15%' }}>Precio</TableHead>
                      <TableHead style={{ width: '15%' }}>Total</TableHead>
                      <TableHead style={{ width: '15%' }}>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimate.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <span className="ml-1 text-xs text-muted-foreground">{item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveItem(item.id, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveItem(item.id, 'down')}
                              disabled={index === estimate.items.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Summary */}
        <div>
          <div className="bg-white shadow rounded-lg p-6 sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(estimate.subtotal)}</span>
                </div>
                <div className="flex justify-between mt-2 text-lg font-medium">
                  <span>Total:</span>
                  <span>{formatCurrency(estimate.total)}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  Este estimado incluye {estimate.items.length} materiales o servicios.
                </p>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handlePreview}
                  >
                    Vista Previa
                  </Button>
                  <Button 
                    className="flex-1"
                    disabled={isSendingEmail || !estimate.client || !estimate.client.email}
                    onClick={handleSendEmail}
                  >
                    {isSendingEmail ? 'Enviando...' : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Client Search Dialog */}
      <Dialog open={showClientSearchDialog} onOpenChange={setShowClientSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
            <DialogDescription>
              Busca y selecciona un cliente para este estimado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Buscar por nombre, email, teléfono..." 
                value={searchClientTerm}
                onChange={(e) => setSearchClientTerm(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              {filteredClients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.address || 'Sin dirección'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{client.email || 'Sin email'}</div>
                          <div>{client.phone || 'Sin teléfono'}</div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handleSelectClient(client)}
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No se encontraron clientes
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientSearchDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Material Search Dialog */}
      <Dialog open={showMaterialSearchDialog} onOpenChange={setShowMaterialSearchDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Buscar Material</DialogTitle>
            <DialogDescription>
              Busca y selecciona un material para añadir al estimado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Buscar por nombre, categoría..." 
                value={searchMaterialTerm}
                onChange={(e) => setSearchMaterialTerm(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
              {filteredMaterials.length > 0 ? (
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map(material => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {material.description || 'Sin descripción'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="capitalize">{material.category}</div>
                          <div className="text-sm text-muted-foreground">
                            {material.unit}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(material.price)}
                        </TableCell>
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
          
          {tempSelectedMaterial ? (
            <div className="bg-muted p-3 rounded-md mb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                  <h3 className="font-medium text-sm">{tempSelectedMaterial.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {tempSelectedMaterial.description || 'No description'}
                  </p>
                  <p className="text-xs mt-1">
                    <span className="font-medium">Precio:</span> {formatCurrency(tempSelectedMaterial.price)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="quantity" className="whitespace-nowrap text-xs">Cantidad:</Label>
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
                <Button size="sm" onClick={handleAddItemToEstimate}>
                  Añadir a Estimado
                </Button>
              </div>
            </div>
          ) : null}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaterialSearchDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Material Dialog */}
      <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Material</DialogTitle>
            <DialogDescription>
              Agregar un nuevo material a tu inventario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                name="name"
                value={newMaterial.name}
                onChange={handleMaterialChange}
                placeholder="Nombre del material"
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Categoría
              </Label>
              <Select
                name="category"
                value={newMaterial.category}
                onValueChange={(value) => setNewMaterial(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wood">Madera</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="concrete">Concreto</SelectItem>
                  <SelectItem value="tool">Herramienta</SelectItem>
                  <SelectItem value="hardware">Ferretería</SelectItem>
                  <SelectItem value="labor">Mano de obra</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descripción
              </Label>
              <Textarea
                id="description"
                name="description"
                value={newMaterial.description || ''}
                onChange={handleMaterialChange}
                placeholder="Descripción opcional"
                className="col-span-3"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Precio
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={newMaterial.price}
                onChange={handleMaterialChange}
                min={0}
                step={0.01}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">
                Unidad
              </Label>
              <Select
                name="unit"
                value={newMaterial.unit}
                onValueChange={(value) => setNewMaterial(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona una unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pieza">Piece</SelectItem>
                  <SelectItem value="pie">Foot</SelectItem>
                  <SelectItem value="pie2">Square Foot</SelectItem>
                  <SelectItem value="pie3">Cubic Foot</SelectItem>
                  <SelectItem value="metro">Meter</SelectItem>
                  <SelectItem value="metro2">Square Meter</SelectItem>
                  <SelectItem value="metro3">Cubic Meter</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="galón">Gallon</SelectItem>
                  <SelectItem value="litro">Liter</SelectItem>
                  <SelectItem value="bolsa">Bag</SelectItem>
                  <SelectItem value="caja">Box</SelectItem>
                  <SelectItem value="juego">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddMaterialDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveMaterial}>
              Guardar Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col">
          <DialogHeader className="pb-3 shrink-0">
            <DialogTitle className="text-lg">Vista Previa del Estimado</DialogTitle>
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
              previewHtml ? (
                <div 
                  className="estimate-preview border rounded-md p-4 bg-white"
                  ref={handlePreviewRef}
                />
              ) : (
                <div className="border rounded-md p-4 bg-white text-center py-8 text-muted-foreground">
                  No hay contenido para previsualizar
                </div>
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
                <Edit className="mr-2 h-4 w-4" />
                {isEditingPreview ? 'Guardar cambios' : 'Editar texto'}
              </Button>
            </div>
            
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={handleDownloadPdf}>
              <FileDown className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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