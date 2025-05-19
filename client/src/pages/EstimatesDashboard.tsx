import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '@/hooks/use-profile';
import { Link } from 'wouter';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

import {
  PlusCircle,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Interfaces
interface EstimateForDashboard {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: Date;
}

// Colores para los gráficos
const COLORS = ['#8884d8', '#FFBB28', '#00C49F', '#FF8042', '#0088FE'];
const STATUS_COLORS = {
  draft: '#8884d8',
  sent: '#FFBB28',
  approved: '#00C49F',
  rejected: '#FF8042'
};

export default function EstimatesDashboard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { profile } = useProfile();
  
  // Estados
  const [isLoading, setIsLoading] = useState(true);
  const [estimates, setEstimates] = useState<EstimateForDashboard[]>([]);
  
  // Cargar estimados existentes
  useEffect(() => {
    if (!currentUser) return;
    
    const loadEstimates = async () => {
      setIsLoading(true);
      
      try {
        // Cargar estimados existentes
        const estimatesRef = collection(db, 'estimates');
        const estimatesQuery = query(estimatesRef, where('userId', '==', currentUser.uid));
        const estimatesSnapshot = await getDocs(estimatesQuery);
        
        const estimatesData: EstimateForDashboard[] = [];
        estimatesSnapshot.forEach((doc) => {
          const data = doc.data();
          estimatesData.push({
            id: doc.id,
            title: data.title || 'Sin título',
            clientName: data.client?.name || 'Sin cliente',
            clientId: data.clientId || '',
            total: typeof data.total === 'number' ? data.total : 0,
            status: data.status || 'draft',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          });
        });
        
        setEstimates(estimatesData);
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
  
  // Métricas calculadas
  const metrics = React.useMemo(() => {
    const totalCount = estimates.length;
    const activeCount = estimates.filter(e => e.status === 'sent' || e.status === 'approved').length;
    const draftCount = estimates.filter(e => e.status === 'draft').length;
    const approvedCount = estimates.filter(e => e.status === 'approved').length;
    const rejectedCount = estimates.filter(e => e.status === 'rejected').length;
    const totalValue = estimates.reduce((sum, e) => sum + e.total, 0);
    const approvedValue = estimates
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.total, 0);

    return {
      totalCount,
      activeCount,
      draftCount,
      approvedCount,
      rejectedCount,
      totalValue,
      approvedValue
    };
  }, [estimates]);

  // Datos para gráfico de estimados por mes
  const estimatesByMonth = React.useMemo(() => {
    const monthData: Record<string, { month: string, count: number, value: number }> = {};
    
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Inicializar últimos 6 meses
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthYear = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthData[monthYear] = { month: monthYear, count: 0, value: 0 };
    }
    
    // Contar estimados por mes
    estimates.forEach(estimate => {
      if (estimate.createdAt) {
        const date = new Date(estimate.createdAt);
        const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
        // Solo contar si está en los últimos 6 meses
        if (monthData[monthYear]) {
          monthData[monthYear].count += 1;
          monthData[monthYear].value += estimate.total;
        }
      }
    });
    
    return Object.values(monthData);
  }, [estimates]);

  // Datos para gráfico de estado de estimados
  const estimatesByStatus = React.useMemo(() => {
    return [
      { name: 'Borradores', value: metrics.draftCount, color: STATUS_COLORS.draft },
      { name: 'Enviados', value: metrics.activeCount - metrics.approvedCount, color: STATUS_COLORS.sent },
      { name: 'Aprobados', value: metrics.approvedCount, color: STATUS_COLORS.approved },
      { name: 'Rechazados', value: metrics.rejectedCount, color: STATUS_COLORS.rejected }
    ];
  }, [metrics]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  // Estimados recientes (últimos 5)
  const recentEstimates = React.useMemo(() => {
    return [...estimates]
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [estimates]);

  // Obtener el color del estado
  const getStatusColor = (status: string): string => {
    return {
      draft: 'bg-purple-100 text-purple-800',
      sent: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }[status] || 'bg-gray-100 text-gray-800';
  };

  // Obtener el nombre del estado
  const getStatusName = (status: string): string => {
    return {
      draft: 'Borrador',
      sent: 'Enviado',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    }[status] || 'Desconocido';
  };
  
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <RotateCcw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      {/* Encabezado con botón de nuevo estimado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Estimados</h1>
          <p className="text-muted-foreground">Visualiza y gestiona todos tus estimados</p>
        </div>
        <Link href="/estimates/new">
          <Button className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Estimado
          </Button>
        </Link>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Estimados</CardDescription>
            <CardTitle className="text-4xl">{metrics.totalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Valor total: {formatCurrency(metrics.totalValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimados Activos</CardDescription>
            <CardTitle className="text-4xl">{metrics.activeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enviados y en proceso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimados Aprobados</CardDescription>
            <CardTitle className="text-4xl">{metrics.approvedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Valor: {formatCurrency(metrics.approvedValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Borradores</CardDescription>
            <CardTitle className="text-4xl">{metrics.draftCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estimados sin enviar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Estimados por Mes</CardTitle>
            <CardDescription>
              Cantidad de estimados generados en los últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={estimatesByMonth}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} estimados`, 'Cantidad']} />
                <Legend />
                <Bar dataKey="count" name="Cantidad" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Estimados</CardTitle>
            <CardDescription>
              Distribución según el estado actual
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estimatesByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {estimatesByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} estimados`, 'Cantidad']} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Estimados recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Estimados Recientes</CardTitle>
          <CardDescription>
            Los últimos estimados creados o actualizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium">Título</th>
                  <th className="text-left py-3 px-4 font-medium">Estado</th>
                  <th className="text-right py-3 px-4 font-medium">Total</th>
                  <th className="text-right py-3 px-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recentEstimates.length === 0 ? (
                  <tr className="border-b">
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No hay estimados disponibles.
                    </td>
                  </tr>
                ) : (
                  recentEstimates.map((estimate) => (
                    <tr key={estimate.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{estimate.clientName}</td>
                      <td className="py-3 px-4">{estimate.title}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(estimate.status)}`}>
                          {getStatusName(estimate.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(estimate.total)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/estimates/${estimate.id}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                          >
                            Ver
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}