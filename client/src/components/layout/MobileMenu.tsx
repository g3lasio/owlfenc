
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
        className={`bg-card w-[280px] h-full overflow-y-auto transform transition-transform duration-300 shadow-lg ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Encabezado del Menú */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <img 
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png" 
            alt="Owl Fenc" 
            className="h-12 w-auto max-w-[180px] object-contain" 
          />
          <button 
            className="p-1.5 rounded-md hover:bg-accent"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Información del Usuario */}
        <div className="p-4 border-b border-border bg-accent/10">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <span className="font-medium text-sm">JC</span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium">John Contractor</div>
              <div className="text-xs text-muted-foreground">Plan Premium</div>
            </div>
          </div>
        </div>

        {/* Menú Principal */}
        <nav className="p-4 space-y-6 overflow-y-auto">
          {/* 1. Principal */}
          <div className="space-y-1">
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Principal</div>
            <Link href="/" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-dashboard-line text-lg mr-3"></i>
              <span>Dashboard</span>
            </Link>
            <Link href="/property-verifier" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-shield-check-line text-lg mr-3"></i>
              <span>🛡️ Property Ownership Verifier</span>
            </Link>
            <Link href="/ai-project-manager" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-robot-line text-lg mr-3"></i>
              <span>🧠 AI Project Manager</span>
            </Link>
            <Link href="/ar-fence-estimator" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-augmented-reality-line text-lg mr-3"></i>
              <span>🧱 AR Fence Estimator</span>
            </Link>
          </div>

          {/* 2. Proyectos */}
          <div className="space-y-1">
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Proyectos</div>
            <Link href="/projects" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-folder-line text-lg mr-3"></i>
              <span>Proyectos</span>
            </Link>
            <Link href="/templates" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-file-list-3-line text-lg mr-3"></i>
              <span>Plantillas</span>
            </Link>
          </div>

          {/* 3. Mi Cuenta */}
          <div className="space-y-1">
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mi Cuenta</div>
            <Link href="/settings/account" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-user-3-line text-lg mr-3"></i>
              <span>Perfil Personal</span>
            </Link>
            <Link href="/settings/notifications" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-notification-3-line text-lg mr-3"></i>
              <span>Notificaciones</span>
            </Link>
          </div>

          {/* 4. Configuración de Empresa */}
          <div className="space-y-1">
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Configuración de Empresa</div>
            <Link href="/profile" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-building-line text-lg mr-3"></i>
              <span>Perfil de Empresa</span>
            </Link>
            <Link href="/settings/pricing" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-money-dollar-circle-line text-lg mr-3"></i>
              <span>Precios y Tarifas</span>
            </Link>
            <Link href="/settings/billing" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-bank-card-line text-lg mr-3"></i>
              <span>Facturación</span>
            </Link>
            <Link href="/settings/employees" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-team-line text-lg mr-3"></i>
              <span>Empleados</span>
            </Link>
          </div>

          {/* 5. Soporte */}
          <div className="space-y-1">
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Soporte</div>
            <a href="mailto:mervin@owlfenc.com" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-customer-service-2-line text-lg mr-3"></i>
              <span>Contactar Soporte</span>
            </a>
            <Link href="/about-owlfenc" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-building-2-line text-lg mr-3"></i>
              <span>Acerca de Owl Fence App</span>
            </Link>
            <Link href="/about-mervin" className="flex items-center p-2 rounded-md hover:bg-accent">
              <i className="ri-robot-line text-lg mr-3"></i>
              <span>Acerca de Mervin AI</span>
            </Link>
          </div>
        </nav>

        {/* Pie del Menú */}
        <div className="p-4 border-t border-border">
          <button className="flex items-center w-full p-2 rounded-md hover:bg-destructive/10 hover:text-destructive">
            <i className="ri-logout-box-r-line text-lg mr-3"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
