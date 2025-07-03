import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Settings,
  History,
  Workflow,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ProjectPaymentWorkflow from "@/components/payments/ProjectPaymentWorkflow";
import PaymentSettings from "@/components/payments/PaymentSettings";
import PaymentHistory from "@/components/payments/PaymentHistory";
import FuturisticPaymentDashboard from "@/components/payments/FuturisticPaymentDashboard";

// Payment data types
type ProjectPayment = {
  id: number;
  projectId: number;
  userId: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentLinkId?: string;
  amount: number;
  type: "deposit" | "final" | "milestone" | "additional";
  status: "pending" | "succeeded" | "failed" | "canceled" | "expired";
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
  const [activeTab, setActiveTab] = useState("workflow");

  // Fetch projects data directly from Firebase with authentication check
  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery<Project[]>({
    queryKey: ["/firebase/projects"],
    queryFn: async () => {
      try {
        // Import Firebase functions and auth
        const { getProjects, auth } = await import("@/lib/firebase");
        const { onAuthStateChanged } = await import("firebase/auth");

        // Wait for authentication state to be ready
        return new Promise((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Clean up listener

            if (!user) {
              console.log("No user authenticated, returning empty array");
              resolve([]);
              return;
            }

            try {
              // Get all projects (not just approved ones for payment processing)
              const firebaseProjects = await getProjects();

              // Convert Firebase projects to our Project type
              const convertedProjects = firebaseProjects.map(
                (project: any) => ({
                  id: project.id || Math.random(),
                  userId: 1, // Default user ID for now
                  projectId: project.id || project.projectId || "",
                  clientName:
                    project.clientName ||
                    project.customerName ||
                    "Unknown Client",
                  clientEmail:
                    project.clientEmail || project.customerEmail || "",
                  clientPhone:
                    project.clientPhone || project.customerPhone || "",
                  address: project.address || project.projectAddress || "",
                  projectType:
                    project.projectType || project.fenceType || "Fence Project",
                  projectSubtype:
                    project.projectSubtype || project.fenceStyle || "",
                  projectCategory: project.projectCategory || "Fencing",
                  projectDescription:
                    project.projectDescription || project.description || "",
                  projectScope: project.projectScope || "",
                  estimateHtml: project.estimateHtml || "",
                  contractHtml: project.contractHtml || "",
                  totalPrice: project.totalPrice
                    ? Number(project.totalPrice) * 100
                    : 0, // Convert to cents
                  status: project.status || "approved",
                  projectProgress: project.projectProgress || "approved",
                  paymentStatus: project.paymentStatus || "pending",
                  paymentDetails: project.paymentDetails || {},
                  createdAt: project.createdAt?.toDate
                    ? project.createdAt.toDate().toISOString()
                    : new Date().toISOString(),
                  updatedAt: project.updatedAt?.toDate
                    ? project.updatedAt.toDate().toISOString()
                    : new Date().toISOString(),
                }),
              );

              console.log(
                `Successfully loaded ${convertedProjects.length} projects from Firebase`,
              );
              resolve(convertedProjects);
            } catch (error) {
              console.error("Error fetching projects from Firebase:", error);
              resolve([]); // Return empty array instead of rejecting to avoid breaking the UI
            }
          });
        });
      } catch (error) {
        console.error("Error setting up Firebase auth listener:", error);
        return [];
      }
    },
    retry: 1, // Only retry once
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Fetch payment data
  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsError,
  } = useQuery<ProjectPayment[]>({
    queryKey: ["/api/contractor-payments/payments"],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          "GET",
          "/api/contractor-payments/payments",
        );
        if (!response.ok) {
          throw new Error("Failed to fetch payments");
        }
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error("Error fetching payments:", error);
        return [];
      }
    },
  });

  // Fetch payment summary
  const { data: paymentSummary, isLoading: summaryLoading } =
    useQuery<PaymentSummary>({
      queryKey: ["/api/contractor-payments/dashboard/summary"],
      queryFn: async () => {
        try {
          const response = await apiRequest(
            "GET",
            "/api/contractor-payments/dashboard/summary",
          );
          if (!response.ok) {
            throw new Error("Failed to fetch payment summary");
          }
          const data = await response.json();
          return data.data;
        } catch (error) {
          console.error("Error fetching payment summary:", error);
          return {
            totalPending: 0,
            totalPaid: 0,
            totalOverdue: 0,
            totalRevenue: 0,
            pendingCount: 0,
            paidCount: 0,
          };
        }
      },
    });

  // Fetch Stripe account status
  const { data: stripeAccountStatus, isLoading: stripeLoading } = useQuery({
    queryKey: ["/api/contractor-payments/stripe/account-status"],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          "GET",
          "/api/contractor-payments/stripe/account-status",
        );

        // Verificar que la respuesta sea válida
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Stripe status error response:", errorText);
          throw new Error(`Server error: ${response.status}`);
        }

        // Intentar parsear como JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Non-JSON response received:", text);
          throw new Error("Server returned invalid response format");
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching Stripe status:", error);
        // Devolver estado por defecto en caso de error
        return { hasStripeAccount: false, accountDetails: null };
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest(
        "POST",
        "/api/contractor-payments/create",
        paymentData,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/contractor-payments/payments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/contractor-payments/dashboard/summary"],
      });

      toast({
        title: "Payment Created",
        description: data.message || "Payment has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Creation Failed",
        description:
          error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest(
        "POST",
        "/api/contractor-payments/send-invoice",
        invoiceData,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send invoice");
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
        description:
          error.message || "Failed to send invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Resend payment link mutation
  const resendPaymentLinkMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/contractor-payments/${paymentId}/resend`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to resend payment link");
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
    },
  });

  // Connect to Stripe
  const connectToStripe = async () => {
    try {
      const response = await apiRequest(
        "POST",
        "/api/contractor-payments/stripe/connect",
        {
          businessType: "individual",
          country: "US",
        },
      );

      // Verificar que la respuesta sea válida
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stripe connect error response:", errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      // Verificar que sea JSON válido
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        throw new Error("Server returned invalid response format");
      }

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe onboarding
        console.log("Redirecting to Stripe onboarding:", data.url);
        window.location.href = data.url;
      } else {
        console.error("No URL received from Stripe Connect:", data);
        toast({
          title: "Configuration Error",
          description:
            "Unable to create bank account connection. Please check Stripe configuration.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Stripe connect error:", error);
      toast({
        title: "Bank Connection Failed",
        description:
          error.message ||
          "Failed to set up bank account connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const refreshData = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/contractor-payments/payments"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/contractor-payments/dashboard/summary"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  // Check for data loading errors
  const hasDataErrors = projectsError || paymentsError;

  return (
    <div className="md:container p-4 md:mx-auto py-8 mb-40 ">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payment Management</h1>
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
                  Some data could not be loaded. The system will continue with
                  available information.
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
