
import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [location] = useLocation();
  const menuPanelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    onClose();
  }, [location, onClose]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && menuPanelRef.current && !menuPanelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);
  
  return (
    <div 
      className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div 
        ref={menuPanelRef}
        className={`bg-card w-80 h-full overflow-y-auto transform transition-transform duration-300 shadow-lg ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <i className="ri-fence-line text-white"></i>
            </div>
            <h1 className="ml-2 text-lg font-bold">FenceQuote Pro</h1>
          </div>
          <button 
            className="p-1 rounded-md hover:bg-accent"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <nav className="p-4 space-y-6">
          {/* Inicio y Nuevos Documentos */}
          <div className="space-y-1">
            <Link href="/" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-dashboard-line mr-3"></i>
              <span>Inicio</span>
            </Link>
            <Link href="/new-estimate" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-file-add-line mr-3"></i>
              <span>Nuevo Estimado</span>
            </Link>
            <Link href="/new-contract" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-file-text-line mr-3"></i>
              <span>Nuevo Contrato</span>
            </Link>
          </div>

          {/* Historial y Proyectos */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground">Historial y Proyectos</div>
            <Link href="/estimates" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-mail-send-line mr-3"></i>
              <span>Estimados Enviados</span>
            </Link>
            <Link href="/contracts" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-check-double-line mr-3"></i>
              <span>Contratos Aceptados</span>
            </Link>
            <Link href="/projects" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-calendar-todo-line mr-3"></i>
              <span>Proyectos en Curso</span>
            </Link>
          </div>

          {/* Categorías de Cercas */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground">Categorías de Cercas</div>
            <Link href="/category/wood" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-wood-line mr-3"></i>
              <span>Wood Fences</span>
            </Link>
            <Link href="/category/metal" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-copper-diamond-line mr-3"></i>
              <span>Metal Fences</span>
            </Link>
            <Link href="/category/vinyl" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-layout-line mr-3"></i>
              <span>Vinyl Fences</span>
            </Link>
            <Link href="/category/chain" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-links-line mr-3"></i>
              <span>Chain Link Fences</span>
            </Link>
          </div>

          {/* Coming Soon */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground">Coming Soon</div>
            <div className="p-2 text-muted-foreground">
              <div className="flex items-center mb-2">
                <i className="ri-augmented-reality-line mr-3"></i>
                <span>AR Estimator</span>
              </div>
              <div className="flex items-center mb-2">
                <i className="ri-robot-line mr-3"></i>
                <span>AI Project Manager</span>
              </div>
              <div className="flex items-center">
                <i className="ri-shield-check-line mr-3"></i>
                <span>Property Ownership Verifier</span>
              </div>
            </div>
          </div>

          {/* Configuración y Ayuda */}
          <div className="space-y-1">
            <Link href="/settings" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-settings-3-line mr-3"></i>
              <span>Configuración</span>
            </Link>
            <Link href="/help" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-question-line mr-3"></i>
              <span>Ayuda y Soporte</span>
            </Link>
            <Link href="/about" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-information-line mr-3"></i>
              <span>Acerca de</span>
            </Link>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <i className="ri-user-line"></i>
            </div>
            <div className="ml-2">
              <div className="text-sm font-medium">Mi Perfil</div>
              <div className="text-xs text-muted-foreground">Premium Plan</div>
            </div>
            <button className="ml-auto p-2 rounded-md hover:bg-accent">
              <i className="ri-logout-box-r-line"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
