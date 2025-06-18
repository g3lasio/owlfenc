import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [location] = useLocation();
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSidebarExpanded, setSidebarExpanded] = useState(false);
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

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      toast({
        title: t('general.success'),
        description: t('auth.logoutSuccess'),
      });
    } catch (error) {
      toast({
        title: t('general.error'),
        description: t('auth.logoutError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <TooltipProvider>
      <aside 
        className={`
          hidden md:flex flex-col bg-card transition-all duration-300
          ${isSidebarExpanded ? 'md:w-72 border-r border-border' : 'md:w-16'}
        `}
        style={{ 
          height: '100vh', 
          maxHeight: '100vh', 
          overflow: 'hidden',
          position: 'relative',
          minHeight: '100vh'
        }}
      >
        
        {/* Header con toggle */}
        <div className={`flex-shrink-0 ${isSidebarExpanded ? 'p-3 border-b border-border' : 'p-2'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center hover:bg-accent"
          >
            {isSidebarExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Área de navegación - ocupa todo el espacio disponible */}
        <div className="flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
          {isSidebarExpanded ? (
            // Vista expandida
            <div style={{ height: '100%', overflowY: 'auto', padding: '12px' }}>
              {navigationGroups.map((group, index) => (
                <div key={`group-${index}`} style={{ marginBottom: '16px' }}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                    {t(`navigation.${group.title}`)}
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {group.items
                      .filter(item => item.path !== "/mervin" && item.id !== "mervin")
                      .map((item) => (
                        <Link key={item.id} href={item.path}>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start px-2 py-1.5 h-auto hover:bg-accent text-sm font-normal"
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
            // Vista colapsada
            <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {navigationGroups.flatMap(group => group.items)
                .filter(item => item.path !== "/mervin" && item.id !== "mervin")
                .map((item: NavigationItem) => (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.path}
                        className={`
                          flex items-center justify-center w-14 h-9 rounded-md transition-all duration-200 mx-auto
                          hover:bg-accent/50 hover:scale-105
                          ${location === item.path 
                            ? 'bg-primary/20 text-primary border border-primary/30' 
                            : 'text-muted-foreground hover:text-primary'
                          }
                        `}
                      >
                        {item.icon.startsWith('lucide-') ? (
                          <>
                            {item.icon === 'lucide-building' && <Building className="h-4 w-4" />}
                            {item.icon === 'lucide-settings' && <Settings className="h-4 w-4" />}
                            {item.icon === 'lucide-credit-card' && <CreditCard className="h-4 w-4" />}
                            {item.icon === 'lucide-brain' && <BrainIcon className="h-4 w-4" />}
                          </>
                        ) : (
                          <i className={`${item.icon} text-base`} />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-background border border-border text-foreground shadow-lg">
                      <p className="font-medium">{t(item.label)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
            </div>
          )}
        </div>

        {/* Footer fijo */}
        {isSidebarExpanded && (
          <div className="flex-shrink-0 p-2 border-t border-border bg-card">
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
        )}
        
      </aside>
    </TooltipProvider>
  );
}