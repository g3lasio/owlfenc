import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";
import Clients from "./pages/Clients";
import NuevoClientes from "./pages/NuevoClientes";
import Materials from "./pages/Materials";
import EstimatesWizard from "./pages/EstimatesWizard";
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
import AuthPage from "@/pages/Login";
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
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import ChatOnboarding from "@/components/onboarding/ChatOnboarding";
import { AuthProvider } from "@/contexts/AuthContext";
import ProfileCompletionGuard from "@/components/auth/ProfileCompletionGuard";
import { useOnboarding } from "@/hooks/useOnboarding";
import AuthDiagnostic from './pages/AuthDiagnostic';
import ClerkErrorBoundary from '@/components/ClerkErrorBoundary';
import { lazy } from 'react';
import CyberpunkLegalDefense from './pages/CyberpunkLegalDefense';
import SimpleContractGenerator from './pages/SimpleContractGenerator';
import ContractSignature from './pages/ContractSignature';
import MigrationPage from './pages/MigrationPage';

import { Redirect } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

// 🔧 STRIPE ERROR HANDLER
window.addEventListener('stripe-load-error', (event: any) => {
  console.warn('🔧 [STRIPE-ERROR] Stripe loading failed, payments disabled:', event.detail?.error);
});

// Componente para páginas protegidas con Clerk
type ProtectedRouteProps = {
  component: React.ComponentType<any>;
};

function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { needsOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();

  // Loading state - wait for Clerk to initialize
  if (!isLoaded || onboardingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Cargando sistema de autenticación...</p>
        </div>
      </div>
    );
  }

  // Check if user is signed in with Clerk
  if (!isSignedIn) {
    console.log('🔒 [AUTH] Usuario no autenticado con Clerk, redirigiendo a login');
    return <Redirect to="/login" />;
  }

  // Si el usuario necesita onboarding, muestra ChatOnboarding
  if (needsOnboarding) {
    return <ChatOnboarding onComplete={completeOnboarding} />;
  }

  // Renderiza el componente si el usuario está autenticado y ha completado onboarding
  return <Component />;
}

function Router() {

  return (
    <Switch>
      {/* Rutas públicas */}
      <Route path="/login" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/recuperar-password" component={RecuperarPassword} />
      <Route path="/forgot-password" component={RecuperarPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/login/email-link-callback" component={EmailLinkCallback} />
      <Route path="/auth-diagnostic" component={AuthDiagnostic} />
      <Route path="/about-owlfenc" component={AboutOwlFence} />
      
      {/* Public signature routes */}
      <Route path="/sign/:contractId/:party" component={ContractSignature} />
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
      <Route path="/estimates-dashboard">
        {() => <ProtectedRoute component={EstimatesDashboard} />}
      </Route>
      <Route path="/estimate-generator">
        {() => <ProtectedRoute component={EstimateGenerator} />}
      </Route>
      <Route path="/mis-estimados">
        {() => <ProtectedRoute component={MisEstimados} />}
      </Route>
      <Route path="/estimates-wizard">
        {() => <ProtectedRoute component={EstimatesWizard} />}
      </Route>
      <Route path="/wizard-estimate">
        {() => <ProtectedRoute component={EstimatesWizard} />}
      </Route>
      <Route path="/wizard">
        {() => <ProtectedRoute component={EstimatesWizard} />}
      </Route>
      <Route path="/security-settings">
        {() => <ProtectedRoute component={SecuritySettings} />}
      </Route>
      <Route path="/contract-generator">
        {() => <ProtectedRoute component={CyberpunkContractGenerator} />}
      </Route>
      <Route path="/cyberpunk-contract-generator">
        {() => <ProtectedRoute component={CyberpunkContractGenerator} />}
      </Route>
      <Route path="/simple-contract-generator">
        {() => <ProtectedRoute component={SimpleContractGenerator} />}
      </Route>
      <Route path="/legal-defense">
        {() => <ProtectedRoute component={CyberpunkLegalDefense} />}
      </Route>
      <Route path="/cyberpunk-legal-defense">
        {() => <ProtectedRoute component={CyberpunkLegalDefense} />}
      </Route>
      <Route path="/contract-engine">
        {() => <ProtectedRoute component={LegalContractEngineFixed} />}
      </Route>
      <Route path="/contract-manager">
        {() => <ProtectedRoute component={UnifiedContractManager} />}
      </Route>
      <Route path="/unified-contract-manager">
        {() => <ProtectedRoute component={UnifiedContractManager} />}
      </Route>
      <Route path="/smart-contract-wizard">
        {() => <ProtectedRoute component={SmartContractWizard} />}
      </Route>
      <Route path="/ai-testing">
        {() => <ProtectedRoute component={AITestingPage} />}
      </Route>
      <Route path="/deep-search-demo">
        {() => <ProtectedRoute component={DeepSearchDemo} />}
      </Route>
      <Route path="/permissions-demo">
        {() => <ProtectedRoute component={PermissionsDemo} />}
      </Route>
      <Route path="/auth-test">
        {() => <ProtectedRoute component={AuthTest} />}
      </Route>
      <Route path="/migration">
        {() => <ProtectedRoute component={MigrationPage} />}
      </Route>

      {/* 404 - Esta debe ser la última ruta */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Componente Wrapper con todos los providers necesarios
function AppWithClerk() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SidebarProvider>
          <PermissionProvider>
            <ProfileCompletionGuard>
              <AppLayout>
                <Router />
              </AppLayout>
            </ProfileCompletionGuard>
            <Toaster />
          </PermissionProvider>
        </SidebarProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

function App() {
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  if (!clerkPubKey) {
    console.error('❌ [CLERK] VITE_CLERK_PUBLISHABLE_KEY no está configurada');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error de Configuración</h1>
          <p className="text-gray-700 mb-4">
            La clave de Clerk no está configurada. Por favor, agrega la variable de entorno:
          </p>
          <code className="block bg-gray-100 p-3 rounded text-sm">
            VITE_CLERK_PUBLISHABLE_KEY=tu_clave_aquí
          </code>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      afterSignOutUrl="/"
      signInUrl="/login"
      signUpUrl="/signup"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-none",
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AppWithClerk />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;