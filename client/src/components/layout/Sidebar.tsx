import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LogOut,
  User,
  CreditCard,
  Building,
  Settings,
  Brain as BrainIcon,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
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

interface SidebarProps {
  onWidthChange?: (width: number) => void;
}

export default function Sidebar({ onWidthChange }: SidebarProps) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { setLanguage } = useLanguage();
  
  // Estado del sidebar: expandido/colapsado
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    return window.innerWidth >= 1024; // Expandido por defecto en desktop
  });

  // Función para manejar el toggle del sidebar
  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  // Auto-colapso en móvil y auto-cerrar al hacer clic en elementos del menú
  const handleMenuItemClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarExpanded(false);
    }
  };

  // Notificar cambios de ancho al padre
  useEffect(() => {
    const newWidth = isSidebarExpanded ? 288 : 64;
    onWidthChange?.(newWidth);
  }, [isSidebarExpanded, onWidthChange]);

  // Responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && isSidebarExpanded) {
        setIsSidebarExpanded(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarExpanded]);

  // Queries para suscripción y planes
  const { data: userSubscription } = useQuery<UserSubscription>({
    queryKey: ["user", "subscription"],
    enabled: !!user,
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["subscription", "plans"],
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: t("sidebar.signedOut"),
        description: t("sidebar.signedOutSuccess"),
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: t("sidebar.signOutError"),
        description: t("sidebar.signOutErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const currentPlan = plans?.find((plan) => plan.id === userSubscription?.planId);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div
          className={`bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out relative`}
          style={{
            width: isSidebarExpanded ? "288px" : "64px",
            height: "calc(100vh - 64px)",
            boxShadow: "2px 0 8px rgba(0, 0, 0, 0.1)"
          }}
        >
          {/* Header con toggle - FLECHA CYAN BRILLANTE */}
          <div className={`flex-shrink-0 ${isSidebarExpanded ? "p-3" : "p-2"}`}>
            <button
              onClick={toggleSidebar}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white p-3 rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ArrowRight
                size={24}
                className={`transition-transform duration-300 ${isSidebarExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Contenido del sidebar */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {/* Información del usuario */}
            {user && (
              <div className={`${isSidebarExpanded ? "mb-4" : "mb-2"}`}>
                {isSidebarExpanded ? (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || ""} />
                        <AvatarFallback>
                          {user.displayName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.displayName || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {currentPlan?.name || t("sidebar.freePlan")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex justify-center">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || ""} />
                          <AvatarFallback className="text-xs">
                            {user.displayName?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{user.displayName || user.email}</p>
                      <p className="text-xs opacity-70">
                        {currentPlan?.name || t("sidebar.freePlan")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Navegación */}
            <nav className="space-y-1">
              {navigationGroups.map((group, groupIndex) => (
                <div key={group.title} className="space-y-1">
                  {isSidebarExpanded && (
                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t(`navigation.groups.${group.title}`)}
                    </h3>
                  )}
                  
                  {group.items
                    .filter((item: NavigationItem) => !item.requiresAuth || user)
                    .map((item: NavigationItem) => {
                      const isActive = location === item.href;
                      const Icon = item.icon;

                      if (isSidebarExpanded) {
                        return (
                          <Link key={item.href} href={item.href}>
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              className={`w-full justify-start ${
                                isActive ? "bg-secondary" : ""
                              }`}
                              onClick={handleMenuItemClick}
                            >
                              <Icon size={16} className="mr-2" />
                              {t(`navigation.${item.label}`)}
                            </Button>
                          </Link>
                        );
                      } else {
                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                              <Link href={item.href}>
                                <Button
                                  variant={isActive ? "secondary" : "ghost"}
                                  size="icon"
                                  className={`w-full ${
                                    isActive ? "bg-secondary" : ""
                                  }`}
                                  onClick={handleMenuItemClick}
                                >
                                  <Icon size={16} />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{t(`navigation.${item.label}`)}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                    })}
                  
                  {groupIndex < navigationGroups.length - 1 && (
                    <Separator className="my-2 opacity-50" />
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Footer con acciones del usuario */}
          <div className="flex-shrink-0 p-2 border-t border-border">
            <div className="space-y-2">
              {/* Switch de idioma */}
              {isSidebarExpanded ? (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs text-muted-foreground">
                    {t("sidebar.language")}
                  </span>
                  <LanguageSwitch />
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-center">
                      <LanguageSwitch />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{t("sidebar.language")}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Botón de cerrar sesión */}
              {user && (
                <>
                  {isSidebarExpanded ? (
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                    >
                      <LogOut size={16} className="mr-2" />
                      {t("sidebar.signOut")}
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSignOut}
                          className="w-full text-muted-foreground hover:text-foreground"
                        >
                          <LogOut size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{t("sidebar.signOut")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}