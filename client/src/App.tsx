
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
import PricingSettings from "@/pages/PricingSettings";
import Subscription from "@/pages/Subscription";
import Account from "./pages/Account";
import Billing from "./pages/Billing";
import History from "@/pages/History";
import ProjectPayments from "@/pages/ProjectPayments";
import EstimatesDashboard from "@/pages/EstimatesDashboard";
import EstimateGenerator from "@/pages/EstimateGenerator";
import AuthPage from "@/pages/Login"; // Renombrado el import aunque el archivo sigue siendo Login.tsx
import RecuperarPassword from "@/pages/RecuperarPassword";
import ResetPassword from "@/pages/ResetPassword";
import EmailLinkCallback from "@/pages/EmailLinkCallback";
import AppleCallback from "@/pages/AppleCallback";
import SecuritySettings from "@/pages/SecuritySettings";
import ContractGenerator from "@/pages/ContractGenerator";
import AITestingPage from "@/pages/AITestingPage";
import DeepSearchDemo from "@/pages/DeepSearchDemo";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AuthDiagnostic from './pages/AuthDiagnostic';
import { lazy } from 'react';

// Componente para páginas protegidas
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";

type ProtectedRouteProps = {
  component: React.ComponentType<any>;
};

function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();

  // Muestra un indicador de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirige a login si no hay usuario autenticado
  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  // Renderiza el componente si el usuario está autenticado
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Rutas públicas */}
      <Route path="/login" component={() => <AuthPage />} />
      <Route path="/signup" component={() => <AuthPage />} /> {/* Mantiene la misma ruta pero usa AuthPage */}
      <Route path="/recuperar-password" component={RecuperarPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/login/email-link-callback" component={EmailLinkCallback} />
      <Route path="/apple-callback" component={AppleCallback} />
      <Route path="/auth-diagnostic" component={AuthDiagnostic} />
      <Route path="/apple-auth-diagnostic" component={lazy(() => import('./pages/AppleAuthDiagnostic'))} />
      <Route path="/about-owlfenc" component={AboutOwlFence} />
      <Route path="/about-mervin" component={AboutMervin} />
      <Route path="/legal-policy" component={LegalPolicy} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />

      {/* Rutas protegidas */}
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/mervin">
        {() => <ProtectedRoute component={Mervin} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={Projects} />}
      </Route>
      <Route path="/project-payments">
        {() => <ProtectedRoute component={ProjectPayments} />}
      </Route>
      <Route path="/clients" component={() => <ProtectedRoute component={NuevoClientes} />} />
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
      <Route path="/account">
        {() => <ProtectedRoute component={Account} />}
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
      <Route path="/contracts">
        {() => <ProtectedRoute component={ContractGenerator} />}
      </Route>
      <Route path="/ai-testing">
        {() => <ProtectedRoute component={AITestingPage} />}
      </Route>
      <Route path="/deepsearch-demo">
        {() => <ProtectedRoute component={DeepSearchDemo} />}
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
      <Route path="/estimates-dashboard">
        {() => <ProtectedRoute component={EstimatesDashboard} />}
      </Route>
      <Route path="/estimates-legacy">
        {() => <ProtectedRoute component={EstimateGenerator} />}
      </Route>

      {/* Página no encontrada */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <AppLayout>
            <Router />
          </AppLayout>
          <Toaster />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
