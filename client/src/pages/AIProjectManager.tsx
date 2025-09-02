import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrainIcon, Lock, Sparkles, CreditCard } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionContext";
import { useLocation } from "wouter";

export default function AIProjectManager() {
  const { hasAccess, userPlan, showUpgradeModal } = usePermissions();
  const [, navigate] = useLocation();
  const hasAIProjectManagerAccess = hasAccess('projects') && userPlan?.id !== 1;
  
  // Si el usuario no tiene acceso, mostrar mensaje de upgrade
  if (!hasAIProjectManagerAccess) {
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
                AI Project Manager
              </CardTitle>
              <CardDescription className="text-lg text-gray-400 mt-2">
                Función Premium - Requiere Plan Pagado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-red-900/10 to-orange-900/10 border border-red-900/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <BrainIcon className="w-6 h-6 text-cyan-400" />
                  ¿Qué incluye AI Project Manager?
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Gestión inteligente de proyectos con IA que organiza y prioriza automáticamente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Recordatorios automáticos para tareas, deadlines y pagos pendientes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Seguimiento de estimados enviados y contratos aprobados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Alertas inteligentes para prevenir retrasos o errores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Optimización de agenda y coordinación de equipo con IA</span>
                  </li>
                </ul>
              </div>
              
              <div className="text-center space-y-4">
                <p className="text-gray-400">
                  Tu plan actual: <span className="font-semibold text-white">{userPlan?.name || 'Primo Chambeador'}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Actualiza a <span className="text-cyan-400 font-semibold">Mero Patrón</span> o <span className="text-purple-400 font-semibold">Master Contractor</span> para acceder a esta función
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
                  onClick={() => showUpgradeModal('projects', 'Gestiona todos tus proyectos con inteligencia artificial avanzada')}
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
  
  // Si tiene acceso, mostrar la página normal
  return (
    <div className="container mx-auto mb-40 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <BrainIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Project Manager</h1>
          <p className="text-muted-foreground">
            Coming Soon: Your intelligent assistant for managing fence projects
            and business tasks
          </p>
        </div>
      </div>

      <Card className="w-full ">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-center text-xl">
            🚧 Coming Soon 🚧
          </CardTitle>
          <CardDescription className="text-center">
            This feature is currently in development
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto flex items-center justify-center mb-4">
              <BrainIcon className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Project Manager</h3>
            <p className="text-muted-foreground mb-4">
              Our team is working hard to bring you this exciting new feature.
              With AI Project Manager, you'll be able to:
            </p>
            <ul className="text-left space-y-2 mb-6 max-w-md mx-auto">
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>
                  Organize your projects in progress with intelligent
                  prioritization
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>
                  Receive reminders for tasks, deadlines, and pending payments
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Track estimates sent and contracts approved</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Get smart alerts to prevent delays or errors</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Optimize your schedule and team coordination</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <i className="ri-notification-2-line text-amber-600"></i>
                  </div>
                  <h4 className="font-medium">Smart Reminders</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Never miss a deadline or forget a follow-up call with clients
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <i className="ri-bar-chart-2-line text-blue-600"></i>
                  </div>
                  <h4 className="font-medium">Progress Tracking</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Real-time project monitoring with intelligent insights
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <i className="ri-money-dollar-circle-line text-green-600"></i>
                  </div>
                  <h4 className="font-medium">Financial Insights</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Track payments, invoices, and financial performance
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <i className="ri-calendar-check-line text-purple-600"></i>
                  </div>
                  <h4 className="font-medium">Schedule Optimization</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Smart scheduling to maximize team efficiency
                </p>
              </CardContent>
            </Card>
          </div>

          <Button disabled className="mb-2">
            Get Notified When Available
          </Button>
          <p className="text-sm text-muted-foreground">
            Expected launch: Fall 2023
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
