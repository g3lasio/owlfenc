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
  Building2,
  Users,
  Calculator,
  Send,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { usePermissions } from "@/contexts/PermissionContext";
import { useLocation } from "wouter";
import { Lock, Sparkles } from "lucide-react";
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
  id: string | number; // Firebase uses string IDs
  userId: string; // Firebase UID is string
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
  const [, navigate] = useLocation();
  
  // Verificar permisos de payment tracking
  const { hasAccess, userPlan, showUpgradeModal } = usePermissions();
  const hasPaymentTrackingAccess = hasAccess('paymentTracking');
  const canUsePaymentTracking = hasPaymentTrackingAccess;
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Fetch projects data from BOTH Firebase collections (same as Estimate Wizard History)
  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery<Project[]>({
    queryKey: ["/firebase/projects-and-estimates"],
    enabled: canUsePaymentTracking, // Only fetch if user has access
    queryFn: async () => {
      try {
        // Import Firebase functions
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const { db, auth } = await import("@/lib/firebase");
        const { onAuthStateChanged } = await import("firebase/auth");

        // Wait for authentication state to be ready (with timeout)
        return new Promise((resolve) => {
          let timeout: NodeJS.Timeout | null = null;
          
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (timeout) clearTimeout(timeout);
            unsubscribe(); // Clean up listener

            if (!user) {
              console.log("💳 [PAYMENT-TRACKER] No user authenticated, returning empty array");
              resolve([]);
              return;
            }

            try {
              console.log("💳 [PAYMENT-TRACKER] Loading projects from Firebase for user:", user.uid);
              let allProjects: any[] = [];

              // 1. Load from PROJECTS collection (same as Estimate Wizard)
              try {
                const projectsQuery = query(
                  collection(db, "projects"),
                  where("firebaseUserId", "==", user.uid)
                );

                const projectsSnapshot = await getDocs(projectsQuery);
                const projectData = projectsSnapshot.docs.map((doc) => {
                  const data = doc.data();
                  
                  // Extract client info with multiple fallbacks
                  const clientName = data.clientInformation?.name || 
                                   data.clientName || 
                                   data.client?.name || 
                                   "Unknown Client";
                  
                  const clientEmail = data.clientInformation?.email || 
                                    data.clientEmail || 
                                    data.client?.email || 
                                    "";

                  // Calculate total with multiple fallback paths
                  const totalValue = data.projectTotalCosts?.totalSummary?.finalTotal ||
                                   data.projectTotalCosts?.total ||
                                   data.total ||
                                   data.estimateAmount ||
                                   data.totalPrice ||
                                   0;

                  return {
                    id: doc.id,
                    userId: user.uid,
                    projectId: doc.id,
                    clientName,
                    clientEmail,
                    clientPhone: data.clientInformation?.phone || data.clientPhone || "",
                    address: data.projectDetails?.address || data.address || data.projectAddress || "",
                    projectType: data.projectType || data.projectDetails?.type || data.fenceType || "Project",
                    projectSubtype: data.projectSubtype || data.fenceStyle || "",
                    projectCategory: data.projectCategory || "General",
                    projectDescription: data.projectDescription || data.description || "",
                    projectScope: data.projectScope || "",
                    estimateHtml: data.estimateHtml || "",
                    contractHtml: data.contractHtml || "",
                    totalPrice: totalValue, // Keep in original format (already in cents if from estimates)
                    status: data.status || "draft",
                    projectProgress: data.projectProgress || data.status || "draft",
                    paymentStatus: data.paymentStatus || "pending",
                    paymentDetails: data.paymentDetails || {},
                    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                    updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
                  };
                });

                allProjects = [...allProjects, ...projectData];
                console.log(`💳 [PAYMENT-TRACKER] Loaded ${projectData.length} from projects collection`);
              } catch (projectError) {
                console.warn("💳 [PAYMENT-TRACKER] Error loading from projects:", projectError);
              }

              // 2. Load from ESTIMATES collection (same as Estimate Wizard)
              try {
                const estimatesQuery = query(
                  collection(db, "estimates"),
                  where("firebaseUserId", "==", user.uid)
                );

                const estimatesSnapshot = await getDocs(estimatesQuery);
                const estimateData = estimatesSnapshot.docs.map((doc) => {
                  const data = doc.data();
                  
                  // Extract client info with multiple fallbacks
                  const clientName = data.clientInformation?.name || 
                                   data.clientName || 
                                   data.client?.name || 
                                   "Unknown Client";
                  
                  const clientEmail = data.clientInformation?.email || 
                                    data.clientEmail || 
                                    data.client?.email || 
                                    "";

                  // Calculate total with multiple fallback paths
                  const totalValue = data.projectTotalCosts?.totalSummary?.finalTotal ||
                                   data.projectTotalCosts?.total ||
                                   data.total ||
                                   data.estimateAmount ||
                                   0;

                  return {
                    id: doc.id,
                    userId: user.uid,
                    projectId: doc.id,
                    clientName,
                    clientEmail,
                    clientPhone: data.clientInformation?.phone || data.clientPhone || "",
                    address: data.projectDetails?.address || data.address || "",
                    projectType: data.projectType || data.projectDetails?.type || "Estimate",
                    projectSubtype: data.projectSubtype || "",
                    projectCategory: data.projectCategory || "General",
                    projectDescription: data.projectDescription || data.description || "",
                    projectScope: data.projectScope || "",
                    estimateHtml: data.estimateHtml || "",
                    contractHtml: data.contractHtml || "",
                    totalPrice: totalValue, // Keep in original format
                    status: data.status || "estimate",
                    projectProgress: data.projectProgress || "estimate",
                    paymentStatus: data.paymentStatus || "pending",
                    paymentDetails: data.paymentDetails || {},
                    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                    updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
                  };
                });

                allProjects = [...allProjects, ...estimateData];
                console.log(`💳 [PAYMENT-TRACKER] Loaded ${estimateData.length} from estimates collection`);
              } catch (estimateError) {
                console.warn("💳 [PAYMENT-TRACKER] Error loading from estimates:", estimateError);
              }

              // Remove duplicates based on projectId
              const uniqueProjects = allProjects.reduce((acc: any[], current) => {
                const exists = acc.find(item => item.projectId === current.projectId);
                if (!exists) {
                  acc.push(current);
                }
                return acc;
              }, []);

              console.log(`💳 [PAYMENT-TRACKER] Total unique projects loaded: ${uniqueProjects.length}`);
              resolve(uniqueProjects);
            } catch (error) {
              console.error("💳 [PAYMENT-TRACKER] Error fetching projects:", error);
              resolve([]);
            }
          });
        });
      } catch (error) {
        console.error("💳 [PAYMENT-TRACKER] Error setting up Firebase:", error);
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000,
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
          // Return null for error cases to distinguish from empty state
          return null;
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

  // Connect to Stripe Express - Simplified onboarding
  const connectToStripe = async () => {
    try {
      console.log("💳 [STRIPE-CONNECT-EXPRESS] Iniciando configuración de pagos");
      
      toast({
        title: "Conectando con Stripe",
        description: "Preparando tu cuenta de pagos...",
      });

      const response = await apiRequest("POST", "/api/contractor-payments/stripe/connect", {});
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("💳 [STRIPE-CONNECT-EXPRESS] Error:", errorData);
        
        // Check if needs TEST keys (using livemode keys in development)
        if (errorData.needsTestKeys) {
          toast({
            title: "🔐 Credenciales de Desarrollo Requeridas",
            description: "Necesitas usar credenciales de PRUEBA de Stripe para desarrollo.",
            variant: "destructive",
            duration: 10000,
          });
          
          // Show detailed instructions
          setTimeout(() => {
            alert(
              "🔐 IMPORTANTE: Necesitas Credenciales de PRUEBA de Stripe\n\n" +
              "Actualmente estás usando credenciales de PRODUCCIÓN (livemode), " +
              "las cuales requieren HTTPS y pueden generar cobros reales.\n\n" +
              "📋 SOLUCIÓN:\n" +
              "1. Ve a: https://dashboard.stripe.com/test/apikeys\n" +
              "2. Copia tus claves de PRUEBA:\n" +
              "   - Secret key (empieza con 'sk_test_...')\n" +
              "   - Publishable key (empieza con 'pk_test_...')\n" +
              "3. Actualiza tus Secrets en Replit:\n" +
              "   - STRIPE_SECRET_KEY = sk_test_...\n" +
              "   - STRIPE_PUBLISHABLE_KEY = pk_test_...\n\n" +
              "✅ Las credenciales de prueba te permiten:\n" +
              "   - Probar sin riesgo de cobros reales\n" +
              "   - Crear cuentas Express de prueba\n" +
              "   - Simular pagos completos\n\n" +
              "💡 Usa credenciales de PRODUCCIÓN solo cuando publiques tu app."
            );
          }, 500);
          return;
        }
        
        // Check if needs Connect activation
        if (errorData.needsConnectActivation) {
          toast({
            title: "⚙️ Configuración Necesaria",
            description: "Por favor activa Stripe Connect en tu cuenta. Sigue la guía que se mostrará.",
            variant: "destructive",
            duration: 8000,
          });
          
          // Show activation guide
          setTimeout(() => {
            alert(
              "📋 GUÍA RÁPIDA: Activar Stripe Connect\n\n" +
              "1. Ve a: https://dashboard.stripe.com/connect\n" +
              "2. Haz clic en 'Get Started' o 'Comenzar'\n" +
              "3. Completa el formulario (tipo de plataforma: Marketplace/Platform)\n" +
              "4. Una vez activado, regresa aquí y presiona 'Connect Bank Account' nuevamente\n\n" +
              "⏱️ Tiempo estimado: 2-3 minutos"
            );
          }, 500);
          return;
        }
        
        throw new Error(errorData.error || "Error al conectar con Stripe");
      }

      const data = await response.json();
      console.log("💳 [STRIPE-CONNECT-EXPRESS] Success:", data);
      
      if (data.url) {
        toast({
          title: "✅ Redirigiendo a Stripe",
          description: data.message || "Abriendo configuración de pagos...",
        });
        
        // Redirect to Stripe onboarding
        setTimeout(() => {
          window.location.href = data.url;
        }, 1000);
      } else {
        throw new Error("No se recibió URL de configuración");
      }
    } catch (error: any) {
      console.error("💳 [STRIPE-CONNECT-EXPRESS] Error:", error);
      toast({
        title: "Error al Conectar",
        description: error.message || "No se pudo conectar con Stripe. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Calculate payment summary from Firebase projects
  const calculatedSummary = React.useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        totalRevenue: 0,
        totalPending: 0,
        totalPaid: 0,
        totalOverdue: 0,
        pendingCount: 0,
        paidCount: 0,
      };
    }

    let totalRevenue = 0;
    let totalPending = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let pendingCount = 0;
    let paidCount = 0;

    projects.forEach((project) => {
      const amount = project.totalPrice || 0;
      
      // Categorize based on payment status
      const status = (project.paymentStatus || 'pending').toLowerCase();
      
      if (status === 'paid' || status === 'completed') {
        totalPaid += amount;
        paidCount++;
      } else if (status === 'overdue') {
        totalOverdue += amount;
      } else {
        totalPending += amount;
        pendingCount++;
      }
      
      // Total revenue is all projects
      totalRevenue += amount;
    });

    console.log('💰 [PAYMENT-SUMMARY]', { totalRevenue, totalPending, totalPaid, totalOverdue, pendingCount, paidCount });

    return {
      totalRevenue,
      totalPending,
      totalPaid,
      totalOverdue,
      pendingCount,
      paidCount,
    };
  }, [projects]);

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
    queryClient.invalidateQueries({ queryKey: ["/firebase/projects-and-estimates"] });
  };

  // Check for data loading errors
  const hasDataErrors = projectsError || paymentsError;

  // Si el usuario no tiene acceso, mostrar mensaje de upgrade completo
  if (!canUsePaymentTracking) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-900/50 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 relative">
                <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-red-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Payment Tracker Dashboard
              </CardTitle>
              <CardDescription className="text-lg text-gray-400 mt-2">
                Sistema de Pagos Premium - Requiere Plan Pagado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-red-900/10 to-orange-900/10 border border-red-900/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-cyan-400" />
                  ¿Qué incluye Payment Tracker?
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Dashboard avanzado para seguimiento de pagos en tiempo real</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Workflows de pago automatizados con recordatorios inteligentes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Historial completo de transacciones y reportes detallados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Integración con Stripe para pagos en línea seguros</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Análisis de flujo de efectivo y proyecciones financieras</span>
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm text-gray-400">Rastrea</p>
                  <p className="text-2xl font-bold text-white">∞</p>
                  <p className="text-xs text-gray-500">Pagos ilimitados</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm text-gray-400">Ahorra</p>
                  <p className="text-2xl font-bold text-white">10h</p>
                  <p className="text-xs text-gray-500">Por semana</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-sm text-gray-400">Mejora</p>
                  <p className="text-2xl font-bold text-white">95%</p>
                  <p className="text-xs text-gray-500">Tasa de cobro</p>
                </div>
              </div>
              
              <div className="text-center space-y-4">
                <p className="text-gray-400">
                  Tu plan actual: <span className="font-semibold text-white">{userPlan?.name || 'Primo Chambeador'}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Actualiza a <span className="text-cyan-400 font-semibold">Mero Patrón</span> o <span className="text-purple-400 font-semibold">Master Contractor</span> para gestionar pagos profesionalmente
                </p>
              </div>
              
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={() => navigate('/subscription')}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold px-6 py-3"
                  size="lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Ver Planes y Precios
                </Button>
                <Button
                  onClick={() => showUpgradeModal('paymentTracking', 'Gestiona todos tus pagos y cobros como un profesional')}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                  size="lg"
                >
                  Más Información
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen font-['Quantico'] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">
              Payment Management
            </h1>
            <p className="text-gray-400 text-lg">
              Simplified payment workflow with guided steps and complete tracking
            </p>
          </div>
          <Button
            onClick={refreshData}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Futuristic Dashboard */}
        <div className="mb-8">
          <FuturisticPaymentDashboard
            paymentSummary={calculatedSummary}
            isLoading={projectsLoading}
          />
        </div>

        {/* Error State */}
        {hasDataErrors && (
          <Card className="mb-6 bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-orange-400">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <h4 className="font-medium text-orange-400">Data Loading Issues</h4>
                  <p className="text-sm text-gray-400">
                    Some data could not be loaded. The system will continue with
                    available information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900 border-gray-700">
            <TabsTrigger
              value="workflow"
              className="flex items-center gap-2 data-[state=active]:bg-cyan-400 data-[state=active]:text-black"
            >
              <Workflow className="h-4 w-4" />
              Payment Workflow
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 data-[state=active]:bg-cyan-400 data-[state=active]:text-black"
            >
              <History className="h-4 w-4" />
              Payment History
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 data-[state=active]:bg-cyan-400 data-[state=active]:text-black"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Simplified Payment Workflow Tab */}
          <TabsContent value="workflow" className="space-y-6">
            {canUsePaymentTracking ? (
              <ProjectPaymentWorkflow
                projects={projects}
                payments={payments}
                onCreatePayment={createPaymentMutation.mutate}
                onSendInvoice={sendInvoiceMutation.mutate}
                isCreatingPayment={createPaymentMutation.isPending}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Esta función requiere un plan pagado</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="history" className="space-y-6">
            {canUsePaymentTracking ? (
              <PaymentHistory
                payments={payments}
                projects={projects}
                isLoading={paymentsLoading}
                onResendPaymentLink={resendPaymentLinkMutation.mutate}
                onRefresh={refreshData}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Esta función requiere un plan pagado</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {canUsePaymentTracking ? (
              <PaymentSettings
                stripeAccountStatus={stripeAccountStatus}
                onConnectStripe={connectToStripe}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Esta función requiere un plan pagado</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectPayments;