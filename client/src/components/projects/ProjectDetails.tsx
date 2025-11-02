import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProject } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileManager from "./FileManager";
import FuturisticTimeline from "./FuturisticTimeline";

interface ProjectDetailsProps {
  project: any;
  onUpdate: (updatedProject: any) => void;
}

export default function ProjectDetails({ project, onUpdate }: ProjectDetailsProps) {
  // Consolidar notas del cliente e internas en un solo campo "Project Notes"
  const consolidatedNotes = () => {
    const parts = [];
    if (project.clientNotes) parts.push(project.clientNotes);
    if (project.internalNotes) parts.push(project.internalNotes);
    return parts.join('\n\n---\n\n');
  };

  const [projectNotes, setProjectNotes] = useState(
    project.projectNotes || consolidatedNotes() || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const { toast } = useToast();

  const handleProjectNotesUpdate = async () => {
    try {
      setIsSaving(true);
      const updatedProject = await updateProject(project.id, {
        projectNotes: projectNotes
        // Mantener campos legacy por retrocompatibilidad
        // No limpiarlos para que otros componentes puedan seguir usándolos
      });
      onUpdate(updatedProject);
      toast({
        title: "✅ Notas actualizadas",
        description: "Las notas del proyecto han sido guardadas correctamente."
      });
      setNotesDialogOpen(false);
    } catch (error) {
      console.error("Error updating notes:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar las notas."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'No establecida';
    
    let dateObj: Date;
    
    // Manejar diferentes tipos de fecha
    if (typeof date === 'object' && date.toDate) {
      // Firebase Timestamp
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      // String de fecha (del input date)
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      // Ya es un objeto Date
      dateObj = date;
    } else {
      return 'Fecha inválida';
    }
    
    // Validar que la fecha es válida
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  };

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return 'No establecido';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    // Manejar estados con porcentaje (ej: "balance 50%")
    if (status && status.includes('balance')) {
      return <Badge variant="outline">{status}</Badge>;
    }

    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      paid: { label: 'Pagado', variant: 'default' },
      pending: { label: 'Pendiente', variant: 'secondary' },
      overdue: { label: 'Vencido', variant: 'destructive' },
      partial: { label: 'Pago Parcial', variant: 'outline' }
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPermitStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      approved: { label: 'Aprobado', variant: 'default' },
      pending: { label: 'Pendiente', variant: 'secondary' },
      rejected: { label: 'Rechazado', variant: 'destructive' },
      not_required: { label: 'No Requerido', variant: 'outline' }
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const handleProgressUpdate = (newProgress: string) => {
    const updatedProject = { ...project, projectProgress: newProgress };
    onUpdate(updatedProject);
  };

  const handleRegisterPayment = async () => {
    try {
      if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Por favor ingrese un monto válido."
        });
        return;
      }

      setIsSaving(true);

      // Obtener historial actual de pagos
      let paymentDetails: any = { history: [] };
      if (project.paymentDetails) {
        paymentDetails = typeof project.paymentDetails === 'string' 
          ? JSON.parse(project.paymentDetails) 
          : project.paymentDetails;
      }

      if (!Array.isArray(paymentDetails.history)) {
        paymentDetails.history = [];
      }

      // Agregar nuevo pago al historial
      paymentDetails.history.push({
        date: paymentData.date,
        amount: parseFloat(paymentData.amount),
        method: paymentData.method,
        notes: paymentData.notes || ''
      });

      // Calcular total pagado
      const totalPaid = paymentDetails.history.reduce((sum: number, payment: any) => 
        sum + (payment.amount || 0), 0
      );
      paymentDetails.totalPaid = totalPaid;

      // Determinar estado de pago
      const projectTotalPrice = project.totalPrice || 0;
      let paymentStatus = 'pending';
      
      if (totalPaid >= projectTotalPrice && projectTotalPrice > 0) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        const percentPaid = (totalPaid / projectTotalPrice) * 100;
        paymentStatus = `balance ${Math.round(percentPaid)}%`;
      }

      // Actualizar proyecto
      const updatedProject = await updateProject(project.id, {
        paymentStatus,
        paymentDetails
      });

      onUpdate(updatedProject);

      toast({
        title: "💰 Pago registrado",
        description: `Pago de $${parseFloat(paymentData.amount).toFixed(2)} registrado exitosamente.`
      });

      // Limpiar formulario y cerrar diálogo
      setPaymentData({
        amount: '',
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setPaymentDialogOpen(false);

    } catch (error) {
      console.error("Error registrando pago:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el pago."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setIsSaving(true);

      // Preparar datos para la factura
      const invoiceData = {
        profile: {
          company: "Owl Fence AI",
          email: project.clientEmail || "",
          phone: project.clientPhone || "",
          address: ""
        },
        estimate: {
          client: {
            name: project.clientName,
            email: project.clientEmail || "",
            phone: project.clientPhone || "",
            address: project.address
          },
          items: [{
            description: `${project.projectType || 'Proyecto'} - ${project.projectSubtype || ''}`,
            quantity: 1,
            unitPrice: project.totalPrice || 0,
            totalPrice: project.totalPrice || 0
          }],
          subtotal: project.totalPrice || 0,
          tax: 0,
          total: project.totalPrice || 0
        },
        invoiceConfig: {
          downPaymentAmount: project.paymentDetails?.totalPaid || 0
        },
        emailConfig: {
          ccContractor: false
        }
      };

      // Generar y descargar PDF de factura
      const response = await fetch('/api/invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        throw new Error('Error al generar la factura');
      }

      // Descargar el PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${project.projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "📄 Factura generada",
        description: "La factura se ha generado y descargado exitosamente."
      });

    } catch (error) {
      console.error("Error generando factura:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar la factura."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const quickActions = [
    { 
      icon: "ri-phone-line", 
      label: "Llamar", 
      action: () => {
        toast({
          title: "🚧 Próximamente",
          description: "La función de llamadas estará disponible pronto."
        });
      },
      disabled: false
    },
    { 
      icon: "ri-mail-line", 
      label: "Email", 
      action: () => {
        if (typeof window !== 'undefined' && project.clientEmail) {
          window.open(`mailto:${project.clientEmail}`);
        }
      },
      disabled: !project.clientEmail
    },
    { 
      icon: "ri-map-pin-line", 
      label: "Ubicación", 
      action: () => {
        if (typeof window !== 'undefined' && project.address) {
          window.open(`https://maps.google.com/?q=${encodeURIComponent(project.address)}`);
        }
      },
      disabled: !project.address
    },
    { 
      icon: "ri-file-text-line", 
      label: "Contrato", 
      action: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/legal-defense';
        }
      },
      disabled: false
    },
  ];

  const projectCategories = {
    fencing: { name: "Cercas y Portones", icon: "ri-fence-line" },
    roofing: { name: "Techos", icon: "ri-home-line" },
    plumbing: { name: "Plomería", icon: "ri-droplet-line" },
    electrical: { name: "Electricidad", icon: "ri-flashlight-line" },
    carpentry: { name: "Carpintería", icon: "ri-hammer-line" },
    concrete: { name: "Concreto", icon: "ri-square-line" },
    landscaping: { name: "Paisajismo", icon: "ri-tree-line" },
    painting: { name: "Pintura", icon: "ri-paint-brush-line" },
    flooring: { name: "Pisos", icon: "ri-layout-grid-line" },
    hvac: { name: "HVAC", icon: "ri-temp-hot-line" },
    general: { name: "Contratista General", icon: "ri-tools-line" }
  };

  const projectType = project.projectType || project.projectCategory || 'general';
  const category = projectCategories[projectType as keyof typeof projectCategories] || projectCategories.general;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="project" className="flex flex-col h-full">
        {/* Tabs Header */}
        <TabsList className="w-full grid grid-cols-3 gap-1 bg-muted/50 p-1 mb-3 sticky top-0 z-10">
          <TabsTrigger value="project" className="text-xs sm:text-sm" data-testid="tab-project">
            <i className="ri-file-list-3-line mr-1"></i>
            <span className="hidden sm:inline">Proyecto</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm" data-testid="tab-documents">
            <i className="ri-folder-line mr-1"></i>
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs sm:text-sm" data-testid="tab-payment">
            <i className="ri-money-dollar-circle-line mr-1"></i>
            <span className="hidden sm:inline">Pagos</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Proyecto */}
        <TabsContent value="project" className="flex-1 overflow-y-auto space-y-3 px-1">
          {/* Acciones Rápidas */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <i className="ri-flashlight-line text-primary"></i>
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-1 flex flex-col items-center gap-1 text-xs"
                    onClick={action.action}
                    disabled={action.disabled}
                    data-testid={`button-quick-action-${index}`}
                  >
                    <i className={`${action.icon} text-base sm:text-lg`}></i>
                    <span className="text-[10px] sm:text-xs leading-tight">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Información del Cliente y Proyecto */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <i className="ri-user-line text-primary"></i>
                Cliente y Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {/* Cliente Info */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-0.5">Nombre</div>
                    <div className="font-medium">{project.clientName}</div>
                  </div>
                  {project.clientEmail && (
                    <div className="p-2 bg-muted/50 rounded border">
                      <div className="text-xs text-muted-foreground mb-0.5">Email</div>
                      <div className="font-medium truncate">{project.clientEmail}</div>
                    </div>
                  )}
                  {project.clientPhone && (
                    <div className="p-2 bg-muted/50 rounded border">
                      <div className="text-xs text-muted-foreground mb-0.5">Teléfono</div>
                      <div className="font-medium">{project.clientPhone}</div>
                    </div>
                  )}
                  <div className={`p-2 bg-muted/50 rounded border ${!project.clientPhone || !project.clientEmail ? 'sm:col-span-2' : ''}`}>
                    <div className="text-xs text-muted-foreground mb-0.5">Dirección</div>
                    <div className="font-medium">{project.address}</div>
                  </div>
                </div>
              </div>

              {/* Detalles del Proyecto */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalles</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded border">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className={`${category.icon} text-primary`}></i>
                      <div className="text-xs text-muted-foreground">Categoría</div>
                    </div>
                    <div className="font-medium text-xs">{category.name}</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">Tipo</div>
                    <div className="font-medium text-xs">{project.projectSubtype || project.fenceType || 'No especificado'}</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">Fecha Programada</div>
                    <div className="font-medium text-xs">{formatDate(project.scheduledDate)}</div>
                  </div>
                </div>

                {/* Dimensiones */}
                {(project.height || project.length) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {project.height && (
                      <div className="p-2 bg-muted/50 rounded border">
                        <div className="text-xs text-muted-foreground mb-1">Altura</div>
                        <div className="font-medium">{project.height} ft</div>
                      </div>
                    )}
                    {project.length && (
                      <div className="p-2 bg-muted/50 rounded border">
                        <div className="text-xs text-muted-foreground mb-1">Longitud</div>
                        <div className="font-medium">{project.length} ft</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Puertas/Portones */}
                {project.gates && project.gates.length > 0 && (
                  <div className="p-2 bg-muted/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">Puertas/Portones</div>
                    <div className="space-y-1">
                      {project.gates.map((gate: any, index: number) => (
                        <div key={index} className="flex items-center gap-1.5 text-xs">
                          <i className="ri-door-line text-primary"></i>
                          <span>{gate.type} ({gate.width}" x {gate.height}")</span>
                          {gate.hardware && <span className="text-muted-foreground">- {gate.hardware}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permiso */}
                {project.permitStatus && (
                  <div className="p-2 bg-muted/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">Estado del Permiso</div>
                    <div>{getPermitStatusBadge(project.permitStatus)}</div>
                  </div>
                )}
              </div>

              {/* ID del Proyecto */}
              <div className="pt-2 border-t">
                <div className="text-[10px] text-muted-foreground">ID: {project.projectId}</div>
              </div>
            </CardContent>
          </Card>

          {/* Project Notes - Consolidado */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>📝 Project Notes</span>
                <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" data-testid="button-edit-project-notes">
                      <i className="ri-edit-line text-sm"></i>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Editar Notas del Proyecto</DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Agrega cualquier nota relevante sobre este proyecto, cliente, o detalles internos.
                      </p>
                    </DialogHeader>
                    <Textarea 
                      placeholder="Ingrese notas del proyecto aquí... (Ej: preferencias del cliente, observaciones del sitio, instrucciones especiales, etc.)"
                      className="min-h-[250px]" 
                      value={projectNotes}
                      onChange={(e) => setProjectNotes(e.target.value)}
                      data-testid="textarea-edit-project-notes"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleProjectNotesUpdate} disabled={isSaving} data-testid="button-save-project-notes">
                        {isSaving ? 'Guardando...' : 'Guardar Notas'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xs text-muted-foreground whitespace-pre-wrap min-h-[80px] max-h-[200px] overflow-y-auto p-3 bg-muted/30 rounded border">
                {projectNotes || 'Sin notas del proyecto. Click en el botón de edición para agregar notas.'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documents" className="flex-1 overflow-y-auto space-y-3 px-1">
          {/* Documentos del Sistema */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Documentos del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Presupuesto</div>
                  {project.estimateHtml ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full" 
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.open(`/estimate/${project.id}`, '_blank');
                        }
                      }}
                      data-testid="button-view-estimate"
                    >
                      <i className="ri-file-text-line mr-2"></i>
                      Ver Presupuesto
                    </Button>
                  ) : (
                    <div className="text-center p-3 border border-dashed rounded text-xs text-muted-foreground">
                      No disponible
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Contrato</div>
                  {project.contractHtml ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full" 
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          if (project.contractHtml) {
                            window.open(`/contract/${project.id}`, '_blank');
                          } else if (project.permanentPdfUrl) {
                            window.open(project.permanentPdfUrl, '_blank');
                          }
                        }
                      }}
                      data-testid="button-view-contract"
                    >
                      <i className="ri-file-text-line mr-2"></i>
                      Ver Contrato
                    </Button>
                  ) : (
                    <div className="text-center p-3 border border-dashed rounded text-xs text-muted-foreground">
                      No disponible
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FileManager */}
          <FileManager 
            projectId={project.id}
            attachments={project.attachments}
            onUpdate={(newAttachments) => {
              const updatedProject = { ...project, attachments: newAttachments };
              onUpdate(updatedProject);
            }}
          />
        </TabsContent>

        {/* Tab: Pagos */}
        <TabsContent value="payment" className="flex-1 overflow-y-auto space-y-3 px-1">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Información de Pago</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {/* Resumen de Pago */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded border">
                  <div className="text-xs text-muted-foreground mb-1">Precio Total</div>
                  <div className="text-lg font-bold">{formatCurrency(project.totalPrice || 0)}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded border">
                  <div className="text-xs text-muted-foreground mb-1">Estado</div>
                  <div className="mt-1">{getPaymentStatusBadge(project.paymentStatus || 'pending')}</div>
                </div>
              </div>

              {/* Historial de Pagos */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Historial de Pagos</div>
                {project.paymentDetails && project.paymentDetails.history && project.paymentDetails.history.length > 0 ? (
                  <div className="border rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                            <th className="px-3 py-2 text-left font-semibold">Monto</th>
                            <th className="px-3 py-2 text-left font-semibold">Método</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {project.paymentDetails.history.map((payment: any, index: number) => (
                            <tr key={index}>
                              <td className="px-3 py-2">{formatDate(payment.date)}</td>
                              <td className="px-3 py-2 font-medium">{formatCurrency(payment.amount)}</td>
                              <td className="px-3 py-2">{payment.method}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed rounded">
                    <i className="ri-money-dollar-circle-line text-3xl text-muted-foreground mb-2 block"></i>
                    <p className="text-xs text-muted-foreground">No hay historial de pagos</p>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1" data-testid="button-register-payment">
                      <i className="ri-money-dollar-circle-line mr-2"></i>
                      Registrar Pago
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Registrar Pago</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="payment-amount">Monto</Label>
                        <Input
                          id="payment-amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={paymentData.amount}
                          onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                          data-testid="input-payment-amount"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment-method">Método de Pago</Label>
                        <Select 
                          value={paymentData.method} 
                          onValueChange={(value) => setPaymentData({...paymentData, method: value})}
                        >
                          <SelectTrigger id="payment-method" data-testid="select-payment-method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="check">Cheque</SelectItem>
                            <SelectItem value="card">Tarjeta</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="payment-date">Fecha</Label>
                        <Input
                          id="payment-date"
                          type="date"
                          value={paymentData.date}
                          onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                          data-testid="input-payment-date"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment-notes">Notas (opcional)</Label>
                        <Textarea
                          id="payment-notes"
                          placeholder="Agregar notas sobre este pago..."
                          value={paymentData.notes}
                          onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                          className="min-h-[80px]"
                          data-testid="textarea-payment-notes"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleRegisterPayment} disabled={isSaving} data-testid="button-save-payment">
                          {isSaving ? 'Guardando...' : 'Registrar Pago'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  size="sm" 
                  className="flex-1" 
                  onClick={handleGenerateInvoice}
                  disabled={isSaving}
                  data-testid="button-generate-invoice"
                >
                  <i className="ri-bill-line mr-2"></i>
                  {isSaving ? 'Generando...' : 'Generar Factura'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
