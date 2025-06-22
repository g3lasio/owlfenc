import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [editableData, setEditableData] = useState({
    // Client Information
    clientName: project.clientName || '',
    clientEmail: project.clientEmail || '',
    clientPhone: project.clientPhone || '',
    address: project.address || '',
    clientNotes: project.clientNotes || '',
    
    // Project Information
    projectType: project.projectType || project.projectCategory || 'general',
    projectSubtype: project.projectSubtype || project.fenceType || '',
    height: project.height || '',
    length: project.length || '',
    internalNotes: project.internalNotes || '',
    permitStatus: project.permitStatus || 'not_required'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState({
    client: false,
    project: false,
    clientNotes: false,
    internalNotes: false
  });
  const { toast } = useToast();

  // Update local state when project prop changes
  useEffect(() => {
    setEditableData({
      clientName: project.clientName || '',
      clientEmail: project.clientEmail || '',
      clientPhone: project.clientPhone || '',
      address: project.address || '',
      clientNotes: project.clientNotes || '',
      projectType: project.projectType || project.projectCategory || 'general',
      projectSubtype: project.projectSubtype || project.fenceType || '',
      height: project.height || '',
      length: project.length || '',
      internalNotes: project.internalNotes || '',
      permitStatus: project.permitStatus || 'not_required'
    });
  }, [project]);

  const handleUpdate = async (field: string, section?: string) => {
    try {
      setIsSaving(true);

      const updateData: any = {};
      
      if (section === 'client') {
        updateData.clientName = editableData.clientName;
        updateData.clientEmail = editableData.clientEmail;
        updateData.clientPhone = editableData.clientPhone;
        updateData.address = editableData.address;
      } else if (section === 'project') {
        updateData.projectType = editableData.projectType;
        updateData.projectCategory = editableData.projectType; // Keep both for compatibility
        updateData.projectSubtype = editableData.projectSubtype;
        updateData.fenceType = editableData.projectSubtype; // Keep both for compatibility
        updateData.height = editableData.height;
        updateData.length = editableData.length;
        updateData.permitStatus = editableData.permitStatus;
      } else if (field === 'clientNotes') {
        updateData.clientNotes = editableData.clientNotes;
      } else if (field === 'internalNotes') {
        updateData.internalNotes = editableData.internalNotes;
      }

      const updatedProject = await updateProject(project.id, updateData);
      onUpdate({ ...project, ...updateData });

      // Close edit mode
      if (section) {
        setEditMode(prev => ({ ...prev, [section]: false }));
      } else {
        setEditMode(prev => ({ ...prev, [field]: false }));
      }

      toast({
        title: "Updated successfully",
        description: "Project information has been updated."
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update project information."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (field: string) => {
    // Reset to original values
    setEditableData({
      clientName: project.clientName || '',
      clientEmail: project.clientEmail || '',
      clientPhone: project.clientPhone || '',
      address: project.address || '',
      clientNotes: project.clientNotes || '',
      projectType: project.projectType || project.projectCategory || 'general',
      projectSubtype: project.projectSubtype || project.fenceType || '',
      height: project.height || '',
      length: project.length || '',
      internalNotes: project.internalNotes || '',
      permitStatus: project.permitStatus || 'not_required'
    });
    
    setEditMode(prev => ({ ...prev, [field]: false }));
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
              {/* Editable Client Information */}
              {editMode.client ? (
                <div className="space-y-4 p-4 border border-cyan-400/30 rounded-lg bg-gray-800/30">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Client Name</label>
                    <Input
                      value={editableData.clientName}
                      onChange={(e) => setEditableData(prev => ({ ...prev, clientName: e.target.value }))}
                      className="bg-gray-700/50 border-cyan-400/20"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Email</label>
                    <Input
                      type="email"
                      value={editableData.clientEmail}
                      onChange={(e) => setEditableData(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="bg-gray-700/50 border-cyan-400/20"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Phone</label>
                    <Input
                      value={editableData.clientPhone}
                      onChange={(e) => setEditableData(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="bg-gray-700/50 border-cyan-400/20"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Project Address</label>
                    <Textarea
                      value={editableData.address}
                      onChange={(e) => setEditableData(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-gray-700/50 border-cyan-400/20 min-h-[80px]"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => handleUpdate('client', 'client')} 
                      disabled={isSaving}
                      size="sm"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      onClick={() => handleCancel('client')} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg">Client Information</h3>
                    <Button 
                      onClick={() => setEditMode(prev => ({ ...prev, client: true }))}
                      variant="outline"
                      size="sm"
                    >
                      <i className="ri-edit-line mr-2"></i>
                      Edit
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-300">Name</h4>
                      <p className="text-white">{editableData.clientName || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-300">Email</h4>
                      <p className="text-white">{editableData.clientEmail || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-300">Phone</h4>
                      <p className="text-white">{editableData.clientPhone || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-300">Project Address</h4>
                      <p className="text-white">{editableData.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-medium">Client Notes</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative">
                      <Textarea 
                        readOnly
                        value={editableData.clientNotes || 'No notes. Click to add.'}
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
                        value={editableData.clientNotes}
                        onChange={(e) => setEditableData(prev => ({...prev, clientNotes: e.target.value}))}
                      />
                    </div>
                    <div className="sticky bottom-0 bg-background flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
                      <Button 
                        onClick={() => handleUpdate('clientNotes')} 
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Notes'}
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
              {/* Editable Project Information */}
              {editMode.project ? (
                <div className="space-y-4 p-4 border border-cyan-400/30 rounded-lg bg-gray-800/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Project Category</label>
                      <Select
                        value={editableData.projectType}
                        onValueChange={(value) => setEditableData(prev => ({ ...prev, projectType: value }))}
                      >
                        <SelectTrigger className="bg-gray-700/50 border-cyan-400/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fencing">Fencing & Gates</SelectItem>
                          <SelectItem value="roofing">Roofing</SelectItem>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="carpentry">Carpentry</SelectItem>
                          <SelectItem value="concrete">Concrete</SelectItem>
                          <SelectItem value="landscaping">Landscaping</SelectItem>
                          <SelectItem value="painting">Painting</SelectItem>
                          <SelectItem value="flooring">Flooring</SelectItem>
                          <SelectItem value="hvac">HVAC</SelectItem>
                          <SelectItem value="general">General Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Specific Type</label>
                      <Input
                        value={editableData.projectSubtype}
                        onChange={(e) => setEditableData(prev => ({ ...prev, projectSubtype: e.target.value }))}
                        placeholder="e.g., Privacy fence, Chain link, etc."
                        className="bg-gray-700/50 border-cyan-400/20"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Height (ft)</label>
                      <Input
                        type="number"
                        value={editableData.height}
                        onChange={(e) => setEditableData(prev => ({ ...prev, height: e.target.value }))}
                        className="bg-gray-700/50 border-cyan-400/20"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Length (ft)</label>
                      <Input
                        type="number"
                        value={editableData.length}
                        onChange={(e) => setEditableData(prev => ({ ...prev, length: e.target.value }))}
                        className="bg-gray-700/50 border-cyan-400/20"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Permit Status</label>
                      <Select
                        value={editableData.permitStatus}
                        onValueChange={(value) => setEditableData(prev => ({ ...prev, permitStatus: value }))}
                      >
                        <SelectTrigger className="bg-gray-700/50 border-cyan-400/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_required">Not Required</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => handleUpdate('project', 'project')} 
                      disabled={isSaving}
                      size="sm"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      onClick={() => handleCancel('project')} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg">Project Information</h3>
                    <Button 
                      onClick={() => setEditMode(prev => ({ ...prev, project: true }))}
                      variant="outline"
                      size="sm"
                    >
                      <i className="ri-edit-line mr-2"></i>
                      Edit
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-cyan-400 mb-1 block font-mono">PROJECT CATEGORY</label>
                      <div className="bg-gray-800/50 border border-cyan-400/20 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          {(() => {
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
                            const category = projectCategories[editableData.projectType as keyof typeof projectCategories] || projectCategories.general;
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

                    <div>
                      <label className="text-xs text-cyan-400 mb-1 block font-mono">SPECIFIC TYPE</label>
                      <div className="bg-gray-800/50 border border-cyan-400/20 rounded px-3 py-2">
                        <span className="text-white text-sm">
                          {editableData.projectSubtype || 'Not specified'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-300">Height</h4>
                      <p className="text-white">{editableData.height ? `${editableData.height} ft` : 'Not specified'}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-300">Length</h4>
                      <p className="text-white">{editableData.length ? `${editableData.length} ft` : 'Not specified'}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-300">Project ID</h4>
                      <p className="text-sm text-white">{project.projectId}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-300">Permit Status</h4>
                      <div className="mt-1">
                        {getPermitStatusBadge(editableData.permitStatus)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                        value={editableData.internalNotes || 'No notes. Click to add.'}
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
                        value={editableData.internalNotes}
                        onChange={(e) => setEditableData(prev => ({...prev, internalNotes: e.target.value}))}
                      />
                    </div>
                    <div className="sticky bottom-0 bg-background flex justify-end space-x-2 p-4 md:p-6 border-t flex-shrink-0">
                      <Button 
                        onClick={() => handleUpdate('internalNotes')} 
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Notes'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS SECTION */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Project Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProjectDocuments 
                projectId={project.id} 
                projectName={project.clientName}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENT SECTION */}
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