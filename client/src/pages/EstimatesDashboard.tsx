import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
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
        const estimatesRef = collection(db, 'estimates');
        console.log('Colección de estimados referenciada:', { path: estimatesRef.path });
        
        const userEstimatesQuery = query(
          estimatesRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        console.log('Consulta preparada para user ID:', currentUser.uid);
        
        const snapshot = await getDocs(userEstimatesQuery);
        console.log('Consulta ejecutada, verificando resultados...');
        const estimatesList: Estimate[] = [];
        
        if (snapshot.empty) {
          console.log('No se encontraron estimados para este usuario');
        } else {
          console.log(`Se encontraron ${snapshot.size} estimados`);
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Datos del estimado recuperados:', { id: doc.id, data });
            
            // Convertir timestamps a fechas
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
            const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();
            
            estimatesList.push({
              id: doc.id,
              title: data.title || 'Sin título',
              clientId: data.clientId || '',
              clientName: data.clientName || data.client?.name || 'Cliente no especificado',
              total: data.total || 0,
              status: data.status || 'draft',
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
                          <Button variant="ghost" size="icon" title="Ver estimado">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Descargar PDF">
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Enviar por email">
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