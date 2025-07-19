import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSidebar } from "@/contexts/SidebarContext";
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

// Componente del ícono hexagonal futurista para el sidebar
const HexagonalMenuIcon = ({ onClick }: { onClick?: () => void }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [scanlinePosition, setScanlinePosition] = useState(0);

  // Animación de escaneo continuo
  useEffect(() => {
    const scanInterval = setInterval(() => {
      setScanlinePosition(prev => (prev >= 100 ? 0 : prev + 2));
    }, 50);

    return () => clearInterval(scanInterval);
  }, []);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="hexagonal-menu-icon relative group p-2 rounded-lg transition-all duration-300 hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50"
      aria-label="Toggle sidebar"
      style={{
        transform: isClicked ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.2s ease-out'
      }}
    >
      <div className="relative w-8 h-8">
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full"
          style={{
            transform: isHovering ? 'rotateY(15deg) rotateX(5deg)' : 'rotateY(0deg) rotateX(0deg)',
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Definiciones de filtros y gradientes */}
          <defs>
            {/* Gradiente principal con efecto neón */}
            <linearGradient id="hexGradientSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0080ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4040ff" stopOpacity="0.7" />
            </linearGradient>

            {/* Gradiente para el glow */}
            <radialGradient id="glowGradientSidebar">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#0080ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Filtro de glow */}
            <filter id="glowSidebar" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Filtro para el efecto de escaneo */}
            <mask id="scanMaskSidebar">
              <rect width="100%" height="100%" fill="black"/>
              <rect 
                x="0" 
                y={`${scanlinePosition}%`}
                width="100%" 
                height="2" 
                fill="white"
                opacity="0.8"
              />
            </mask>
          </defs>

          {/* Hexágonos base con glow de fondo */}
          <g opacity={isHovering ? "1" : "0.7"}>
            {/* Hexágono superior */}
            <polygon
              points="20,4 26,8 26,16 20,20 14,16 14,8"
              fill="url(#glowGradientSidebar)"
              transform="scale(1.2)"
              opacity="0.3"
            />
            {/* Hexágono inferior izquierdo */}
            <polygon
              points="12,20 18,24 18,32 12,36 6,32 6,24"
              fill="url(#glowGradientSidebar)"
              transform="scale(1.2)"
              opacity="0.3"
            />
            {/* Hexágono inferior derecho */}
            <polygon
              points="28,20 34,24 34,32 28,36 22,32 22,24"
              fill="url(#glowGradientSidebar)"
              transform="scale(1.2)"
              opacity="0.3"
            />
          </g>

          {/* Líneas de conexión */}
          <g stroke="url(#hexGradientSidebar)" strokeWidth="1" fill="none" filter="url(#glowSidebar)">
            {/* Conexión superior a inferior izquierdo */}
            <line x1="17" y1="18" x2="15" y2="22" opacity={isHovering ? "1" : "0.6"} />
            {/* Conexión superior a inferior derecho */}
            <line x1="23" y1="18" x2="25" y2="22" opacity={isHovering ? "1" : "0.6"} />
            {/* Conexión entre hexágonos inferiores */}
            <line x1="18" y1="28" x2="22" y2="28" opacity={isHovering ? "1" : "0.6"} />
          </g>

          {/* Hexágonos principales */}
          <g fill="none" stroke="url(#hexGradientSidebar)" strokeWidth="1.5" filter="url(#glowSidebar)">
            {/* Hexágono superior */}
            <polygon
              points="20,6 25,10 25,18 20,22 15,18 15,10"
              className={`transition-all duration-500 ${isHovering ? 'animate-pulse' : ''}`}
              style={{
                strokeOpacity: isHovering ? 1 : 0.8,
                filter: isHovering ? 'drop-shadow(0 0 8px #00ffff)' : 'drop-shadow(0 0 4px #0080ff)'
              }}
            />
            
            {/* Hexágono inferior izquierdo */}
            <polygon
              points="12,22 17,26 17,34 12,38 7,34 7,26"
              className={`transition-all duration-500 ${isHovering ? 'animate-pulse' : ''}`}
              style={{
                strokeOpacity: isHovering ? 1 : 0.8,
                filter: isHovering ? 'drop-shadow(0 0 8px #00ffff)' : 'drop-shadow(0 0 4px #0080ff)',
                animationDelay: '0.1s'
              }}
            />
            
            {/* Hexágono inferior derecho */}
            <polygon
              points="28,22 33,26 33,34 28,38 23,34 23,26"
              className={`transition-all duration-500 ${isHovering ? 'animate-pulse' : ''}`}
              style={{
                strokeOpacity: isHovering ? 1 : 0.8,
                filter: isHovering ? 'drop-shadow(0 0 8px #00ffff)' : 'drop-shadow(0 0 4px #0080ff)',
                animationDelay: '0.2s'
              }}
            />
          </g>

          {/* Efecto de escaneo */}
          <g mask="url(#scanMaskSidebar)">
            <rect 
              width="100%" 
              height="100%" 
              fill="url(#hexGradientSidebar)" 
              opacity="0.4"
            />
          </g>

          {/* Puntos centrales con pulso */}
          <g fill="url(#hexGradientSidebar)">
            <circle cx="20" cy="14" r="1" opacity={isHovering ? "1" : "0.6"}>
              <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="12" cy="30" r="1" opacity={isHovering ? "1" : "0.6"}>
              <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle cx="28" cy="30" r="1" opacity={isHovering ? "1" : "0.6"}>
              <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite" begin="0.6s" />
            </circle>
          </g>
        </svg>

        {/* Efecto de vibración al hacer clic */}
        {isClicked && (
          <div 
            className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping"
            style={{ animationDuration: '0.3s' }}
          />
        )}
      </div>
    </button>
  );
};

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
  const [isMobile, setIsMobile] = useState(false);
  const { 
    isSidebarExpanded, 
    isMobileMenuOpen, 
    toggleSidebar, 
    toggleMobileMenu,
    setSidebarExpanded,
    setMobileMenuOpen 
  } = useSidebar();
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Track device type
  const [isPhone, setIsPhone] = useState(false);
  const [isTabletOrDesktop, setIsTabletOrDesktop] = useState(false);

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      setIsPhone(width < 640); // sm breakpoint - phones only
      setIsTabletOrDesktop(width >= 640); // tablets and desktop
      setIsMobile(width < 640); // keep existing logic for compatibility
    };
    
    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

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



  // Función para cerrar el sidebar automáticamente al hacer clic en elementos del menú
  const handleMenuItemClick = () => {
    if (isPhone) {
      // Phone: close sidebar after selection
      setSidebarExpanded(false);
      setMobileMenuOpen(false);
    } else if (isTabletOrDesktop && isSidebarExpanded) {
      // Tablet/Desktop: close expanded sidebar after selection, return to icons-only
      setSidebarExpanded(false);
    }
    // On tablets/desktop with icons-only view, do nothing
  };

  // Comunicar cambios de ancho al componente padre
  useEffect(() => {
    let width;
    if (isPhone) {
      // Phone: 0 width when hidden, full width when expanded
      width = isSidebarExpanded ? 288 : 0;
    } else if (isTabletOrDesktop) {
      // Tablet/Desktop: icons-only width (64px) by default, full width when expanded
      width = isSidebarExpanded ? 288 : 64;
    } else {
      width = 64; // fallback
    }
    onWidthChange?.(width);
  }, [isSidebarExpanded, isPhone, isTabletOrDesktop, onWidthChange]);

  return (
    <>
      {/* ÍCONO HEXAGONAL SIEMPRE VISIBLE - ABSOLUTA PRIORIDAD */}
      <div 
        className="fixed top-0 left-0 flex items-center justify-center bg-transparent pointer-events-auto"
        style={{
          height: '80px',
          width: '64px',
          minHeight: '80px',
          zIndex: 9999,  // Máximo z-index para que NUNCA se oculte
          display: 'flex',  // Forzar visibilidad
          visibility: 'visible',  // Forzar visibilidad
          opacity: 1  // Forzar opacidad
        }}
      >
        <HexagonalMenuIcon onClick={toggleSidebar} />
      </div>

      {/* Mobile Backdrop - Solo se muestra cuando el sidebar está expandido en móvil */}
      {isSidebarExpanded && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300"
          onClick={() => setSidebarExpanded(false)}
        />
      )}

      <TooltipProvider>
        <aside
          className={`
            flex flex-col transition-all duration-300 border-r border-border bg-card
            ${isPhone 
              ? (isSidebarExpanded ? "w-72 block fixed left-0 top-0 z-40" : "hidden")  // Phone: hidden by default, fixed when expanded
              : isTabletOrDesktop 
                ? (isSidebarExpanded ? "w-72 relative" : "w-16 relative")  // Tablet/Desktop: relative position, not fixed
                : "w-16 relative"  // fallback
            }
          `}
          style={{
            height: "100vh",
            paddingTop: isPhone ? "80px" : "0px", // Solo phones necesitan padding para el ícono hexagonal
            maxHeight: "100vh",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* Separador visual para distinguir el control del sidebar */}
          <div className="flex-shrink-0 px-3 pb-2">
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
          </div>

          {/* Área de navegación con scroll interno */}
          <div
            className="flex-1 flex"
            style={{
              minHeight: 0,
              overflow: "hidden",
              flexDirection: "column",
            }}
          >
            {/* CONTENIDO CONDICIONAL SEGÚN DISPOSITIVO Y ESTADO */}
            {isPhone || (isTabletOrDesktop && isSidebarExpanded) ? (
              // VISTA EXPANDIDA - Phone siempre o Tablet/Desktop cuando expandido
              <div
                className="custom-scroll"
                style={{
                  height: "100%",
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingTop: "12px",
                  paddingLeft: "12px",
                  paddingRight: "12px",
                  paddingBottom: "80px", // Espacio para el footer
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
              // VISTA SOLO ICONOS - Tablet/Desktop cuando no expandido
              <div
                className="custom-scroll"
                style={{
                  height: "calc(100vh - 120px)", // Ajustado para tablets/desktop sin padding superior
                  maxHeight: "calc(100vh - 120px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingTop: "12px",
                  paddingLeft: "8px",
                  paddingRight: "8px",
                  paddingBottom: "20px",
                }}
              >
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
                        gap: "8px",
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
                                    {item.icon === "lucide-user" && (
                                      <User className="h-4 w-4" />
                                    )}
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

          {/* Footer fijo - adaptivo según el ancho */}
          <div
            className="absolute bottom-0 left-0 right-0 border-t border-border bg-card"
            style={{ zIndex: 50 }}
          >
            {isPhone || (isTabletOrDesktop && isSidebarExpanded) ? (
              // Footer expandido - Phone siempre o Tablet/Desktop cuando expandido
              <div className="p-2">
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
            ) : (
              // Footer solo iconos - Tablet/Desktop cuando no expandido
              <div className="p-1 flex flex-col items-center space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-10 h-10 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleLogout}
                      disabled={loading}
                    >
                      {loading ? (
                        <i className="ri-loader-2-line animate-spin"></i>
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{t("general.logout")}</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="scale-75">
                  <LanguageSwitch />
                </div>
              </div>
            )}
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
}
