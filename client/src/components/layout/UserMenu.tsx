import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User, CreditCard, Building, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserMenu() {
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Definimos interfaces para los tipos de datos
  interface UserSubscription {
    status: string;
    planId: number;
  }
  
  interface Plan {
    id: number;
    name: string;
  }

  // Obtenemos la información de la suscripción actual del usuario
  const { data: userSubscription } = useQuery<UserSubscription>({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  // Obtenemos los planes disponibles
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
    throwOnError: false,
  });

  // Función para obtener el nombre del plan actual
  const getCurrentPlanName = () => {
    if (!userSubscription || !plans || !Array.isArray(plans)) return "Plan Básico";
    
    // Si hay un plan activo, buscamos su nombre
    if (userSubscription.status === "active" && userSubscription.planId) {
      const currentPlan = plans.find(plan => plan.id === userSubscription.planId);
      return currentPlan ? currentPlan.name : "Plan Básico";
    }
    
    return "Plan Básico";
  };

  // Manejar cierre de sesión
  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
      // Forzar la redirección y limpiar el estado
      window.location.href = "/login";
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

  // Si no hay usuario autenticado, no mostrar el menú
  if (!currentUser) {
    return null;
  }

  // Obtener iniciales para el avatar
  const getUserInitials = () => {
    if (!currentUser.displayName) return "U";
    
    const nameParts = currentUser.displayName.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <aside className="hidden md:flex md:w-72 flex-col bg-card border-l border-border">
      {/* User Menu Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center">
            <Avatar>
              <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || "Usuario"} />
              <AvatarFallback className="bg-primary/20 text-primary">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <div className="text-sm font-medium">{currentUser.displayName || "Usuario"}</div>
              <div className="text-xs text-muted-foreground">{currentUser.email}</div>
            </div>
          </div>
          
          {/* Plan de suscripción en un banner destacado */}
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-gradient-to-r from-emerald-500 to-lime-600 py-1.5 px-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-medium">Plan Actual</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="bg-card p-2">
              <div className="text-sm font-semibold">{getCurrentPlanName()}</div>
              <div className="mt-2 flex justify-end">
                <Link href="/subscription">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Actualizar Plan
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sección Mi Perfil */}
      <div className="px-3 pt-4">
        <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Mi Perfil</h2>
        <div className="space-y-1.5">
          <Link href="/settings/account">
            <Button variant="ghost" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              Perfil Personal
            </Button>
          </Link>
          <Link href="/subscription">
            <Button variant="ghost" className="w-full justify-start">
              <CreditCard className="h-4 w-4 mr-2" />
              Mi Suscripción
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Sección Empresa */}
      <div className="px-3 pt-4">
        <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Empresa</h2>
        <div className="space-y-1.5">
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
        </div>
      </div>
      
      {/* Sección Configuración */}
      <div className="px-3 pt-4">
        <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Configuración</h2>
        <div className="space-y-1.5">
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Preferencias
            </Button>
          </Link>
        </div>
      </div>
      
      {/* User Menu Footer */}
      <div className="mt-auto p-4 border-t border-border">
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
    </aside>
  );
}