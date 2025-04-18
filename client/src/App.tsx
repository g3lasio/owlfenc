import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";
import Clients from "@/pages/Clients";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import PropertyOwnershipVerifier from "@/pages/PropertyOwnershipVerifier";
import AIProjectManager from "@/pages/AIProjectManager";
import ARFenceEstimator from "@/pages/ARFenceEstimator";
import AboutOwlFence from "@/pages/AboutOwlFence";
import AboutMervin from "@/pages/AboutMervin";
import LegalPolicy from "@/pages/LegalPolicy";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import PricingSettings from "@/pages/PricingSettings";
import Subscription from "@/pages/Subscription";
import Account from "./pages/Account";
import History from "@/pages/History"; // Added import for History component

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/projects" component={Projects} />
      <Route path="/clients" component={Clients} />
      <Route path="/settings" component={Settings} />
      <Route path="/profile" component={Profile} />
      <Route path="/property-verifier" component={PropertyOwnershipVerifier} />
      <Route path="/ai-project-manager" component={AIProjectManager} />
      <Route path="/ar-fence-estimator" component={ARFenceEstimator} />
      <Route path="/about-owlfenc" component={AboutOwlFence} />
      <Route path="/about-mervin" component={AboutMervin} />
      <Route path="/legal-policy" component={LegalPolicy} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/settings/pricing" component={PricingSettings} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/account" component={Account} />
      <Route path="/history" component={History} /> {/* Added route for History */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Router />
      </AppLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;