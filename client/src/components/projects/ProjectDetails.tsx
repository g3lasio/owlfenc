import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  const [editableNotes, setEditableNotes] = useState({
    clientNotes: project.clientNotes || '',
    internalNotes: project.internalNotes || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleNotesUpdate = async () => {
    try {
      setIsSaving(true);

      const updatedProject = await updateProject(project.id, {
        clientNotes: editableNotes.clientNotes,
        internalNotes: editableNotes.internalNotes
      });

      onUpdate(updatedProject);

      toast({
        title: "Notas actualizadas",
        description: "Las notas del proyecto han sido actualizadas correctamente."
      });
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

    if (typeof date === 'object' && date.toDate) {
      date = date.toDate();
    }

    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return 'No establecido';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
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

  // Acciones rápidas del proyecto
  const quickActions = [
    { icon: "ri-phone-line", label: "Llamar Cliente", action: () => window.open(`tel:${project.clientPhone}`) },
    { icon: "ri-mail-line", label: "Email Cliente", action: () => window.open(`mailto:${project.clientEmail}`) },
    { icon: "ri-map-pin-line", label: "Ver Ubicación", action: () => window.open(`https://maps.google.com/?q=${encodeURIComponent(project.address)}`) },
    { icon: "ri-file-text-line", label: "Ver Contrato", action: () => {} },
  ];

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="project" className="flex flex-col h-full">
        <TabsList className="mb-4 w-full flex sticky top-0 z-10 bg-background">
          <TabsTrigger value="project" className="flex-1" data-testid="tab-project">📋 Proyecto</TabsTrigger>
          <TabsTrigger value="documents" className="flex-1" data-testid="tab-documents">📁 Documentos</TabsTrigger>
          <TabsTrigger value="payment" className="flex-1" data-testid="tab-payment">💰 Pagos</TabsTrigger>
        </TabsList>

        {/* ===== TAB PROYECTO (FUSIÓN DE CLIENTE + PROYECTO + TIMELINE) ===== */}
        <TabsContent value="project" className="space-y-4">
          {/* Timeline del Proyecto */}
          <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-cyan-400/20">
            <CardContent className="p-4">
              <FuturisticTimeline
                projectId={project.id}
                currentProgress={project.projectProgress || 'estimate_created'}
                onProgressUpdate={handleProgressUpdate}
              />
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="ri-flashlight-line"></i>
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-2"
                    onClick={action.action}
                    disabled={!project.clientPhone && action.icon === "ri-phone-line"}
                    data-testid={`button-quick-action-${index}`}
                  >
                    <i className={`${action.icon} text-xl`}></i>
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Información del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="ri-user-line"></i>
                Cliente y Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Grid de información del cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</label>
                  <p className="font-medium text-lg">{project.clientName}</p>
                </div>
                
                {project.clientEmail && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
                    <p className="font-medium">{project.clientEmail}</p>
                  </div>
                )}
                
                {project.clientPhone && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Teléfono</label>
                    <p className="font-medium">{project.clientPhone}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Dirección del Proyecto</label>
                  <p className="font-medium">{project.address}</p>
                </div>
              </div>

              {/* Detalles del Proyecto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-cyan-400 uppercase tracking-wider font-mono">Categoría</label>
                  <div className="bg-gray-800/50 border border-cyan-400/20 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const projectType = project.projectType || project.projectCategory || 'general';
                        const projectCategories = {
                          fencing: { name: "Cercas y Portones", icon: "fence" },
                          roofing: { name: "Techos", icon: "home" },
                          plumbing: { name: "Plomería", icon: "droplet" },
                          electrical: { name: "Electricidad", icon: "zap" },
                          carpentry: { name: "Carpintería", icon: "hammer" },
                          concrete: { name: "Concreto", icon: "square" },
                          landscaping: { name: "Paisajismo", icon: "tree" },
                          painting: { name: "Pintura", icon: "paint-bucket" },
                          flooring: { name: "Pisos", icon: "grid" },
                          hvac: { name: "HVAC", icon: "thermometer" },
                          general: { name: "Contratista General", icon: "tool" }
                        };
                        const category = projectCategories[projectType as keyof typeof projectCategories] || projectCategories.general;
                        return (
                          <>
                            <i className={`ri-${category.icon}-line text-cyan-400`}></i>
                            <span className="text-white text-sm">{category.name}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-cyan-400 uppercase tracking-wider font-mono">Tipo Específico</label>
                  <div className="bg-gray-800/50 border border-cyan-400/20 rounded px-3 py-2">
                    <span className="text-white text-sm">
                      {project.projectSubtype || project.fenceType || 'No especificado'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-cyan-400 uppercase tracking-wider font-mono">Fecha Programada</label>
                  <div className="bg-gray-800/50 border border-cyan-400/20 rounded px-3 py-2">
                    <span className="text-white text-sm">{formatDate(project.scheduledDate)}</span>
                  </div>
                </div>
              </div>

              {/* Dimensiones */}
              {(project.height || project.length) && (
                <div className="grid grid-cols-2 gap-4">
                  {project.height && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Altura</label>
                      <p className="font-medium">{project.height} ft</p>
                    </div>
                  )}
                  {project.length && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Longitud</label>
                      <p className="font-medium">{project.length} ft</p>
                    </div>
                  )}
                </div>
              )}

              {/* Puertas si existen */}
              {project.gates && project.gates.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Puertas/Portones</h3>
                  <ul className="space-y-1">
                    {project.gates.map((gate: any, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <i className="ri-door-line text-cyan-400"></i>
                        {gate.type} ({gate.width}" x {gate.height}")
                        {gate.hardware && <span className="text-muted-foreground">- {gate.hardware}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estado del Permiso */}
              {project.permitStatus && (
                <div>
                  <h3 className="font-medium mb-2">Estado del Permiso</h3>
                  <div>{getPermitStatusBadge(project.permitStatus)}</div>
                </div>
              )}

              {/* ID del Proyecto */}
              <div className="pt-2 border-t">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">ID del Proyecto</label>
                <p className="font-mono text-sm text-muted-foreground">{project.projectId}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notas del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Notas del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative">
                    <Textarea 
                      readOnly
                      value={project.clientNotes || 'Sin notas del cliente. Haga clic para agregar.'}
                      className="cursor-pointer h-28 resize-none"
                      data-testid="textarea-client-notes"
                    />
                    <Button 
                      size="sm" 
                      className="absolute top-2 right-2" 
                      variant="ghost"
                      aria-label="Editar notas del cliente"
                      data-testid="button-edit-client-notes"
                    >
                      <i className="ri-edit-line"></i>
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent className="flex flex-col p-0">
                  <DialogHeader className="sticky top-0 z-10 bg-background flex-shrink-0 p-4 md:p-6 border-b">
                    <DialogTitle>Editar Notas del Cliente</DialogTitle>
                  </DialogHeader>
                  <div className="dialog-scroll-container p-4 md:p-6">
                    <Textarea 
                      placeholder="Ingrese notas sobre el cliente aquí..."
                      className="min-h-[150px] resize-none w-full" 
                      value={editableNotes.clientNotes}
                      onChange={(e) => setEditableNotes({...editableNotes, clientNotes: e.target.value})}
                      data-testid="textarea-edit-client-notes"
                    />
                  </div>
                  <div className="sticky bottom-0 bg-background flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
                    <Button 
                      onClick={handleNotesUpdate} 
                      disabled={isSaving}
                      data-testid="button-save-client-notes"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar Notas'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Notas Internas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas Internas del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative">
                    <Textarea 
                      readOnly
                      value={project.internalNotes || 'Sin notas internas. Haga clic para agregar.'}
                      className="cursor-pointer h-28 resize-none"
                      data-testid="textarea-internal-notes"
                    />
                    <Button 
                      size="sm" 
                      className="absolute top-2 right-2" 
                      variant="ghost"
                      aria-label="Editar notas internas"
                      data-testid="button-edit-internal-notes"
                    >
                      <i className="ri-edit-line"></i>
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent className="flex flex-col p-0">
                  <DialogHeader className="sticky top-0 z-10 bg-background flex-shrink-0 p-4 md:p-6 border-b">
                    <DialogTitle>Editar Notas Internas</DialogTitle>
                  </DialogHeader>
                  <div className="dialog-scroll-container p-4 md:p-6">
                    <Textarea 
                      placeholder="Ingrese notas internas aquí..."
                      className="min-h-[150px] resize-none w-full" 
                      value={editableNotes.internalNotes}
                      onChange={(e) => setEditableNotes({...editableNotes, internalNotes: e.target.value})}
                      data-testid="textarea-edit-internal-notes"
                    />
                  </div>
                  <div className="sticky bottom-0 bg-background flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
                    <Button 
                      onClick={handleNotesUpdate} 
                      disabled={isSaving}
                      data-testid="button-save-internal-notes"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar Notas'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB DOCUMENTOS ===== */}
        <TabsContent value="documents">
          <div className="space-y-4">
            {/* Documentos del sistema (Presupuesto y Contrato) */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Documentos del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      📊 Presupuesto
                    </h3>
                    {project.estimateHtml ? (
                      <Button variant="outline" className="w-full" data-testid="button-view-estimate">
                        <div className="mr-2">📄</div>
                        Ver Presupuesto
                      </Button>
                    ) : (
                      <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-muted-foreground">No hay presupuesto disponible</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      📜 Contrato
                    </h3>
                    {project.contractHtml ? (
                      <Button variant="outline" className="w-full" data-testid="button-view-contract">
                        <div className="mr-2">📃</div>
                        Ver Contrato
                      </Button>
                    ) : (
                      <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-muted-foreground">No hay contrato disponible</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mensaje de ayuda para Firebase Storage */}
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <i className="ri-information-line text-yellow-500 text-xl mt-1"></i>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">⚠️ Si no puedes subir PDFs</p>
                    <p className="text-sm text-muted-foreground">
                      Firebase Storage requiere configuración de reglas de seguridad. 
                      Consulta el archivo <code className="text-xs bg-muted px-1 py-0.5 rounded">FIREBASE-STORAGE-RULES-PROJECTS.md</code> para instrucciones completas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sistema de gestión de archivos */}
            <FileManager 
              projectId={project.id}
              attachments={project.attachments}
              onUpdate={(newAttachments) => {
                const updatedProject = { ...project, attachments: newAttachments };
                onUpdate(updatedProject);
              }}
            />
          </div>
        </TabsContent>

        {/* ===== TAB PAGOS ===== */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Precio Total del Proyecto</h3>
                  <p className="text-3xl font-bold">{formatCurrency(project.totalPrice || 0)}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Estado de Pago</h3>
                  <div>{getPaymentStatusBadge(project.paymentStatus || 'pending')}</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Historial de Pagos</h3>
                {project.paymentDetails && project.paymentDetails.history && project.paymentDetails.history.length > 0 ? (
                  <div className="border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {project.paymentDetails.history.map((payment: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap">{formatDate(payment.date)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(payment.amount)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{payment.method}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <i className="ri-money-dollar-circle-line text-4xl text-muted-foreground mb-2"></i>
                    <p className="text-muted-foreground">No hay historial de pagos registrado</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" data-testid="button-register-payment">
                  <i className="ri-money-dollar-circle-line mr-2"></i>
                  Registrar Pago
                </Button>
                <Button data-testid="button-generate-invoice">
                  <i className="ri-bill-line mr-2"></i>
                  Generar Factura
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
