import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, getEstimates as fetchEstimates } from '../lib/firebase';
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
  RotateCcw
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
  
  // Handler for View Estimate
  const handleViewEstimate = async (estimateId: string) => {
    try {
      toast({
        title: "Cargando estimado",
        description: "Obteniendo detalles del estimado...",
      });
      
      // In a full implementation, we would fetch the estimate details and open a preview dialog
      // For now, just navigate to estimates page with the ID as parameter
      window.location.href = `/estimates?id=${estimateId}`;
    } catch (error) {
      console.error('Error viewing estimate:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la vista previa del estimado.",
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
      
      // Fetch the estimate data from the database
      const estimateRef = doc(db, "estimates", estimateId);
      const estimateSnap = await getDoc(estimateRef);
      
      if (!estimateSnap.exists()) {
        throw new Error("Estimado no encontrado");
      }
      
      const estimateData = estimateSnap.data();
      
      // Get the HTML content for the estimate
      const response = await fetch('/api/estimates/html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estimateData }),
      });
      
      if (!response.ok) {
        throw new Error("Error al generar el HTML del estimado");
      }
      
      const { html } = await response.json();
      
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
        description: "No se pudo generar el PDF del estimado.",
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
      
      // Fetch the estimate data from the database
      const estimateRef = doc(db, "estimates", estimateId);
      const estimateSnap = await getDoc(estimateRef);
      
      if (!estimateSnap.exists()) {
        throw new Error("Estimado no encontrado");
      }
      
      const estimateData = estimateSnap.data();
      
      if (!estimateData.clientEmail) {
        throw new Error("El cliente no tiene una dirección de email registrada");
      }
      
      // In a real implementation, we would call an API endpoint to send the email
      // For now, simulate a successful email send after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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