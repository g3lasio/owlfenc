import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LogOut, User, CreditCard, Building, Settings, Brain as BrainIcon, ChevronDown, ChevronRight, ChevronLeft, ArrowRightToLine, ArrowLeftToLine, ChevronsRight, ChevronsLeft } from "lucide-react";
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
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Query para obtener suscripción del usuario
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<UserSubscription>({
    queryKey: ['/api/user/subscription'],
    enabled: !!currentUser
  });

  // Query para obtener planes disponibles
  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['/api/subscription/plans'],
    enabled: !!currentUser
  });

  // Función para obtener el nombre del plan actual
  const getCurrentPlanName = () => {
    if (subscriptionLoading || plansLoading || !subscription || !plans) {
      return 'Cargando...';
    }
    const currentPlan = plans.find(plan => plan.id === subscription.planId);
    return currentPlan ? currentPlan.name : 'Plan no encontrado';
  };

  // Función para toggle del sidebar
  const toggleSidebar = () => {
    const newExpanded = !isSidebarExpanded;
    setSidebarExpanded(newExpanded);
    
    // Notificar cambio de ancho al componente padre
    if (onWidthChange) {
      onWidthChange(newExpanded ? 288 : 0);
    }
    
    console.log('Menu state updated:', newExpanded);
  };

  // Función para manejar logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      toast({
        title: t('auth.logoutSuccess'),
        description: t('auth.logoutSuccessDescription'),
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: t('auth.logoutError'),
        description: t('auth.logoutErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      {/* Botón flotante único */}
      <div 
        className="fixed left-4 top-4 z-50"
        style={{
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="flex items-center justify-center hover:bg-accent/70 hover:scale-110 transition-all duration-300 group shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(0,200,255,0.05))',
            borderRadius: '12px',
            border: '1px solid rgba(0,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            width: '48px',
            height: '48px'
          }}
        >
          <div 
            className="transition-all duration-500 ease-in-out group-hover:text-cyan-400"
            style={{
              transform: isSidebarExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              filter: 'drop-shadow(0 0 4px rgba(0,255,255,0.3))'
            }}
          >
            <ChevronsRight className="h-5 w-5" />
          </div>
        </Button>
      </div>

      {/* Sidebar expandido solo cuando se necesita */}
      {isSidebarExpanded && (
        <aside 
          className="fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-border bg-card/95 backdrop-blur-sm"
          style={{ 
            width: '288px',
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(10px)',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.95), rgba(20,20,30,0.95))',
            borderRight: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* Header con espaciado para el botón flotante */}
          <div className="flex-shrink-0 pt-16 px-3 border-b border-border">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-primary">Menú</h2>
            </div>
          </div>

          {/* Área de navegación con scroll interno */}
          <div 
            className="flex-1" 
            style={{ 
              minHeight: 0, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Vista expandida con scroll */}
            <div 
              className="custom-scroll"
              style={{ 
                height: '100%', 
                overflowY: 'auto', 
                overflowX: 'hidden',
                paddingTop: '12px',
                paddingLeft: '12px',
                paddingRight: '12px',
                paddingBottom: '80px' // Espacio para el footer
              }}
            >
              {navigationGroups.map((group, index) => (
                <div key={`group-${index}`} style={{ marginBottom: '16px' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider px-2 mb-2 text-center" style={{ color: '#00ffff' }}>
                    {t(`navigation.${group.title}`)}
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {group.items
                      .filter(item => item.path !== "/mervin" && item.id !== "mervin")
                      .map((item) => (
                        <Link key={item.id} href={item.path}>
                          <Button 
                            variant="ghost" 
                            className={`w-full justify-start px-2 py-1.5 h-auto hover:bg-accent text-sm font-normal ${
                              location === item.path ? 'bg-primary/20 text-primary' : ''
                            }`}
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
          </div>

          {/* Footer fijo - posicionado absolutamente */}
          <div 
            className="absolute bottom-0 left-0 right-0 p-2 border-t border-border bg-card"
            style={{ zIndex: 50 }}
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
                {t('general.logout')}
              </Button>
              
              <div className="flex-shrink-0">
                <LanguageSwitch />
              </div>
            </div>
          </div>
        </aside>
      )}
    </TooltipProvider>
  );
}