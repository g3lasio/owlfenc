import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Navigation from "./Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Definición de tipos para la suscripción y planes
interface UserSubscription {
  id?: number;
  status: string;
  planId?: number;
}

interface Plan {
  id: number;
  name: string;
}

export default function Sidebar() {
  const { logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      console.log("Iniciando proceso de cierre de sesión desde Sidebar");
      setLoading(true);
      console.log("Estado de carga activado:", loading);
      
      console.log("Llamando a función logout()");
      await logout();
      console.log("Logout completado exitosamente");
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
      console.log("Toast de éxito mostrado");
      
      // Forzar una redirección completa
      console.log("Iniciando redirección a /login");
      setTimeout(() => {
        console.log("Ejecutando redirección...");
        window.location.replace("/login");
      }, 100);
    } catch (error) {
      console.error("Error detallado al cerrar sesión:", error);
      console.log("Tipo de error:", error.name);
      console.log("Mensaje de error:", error.message);
      console.log("Stack trace:", error.stack);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar la sesión. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);

  // Obtenemos la información de la suscripción actual del usuario
  const { data: userSubscriptionData } = useQuery<UserSubscription | null>({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  // Obtenemos los planes disponibles
  const { data: plansData } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
    throwOnError: false,
  });

  // Convertir los datos para evitar errores de tipado
  const userSubscription: UserSubscription | null = userSubscriptionData || null;
  const plans: Plan[] | null = plansData || null;

  // Función para obtener el nombre del plan actual
  const getCurrentPlanName = (): string => {
    if (!userSubscription || !plans) return "El Mero Patrón";

    // Si hay un plan activo, buscamos su nombre
    if (userSubscription.status === "active" && userSubscription.planId) {
      const currentPlan = plans.find((plan) => plan.id === userSubscription.planId);
      return currentPlan ? currentPlan.name : "El Mero Patrón";
    }

    return "El Mero Patrón";
  };

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-card border-r border-border">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <i className="ri-fence-line text-white text-xl"></i>
          </div>
          <h1 className="ml-2 text-xl font-bold">FenceQuote Pro</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Estimate & Contract Generator</p>
      </div>

      {/* Botón de Upgrade Plan destacado */}
      <div className="mx-4 mt-4">
        <Link href="/subscription" className="w-full">
          <Button size="default" className="w-full gap-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90">
            <i className="ri-vip-crown-line text-lg"></i>
            <span>Upgrade Plan</span>
          </Button>
        </Link>
      </div>
      
      {/* Navegación usando el componente unificado */}
      <Navigation variant="sidebar" />

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center mb-4 hover:bg-accent/10 rounded-md p-2">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <span className="font-medium text-sm">JC</span>
          </div>
          <div className="ml-2">
            <div className="text-sm font-medium">John Contractor</div>
            <div className="text-xs text-muted-foreground">{getCurrentPlanName()}</div>
          </div>
          <button 
            onClick={handleLogout} 
            disabled={loading}
            className={`ml-auto p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <i className="ri-loader-2-line animate-spin"></i>
            ) : (
              <i className="ri-logout-box-r-line"></i>
            )}
          </button>
        </div>

        <div className="mt-4 bg-accent/5 rounded-md p-3 text-xs border border-border">
          <div className="flex items-center mb-2">
            <i className="ri-rocket-line mr-2 text-primary"></i>
            <span className="font-medium">Próximas Funciones</span>
          </div>
          <div className="flex flex-col mt-1 space-y-2.5 text-muted-foreground">
            <span className="flex items-center">
              <i className="ri-augmented-reality-line mr-2"></i> Integración AR
            </span>
            <span className="flex items-center">
              <i className="ri-robot-line mr-2"></i> Gestor de Proyectos IA
            </span>
            <span className="flex items-center">
              <i className="ri-shield-check-line mr-2"></i> Verificador de Propiedad
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}