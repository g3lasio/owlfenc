import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
      className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] md:hidden transition-all duration-300 ease-in-out ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      onClick={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={menuPanelRef}
        className={`bg-card w-[300px] h-full flex flex-col transform transition-all duration-300 shadow-lg ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Encabezado del Menú */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <img
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png"
            alt="Owl Fence"
            className="h-10 w-auto max-w-[180px] object-contain"
          />
          <button
            className="p-1.5 rounded-md hover:bg-accent"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Contenedor con scroll para toda la navegación */}
        <div className="flex-1 overflow-y-auto">
          {/* Botón de acción principal */}
          <div className="p-4">
            <Link href="/new-estimate" onClick={onClose}>
              <div className="flex items-center justify-center bg-primary text-white p-3 rounded-md hover:bg-primary/90">
                <i className="ri-add-line mr-2"></i>
                <span>Nuevo Estimado</span>
              </div>
            </Link>
          </div>

          {/* Navegación Principal */}
          <div className="p-3">
            <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Herramientas</h2>
            <div className="space-y-1.5 mb-4">
              <Link href="/" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-dashboard-line text-lg mr-3"></i>
                  <span>Dashboard</span>
                </div>
              </Link>
              <Link href="/projects" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-briefcase-4-line text-lg mr-3"></i>
                  <span>Proyectos</span>
                </div>
              </Link>
              <Link href="/clients" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-user-star-line text-lg mr-3"></i>
                  <span>Clientes</span>
                </div>
              </Link>
              <Link href="/history" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-time-line text-lg mr-3"></i>
                  <span>Historial</span>
                </div>
              </Link>
            </div>
            
            <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Funcionalidades</h2>
            <div className="space-y-1.5 mb-4">
              <Link href="/property-verifier" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-shield-keyhole-line text-lg mr-3"></i>
                  <span>Verificación de Propiedad</span>
                </div>
              </Link>
              <Link href="/permit-advisor" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-robot-2-line text-lg mr-3"></i>
                  <span>Mervin DeepSearch</span>
                </div>
              </Link>
              <Link href="/ai-project-manager" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-brain-line text-lg mr-3"></i>
                  <span>Gestión Inteligente</span>
                </div>
              </Link>
            </div>
          </div>

          <div className="h-px bg-border mx-4 my-2"></div>

          {/* Configuración de Usuario */}
          <div className="p-3">
            <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Mi Perfil</h2>
            <div className="space-y-1.5 mb-4">
              <Link href="/account" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-user-settings-line text-lg mr-3"></i>
                  <span>Perfil Personal</span>
                </div>
              </Link>
              <Link href="/billing" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-bank-card-line text-lg mr-3"></i>
                  <span>Facturación</span>
                </div>
              </Link>
              <Link href="/subscription" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-vip-crown-line text-lg mr-3"></i>
                  <span>Mi Suscripción</span>
                </div>
              </Link>
            </div>
            
            <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Empresa</h2>
            <div className="space-y-1.5 mb-4">
              <Link href="/profile" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-building-4-line text-lg mr-3"></i>
                  <span>Perfil de Empresa</span>
                </div>
              </Link>
              <Link href="/settings/employees" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-team-line text-lg mr-3"></i>
                  <span>Empleados</span>
                </div>
              </Link>
              <Link href="/settings" onClick={onClose}>
                <div className="flex items-center p-2 rounded-md hover:bg-accent">
                  <i className="ri-settings-4-line text-lg mr-3"></i>
                  <span>Preferencias</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Pie fijo con soporte y cerrar sesión */}
        <div className="p-3 border-t border-border">
          <div className="bg-primary/10 rounded-md p-3 mb-3">
            <p className="text-sm text-center mb-2">¿Necesitas ayuda?</p>
            <button className="flex items-center justify-center p-2 w-full bg-card border border-border rounded-md hover:bg-accent">
              <i className="ri-question-line mr-2"></i>
              <span>Soporte</span>
            </button>
          </div>
          
          {/* Botón de Cerrar Sesión */}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center p-2 rounded-md hover:bg-destructive/10 w-full text-destructive"
          >
            <i className={`${loading ? 'ri-loader-2-line animate-spin' : 'ri-logout-box-r-line'} text-lg mr-3`}></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
