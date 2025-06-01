import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, CreditCard, Globe, Bell, Shield, User, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UserPreferences, UserSubscription, SubscriptionPlan, PaymentHistory } from '../../../shared/schema';

interface SettingsProps {}

const Settings: React.FC<SettingsProps> = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('preferences');

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
      toast({ title: t('settings.preferences.updated'), description: t('settings.preferences.updateSuccess') });
    },
    onError: () => {
      toast({ title: t('settings.error'), description: t('settings.preferences.updateError'), variant: 'destructive' });
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
      toast({ title: t('settings.error'), description: t('settings.subscription.createError'), variant: 'destructive' });
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
      toast({ title: t('settings.subscription.canceled'), description: t('settings.subscription.cancelSuccess') });
    },
    onError: () => {
      toast({ title: t('settings.error'), description: t('settings.subscription.cancelError'), variant: 'destructive' });
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

  const getPlanColor = (code: string) => {
    switch (code) {
      case 'primo_chambeador': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'mero_patron': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'chingon_mayor': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (preferencesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          {t('settings.title', 'Configuración')}
        </h1>
        <p className="text-slate-300 text-lg">
          {t('settings.subtitle', 'Personaliza tu experiencia y gestiona tu suscripción')}
        </p>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger 
            value="preferences" 
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30"
          >
            <User className="w-4 h-4 mr-2" />
            {t('settings.tabs.preferences', 'Preferencias')}
          </TabsTrigger>
          <TabsTrigger 
            value="billing" 
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {t('settings.tabs.billing', 'Facturación')}
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30"
          >
            <Bell className="w-4 h-4 mr-2" />
            {t('settings.tabs.notifications', 'Notificaciones')}
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30"
          >
            <Shield className="w-4 h-4 mr-2" />
            {t('settings.tabs.security', 'Seguridad')}
          </TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('settings.preferences.language', 'Idioma y Región')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-slate-300">
                    {t('settings.preferences.language', 'Idioma')}
                  </Label>
                  <Select 
                    value={preferences?.language || 'en'} 
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-slate-300">
                    {t('settings.preferences.timezone', 'Zona Horaria')}
                  </Label>
                  <Select 
                    value={preferences?.timezone || 'America/New_York'} 
                    onValueChange={(value) => handlePreferenceChange('timezone', value)}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-slate-300">
                    {t('settings.preferences.currency', 'Moneda')}
                  </Label>
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
                  <Label htmlFor="dateFormat" className="text-slate-300">
                    {t('settings.preferences.dateFormat', 'Formato de Fecha')}
                  </Label>
                  <Select 
                    value={preferences?.dateFormat || 'MM/DD/YYYY'} 
                    onValueChange={(value) => handlePreferenceChange('dateFormat', value)}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current Subscription */}
          {subscription && (
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t('settings.billing.currentPlan', 'Plan Actual')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-lg font-semibold">
                      {plans?.find(p => p.id === subscription.planId)?.name}
                    </h3>
                    <p className="text-slate-400">
                      {subscription.billingCycle === 'yearly' ? t('settings.billing.yearly', 'Anual') : t('settings.billing.monthly', 'Mensual')}
                    </p>
                    <Badge className={getPlanColor(plans?.find(p => p.id === subscription.planId)?.code || '')}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {formatPrice(
                        subscription.billingCycle === 'yearly' 
                          ? plans?.find(p => p.id === subscription.planId)?.yearlyPrice || 0
                          : plans?.find(p => p.id === subscription.planId)?.price || 0
                      )}
                    </p>
                    <p className="text-slate-400">
                      /{subscription.billingCycle === 'yearly' ? t('settings.billing.year', 'año') : t('settings.billing.month', 'mes')}
                    </p>
                  </div>
                </div>
                
                {subscription.cancelAtPeriodEnd && (
                  <Alert className="mt-4 border-yellow-500/50 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-300">
                      {t('settings.billing.cancelScheduled', 'Tu suscripción se cancelará al final del período actual.')}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => cancelSubscriptionMutation.mutate()}
                    disabled={cancelSubscriptionMutation.isPending || subscription.cancelAtPeriodEnd}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    {subscription.cancelAtPeriodEnd 
                      ? t('settings.billing.cancelScheduled', 'Cancelación Programada')
                      : t('settings.billing.cancel', 'Cancelar Suscripción')
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          {plans && (
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan-400">
                  {t('settings.billing.availablePlans', 'Planes Disponibles')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className="border border-slate-600/50 rounded-lg p-4 bg-slate-700/30 backdrop-blur-sm"
                    >
                      <div className="text-center space-y-2">
                        <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                        <p className="text-slate-400 text-sm">{plan.motto}</p>
                        <div className="py-2">
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
                          {subscription?.planId === plan.id 
                            ? t('settings.billing.current', 'Actual')
                            : t('settings.billing.selectPlan', 'Seleccionar')
                          }
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {paymentHistory && paymentHistory.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan-400">
                  {t('settings.billing.paymentHistory', 'Historial de Pagos')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentHistory.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border border-slate-600/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">
                          {formatPrice(payment.amount)}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        className={payment.status === 'succeeded' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {payment.status === 'succeeded' ? t('settings.billing.paid', 'Pagado') : t('settings.billing.failed', 'Fallido')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t('settings.notifications.title', 'Preferencias de Notificación')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">{t('settings.notifications.email', 'Notificaciones por Email')}</Label>
                  <p className="text-slate-400 text-sm">{t('settings.notifications.emailDesc', 'Recibe actualizaciones importantes por email')}</p>
                </div>
                <Switch
                  checked={preferences?.emailNotifications ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">{t('settings.notifications.sms', 'Notificaciones SMS')}</Label>
                  <p className="text-slate-400 text-sm">{t('settings.notifications.smsDesc', 'Recibe alertas urgentes por SMS')}</p>
                </div>
                <Switch
                  checked={preferences?.smsNotifications ?? false}
                  onCheckedChange={(checked) => handlePreferenceChange('smsNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">{t('settings.notifications.push', 'Notificaciones Push')}</Label>
                  <p className="text-slate-400 text-sm">{t('settings.notifications.pushDesc', 'Notificaciones en el navegador')}</p>
                </div>
                <Switch
                  checked={preferences?.pushNotifications ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">{t('settings.notifications.marketing', 'Emails de Marketing')}</Label>
                  <p className="text-slate-400 text-sm">{t('settings.notifications.marketingDesc', 'Ofertas especiales y novedades')}</p>
                </div>
                <Switch
                  checked={preferences?.marketingEmails ?? false}
                  onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('settings.security.title', 'Configuración de Seguridad')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">{t('settings.security.autoSave', 'Autoguardado')}</Label>
                  <p className="text-slate-400 text-sm">{t('settings.security.autoSaveDesc', 'Guardar estimados automáticamente')}</p>
                </div>
                <Switch
                  checked={preferences?.autoSaveEstimates ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('autoSaveEstimates', checked)}
                />
              </div>
              
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  {t('settings.security.dataProtection', 'Todos tus datos están encriptados y protegidos.')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;