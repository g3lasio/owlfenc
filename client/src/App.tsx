import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";
import Clients from "./pages/Clients";
import NuevoClientes from "./pages/NuevoClientes";
import Materials from "./pages/Materials";
import EstimatesWizard from "./pages/EstimatesWizardFixed";
import ChatInterface from "@/components/chat/ChatInterface";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import PropertyOwnershipVerifier from "@/pages/PropertyOwnershipVerifier";
import PermitAdvisor from "@/pages/PermitAdvisor";
import AIProjectManager from "@/pages/AIProjectManager";
import OwlFunding from "@/pages/OwlFunding";
import ARFenceEstimator from "@/pages/ARFenceEstimator";
import AboutOwlFence from "@/pages/AboutOwlFence";
import AboutMervin from "@/pages/AboutMervin";
import LegalPolicy from "@/pages/LegalPolicy";
import Mervin from "@/pages/Mervin";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import PricingSettings from "@/pages/PricingSettings";
import Subscription from "@/pages/Subscription";
import SubscriptionTest from "@/pages/SubscriptionTest";

import Billing from "./pages/Billing";
import History from "@/pages/History";
import ProjectPayments from "@/pages/ProjectPayments";
import Invoices from "@/pages/Invoices";

import EstimatesDashboard from "@/pages/EstimatesDashboard";
import EstimateGenerator from "@/pages/EstimateGenerator";
import MisEstimados from "@/pages/MisEstimados";
import AuthPage from "@/pages/Login"; // Renombrado el import aunque el archivo sigue siendo Login.tsx
import RecuperarPassword from "@/pages/RecuperarPassword";
import ResetPassword from "@/pages/ResetPassword";
import EmailLinkCallback from "@/pages/EmailLinkCallback";
import SecuritySettings from "@/pages/SecuritySettings";
import CyberpunkContractGenerator from "@/pages/CyberpunkContractGenerator";
import { setupGlobalErrorHandlers } from "@/lib/error-handlers";


import LegalContractEngineFixed from "@/pages/LegalContractEngineFixed";
import UnifiedContractManager from "@/pages/UnifiedContractManager";
import SmartContractWizard from "@/pages/SmartContractWizard";
import AITestingPage from "@/pages/AITestingPage";
import DeepSearchDemo from "@/pages/DeepSearchDemo";
import PermissionsDemo from "@/pages/PermissionsDemo";
import { AuthTest } from "@/pages/AuthTest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import ChatOnboarding from "@/components/onboarding/ChatOnboarding";
import { useOnboarding } from "@/hooks/useOnboarding";
import AuthDiagnostic from './pages/AuthDiagnostic';
import { lazy } from 'react';
import CyberpunkLegalDefense from './pages/CyberpunkLegalDefense';
// TEMPORARILY DISABLED: import SimpleContractGenerator from './pages/SimpleContractGenerator';
import ContractSignature from './pages/ContractSignature';
import SharedEstimate from './pages/SharedEstimate';


import { Redirect } from "wouter";
import { useState, useEffect } from "react";

// 🔧 FIX: Global error handler for unhandled promises - DESHABILITADO TEMPORALMENTE
// setupGlobalErrorHandlers(); // ❌ COMENTADO: Estaba silenciando errores legítimos del agente

// 🔧 STRIPE ERROR HANDLER
window.addEventListener('stripe-load-error', (event: any) => {
  console.warn('🔧 [STRIPE-ERROR] Stripe loading failed, payments disabled:', event.detail?.error);
});

// Componente para páginas protegidas
type ProtectedRouteProps = {
  component: React.ComponentType<any>;
};

function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const { needsOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const [authStable, setAuthStable] = useState(false);

  // Estabilizar el estado de auth para evitar redirecciones por cambios temporales
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (!loading && !onboardingLoading) {
      if (currentUser) {
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
  }, [currentUser, loading, onboardingLoading]);

  // Muestra un indicador de carga mientras se verifica la autenticación o onboarding
  if (loading || onboardingLoading || !authStable) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirige a login solo después de que el estado sea estable y realmente no hay usuario
  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  // Si el usuario necesita onboarding, muestra ChatOnboarding
  if (needsOnboarding) {
    return <ChatOnboarding onComplete={completeOnboarding} />;
  }

  // Renderiza el componente si el usuario está autenticado y ha completado onboarding
  return <Component />;
}


// 🔒 ISOLATED PUBLIC ROUTES - No authentication or layout needed
function PublicOnlyRouter() {
  return (
    <Switch>
      {/* Public shared estimate routes - COMPLETELY ISOLATED */}
      <Route path="/estimate/:shareId" component={SharedEstimate} />
      <Route path="/shared-estimate/:shareId" component={SharedEstimate} />
      
      {/* Public signature routes - COMPLETELY ISOLATED */}
      <Route path="/sign/:contractId/:party" component={ContractSignature} />
      
      {/* No match for public-only routes */}
      <Route component={() => null} />
    </Switch>
  );
}

// 🔐 MAIN APP ROUTER - Requires full app context and layout
function MainAppRouter() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <SidebarProvider>
          <AppLayout>
            <Switch>
              {/* Rutas públicas con layout mínimo */}
              <Route path="/login" component={() => <AuthPage />} />
              <Route path="/signup" component={() => <AuthPage />} />
              <Route path="/recuperar-password" component={RecuperarPassword} />
              <Route path="/forgot-password" component={RecuperarPassword} />
              <Route path="/reset-password" component={ResetPassword} />
              <Route path="/login/email-link-callback" component={EmailLinkCallback} />
              <Route path="/auth-diagnostic" component={AuthDiagnostic} />
              
              <Route path="/about-owlfenc" component={AboutOwlFence} />
              <Route path="/about-mervin" component={AboutMervin} />
              <Route path="/legal-policy" component={LegalPolicy} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-of-service" component={TermsOfService} />

              {/* Rutas protegidas */}
              <Route path="/" component={() => <ProtectedRoute component={Home} />} />
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
              <Route path="/settings">
                {() => <ProtectedRoute component={Settings} />}
              </Route>
              <Route path="/profile">
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
              <Route path="/ai-project-manager">
                {() => <ProtectedRoute component={AIProjectManager} />}
              </Route>
              <Route path="/owl-funding">
                {() => <ProtectedRoute component={OwlFunding} />}
              </Route>
              <Route path="/owlfunding">
                {() => <ProtectedRoute component={OwlFunding} />}
              </Route>
              <Route path="/ar-fence-estimator">
                {() => <ProtectedRoute component={ARFenceEstimator} />}
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
              <Route path="/history">
                {() => <ProtectedRoute component={History} />}
              </Route>
              <Route path="/security">
                {() => <ProtectedRoute component={SecuritySettings} />}
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
                {/* TEMPORARILY DISABLED: {() => <ProtectedRoute component={SimpleContractGenerator} />} */}
              </Route>
              <Route path="/cyberpunk-legal-defense">
                {() => <ProtectedRoute component={CyberpunkLegalDefense} />}
              </Route>
              <Route path="/simple-contracts">
                {/* TEMPORARILY DISABLED: {() => <ProtectedRoute component={SimpleContractGenerator} />} */}
              </Route>
              <Route path="/simple-contract-generator">
                {/* TEMPORARILY DISABLED: {() => <ProtectedRoute component={SimpleContractGenerator} />} */}
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
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
          <Toaster />
        </SidebarProvider>
      </PermissionProvider>
    </AuthProvider>
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          {isIsolatedPublicRoute ? (
            // 🔒 ISOLATED: Render public routes without any app context
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
    </ErrorBoundary>
  );
}

export default App;