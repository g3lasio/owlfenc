import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Navigation from "./Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogOut } from "lucide-react";

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
  const { currentUser, logout } = useAuth();
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
    if (!userSubscription || !plans) return "Plan Básico";

    // Si hay un plan activo, buscamos su nombre
    if (userSubscription.status === "active" && userSubscription.planId) {
      const currentPlan = plans.find((plan) => plan.id === userSubscription.planId);
      return currentPlan ? currentPlan.name : "Plan Básico";
    }

    return "Plan Básico";
  };
  
  // Obtener iniciales para el avatar
  const getUserInitials = () => {
    if (!currentUser || !currentUser.displayName) return "U";
    
    const nameParts = currentUser.displayName.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <aside className="hidden md:flex md:w-64 flex-col bg-card border-r border-border">
      {/* Sidebar Header con logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-center">
          <img 
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png" 
            alt="Owl Fence"
            className="h-12 w-auto object-contain"
          />
        </div>
      </div>

      {/* Botón de nuevo estimado o proyecto - Acción principal */}
      <div className="p-4">
        <Link href="/new-estimate">
          <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
            <i className="ri-add-line"></i>
            <span>Nuevo Estimado</span>
          </Button>
        </Link>
      </div>

      {/* Navegación de la aplicación */}
      <div className="flex-1 overflow-y-auto px-3">
        <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Herramientas</h2>
        <div className="space-y-1 mb-6">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start">
              <i className="ri-dashboard-line mr-2 text-lg"></i>
              Dashboard
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="ghost" className="w-full justify-start">
              <i className="ri-briefcase-4-line mr-2 text-lg"></i>
              Proyectos
            </Button>
          </Link>
          <Link href="/clients">
            <Button variant="ghost" className="w-full justify-start">
              <i className="ri-user-star-line mr-2 text-lg"></i>
              Clientes
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="ghost" className="w-full justify-start">
              <i className="ri-time-line mr-2 text-lg"></i>
              Historial
            </Button>
          </Link>
        </div>

        <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Funcionalidades</h2>
        <div className="space-y-1">
          <Link href="/property-verifier">
            <Button variant="ghost" className="w-full justify-start">
              <i className="ri-shield-keyhole-line mr-2 text-lg"></i>
              Verificación de Propiedad
            </Button>
          </Link>
          <Link href="/permit-advisor">
            <Button variant="ghost" className="w-full justify-start">
              <i className="ri-robot-2-line mr-2 text-lg"></i>
              Mervin DeepSearch
            </Button>
          </Link>
          <Link href="/ai-project-manager">
            <Button variant="ghost" className="w-full justify-start">
              <i className="ri-brain-line mr-2 text-lg"></i>
              Gestión Inteligente
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Ayuda en el Footer */}
      <div className="p-4 border-t border-border">
        <div className="rounded-md bg-primary/10 p-3 text-center">
          <p className="text-sm mb-2">¿Necesitas ayuda?</p>
          <Button size="sm" variant="outline" className="w-full">
            <i className="ri-question-line mr-2"></i>
            Soporte
          </Button>
        </div>
      </div>
    </aside>
  );
}