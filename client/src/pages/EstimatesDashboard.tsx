import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'wouter';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Icons
import {
  PlusCircle,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  ArrowDownUp,
  Search,
  Filter
} from 'lucide-react';

// Firebase
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Interfaces
interface Estimate {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt?: Date;
}

// Color palette for status
const STATUS_COLORS = {
  draft: '#8884d8',
  sent: '#FFBB28',
  approved: '#00C49F',
  rejected: '#FF8042'
};

export default function EstimatesDashboard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // States
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'total' | 'clientName'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Load estimates
  useEffect(() => {
    if (!currentUser) return;
    
    const loadEstimates = async () => {
      setIsLoading(true);
      
      try {
        // Query estimates from Firestore
        const estimatesRef = collection(db, 'estimates');
        const estimatesQuery = query(
          estimatesRef, 
          where('userId', '==', currentUser.uid)
        );
        
        const estimatesSnapshot = await getDocs(estimatesQuery);
        
        const estimatesData: Estimate[] = [];
        estimatesSnapshot.forEach((doc) => {
          const data = doc.data();
          estimatesData.push({
            id: doc.id,
            title: data.title || 'Sin título',
            clientName: data.client?.name || 'Sin cliente',
            clientId: data.clientId || '',
            total: typeof data.total === 'number' ? data.total : 0,
            status: data.status || 'draft',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined
          });
        });
        
        // Sort by most recent first as default
        const sortedEstimates = estimatesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setEstimates(sortedEstimates);
        setFilteredEstimates(sortedEstimates);
      } catch (error) {
        console.error('Error loading estimates:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los estimados.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEstimates();
  }, [currentUser, toast]);
  
  // Filter and sort estimates
  useEffect(() => {
    if (!estimates.length) return;
    
    let result = [...estimates];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(estimate => estimate.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        estimate => 
          estimate.title.toLowerCase().includes(term) || 
          estimate.clientName.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortField) {
        case 'total':
          return sortDirection === 'asc' ? a.total - b.total : b.total - a.total;
        case 'clientName':
          return sortDirection === 'asc' 
            ? a.clientName.localeCompare(b.clientName) 
            : b.clientName.localeCompare(a.clientName);
        case 'createdAt':
        default:
          return sortDirection === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
    
    setFilteredEstimates(result);
  }, [estimates, searchTerm, statusFilter, sortField, sortDirection]);
  
  // Calculate metrics
  const metrics = React.useMemo(() => {
    const totalCount = estimates.length;
    const activeCount = estimates.filter(e => e.status === 'sent' || e.status === 'approved').length;
    const draftCount = estimates.filter(e => e.status === 'draft').length;
    const approvedCount = estimates.filter(e => e.status === 'approved').length;
    const totalValue = estimates.reduce((sum, e) => sum + e.total, 0);
    
    return { totalCount, activeCount, draftCount, approvedCount, totalValue };
  }, [estimates]);
  
  // Get data for pie chart
  const estimatesByStatus = React.useMemo(() => {
    return [
      { name: 'Borradores', value: estimates.filter(e => e.status === 'draft').length, color: STATUS_COLORS.draft },
      { name: 'Enviados', value: estimates.filter(e => e.status === 'sent').length, color: STATUS_COLORS.sent },
      { name: 'Aprobados', value: estimates.filter(e => e.status === 'approved').length, color: STATUS_COLORS.approved },
      { name: 'Rechazados', value: estimates.filter(e => e.status === 'rejected').length, color: STATUS_COLORS.rejected }
    ].filter(item => item.value > 0); // Only show statuses with at least one estimate
  }, [estimates]);
  
  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };
  
  // Get status style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="h-4 w-4 mr-1" /> };
      case 'sent':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <FileText className="h-4 w-4 mr-1" /> };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="h-4 w-4 mr-1" /> };
      case 'draft':
      default:
        return { bg: 'bg-purple-100', text: 'text-purple-800', icon: <FileText className="h-4 w-4 mr-1" /> };
    }
  };
  
  // Handle sort toggle
  const handleSortChange = (field: 'createdAt' | 'total' | 'clientName') => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to desc for new fields
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Get status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviado';
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <div className="text-center">
          <RotateCcw className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando estimados...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 backdrop-blur-sm bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50 p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">Estimados</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y visualiza tus estimados para clientes
          </p>
        </div>
        <Link href="/estimates/new">
          <Button className="min-w-[200px] bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Crear Nuevo Estimado
          </Button>
        </Link>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="py-4 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600"></div>
            <CardTitle className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              {metrics.totalCount}
            </CardTitle>
            <CardDescription className="text-md font-medium">
              Total de Estimados
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="py-4 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600"></div>
            <CardTitle className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
              {metrics.draftCount}
            </CardTitle>
            <CardDescription className="text-md font-medium">
              Borradores
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="py-4 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-600"></div>
            <CardTitle className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-yellow-600">
              {metrics.activeCount}
            </CardTitle>
            <CardDescription className="text-md font-medium">
              Enviados/Activos
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="py-4 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-green-600"></div>
            <CardTitle className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-teal-600">
              {metrics.approvedCount}
            </CardTitle>
            <CardDescription className="text-md font-medium">
              Aprobados
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      {/* Status Distribution Chart */}
      {estimatesByStatus.length > 0 && (
        <Card className="mb-8 overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
              Distribución por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estimatesByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {estimatesByStatus.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} estimados`, '']} 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                      border: 'none',
                      background: 'rgba(255,255,255,0.95)'
                    }}
                  />
                  <Legend 
                    iconType="circle" 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ paddingTop: '20px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Filters */}
      <Card className="mb-8 overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
            Filtros y Ordenamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 dark:text-blue-400" />
                <Input
                  placeholder="Buscar por cliente o título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 border-blue-100 dark:border-blue-900 focus:border-blue-300 bg-blue-50/30 dark:bg-blue-900/20 focus:ring-blue-200"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/20 px-3 py-2 text-sm focus:border-blue-300 focus:ring-blue-200"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borradores</option>
                <option value="sent">Enviados</option>
                <option value="approved">Aprobados</option>
                <option value="rejected">Rechazados</option>
              </select>
              
              <Button
                variant="outline"
                className="gap-1 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                onClick={() => handleSortChange('createdAt')}
              >
                <ArrowDownUp className="h-4 w-4 text-blue-500" />
                Fecha {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              
              <Button
                variant="outline"
                className="gap-1 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                onClick={() => handleSortChange('total')}
              >
                <ArrowDownUp className="h-4 w-4 text-blue-500" />
                Total {sortField === 'total' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Estimates List */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
            Tus Estimados
          </CardTitle>
          <CardDescription>
            {filteredEstimates.length} estimados encontrados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEstimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-medium mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                No hay estimados disponibles
              </h3>
              {searchTerm || statusFilter !== 'all' ? (
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Prueba ajustando los filtros de búsqueda para encontrar lo que necesitas
                </p>
              ) : (
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Crea tu primer estimado para comenzar a llevar un control de tus proyectos
                </p>
              )}
              <Link href="/estimates/new">
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Crear Nuevo Estimado
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border-b-0">
                    <TableHead className="font-semibold">Título</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="text-right font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstimates.map((estimate, index) => {
                    const statusStyle = getStatusStyle(estimate.status);
                    const isEven = index % 2 === 0;
                    
                    return (
                      <TableRow 
                        key={estimate.id} 
                        className={`${isEven ? 'bg-slate-50/70 dark:bg-slate-800/30' : 'bg-white/70 dark:bg-slate-900/30'} hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors`}
                      >
                        <TableCell className="font-medium">{estimate.title}</TableCell>
                        <TableCell>{estimate.clientName}</TableCell>
                        <TableCell>{formatDate(estimate.createdAt)}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} shadow-sm`}>
                            {statusStyle.icon}
                            {getStatusLabel(estimate.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(estimate.total)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/estimates/${estimate.id}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                            >
                              <ChevronRight className="h-4 w-4 text-blue-500" />
                              Ver
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}