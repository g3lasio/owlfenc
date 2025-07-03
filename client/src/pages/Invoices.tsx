/**
 * Página principal para gestión de facturas (invoices)
 * Sistema de facturación simplificado con wizard de pasos
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Download, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Settings,
  History,
  ChevronRight,
  ChevronLeft,
  Search,
  Mail,
  Check,
  ArrowRight
} from 'lucide-react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types
interface SavedEstimate {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectType: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  notes?: string;
}

interface InvoiceData {
  id?: string;
  estimateId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  projectType: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  dueDate: string;
  paymentTerms: number;
  createdAt: string;
  pdfUrl?: string;
}

// Wizard steps
const WIZARD_STEPS = [
  { id: 1, title: 'Seleccionar Estimado', icon: FileText },
  { id: 2, title: 'Ajustes de Pago', icon: DollarSign },
  { id: 3, title: 'Enviar/Descargar', icon: Send }
];

const Invoices: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('wizard');
  
  // Selection state
  const [selectedEstimate, setSelectedEstimate] = useState<SavedEstimate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Invoice configuration
  const [invoiceConfig, setInvoiceConfig] = useState({
    paymentTerms: 30,
    paidAmount: 0,
    projectCompleted: true,
    notes: '',
    sendEmail: false,
    recipientEmail: ''
  });
  
  // Load saved estimates from Firebase
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceData[]>([]);
  
  // Load estimates on mount
  useEffect(() => {
    if (currentUser) {
      loadSavedEstimates();
      loadInvoiceHistory();
    }
  }, [currentUser]);
  
  const loadSavedEstimates = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingEstimates(true);
      console.log('🔐 Loading estimates for user:', currentUser.uid);
      
      // Primero intentar con la colección 'projects' que es donde se están guardando
      const projectsRef = collection(db, 'projects');
      
      // Intentar primero con firebaseUserId
      let q = query(
        projectsRef, 
        where('firebaseUserId', '==', currentUser.uid)
      );
      
      let snapshot = await getDocs(q);
      console.log(`📊 Found ${snapshot.size} projects with firebaseUserId`);
      
      // Si no hay resultados, intentar con userId
      if (snapshot.empty) {
        console.log('No projects found with firebaseUserId, trying with userId...');
        q = query(
          projectsRef,
          where('userId', '==', currentUser.uid)
        );
        snapshot = await getDocs(q);
        console.log(`📊 Found ${snapshot.size} projects with userId`);
      }
      
      // Si todavía no hay resultados, intentar con la colección 'estimates'
      if (snapshot.empty) {
        console.log('No projects found, trying estimates collection...');
        const estimatesRef = collection(db, 'estimates');
        q = query(
          estimatesRef,
          where('firebaseUserId', '==', currentUser.uid)
        );
        snapshot = await getDocs(q);
        console.log(`📊 Found ${snapshot.size} in estimates collection`);
      }
      
      const estimates: SavedEstimate[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Raw estimate data from Firebase:', data);
        
        // Los datos vienen con campos planos, no anidados
        const clientName = data.clientName || data.client?.name || 'Sin nombre';
        const clientPhone = data.clientPhone || '';
        
        // Verificar que el total esté en el formato correcto
        let total = data.total || 0;
        let subtotal = data.subtotal || 0;
        let discount = data.discount || 0;
        let tax = data.tax || 0;
        
        // Detectar si los valores están en centavos o dólares
        // Si el total es un número entero grande, probablemente está en centavos
        const isInCents = Number.isInteger(total) && total > 5000;
        
        if (isInCents) {
          console.warn(`Convirtiendo de centavos a dólares: ${total} → ${(total / 100).toFixed(2)}`);
          total = total / 100;
          subtotal = subtotal / 100;
          discount = discount / 100;
          tax = tax / 100;
        }
        
        estimates.push({
          id: doc.id,
          clientName: clientName,
          clientEmail: data.clientEmail || data.client?.email || '',
          clientPhone: data.clientPhone || data.client?.phone || '',
          clientAddress: data.clientAddress || data.client?.address || '',
          projectType: data.projectType || 'fence',
          items: data.items || [],
          subtotal: subtotal,
          discount: discount,
          tax: tax,
          total: total,
          createdAt: data.createdAt || data.date || new Date().toISOString(),
          notes: data.notes || ''
        });
      });
      
      // Ordenar por fecha de creación descendente
      estimates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setSavedEstimates(estimates);
    } catch (error) {
      console.error('Error loading estimates:', error);
      toast({
        title: 'Error cargando estimados',
        description: 'No se pudieron cargar los estimados guardados',
        variant: 'destructive'
      });
    } finally {
      setLoadingEstimates(false);
    }
  };
  
  const loadInvoiceHistory = async () => {
    if (!currentUser) return;
    
    try {
      // SEGURIDAD CRÍTICA: Solo cargar facturas del usuario autenticado
      console.log('Loading invoices for user:', currentUser.uid);
      
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('userId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const invoices: InvoiceData[] = [];
      
      snapshot.forEach((doc) => {
        invoices.push({
          id: doc.id,
          ...doc.data() as InvoiceData
        });
      });
      
      // Ordenar por fecha de creación descendente
      invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setInvoiceHistory(invoices);
    } catch (error) {
      console.error('Error loading invoice history:', error);
    }
  };
  
  // Filter estimates based on search
  const filteredEstimates = savedEstimates.filter(estimate => 
    estimate.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.projectType.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate amounts
  const calculateAmounts = () => {
    if (!selectedEstimate) return { total: 0, paid: 0, balance: 0 };
    
    // El total ya debe estar convertido a dólares en loadEstimates()
    const total = selectedEstimate.total;
    const paid = invoiceConfig.paidAmount;
    const balance = total - paid;
    
    return { total, paid, balance };
  };
  
  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  };
  
  // Handle step navigation
  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return selectedEstimate !== null;
      case 2:
        return true; // Payment adjustments are optional
      case 3:
        return true;
      default:
        return false;
    }
  };
  
  const nextStep = () => {
    if (canProceedToNext() && currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle invoice generation
  const handleGenerateInvoice = async () => {
    if (!selectedEstimate || !currentUser) return;
    
    try {
      const amounts = calculateAmounts();
      const invoiceNumber = generateInvoiceNumber();
      
      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + invoiceConfig.paymentTerms);
      
      // Determine payment status
      let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
      if (amounts.paid >= amounts.total) {
        paymentStatus = 'paid';
      } else if (amounts.paid > 0) {
        paymentStatus = 'partial';
      }
      
      // Create invoice data
      const invoiceData: InvoiceData = {
        estimateId: selectedEstimate.id,
        invoiceNumber,
        clientName: selectedEstimate.clientName,
        clientEmail: selectedEstimate.clientEmail,
        projectType: selectedEstimate.projectType,
        totalAmount: amounts.total,
        paidAmount: amounts.paid,
        balanceAmount: amounts.balance,
        paymentStatus,
        dueDate: dueDate.toISOString(),
        paymentTerms: invoiceConfig.paymentTerms,
        createdAt: new Date().toISOString()
      };
      
      // Save to Firebase
      const invoicesRef = collection(db, 'invoices');
      const docRef = await addDoc(invoicesRef, {
        ...invoiceData,
        userId: currentUser.uid,
        estimateData: selectedEstimate,
        notes: invoiceConfig.notes
      });
      
      // Update local state
      setInvoiceHistory([{ ...invoiceData, id: docRef.id }, ...invoiceHistory]);
      
      toast({
        title: 'Factura generada exitosamente',
        description: `Factura ${invoiceNumber} creada correctamente`
      });
      
      // Generate PDF using existing backend
      await handleDownloadPdf(selectedEstimate, invoiceData);
      
      // Send email if requested
      if (invoiceConfig.sendEmail && invoiceConfig.recipientEmail) {
        await handleSendEmail(selectedEstimate, invoiceData);
      }
      
      // Reset wizard
      setTimeout(() => {
        setActiveTab('history');
        setCurrentStep(1);
        setSelectedEstimate(null);
        setInvoiceConfig({
          paymentTerms: 30,
          paidAmount: 0,
          projectCompleted: true,
          notes: '',
          sendEmail: false,
          recipientEmail: ''
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: 'Error generando factura',
        description: 'No se pudo generar la factura',
        variant: 'destructive'
      });
    }
  };
  
  // Handle PDF download
  const handleDownloadPdf = async (estimate: SavedEstimate, invoiceData: InvoiceData) => {
    try {
      // Use the existing invoice PDF generation endpoint
      const response = await fetch('/api/invoices/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          estimate,
          invoiceData,
          userId: currentUser?.uid
        })
      });
      
      if (!response.ok) throw new Error('Error generating PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${invoiceData.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };
  
  // Handle email sending
  const handleSendEmail = async (estimate: SavedEstimate, invoiceData: InvoiceData) => {
    try {
      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: invoiceConfig.recipientEmail,
          estimate,
          invoiceData
        })
      });
      
      if (!response.ok) throw new Error('Error sending email');
      
      toast({
        title: 'Email enviado',
        description: `Factura enviada a ${invoiceConfig.recipientEmail}`
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };
  
  // Render wizard steps
  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Seleccionar Estimado</CardTitle>
                <CardDescription className="text-sm">
                  Seleccione el estimado desde el cual desea generar la factura
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Buscar por cliente o tipo de proyecto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Estimates list */}
                {loadingEstimates ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredEstimates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No se encontraron estimados</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {filteredEstimates.slice(0, 3).map((estimate) => (
                      <Card
                        key={estimate.id}
                        className={`cursor-pointer transition-all ${
                          selectedEstimate?.id === estimate.id
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedEstimate(estimate);
                          setInvoiceConfig(prev => ({
                            ...prev,
                            recipientEmail: estimate.clientEmail
                          }));
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">{estimate.clientName}</h4>
                                <span className="text-xs text-muted-foreground">•</span>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(estimate.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{estimate.projectType}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {estimate.items.length} items
                              </Badge>
                              <p className="text-base font-bold">${estimate.total.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
        
      case 2:
        const amounts = calculateAmounts();
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ajustes de Pago</CardTitle>
                <CardDescription>
                  Configure los detalles de pago y balance de la factura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected estimate summary */}
                {selectedEstimate && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium">{selectedEstimate.clientName}</h4>
                    <p className="text-sm text-muted-foreground">{selectedEstimate.projectType}</p>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-semibold">${amounts.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pagado</p>
                        <p className="font-semibold text-green-600">${amounts.paid.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className="font-semibold text-orange-600">${amounts.balance.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Payment configuration */}
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="paidAmount">Monto Pagado</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      value={invoiceConfig.paidAmount}
                      onChange={(e) => setInvoiceConfig(prev => ({
                        ...prev,
                        paidAmount: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={selectedEstimate?.total || 0}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Ingrese el monto que ya ha sido pagado por el cliente
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentTerms">Términos de Pago (días)</Label>
                    <select
                      id="paymentTerms"
                      value={invoiceConfig.paymentTerms}
                      onChange={(e) => setInvoiceConfig(prev => ({
                        ...prev,
                        paymentTerms: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value={0}>Al recibir</option>
                      <option value={15}>15 días</option>
                      <option value={30}>30 días</option>
                      <option value={45}>45 días</option>
                      <option value={60}>60 días</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={invoiceConfig.notes}
                      onChange={(e) => setInvoiceConfig(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      placeholder="Agregue cualquier nota o mensaje para el cliente..."
                      rows={3}
                    />
                  </div>
                </div>
                
                {/* Quick payment buttons */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Opciones rápidas:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoiceConfig(prev => ({
                        ...prev,
                        paidAmount: 0
                      }))}
                    >
                      Sin pago
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoiceConfig(prev => ({
                        ...prev,
                        paidAmount: (selectedEstimate?.total || 0) * 0.5
                      }))}
                    >
                      50% pagado
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoiceConfig(prev => ({
                        ...prev,
                        paidAmount: selectedEstimate?.total || 0
                      }))}
                    >
                      Pagado completo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enviar y Descargar</CardTitle>
                <CardDescription>
                  Elija cómo desea entregar la factura al cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invoice preview */}
                {selectedEstimate && (
                  <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">Factura #{generateInvoiceNumber()}</h3>
                        <p className="text-sm text-muted-foreground">
                          Fecha: {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          calculateAmounts().balance === 0 ? 'default' : 
                          calculateAmounts().paid > 0 ? 'secondary' : 'destructive'
                        }
                      >
                        {calculateAmounts().balance === 0 ? 'Pagado' : 
                         calculateAmounts().paid > 0 ? 'Pago parcial' : 'Pendiente'}
                      </Badge>
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="font-medium mb-2">{selectedEstimate.clientName}</p>
                      <p className="text-sm text-muted-foreground">{selectedEstimate.projectType}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-semibold">${calculateAmounts().total.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className="font-semibold text-orange-600">
                          ${calculateAmounts().balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Delivery options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={invoiceConfig.sendEmail}
                      onChange={(e) => setInvoiceConfig(prev => ({
                        ...prev,
                        sendEmail: e.target.checked
                      }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="sendEmail" className="cursor-pointer">
                      Enviar por email al cliente
                    </Label>
                  </div>
                  
                  {invoiceConfig.sendEmail && (
                    <div>
                      <Label htmlFor="recipientEmail">Email del destinatario</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={invoiceConfig.recipientEmail}
                        onChange={(e) => setInvoiceConfig(prev => ({
                          ...prev,
                          recipientEmail: e.target.value
                        }))}
                        placeholder="cliente@ejemplo.com"
                      />
                    </div>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerateInvoice}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Generar Factura
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  La factura se descargará automáticamente y se guardará en el historial
                </p>
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="page-container">
      <div className="scrollable-content space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sistema de Facturación</h1>
            <p className="text-muted-foreground">
              Genere facturas profesionales desde sus estimados guardados
            </p>
          </div>
        </div>
        
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wizard" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generar Factura
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de Facturas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="wizard" className="space-y-6">
            {/* Progress steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4 max-w-2xl w-full">
                {WIZARD_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  
                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className={`
                            flex items-center justify-center w-10 h-10 rounded-full
                            ${isActive ? 'bg-primary text-primary-foreground' : 
                              isCompleted ? 'bg-green-600 text-white' : 
                              'bg-muted text-muted-foreground'}
                          `}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>
                        <span className={`
                          text-sm mt-2 ${isActive ? 'font-medium' : 'text-muted-foreground'}
                        `}>
                          {step.title}
                        </span>
                      </div>
                      {index < WIZARD_STEPS.length - 1 && (
                        <div className={`
                          flex-1 h-1 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-muted'}
                        `} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Current step content */}
            {renderWizardStep()}
            
            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              
              {currentStep < WIZARD_STEPS.length && (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                >
                  Siguiente
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Historial de Facturas</CardTitle>
                <CardDescription className="text-sm">
                  Todas las facturas generadas están disponibles aquí para descargar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoiceHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="mx-auto h-12 w-12 mb-4" />
                    <p>No hay facturas generadas aún</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {invoiceHistory.map((invoice) => (
                      <Card key={invoice.id} className="hover:border-primary/50 transition-all">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{invoice.invoiceNumber}</h4>
                                <Badge 
                                  variant={
                                    invoice.paymentStatus === 'paid' ? 'default' : 
                                    invoice.paymentStatus === 'partial' ? 'secondary' : 
                                    'destructive'
                                  }
                                >
                                  {invoice.paymentStatus === 'paid' ? 'Pagado' : 
                                   invoice.paymentStatus === 'partial' ? 'Parcial' : 
                                   'Pendiente'}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{invoice.clientName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(invoice.createdAt).toLocaleDateString()} • {invoice.projectType}
                              </p>
                            </div>
                            <div className="text-right space-y-2">
                              <p className="text-lg font-bold">${invoice.totalAmount.toFixed(2)}</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Find the original estimate
                                    const estimate = savedEstimates.find(e => e.id === invoice.estimateId);
                                    if (estimate) {
                                      handleDownloadPdf(estimate, invoice);
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Handle email resend
                                    toast({
                                      title: 'Función en desarrollo',
                                      description: 'Reenvío de email próximamente'
                                    });
                                  }}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Invoices;