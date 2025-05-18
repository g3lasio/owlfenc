import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertCircle, BarChart4, CreditCard, DollarSign, Send, Settings, 
  User, TrendingUp, Activity, PieChart, Calendar, ArrowUpRight, 
  ArrowDownRight, CheckCircle, Clock, X
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, 
  PieChart as RechartsPieChart, Pie, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Tipo para los pagos de proyectos
type ProjectPayment = {
  id: number;
  projectId?: number;
  projectName?: string;
  type: 'deposit' | 'final' | 'custom';
  status: 'pending' | 'paid' | 'succeeded' | 'expired' | 'cancelled' | 'canceled';
  amount: number;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  checkoutUrl?: string | null;
  description?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string | null;
  paymentDate?: string | null;
};

// Tipo para la cuenta bancaria
type BankAccount = {
  id: string;
  accountType: 'checking' | 'savings' | 'business';
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountHolderName: string;
  isDefault: boolean;
  isVerified: boolean;
  currency: string;
  lastFour: string;
};

// Tipo para los datos de resumen
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
  const [connectedToStripe, setConnectedToStripe] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  
  // Datos de ejemplo para el dashboard mientras solucionamos el problema con la base de datos
  const mockPaymentSummary: PaymentSummary = {
    totalPending: 15250.00,
    totalPaid: 54680.00,
    totalOverdue: 2500.00,
    totalRevenue: 72430.00,
    pendingCount: 5,
    paidCount: 12
  };
  
  // Datos de ejemplo para cuentas bancarias
  const mockBankAccounts: BankAccount[] = [
    {
      id: 'ba_1234567890',
      accountType: 'business',
      accountNumber: '************4567',
      routingNumber: '*****9876',
      bankName: 'Bank of America',
      accountHolderName: 'Owl Fence LLC',
      isDefault: true,
      isVerified: true,
      currency: 'USD',
      lastFour: '4567'
    }
  ];
  
  // Datos de ejemplo para pagos mientras solucionamos el problema con la base de datos
  const mockPayments: ProjectPayment[] = [
    {
      id: 1,
      projectId: 101,
      projectName: 'Valla Residencial Familia Martínez',
      type: 'deposit',
      status: 'paid',
      amount: 2500.00,
      stripePaymentIntentId: 'pi_3NcXj2CZ6qsJgndV0QhhsuUs',
      stripePaymentLinkUrl: null,
      createdAt: '2025-04-15T10:30:00Z',
      updatedAt: '2025-04-15T14:20:00Z',
      paymentDate: '2025-04-15T14:20:00Z',
    },
    {
      id: 2,
      projectId: 102,
      projectName: 'Cercado Comercial Plaza Norte',
      type: 'deposit',
      status: 'pending',
      amount: 5750.00,
      stripePaymentIntentId: 'pi_3NcY5kCZ6qsJgndV1MkL9i7q',
      stripePaymentLinkUrl: 'https://checkout.stripe.com/pay/cs_test_a1fUjP16ZtL49f8MT4x4y3ghJcEcbFSINNqOrcRGUuSRTBoQqFkE74BCrz',
      createdAt: '2025-05-02T09:15:00Z',
      updatedAt: null,
      paymentDate: null,
    },
    {
      id: 3,
      projectId: 101,
      projectName: 'Valla Residencial Familia Martínez',
      type: 'final',
      status: 'pending',
      amount: 2500.00,
      stripePaymentIntentId: 'pi_3NdTr8CZ6qsJgndV0cTYh82R',
      stripePaymentLinkUrl: 'https://checkout.stripe.com/pay/cs_test_b2gVkQ27AuM59g8NT5x5z4hiKdFdcGTJOOpPsdSHVvTSUCpPrGlF85CDs0',
      createdAt: '2025-05-10T15:45:00Z',
      updatedAt: null,
      paymentDate: null,
    },
    {
      id: 4,
      projectId: 103,
      projectName: 'Cerca de Seguridad Colegio San José',
      type: 'deposit',
      status: 'expired',
      amount: 3200.00,
      stripePaymentIntentId: 'pi_3NcZt6CZ6qsJgndV2PjM0k8s',
      stripePaymentLinkUrl: null,
      createdAt: '2025-04-28T11:20:00Z',
      updatedAt: '2025-05-05T00:00:00Z',
      paymentDate: null,
    },
    {
      id: 5,
      projectId: 104,
      projectName: 'Renovación Valla Comunidad Los Pinos',
      type: 'deposit',
      status: 'paid',
      amount: 4800.00,
      stripePaymentIntentId: 'pi_3NdbW7CZ6qsJgndV3QkN1l9t',
      stripePaymentLinkUrl: null,
      createdAt: '2025-05-01T08:30:00Z',
      updatedAt: '2025-05-01T10:15:00Z',
      paymentDate: '2025-05-01T10:15:00Z',
    }
  ];
  
  // Obtener el estado de la cuenta de Stripe
  const { data: stripeAccountStatus, isLoading: loadingStripeStatus } = useQuery({
    queryKey: ['/api/stripe/account-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stripe/account-status');
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe account status');
        }
        const data = await response.json();
        setConnectedToStripe(data.hasStripeAccount);
        return data;
      } catch (error) {
        console.error('Error fetching Stripe account status:', error);
        return { hasStripeAccount: false };
      }
    }
  });

  // Obtener los enlaces de pago
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['/api/payment-links'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/payment-links');
        if (!response.ok) {
          throw new Error('Failed to fetch payment links');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching payment links:', error);
        // Temporalmente usar datos de ejemplo durante el desarrollo
        return mockPayments;
      }
    },
    enabled: connectedToStripe
  });

  // Function to resend payment link
  const resendPaymentLink = async (paymentId: number) => {
    try {
      const response = await fetch(`/api/payment-links/${paymentId}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error resending payment link');
      }

      const data = await response.json();
      
      // Show success message
      toast({
        title: "Payment link resent",
        description: "The payment link has been successfully updated",
        variant: "default",
      });

      // Invalidate cache to update data
      queryClient.invalidateQueries({ queryKey: ['/api/payment-links'] });
      
      // Copy to clipboard if available
      if (data.url) {
        navigator.clipboard.writeText(data.url);
        toast({
          title: "Link copied",
          description: "Payment link copied to clipboard",
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not resend payment link",
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
      default:
        return type;
    }
  };

  // Function to format payment status
  const formatPaymentStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'paid':
      case 'succeeded':
        return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Simulamos datos para gráficas y estadísticas  
  const monthlyRevenueData = [
    { name: 'Ene', income: 3500, expenses: 2100, profit: 1400 },
    { name: 'Feb', income: 4200, expenses: 2300, profit: 1900 },
    { name: 'Mar', income: 5000, expenses: 2800, profit: 2200 },
    { name: 'Abr', income: 4600, expenses: 2500, profit: 2100 },
    { name: 'May', income: 7800, expenses: 3200, profit: 4600 },
    { name: 'Jun', income: 9200, expenses: 3800, profit: 5400 },
  ];
  
  const paymentTypeDistribution = [
    { name: 'Depósitos', value: 65 },
    { name: 'Pagos Finales', value: 35 },
  ];
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  const paymentStatusData = [
    { name: 'Pendientes', value: mockPaymentSummary.pendingCount },
    { name: 'Pagados', value: mockPaymentSummary.paidCount },
    { name: 'Vencidos', value: 2 },
    { name: 'Cancelados', value: 1 },
  ];
  
  const dailyPaymentsData = [
    { name: '9/5', amount: 1200 },
    { name: '10/5', amount: 2500 },
    { name: '11/5', amount: 1800 },
    { name: '12/5', amount: 4200 },
    { name: '13/5', amount: 3100 },
    { name: '14/5', amount: 2700 },
    { name: '15/5', amount: 3500 },
  ];
  
  const projectTypeData = [
    { subject: 'Residencial', A: 120, B: 110, fullMark: 150 },
    { subject: 'Comercial', A: 98, B: 130, fullMark: 150 },
    { subject: 'Industrial', A: 86, B: 130, fullMark: 150 },
    { subject: 'Institucional', A: 99, B: 100, fullMark: 150 },
    { subject: 'Agrícola', A: 85, B: 90, fullMark: 150 },
  ];

  // Connect to Stripe for payment processing
  const connectToStripe = async () => {
    try {
      toast({
        title: "Connecting to Stripe",
        description: "Redirecting to Stripe to connect your account...",
        variant: "default"
      });
      
      // Call the backend to initiate Stripe Connect
      const response = await fetch('/api/stripe/connect', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect with Stripe');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe onboarding URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL received from server');
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to Stripe. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to add bank account
  const addBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setShowBankModal(false);
    
    toast({
      title: "Bank account added",
      description: "Your bank account information has been saved successfully",
      variant: "default"
    });
  };
  
  // Function to create payment link
  const createPaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPaymentLink(true);
    
    try {
      // Validate input
      if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      if (!paymentDescription || paymentDescription.trim().length < 3) {
        throw new Error('Please enter a description (minimum 3 characters)');
      }
      
      // Call API to create a payment link
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          description: paymentDescription
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment link');
      }
      
      const data = await response.json();
      
      if (data.url) {
        // Copy to clipboard
        navigator.clipboard.writeText(data.url);
        
        // Success message
        toast({
          title: "Payment link created",
          description: "Payment link has been created and copied to clipboard",
          variant: "default"
        });
        
        // Refresh payment links list
        queryClient.invalidateQueries({ queryKey: ['/api/payment-links'] });
      } else {
        throw new Error('No payment link URL received from server');
      }
      
      // Reset form and close modal
      setPaymentAmount('');
      setPaymentDescription('');
      setShowPaymentLinkModal(false);
    } catch (error: any) {
      toast({
        title: "Error creating payment link",
        description: error.message || "There was a problem creating your payment link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Panel de Pagos</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="bg-destructive/10">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudieron cargar los pagos de proyectos. Por favor, intenta nuevamente más tarde.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects/payments'] })}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtrar pagos según la pestaña seleccionada
  const getFilteredPayments = () => {
    if (activeTab === 'payments') {
      if (activePaidTab === 'all') return payments;
      return payments?.filter(payment => payment.status === activePaidTab);
    }
    return payments;
  };
  
  const filteredPayments = getFilteredPayments();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payment Tracker</h1>
        {!connectedToStripe ? (
          <Button onClick={connectToStripe} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <CreditCard className="mr-2 h-4 w-4" /> Connect Stripe
          </Button>
        ) : (
          <Badge className="bg-green-500 px-3 py-1">
            <CreditCard className="mr-2 h-4 w-4" /> Stripe Connected
          </Badge>
        )}
      </div>
      
      {/* Payment Link Modal */}
      {showPaymentLinkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Create Payment Link</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowPaymentLinkModal(false)}
                disabled={creatingPaymentLink}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={createPaymentLink}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="100.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    disabled={creatingPaymentLink}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Fence installation deposit"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    required
                    disabled={creatingPaymentLink}
                  />
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={creatingPaymentLink}
                  >
                    {creatingPaymentLink ? (
                      <>
                        <span className="mr-2">Creating Link</span>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </>
                    ) : (
                      "Create Payment Link"
                    )}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground text-center pt-2">
                  Payment links can be shared with your clients via email, text message, or any messaging app.
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Connect Bank Account</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowBankModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={addBankAccount}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="XXXX XXXX XXXX XXXX"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    placeholder="XXXXXXXXX"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select defaultValue="checking">
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    Connect Bank Account
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">
            <BarChart4 className="mr-2 h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="mr-2 h-4 w-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Dashboard Panel */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Pending Payments</CardTitle>
                <CardDescription>Total payments to collect</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">${mockPaymentSummary.totalPending.toLocaleString('en-US')}</div>
                <p className="text-sm text-muted-foreground">{mockPaymentSummary.pendingCount} pending payments</p>
                <Progress value={65} className="h-2 mt-4" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Received Payments</CardTitle>
                <CardDescription>Total completed payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">${mockPaymentSummary.totalPaid.toLocaleString('en-US')}</div>
                <p className="text-sm text-muted-foreground">{mockPaymentSummary.paidCount} completed payments</p>
                <Progress value={78} className="h-2 mt-4" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Total Revenue</CardTitle>
                <CardDescription>Total billed this year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${mockPaymentSummary.totalRevenue.toLocaleString('en-US')}</div>
                <p className="text-sm text-muted-foreground">12% increase from last year</p>
                <Progress value={85} className="h-2 mt-4" />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg font-medium">Payment Links</CardTitle>
                  <CardDescription>Create and manage payment links</CardDescription>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowPaymentLinkModal(true)}>
                  <DollarSign className="mr-2 h-4 w-4" /> Create New Payment Link
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  Quickly create payment links for your clients and send them via email, text message, or any messaging app.
                </div>
                
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Accept credit cards, debit cards and Apple Pay</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Money deposited directly to your bank account</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Secure payment processing through Stripe</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Real-time payment notifications</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5 text-indigo-500" />
                  Payment Distribution
                </CardTitle>
                <CardDescription>Current status of all payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(12, 15, 28, 0.8)', 
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff' 
                        }} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center mt-4 gap-2">
                  {paymentStatusData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center text-sm">
                      <div 
                        className="w-3 h-3 mr-1 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {entry.name} ({entry.value})
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg font-medium">Payment Link Generator</CardTitle>
                  <CardDescription>Create custom payment links for clients</CardDescription>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowPaymentLinkModal(true)}>
                  <DollarSign className="mr-2 h-4 w-4" /> New Link
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Accept multiple payment methods</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create professional payment links that allow your clients to pay you instantly 
                      with credit cards, debit cards, and Apple Pay.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-slate-100 text-slate-800">
                        Credit Cards
                      </Badge>
                      <Badge variant="outline" className="bg-slate-100 text-slate-800">
                        Debit Cards
                      </Badge>
                      <Badge variant="outline" className="bg-slate-100 text-slate-800">
                        Apple Pay
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Las tarjetas de Recent Payment Summary, Cuenta Bancaria Principal y Estado de Stripe Connect fueron eliminadas */}
        </TabsContent>
        
        {/* Payments Panel */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment List</CardTitle>
              <CardDescription>Manage all your project payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" value={activePaidTab} onValueChange={setActivePaidTab} className="mb-6">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="expired">Expired</TabsTrigger>
                  <TabsTrigger value="cancelled">Canceled</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {filteredPayments?.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No hay pagos disponibles con el filtro seleccionado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPayments?.map((payment) => (
                    <Card key={payment.id} className="border overflow-hidden">
                      <CardHeader className="pb-2 bg-muted/50">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">
                              {payment.projectName || `Proyecto #${payment.projectId}`}
                            </CardTitle>
                            <CardDescription>
                              ID: {payment.id} - {formatDate(payment.createdAt)}
                            </CardDescription>
                          </div>
                          <div>
                            {formatPaymentStatus(payment.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex flex-col md:flex-row justify-between">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Tipo de pago</p>
                            <p className="font-medium">{formatPaymentType(payment.type)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Monto</p>
                            <p className="font-medium">${payment.amount.toFixed(2)}</p>
                          </div>
                          {payment.paymentDate && (
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Fecha de pago</p>
                              <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-4">
                          {payment.status === 'pending' && payment.stripePaymentLinkUrl && (
                            <Button 
                              onClick={() => window.open(payment.stripePaymentLinkUrl!, '_blank')}
                              variant="default"
                              size="sm"
                            >
                              <Send className="mr-2 h-4 w-4" /> Ver enlace de pago
                            </Button>
                          )}
                          
                          {(payment.status === 'pending' || payment.status === 'expired') && (
                            <Button 
                              onClick={() => resendPaymentLink(payment.id)}
                              variant="outline"
                              size="sm"
                            >
                              {payment.status === 'expired' ? 'Generar nuevo enlace' : 'Reenviar enlace'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Panel de Configuración */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Cuenta Bancaria</CardTitle>
              <CardDescription>Gestione dónde recibirá sus pagos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Cuentas Bancarias</h3>
                
                {mockBankAccounts.length > 0 ? (
                  <div className="space-y-4">
                    {mockBankAccounts.map((account) => (
                      <div key={account.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{account.bankName}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.accountType} **** {account.lastFour}
                          </p>
                          <div className="mt-1 flex items-center space-x-2">
                            {account.isDefault && <Badge className="bg-indigo-500">Predeterminada</Badge>}
                            {account.isVerified && <Badge variant="outline">Verificada</Badge>}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          <Button variant="destructive" size="sm">
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border rounded-lg">
                    <p className="text-muted-foreground mb-4">No hay cuentas bancarias configuradas</p>
                  </div>
                )}
                
                <Button 
                  className="mt-4 w-full" 
                  variant="outline"
                  onClick={() => setShowBankModal(true)}
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Agregar cuenta bancaria
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Conexión a Stripe</h3>
                
                {connectedToStripe ? (
                  <div className="space-y-4">
                    <Alert>
                      <CreditCard className="h-4 w-4" />
                      <AlertTitle>Cuenta conectada</AlertTitle>
                      <AlertDescription>
                        Su cuenta de Stripe está correctamente configurada para recibir pagos.
                      </AlertDescription>
                    </Alert>
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">Stripe Connect</p>
                          <p className="text-sm text-muted-foreground">acct_1a2b3c4d5e6f7g8h9i</p>
                        </div>
                        <div>
                          <Badge className="bg-green-500">Activa</Badge>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Comisión por transacción</p>
                        <p>2.9% + $0.30 USD por pago</p>
                      </div>
                      <div className="mt-4 flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          Panel de Stripe
                        </Button>
                        <Button variant="destructive" size="sm">
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Cuenta no conectada</AlertTitle>
                      <AlertDescription>
                        Para recibir pagos, necesita conectar su cuenta de Stripe.
                      </AlertDescription>
                    </Alert>
                    <div className="text-center py-6 border rounded-lg">
                      <p className="text-muted-foreground mb-4">Conecte su cuenta para recibir pagos directamente</p>
                      <Button onClick={connectToStripe} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <CreditCard className="mr-2 h-4 w-4" /> Conectar Stripe
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal para agregar cuenta bancaria */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Agregar Cuenta Bancaria</CardTitle>
              <CardDescription>Ingrese los datos de su cuenta bancaria para recibir pagos</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addBankAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Nombre del Banco</Label>
                  <Input id="bankName" placeholder="Banco Nacional" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountType">Tipo de Cuenta</Label>
                  <Select defaultValue="checking">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Tipo de Cuenta</SelectLabel>
                        <SelectItem value="checking">Cuenta Corriente</SelectItem>
                        <SelectItem value="savings">Cuenta de Ahorros</SelectItem>
                        <SelectItem value="business">Cuenta Empresarial</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input id="accountHolderName" placeholder="John Smith" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input id="routingNumber" placeholder="123456789" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input id="accountNumber" placeholder="987654321" />
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <input type="checkbox" id="isDefault" className="rounded border-gray-300" />
                  <Label htmlFor="isDefault">Set as default account</Label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowBankModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProjectPayments;