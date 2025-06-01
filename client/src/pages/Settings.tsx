import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, 
  CreditCard, 
  Bell, 
  Shield, 
  User, 
  Palette,
  AlertCircle,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UserPreferences, UserSubscription, SubscriptionPlan, PaymentHistory } from '../../../shared/schema';

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('general');

  // Fetch user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/settings/preferences'],
    queryFn: async () => {
      const response = await fetch('/api/settings/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json() as Promise<UserPreferences>;
    }
  });

  // Fetch subscription plans
  const { data: plans } = useQuery({
    queryKey: ['/api/settings/subscription/plans'],
    queryFn: async () => {
      const response = await fetch('/api/settings/subscription/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return response.json() as Promise<SubscriptionPlan[]>;
    }
  });

  // Fetch current subscription
  const { data: subscription } = useQuery({
    queryKey: ['/api/settings/subscription/current'],
    queryFn: async () => {
      const response = await fetch('/api/settings/subscription/current');
      if (!response.ok) throw new Error('Failed to fetch subscription');
      return response.json() as Promise<UserSubscription | null>;
    }
  });

  // Fetch payment history
  const { data: paymentHistory } = useQuery({
    queryKey: ['/api/settings/billing/history'],
    queryFn: async () => {
      const response = await fetch('/api/settings/billing/history');
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json() as Promise<PaymentHistory[]>;
    }
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const response = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/preferences'] });
      toast({ title: 'Configuración actualizada', description: 'Los cambios han sido guardados exitosamente' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    }
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: number; billingCycle: 'monthly' | 'yearly' }) => {
      const response = await fetch('/api/settings/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle })
      });
      if (!response.ok) throw new Error('Failed to create subscription');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo procesar la suscripción', variant: 'destructive' });
    }
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/settings/subscription/cancel', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to cancel subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/subscription/current'] });
      toast({ title: 'Suscripción cancelada', description: 'Se cancelará al final del período actual' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo cancelar la suscripción', variant: 'destructive' });
    }
  });

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    handlePreferenceChange('language', language);
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const configSections = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'account', label: 'Cuenta', icon: User },
    { id: 'billing', label: 'Facturación', icon: CreditCard },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'appearance', label: 'Apariencia', icon: Palette }
  ];

  if (preferencesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
            Configuración del Sistema
          </h1>
          <p className="text-slate-300 text-lg">
            Personaliza tu experiencia y gestiona tu cuenta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan-400">Configuración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {configSections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? "default" : "ghost"}
                      className={`w-full justify-start gap-3 ${
                        activeSection === section.id
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-700/50'
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <IconComponent className="w-4 h-4" />
                      {section.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* General Settings */}
            {activeSection === 'general' && (
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    Configuración General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Idioma del Sistema</Label>
                      <Select 
                        value={preferences?.language || 'es'} 
                        onValueChange={handleLanguageChange}
                      >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-300">Zona Horaria</Label>
                      <Select 
                        value={preferences?.timezone || 'America/Mexico_City'} 
                        onValueChange={(value) => handlePreferenceChange('timezone', value)}
                      >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacífico</SelectItem>
                          <SelectItem value="America/New_York">Este</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-300">Moneda</Label>
                      <Select 
                        value={preferences?.currency || 'USD'} 
                        onValueChange={(value) => handlePreferenceChange('currency', value)}
                      >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - Dólar</SelectItem>
                          <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-300">Formato de Fecha</Label>
                      <Select 
                        value={preferences?.dateFormat || 'DD/MM/YYYY'} 
                        onValueChange={(value) => handlePreferenceChange('dateFormat', value)}
                      >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Settings */}
            {activeSection === 'account' && (
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Información de Cuenta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <p className="text-white font-medium">Usuario Demo</p>
                    <p className="text-slate-400">contractor@owlfence.com</p>
                  </div>
                  
                  <Alert className="border-blue-500/50 bg-blue-500/10">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300">
                      Funcionalidad completa disponible con datos reales del backend.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Billing Settings */}
            {activeSection === 'billing' && (
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Facturación y Suscripción
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Subscription */}
                  {subscription && (
                    <div className="p-6 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-white text-lg font-semibold">
                            {plans?.find(p => p.id === subscription.planId)?.name || 'Plan Activo'}
                          </h3>
                          <p className="text-slate-400">
                            {subscription.billingCycle === 'yearly' ? 'Facturación Anual' : 'Facturación Mensual'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-cyan-400">
                            {formatPrice(
                              subscription.billingCycle === 'yearly' 
                                ? plans?.find(p => p.id === subscription.planId)?.yearlyPrice || 0
                                : plans?.find(p => p.id === subscription.planId)?.price || 0
                            )}
                          </p>
                          <p className="text-slate-400">
                            /{subscription.billingCycle === 'yearly' ? 'año' : 'mes'}
                          </p>
                        </div>
                      </div>
                      
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-4">
                        {subscription.status}
                      </Badge>
                      
                      {subscription.cancelAtPeriodEnd && (
                        <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                          <AlertDescription className="text-yellow-300">
                            Tu suscripción se cancelará al final del período actual.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <Button
                        variant="outline"
                        onClick={() => cancelSubscriptionMutation.mutate()}
                        disabled={cancelSubscriptionMutation.isPending || subscription.cancelAtPeriodEnd}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        {subscription.cancelAtPeriodEnd 
                          ? 'Cancelación Programada'
                          : 'Cancelar Suscripción'
                        }
                      </Button>
                    </div>
                  )}

                  {/* Available Plans */}
                  {plans && plans.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-white text-lg font-semibold">Planes Disponibles</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {plans.map((plan) => (
                          <div 
                            key={plan.id} 
                            className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30"
                          >
                            <div className="text-center space-y-3">
                              <h4 className="text-white font-bold">{plan.name}</h4>
                              <p className="text-slate-400 text-sm">{plan.motto}</p>
                              <div>
                                <p className="text-2xl font-bold text-cyan-400">
                                  {formatPrice(plan.price)}
                                </p>
                                <p className="text-slate-400 text-sm">/mes</p>
                              </div>
                              <Button
                                onClick={() => createSubscriptionMutation.mutate({ 
                                  planId: plan.id, 
                                  billingCycle: 'monthly' 
                                })}
                                disabled={createSubscriptionMutation.isPending || subscription?.planId === plan.id}
                                className="w-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30"
                              >
                                {subscription?.planId === plan.id ? 'Plan Actual' : 'Seleccionar'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notifications Settings */}
            {activeSection === 'notifications' && (
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Preferencias de Notificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <Label className="text-white">Notificaciones por Email</Label>
                        <p className="text-slate-400 text-sm">Recibe actualizaciones importantes</p>
                      </div>
                      <Switch
                        checked={preferences?.emailNotifications ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <Label className="text-white">Notificaciones SMS</Label>
                        <p className="text-slate-400 text-sm">Alertas urgentes por mensaje</p>
                      </div>
                      <Switch
                        checked={preferences?.smsNotifications ?? false}
                        onCheckedChange={(checked) => handlePreferenceChange('smsNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <Label className="text-white">Notificaciones Push</Label>
                        <p className="text-slate-400 text-sm">Alertas en el navegador</p>
                      </div>
                      <Switch
                        checked={preferences?.pushNotifications ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <Label className="text-white">Emails de Marketing</Label>
                        <p className="text-slate-400 text-sm">Ofertas y novedades</p>
                      </div>
                      <Switch
                        checked={preferences?.marketingEmails ?? false}
                        onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Configuración de Seguridad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div>
                      <Label className="text-white">Autoguardado de Estimados</Label>
                      <p className="text-slate-400 text-sm">Guardar automáticamente mientras trabajas</p>
                    </div>
                    <Switch
                      checked={preferences?.autoSaveEstimates ?? true}
                      onCheckedChange={(checked) => handlePreferenceChange('autoSaveEstimates', checked)}
                    />
                  </div>
                  
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <Shield className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-300">
                      Todos tus datos están protegidos con encriptación de nivel empresarial.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Appearance Settings */}
            {activeSection === 'appearance' && (
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Configuración de Apariencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Tema del Sistema</Label>
                      <Select 
                        value={preferences?.theme || 'dark'} 
                        onValueChange={(value) => handlePreferenceChange('theme', value)}
                      >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Modo Oscuro</SelectItem>
                          <SelectItem value="light">Modo Claro</SelectItem>
                          <SelectItem value="system">Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-300">Formato de Hora</Label>
                      <Select 
                        value={preferences?.timeFormat || '24'} 
                        onValueChange={(value) => handlePreferenceChange('timeFormat', value)}
                      >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 Horas (AM/PM)</SelectItem>
                          <SelectItem value="24">24 Horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Alert className="border-cyan-500/50 bg-cyan-500/10">
                    <Palette className="h-4 w-4 text-cyan-400" />
                    <AlertDescription className="text-cyan-300">
                      El tema cyberpunk está optimizado para la mejor experiencia visual.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;