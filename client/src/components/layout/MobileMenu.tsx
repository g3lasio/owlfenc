
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
    if (location && location !== '/') {
      console.log('Location changed, closing menu');
      onClose();
    }
  }, [location, onClose]);

  useEffect(() => {
    console.log('Menu state changed:', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
  }, [isOpen]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && menuPanelRef.current && !menuPanelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
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
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={menuPanelRef}
        className={`bg-card w-80 h-full overflow-y-auto transform transition-transform duration-300 shadow-lg ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Encabezado del Menú */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <i className="ri-fence-line text-white"></i>
            </div>
            <h1 className="ml-2 text-lg font-bold">Owl Fenc</h1>
          </div>
          <button 
            className="p-1 rounded-md hover:bg-accent"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <nav className="p-4 space-y-6">
          {/* 1. Inicio y Dashboard */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Principal</div>
            <Link href="/" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-dashboard-line mr-3"></i>
              <span>Dashboard</span>
            </Link>
          </div>

          {/* 2. Proyectos y Documentos */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Proyectos</div>
            <Link href="/new-estimate" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-file-add-line mr-3"></i>
              <span>Nuevo Estimado</span>
            </Link>
            <Link href="/new-contract" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-file-text-line mr-3"></i>
              <span>Nuevo Contrato</span>
            </Link>
            <Link href="/projects" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-calendar-todo-line mr-3"></i>
              <span>Proyectos Activos</span>
            </Link>
            <Link href="/history" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-history-line mr-3"></i>
              <span>Historial</span>
            </Link>
          </div>

          {/* 3. Tipos de Cercas */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Catálogo</div>
            <Link href="/category/wood" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-wood-line mr-3"></i>
              <span>Cercas de Madera</span>
            </Link>
            <Link href="/category/metal" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-copper-diamond-line mr-3"></i>
              <span>Cercas Metálicas</span>
            </Link>
            <Link href="/category/vinyl" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-layout-line mr-3"></i>
              <span>Cercas de Vinilo</span>
            </Link>
            <Link href="/category/chain" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-links-line mr-3"></i>
              <span>Cercas Chain Link</span>
            </Link>
          </div>

          {/* 4. Configuración y Sistema */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Configuración</div>
            <Link href="/settings/profile" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-user-settings-line mr-3"></i>
              <span>Perfil de Empresa</span>
            </Link>
            <Link href="/settings/pricing" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-money-dollar-circle-line mr-3"></i>
              <span>Precios y Tarifas</span>
            </Link>
            <Link href="/templates" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-file-list-3-line mr-3"></i>
              <span>Plantillas</span>
            </Link>
            <Link href="/settings/notifications" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-notification-3-line mr-3"></i>
              <span>Notificaciones</span>
            </Link>
          </div>

          {/* 5. Soporte y Ayuda */}
          <div className="space-y-1">
            <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Soporte</div>
            <Link href="/help" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-question-line mr-3"></i>
              <span>Centro de Ayuda</span>
            </Link>
            <Link href="/contact" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-customer-service-2-line mr-3"></i>
              <span>Contactar Soporte</span>
            </Link>
          </div>
        </nav>

        {/* Pie del Menú - Información del Usuario */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <Link href="/profile" className="flex items-center w-full">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <i className="ri-user-line"></i>
            </div>
            <div className="ml-2">
              <div className="text-sm font-medium">Mi Cuenta</div>
              <div className="text-xs text-muted-foreground">Plan Premium</div>
            </div>
            <button className="ml-auto p-2 rounded-md hover:bg-accent">
              <i className="ri-logout-box-r-line"></i>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
