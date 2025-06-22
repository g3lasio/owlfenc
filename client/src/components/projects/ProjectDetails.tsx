import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectDocuments from "./ProjectDocuments";

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
          <TabsTrigger value="client" className="flex-1">Client</TabsTrigger>
          <TabsTrigger value="project" className="flex-1">Project</TabsTrigger>
          <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
          <TabsTrigger value="payment" className="flex-1">Payment</TabsTrigger>
        </TabsList>

        {/* SECCIÓN DE CLIENTE */}
        <TabsContent value="client">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Name</h3>
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
                  <h3 className="font-medium">Phone</h3>
                  <p>{project.clientPhone}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium">Project Address</h3>
                <p>{project.address}</p>
              </div>

              <div>
                <h3 className="font-medium">Client Notes</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative">
                      <Textarea 
                        readOnly
                        value={project.clientNotes || 'No notes. Click to add.'}
                        className="cursor-pointer h-28 resize-none"
                      />
                      <Button 
                        size="sm" 
                        className="absolute top-2 right-2" 
                        variant="ghost"
                        aria-label="Edit client notes"
                      >
                        <i className="ri-edit-line"></i>
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="flex flex-col p-0">
                    <DialogHeader className="sticky top-0 z-10 bg-background flex-shrink-0 p-4 md:p-6 border-b">
                      <DialogTitle>Edit Client Notes</DialogTitle>
                    </DialogHeader>
                    <div className="dialog-scroll-container p-4 md:p-6">
                      <Textarea 
                        placeholder="Enter client notes here..."
                        className="min-h-[150px] resize-none w-full" 
                        value={editableNotes.clientNotes}
                        onChange={(e) => setEditableNotes({...editableNotes, clientNotes: e.target.value})}
                      />
                    </div>
                    <div className="sticky bottom-0 bg-background flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
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
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  {/* Project Category */}
                  <div>
                    <label className="text-xs text-cyan-400 mb-1 block font-mono">PROJECT CATEGORY</label>
                    <div className="bg-gray-800/50 border border-cyan-400/20 rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const projectType = project.projectType || project.projectCategory || 'general';
                          const projectCategories = {
                            fencing: { name: "Fencing & Gates", icon: "fence" },
                            roofing: { name: "Roofing", icon: "home" },
                            plumbing: { name: "Plumbing", icon: "droplet" },
                            electrical: { name: "Electrical", icon: "zap" },
                            carpentry: { name: "Carpentry", icon: "hammer" },
                            concrete: { name: "Concrete", icon: "square" },
                            landscaping: { name: "Landscaping", icon: "tree" },
                            painting: { name: "Painting", icon: "paint-bucket" },
                            flooring: { name: "Flooring", icon: "grid" },
                            hvac: { name: "HVAC", icon: "thermometer" },
                            general: { name: "General Contractor", icon: "tool" }
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

                  {/* Specific Type */}
                  <div>
                    <label className="text-xs text-cyan-400 mb-1 block font-mono">SPECIFIC TYPE</label>
                    <div className="bg-gray-800/50 border border-cyan-400/20 rounded px-3 py-2">
                      <span className="text-white text-sm">
                        {project.projectSubtype || project.fenceType || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium">Height</h3>
                  <p>{project.height || 'Not specified'} {project.height ? 'ft' : ''}</p>
                </div>

                <div>
                  <h3 className="font-medium">Length</h3>
                  <p>{project.length || 'Not specified'} {project.length ? 'ft' : ''}</p>
                </div>

                <div>
                  <h3 className="font-medium">Project ID</h3>
                  <p className="text-sm">{project.projectId}</p>
                </div>
              </div>

              {project.gates && project.gates.length > 0 && (
                <div>
                  <h3 className="font-medium">Gates</h3>
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
                  <h3 className="font-medium">Permit Status</h3>
                  <p>{getPermitStatusBadge(project.permitStatus)}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium">Scheduled Date</h3>
                <p>{formatDate(project.scheduledDate)}</p>
              </div>

              <div>
                <h3 className="font-medium">Internal Notes</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative">
                      <Textarea 
                        readOnly
                        value={project.internalNotes || 'No notes. Click to add.'}
                        className="cursor-pointer h-28 resize-none"
                      />
                      <Button 
                        size="sm" 
                        className="absolute top-2 right-2" 
                        variant="ghost"
                        aria-label="Edit internal notes"
                      >
                        <i className="ri-edit-line"></i>
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="flex flex-col p-0">
                    <DialogHeader className="sticky top-0 z-10 bg-background flex-shrink-0 p-4 md:p-6 border-b">
                      <DialogTitle>Edit Internal Notes</DialogTitle>
                    </DialogHeader>
                    <div className="dialog-scroll-container p-4 md:p-6">
                      <Textarea 
                        placeholder="Enter internal notes here..."
                        className="min-h-[150px] resize-none w-full" 
                        value={editableNotes.internalNotes}
                        onChange={(e) => setEditableNotes({...editableNotes, internalNotes: e.target.value})}
                      />
                    </div>
                    <div className="sticky bottom-0 bg-background flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
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



        {/* SECCIÓN DE PAGOS */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Total Price</h3>
                  <p className="text-xl font-bold">{formatCurrency(project.totalPrice || 0)}</p>
                </div>
                <div>
                  <h3 className="font-medium">Payment Status</h3>
                  <div className="mt-1">
                    {getPaymentStatusBadge(project.paymentStatus || 'pending')}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Payment History</h3>
                {project.paymentDetails && project.paymentDetails.history && project.paymentDetails.history.length > 0 ? (
                  <div className="border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
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
                  <p className="text-muted-foreground">No payment history</p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <i className="ri-money-dollar-circle-line mr-2"></i>
                  Record Payment
                </Button>
                <Button>
                  <i className="ri-bill-line mr-2"></i>
                  Generate Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}