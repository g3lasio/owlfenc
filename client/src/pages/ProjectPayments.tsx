import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Settings,
  History,
  Workflow,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProjectPaymentWorkflow from '@/components/payments/ProjectPaymentWorkflow';
import PaymentSettings from '@/components/payments/PaymentSettings';
import PaymentHistory from '@/components/payments/PaymentHistory';
import FuturisticPaymentDashboard from '@/components/payments/FuturisticPaymentDashboard';

// Payment data types
type ProjectPayment = {
  id: number;
  projectId: number;
  userId: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentLinkId?: string;
  amount: number;
  type: 'deposit' | 'final' | 'milestone' | 'additional';
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'expired';
  paymentMethod?: string;
  receiptUrl?: string;
  invoiceUrl?: string;
  checkoutUrl?: string;
  paymentLinkUrl?: string;
  clientEmail?: string;
  clientName?: string;
  invoiceNumber?: string;
  description?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  paymentDate?: string;
  sentDate?: string;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: number;
  userId: number;
  projectId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  address: string;
  projectType?: string;
  projectSubtype?: string;
  projectCategory?: string;
  projectDescription?: string;
  projectScope?: string;
  estimateHtml?: string;
  contractHtml?: string;
  totalPrice?: number;
  status?: string;
  projectProgress?: string;
  paymentStatus?: string;
  paymentDetails?: any;
  createdAt: string;
  updatedAt: string;
};

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('workflow');

  // Fetch projects data
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
    },
  });

  // Fetch payment data
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = useQuery<ProjectPayment[]>({
    queryKey: ['/api/contractor-payments/payments'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/contractor-payments/payments');
        if (!response.ok) {
          throw new Error('Failed to fetch payments');
        }
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
    }
  });

  // Fetch payment summary
  const { data: paymentSummary, isLoading: summaryLoading } = useQuery<PaymentSummary>({
    queryKey: ['/api/contractor-payments/dashboard/summary'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/contractor-payments/dashboard/summary');
        if (!response.ok) {
          throw new Error('Failed to fetch payment summary');
        }
        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Error fetching payment summary:', error);
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

  // Fetch Stripe account status
  const { data: stripeAccountStatus, isLoading: stripeLoading } = useQuery({
    queryKey: ['/api/stripe/account-status'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/stripe/account-status');
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe status');
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching Stripe status:', error);
        return { hasStripeAccount: false };
      }
    }
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest('POST', '/api/contractor-payments/create', paymentData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments/dashboard/summary'] });
      
      toast({
        title: "Payment Created",
        description: data.message || "Payment has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Creation Failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest('POST', '/api/contractor-payments/send-invoice', invoiceData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invoice');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Sent",
        description: "Invoice has been sent to the client successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Invoice Send Failed",
        description: error.message || "Failed to send invoice. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Resend payment link mutation
  const resendPaymentLinkMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest('POST', `/api/contractor-payments/${paymentId}/resend`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend payment link');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Link Resent",
        description: "Payment link has been resent to the client.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Resend Failed",
        description: error.message || "Failed to resend payment link.",
        variant: "destructive",
      });
    }
  });

  // Connect to Stripe
  const connectToStripe = async () => {
    try {
      const response = await apiRequest('POST', '/api/stripe/connect-account');
      if (!response.ok) {
        throw new Error('Failed to connect to Stripe');
      }
      const data = await response.json();
      
      if (data.accountLinkUrl) {
        window.location.href = data.accountLinkUrl;
      } else {
        toast({
          title: "Connection Error",
          description: "Unable to create Stripe connection. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Stripe Connection Failed",
        description: error.message || "Failed to connect to Stripe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments/payments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments/dashboard/summary'] });
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  };

  // Check for data loading errors
  const hasDataErrors = projectsError || paymentsError;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">
            Simplified payment workflow with guided steps and complete tracking
          </p>
        </div>
      </div>

      {/* Futuristic Dashboard */}
      {paymentSummary && (
        <div className="mb-8">
          <FuturisticPaymentDashboard 
            paymentSummary={paymentSummary}
            isLoading={summaryLoading}
          />
        </div>
      )}

      {/* Error State */}
      {hasDataErrors && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h4 className="font-medium">Data Loading Issues</h4>
                <p className="text-sm">
                  Some data could not be loaded. The system will continue with available information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Payment Workflow
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Payment History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Simplified Payment Workflow Tab */}
        <TabsContent value="workflow" className="space-y-6">
          <ProjectPaymentWorkflow
            projects={projects}
            payments={payments}
            onCreatePayment={createPaymentMutation.mutate}
            onSendInvoice={sendInvoiceMutation.mutate}
            isCreatingPayment={createPaymentMutation.isPending}
          />
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-6">
          <PaymentHistory
            payments={payments}
            projects={projects}
            isLoading={paymentsLoading}
            onResendPaymentLink={resendPaymentLinkMutation.mutate}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <PaymentSettings
            stripeAccountStatus={stripeAccountStatus}
            onConnectStripe={connectToStripe}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectPayments;