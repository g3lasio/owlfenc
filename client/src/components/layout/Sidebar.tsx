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
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
      window.location.href = '/login';
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar la sesión. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex items-center justify-center">
          <img 
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png" 
            alt="Owl Fence"
            className="h-12 w-auto object-contain"
          />
        </div>
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{getCurrentPlanName()}</div>
          <button 
            onClick={handleLogout} 
            disabled={loading}
            className={`p-2 rounded-md hover:bg-destructive/10 hover:text-destructive ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <i className="ri-loader-2-line animate-spin"></i>
            ) : (
              <i className="ri-logout-box-r-line"></i>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}