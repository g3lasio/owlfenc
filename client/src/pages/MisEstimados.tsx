import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { FileText, Eye, Download, Edit, Trash2, Calendar, DollarSign, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

interface SavedEstimate {
  id: string;
  estimateNumber: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  total: number;
  status: string;
  createdAt: string;
  items?: any[];
  projectType?: string;
}

export default function MisEstimados() {
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      loadEstimates();
    }
  }, [user]);

  const loadEstimates = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📥 Cargando estimados desde Firebase...');

      // Load from Firebase estimates collection
      const estimatesQuery = query(
        collection(db, 'estimates'),
        where('firebaseUserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const estimatesSnapshot = await getDocs(estimatesQuery);
      const firebaseEstimates = estimatesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
          title: data.title || data.projectName || 'Estimado sin título',
          clientName: data.clientName || 'Cliente sin nombre',
          clientEmail: data.clientEmail || '',
          total: data.total || data.estimateAmount || 0,
          status: data.status || 'draft',
          createdAt: data.createdAt || new Date().toISOString(),
          items: data.items || [],
          projectType: data.projectType || data.fenceType || 'fence'
        };
      }) as SavedEstimate[];

      // Also load from localStorage as backup
      const localEstimates = JSON.parse(localStorage.getItem('savedEstimates') || '[]');
      
      // Combine and deduplicate
      const allEstimates = [...firebaseEstimates, ...localEstimates];
      const uniqueEstimates = allEstimates.filter((estimate, index, self) => 
        index === self.findIndex(e => e.estimateNumber === estimate.estimateNumber)
      );

      setEstimates(uniqueEstimates);
      console.log(`✅ Cargados ${uniqueEstimates.length} estimados`);

    } catch (err) {
      console.error('❌ Error cargando estimados:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      
      // Try to load from localStorage as fallback
      try {
        const localEstimates = JSON.parse(localStorage.getItem('savedEstimates') || '[]');
        setEstimates(localEstimates);
        console.log('📱 Estimados cargados desde localStorage');
      } catch (localError) {
        console.error('❌ Error con localStorage:', localError);
      }

      toast({
        title: "Aviso",
        description: "Se cargaron los estimados desde respaldo local",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'draft': { color: 'bg-gray-500', label: 'Borrador' },
      'sent': { color: 'bg-blue-500', label: 'Enviado' },
      'approved': { color: 'bg-green-500', label: 'Aprobado' },
      'rejected': { color: 'bg-red-500', label: 'Rechazado' },
      'expired': { color: 'bg-orange-500', label: 'Vencido' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    
    return (
      <Badge className={`${statusInfo.color} text-white`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewEstimate = (estimate: SavedEstimate) => {
    // Navegar a la vista de detalles del estimado
    window.location.href = `/projects/${estimate.projectId}`;
  };

  const handleEditEstimate = (estimate: SavedEstimate) => {
    // Navegar al editor de estimados con los datos cargados
    window.location.href = `/estimates?edit=${estimate.projectId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Spinner className="w-8 h-8 mx-auto mb-4" />
              <p className="text-gray-300">Cargando estimados guardados...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Mis Estimados
          </h1>
          <p className="text-gray-300 mt-2">
            Historial completo de todos tus estimados guardados
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-cyan-500/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <FileText className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{estimates.length}</p>
                  <p className="text-gray-400 text-sm">Total Estimados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <DollarSign className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(estimates.reduce((sum, est) => sum + est.total, 0))}
                  </p>
                  <p className="text-gray-400 text-sm">Valor Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <User className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {new Set(estimates.map(est => est.clientName)).size}
                  </p>
                  <p className="text-gray-400 text-sm">Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Calendar className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {estimates.filter(est => 
                      new Date(est.createdAt).getMonth() === new Date().getMonth()
                    ).length}
                  </p>
                  <p className="text-gray-400 text-sm">Este Mes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-500/50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="text-red-400">
                  <p className="font-semibold">Error cargando estimados</p>
                  <p className="text-sm">{error}</p>
                </div>
                <Button 
                  onClick={loadEstimates}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estimates List */}
        {estimates.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                No hay estimados guardados
              </h3>
              <p className="text-gray-500 mb-6">
                Cuando crees y guardes estimados, aparecerán aquí
              </p>
              <Button 
                onClick={() => window.location.href = '/estimates'}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Crear Primer Estimado
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {estimates.map((estimate) => (
              <Card key={estimate.id} className="bg-gray-800/50 border-gray-700 hover:border-cyan-500/50 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-white mb-1">
                        {estimate.title}
                      </CardTitle>
                      <p className="text-sm text-gray-400">
                        #{estimate.estimateNumber}
                      </p>
                    </div>
                    {getStatusBadge(estimate.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{estimate.clientName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-lg font-bold text-green-400">
                        {formatCurrency(estimate.total)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {formatDate(estimate.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={() => handleViewEstimate(estimate)}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    
                    <Button
                      onClick={() => handleEditEstimate(estimate)}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={loadEstimates}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Actualizar Lista
          </Button>
        </div>
      </div>
    </div>
  );
}