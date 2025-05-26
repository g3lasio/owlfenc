import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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

// Types
interface Estimate {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
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

  // 📄 DESCARGA PDF CON SISTEMA UNIFICADO - Garantiza identidad con preview
  const handleDownloadPDF = async (estimateId: string) => {
    try {
      setIsPdfLoading(true);
      console.log('📄 [UNIFIED-PDF] Iniciando descarga:', estimateId);
      
      const startTime = Date.now();
      
      toast({
        title: "Generando PDF",
        description: "Usando la misma plantilla del preview para garantizar identidad...",
      });
      
      // Obtener datos del estimado (mismo proceso que preview)
      const estimateData = await getEstimateById(estimateId);
      if (!estimateData) throw new Error("Estimado no encontrado");
      
      // Obtener datos de la empresa (mismo proceso que preview)
      let companyData = {};
      try {
        const profile = localStorage.getItem('contractorProfile');
        if (profile) companyData = JSON.parse(profile);
      } catch (error) {
        console.warn('⚠️ [UNIFIED-PDF] Usando datos por defecto');
      }
      
      // 🎯 USAR EXACTAMENTE LA MISMA PLANTILLA QUE EL PREVIEW
      const { generateUnifiedEstimateHTML, convertEstimateDataToTemplate } = 
        await import('../lib/unified-estimate-template');
      
      // Mismo proceso de conversión que en el preview
      const templateData = convertEstimateDataToTemplate(estimateData, companyData);
      const html = generateUnifiedEstimateHTML(templateData);
      
      console.log('✅ [UNIFIED-PDF] HTML idéntico al preview generado');
      
      // Solicitar PDF al servidor con logging de rendimiento
      console.log('🔄 [UNIFIED-PDF] Enviando a servidor...');
      const requestTime = Date.now();
      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html,
          title: estimateData.title || 'Estimado',
          estimateId 
        }),
      });
      
      console.log('⏱️ [UNIFIED-PDF] Respuesta del servidor en:', Date.now() - requestTime, 'ms');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [UNIFIED-PDF] Error del servidor:', errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      // Descargar el archivo
      console.log('📥 [UNIFIED-PDF] Descargando archivo...');
      const downloadTime = Date.now();
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `estimado-${estimateData.title || 'documento'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('⏱️ [UNIFIED-PDF] Descarga completada en:', Date.now() - downloadTime, 'ms');
      console.log('🎯 [UNIFIED-PDF] Proceso total completado en:', Date.now() - startTime, 'ms');
      
      toast({
        title: "PDF descargado exitosamente",
        description: "El documento es exactamente idéntico al preview mostrado.",
      });
      
    } catch (error) {
      console.error('❌ [UNIFIED-PDF] Error:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intente nuevamente.",
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
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredEstimates = estimates.filter(estimate =>
    estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Estimados</h1>
          <p className="text-gray-600 mt-2">
            ✅ Sistema unificado garantiza preview-PDF idénticos
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
            🎯 Preview y PDF garantizados idénticos con sistema unificado
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Título</th>
                    <th className="text-left py-3 px-4 font-medium">Cliente</th>
                    <th className="text-right py-3 px-4 font-medium">Total</th>
                    <th className="text-center py-3 px-4 font-medium">Estado</th>
                    <th className="text-center py-3 px-4 font-medium">Fecha</th>
                    <th className="text-center py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstimates.map((estimate) => (
                    <tr key={estimate.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{estimate.title}</td>
                      <td className="py-3 px-4">{estimate.clientName}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(estimate.total)}
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
          <div className="flex-1 overflow-auto">
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