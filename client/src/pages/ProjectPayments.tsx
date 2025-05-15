import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Tipo para los pagos de proyectos
type ProjectPayment = {
  id: number;
  projectId: number;
  projectName?: string;
  type: 'deposit' | 'final';
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  stripePaymentIntentId: string | null;
  stripePaymentLinkUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  paymentDate: string | null;
};

const ProjectPayments: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  // Consultar todos los pagos de proyectos
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['/api/projects/payments'],
    queryFn: async () => {
      const response = await fetch('/api/projects/payments');
      if (!response.ok) {
        throw new Error('Error al obtener los pagos de proyectos');
      }
      return response.json() as Promise<ProjectPayment[]>;
    }
  });

  // Función para reenviar un enlace de pago
  const resendPaymentLink = async (paymentId: number) => {
    try {
      const response = await fetch(`/api/project-payments/${paymentId}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al reenviar el enlace de pago');
      }

      const data = await response.json();
      
      // Mostrar mensaje de éxito
      toast({
        title: "Enlace reenviado",
        description: "El enlace de pago ha sido actualizado correctamente",
      });

      // Invalidar la caché para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/projects/payments'] });
      
      // Redireccionar al enlace de pago si está disponible
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo reenviar el enlace de pago",
        variant: "destructive",
      });
    }
  };

  // Función para formatear el tipo de pago
  const formatPaymentType = (type: 'deposit' | 'final') => {
    return type === 'deposit' ? 'Depósito (50%)' : 'Pago Final (50%)';
  };

  // Función para formatear el estado del pago
  const formatPaymentStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'paid':
        return <Badge variant="success">Pagado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Filtrar pagos basados en la pestaña activa
  const filteredPayments = payments?.filter(payment => {
    if (activeTab === 'all') return true;
    return payment.status === activeTab;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Pagos de Proyectos</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="bg-destructive/10">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudieron cargar los pagos de proyectos. Por favor, intenta nuevamente más tarde.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects/payments'] })}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Pagos de Proyectos</h1>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="paid">Pagados</TabsTrigger>
          <TabsTrigger value="expired">Expirados</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredPayments?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay pagos disponibles</CardTitle>
            <CardDescription>
              No se encontraron pagos de proyectos con el filtro seleccionado.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments?.map((payment) => (
            <Card key={payment.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      Proyecto: {payment.projectName || `#${payment.projectId}`}
                    </CardTitle>
                    <CardDescription>
                      {formatPaymentType(payment.type)} - {formatDate(payment.createdAt)}
                    </CardDescription>
                  </div>
                  <div>
                    {formatPaymentStatus(payment.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Monto:</p>
                      <p className="font-medium">${payment.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estado:</p>
                      <p className="font-medium">{payment.status}</p>
                    </div>
                    {payment.paymentDate && (
                      <div>
                        <p className="text-muted-foreground">Fecha de pago:</p>
                        <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    {payment.status === 'pending' && payment.stripePaymentLinkUrl && (
                      <Button 
                        onClick={() => window.open(payment.stripePaymentLinkUrl!, '_blank')}
                        variant="default"
                      >
                        Ver enlace de pago
                      </Button>
                    )}
                    
                    {(payment.status === 'pending' || payment.status === 'expired') && (
                      <Button 
                        onClick={() => resendPaymentLink(payment.id)}
                        variant="outline"
                      >
                        {payment.status === 'expired' ? 'Generar nuevo enlace' : 'Reenviar enlace'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectPayments;