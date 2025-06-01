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
import { AlertCircle, CreditCard, Globe, Bell, Shield, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UserPreferences, UserSubscription, SubscriptionPlan, PaymentHistory } from '../../../shared/schema';

const Settings: React.FC = () => {
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
      toast({ title: 'Preferencias actualizadas', description: 'Tus preferencias han sido guardadas exitosamente' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudieron actualizar las preferencias', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'No se pudo crear la suscripción', variant: 'destructive' });
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
      toast({ title: 'Suscripción cancelada', description: 'Tu suscripción se cancelará al final del período actual' });
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

  if (preferencesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header - Exact match to reference image */}
        <div className="text-center mb-6">
          <div className="text-cyan-400 text-sm font-medium mb-2">
            The AI Force Crafting the Future Skyline
          </div>
          <h1 className="text-white text-xl font-medium leading-tight">
            Customize your experience and<br />
            manage your subscription
          </h1>
        </div>

        {/* Navigation Tabs - Exact match to reference image */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-4 bg-transparent border-b border-slate-700/50 h-auto p-0 rounded-none">
            <TabsTrigger 
              value="preferences" 
              className="text-cyan-400 border-b-2 border-cyan-400 bg-transparent data-[state=inactive]:text-slate-400 data-[state=inactive]:border-transparent rounded-none pb-3"
            >
              Preferences
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="text-slate-400 border-b-2 border-transparent bg-transparent data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400 rounded-none pb-3"
            >
              Billing
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="text-slate-400 border-b-2 border-transparent bg-transparent data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400 rounded-none pb-3"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="text-slate-400 border-b-2 border-transparent bg-transparent data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400 rounded-none pb-3"
            >
              Security
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab Content - Exact match to reference image */}
          <TabsContent value="preferences" className="mt-8 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-6 h-6 text-cyan-400" />
                <h2 className="text-cyan-400 text-xl font-medium">Language</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-white text-base mb-3 block">Language</Label>
                  <Select 
                    value={preferences?.language || 'en'} 
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="w-full bg-slate-800/80 border-slate-600/50 text-white h-12 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="en" className="text-white">English</SelectItem>
                      <SelectItem value="es" className="text-white">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-base mb-3 block">Timezone</Label>
                  <Select 
                    value={preferences?.timezone || 'America/Los_Angeles'} 
                    onValueChange={(value) => handlePreferenceChange('timezone', value)}
                  >
                    <SelectTrigger className="w-full bg-slate-800/80 border-slate-600/50 text-white h-12 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="America/Los_Angeles" className="text-white">Pacific Time</SelectItem>
                      <SelectItem value="America/Denver" className="text-white">Mountain Time</SelectItem>
                      <SelectItem value="America/Chicago" className="text-white">Central Time</SelectItem>
                      <SelectItem value="America/New_York" className="text-white">Eastern Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-base mb-3 block">Currency</Label>
                  <Select 
                    value={preferences?.currency || 'USD'} 
                    onValueChange={(value) => handlePreferenceChange('currency', value)}
                  >
                    <SelectTrigger className="w-full bg-slate-800/80 border-slate-600/50 text-white h-12 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="USD" className="text-white">USD - Dólar</SelectItem>
                      <SelectItem value="MXN" className="text-white">MXN - Peso Mexicano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-base mb-3 block">Date Format</Label>
                  <Select 
                    value={preferences?.dateFormat || 'MM/DD/YYYY'} 
                    onValueChange={(value) => handlePreferenceChange('dateFormat', value)}
                  >
                    <SelectTrigger className="w-full bg-slate-800/80 border-slate-600/50 text-white h-12 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="MM/DD/YYYY" className="text-white">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY" className="text-white">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD" className="text-white">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Billing Tab Content */}
          <TabsContent value="billing" className="mt-8 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-6 h-6 text-cyan-400" />
                <h2 className="text-cyan-400 text-xl font-medium">Billing & Subscription</h2>
              </div>

              {/* Current Subscription */}
              {subscription && (
                <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-6 mb-6">
                  <h3 className="text-white text-lg font-medium mb-4">Plan Actual</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white font-medium">
                        {plans?.find(p => p.id === subscription.planId)?.name}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {subscription.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-cyan-400 text-xl font-bold">
                        {formatPrice(
                          subscription.billingCycle === 'yearly' 
                            ? plans?.find(p => p.id === subscription.planId)?.yearlyPrice || 0
                            : plans?.find(p => p.id === subscription.planId)?.price || 0
                        )}
                      </p>
                      <p className="text-slate-400 text-sm">
                        /{subscription.billingCycle === 'yearly' ? 'año' : 'mes'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {subscription.status}
                  </Badge>
                  
                  {subscription.cancelAtPeriodEnd && (
                    <Alert className="mt-4 border-yellow-500/50 bg-yellow-500/10">
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
                    className="mt-4 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    {subscription.cancelAtPeriodEnd 
                      ? 'Cancelación Programada'
                      : 'Cancelar Suscripción'
                    }
                  </Button>
                </div>
              )}

              {/* Available Plans */}
              {plans && (
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium">Planes Disponibles</h3>
                  {plans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{plan.name}</h4>
                          <p className="text-slate-400 text-sm">{plan.motto}</p>
                          <p className="text-cyan-400 font-bold text-lg mt-2">
                            {formatPrice(plan.price)}/mes
                          </p>
                        </div>
                        <Button
                          onClick={() => createSubscriptionMutation.mutate({ 
                            planId: plan.id, 
                            billingCycle: 'monthly' 
                          })}
                          disabled={createSubscriptionMutation.isPending || subscription?.planId === plan.id}
                          className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30"
                        >
                          {subscription?.planId === plan.id ? 'Actual' : 'Seleccionar'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Notifications Tab Content */}
          <TabsContent value="notifications" className="mt-8 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-cyan-400" />
                <h2 className="text-cyan-400 text-xl font-medium">Notifications</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-base">Email Notifications</Label>
                    <p className="text-slate-400 text-sm">Recibe actualizaciones importantes</p>
                  </div>
                  <Switch
                    checked={preferences?.emailNotifications ?? true}
                    onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-base">SMS Notifications</Label>
                    <p className="text-slate-400 text-sm">Alertas urgentes por SMS</p>
                  </div>
                  <Switch
                    checked={preferences?.smsNotifications ?? false}
                    onCheckedChange={(checked) => handlePreferenceChange('smsNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-base">Push Notifications</Label>
                    <p className="text-slate-400 text-sm">Notificaciones en el navegador</p>
                  </div>
                  <Switch
                    checked={preferences?.pushNotifications ?? true}
                    onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-base">Marketing Emails</Label>
                    <p className="text-slate-400 text-sm">Ofertas especiales y novedades</p>
                  </div>
                  <Switch
                    checked={preferences?.marketingEmails ?? false}
                    onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab Content */}
          <TabsContent value="security" className="mt-8 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-cyan-400" />
                <h2 className="text-cyan-400 text-xl font-medium">Security</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-base">Auto Save</Label>
                    <p className="text-slate-400 text-sm">Guardar estimados automáticamente</p>
                  </div>
                  <Switch
                    checked={preferences?.autoSaveEstimates ?? true}
                    onCheckedChange={(checked) => handlePreferenceChange('autoSaveEstimates', checked)}
                  />
                </div>
                
                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-300">
                    Todos tus datos están encriptados y protegidos.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer - Match reference design */}
        <div className="flex justify-between items-center text-xs text-slate-500 pt-6 border-t border-slate-700/30">
          <span>Política de Privacidad</span>
          <span>|</span>
          <span>Términos Legales</span>
          <span>|</span>
          <span>© 2025 Owl Fence</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;