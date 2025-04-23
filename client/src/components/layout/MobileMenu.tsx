import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
        className="bg-card w-[300px] h-full flex flex-col shadow-lg relative overflow-hidden"
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

        {/* Encabezado del Menú */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex justify-between items-center p-4 border-b border-border"
        >
          <motion.img
            initial={{ filter: "blur(10px)", opacity: 0 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png"
            alt="Owl Fence"
            className="h-10 w-auto max-w-[180px] object-contain"
          />
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
        <div className="flex-1 overflow-y-auto">
          {/* Botón de acción principal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="p-4"
          >
            <Link href="/new-estimate" onClick={onClose}>
              <motion.div 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center bg-primary text-white p-3 rounded-md hover:bg-primary/90"
              >
                <i className="ri-add-line mr-2"></i>
                <span>Nuevo Estimado</span>
              </motion.div>
            </Link>
          </motion.div>

          {/* Navegación Principal */}
          <div className="p-3">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider"
            >
              Herramientas
            </motion.h2>
            <div className="space-y-1.5 mb-4">
              {[
                { name: "Dashboard", path: "/", icon: "ri-dashboard-line" },
                { name: "Proyectos", path: "/projects", icon: "ri-briefcase-4-line" },
                { name: "Clientes", path: "/clients", icon: "ri-user-star-line" },
                { name: "Historial", path: "/history", icon: "ri-time-line" }
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (index * 0.1), duration: 0.3 }}
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
                      className="flex items-center p-2 rounded-md hover:bg-accent"
                    >
                      <i className={`${item.icon} text-lg mr-3`}></i>
                      <span>{item.name}</span>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider"
            >
              Funcionalidades
            </motion.h2>
            <div className="space-y-1.5 mb-4">
              {[
                { name: "Verificación de Propiedad", icon: "ri-shield-keyhole-line", path: "/property-verifier" },
                { name: "Mervin DeepSearch", icon: "ri-robot-2-line", path: "/permit-advisor" },
                { name: "Gestión Inteligente", icon: "ri-brain-line", path: "/ai-project-manager" }
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + (index * 0.1), duration: 0.3 }}
                >
                  <Link href={item.path} onClick={onClose}>
                    <motion.div 
                      whileHover={{ 
                        scale: 1.02,
                        x: 5
                      }}
                      className="flex items-center p-2 rounded-md hover:bg-accent"
                    >
                      <i className={`${item.icon} text-lg mr-3`}></i>
                      <span>{item.name}</span>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.3 }}
            className="h-px bg-border mx-4 my-2"
          />

          {/* Configuración de Usuario */}
          <div className="p-3">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider"
            >
              Mi Perfil
            </motion.h2>
            <div className="space-y-1.5 mb-4">
              {[
                { name: "Perfil Personal", icon: "ri-user-settings-line", path: "/account" },
                { name: "Facturación", icon: "ri-bank-card-line", path: "/billing" },
                { name: "Mi Suscripción", icon: "ri-vip-crown-line", path: "/subscription" }
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + (index * 0.1), duration: 0.3 }}
                >
                  <Link href={item.path} onClick={onClose}>
                    <motion.div 
                      whileHover={{ 
                        scale: 1.02,
                        x: 5
                      }}
                      className="flex items-center p-2 rounded-md hover:bg-accent"
                    >
                      <i className={`${item.icon} text-lg mr-3`}></i>
                      <span>{item.name}</span>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5, duration: 0.3 }}
              className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider"
            >
              Empresa
            </motion.h2>
            <div className="space-y-1.5 mb-4">
              {[
                { name: "Perfil de Empresa", icon: "ri-building-4-line", path: "/profile" },
                { name: "Empleados", icon: "ri-team-line", path: "/settings/employees" },
                { name: "Preferencias", icon: "ri-settings-4-line", path: "/settings" }
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 + (index * 0.1), duration: 0.3 }}
                >
                  <Link href={item.path} onClick={onClose}>
                    <motion.div 
                      whileHover={{ 
                        scale: 1.02,
                        x: 5
                      }}
                      className="flex items-center p-2 rounded-md hover:bg-accent"
                    >
                      <i className={`${item.icon} text-lg mr-3`}></i>
                      <span>{item.name}</span>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
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
            <p className="text-xs text-center mb-1">¿Necesitas ayuda?</p>
            <motion.a 
              href="mailto:mervin@owlfenc.com?subject=Soporte%20Owl%20Fence"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center py-1 px-2 w-full bg-card border border-border rounded-md hover:bg-accent text-sm"
            >
              <i className="ri-question-line mr-1"></i>
              <span>Soporte</span>
            </motion.a>
          </motion.div>
          
          {/* Botón de Cerrar Sesión */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center p-2 rounded-md hover:bg-destructive/10 w-full text-destructive"
          >
            <i className={`${loading ? 'ri-loader-2-line animate-spin' : 'ri-logout-box-r-line'} text-lg mr-3`}></i>
            <span>Cerrar Sesión</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}