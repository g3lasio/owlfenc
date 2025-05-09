import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";
import Clients from "./pages/Clients";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import PropertyOwnershipVerifier from "@/pages/PropertyOwnershipVerifier";
import PermitAdvisor from "@/pages/PermitAdvisor";
import AIProjectManager from "@/pages/AIProjectManager";
import ARFenceEstimator from "@/pages/ARFenceEstimator";
import AboutOwlFence from "@/pages/AboutOwlFence";
import AboutMervin from "@/pages/AboutMervin";
import LegalPolicy from "@/pages/LegalPolicy";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import PricingSettings from "@/pages/PricingSettings";
import Subscription from "@/pages/Subscription";
import Account from "./pages/Account";
import Billing from "./pages/Billing";
import History from "@/pages/History";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import RecuperarPassword from "@/pages/RecuperarPassword";
import ResetPassword from "@/pages/ResetPassword";
import EmailLinkCallback from "@/pages/EmailLinkCallback";
import AppleCallback from "@/pages/AppleCallback";
import SecuritySettings from "@/pages/SecuritySettings";
import { AuthProvider } from "@/contexts/AuthContext";

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
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/recuperar-password" component={RecuperarPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/login/email-link-callback" component={EmailLinkCallback} />
      <Route path="/apple-callback" component={AppleCallback} />
      <Route path="/about-owlfenc" component={AboutOwlFence} />
      <Route path="/about-mervin" component={AboutMervin} />
      <Route path="/legal-policy" component={LegalPolicy} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />

      {/* Rutas protegidas */}
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={Projects} />}
      </Route>
      <Route path="/clients" component={() => <ProtectedRoute component={Clients} />} />
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

      {/* Página no encontrada */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLayout>
          <Router />
        </AppLayout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;