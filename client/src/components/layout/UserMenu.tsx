import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navigation from "./Navigation";
import { Button } from "@/components/ui/button";

export default function UserMenu() {
  // Obtenemos la información de la suscripción actual del usuario
  const { data: userSubscription, isLoading: isLoadingUserSubscription } = useQuery({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  // Obtenemos los planes disponibles
  const { data: plans } = useQuery({
    queryKey: ["/api/subscription/plans"],
    throwOnError: false,
  });

  // Función para obtener el nombre del plan actual
  const getCurrentPlanName = () => {
    if (!userSubscription || !plans) return "Plan Básico";
    
    // Si hay un plan activo, buscamos su nombre
    if (userSubscription.status === "active" && userSubscription.planId) {
      const currentPlan = plans.find(plan => plan.id === userSubscription.planId);
      return currentPlan ? currentPlan.name : "Plan Básico";
    }
    
    return "Plan Básico";
  };

  return (
    <aside className="hidden md:flex md:w-72 flex-col bg-card border-l border-border">
      {/* User Menu Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <span className="font-medium text-sm">JC</span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium">John Contractor</div>
              <div className="text-xs text-muted-foreground">Fence Installation Specialist</div>
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
      
      {/* Navegación usando el componente unificado con tipo "user" */}
      <Navigation variant="sidebar" type="user" />
      
      {/* User Menu Footer */}
      <div className="p-4 border-t border-border">
        <button className="flex items-center w-full p-2 rounded-md hover:bg-destructive/10 hover:text-destructive">
          <i className="ri-logout-box-r-line text-lg mr-3"></i>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}