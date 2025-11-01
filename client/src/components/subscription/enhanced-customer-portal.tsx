import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CreditCard, Calendar, DollarSign, Settings, Clock, Zap, ArrowUpCircle, Pause, Play, AlertTriangle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  trialEnd?: number;
}

interface PaymentMethod {
  id: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

interface EnhancedCustomerPortalProps {
  onPlanChange?: (planId: string) => void;
}

export function EnhancedCustomerPortal({ onPlanChange }: EnhancedCustomerPortalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>('');
  const [scheduledChangeDate, setScheduledChangeDate] = useState<string>('');

  // Queries para datos del usuario
  const { data: subscriptionDetails, isLoading: loadingSubscription } = useQuery({
    queryKey: ['/api/subscription/user-subscription'],
    enabled: !!currentUser?.uid,
    retry: false,
  });

  const { data: paymentMethods, isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ['/api/subscription/payment-methods'],
    enabled: !!currentUser?.uid,
    retry: false,
  });

  const { data: availablePlans, isLoading: loadingPlans } = useQuery({
    queryKey: ['/api/subscription/available-plans'],
    enabled: !!currentUser?.uid,
    retry: false,
  });

  // Mutaciones para acciones de suscripción
  const pauseSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/pause', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Suscripción pausada',
        description: 'Tu suscripción ha sido pausada exitosamente.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/user-subscription'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo pausar la suscripción.',
      });
    },
  });

  const resumeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/resume', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Suscripción reactivada',
        description: 'Tu suscripción ha sido reactivada exitosamente.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/user-subscription'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo reactivar la suscripción.',
      });
    },
  });

  const schedulePlanChangeMutation = useMutation({
    mutationFn: async ({ planId, changeDate }: { planId: string; changeDate: string }) => {
      const response = await apiRequest('POST', '/api/subscription/schedule-change', {
        planId,
        changeDate,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Cambio programado',
        description: 'El cambio de plan ha sido programado exitosamente.',
      });
      setSelectedNewPlan('');
      setScheduledChangeDate('');
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/user-subscription'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo programar el cambio de plan.',
      });
    },
  });

  const updateDefaultPaymentMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('POST', '/api/subscription/update-default-payment', {
        paymentMethodId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Método de pago actualizado',
        description: 'El método de pago predeterminado ha sido actualizado.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/payment-methods'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el método de pago.',
      });
    },
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Activa', variant: 'default' as const, color: 'text-green-600' },
      canceled: { label: 'Cancelada', variant: 'destructive' as const, color: 'text-red-600' },
      past_due: { label: 'Vencida', variant: 'destructive' as const, color: 'text-red-600' },
      unpaid: { label: 'Impaga', variant: 'destructive' as const, color: 'text-red-600' },
      paused: { label: 'Pausada', variant: 'secondary' as const, color: 'text-yellow-600' },
      trialing: { label: 'Prueba', variant: 'outline' as const, color: 'text-blue-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  if (loadingSubscription || loadingPaymentMethods || loadingPlans) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de Suscripción */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Detalles de Suscripción
            </span>
            {subscriptionDetails && getStatusBadge(subscriptionDetails.status || 'inactive')}
          </CardTitle>
          <CardDescription>
            Gestiona tu suscripción y métodos de pago avanzados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscriptionDetails ? (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Plan Actual</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">{subscriptionDetails.planName || 'Plan Básico'}</span>
                      <span className="text-xl font-bold">
                        {formatCurrency(subscriptionDetails.amount || 0, subscriptionDetails.currency || 'USD')}
                        <span className="text-sm text-muted-foreground">/{subscriptionDetails.interval || 'mes'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Próximo Pago</h4>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{subscriptionDetails.currentPeriodEnd ? formatDate(subscriptionDetails.currentPeriodEnd) : 'No disponible'}</span>
                    </div>
                  </div>

                  {subscriptionDetails?.trialEnd && (
                    <div>
                      <h4 className="font-medium mb-2">Fin de Prueba</h4>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>{formatDate(subscriptionDetails.trialEnd)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Acciones rápidas */}
                  <div className="flex flex-col gap-2">
                    {subscriptionDetails?.status === 'active' && !subscriptionDetails?.cancelAtPeriodEnd && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Pause className="h-4 w-4 mr-2" />
                            Pausar Suscripción
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Pausar suscripción?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tu suscripción se pausará al final del período actual. 
                              Puedes reactivarla en cualquier momento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => pauseSubscriptionMutation.mutate()}
                              disabled={pauseSubscriptionMutation.isPending}
                            >
                              Pausar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {subscriptionDetails?.status === 'paused' && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => resumeSubscriptionMutation.mutate()}
                        disabled={resumeSubscriptionMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Reactivar Suscripción
                      </Button>
                    )}

                    {subscriptionDetails?.cancelAtPeriodEnd && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Cancelación programada para {subscriptionDetails?.currentPeriodEnd ? formatDate(subscriptionDetails.currentPeriodEnd) : 'fecha no disponible'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Programar cambio de plan */}
              {availablePlans && Array.isArray(availablePlans) && availablePlans.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4" />
                    Programar Cambio de Plan
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Select value={selectedNewPlan} onValueChange={setSelectedNewPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar nuevo plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(availablePlans) && availablePlans.map((plan: PlanOption) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatCurrency(plan.price, plan.currency)}/{plan.interval}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={scheduledChangeDate} onValueChange={setScheduledChangeDate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Fecha de cambio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Inmediatamente</SelectItem>
                        <SelectItem value="next_cycle">Próximo ciclo de facturación</SelectItem>
                        <SelectItem value="custom">Fecha personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedNewPlan && scheduledChangeDate && (
                    <Button 
                      onClick={() => schedulePlanChangeMutation.mutate({
                        planId: selectedNewPlan,
                        changeDate: scheduledChangeDate
                      })}
                      disabled={schedulePlanChangeMutation.isPending}
                      className="w-full"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Programar Cambio
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontró información de suscripción</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métodos de Pago Avanzados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Métodos de Pago
          </CardTitle>
          <CardDescription>
            Gestiona múltiples métodos de pago y configura tu método predeterminado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {Array.isArray(paymentMethods) && paymentMethods.map((method: PaymentMethod) => (
                <div 
                  key={method.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {method.card?.brand || 'Tarjeta'}
                        </span>
                        <span>•••• {method.card?.last4}</span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Predeterminado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expira {method.card?.expMonth}/{method.card?.expYear}
                      </p>
                    </div>
                  </div>
                  
                  {!method.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateDefaultPaymentMutation.mutate(method.id)}
                      disabled={updateDefaultPaymentMutation.isPending}
                    >
                      Hacer Predeterminado
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No hay métodos de pago configurados</p>
              <Button variant="outline">
                Agregar Método de Pago
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}