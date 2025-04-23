import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, CreditCard, Building, Users, Settings } from "lucide-react";

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
    <aside className="hidden md:flex md:w-72 flex-col bg-card border-r border-border h-screen overflow-hidden">
      {/* Todo el contenido en un contenedor con scroll */}
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Sidebar Header con logo y perfil */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png" 
              alt="Owl Fence"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Información del usuario */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center">
              <Avatar>
                <AvatarImage src={currentUser?.photoURL || undefined} alt={currentUser?.displayName || "Usuario"} />
                <AvatarFallback className="bg-primary/20 text-primary">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="text-sm font-medium">{currentUser?.displayName || "Usuario"}</div>
                <div className="text-xs text-muted-foreground">{currentUser?.email}</div>
              </div>
            </div>

            {/* Botón de actualizar plan */}
            <div className="mt-1">
              <Link href="/subscription">
                <Button size="sm" variant="outline" className="w-full">
                  <i className="ri-vip-crown-line mr-2"></i>
                  Ver plan: {getCurrentPlanName()}
                </Button>
              </Link>
            </div>
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

        {/* Navegación principal */}
        <div className="flex-1 px-3">
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
          <div className="space-y-1 mb-6">
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

          <Separator className="my-2" />

          {/* Configuración */}
          <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Mi Perfil</h2>
          <div className="space-y-1 mb-6">
            <Link href="/account">
              <Button variant="ghost" className="w-full justify-start">
                <User className="h-4 w-4 mr-2" />
                Perfil Personal
              </Button>
            </Link>
            <Link href="/billing">
              <Button variant="ghost" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Facturación
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="ghost" className="w-full justify-start">
                <i className="ri-vip-crown-line mr-2"></i>
                Mi Suscripción
              </Button>
            </Link>
          </div>

          <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Empresa</h2>
          <div className="space-y-1 mb-6">
            <Link href="/profile">
              <Button variant="ghost" className="w-full justify-start">
                <Building className="h-4 w-4 mr-2" />
                Perfil de Empresa
              </Button>
            </Link>
            <Link href="/settings/employees">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Empleados
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Preferencias
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer con soporte y cerrar sesión */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="rounded-md bg-primary/10 p-1.5 text-center mb-3" style={{ height: "auto", minHeight: "70px" }}>
            <p className="text-xs mb-1">¿Necesitas ayuda?</p>
            <a 
              href="mailto:mervin@owlfenc.com?subject=Soporte%20Owl%20Fence"
              className="inline-flex items-center justify-center py-1 px-2 w-full bg-card text-sm border border-border rounded-md hover:bg-accent"
            >
              <i className="ri-question-line mr-1"></i>
              Soporte
            </a>
          </div>

          <Button 
            variant="ghost" 
            className="flex items-center w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <i className="ri-loader-2-line animate-spin mr-2"></i>
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </aside>
  );
}