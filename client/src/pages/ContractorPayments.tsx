import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  CreditCard, 
  Send, 
  Plus, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Mail,
  Receipt,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react';

interface PaymentSummary {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  totalRevenue: number;
  pendingCount: number;
  paidCount: number;
}

interface ProjectPayment {
  id: number;
  projectId: number;
  amount: number;
  type: 'deposit' | 'final' | 'milestone' | 'additional';
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'expired';
  description: string;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  checkoutUrl?: string;
  dueDate?: string;
  paidDate?: string;
  sentDate?: string;
  createdAt: string;
}

const ContractorPayments: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    projectId: '',
    amount: '',
    type: 'deposit' as 'deposit' | 'final' | 'milestone' | 'additional',
    description: '',
    clientEmail: '',
    clientName: '',
  });

  // Fetch payment summary
  const { data: paymentSummary, isLoading: summaryLoading } = useQuery<PaymentSummary>({
    queryKey: ['/api/contractor-payments/dashboard/summary'],
    queryFn: () => apiRequest('GET', '/api/contractor-payments/dashboard/summary').then(res => res.json()).then(data => data.data),
  });

  // Fetch all payments
  const { data: payments, isLoading: paymentsLoading } = useQuery<ProjectPayment[]>({
    queryKey: ['/api/contractor-payments/payments'],
    queryFn: () => apiRequest('GET', '/api/contractor-payments/payments').then(res => res.json()).then(data => data.data),
  });

  // Fetch projects for payment creation
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('GET', '/api/projects').then(res => res.json()),
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (paymentData: any) => 
      apiRequest('POST', '/api/contractor-payments/payments', paymentData).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Payment Created",
        description: `Payment link created successfully. Invoice: ${data.data.invoiceNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments'] });
      setShowCreatePaymentModal(false);
      setPaymentForm({
        projectId: '',
        amount: '',
        type: 'deposit',
        description: '',
        clientEmail: '',
        clientName: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  // Quick payment link mutation
  const quickPaymentMutation = useMutation({
    mutationFn: (data: { projectId: number; type: 'deposit' | 'final' }) =>
      apiRequest('POST', '/api/contractor-payments/payments/quick-link', data).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Payment Link Created",
        description: `Quick payment link created for ${data.data.invoiceNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments'] });
    },
  });

  // Send payment link mutation
  const sendPaymentMutation = useMutation({
    mutationFn: (paymentId: number) =>
      apiRequest('POST', `/api/contractor-payments/payments/${paymentId}/send`).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Payment Link Sent",
        description: "Payment link sent to client successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments'] });
    },
  });

  const handleCreatePayment = () => {
    const amount = parseFloat(paymentForm.amount) * 100; // Convert to cents
    
    createPaymentMutation.mutate({
      projectId: parseInt(paymentForm.projectId),
      amount,
      type: paymentForm.type,
      description: paymentForm.description,
      clientEmail: paymentForm.clientEmail,
      clientName: paymentForm.clientName,
    });
  };

  const handleQuickPayment = (projectId: number, type: 'deposit' | 'final') => {
    quickPaymentMutation.mutate({ projectId, type });
  };

  const handleSendPayment = (paymentId: number) => {
    sendPaymentMutation.mutate(paymentId);
  };

  const copyPaymentLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Payment link copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      succeeded: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      failed: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      canceled: { variant: 'outline' as const, icon: AlertCircle, color: 'text-gray-600' },
      expired: { variant: 'outline' as const, icon: Clock, color: 'text-orange-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (summaryLoading || paymentsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Manage your project payments and client invoicing</p>
        </div>
        <Dialog open={showCreatePaymentModal} onOpenChange={setShowCreatePaymentModal}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Payment</DialogTitle>
              <DialogDescription>
                Create a payment request for your project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={paymentForm.projectId} onValueChange={(value) => 
                  setPaymentForm({ ...paymentForm, projectId: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.clientName} - {project.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Payment Type</Label>
                  <Select value={paymentForm.type} onValueChange={(value: any) => 
                    setPaymentForm({ ...paymentForm, type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit (50%)</SelectItem>
                      <SelectItem value="final">Final Payment</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="additional">Additional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  placeholder="Payment description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={paymentForm.clientName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, clientName: e.target.value })}
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={paymentForm.clientEmail}
                    onChange={(e) => setPaymentForm({ ...paymentForm, clientEmail: e.target.value })}
                    placeholder="client@email.com"
                  />
                </div>
              </div>

              <Button 
                onClick={handleCreatePayment} 
                className="w-full"
                disabled={createPaymentMutation.isPending}
              >
                {createPaymentMutation.isPending ? 'Creating...' : 'Create Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="payments">All Payments</TabsTrigger>
          <TabsTrigger value="projects">Project Payments</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatAmount(paymentSummary?.totalPending || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentSummary?.pendingCount || 0} pending payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatAmount(paymentSummary?.totalPaid || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentSummary?.paidCount || 0} completed payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatAmount(paymentSummary?.totalOverdue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAmount(paymentSummary?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  All-time revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.slice(0, 5).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">
                        {payment.invoiceNumber}
                      </TableCell>
                      <TableCell>{payment.clientName}</TableCell>
                      <TableCell className="capitalize">{payment.type}</TableCell>
                      <TableCell>{formatAmount(payment.amount / 100)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{formatDate(payment.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {payment.checkoutUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyPaymentLink(payment.checkoutUrl!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                          {payment.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendPayment(payment.id)}
                              disabled={sendPaymentMutation.isPending}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Payments</CardTitle>
              <CardDescription>Complete payment history and management</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">
                        {payment.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.clientName}</div>
                          <div className="text-sm text-muted-foreground">{payment.clientEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell className="capitalize">{payment.type}</TableCell>
                      <TableCell>{formatAmount(payment.amount / 100)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {payment.dueDate ? formatDate(payment.dueDate) : 'No due date'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {payment.checkoutUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyPaymentLink(payment.checkoutUrl!)}
                              title="Copy payment link"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                          {payment.status === 'pending' && payment.clientEmail && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendPayment(payment.id)}
                              disabled={sendPaymentMutation.isPending}
                              title="Send payment link"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                          {payment.checkoutUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(payment.checkoutUrl, '_blank')}
                              title="Open payment page"
                            >
                              <Receipt className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Payments Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Payment Management</CardTitle>
              <CardDescription>Create and manage payments by project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects?.map((project: any) => {
                  const projectPayments = payments?.filter(p => p.projectId === project.id) || [];
                  const totalAmount = project.totalPrice ? project.totalPrice / 100 : 0;
                  const depositAmount = totalAmount * 0.5;
                  const finalAmount = totalAmount * 0.5;
                  
                  return (
                    <Card key={project.id} className="border">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{project.clientName}</CardTitle>
                            <CardDescription>{project.address}</CardDescription>
                            <div className="mt-2 text-sm text-muted-foreground">
                              Total Project Value: {formatAmount(totalAmount)}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickPayment(project.id, 'deposit')}
                              disabled={quickPaymentMutation.isPending}
                            >
                              Create Deposit ({formatAmount(depositAmount)})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickPayment(project.id, 'final')}
                              disabled={quickPaymentMutation.isPending}
                            >
                              Create Final ({formatAmount(finalAmount)})
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {projectPayments.length > 0 && (
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell className="font-mono">
                                    {payment.invoiceNumber}
                                  </TableCell>
                                  <TableCell className="capitalize">{payment.type}</TableCell>
                                  <TableCell>{formatAmount(payment.amount / 100)}</TableCell>
                                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {payment.checkoutUrl && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => copyPaymentLink(payment.checkoutUrl!)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      )}
                                      {payment.status === 'pending' && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSendPayment(payment.id)}
                                          disabled={sendPaymentMutation.isPending}
                                        >
                                          <Send className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractorPayments;