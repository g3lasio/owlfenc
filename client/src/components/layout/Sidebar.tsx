import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, CreditCard, Building, Settings } from "lucide-react";
import { navigationGroups, NavigationItem } from "@/config/navigation";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitch from "@/components/ui/language-switch";

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
          {item.label}
        </Button>
      </Link>
    );
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
                  {t('general.viewPlan')}: {getCurrentPlanName()}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Navegación principal - Generada dinámicamente desde la configuración */}
        <div className="flex-1 px-3">
          {navigationGroups.map((group, index) => (
            <div key={`group-${index}`}>
              <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">
                {t(`navigation.${group.title.toLowerCase()}`)}
              </h2>
              <div className="space-y-1 mb-6">
                {group.items.map(renderNavItem)}
              </div>
              {index < navigationGroups.length - 1 && index === 1 && <Separator className="my-2" />}
            </div>
          ))}
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
          
          {/* Language Switch */}
          <div className="mb-3 flex justify-center">
            <LanguageSwitch />
          </div>

          <Button 
            variant="ghost" 
            className="flex items-center w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
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
        </div>
      </div>
    </aside>
  );
}