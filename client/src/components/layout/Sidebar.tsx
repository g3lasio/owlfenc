import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, CreditCard, Building, Settings, Brain as BrainIcon, ChevronDown, ChevronRight } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(true);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const { t } = useTranslation();

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
    <aside className="hidden md:flex md:w-72 flex-col bg-card border-r border-border h-screen overflow-hidden">
      {/* Todo el contenido en un contenedor con scroll */}
      <div className="flex flex-col h-full overflow-y-auto">


        {/* Navegación principal - Generada dinámicamente desde la configuración */}
        <div className="flex-1 px-3 pt-4">
          {navigationGroups.map((group, index) => {
            const isExpanded = group.title === "tools" ? isToolsExpanded :
                             group.title === "features" ? isFeaturesExpanded :
                             group.title === "account" ? isAccountExpanded : true;
            
            const setExpanded = group.title === "tools" ? setIsToolsExpanded :
                              group.title === "features" ? setIsFeaturesExpanded :
                              group.title === "account" ? setIsAccountExpanded : () => {};

            return (
              <div key={`group-${index}`}>
                {/* Accordion para todas las secciones */}
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-xs font-semibold px-2 py-2 text-muted-foreground uppercase tracking-wider hover:bg-accent"
                    onClick={() => setExpanded(!isExpanded)}
                  >
                    {t(`navigation.${group.title}`)}
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-1 mt-2 ml-2 overflow-hidden"
                      >
                        {/* Filtrar el elemento de Mervin AI si existe */}
                        {group.items
                          .filter(item => item.path !== "/mervin" && item.id !== "mervin")
                          .map(renderNavItem)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {index < navigationGroups.length - 1 && index === 1 && <Separator className="my-2" />}
              </div>
            );
          })}
        </div>

        {/* Footer con soporte y cerrar sesión */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="rounded-md bg-primary/10 p-1.5 text-center mb-3" style={{ height: "auto", minHeight: "70px" }}>
            <p className="text-xs mb-1">{t('general.needHelp')}</p>
            <a 
              href="mailto:mervin@owlfenc.com"
              className="inline-flex items-center justify-center py-1 px-2 w-full bg-card text-sm border border-border rounded-md hover:bg-accent"
            >
              <i className="ri-mail-line mr-1"></i>
              {t('general.support')}
            </a>
          </div>
          
          {/* Contenedor para botón de cerrar sesión y switch de idioma */}
          <div className="flex items-center justify-between space-x-2 mb-3">
            {/* Botón de cerrar sesión */}
            <Button 
              variant="ghost" 
              className="flex-1 flex items-center justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            
            {/* Switch de idioma simplificado con destello */}
            <div className="flex-shrink-0 relative transform hover:scale-105 transition-transform">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full opacity-70"></div>
              <LanguageSwitch />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}