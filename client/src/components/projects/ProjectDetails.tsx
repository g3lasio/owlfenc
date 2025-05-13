import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount / 100); // Assuming amount is stored in cents
  };

  const getPaymentStatusBadge = (status: string) => {
    if (!status) return null;
    
    const statusColors: {[key: string]: string} = {
      pending: 'bg-yellow-500',
      partial: 'bg-blue-500',
      paid: 'bg-green-500'
    };
    
    const statusLabels: {[key: string]: string} = {
      pending: 'Pendiente',
      partial: 'Pago Parcial',
      paid: 'Pagado'
    };
    
    return (
      <Badge className={`${statusColors[status]} text-white`}>
        {statusLabels[status]}
      </Badge>
    );
  };

  const getPermitStatusBadge = (status: string) => {
    if (!status) return null;
    
    const statusColors: {[key: string]: string} = {
      not_required: 'bg-slate-500',
      pending: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500'
    };
    
    const statusLabels: {[key: string]: string} = {
      not_required: 'No Requerido',
      pending: 'En Trámite',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };
    
    return (
      <Badge className={`${statusColors[status]} text-white`}>
        {statusLabels[status]}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="client" className="flex flex-col h-full">
        <TabsList className="mb-4 w-full flex flex-wrap sticky top-0 z-10 bg-background">
          <TabsTrigger value="client" className="flex-1">Cliente</TabsTrigger>
          <TabsTrigger value="project" className="flex-1">Proyecto</TabsTrigger>
          <TabsTrigger value="documents" className="flex-1">Documentos</TabsTrigger>
          <TabsTrigger value="payment" className="flex-1">Pagos</TabsTrigger>
        </TabsList>
        
        {/* SECCIÓN DE CLIENTE */}
        <TabsContent value="client">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Nombre</h3>
                <p>{project.clientName}</p>
              </div>
              
              {project.clientEmail && (
                <div>
                  <h3 className="font-medium">Email</h3>
                  <p>{project.clientEmail}</p>
                </div>
              )}
              
              {project.clientPhone && (
                <div>
                  <h3 className="font-medium">Teléfono</h3>
                  <p>{project.clientPhone}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-medium">Dirección del Proyecto</h3>
                <p>{project.address}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Notas del Cliente</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative">
                      <Textarea 
                        readOnly
                        value={project.clientNotes || 'Sin notas. Haga clic para agregar.'}
                        className="cursor-pointer h-28 resize-none"
                      />
                      <Button 
                        size="sm" 
                        className="absolute top-2 right-2" 
                        variant="ghost"
                      >
                        <i className="ri-edit-line"></i>
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="h-[60svh] md:h-auto flex flex-col p-0">
                    <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b">
                      <DialogTitle>Editar Notas del Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                      <Textarea 
                        placeholder="Ingrese notas sobre el cliente aquí..."
                        className="min-h-[150px] resize-none w-full" 
                        value={editableNotes.clientNotes}
                        onChange={(e) => setEditableNotes({...editableNotes, clientNotes: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
                      <Button 
                        onClick={handleNotesUpdate} 
                        disabled={isSaving}
                      >
                        {isSaving ? 'Guardando...' : 'Guardar Notas'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* SECCIÓN DE PROYECTO */}
        <TabsContent value="project">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Proyecto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Tipo de Cerca</h3>
                  <p>{project.fenceType}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Altura</h3>
                  <p>{project.height || 'No especificada'} {project.height ? 'ft' : ''}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Longitud</h3>
                  <p>{project.length || 'No especificada'} {project.length ? 'ft' : ''}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">ID del Proyecto</h3>
                  <p className="text-sm">{project.projectId}</p>
                </div>
              </div>
              
              {project.gates && project.gates.length > 0 && (
                <div>
                  <h3 className="font-medium">Puertas</h3>
                  <ul className="list-disc list-inside">
                    {project.gates.map((gate: any, index: number) => (
                      <li key={index}>
                        {gate.type} ({gate.width}" x {gate.height}")
                        {gate.hardware && <span> - {gate.hardware}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {project.permitStatus && (
                <div>
                  <h3 className="font-medium">Estado del Permiso</h3>
                  <p>{getPermitStatusBadge(project.permitStatus)}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-medium">Fecha Programada</h3>
                <p>{formatDate(project.scheduledDate)}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Notas Internas</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative">
                      <Textarea 
                        readOnly
                        value={project.internalNotes || 'Sin notas. Haga clic para agregar.'}
                        className="cursor-pointer h-28 resize-none"
                      />
                      <Button 
                        size="sm" 
                        className="absolute top-2 right-2" 
                        variant="ghost"
                      >
                        <i className="ri-edit-line"></i>
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="h-[60svh] md:h-auto flex flex-col p-0">
                    <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b">
                      <DialogTitle>Editar Notas Internas</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                      <Textarea 
                        placeholder="Ingrese notas internas aquí..."
                        className="min-h-[150px] resize-none w-full" 
                        value={editableNotes.internalNotes}
                        onChange={(e) => setEditableNotes({...editableNotes, internalNotes: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
                      <Button 
                        onClick={handleNotesUpdate} 
                        disabled={isSaving}
                      >
                        {isSaving ? 'Guardando...' : 'Guardar Notas'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* SECCIÓN DE DOCUMENTOS */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos del Proyecto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Presupuesto</h3>
                {project.estimateHtml ? (
                  <Button variant="outline">
                    <i className="ri-file-text-line mr-2"></i>
                    Ver Presupuesto
                  </Button>
                ) : (
                  <p className="text-muted-foreground">No hay presupuesto disponible</p>
                )}
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Contrato</h3>
                {project.contractHtml ? (
                  <Button variant="outline">
                    <i className="ri-file-text-line mr-2"></i>
                    Ver Contrato
                  </Button>
                ) : (
                  <p className="text-muted-foreground">No hay contrato disponible</p>
                )}
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Documentos Adjuntos</h3>
                {project.attachments && Object.keys(project.attachments).length > 0 ? (
                  <ul className="space-y-2">
                    {Object.entries(project.attachments).map(([key, url]: [string, any]) => (
                      <li key={key} className="flex items-center">
                        <i className="ri-file-line mr-2"></i>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {key}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No hay documentos adjuntos</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button>
                  <i className="ri-upload-line mr-2"></i>
                  Adjuntar Documento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* SECCIÓN DE PAGOS */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Precio Total</h3>
                  <p className="text-xl font-bold">{formatCurrency(project.totalPrice || 0)}</p>
                </div>
                <div>
                  <h3 className="font-medium">Estado de Pago</h3>
                  <div className="mt-1">
                    {getPaymentStatusBadge(project.paymentStatus || 'pending')}
                  </div>
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
                  <p className="text-muted-foreground">No hay historial de pagos</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <i className="ri-money-dollar-circle-line mr-2"></i>
                  Registrar Pago
                </Button>
                <Button>
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