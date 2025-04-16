import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";
import Templates from "@/pages/Templates";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import PropertyOwnershipVerifier from "@/pages/PropertyOwnershipVerifier";
import AIProjectManager from "@/pages/AIProjectManager";
import ARFenceEstimator from "@/pages/ARFenceEstimator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/projects" component={Projects} />
      <Route path="/templates" component={Templates} />
      <Route path="/settings" component={Settings} />
      <Route path="/profile" component={Profile} />
      <Route path="/property-verifier" component={PropertyOwnershipVerifier} />
      <Route path="/ai-project-manager" component={AIProjectManager} />
      <Route path="/ar-fence-estimator" component={ARFenceEstimator} />
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
