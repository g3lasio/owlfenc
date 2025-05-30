import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { 
  AlertCircle, BarChart4, CreditCard, DollarSign, Send, Settings, 
  User, TrendingUp, Activity, PieChart, Calendar, ArrowUpRight, 
  ArrowDownRight, CheckCircle, Clock, X, Copy, Mail, Receipt,
  Plus, FileText, BanknoteIcon, Wallet, Calculator
} from 'lucide-react';
import QuickProjectFlow from '@/components/unified-workflow/QuickProjectFlow';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, 
  PieChart as RechartsPieChart, Pie, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Payment tracker types
type ProjectPayment = {
  id: number;
  projectId?: number;
  projectName?: string;
  type: 'deposit' | 'final' | 'custom' | 'cash' | 'check' | 'card';
  status: 'pending' | 'paid' | 'succeeded' | 'expired' | 'cancelled' | 'canceled';
  amount: number;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  checkoutUrl?: string | null;
  description?: string;
  paymentMethod?: string;
  clientName?: string;
  clientEmail?: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt?: string | null;
  paymentDate?: string | null;
  dueDate?: string | null;
  sentDate?: string | null;
};

// Payment summary statistics type
type PaymentSummary = {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  totalRevenue: number;
  pendingCount: number;
  paidCount: number;
};

