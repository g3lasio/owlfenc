
import { useLocation } from "wouter";

interface HeaderProps {
  toggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({ toggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const [location] = useLocation();
  
  const handleMenuToggle = () => {
    console.log('Menu toggle clicked, current state:', isMobileMenuOpen);
    toggleMobileMenu();
  };
  
  let title = "Dashboard";
  let subtitle = "Bienvenido a FenceQuote Pro";
  
  if (location === "/new-estimate") {
    title = "Nuevo Estimado";
    subtitle = "Crear un nuevo estimado con IA";
  } else if (location === "/history") {
    title = "Historial";
    subtitle = "Ver estimados y contratos anteriores";
  } else if (location === "/templates") {
    title = "Plantillas";
    subtitle = "Gestionar plantillas";
  }
  
  return (
    <header className="h-16 flex items-center px-4 border-b border-border bg-card">
      <button 
        className="p-2 rounded-md hover:bg-accent transition-colors"
        onClick={handleMenuToggle}
        aria-label="Menu principal"
        aria-expanded={isMobileMenuOpen}
        type="button"
      >
        <i className="ri-menu-line text-xl"></i>
      </button>
      
      <div className="ml-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      
      <div className="ml-auto flex items-center space-x-4">
        <button className="relative p-2 rounded-md hover:bg-accent">
          <i className="ri-notification-3-line text-xl"></i>
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
