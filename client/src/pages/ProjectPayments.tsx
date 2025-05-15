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
  ArrowDownRight, CheckCircle, Clock
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
  projectId: number;
  projectName?: string;
  type: 'deposit' | 'final';
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  stripePaymentIntentId: string | null;
  stripePaymentLinkUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  paymentDate: string | null;
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
  
  // Simular la consulta de pagos con datos de ejemplo
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['/api/projects/payments'],
    queryFn: async () => {
      // Simulando tiempo de carga para una experiencia más realista
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Promise.resolve(mockPayments);
    }
  });

  // Función para reenviar un enlace de pago
  const resendPaymentLink = async (paymentId: number) => {
    try {
      const response = await fetch(`/api/project-payments/${paymentId}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al reenviar el enlace de pago');
      }

      const data = await response.json();
      
      // Mostrar mensaje de éxito
      toast({
        title: "Enlace reenviado",
        description: "El enlace de pago ha sido actualizado correctamente",
        variant: "default",
      });

      // Invalidar la caché para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/projects/payments'] });
      
      // Redireccionar al enlace de pago si está disponible
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "No se pudo reenviar el enlace de pago",
        variant: "destructive",
      });
    }
  };

  // Función para formatear el tipo de pago
  const formatPaymentType = (type: 'deposit' | 'final') => {
    return type === 'deposit' ? 'Depósito (50%)' : 'Pago Final (50%)';
  };

  // Función para formatear el estado del pago
  const formatPaymentStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'paid':
        return <Badge className="bg-green-500 hover:bg-green-600">Pagado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
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

  // Función para simular conexión a Stripe Connect
  const connectToStripe = () => {
    // Simular proceso de conexión a Stripe Connect
    toast({
      title: "Conectando con Stripe",
      description: "Redirigiendo a Stripe para completar la conexión de su cuenta...",
      variant: "default"
    });
    
    // Simulamos un tiempo de espera y luego cambiar el estado
    setTimeout(() => {
      setConnectedToStripe(true);
      toast({
        title: "Cuenta conectada",
        description: "Su cuenta de Stripe ha sido conectada exitosamente",
        variant: "default"
      });
    }, 2000);
  };
  
  // Función para agregar cuenta bancaria
  const addBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setShowBankModal(false);
    
    toast({
      title: "Cuenta bancaria agregada",
      description: "La información de su cuenta bancaria se ha guardado correctamente",
      variant: "default"
    });
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
        <h1 className="text-3xl font-bold">Panel de Pagos</h1>
        {!connectedToStripe ? (
          <Button onClick={connectToStripe} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <CreditCard className="mr-2 h-4 w-4" /> Conectar Stripe
          </Button>
        ) : (
          <Badge className="bg-green-500 px-3 py-1">
            <CreditCard className="mr-2 h-4 w-4" /> Cuenta Stripe conectada
          </Badge>
        )}
      </div>
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">
            <BarChart4 className="mr-2 h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="mr-2 h-4 w-4" /> Pagos
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" /> Configuración
          </TabsTrigger>
        </TabsList>
        
        {/* Panel de Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Pagos Pendientes</CardTitle>
                <CardDescription>Total de pagos por cobrar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">${mockPaymentSummary.totalPending.toLocaleString('es-ES')}</div>
                <p className="text-sm text-muted-foreground">{mockPaymentSummary.pendingCount} pagos pendientes</p>
                <Progress value={65} className="h-2 mt-4" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Pagos Recibidos</CardTitle>
                <CardDescription>Total de pagos completados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">${mockPaymentSummary.totalPaid.toLocaleString('es-ES')}</div>
                <p className="text-sm text-muted-foreground">{mockPaymentSummary.paidCount} pagos completados</p>
                <Progress value={78} className="h-2 mt-4" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Ingresos Totales</CardTitle>
                <CardDescription>Total facturado este año</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${mockPaymentSummary.totalRevenue.toLocaleString('es-ES')}</div>
                <p className="text-sm text-muted-foreground">Incremento del 12% respecto al año pasado</p>
                <Progress value={85} className="h-2 mt-4" />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
                  Evolución de Ingresos
                </CardTitle>
                <CardDescription>Tendencias de ingresos mensuales de 2025</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyRevenueData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 10,
                      }}
                    >
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(12, 15, 28, 0.8)', 
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff' 
                        }} 
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#8884d8" 
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                        name="Ingresos"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#82ca9d" 
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                        name="Ganancia"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-indigo-500" />
                  Pagos Diarios (Mayo 2025)
                </CardTitle>
                <CardDescription>Flujo de pagos de los últimos 7 días</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyPaymentsData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(12, 15, 28, 0.8)', 
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff' 
                        }}
                        formatter={(value) => [`$${value}`, 'Monto']}
                      />
                      <Legend />
                      <Bar dataKey="amount" name="Monto de pago" radius={[8, 8, 0, 0]}>
                        {dailyPaymentsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5 text-indigo-500" />
                  Distribución de Pagos
                </CardTitle>
                <CardDescription>Estado actual de todos los pagos</CardDescription>
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
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowUpRight className="mr-2 h-5 w-5 text-indigo-500" />
                  Rendimiento por Tipo de Proyecto
                </CardTitle>
                <CardDescription>Análisis de proyectos y su desempeño financiero</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={projectTypeData}>
                      <PolarGrid stroke="#444" />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} />
                      <Radar
                        name="Ingresos"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="Proyectos"
                        dataKey="B"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                      <Legend />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(12, 15, 28, 0.8)', 
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff' 
                        }} 
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-indigo-500" />
                Resumen de Pagos Recientes
              </CardTitle>
              <CardDescription>Últimos pagos recibidos y pendientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments?.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-start space-x-4">
                      <div className="bg-primary/10 p-2 rounded-full">
                        {payment.status === 'paid' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{payment.projectName || `Proyecto #${payment.projectId}`}</p>
                        <p className="text-sm text-muted-foreground">{formatPaymentType(payment.type)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${payment.amount.toFixed(2)}</p>
                      <div className="mt-1">{formatPaymentStatus(payment.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setActiveTab('payments')}>
                Ver todos los pagos
              </Button>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cuenta Bancaria Principal</CardTitle>
                <CardDescription>Cuenta donde recibe sus pagos</CardDescription>
              </CardHeader>
              <CardContent>
                {mockBankAccounts.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{mockBankAccounts[0].bankName}</p>
                          <p className="text-sm text-muted-foreground">Cuenta terminada en {mockBankAccounts[0].lastFour}</p>
                          <div className="mt-2">
                            <Badge variant="outline" className="mr-2">
                              {mockBankAccounts[0].accountType}
                            </Badge>
                            {mockBankAccounts[0].isDefault && (
                              <Badge className="bg-indigo-500">Predeterminada</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Titular</p>
                          <p className="font-medium">{mockBankAccounts[0].accountHolderName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">No hay cuentas bancarias configuradas</p>
                    <Button variant="outline" onClick={() => setShowBankModal(true)}>
                      Agregar cuenta bancaria
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')}>
                  Administrar cuentas
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Estado de Stripe Connect</CardTitle>
                <CardDescription>Conexión a su cuenta de procesamiento de pagos</CardDescription>
              </CardHeader>
              <CardContent>
                {connectedToStripe ? (
                  <div className="space-y-4">
                    <Alert>
                      <CreditCard className="h-4 w-4" />
                      <AlertTitle>Cuenta conectada</AlertTitle>
                      <AlertDescription>
                        Su cuenta de Stripe está correctamente configurada para recibir pagos.
                      </AlertDescription>
                    </Alert>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">Stripe Account</p>
                          <p className="text-sm text-muted-foreground">acct_1a2b3c4d5e6f7g8h9i</p>
                        </div>
                        <Badge className="bg-green-500">Verificada</Badge>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Último pago recibido</p>
                        <p>12/05/2025</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Cuenta no conectada</AlertTitle>
                      <AlertDescription>
                        Para recibir pagos, necesita conectar su cuenta de Stripe.
                      </AlertDescription>
                    </Alert>
                    <Button onClick={connectToStripe} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <CreditCard className="mr-2 h-4 w-4" /> Conectar Stripe
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Panel de Pagos */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Pagos</CardTitle>
              <CardDescription>Administre todos los pagos de sus proyectos</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" value={activePaidTab} onValueChange={setActivePaidTab} className="mb-6">
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="pending">Pendientes</TabsTrigger>
                  <TabsTrigger value="paid">Pagados</TabsTrigger>
                  <TabsTrigger value="expired">Expirados</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
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
                  <Label htmlFor="accountHolderName">Nombre del Titular</Label>
                  <Input id="accountHolderName" placeholder="Juan Pérez" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Número de Ruta</Label>
                  <Input id="routingNumber" placeholder="123456789" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Número de Cuenta</Label>
                  <Input id="accountNumber" placeholder="987654321" />
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <input type="checkbox" id="isDefault" className="rounded border-gray-300" />
                  <Label htmlFor="isDefault">Establecer como cuenta predeterminada</Label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowBankModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Guardar
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