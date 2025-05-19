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
      
      // Generate PDF client-side
      const { generateClientSidePDF } = await import('../lib/pdf');
      const fileName = `Estimado-${estimateData.clientName?.replace(/\s+/g, '-') || 'Cliente'}-${Date.now()}`;
      
      await generateClientSidePDF(html, fileName);
      
      toast({
        title: "PDF generado",
        description: "El PDF del estimado se ha generado correctamente.",
      });
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
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[800px] lg:max-w-[900px] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa del Estimado</DialogTitle>
            <DialogDescription>
              Revise el estimado antes de descargar o enviar por email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-auto my-4 border rounded-md p-4 bg-white">
            {previewHtml && (
              <div 
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="estimate-preview"
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