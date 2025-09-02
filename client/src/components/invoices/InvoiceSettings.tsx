/**
 * Configuración del sistema de facturación
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Clock, MessageSquare, FileText } from 'lucide-react';

interface UserProfile {
  id: number;
  defaultPaymentTerms: number;
  invoiceMessageTemplate: string;
  company: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
}

const InvoiceSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [paymentTerms, setPaymentTerms] = useState<number>(30);
  const [messageTemplate, setMessageTemplate] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  // Cargar configuración actual
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['/api/profile', currentUser?.uid],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Mutation para guardar configuración
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: {
      defaultPaymentTerms: number;
      invoiceMessageTemplate: string;
    }) => {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Configuración guardada',
        description: 'La configuración de facturación se ha actualizado correctamente'
      });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error guardando configuración',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handlePaymentTermsChange = (value: string) => {
    setPaymentTerms(parseInt(value));
    setIsDirty(true);
  };

  const handleMessageTemplateChange = (value: string) => {
    setMessageTemplate(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    saveSettingsMutation.mutate({
      defaultPaymentTerms: paymentTerms,
      invoiceMessageTemplate: messageTemplate
    });
  };

  const resetToDefault = () => {
    setPaymentTerms(30);
    setMessageTemplate('Gracias por confiar en nuestros servicios. Ha sido un placer trabajar en su proyecto.');
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Facturación
          </CardTitle>
          <CardDescription>
            Configure los parámetros por defecto para la generación de facturas
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Payment Terms Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Términos de Pago por Defecto
          </CardTitle>
          <CardDescription>
            Configure el número de días por defecto para el vencimiento de facturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Días para vencimiento</Label>
            <Select value={paymentTerms.toString()} onValueChange={handlePaymentTermsChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar términos de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 días</SelectItem>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="10">10 días</SelectItem>
                <SelectItem value="15">15 días</SelectItem>
                <SelectItem value="20">20 días</SelectItem>
                <SelectItem value="30">30 días (estándar)</SelectItem>
                <SelectItem value="45">45 días</SelectItem>
                <SelectItem value="60">60 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Este será el valor por defecto al generar nuevas facturas. Siempre podrá modificarlo para cada factura individual.
            </p>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>Vista previa:</strong> Las facturas generadas tendrán un vencimiento de {paymentTerms} días desde la fecha de emisión.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Message Template Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mensaje de Agradecimiento por Defecto
          </CardTitle>
          <CardDescription>
            Configure el mensaje de agradecimiento que aparecerá en sus facturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="messageTemplate">Mensaje personalizado</Label>
            <Textarea
              id="messageTemplate"
              value={messageTemplate}
              onChange={(e) => handleMessageTemplateChange(e.target.value)}
              placeholder="Ingrese su mensaje de agradecimiento personalizado..."
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Este mensaje aparecerá en todas las facturas que genere. Puede dejarlo vacío para usar el mensaje estándar.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefault} size="sm">
              Usar Mensaje Estándar
            </Button>
          </div>

          {/* Preview */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Vista previa:</p>
            <div className="bg-white p-3 rounded border-l-4 border-green-500">
              <p className="text-sm">
                {messageTemplate || 'Gracias por confiar en nuestros servicios. Ha sido un placer trabajar en su proyecto.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información de la Empresa
          </CardTitle>
          <CardDescription>
            Esta información aparecerá en sus facturas. Para modificarla, vaya a su perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Empresa</Label>
                <p>{userProfile.company || 'No especificado'}</p>
              </div>
              <div>
                <Label className="font-medium">Propietario</Label>
                <p>{userProfile.ownerName || 'No especificado'}</p>
              </div>
              <div>
                <Label className="font-medium">Email</Label>
                <p>{userProfile.email}</p>
              </div>
              <div>
                <Label className="font-medium">Teléfono</Label>
                <p>{userProfile.phone || 'No especificado'}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="font-medium">Dirección</Label>
                <p>{userProfile.address || 'No especificado'}</p>
              </div>
            </div>
          )}
          
          <Separator className="my-4" />
          
          <Button variant="outline" onClick={() => window.location.href = '/profile'}>
            Editar Información de la Empresa
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              {isDirty && (
                <p className="text-sm text-muted-foreground">
                  Tienes cambios sin guardar
                </p>
              )}
            </div>
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || saveSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              {saveSettingsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceSettings;