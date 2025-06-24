/**
 * Página principal para gestión de facturas (invoices)
 * Sistema de facturación para proyectos completados
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Settings,
  History
} from 'lucide-react';
import InvoiceGenerator from '@/components/invoices/InvoiceGenerator';
import InvoiceList from '@/components/invoices/InvoiceList';
import InvoiceSettings from '@/components/invoices/InvoiceSettings';

// Types
interface Project {
  id: number;
  projectId: string;
  clientName: string;
  clientEmail: string;
  address: string;
  projectType: string;
  status: string;
  totalPrice: number;
  completedDate: string;
  invoiceGenerated: boolean;
  invoiceNumber?: string;
  invoiceStatus?: string;
  invoiceDueDate?: string;
  lastReminderSent?: string;
}

const Invoices: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('generator');

  // Obtener proyectos completados
  const { data: completedProjects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['/api/projects', 'completed'],
    queryFn: async () => {
      const response = await apiRequest('/api/projects');
      return response.filter((project: Project) => project.status === 'completed');
    },
    enabled: !!currentUser
  });

  // Mutation para generar factura
  const generateInvoiceMutation = useMutation({
    mutationFn: async (data: {
      projectId: string;
      paymentTerms?: number;
      customMessage?: string;
    }) => {
      return apiRequest('/api/invoices/generate-from-project', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Factura generada exitosamente',
        description: `Factura ${data.invoiceData.invoiceNumber} creada correctamente`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error generando factura',
        description: error.message || 'Error interno del servidor',
        variant: 'destructive'
      });
    }
  });

  // Mutation para descargar PDF
  const downloadPdfMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/invoices/generate-pdf/${projectId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Error generando PDF');
      }
      
      return response.blob();
    },
    onSuccess: (blob, projectId) => {
      // Crear URL para descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'PDF descargado',
        description: 'La factura se ha descargado correctamente'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error descargando PDF',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mutation para enviar recordatorio
  const sendReminderMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return apiRequest(`/api/invoices/send-reminder/${projectId}`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Recordatorio enviado',
        description: 'Recordatorio de pago enviado al cliente'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error enviando recordatorio',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Estadísticas de facturas
  const invoiceStats = React.useMemo(() => {
    if (!completedProjects) return { total: 0, pending: 0, paid: 0, overdue: 0 };
    
    const invoiced = completedProjects.filter(p => p.invoiceGenerated);
    const pending = invoiced.filter(p => p.invoiceStatus === 'pending');
    const paid = invoiced.filter(p => p.invoiceStatus === 'paid');
    const overdue = invoiced.filter(p => {
      if (p.invoiceStatus !== 'pending' || !p.invoiceDueDate) return false;
      return new Date(p.invoiceDueDate) < new Date();
    });
    
    return {
      total: invoiced.length,
      pending: pending.length,
      paid: paid.length,
      overdue: overdue.length
    };
  }, [completedProjects]);

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Error cargando proyectos</h3>
            <p className="text-muted-foreground mb-4">No se pudieron cargar los proyectos completados</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects'] })}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="scrollable-content space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Facturación</h1>
          <p className="text-muted-foreground">
            Genere y gestione facturas para proyectos completados
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Facturas</p>
              <p className="text-2xl font-bold">{invoiceStats.total}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold">{invoiceStats.pending}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pagadas</p>
              <p className="text-2xl font-bold">{invoiceStats.paid}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vencidas</p>
              <p className="text-2xl font-bold">{invoiceStats.overdue}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generar Facturas
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Lista de Facturas
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <InvoiceGenerator
            completedProjects={completedProjects || []}
            onGenerateInvoice={generateInvoiceMutation.mutate}
            isGenerating={generateInvoiceMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <InvoiceList
            projects={completedProjects?.filter(p => p.invoiceGenerated) || []}
            onDownloadPdf={downloadPdfMutation.mutate}
            onSendReminder={sendReminderMutation.mutate}
            isDownloading={downloadPdfMutation.isPending}
            isSendingReminder={sendReminderMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <InvoiceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Invoices;