const ProjectPayments: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activePaidTab, setActivePaidTab] = useState('all');
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [paymentType, setPaymentType] = useState('deposit');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);

  // Real payment summary - connects to contractor payment API
  const { data: paymentSummary, isLoading: summaryLoading } = useQuery<PaymentSummary>({
    queryKey: ['/api/contractor-payments/dashboard/summary'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/contractor-payments/dashboard/summary');
        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Error fetching payment summary:', error);
        // Fallback to default summary if API fails
        return {
          totalPending: 0,
          totalPaid: 0,
          totalOverdue: 0,
          totalRevenue: 0,
          pendingCount: 0,
          paidCount: 0
        };
      }
    },
  });

  // Get payment links from contractor payments API
  const { data: payments, isLoading, error } = useQuery<ProjectPayment[]>({
    queryKey: ['/api/contractor-payments/payments'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/contractor-payments/payments');
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
    }
  });

  // Fetch projects for payment creation
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/projects');
        return response.json();
      } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
    },
  });

  // Obtener el estado de la cuenta de Stripe
  const { data: stripeAccountStatus } = useQuery({
    queryKey: ['stripe-account-status'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/payments/connect/account-status');
        return response.json();
      } catch (error) {
        console.error('Error obteniendo estado de cuenta Stripe:', error);
        return { hasStripeAccount: false };
      }
    }
  });

  // Create payment link mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest('POST', '/api/contractor-payments/payments', paymentData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Link Created",
        description: `Payment link created successfully with invoice: ${data.data.invoiceNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments'] });
      setShowPaymentLinkModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Payment",
        description: error.message || "Failed to create payment link",
        variant: "destructive",
      });
    },
  });

  // Create cash payment mutation
  const createCashPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest('POST', '/api/contractor-payments/payments', {
        ...paymentData,
        status: 'paid', // Cash payments are immediately marked as paid
        paymentMethod: 'cash'
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cash Payment Recorded",
        description: `Cash payment of $${paymentAmount} recorded successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments'] });
      setShowCashPaymentModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error Recording Payment",
        description: error.message || "Failed to record cash payment",
        variant: "destructive",
      });
    },
  });

  // Mutación para reenviar enlaces de pago
  const resendPaymentLinkMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest('POST', `/api/contractor-payments/payments/${paymentId}/send`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment link resent",
        description: "The payment link has been successfully sent to the client",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not resend payment link",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setPaymentAmount('');
    setPaymentDescription('');
    setSelectedProject('');
    setPaymentType('deposit');
    setClientName('');
    setClientEmail('');
  };

  const handleCreatePaymentLink = () => {
    if (!selectedProject || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a project and enter an amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount) * 100; // Convert to cents
    
    createPaymentMutation.mutate({
      projectId: parseInt(selectedProject),
      amount,
      type: paymentType,
      description: paymentDescription,
      clientEmail: clientEmail,
      clientName: clientName,
    });
  };

  const handleCreateCashPayment = () => {
    if (!selectedProject || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a project and enter an amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount) * 100; // Convert to cents
    
    createCashPaymentMutation.mutate({
      projectId: parseInt(selectedProject),
      amount,
      type: paymentType,
      description: paymentDescription,
      clientName: clientName,
    });
  };

  // Function to resend payment link
  const resendPaymentLink = (paymentId: number) => {
    resendPaymentLinkMutation.mutate(paymentId);
  };

  // Function to copy payment link
  const copyPaymentLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Payment link copied to clipboard",
    });
  };

  // Connect to Stripe
  const connectToStripe = async () => {
    try {
      const response = await apiRequest('POST', '/api/payments/connect/create-onboarding');
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error al conectar cuenta de Stripe:', error);
      toast({
        title: "Error connecting to Stripe",
        description: "Could not create Stripe Connect account",
        variant: "destructive",
      });
    }
  };

  // Function to format payment type
  const formatPaymentType = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Deposit (50%)';
      case 'final':
        return 'Final Payment (50%)';
      case 'custom':
        return 'Custom Payment';
      case 'cash':
        return 'Cash Payment';
      case 'check':
        return 'Check Payment';
      case 'card':
        return 'Card Payment';
      default:
        return type;
    }
  };

  // Function to format payment status
  const formatPaymentStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'paid':
      case 'succeeded':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'cancelled':
      case 'canceled':
        return <Badge variant="secondary"><X className="w-3 h-3 mr-1" />Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Data for charts and statistics  
  const monthlyRevenueData = [
    { name: 'Jan', income: paymentSummary?.totalRevenue ? paymentSummary.totalRevenue * 0.15 : 3500, expenses: 2100, profit: 1400 },
    { name: 'Feb', income: paymentSummary?.totalRevenue ? paymentSummary.totalRevenue * 0.18 : 4200, expenses: 2300, profit: 1900 },
    { name: 'Mar', income: paymentSummary?.totalRevenue ? paymentSummary.totalRevenue * 0.22 : 5000, expenses: 2800, profit: 2200 },
    { name: 'Apr', income: paymentSummary?.totalRevenue ? paymentSummary.totalRevenue * 0.20 : 4600, expenses: 2500, profit: 2100 },
    { name: 'May', income: paymentSummary?.totalRevenue ? paymentSummary.totalRevenue * 0.12 : 7800, expenses: 3200, profit: 4600 },
    { name: 'Jun', income: paymentSummary?.totalRevenue ? paymentSummary.totalRevenue * 0.13 : 9200, expenses: 3800, profit: 5400 },
  ];

  const paymentTypeDistribution = [
    { name: 'Deposits', value: 65 },
    { name: 'Final Payments', value: 35 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const paymentStatusData = [
    { status: 'Paid', count: paymentSummary?.paidCount || 0, color: '#00C49F' },
    { status: 'Pending', count: paymentSummary?.pendingCount || 0, color: '#FFBB28' },
    { status: 'Overdue', count: Math.floor((paymentSummary?.totalOverdue || 0) / 1000), color: '#FF8042' },
  ];

  // Filter payments based on the selected tab
  const getFilteredPayments = () => {
    if (activeTab === 'payments') {
      if (activePaidTab === 'all') return payments;

      return payments?.filter((payment: ProjectPayment) => {
        switch(activePaidTab) {
          case 'pending':
            return payment.status === 'pending';
          case 'paid':
            return payment.status === 'paid' || payment.status === 'succeeded';
          case 'expired':
            return payment.status === 'expired';
          case 'cancelled':
            return payment.status === 'cancelled' || payment.status === 'canceled';
          default:
            return true;
        }
      });
    }
    return payments;
  };

  const filteredPayments = getFilteredPayments();

  if (isLoading || summaryLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Manage project payments, invoicing, and bank connections</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={connectToStripe} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={stripeAccountStatus?.hasStripeAccount}
          >
            <CreditCard className="mr-2 h-4 w-4" /> 
            {stripeAccountStatus?.hasStripeAccount ? 'Bank Connected' : 'Connect Bank Account'}
          </Button>
          <Dialog open={showPaymentLinkModal} onOpenChange={setShowPaymentLinkModal}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Payment Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Payment Link</DialogTitle>
                <DialogDescription>
                  Create an online payment link for your client
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Select Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project" />
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
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit (50%)</SelectItem>
                        <SelectItem value="final">Final Payment</SelectItem>
                        <SelectItem value="custom">Custom Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    placeholder="Payment description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Client Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@email.com"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreatePaymentLink} 
                  className="w-full"
                  disabled={createPaymentMutation.isPending}
                >
                  {createPaymentMutation.isPending ? 'Creating...' : 'Create Payment Link'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCashPaymentModal} onOpenChange={setShowCashPaymentModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                <BanknoteIcon className="mr-2 h-4 w-4" />
                Record Cash
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Cash Payment</DialogTitle>
                <DialogDescription>
                  Record a cash payment received from client
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Select Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project" />
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
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit (50%)</SelectItem>
                        <SelectItem value="final">Final Payment</SelectItem>
                        <SelectItem value="custom">Custom Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    placeholder="Payment description"
                  />
                </div>

                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client name"
                  />
                </div>

                <Button 
                  onClick={handleCreateCashPayment} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={createCashPaymentMutation.isPending}
                >
                  {createCashPaymentMutation.isPending ? 'Recording...' : 'Record Cash Payment'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="quick-flow" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-flow">
            <Calculator className="mr-2 h-4 w-4" /> Quick Flow
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart4 className="mr-2 h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="mr-2 h-4 w-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FileText className="mr-2 h-4 w-4" /> By Projects
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency((paymentSummary?.totalPending || 0) / 100)}
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
                  {formatCurrency((paymentSummary?.totalPaid || 0) / 100)}
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
                  {formatCurrency((paymentSummary?.totalOverdue || 0) / 100)}
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
                  {formatCurrency((paymentSummary?.totalRevenue || 0) / 100)}
                </div>
                <p className="text-xs text-muted-foreground">
                  All-time revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Monthly revenue, expenses and profit</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="profit" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Distribution of payment statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
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
              {payments && payments.length > 0 ? (
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
                    {payments.slice(0, 5).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">
                          {payment.invoiceNumber || `PAY-${payment.id}`}
                        </TableCell>
                        <TableCell>{payment.clientName || 'N/A'}</TableCell>
                        <TableCell>{formatPaymentType(payment.type)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount / 100)}</TableCell>
                        <TableCell>{formatPaymentStatus(payment.status)}</TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
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
                            {payment.status === 'pending' && payment.checkoutUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendPaymentLink(payment.id)}
                                disabled={resendPaymentLinkMutation.isPending}
                                title="Resend payment link"
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found. Create your first payment to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>Complete payment history and management</CardDescription>
              </div>
              <div className="flex space-x-2">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger 
                    value="all"
                    onClick={() => setActivePaidTab('all')}
                    className={activePaidTab === 'all' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pending"
                    onClick={() => setActivePaidTab('pending')}
                    className={activePaidTab === 'pending' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Pending
                  </TabsTrigger>
                  <TabsTrigger 
                    value="paid"
                    onClick={() => setActivePaidTab('paid')}
                    className={activePaidTab === 'paid' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Paid
                  </TabsTrigger>
                  <TabsTrigger 
                    value="expired"
                    onClick={() => setActivePaidTab('expired')}
                    className={activePaidTab === 'expired' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Expired
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cancelled"
                    onClick={() => setActivePaidTab('cancelled')}
                    className={activePaidTab === 'cancelled' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Cancelled
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPayments && filteredPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">
                          {payment.invoiceNumber || `PAY-${payment.id}`}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.clientName || 'N/A'}</div>
                            {payment.clientEmail && (
                              <div className="text-sm text-muted-foreground">{payment.clientEmail}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{payment.projectName || `Project #${payment.projectId || 'N/A'}`}</TableCell>
                        <TableCell>{formatPaymentType(payment.type)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount / 100)}</TableCell>
                        <TableCell>{formatPaymentStatus(payment.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.paymentMethod || 'Online'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {payment.checkoutUrl && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyPaymentLink(payment.checkoutUrl!)}
                                  title="Copy payment link"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(payment.checkoutUrl, '_blank')}
                                  title="Open payment page"
                                >
                                  <Receipt className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {payment.status === 'pending' && payment.clientEmail && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendPaymentLink(payment.id)}
                                disabled={resendPaymentLinkMutation.isPending}
                                title="Send payment link"
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found for the selected filter.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
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
                            {totalAmount > 0 && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Total Project Value: {formatCurrency(totalAmount)}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProject(project.id.toString());
                                setPaymentType('deposit');
                                setPaymentAmount((depositAmount).toString());
                                setClientName(project.clientName);
                                setClientEmail(project.clientEmail || '');
                                setShowPaymentLinkModal(true);
                              }}
                            >
                              Create Deposit {depositAmount > 0 && `(${formatCurrency(depositAmount)})`}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProject(project.id.toString());
                                setPaymentType('final');
                                setPaymentAmount((finalAmount).toString());
                                setClientName(project.clientName);
                                setClientEmail(project.clientEmail || '');
                                setShowPaymentLinkModal(true);
                              }}
                            >
                              Create Final {finalAmount > 0 && `(${formatCurrency(finalAmount)})`}
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
                                <TableHead>Method</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell className="font-mono">
                                    {payment.invoiceNumber || `PAY-${payment.id}`}
                                  </TableCell>
                                  <TableCell>{formatPaymentType(payment.type)}</TableCell>
                                  <TableCell>{formatCurrency(payment.amount / 100)}</TableCell>
                                  <TableCell>{formatPaymentStatus(payment.status)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {payment.paymentMethod || 'Online'}
                                    </Badge>
                                  </TableCell>
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
                                          onClick={() => resendPaymentLink(payment.id)}
                                          disabled={resendPaymentLinkMutation.isPending}
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
                {!projects || projects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects found. Create projects first to manage their payments.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectPayments;