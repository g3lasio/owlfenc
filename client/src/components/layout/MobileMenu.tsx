import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { navigationGroups, NavigationItem, NavigationGroup } from "@/config/navigation";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitch from "@/components/ui/language-switch";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const { t } = useTranslation(); // Añadimos soporte para traducciones
  const { language } = useLanguage(); // Obtenemos el idioma actual del contexto

  // Función para expandir secuencialmente los menús al abrir el sidebar
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

  // Función para contraer secuencialmente los menús al cerrar el sidebar
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

  // Manejar cierre de sesión
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

  useEffect(() => {
    console.log("Menu state changed:", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    
    if (isOpen) {
      // Expandir menús secuencialmente cuando se abre el sidebar
      expandMenusSequentially();
    } else {
      // Contraer menús secuencialmente cuando se cierra el sidebar
      collapseMenusSequentially();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuPanelRef.current &&
        !menuPanelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (isOpen && event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 bg-background/60 backdrop-blur-md z-[9999] md:hidden transition-all duration-500 ease-in-out 
        ${isOpen
          ? "opacity-100 pointer-events-auto scale-100"
          : "opacity-0 pointer-events-none scale-105"
        }
      `}
      style={{
        backgroundImage: isOpen ? 'radial-gradient(circle at center, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.8) 100%)' : 'none'
      }}
      onClick={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={menuPanelRef}
        initial={{ x: -300, opacity: 0, scale: 0.95, rotate: -3, filter: "blur(4px)" }}
        animate={{ 
          x: isOpen ? 0 : -300,
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.95,
          rotate: isOpen ? 0 : -3,
          filter: isOpen ? "blur(0px)" : "blur(4px)"
        }}
        transition={{ 
          type: "spring", 
          damping: 15, 
          stiffness: 150,
          duration: 0.5
        }}
        className="bg-card w-[300px] h-full flex flex-col shadow-lg relative "
        style={{
          boxShadow: isOpen ? "0 0 25px rgba(0, 200, 255, 0.3), 0 0 5px rgba(0, 200, 255, 0.1)" : "none",
          borderRight: isOpen ? "1px solid rgba(0, 200, 255, 0.3)" : "none"
        }}
      >
        {/* Efecto de línea brillante en el borde */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "100%" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 1 }}
              className="absolute top-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-primary/70 to-transparent"
            />
          )}
        </AnimatePresence>

        {/* Encabezado del Menú - Solo botón de cerrar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex justify-end items-center p-4 border-b border-border"
        >
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-md hover:bg-accent"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <i className="ri-close-line text-xl"></i>
          </motion.button>
        </motion.div>

        {/* Contenedor con scroll para toda la navegación */}
        <div className="flex-1 ">
          {/* Navegación Principal - Generada desde la configuración centralizada */}
          <div className="p-3">
            {navigationGroups.map((group, groupIndex) => {
              const isExpanded = group.title === "tools" ? isToolsExpanded :
                               group.title === "features" ? isFeaturesExpanded :
                               group.title === "account" ? isAccountExpanded : true;
              
              const setExpanded = group.title === "tools" ? setIsToolsExpanded :
                                group.title === "features" ? setIsFeaturesExpanded :
                                group.title === "account" ? setIsAccountExpanded : () => {};

              return (
                <div key={`mobile-group-${groupIndex}`}>
                  {/* Sci-Fi Accordion Frame - Mobile */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (groupIndex * 0.4), duration: 0.3 }}
                    className="mb-4 sci-fi-frame sci-fi-corner-brackets arc-reactor-bg p-3"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-center text-xs font-semibold py-3 text-muted-foreground uppercase tracking-wider hover:bg-accent hover:text-cyan-400 transition-colors"
                      onClick={() => setExpanded(!isExpanded)}
                    >
                      <span className="flex items-center justify-center w-full">
                        {t(`navigation.${group.title}`)}
                        <span className="ml-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </span>
                      </span>
                    </Button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                          className="space-y-1.5 mt-3 "
                        >
                          {group.items.map((item, itemIndex) => 
                            item.id !== "mervin" ? (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIndex * 0.1, duration: 0.3 }}
                              >
                                <Link 
                                  href={item.path} 
                                  onClick={onClose}
                                >
                                  <motion.div 
                                    whileHover={{ 
                                      scale: 1.02,
                                      x: 5
                                    }}
                                    className="flex items-center justify-center p-2 rounded-md hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                                  >
                                    {item.icon.startsWith('lucide-') ? (
                                      <>
                                        {item.icon === 'lucide-user' && <i className="ri-user-settings-line text-lg mr-3"></i>}
                                        {item.icon === 'lucide-credit-card' && <i className="ri-bank-card-line text-lg mr-3"></i>}
                                        {item.icon === 'lucide-building' && <i className="ri-building-4-line text-lg mr-3"></i>}
                                        {item.icon === 'lucide-settings' && <i className="ri-settings-4-line text-lg mr-3"></i>}
                                        {item.icon === 'lucide-brain' && <i className="ri-brain-artificial-line text-lg mr-3"></i>}
                                      </>
                                    ) : (
                                      <i className={`${item.icon} text-lg mr-3`}></i>
                                    )}
                                    <span>{t(item.label)}</span>
                                  </motion.div>
                                </Link>
                              </motion.div>
                            ) : null
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  
                  {/* Futuristic divider */}
                  {groupIndex === 1 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.1, duration: 0.3 }}
                      className="futuristic-divider power-pulse my-4"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie fijo con soporte y cerrar sesión */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.3 }}
          className="p-3 border-t border-border"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-primary/10 rounded-md p-2 mb-3"
            style={{ height: "auto", minHeight: "70px" }}
          >
            <p className="text-xs text-center mb-1">{t('general.needHelp')}</p>
            <motion.a 
              href="mailto:mervin@owlfenc.com"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center py-1 px-2 w-full bg-card border border-border rounded-md hover:bg-accent text-sm"
            >
              <i className="ri-mail-line mr-1"></i>
              <span>{t('general.support')}</span>
            </motion.a>
          </motion.div>

          {/* Botón de Cerrar Sesión con switch de idioma a su lado */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLogout}
                disabled={loading}
                className="flex-1 flex items-center p-2 rounded-md hover:bg-destructive/10 text-destructive"
              >
                <i className={`${loading ? 'ri-loader-2-line animate-spin' : 'ri-logout-box-r-line'} text-lg mr-3`}></i>
                <span>{t('general.logout')}</span>
              </motion.button>
              
              {/* Language Switch simplificado con decoración mínima */}
              <div className="ml-2 transform hover:scale-105 transition-transform">
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full opacity-70"></div>
                <LanguageSwitch />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}