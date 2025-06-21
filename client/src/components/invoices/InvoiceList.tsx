/**
 * Lista de facturas generadas con acciones de gestión
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Download, 
  Send, 
  Search, 
  Calendar, 
  DollarSign, 
  User, 
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface Project {
  id: number;
  projectId: string;
  clientName: string;
  clientEmail: string;
  address: string;
  projectType: string;
  totalPrice: number;
  invoiceNumber?: string;
  invoiceStatus?: string;
  invoiceDueDate?: string;
  lastReminderSent?: string;
  completedDate: string;
}

interface InvoiceListProps {
  projects: Project[];
  onDownloadPdf: (projectId: string) => void;
  onSendReminder: (projectId: string) => void;
  isDownloading: boolean;
  isSendingReminder: boolean;
}

const InvoiceList: React.FC<InvoiceListProps> = ({
  projects,
  onDownloadPdf,
  onSendReminder,
  isDownloading,
  isSendingReminder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getStatusBadge = (status: string, dueDate?: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Pagado</Badge>;
    }
    
    if (status === 'pending') {
      if (dueDate && isOverdue(dueDate)) {
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      }
      return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
    }
    
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getStatusIcon = (status: string, dueDate?: string) => {
    if (status === 'paid') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    
    if (status === 'pending' && dueDate && isOverdue(dueDate)) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'overdue' && project.invoiceStatus === 'pending' && project.invoiceDueDate && isOverdue(project.invoiceDueDate)) ||
      (statusFilter !== 'overdue' && project.invoiceStatus === statusFilter);

    return matchesSearch && matchesStatus;
  });

  const canSendReminder = (project: Project) => {
    if (project.invoiceStatus !== 'pending') return false;
    
    // Verificar si han pasado al menos 24 horas desde el último recordatorio
    if (project.lastReminderSent) {
      const lastSent = new Date(project.lastReminderSent);
      const now = new Date();
      const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastReminder >= 24;
    }
    
    return true;
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay facturas generadas</h3>
          <p className="text-muted-foreground">
            Las facturas aparecerán aquí una vez que las genere desde proyectos completados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, número de factura o proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
                size="sm"
              >
                Pendientes
              </Button>
              <Button
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('paid')}
                size="sm"
              >
                Pagadas
              </Button>
              <Button
                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('overdue')}
                size="sm"
              >
                Vencidas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <div className="grid gap-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    {getStatusIcon(project.invoiceStatus || '', project.invoiceDueDate)}
                    <h4 className="font-medium text-lg">
                      Factura {project.invoiceNumber}
                    </h4>
                    {getStatusBadge(project.invoiceStatus || '', project.invoiceDueDate)}
                  </div>
                  
                  {/* Project and Client Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{project.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{project.clientEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{project.projectId} - {project.projectType}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatCurrency(project.totalPrice)}</span>
                      </div>
                      {project.invoiceDueDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Vence: {new Date(project.invoiceDueDate).toLocaleDateString('es-ES')}
                            {project.invoiceStatus === 'pending' && isOverdue(project.invoiceDueDate) && (
                              <span className="text-red-600 ml-1">(Vencido)</span>
                            )}
                          </span>
                        </div>
                      )}
                      {project.lastReminderSent && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Send className="h-4 w-4" />
                          <span className="text-xs">
                            Último recordatorio: {new Date(project.lastReminderSent).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => onDownloadPdf(project.id.toString())}
                    disabled={isDownloading}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                  
                  {project.invoiceStatus === 'pending' && (
                    <Button
                      onClick={() => onSendReminder(project.id.toString())}
                      disabled={isSendingReminder || !canSendReminder(project)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {canSendReminder(project) ? 'Enviar Recordatorio' : 'Recordatorio Enviado'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No se encontraron facturas que coincidan con los filtros seleccionados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;