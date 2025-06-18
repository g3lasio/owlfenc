import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, CreditCard, Building, Settings, Brain as BrainIcon, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { navigationGroups, NavigationItem } from "@/config/navigation";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitch from "@/components/ui/language-switch";
import { motion, AnimatePresence } from "framer-motion";

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
  const [location] = useLocation();
  const [loading, setLoading] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { t } = useTranslation();

  // Función para expandir secuencialmente los menús
  const expandMenusSequentially = () => {
    // Expandir Tools después de 500ms
    setTimeout(() => {
      setIsToolsExpanded(true);
    }, 500);
    
    // Expandir Features después de 1000ms
    setTimeout(() => {
      setIsFeaturesExpanded(true);
    }, 1000);
    
    // Expandir Account después de 1500ms
    setTimeout(() => {
      setIsAccountExpanded(true);
    }, 1500);
  };

  // Función para contraer secuencialmente los menús
  const collapseMenusSequentially = () => {
    // Contraer Account primero
    setIsAccountExpanded(false);
    
    // Contraer Features después de 400ms
    setTimeout(() => {
      setIsFeaturesExpanded(false);
    }, 400);
    
    // Contraer Tools después de 800ms
    setTimeout(() => {
      setIsToolsExpanded(false);
    }, 800);
  };

  // Función para alternar el estado del sidebar
  const toggleSidebar = () => {
    if (isSidebarExpanded) {
      collapseMenusSequentially();
      setIsSidebarExpanded(false);
    } else {
      setIsSidebarExpanded(true);
      expandMenusSequentially();
    }
  };

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

  // Renderizar un elemento de navegación
  const renderNavItem = (item: NavigationItem) => {
    // Determinar qué tipo de icono renderizar
    const renderIcon = () => {
      if (item.icon.startsWith('lucide-')) {
        // Iconos de Lucide
        const iconName = item.icon.replace('lucide-', '');
        switch (iconName) {
          case 'user': return <User className="h-4 w-4 mr-2" />;
          case 'credit-card': return <CreditCard className="h-4 w-4 mr-2" />;
          case 'building': return <Building className="h-4 w-4 mr-2" />;
          case 'settings': return <Settings className="h-4 w-4 mr-2" />;
          case 'brain': return <BrainIcon className="h-4 w-4 mr-2" />;
          default: return <i className={`${item.icon} mr-2 text-lg`}></i>;
        }
      } else {
        // Iconos de Remix Icon
        return <i className={`${item.icon} mr-2 text-lg`}></i>;
      }
    };

    return (
      <Link key={item.id} href={item.path}>
        <Button variant="ghost" className="w-full justify-start">
          {renderIcon()}
          {t(item.label)}
        </Button>
      </Link>
    );
  };

  return (
    <aside className={`hidden md:flex flex-col bg-card h-screen overflow-hidden relative transition-all duration-300 ${isSidebarExpanded ? 'md:w-72 border-r border-border' : 'md:w-16'}`}>
      
      {/* Todo el contenido en un contenedor con scroll */}
      <div className="flex flex-col h-full overflow-y-auto">
        
        {/* Botón de toggle - Solo flecha */}
        <div className={`${isSidebarExpanded ? 'p-3 border-b border-border' : 'p-2'}`}>
          <Button
            variant="ghost"
            className="w-full justify-center p-2 hover:bg-accent/50 rounded-md transition-colors"
            onClick={toggleSidebar}
          >
            {isSidebarExpanded ? (
              <ChevronLeft className="h-5 w-5 text-muted-foreground hover:text-primary" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-primary" />
            )}
          </Button>
        </div>

        {/* Navegación principal */}
        {isSidebarExpanded ? (
          // Vista expandida - Diseño limpio y minimalista
          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            {navigationGroups.map((group, index) => (
              <div key={`group-${index}`} className="space-y-2">
                {/* Título simple de la sección */}
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {t(`navigation.${group.title}`)}
                </h3>
                
                {/* Lista limpia de elementos */}
                <div className="space-y-1">
                  {group.items
                    .filter(item => item.path !== "/mervin" && item.id !== "mervin")
                    .map((item) => (
                      <Link key={item.id} href={item.path}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start px-2 py-2 h-auto hover:bg-accent text-sm font-normal"
                        >
                          {item.icon.startsWith('lucide-') ? (
                            <>
                              {item.icon === 'lucide-user' && <User className="h-4 w-4 mr-3" />}
                              {item.icon === 'lucide-credit-card' && <CreditCard className="h-4 w-4 mr-3" />}
                              {item.icon === 'lucide-building' && <Building className="h-4 w-4 mr-3" />}
                              {item.icon === 'lucide-settings' && <Settings className="h-4 w-4 mr-3" />}
                              {item.icon === 'lucide-brain' && <BrainIcon className="h-4 w-4 mr-3" />}
                            </>
                          ) : (
                            <i className={`${item.icon} mr-3 text-base`}></i>
                          )}
                          {t(item.label)}
                        </Button>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Vista colapsada - Solo íconos verticales
          <div className="flex flex-col flex-1 p-2 space-y-1 overflow-y-auto">
            {navigationGroups.flatMap(group => group.items)
              .filter(item => item.path !== "/mervin" && item.id !== "mervin")
              .map((item: NavigationItem) => (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`
                    flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 mx-auto
                    hover:bg-accent/50 hover:scale-105
                    ${location === item.path 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'text-muted-foreground hover:text-primary'
                    }
                  `}
                  title={t(item.label)}
                >
                  {item.icon.startsWith('lucide-') ? (
                    <>
                      {item.icon === 'lucide-building' && <Building className="h-5 w-5" />}
                      {item.icon === 'lucide-settings' && <Settings className="h-5 w-5" />}
                      {item.icon === 'lucide-credit-card' && <CreditCard className="h-5 w-5" />}
                      {item.icon === 'lucide-brain' && <BrainIcon className="h-5 w-5" />}
                    </>
                  ) : (
                    <i className={`${item.icon} text-lg`} />
                  )}
                </Link>
              ))}
          </div>
        )}

        {/* Footer simplificado - Solo se muestra cuando está expandido */}
        {isSidebarExpanded && (
          <div className="p-3 border-t border-border mt-auto space-y-2">
            {/* Botón de cerrar sesión */}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive text-sm font-normal"
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? (
                <i className="ri-loader-2-line animate-spin mr-2"></i>
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              {t('general.logout')}
            </Button>
            
            {/* Switch de idioma */}
            <div className="flex justify-center">
              <LanguageSwitch />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}