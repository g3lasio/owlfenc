import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  Mail,
  CheckCircle,
  Clock,
  Edit,
  Send,
  Zap,
  Apple,
  Wallet
} from 'lucide-react';

interface Project {
  id: number;
  clientName: string;
  clientEmail?: string;
  address: string;
  status?: string;
  totalPrice?: number;
  description?: string;
}

interface Payment {
  id: number;
  projectId?: number;
  type: string;
  status: string;
  amount: number;
  description?: string;
  createdAt: string;
  invoiceNumber?: string;
}

interface IntegratedProjectPaymentFlowProps {
  projects: Project[] | undefined;
  projectsLoading: boolean;
  payments: Payment[] | undefined;
  onCreatePayment: (paymentData: any) => void;
  onResendPaymentLink: (paymentId: number) => void;
  isCreatingPayment: boolean;
}

export default function IntegratedProjectPaymentFlow({
  projects,
  projectsLoading,
  payments,
  onCreatePayment,
  onResendPaymentLink,
  isCreatingPayment
}: IntegratedProjectPaymentFlowProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'deposit' | 'final' | 'custom'>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'cash' | 'external'>('card');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editableProject, setEditableProject] = useState<Partial<Project>>({});
  const { toast } = useToast();

  // Calculate payment amounts
  // IMPORTANT: project.totalPrice is in DOLLARS (from Firebase)
  // payment.amount is in CENTS (from PostgreSQL/Stripe)
  const calculateAmounts = (project: Project) => {
    const totalAmount = project.totalPrice || 0; // Already in dollars
    const projectPayments = payments?.filter(p => p.projectId === project.id) || [];
    const totalPaid = projectPayments
      .filter(p => p.status === 'paid' || p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0) / 100; // Convert cents to dollars
    const totalPending = projectPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0) / 100; // Convert cents to dollars
    
    const depositAmount = totalAmount * 0.5;
    const finalAmount = totalAmount * 0.5;
    const remainingBalance = totalAmount - totalPaid;

    return {
      totalAmount,
      totalPaid,
      totalPending,
      remainingBalance,
      depositAmount,
      finalAmount,
      projectPayments
    };
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get project status styling
  const getProjectStatus = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'estimate': return { label: 'Estimate', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'borrador': return { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-300' };
      case 'enviado': return { label: 'Sent', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'aprobado': return { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-300' };
      case 'completado': return { label: 'Completed', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      default: return { label: status || 'Active', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
  };

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setEditableProject({ ...project });
    setClientEmail(project.clientEmail || '');
    const amounts = calculateAmounts(project);
    setPaymentAmount(amounts.depositAmount.toString());
  };

  // Handle payment creation
  const handleCreatePayment = () => {
    if (!selectedProject || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a project and enter payment amount.",
        variant: "destructive"
      });
      return;
    }

    const paymentData = {
      projectId: selectedProject.id,
      amount: parseFloat(paymentAmount) * 100, // Convert to cents
      type: paymentType,
      description: paymentNotes || `${paymentType} payment for ${selectedProject.clientName}`,
      clientEmail: clientEmail,
      clientName: selectedProject.clientName,
      paymentMethod: paymentMethod
    };

    onCreatePayment(paymentData);
    setShowPaymentDialog(false);
    
    toast({
      title: "Payment Created Successfully",
      description: `${paymentType} payment of ${formatCurrency(parseFloat(paymentAmount))} has been created and invoice sent to ${clientEmail}`,
    });
  };

  // Update payment amount based on type
  useEffect(() => {
    if (selectedProject) {
      const amounts = calculateAmounts(selectedProject);
      switch(paymentType) {
        case 'deposit':
          setPaymentAmount(amounts.depositAmount.toString());
          break;
        case 'final':
          setPaymentAmount(amounts.finalAmount.toString());
          break;
        default:
          // Keep current amount for custom
          break;
      }
    }
  }, [paymentType, selectedProject]);

  if (projectsLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading projects...</p>
        </CardContent>
      </Card>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No Projects Found</h3>
          <p className="text-muted-foreground">Create projects first to manage their payments.</p>
          <Button className="mt-4" onClick={() => window.location.href = '/projects'}>
            <FileText className="mr-2 h-4 w-4" />
            Go to Projects
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Integrated Payment Processing</h2>
          <p className="text-muted-foreground">
            Complete payment workflow for your {projects.length} active projects
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/projects'}>
          <FileText className="mr-2 h-4 w-4" />
          View All Projects
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 ">
            {projects.map((project) => {
              const amounts = calculateAmounts(project);
              const statusInfo = getProjectStatus(project.status || '');
              const isSelected = selectedProject?.id === project.id;

              return (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary shadow-md' : ''
                  }`}
                  onClick={() => handleProjectSelect(project)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{project.clientName}</h4>
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{project.address}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Paid: {formatCurrency(amounts.totalPaid)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>Pending: {formatCurrency(amounts.totalPending)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Total: {formatCurrency(amounts.totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>Balance: {formatCurrency(amounts.remainingBalance)}</span>
                        </div>
                      </div>
                      {amounts.totalAmount > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Payment Progress</span>
                            <span>{Math.round((amounts.totalPaid / amounts.totalAmount) * 100)}%</span>
                          </div>
                          <Progress 
                            value={(amounts.totalPaid / amounts.totalAmount) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Payment Processing Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProject ? (
              <div className="text-center py-8">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Select a Project</h3>
                <p className="text-muted-foreground">Choose a project from the list to start processing payments</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Project Summary */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Project Summary</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPaymentDialog(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Details
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Client</Label>
                      <p>{selectedProject.clientName}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Project Value</Label>
                      <p>{formatCurrency(calculateAmounts(selectedProject).totalAmount)}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                      <p>{selectedProject.address}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Payment Options */}
                <div className="space-y-4">
                  <h5 className="font-medium">Quick Payment Options</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => {
                        setPaymentType('deposit');
                        const amounts = calculateAmounts(selectedProject);
                        setPaymentAmount(amounts.depositAmount.toString());
                        setShowPaymentDialog(true);
                      }}
                    >
                      <DollarSign className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium">50% Deposit</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(calculateAmounts(selectedProject).depositAmount)}
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => {
                        setPaymentType('final');
                        const amounts = calculateAmounts(selectedProject);
                        setPaymentAmount(amounts.finalAmount.toString());
                        setShowPaymentDialog(true);
                      }}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium">Final Payment</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(calculateAmounts(selectedProject).finalAmount)}
                        </div>
                      </div>
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setPaymentType('custom');
                      setShowPaymentDialog(true);
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Custom Payment Amount
                  </Button>
                </div>

                {/* Recent Payment History */}
                {(() => {
                  const amounts = calculateAmounts(selectedProject);
                  return amounts.projectPayments.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-medium">Recent Payments</h5>
                      <div className="space-y-2 max-h-32 ">
                        {amounts.projectPayments.slice(0, 3).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                payment.type === 'deposit' ? 'bg-blue-100 text-blue-700' :
                                payment.type === 'final' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {payment.type === 'deposit' ? 'D' : payment.type === 'final' ? 'F' : 'C'}
                              </div>
                              <div>
                                <div className="text-sm font-medium capitalize">{payment.type}</div>
                                <div className="text-xs text-muted-foreground">
                                  {payment.invoiceNumber || `PAY-${payment.id}`}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{formatCurrency(payment.amount / 100)}</div>
                              <Badge variant={payment.status === 'paid' || payment.status === 'succeeded' ? 'default' : 'secondary'} className="text-xs">
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Process Payment
            </DialogTitle>
            <DialogDescription>
              Configure payment details and select payment method for {selectedProject?.clientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Type Selection */}
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={(value: 'deposit' | 'final' | 'custom') => setPaymentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">50% Deposit</SelectItem>
                  <SelectItem value="final">Final Payment</SelectItem>
                  <SelectItem value="custom">Custom Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <Label>Payment Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-9"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            {/* Client Email */}
            <div className="space-y-3">
              <Label>Client Email (for invoice)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="pl-9"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Credit/Debit Card</span>
                </Button>
                <Button
                  variant={paymentMethod === 'apple_pay' ? 'default' : 'outline'}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setPaymentMethod('apple_pay')}
                >
                  <Apple className="h-5 w-5" />
                  <span>Apple Pay</span>
                </Button>
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="h-5 w-5" />
                  <span>Cash Payment</span>
                </Button>
                <Button
                  variant={paymentMethod === 'external' ? 'default' : 'outline'}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setPaymentMethod('external')}
                >
                  <Receipt className="h-5 w-5" />
                  <span>Check/External</span>
                </Button>
              </div>
            </div>

            {/* Payment Notes */}
            <div className="space-y-3">
              <Label>Payment Notes (Optional)</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add any notes about this payment..."
                rows={3}
              />
            </div>

            {/* Payment Summary */}
            {selectedProject && (
              <Alert>
                <Receipt className="h-4 w-4" />
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Payment Amount: <strong>{formatCurrency(parseFloat(paymentAmount) || 0)}</strong></div>
                    <div>Payment Method: <strong className="capitalize">{paymentMethod.replace('_', ' ')}</strong></div>
                    <div>Client: <strong>{selectedProject.clientName}</strong></div>
                    <div>Invoice will be sent to: <strong>{clientEmail}</strong></div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePayment}
                disabled={!paymentAmount || !clientEmail || isCreatingPayment}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isCreatingPayment ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Charge Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}