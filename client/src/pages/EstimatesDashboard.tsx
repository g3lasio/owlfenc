import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, getEstimates as fetchEstimates, getEstimateById } from '../lib/firebase';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileDown, 
  Mail, 
  Eye, 
  Plus, 
  Search,
  CalendarCheck,
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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Load estimates from Firestore
  useEffect(() => {
    const loadEstimates = async () => {
      if (!currentUser) {
        console.log('No hay usuario autenticado, no se pueden cargar estimados');
        return;
      }
      
      console.log('Cargando estimados para usuario:', currentUser.uid);
      setIsLoading(true);
      try {
        console.log('Utilizando la función fetchEstimates para cargar estimados');
        // Usar nuestra función optimizada para cargar estimados
        const userEstimates = await fetchEstimates(currentUser.uid);
        console.log('Consulta ejecutada, verificando resultados...');
        const estimatesList: Estimate[] = [];
        
        if (!userEstimates || userEstimates.length === 0) {
          console.log('No se encontraron estimados para este usuario');
        } else {
          console.log(`Se encontraron ${userEstimates.length} estimados`);
          
          userEstimates.forEach((estimate: any) => {
            console.log('Datos del estimado recuperados:', { id: estimate.id, data: estimate });
            
            // Convertir timestamps a fechas
            const createdAt = estimate.createdAt?.toDate ? estimate.createdAt.toDate() : new Date();
            const updatedAt = estimate.updatedAt?.toDate ? estimate.updatedAt.toDate() : new Date();
            
            estimatesList.push({
              id: estimate.id,
              title: estimate.title || 'Sin título',
              clientId: estimate.clientId || '',
              clientName: estimate.clientName || estimate.client?.name || 'Cliente no especificado',
              total: estimate.total || 0,
              status: estimate.status || 'draft',
              createdAt: createdAt,
              updatedAt: updatedAt
            });
          });
        }
        
        setEstimates(estimatesList);
        setFilteredEstimates(estimatesList);
      } catch (error) {
        console.error('Error loading estimates:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los estimados. Por favor, intenta de nuevo.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEstimates();
  }, [currentUser, toast]);
  
  // Filter estimates based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEstimates(estimates);
      return;
    }
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = estimates.filter(
      (estimate) =>
        estimate.title.toLowerCase().includes(lowerCaseSearch) ||
        estimate.clientName.toLowerCase().includes(lowerCaseSearch)
    );
    
    setFilteredEstimates(filtered);
  }, [searchTerm, estimates]);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Borrador</Badge>;
      case 'sent':
        return <Badge variant="secondary">Enviado</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">Borrador</Badge>;
    }
  };
  
  // Estado para el diálogo de vista previa
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(null);
  
  // Handler for View Estimate
  const handleViewEstimate = async (estimateId: string) => {
    try {
      setIsPreviewLoading(true);
      setCurrentEstimateId(estimateId);
      console.log('🔍 [PREVIEW] Iniciando carga de estimado:', estimateId);
      
      toast({
        title: "Cargando estimado",
        description: "Obteniendo detalles del estimado...",
      });
      
      const startTime = Date.now();
      console.log('📊 [PREVIEW] Solicitando datos del estimado...');
      
      // Obtener los datos del estimado
      const estimateData = await getEstimateById(estimateId);
      
      console.log('⏱️ [PREVIEW] Datos obtenidos en:', Date.now() - startTime, 'ms');
      console.log('📋 [PREVIEW] Datos del estimado:', estimateData);
      
      if (!estimateData) {
        throw new Error("Estimado no encontrado");
      }

      // 🎯 USAR SISTEMA UNIFICADO: Garantiza consistencia total preview-PDF
      console.log('🔧 [PREVIEW] Cargando datos de la empresa...');
      const companyDataTime = Date.now();
      
      // Obtener datos de la empresa del perfil del usuario
      let companyData = {};
      try {
        const profile = localStorage.getItem('contractorProfile');
        if (profile) {
          companyData = JSON.parse(profile);
          console.log('✅ [PREVIEW] Datos de empresa obtenidos del localStorage');
        }
      } catch (error) {
        console.warn('⚠️ [PREVIEW] Error obteniendo datos de empresa:', error);
      }
      
      console.log('⏱️ [PREVIEW] Datos de empresa en:', Date.now() - companyDataTime, 'ms');
      
      // Importar y usar el sistema unificado
      console.log('🎨 [PREVIEW] Generando HTML con sistema unificado...');
      const templateTime = Date.now();
      
      // Usar el sistema unificado para garantizar consistencia total
      const { generateUnifiedEstimateHTML, convertEstimateDataToTemplate } = await import('../lib/unified-estimate-template');
      
      // Convertir datos al formato de plantilla
      const templateData = convertEstimateDataToTemplate(estimateData, companyData);
      
      // Generar HTML usando exactamente la misma plantilla que usará el PDF
      const html = generateUnifiedEstimateHTML(templateData);
      
      console.log('⏱️ [PREVIEW] HTML generado en:', Date.now() - templateTime, 'ms');
      console.log('✅ [PREVIEW] Sistema unificado garantiza consistencia preview-PDF');
      
      // Establecer el HTML para la vista previa
      setPreviewHtml(html);
      setShowPreviewDialog(true);
      
      console.log('🎯 [PREVIEW] Preview completado exitosamente en:', Date.now() - startTime, 'ms');
      
      toast({
        title: "Vista previa lista",
        description: "Estimado cargado correctamente.",
      });
      
    } catch (error) {
      console.error('❌ [PREVIEW] Error cargando estimado:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la vista previa del estimado.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Handler for PDF Download with detailed logging
  const handleDownloadPDF = async (estimateId: string) => {
    try {
      console.log('📄 [PDF] Iniciando descarga de PDF para:', estimateId);
      const startTime = Date.now();
      
      setIsPdfLoading(true);
      
      toast({
        title: "Generando PDF",
        description: "Preparando documento para descarga...",
      });
      
      console.log('📊 [PDF] Obteniendo datos del estimado...');
      const dataTime = Date.now();
      
      // Obtener datos del estimado
      const estimateData = await getEstimateById(estimateId);
      if (!estimateData) {
        throw new Error("Estimado no encontrado");
      }
      
      console.log('⏱️ [PDF] Datos obtenidos en:', Date.now() - dataTime, 'ms');
      
      // Obtener datos de la empresa
      console.log('🏢 [PDF] Obteniendo datos de empresa...');
      const companyDataTime = Date.now();
      
      let companyData = {};
      try {
        const profile = localStorage.getItem('contractorProfile');
        if (profile) {
          companyData = JSON.parse(profile);
          console.log('✅ [PDF] Datos de empresa del localStorage');
        }
      } catch (error) {
        console.warn('⚠️ [PDF] Error obteniendo datos de empresa:', error);
      }
      
      console.log('⏱️ [PDF] Datos de empresa en:', Date.now() - companyDataTime, 'ms');
      
      // 🎯 USAR SISTEMA UNIFICADO: Garantiza que el PDF sea idéntico al preview
      console.log('🎨 [PDF] Generando HTML con sistema unificado...');
      const templateTime = Date.now();
      
      const { generateUnifiedEstimateHTML, convertEstimateDataToTemplate } = await import('../lib/unified-estimate-template');
      
      // Convertir datos usando exactamente el mismo proceso que el preview
      const templateData = convertEstimateDataToTemplate(estimateData, companyData);
      
      // Generar HTML idéntico al preview
      const html = generateUnifiedEstimateHTML(templateData);
      
      console.log('⏱️ [PDF] HTML generado en:', Date.now() - templateTime, 'ms');
      console.log('✅ [PDF] HTML idéntico al preview garantizado');
      
      // Solicitar generación de PDF al servidor
      console.log('🔄 [PDF] Enviando solicitud al servidor...');
      const requestTime = Date.now();
      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          html,
          title: estimateData.title || 'Estimado',
          estimateId 
        }),
      });
      
      console.log('⏱️ [PDF] Respuesta del servidor en:', Date.now() - requestTime, 'ms');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [PDF] Error del servidor:', errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      console.log('📥 [PDF] Descargando archivo...');
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
      
      console.log('⏱️ [PDF] Descarga completada en:', Date.now() - downloadTime, 'ms');
      console.log('🎯 [PDF] Proceso total completado en:', Date.now() - startTime, 'ms');
      
      toast({
        title: "PDF descargado",
        description: "El estimado se ha descargado exitosamente.",
      });
      
    } catch (error) {
      console.error('❌ [PDF] Error generando PDF:', error);
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
    console.log('📧 Enviando email para estimado:', estimateId);
    toast({
      title: "Funcionalidad próximamente",
      description: "El envío por email estará disponible pronto.",
    });
  };

  const handleEditEstimate = (estimateId: string) => {
    console.log('✏️ Editando estimado:', estimateId);
    // navigate(`/estimates/edit/${estimateId}`);
  };

  const navigate = (path: string) => {
    console.log('🔗 Navegando a:', path);
    // Implementar navegación cuando sea necesaria
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
          <p className="text-gray-600 mt-2">Gestiona y visualiza todos tus estimados profesionales</p>
        </div>
        <Button 
          onClick={() => navigate('/estimates/new')}
          className="bg-primary hover:bg-primary/90"
        >
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
            Visualiza todos tus estimados y su estado actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RotateCcw className="h-8 w-8 animate-spin text-primary" />
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(estimate.id)}
                            disabled={isPdfLoading}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(estimate.id)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEstimate(estimate.id)}
                          >
                            <Edit className="h-4 w-4" />
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

      {/* Dialog para vista previa */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa del Estimado</DialogTitle>
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
              </div>
            )}
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
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
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EstimatesDashboard;
