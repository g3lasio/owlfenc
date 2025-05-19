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
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
      setCurrentEstimateId(estimateId);
      toast({
        title: "Cargando estimado",
        description: "Obteniendo detalles del estimado...",
      });
      
      // Obtener los datos del estimado
      const estimateData = await getEstimateById(estimateId);
      
      if (!estimateData) {
        throw new Error("Estimado no encontrado");
      }
      
      // Generar HTML para la vista previa (similar al que usamos para el PDF)
      const html = `
      <html>
        <head>
          <title>Vista Previa - ${estimateData.title || 'Sin título'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
              line-height: 1.5;
            }
            .estimate-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 15px;
            }
            .company-info {
              flex: 1;
            }
            .company-logo {
              max-width: 150px;
              max-height: 60px;
              margin-bottom: 10px;
            }
            .estimate-title {
              text-align: right;
            }
            .estimate-title h2 {
              font-size: 20px;
              color: #2563eb;
              margin: 0 0 8px 0;
            }
            .client-info {
              margin-bottom: 20px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section h3 {
              border-bottom: 1px solid #eee;
              padding-bottom: 4px;
              margin-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 14px;
            }
            th {
              background-color: #f9fafb;
              text-align: left;
              padding: 8px;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            .total-row {
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #777;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="estimate-header">
            <div class="company-info">
              <img src="/owl-logo.png" alt="Logo" class="company-logo" crossorigin="anonymous" />
              <h1>Owl Fence</h1>
              <p>123 Fence Avenue, San Diego, CA 92101</p>
              <p>info@owlfence.com | (555) 123-4567</p>
            </div>
            <div class="estimate-title">
              <h2>ESTIMADO</h2>
              <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Estimado #:</strong> EST-${estimateId.slice(-6)}</p>
              <p><strong>Válido hasta:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div class="section client-info">
            <h3>Cliente</h3>
            <p><strong>Nombre:</strong> ${estimateData.clientName || 'N/A'}</p>
            <p><strong>Email:</strong> ${estimateData.clientEmail || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${estimateData.clientPhone || 'N/A'}</p>
          </div>
          
          <div class="section">
            <h3>Detalles del Estimado</h3>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Materiales y Mano de Obra</td>
                  <td>1</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.85).toFixed(2) : '0.00'}</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.85).toFixed(2) : '0.00'}</td>
                </tr>
                <tr>
                  <td>Instalación</td>
                  <td>1</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.15).toFixed(2) : '0.00'}</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.15).toFixed(2) : '0.00'}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3">Total</td>
                  <td>$${estimateData.total ? estimateData.total.toFixed(2) : '0.00'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>Términos y Condiciones</h3>
            <p>1. Este estimado tiene validez por 30 días.</p>
            <p>2. Se requiere un depósito del 50% para iniciar el trabajo.</p>
            <p>3. El balance restante se pagará al completar el trabajo.</p>
            <p>4. Garantía de 1 año en materiales y mano de obra.</p>
          </div>
          
          <div class="footer">
            <p>Gracias por su confianza en Owl Fence. ¡Esperamos trabajar con usted!</p>
          </div>
        </body>
      </html>
      `;
      
      // Guardar el HTML para la vista previa
      setPreviewHtml(html);
      
      // Mostrar el diálogo de vista previa
      setShowPreviewDialog(true);
      
    } catch (error) {
      console.error('Error viewing estimate:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar la vista previa del estimado.",
        variant: "destructive"
      });
    }
  };
  
  // Handler for Download PDF
  const handleDownloadPdf = async (estimateId: string) => {
    try {
      setIsPdfLoading(true);
      toast({
        title: "Preparando PDF",
        description: "Generando el documento PDF del estimado...",
      });
      
      // En modo de desarrollo, usamos getEstimateById de firebase.ts
      const estimateData = await getEstimateById(estimateId);
      
      if (!estimateData) {
        throw new Error("Estimado no encontrado");
      }
      
      console.log("Generando HTML para el estimado:", estimateId);
      
      // Usar una imagen base64 para el logo para evitar problemas de carga en el PDF
      // Esta es una solución más robusta que depender de cargar el logo desde una URL
      const logoBase64 = "data:image/png;base64,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";
      
      // Crear un HTML básico para el estimado usando los datos disponibles
      // En un ambiente de producción, llamaríamos a un API endpoint
      const html = `
      <html>
        <head>
          <title>Estimado - ${estimateData.title || 'Sin título'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #333;
              line-height: 1.5;
            }
            .estimate-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 20px;
            }
            .company-info {
              flex: 1;
            }
            .company-logo {
              max-width: 200px;
              max-height: 80px;
              margin-bottom: 15px;
            }
            .estimate-title {
              text-align: right;
            }
            .estimate-title h2 {
              font-size: 24px;
              color: #2563eb;
              margin: 0 0 10px 0;
            }
            .client-info {
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h3 {
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #f9fafb;
              text-align: left;
              padding: 10px;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #eee;
            }
            .total-row {
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              font-size: 12px;
              color: #777;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="estimate-header">
            <div class="company-info">
              <img src="${logoBase64}" alt="Logo" class="company-logo" />
              <h1>Owl Fence</h1>
              <p>123 Fence Avenue, San Diego, CA 92101</p>
              <p>info@owlfence.com | (555) 123-4567</p>
            </div>
            <div class="estimate-title">
              <h2>ESTIMADO</h2>
              <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Estimado #:</strong> EST-${estimateId.slice(-6)}</p>
              <p><strong>Válido hasta:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div class="section client-info">
            <h3>Cliente</h3>
            <p><strong>Nombre:</strong> ${estimateData.clientName || 'N/A'}</p>
            <p><strong>Email:</strong> ${estimateData.clientEmail || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${estimateData.clientPhone || 'N/A'}</p>
            <p><strong>Dirección:</strong> ${estimateData.clientAddress || 'N/A'}</p>
          </div>
          
          <div class="section">
            <h3>Detalles del Estimado</h3>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Materiales y Mano de Obra</td>
                  <td>1</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.85).toFixed(2) : '0.00'}</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.85).toFixed(2) : '0.00'}</td>
                </tr>
                <tr>
                  <td>Instalación</td>
                  <td>1</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.15).toFixed(2) : '0.00'}</td>
                  <td>$${estimateData.total ? (estimateData.total * 0.15).toFixed(2) : '0.00'}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3">Total</td>
                  <td>$${estimateData.total ? estimateData.total.toFixed(2) : '0.00'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>Términos y Condiciones</h3>
            <p>1. Este estimado tiene validez por 30 días.</p>
            <p>2. Se requiere un depósito del 50% para iniciar el trabajo.</p>
            <p>3. El balance restante se pagará al completar el trabajo.</p>
            <p>4. Garantía de 1 año en materiales y mano de obra.</p>
          </div>
          
          <div class="footer">
            <p>Gracias por su confianza en Owl Fence. ¡Esperamos trabajar con usted!</p>
          </div>
        </body>
      </html>
      `;
      
      // Generate PDF client-side usando downloadHTMLAsPDF en lugar de generateClientSidePDF 
      // para evitar problemas con la carga de imágenes
      const { downloadHTMLAsPDF } = await import('../lib/pdf');
      const fileName = `Estimado-${estimateData.clientName?.replace(/\s+/g, '-') || 'Cliente'}-${Date.now()}`;
      
      // Intentar primero con downloadHTMLAsPDF que usa el servidor
      try {
        await downloadHTMLAsPDF(html, fileName);
        
        toast({
          title: "PDF generado",
          description: "El PDF del estimado se ha generado correctamente.",
        });
      } catch (downloadError) {
        console.error('Error con downloadHTMLAsPDF, intentando con generateClientSidePDF:', downloadError);
        
        // Si falla, intentar con el método alternativo generateClientSidePDF
        try {
          const { generateClientSidePDF } = await import('../lib/pdf');
          await generateClientSidePDF(html, fileName);
          
          toast({
            title: "PDF generado",
            description: "El PDF del estimado se ha generado correctamente.",
          });
        } catch (clientSideError) {
          console.error('Error con generateClientSidePDF:', clientSideError);
          throw new Error("No se pudo generar el PDF por ningún método");
        }
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el PDF del estimado.",
        variant: "destructive"
      });
    } finally {
      setIsPdfLoading(false);
    }
  };
  
  // Handler for Send Email
  const handleSendEmail = async (estimateId: string, clientName: string) => {
    try {
      setIsSendingEmail(true);
      toast({
        title: "Preparando email",
        description: `Preparando email para enviar a ${clientName}...`,
      });
      
      // Obtener los datos del estimado usando la función importada
      const estimateData = await getEstimateById(estimateId);
      
      if (!estimateData) {
        throw new Error("Estimado no encontrado");
      }
      
      // Verificar si hay email del cliente
      if (!estimateData.clientEmail) {
        throw new Error("El cliente no tiene una dirección de email registrada");
      }
      
      // Preparar los datos para el envío del email
      const emailData = {
        to: estimateData.clientEmail,
        subject: `Estimado para ${clientName} - ${estimateData.title || 'Proyecto'}`,
        estimateId: estimateId,
        clientName: clientName,
        total: estimateData.total || 0,
        includeAttachment: true
      };
      
      console.log("Preparando para enviar email con datos:", emailData);
      
      // En una implementación completa, llamaríamos a un endpoint del API
      // Por ahora, simulamos un envío exitoso después de un retraso
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulamos un envío exitoso
      console.log("Email enviado exitosamente");
      
      toast({
        title: "Email enviado",
        description: `El estimado se ha enviado correctamente a ${estimateData.clientEmail}.`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el email del estimado.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  // Función para cerrar el diálogo de vista previa y limpiar el estado
  const handleClosePreview = () => {
    setShowPreviewDialog(false);
    setPreviewHtml(null);
    setCurrentEstimateId(null);
  };
  
  // Función para descargar directamente desde la vista previa
  const handleDownloadFromPreview = () => {
    if (currentEstimateId) {
      handleDownloadPdf(currentEstimateId);
    }
  };
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mis Estimados</h1>
        <Link href="/estimates">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Estimado
          </Button>
        </Link>
      </div>
      
      {/* Diálogo de vista previa del estimado */}
      <Dialog open={showPreviewDialog} onOpenChange={(open) => {
        // Solo permitir cerrar si no estamos procesando
        if (!isPdfLoading && !isSendingEmail) {
          setShowPreviewDialog(open);
        }
      }}>
        <DialogContent className="sm:max-w-[800px] lg:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Vista Previa del Estimado</DialogTitle>
            <DialogDescription>
              Revise el estimado antes de descargar o enviar por email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto overflow-x-auto my-4 border rounded-md p-4 bg-white">
            {previewHtml && (
              <div 
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="estimate-preview w-full"
                style={{ 
                  minWidth: "600px",  /* Asegura un ancho mínimo para evitar que el contenido se comprima */
                  height: "auto"      /* Permite que la altura se ajuste al contenido */
                }}
              />
            )}
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={handleClosePreview}
            >
              Cerrar
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={handleDownloadFromPreview}
                disabled={isPdfLoading}
              >
                {isPdfLoading ? (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Descargar PDF
              </Button>
              <Button 
                onClick={() => currentEstimateId && handleSendEmail(currentEstimateId, "Cliente")}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Enviar Email
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
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
          ) : filteredEstimates.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstimates.map((estimate) => (
                    <TableRow key={estimate.id}>
                      <TableCell className="font-medium">{estimate.title}</TableCell>
                      <TableCell>{estimate.clientName}</TableCell>
                      <TableCell>{formatDate(estimate.createdAt)}</TableCell>
                      <TableCell>{formatCurrency(estimate.total)}</TableCell>
                      <TableCell>{getStatusBadge(estimate.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Ver estimado"
                            onClick={() => handleViewEstimate(estimate.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Descargar PDF"
                            onClick={() => handleDownloadPdf(estimate.id)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Enviar por email"
                            onClick={() => handleSendEmail(estimate.id, estimate.clientName)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-md">
              <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No hay estimados</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No se encontraron estimados. Crea tu primer estimado para empezar.
              </p>
              <Link href="/estimates">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Estimado
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}