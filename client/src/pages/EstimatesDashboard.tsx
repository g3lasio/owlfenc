import { downloadPdfFromResponse } from "@/lib/download-pdf";
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getEstimates as fetchEstimates, getEstimateById } from '../lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileDown, 
  Mail, 
  Eye, 
  Plus, 
  Search,
  RotateCcw,
  X
} from 'lucide-react';

// Types - Complete estimate interface for dashboard
interface Estimate {
  id: string;
  estimateNumber: string;
  title: string;
  
  // Client information
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  
  // Contractor information
  contractorCompanyName?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  
  // Project details
  projectType?: string;
  projectDescription?: string;
  scope?: string;
  timeline?: string;
  
  // Financial information
  subtotal?: number;
  taxAmount?: number;
  total: number;
  displayTotal?: number;
  itemsCount?: number;
  
  // Status and metadata
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  date?: string;
  validUntil?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function EstimatesDashboard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(null);

  // Load estimates from Firestore
  useEffect(() => {
    const loadEstimates = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const estimatesData = await fetchEstimates(currentUser.uid);
        setEstimates(estimatesData);
      } catch (error) {
        console.error('Error cargando estimados:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los estimados.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEstimates();
  }, [currentUser, toast]);

  // 🎯 VISTA PREVIA CON SISTEMA UNIFICADO - Garantiza consistencia total
  const handleViewEstimate = async (estimateId: string) => {
    try {
      setIsPreviewLoading(true);
      setCurrentEstimateId(estimateId);
      console.log('🔍 [UNIFIED-PREVIEW] Iniciando carga:', estimateId);
      
      const startTime = Date.now();
      
      toast({
        title: "Cargando vista previa",
        description: "Usando sistema unificado para garantizar consistencia...",
      });
      
      // Obtener datos del estimado
      const estimateData = await getEstimateById(estimateId);
      if (!estimateData) throw new Error("Estimado no encontrado");
      
      console.log('📊 [UNIFIED] Datos del estimado obtenidos');
      
      // Obtener datos de la empresa
      let companyData = {};
      try {
        const profile = localStorage.getItem('contractorProfile');
        if (profile) {
          companyData = JSON.parse(profile);
          console.log('✅ [UNIFIED] Datos de empresa cargados');
        }
      } catch (error) {
        console.warn('⚠️ [UNIFIED] Usando datos por defecto');
      }
      
      // 🎨 USAR SISTEMA UNIFICADO - La misma plantilla que usará el PDF
      const { generateUnifiedEstimateHTML, convertEstimateDataToTemplate } = 
        await import('../lib/unified-estimate-template');
      
      const templateData = convertEstimateDataToTemplate(estimateData, companyData);
      const html = generateUnifiedEstimateHTML(templateData);
      
      setPreviewHtml(html);
      setShowPreviewDialog(true);
      
      console.log('✅ [UNIFIED-PREVIEW] Completado en:', Date.now() - startTime, 'ms');
      console.log('🎯 [UNIFIED] Preview usa exactamente la misma plantilla que el PDF');
      
      toast({
        title: "Vista previa lista",
        description: "Sistema unificado garantiza que será idéntico al PDF.",
      });
      
    } catch (error) {
      console.error('❌ [UNIFIED-PREVIEW] Error:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la vista previa.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 📄 DESCARGA PDF CON PDFMONKEY + FALLBACK - Sistema integrado profesional
  const handleDownloadPDF = async (estimateId: string) => {
    try {
      setIsPdfLoading(true);
      console.log('🐒 [PDFMonkey Integration] Iniciando descarga:', estimateId);
      
      const startTime = Date.now();
      
      toast({
        title: "Generando PDF profesional",
        description: "Usando PDFMonkey con template específico y fallback automático...",
      });
      
      // Obtener datos del estimado
      const estimateData = await getEstimateById(estimateId);
      if (!estimateData) throw new Error("Estimado no encontrado");
      
      // Mapear datos del estimado al formato requerido por PDFMonkey
      const pdfMonkeyData = {
        estimateNumber: estimateData.estimateNumber || `EST-${Date.now()}`,
        date: estimateData.date || new Date().toLocaleDateString('en-US'),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        clientName: estimateData.clientName || '',
        clientAddress: estimateData.clientAddress || '',
        clientEmail: estimateData.clientEmail || '',
        clientPhone: estimateData.clientPhone || '',
        items: (estimateData.items || []).map((item: any) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subtotal: estimateData.subtotal || 0,
        discount: estimateData.discount || 0,
        tax: estimateData.tax || 0,
        taxPercentage: estimateData.taxPercentage || 0,
        total: estimateData.total || 0,
        projectDescription: estimateData.projectDescription || '',
        notes: estimateData.notes || '',
        // Add Firebase UID to fetch real contractor information
        firebaseUid: currentUser?.uid
      };
      
      console.log('🐒 [PDFMonkey Integration] Datos mapeados para template específico');
      
      // Usar el nuevo endpoint con template específico y fallback automático
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos total
      
      const response = await fetch('/api/pdfmonkey-estimates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfMonkeyData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('⏱️ [PDFMonkey Integration] Respuesta en:', Date.now() - startTime, 'ms');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [PDFMonkey Integration] Error del servidor:', errorData);
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      // Verificar si es una respuesta JSON (PDFMonkey exitoso) o un blob (fallback de Claude)
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // PDFMonkey exitoso - descargar desde URL
        const result = await response.json();
        console.log('✅ [PDFMonkey Integration] PDF generado con PDFMonkey:', result.method);
        
        if (result.success && result.downloadUrl) {
          // Descargar desde PDFMonkey
          const downloadResponse = await fetch(result.downloadUrl);
          const blob = await downloadResponse.blob();
          await downloadPdfFromResponse(blob, `estimado-${pdfMonkeyData.estimateNumber}.pdf`);
          document.body.removeChild(a);
          
          toast({
            title: "PDF descargado",
            description: `Generado con ${result.method === 'pdfmonkey' ? 'PDFMonkey' : 'sistema de respaldo'} exitosamente.`,
          });
        } else {
          throw new Error(result.error || 'Error en generación de PDF');
        }
      } else {
        // Fallback de Claude - descargar blob directamente
        console.log('✅ [PDFMonkey Integration] PDF generado con fallback de Claude');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `estimado-${pdfMonkeyData.estimateNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "PDF descargado",
          description: "Generado con sistema de respaldo profesional exitosamente.",
        });
      }
      
      console.log('🎯 [PDFMonkey Integration] Proceso total completado en:', Date.now() - startTime, 'ms');
      
    } catch (error) {
      console.error('❌ [PDFMonkey Integration] Error:', error);
      
      let errorMessage = "Error desconocido al generar PDF";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "La generación de PDF tardó demasiado. Intente nuevamente.";
        } else if (error.message.includes('fetch')) {
          errorMessage = "Error de conexión. Verifique su internet e intente nuevamente.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error al generar PDF",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSendEmail = (estimateId: string) => {
    toast({
      title: "Funcionalidad próximamente",
      description: "El envío por email estará disponible pronto.",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount: number) => {
    // Handle both display format (dollars) and stored format (cents)
    const displayAmount = amount > 10000 ? amount / 100 : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(displayAmount);
  };

  const filteredEstimates = estimates.filter(estimate =>
    estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Estimados</h1>
          <p className="text-gray-600 mt-2">
            ✅ Información completa: Contratista, Cliente, Proyecto y Totales
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Estimado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Estimados Recientes</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título o cliente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            📊 Información completa del proyecto, cliente, contratista y detalles financieros
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RotateCcw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Cargando estimados...</span>
            </div>
          ) : filteredEstimates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron estimados</p>
            </div>
          ) : (
            <div className="">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Estimado</th>
                    <th className="text-left py-3 px-4 font-medium">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium">Proyecto</th>
                    <th className="text-right py-3 px-4 font-medium">Total</th>
                    <th className="text-center py-3 px-4 font-medium">Estado</th>
                    <th className="text-center py-3 px-4 font-medium">Fecha</th>
                    <th className="text-center py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstimates.map((estimate) => (
                    <tr key={estimate.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{estimate.estimateNumber || estimate.title}</div>
                        <div className="text-sm text-gray-500">
                          {estimate.contractorCompanyName || 'Sin empresa'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{estimate.clientName}</div>
                        <div className="text-sm text-gray-500">
                          {estimate.clientEmail || estimate.clientPhone || 'Sin contacto'}
                        </div>
                        {estimate.clientAddress && (
                          <div className="text-xs text-gray-400 mt-1">
                            {estimate.clientAddress}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {estimate.projectType || 'Proyecto'} 
                          {estimate.itemsCount && ` (${estimate.itemsCount} items)`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {estimate.scope || estimate.projectDescription || 'Sin descripción'}
                        </div>
                        {estimate.timeline && (
                          <div className="text-xs text-gray-400 mt-1">
                            Duración: {estimate.timeline}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold">
                          {formatCurrency(estimate.displayTotal || estimate.total)}
                        </div>
                        {estimate.subtotal && estimate.taxAmount && (
                          <div className="text-sm text-gray-500">
                            Subtotal: {formatCurrency(estimate.subtotal)}<br/>
                            Impuesto: {formatCurrency(estimate.taxAmount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          variant={
                            estimate.status === 'approved' ? 'default' :
                            estimate.status === 'sent' ? 'secondary' :
                            estimate.status === 'rejected' ? 'destructive' : 'outline'
                          }
                        >
                          {estimate.status === 'draft' && 'Borrador'}
                          {estimate.status === 'sent' && 'Enviado'}
                          {estimate.status === 'approved' && 'Aprobado'}
                          {estimate.status === 'rejected' && 'Rechazado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {formatDate(estimate.createdAt)}
                        {estimate.validUntil && (
                          <div className="text-xs text-gray-400">
                            Válido hasta: {formatDate(new Date(estimate.validUntil))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEstimate(estimate.id)}
                            disabled={isPreviewLoading}
                            title="Vista previa con sistema unificado"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(estimate.id)}
                            disabled={isPdfLoading}
                            title="PDF idéntico al preview"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(estimate.id)}
                            title="Enviar por email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para vista previa con sistema unificado */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>🎯 Vista Previa - Sistema Unificado</DialogTitle>
            <DialogDescription>
              Este preview usa exactamente la misma plantilla que el PDF final.
              Lo que ves aquí es exactamente lo que obtendrás en el PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="page-container">
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border rounded"
                title="Vista previa del estimado"
              />
            ) : (
              <div className="flex justify-center items-center h-full">
                <RotateCcw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Generando preview...</span>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => currentEstimateId && handleSendEmail(currentEstimateId)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar Email
              </Button>
              <Button
                onClick={() => currentEstimateId && handleDownloadPDF(currentEstimateId)}
                disabled={isPdfLoading}
                className="bg-primary hover:bg-primary/90"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isPdfLoading ? 'Generando...' : 'Descargar PDF Idéntico'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}