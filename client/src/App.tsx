import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Suspense, lazy } from 'react';

// 🚀 CRITICAL: Only import essential components statically
import ContractSignature from './pages/ContractSignature';
import SharedEstimate from './pages/SharedEstimate';
import ContractVerification from './pages/ContractVerification';

// 🔄 LAZY LOAD: All other pages load on-demand to improve initial load time
const NotFound = lazy(() => import("@/pages/not-found"));
const AppLayout = lazy(() => import("@/components/layout/AppLayout"));
const Home = lazy(() => import("@/pages/Home"));
const Projects = lazy(() => import("@/pages/Projects"));
const Clients = lazy(() => import("./pages/Clients"));
const NuevoClientes = lazy(() => import("./pages/NuevoClientes"));
const Materials = lazy(() => import("./pages/Materials"));
const EstimatesWizard = lazy(() => import("./pages/EstimatesWizard"));
// ChatInterface is loaded through ChatProvider, not directly imported here
const Profile = lazy(() => import("@/pages/Profile"));
const PropertyOwnershipVerifier = lazy(() => import("@/pages/PropertyOwnershipVerifier"));
const PermitAdvisor = lazy(() => import("@/pages/PermitAdvisor"));
const OwlFunding = lazy(() => import("@/pages/OwlFunding"));
const AboutOwlFence = lazy(() => import("@/pages/AboutOwlFence"));
const AboutMervin = lazy(() => import("@/pages/AboutMervin"));
const LegalPolicy = lazy(() => import("@/pages/LegalPolicy"));
const Mervin = lazy(() => import("@/pages/Mervin"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const PricingSettings = lazy(() => import("@/pages/PricingSettings"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const SubscriptionTest = lazy(() => import("@/pages/SubscriptionTest"));
const Billing = lazy(() => import("./pages/Billing"));
const ProjectPayments = lazy(() => import("@/pages/ProjectPayments"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const EstimatesDashboard = lazy(() => import("@/pages/EstimatesDashboard"));
const EstimateGenerator = lazy(() => import("@/pages/EstimateGenerator"));
const MisEstimados = lazy(() => import("@/pages/MisEstimados"));
const AuthPage = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const RecuperarPassword = lazy(() => import("@/pages/RecuperarPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const EmailLinkCallback = lazy(() => import("@/pages/EmailLinkCallback"));
const EmailVerificationCallback = lazy(() => import("@/pages/EmailVerificationCallback"));
const CyberpunkContractGenerator = lazy(() => import("@/pages/CyberpunkContractGenerator"));
const LegalContractEngineFixed = lazy(() => import("@/pages/LegalContractEngineFixed"));
const UnifiedContractManager = lazy(() => import("@/pages/UnifiedContractManager"));
const SmartContractWizard = lazy(() => import("@/pages/SmartContractWizard"));
const AITestingPage = lazy(() => import("@/pages/AITestingPage"));
const DeepSearchDemo = lazy(() => import("@/pages/DeepSearchDemo"));
const PermissionsDemo = lazy(() => import("@/pages/PermissionsDemo"));
const AuthDiagnostic = lazy(() => import('./pages/AuthDiagnostic'));
const SimpleContractGenerator = lazy(() => import('./pages/SimpleContractGenerator'));
const WebAuthnPopup = lazy(() => import('./pages/WebAuthnPopup'));
const HelpCenter = lazy(() => import('./pages/help/HelpCenter'));
const HelpArticle = lazy(() => import('./pages/help/HelpArticle'));
const GetSupport = lazy(() => import('./pages/help/GetSupport'));

// Context providers - load statically as they're needed early
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { PageContextProvider } from "@/contexts/PageContext";

import { Redirect, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PaymentBlockModal } from "@/components/subscription/PaymentBlockModal";

// 🔧 STRIPE ERROR HANDLER
window.addEventListener('stripe-load-error', (event: any) => {
  console.warn('🔧 [STRIPE-ERROR] Stripe loading failed, payments disabled:', event.detail?.error);
});

// Loading spinner component for lazy-loaded pages
function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

// Componente para páginas protegidas
type ProtectedRouteProps = {
  component: React.ComponentType<any>;
};

function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [authStable, setAuthStable] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
  const userEmail = user?.email || "";
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);

  // Verificar estado de suspensión por pago fallido
  const { data: suspensionStatus, isLoading: isSuspensionLoading } = useQuery<{
    success: boolean;
    isSuspended: boolean;
    reason?: 'payment_failed' | 'subscription_inactive' | 'subscription_canceled';
    downgradedAt?: string;
  }>({
    queryKey: ['/api/subscription/suspension-status'],
    enabled: !!user && authStable,
    staleTime: 30000, // 30 segundos de cache
    retry: 1
  });

  // Mostrar modal de suspensión si el usuario está suspendido
  useEffect(() => {
    if (suspensionStatus?.isSuspended && authStable) {
      setShowSuspensionModal(true);
    }
  }, [suspensionStatus, authStable]);

  // Estabilizar el estado de auth para evitar redirecciones por cambios temporales
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (!loading) {
      if (user) {
        // Si hay usuario, marcar como estable inmediatamente
        setAuthStable(true);
      } else {
        // Si no hay usuario, esperar un poco antes de redirigir (evitar redirecciones por estado temporal)
        timeoutId = setTimeout(() => {
          setAuthStable(true);
        }, 1500); // Esperar 1.5 segundos antes de considerar la pérdida de auth como real
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, loading]);

  // Show loading spinner while auth is not stable OR while checking suspension status
  if (loading || !authStable || isSuspensionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirige a login solo después de que el estado sea estable y realmente no hay usuario
  if (!user) {
    return <Redirect to="/login" />;
  }

  // 🚨 BLOQUEO REAL: Si el usuario está suspendido por pago fallido, bloquear acceso a todo excepto subscription
  const isOnSubscriptionPage = location === '/subscription' || location === '/billing';
  const isSuspended = suspensionStatus?.isSuspended && authStable;
  
  if (isSuspended && !isOnSubscriptionPage) {
    // Usuario suspendido intentando acceder a otras páginas - bloquear y mostrar modal NO-DISMISSIBLE
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <PaymentBlockModal
          isOpen={true}
          onClose={undefined} // Modal NO-DISMISSIBLE - usuario debe actualizar pago
          reason={suspensionStatus?.reason}
          nextBillingDate={suspensionStatus?.downgradedAt}
        />
      </div>
    );
  }

  // Renderiza el componente si el usuario está autenticado y no está suspendido (o está en página de suscripción)
  return (
    <>
      <Suspense fallback={<PageLoadingSpinner />}>
        <Component />
      </Suspense>
      {/* Mostrar modal informativo si está suspendido pero en página de suscripción */}
      {isSuspended && isOnSubscriptionPage && (
        <PaymentBlockModal
          isOpen={showSuspensionModal}
          onClose={() => setShowSuspensionModal(false)}
          reason={suspensionStatus?.reason}
          nextBillingDate={suspensionStatus?.downgradedAt}
        />
      )}
    </>
  );
}


// 🔒 ISOLATED PUBLIC ROUTES - No authentication or layout needed
// These routes load INSTANTLY without waiting for the main app bundle
function PublicOnlyRouter() {
  return (
    <Switch>
      {/* Public shared estimate routes - COMPLETELY ISOLATED */}
      <Route path="/estimate/:shareId" component={SharedEstimate} />
      <Route path="/shared-estimate/:shareId" component={SharedEstimate} />
      
      {/* Public signature routes - COMPLETELY ISOLATED */}
      <Route path="/sign/:contractId/:party" component={ContractSignature} />
      
      {/* Public contract verification route - COMPLETELY ISOLATED */}
      <Route path="/verify" component={ContractVerification} />
      
      {/* No match for public-only routes */}
      <Route component={() => null} />
    </Switch>
  );
}

// 🔐 MAIN APP ROUTER - Requires full app context and layout
function MainAppRouter() {
  return (
    <AuthSessionProvider>
      <PermissionProvider>
        <SidebarProvider>
          <PageContextProvider>
            <ChatProvider>
            <Suspense fallback={<PageLoadingSpinner />}>
            <AppLayout>
            <Switch>
              {/* Root redirects to login - main app requires authentication */}
              <Route path="/">
                {() => {
                  const { user, loading } = useAuth();
                  
                  // Show loading spinner while auth state is being determined
                  if (loading) {
                    return (
                      <div className="flex items-center justify-center min-h-screen">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    );
                  }
                  
                  // Redirect based on auth state
                  return user ? <Redirect to="/home" /> : <Redirect to="/login" />;
                }}
              </Route>

              {/* Auth & Account - Public Routes */}
              <Route path="/login" component={() => <Suspense fallback={<PageLoadingSpinner />}><AuthPage /></Suspense>} />
              <Route path="/signup" component={() => <Suspense fallback={<PageLoadingSpinner />}><Signup /></Suspense>} />
              <Route path="/recuperar-password" component={() => <Suspense fallback={<PageLoadingSpinner />}><RecuperarPassword /></Suspense>} />
              <Route path="/forgot-password" component={() => <Suspense fallback={<PageLoadingSpinner />}><RecuperarPassword /></Suspense>} />
              <Route path="/reset-password" component={() => <Suspense fallback={<PageLoadingSpinner />}><ResetPassword /></Suspense>} />
              <Route path="/login/email-link-callback" component={() => <Suspense fallback={<PageLoadingSpinner />}><EmailLinkCallback /></Suspense>} />
              <Route path="/email-verification-callback" component={() => <Suspense fallback={<PageLoadingSpinner />}><EmailVerificationCallback /></Suspense>} />
              <Route path="/webauthn-popup" component={() => <Suspense fallback={<PageLoadingSpinner />}><WebAuthnPopup /></Suspense>} />
              <Route path="/auth-diagnostic" component={() => <Suspense fallback={<PageLoadingSpinner />}><AuthDiagnostic /></Suspense>} />
              
              {/* About & Legal - Public Routes */}
              <Route path="/about-owlfenc" component={() => <Suspense fallback={<PageLoadingSpinner />}><AboutOwlFence /></Suspense>} />
              <Route path="/about-mervin" component={() => <Suspense fallback={<PageLoadingSpinner />}><AboutMervin /></Suspense>} />
              <Route path="/legal-policy" component={() => <Suspense fallback={<PageLoadingSpinner />}><LegalPolicy /></Suspense>} />
              <Route path="/privacy-policy" component={() => <Suspense fallback={<PageLoadingSpinner />}><PrivacyPolicy /></Suspense>} />
              <Route path="/terms-of-service" component={() => <Suspense fallback={<PageLoadingSpinner />}><TermsOfService /></Suspense>} />

              {/* Dashboard - Protected Route (redirects unauthenticated users to /) */}
              <Route path="/home" component={() => <ProtectedRoute component={Home} />} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={Home} />} />
              <Route path="/mervin" component={() => <ProtectedRoute component={Mervin} />} />
              <Route path="/projects">
                {() => <ProtectedRoute component={Projects} />}
              </Route>
              <Route path="/project-payments">
                {() => <ProtectedRoute component={ProjectPayments} />}
              </Route>
              <Route path="/payments">
                {() => <ProtectedRoute component={ProjectPayments} />}
              </Route>
              <Route path="/invoices">
                {() => <ProtectedRoute component={Invoices} />}
              </Route>

              <Route path="/clients" component={() => <ProtectedRoute component={NuevoClientes} />} />
              <Route path="/clientes" component={() => <ProtectedRoute component={Clients} />} />
              <Route path="/materials">
                {() => <ProtectedRoute component={Materials} />}
              </Route>
              <Route path="/profile">
                {() => <ProtectedRoute component={Profile} />}
              </Route>
              <Route path="/settings">
                {() => <ProtectedRoute component={Profile} />}
              </Route>
              <Route path="/property-verifier">
                {() => <ProtectedRoute component={PropertyOwnershipVerifier} />}
              </Route>
              <Route path="/property-ownership-verifier">
                {() => <ProtectedRoute component={PropertyOwnershipVerifier} />}
              </Route>
              <Route path="/permit-advisor">
                {() => <ProtectedRoute component={PermitAdvisor} />}
              </Route>
              <Route path="/owl-funding">
                {() => <ProtectedRoute component={OwlFunding} />}
              </Route>
              <Route path="/owlfunding">
                {() => <ProtectedRoute component={OwlFunding} />}
              </Route>
              <Route path="/settings/pricing">
                {() => <ProtectedRoute component={PricingSettings} />}
              </Route>
              <Route path="/subscription">
                {() => <ProtectedRoute component={Subscription} />}
              </Route>
              <Route path="/subscription-test">
                {() => <ProtectedRoute component={SubscriptionTest} />}
              </Route>

              <Route path="/billing">
                {() => <ProtectedRoute component={Billing} />}
              </Route>

              {/* Help & Support Routes */}
              <Route path="/support/help-center/article/:id">
                {() => <ProtectedRoute component={HelpArticle} />}
              </Route>
              <Route path="/help/help-center/article/:id">
                {() => <ProtectedRoute component={HelpArticle} />}
              </Route>
              <Route path="/support/help-center">
                {() => <ProtectedRoute component={HelpCenter} />}
              </Route>
              <Route path="/help/help-center">
                {() => <ProtectedRoute component={HelpCenter} />}
              </Route>
              <Route path="/support/get-support">
                {() => <ProtectedRoute component={GetSupport} />}
              </Route>
              <Route path="/help/get-support">
                {() => <ProtectedRoute component={GetSupport} />}
              </Route>

              <Route path="/smart-contract-wizard">
                {() => <ProtectedRoute component={SmartContractWizard} />}
              </Route>
              <Route path="/contract-generator">
                {() => <ProtectedRoute component={LegalContractEngineFixed} />}
              </Route>
              <Route path="/legal-contract-engine">
                {() => <ProtectedRoute component={LegalContractEngineFixed} />}
              </Route>
              <Route path="/legal-defense">
                {() => <ProtectedRoute component={SimpleContractGenerator} />}
              </Route>
              <Route path="/simple-contracts">
                {() => <ProtectedRoute component={SimpleContractGenerator} />}
              </Route>
              <Route path="/simple-contract-generator">
                {() => <ProtectedRoute component={SimpleContractGenerator} />}
              </Route>
              <Route path="/dashboard/contracts">
                {() => <ProtectedRoute component={SimpleContractGenerator} />}
              </Route>

              <Route path="/unified-contracts">
                {() => <ProtectedRoute component={UnifiedContractManager} />}
              </Route>
              <Route path="/cyberpunk-contracts">
                {() => <ProtectedRoute component={CyberpunkContractGenerator} />}
              </Route>
              <Route path="/ai-testing">
                {() => <ProtectedRoute component={AITestingPage} />}
              </Route>
              <Route path="/deepsearch-demo">
                {() => <ProtectedRoute component={DeepSearchDemo} />}
              </Route>
              <Route path="/permissions-demo">
                {() => <ProtectedRoute component={PermissionsDemo} />}
              </Route>
              <Route path="/estimates">
                {() => <ProtectedRoute component={EstimatesWizard} />}
              </Route>
              <Route path="/estimates-wizard">
                {() => <ProtectedRoute component={EstimatesWizard} />}
              </Route>
              <Route path="/estimate-generator">
                {() => <ProtectedRoute component={EstimateGenerator} />}
              </Route>
              <Route path="/mis-estimados">
                {() => <ProtectedRoute component={MisEstimados} />}
              </Route>
              <Route path="/estimates-dashboard">
                {() => <ProtectedRoute component={EstimatesDashboard} />}
              </Route>
              <Route path="/estimates-legacy">
                {() => <ProtectedRoute component={EstimateGenerator} />}
              </Route>

              {/* Página no encontrada */}
              <Route component={() => <Suspense fallback={<PageLoadingSpinner />}><NotFound /></Suspense>} />
            </Switch>
          </AppLayout>
          </Suspense>
          <Toaster />
          </ChatProvider>
          </PageContextProvider>
        </SidebarProvider>
      </PermissionProvider>
    </AuthSessionProvider>
  );
}

function App() {
  // 🔒 CHECK: Is this a public-only route that needs complete isolation?
  // Using window.location.pathname since useLocation requires Router context
  const currentPath = window.location.pathname;
  const isIsolatedPublicRoute = 
    currentPath.startsWith('/estimate/') ||
    currentPath.startsWith('/shared-estimate/') ||
    currentPath.startsWith('/sign/');

  // 🔍 DEBUG: Log routing decision (remove in production)
  console.log('🔒 [ROUTING-DECISION]', {
    currentPath,
    isIsolatedPublicRoute,
    decision: isIsolatedPublicRoute ? 'ISOLATED_PUBLIC' : 'FULL_APP'
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {isIsolatedPublicRoute ? (
          // 🔒 ISOLATED: Render public routes without any app context - LOADS INSTANTLY
          <div className="isolated-public-app">
            <PublicOnlyRouter />
            <Toaster />
          </div>
        ) : (
          // 🔐 FULL APP: Render main app with full context and layout  
          <div className="full-authenticated-app">
            <MainAppRouter />
          </div>
        )}
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
