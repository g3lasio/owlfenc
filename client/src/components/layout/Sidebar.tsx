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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowRightToLine,
  ArrowLeftToLine,
  ChevronsRight,
  ChevronsLeft,
  Menu,
  X,
} from "lucide-react";
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

interface SidebarProps {
  onWidthChange?: (width: number) => void;
}

export default function Sidebar({ onWidthChange }: SidebarProps) {
  const [location] = useLocation();
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSidebarExpanded, setSidebarExpanded] = useState(false);

  const { t } = useTranslation();
  const { language } = useLanguage();

  // Query para obtener suscripción del usuario
  const { data: subscription, isLoading: subscriptionLoading } =
    useQuery<UserSubscription>({
      queryKey: ["/api/user/subscription"],
      enabled: !!currentUser,
    });

  // Query para obtener planes disponibles
  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
    enabled: !!currentUser,
  });

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      toast({
        title: t("general.success"),
        description: t("auth.logoutSuccess"),
      });
    } catch (error) {
      toast({
        title: t("general.error"),
        description: t("auth.logoutError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };



  // Función para cerrar el sidebar automáticamente al hacer clic en elementos del menú
  const handleMenuItemClick = () => {
    if (isSidebarExpanded) {
      setSidebarExpanded(false);
    }
  };

  // Comunicar cambios de ancho al componente padre
  useEffect(() => {
    const width = isSidebarExpanded ? 288 : 64;
    onWidthChange?.(width);
  }, [isSidebarExpanded, onWidthChange]);

  return (
    <>
      <TooltipProvider>
        <aside
          className={`
            flex flex-col bg-card transition-all duration-300
            ${isSidebarExpanded ? "w-72 border-r border-border" : "w-16"}
            translate-x-0
            fixed left-0 top-0 z-40
          `}
          style={{
            overflowY: "hidden",
            overflowX: "hidden",
            height: "calc(100vh - 64px)", // Dejar espacio para el footer
            boxShadow: "2px 0 8px rgba(0, 0, 0, 0.1)"
          }}
        >
          {/* Header con toggle */}
          <div
            className={`flex-shrink-0 ${isSidebarExpanded ? "p-3 border-b border-border" : "p-2"}`}
          >
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 transition-all duration-500 group relative overflow-hidden"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {/* Efecto de brillo futurista */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "radial-gradient(circle at center, rgba(0,255,255,0.15) 0%, transparent 70%)",
                }}
              />
              
              {/* Flecha futurista */}
              <div
                className="relative transition-all duration-500 ease-in-out"
                style={{
                  transform: isSidebarExpanded
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="group-hover:scale-110 transition-transform duration-300"
                >
                  {/* Flecha principal con diseño futurista */}
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                    style={{
                      stroke: "url(#arrowGradient)",
                      filter: "drop-shadow(0 0 6px rgba(0,255,255,0.6))",
                    }}
                  />
                  
                  {/* Segunda flecha para efecto de profundidad */}
                  <path
                    d="M5 6L11 12L5 18"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-40 transition-all duration-300 group-hover:opacity-60"
                    style={{
                      stroke: "url(#arrowGradientSecondary)",
                    }}
                  />
                  
                  {/* Gradientes futuristas */}
                  <defs>
                    <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00ffff" />
                      <stop offset="50%" stopColor="#00ccff" />
                      <stop offset="100%" stopColor="#0099ff" />
                    </linearGradient>
                    <linearGradient id="arrowGradientSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00ffff" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#0099ff" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* Efecto de pulso */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  animation: "pulse 2s ease-in-out infinite",
                }}
              >
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-30"
                  style={{
                    background: "radial-gradient(circle, rgba(0,255,255,0.4) 0%, transparent 70%)",
                    animation: "pulseRing 1.5s ease-out infinite",
                  }}
                />
              </div>
            </button>
          </div>

          {/* Área de navegación con scroll interno */}
          <div
            className="flex-1 overflow-hidden"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - var(--sidebar-toggle-height) - var(--sidebar-footer-height))"
            }}
          >
            {isSidebarExpanded ? (
              // Vista expandida con scroll
              <div
                className="custom-scroll flex-1 px-3 py-3"
                style={{
                  overflowY: "auto",
                  overflowX: "hidden"
                }}
              >
                {navigationGroups.map((group, index) => (
                  <div key={`group-${index}`} style={{ marginBottom: "16px" }}>
                    <h3
                      className="text-xs font-semibold uppercase tracking-wider px-2 mb-2 text-center"
                      style={{ color: "#00ffff" }}
                    >
                      {t(`navigation.${group.title}`)}
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {group.items
                        .filter(
                          (item) =>
                            item.path !== "/mervin" && item.id !== "mervin",
                        )
                        .map((item) => (
                          <Link key={item.id} href={item.path}>
                            <Button
                              variant="ghost"
                              className={`w-full justify-start px-2 py-1.5 h-auto hover:bg-accent text-sm font-normal ${
                                location === item.path
                                  ? "bg-primary/20 text-primary"
                                  : ""
                              }`}
                              onClick={handleMenuItemClick}
                            >
                              {item.icon.startsWith("lucide-") ? (
                                <>
                                  {item.icon === "lucide-user" && (
                                    <User className="h-4 w-4 mr-3" />
                                  )}
                                  {item.icon === "lucide-credit-card" && (
                                    <CreditCard className="h-4 w-4 mr-3" />
                                  )}
                                  {item.icon === "lucide-building" && (
                                    <Building className="h-4 w-4 mr-3" />
                                  )}
                                  {item.icon === "lucide-settings" && (
                                    <Settings className="h-4 w-4 mr-3" />
                                  )}
                                  {item.icon === "lucide-brain" && (
                                    <BrainIcon className="h-4 w-4 mr-3" />
                                  )}
                                </>
                              ) : (
                                <i
                                  className={`${item.icon} mr-3 text-base`}
                                ></i>
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
              // Vista colapsada con scroll y espaciado profesional
              <div
                className="custom-scroll flex-1 px-2 py-3"
                style={{
                  overflowY: "auto",
                  overflowX: "hidden"
                }}
              >
                {/* Agrupar iconos por sección con separadores visuales */}
                {navigationGroups.map((group, groupIndex) => (
                  <div
                    key={`group-${groupIndex}`}
                    style={{ marginBottom: "16px" }}
                  >
                    {/* Separador visual sutil entre grupos */}
                    {groupIndex > 0 && (
                      <div
                        style={{
                          height: "1px",
                          background: "rgba(255,255,255,0.08)",
                          margin: "12px 6px",
                          borderRadius: "1px",
                        }}
                      ></div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px", // Espaciado reducido entre iconos
                      }}
                    >
                      {group.items
                        .filter(
                          (item) =>
                            item.path !== "/mervin" && item.id !== "mervin",
                        )
                        .map((item: NavigationItem) => (
                          <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.path}
                                className={`
                                  flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 mx-auto
                                  hover:bg-accent/50 hover:scale-105 hover:shadow-md
                                  ${
                                    location === item.path
                                      ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                                      : "text-muted-foreground hover:text-primary"
                                  }
                                `}
                                style={{
                                  minHeight: "40px",
                                  minWidth: "40px",
                                }}
                                onClick={handleMenuItemClick}
                              >
                                {item.icon.startsWith("lucide-") ? (
                                  <>
                                    {item.icon === "lucide-building" && (
                                      <Building className="h-4 w-4" />
                                    )}
                                    {item.icon === "lucide-settings" && (
                                      <Settings className="h-4 w-4" />
                                    )}
                                    {item.icon === "lucide-credit-card" && (
                                      <CreditCard className="h-4 w-4" />
                                    )}
                                    {item.icon === "lucide-brain" && (
                                      <BrainIcon className="h-4 w-4" />
                                    )}
                                  </>
                                ) : (
                                  <i className={`${item.icon} text-base`} />
                                )}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-background border border-border text-foreground shadow-xl"
                            >
                              <p className="font-medium">{t(item.label)}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer fijo */}
          {isSidebarExpanded && (
            <div
              className="flex-shrink-0 p-2 border-t border-border bg-card"
              style={{ 
                height: 'var(--sidebar-footer-height)',
                minHeight: 'var(--sidebar-footer-height)'
              }}
            >
              <div className="flex items-center justify-between space-x-2">
                <Button
                  variant="ghost"
                  className="flex-1 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-normal h-8"
                  onClick={handleLogout}
                  disabled={loading}
                >
                  {loading ? (
                    <i className="ri-loader-2-line animate-spin mr-2"></i>
                  ) : (
                    <LogOut className="h-3 w-3 mr-2" />
                  )}
                  {t("general.logout")}
                </Button>

                <div className="flex-shrink-0">
                  <LanguageSwitch />
                </div>
              </div>
            </div>
          )}
        </aside>
      </TooltipProvider>
    </>
  );
}
