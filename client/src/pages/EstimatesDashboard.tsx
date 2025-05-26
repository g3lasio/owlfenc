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
      // Logo en base64 para garantizar que siempre se cargue (pequeño logo genérico)
      const defaultLogoBase64 = 'data:image/png;base64,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';
      
      // Intentamos preparar el logo personalizado si está disponible
      let logoSrc = defaultLogoBase64;
      
      const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vista Previa - ${estimateData.title || 'Sin título'}</title>
          <style>
            @page {
              size: letter;
              margin: 25mm 20mm; /* Márgenes superior/inferior y laterales */
            }
            html, body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
              line-height: 1.6;
              font-size: 11pt;
              background-color: #ffffff;
            }
            body {
              padding: 0;
              box-sizing: border-box;
            }
            * {
              box-sizing: border-box;
            }
            h1 {
              font-size: 22pt;
              margin: 0 0 8px 0;
              color: #2a3f5f;
            }
            h2 {
              font-size: 18pt;
              margin: 0 0 8px 0;
              color: #2563eb;
            }
            h3 {
              font-size: 14pt;
              margin: 0 0 8px 0;
              color: #2a3f5f;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            p {
              margin: 0 0 8px 0;
            }
            /* Layout principal */
            .container {
              width: 100%;
              max-width: 100%;
            }
            .estimate-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              border-bottom: 2px solid #eaecef;
              padding-bottom: 20px;
            }
            .company-info {
              flex: 1;
              padding-right: 20px;
            }
            .company-logo {
              max-width: 200px;
              max-height: 70px;
              margin-bottom: 15px;
              object-fit: contain;
            }
            .estimate-title {
              text-align: right;
              flex: 1;
            }
            .estimate-title h2 {
              margin-bottom: 15px;
            }
            .estimate-title p {
              margin-bottom: 7px;
              font-size: 11pt;
            }
            /* Información del cliente */
            .client-info {
              margin-bottom: 25px;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 6px;
            }
            .client-info p {
              margin-bottom: 6px;
            }
            /* Secciones */
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            /* Tabla de estimados */
            .estimate-table-container {
              margin-bottom: 15px;
              overflow: visible;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin-bottom: 20px;
            }
            thead {
              background-color: #f0f5ff;
              display: table-header-group; /* Repetir encabezados en nuevas páginas */
            }
            th {
              text-align: left;
              padding: 12px 10px;
              font-weight: 600;
              border-bottom: 2px solid #ddd;
              color: #2a3f5f;
              font-size: 11pt;
            }
            td {
              padding: 12px 10px;
              border-bottom: 1px solid #eaecef;
              vertical-align: top;
              font-size: 11pt;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .total-row {
              font-weight: bold;
              background-color: #f0f5ff !important;
              font-size: 12pt;
            }
            .total-row td {
              border-top: 2px solid #ddd;
              border-bottom: none;
            }
            /* Términos y condiciones */
            .terms {
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 6px;
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .terms p {
              margin-bottom: 5px;
              font-size: 10pt;
            }
            /* Pie de página */
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              font-size: 10pt;
              color: #6c757d;
              text-align: center;
              border-top: 1px solid #eaecef;
              page-break-inside: avoid;
            }
            /* Columnas */
            .columns {
              display: flex;
              justify-content: space-between;
              gap: 20px;
            }
            .column {
              flex: 1;
            }
            /* Responsividad */
            @media print {
              body {
                width: 100%;
                font-size: 11pt;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="estimate-header">
              <div class="company-info">
                <img src="${logoSrc}" alt="Logo" class="company-logo" />
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
            
            <div class="section">
              <h3>Información del Cliente</h3>
              <div class="client-info">
                <div class="columns">
                  <div class="column">
                    <p><strong>Nombre:</strong> ${estimateData.clientName || 'N/A'}</p>
                    <p><strong>Email:</strong> ${estimateData.clientEmail || 'N/A'}</p>
                  </div>
                  <div class="column">
                    <p><strong>Teléfono:</strong> ${estimateData.clientPhone || 'N/A'}</p>
                    <p><strong>Dirección:</strong> ${estimateData.clientAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h3>Detalles del Estimado</h3>
              <div class="estimate-table-container">
                <table>
                  <thead>
                    <tr>
                      <th width="45%">Descripción</th>
                      <th width="15%">Cantidad</th>
                      <th width="20%">Precio unitario</th>
                      <th width="20%">Total</th>
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
                      <td colspan="3"><strong>Total</strong></td>
                      <td><strong>$${estimateData.total ? estimateData.total.toFixed(2) : '0.00'}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="section">
              <h3>Términos y Condiciones</h3>
              <div class="terms">
                <p>1. Este estimado tiene validez por 30 días.</p>
                <p>2. Se requiere un depósito del 50% para iniciar el trabajo.</p>
                <p>3. El balance restante se pagará al completar el trabajo.</p>
                <p>4. Garantía de 1 año en materiales y mano de obra.</p>
                <p>5. Los precios pueden variar si las condiciones del proyecto cambian.</p>
              </div>
            </div>
            
            <div class="footer">
              <p>Gracias por su confianza en Owl Fence. ¡Esperamos trabajar con usted!</p>
              <p>Si tiene alguna pregunta sobre este estimado, no dude en contactarnos.</p>
            </div>
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
    } finally {
      setIsPreviewLoading(false);
    }
  };
  
  // Handler for Download PDF usando el sistema unificado
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
      
      console.log("Generando PDF con sistema unificado para estimado:", estimateId);
      
      // Importar el sistema unificado
      const { downloadEstimatePDF } = await import('../lib/unified-pdf-system');
      
      // Convertir datos de Firebase al formato esperado
      const unifiedData = {
        clientName: estimateData.clientName || 'Cliente',
        clientEmail: estimateData.clientEmail || '',
        clientPhone: estimateData.clientPhone || '',
        clientAddress: estimateData.clientAddress || '',
        projectDescription: estimateData.projectDescription || 'Proyecto de construcción',
        items: estimateData.items?.map(item => ({
          id: item.id || `item_${Date.now()}`,
          name: item.name || 'Artículo',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'unidad',
          price: item.price || 0,
          total: item.total || (item.price * item.quantity) || 0
        })) || [],
        subtotal: estimateData.subtotal || 0,
        tax: estimateData.tax || 0,
        total: estimateData.total || 0,
        notes: estimateData.notes || '',
        estimateNumber: estimateData.estimateNumber || `EST-${Date.now()}`,
        estimateDate: estimateData.estimateDate || new Date().toLocaleDateString('es-ES'),
        contractor: {
          companyName: 'Owl funding',
          name: 'Equipo Profesional',
          email: 'contacto@owlfunding.com',
          phone: '(555) 123-4567',
          address: '123 Business Ave, San Diego, CA 92101',
          website: 'www.owlfunding.com',
          license: 'LIC-12345',
          insurancePolicy: 'INS-67890'
        }
      };
      
      // Usar el sistema unificado para generar el PDF
      await downloadEstimatePDF(unifiedData, `Estimado-${estimateData.clientName?.replace(/\s+/g, '-') || 'Cliente'}-${Date.now()}`);
      
      toast({
        title: "PDF generado",
        description: "El PDF del estimado se ha generado correctamente.",
      });
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el PDF del estimado.",
        variant: "destructive"
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Estimados</h1>
        <Button onClick={() => navigate('/estimates/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Estimado
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar estimados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Estimates List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Cargando estimados...</p>
          </div>
        </div>
      ) : filteredEstimates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay estimados</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No se encontraron estimados que coincidan con tu búsqueda.' : 'Comienza creando tu primer estimado.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => navigate('/estimates/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Estimado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEstimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{estimate.title}</h3>
                    <p className="text-gray-600 mb-2">Cliente: {estimate.clientName}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Total: ${estimate.total.toLocaleString()}</span>
                      <span>•</span>
                      <span>Creado: {formatDate(estimate.createdAt)}</span>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        estimate.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        estimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        estimate.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {estimate.status === 'draft' ? 'Borrador' :
                         estimate.status === 'sent' ? 'Enviado' :
                         estimate.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEstimate(estimate.id)}
                      disabled={isPreviewLoading}
                    >
                      {isPreviewLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(estimate.id)}
                      disabled={isPdfLoading}
                    >
                      {isPdfLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(estimate.id, estimate.clientName)}
                      disabled={isSendingEmail}
                    >
                      {isSendingEmail ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/estimates/edit/${estimate.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Estimado</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}
          <DialogFooter>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreviewDialog(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  if (currentEstimateId) {
                    handleDownloadPdf(currentEstimateId);
                  }
                }}
                disabled={isPdfLoading}
              >
                {isPdfLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descargar PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
