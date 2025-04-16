import { Link, useLocation } from "wouter";
import { navigationConfig } from "@/config/navigationItems";
import { Fragment } from "react";

interface NavigationProps {
  // Si es mobile o desktop
  variant: "sidebar" | "drawer";
  // Solo para drawer: función para cerrar el drawer
  onClose?: () => void;
}

export function Navigation({ variant, onClose }: NavigationProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };
  
  const isMail = (path: string) => path.startsWith("mailto:");
  
  // Clase base para los elementos de navegación
  const itemBaseClass = "flex items-center p-2 rounded-md transition-colors";
  
  // Clase para los elementos activos según la variante
  const getItemClass = (path: string) => {
    const active = isActive(path);
    
    if (variant === "sidebar") {
      return `${itemBaseClass} ${active ? "bg-primary/15 text-primary" : "hover:bg-accent"}`;
    } else {
      return `${itemBaseClass} ${active ? "bg-primary/15 text-primary" : "hover:bg-accent"}`;
    }
  };

  // Renderizado de enlaces de navegación
  const renderNavItem = (item: { path: string; icon: string; label: string }) => {
    const itemClass = getItemClass(item.path);
    
    if (isMail(item.path)) {
      return (
        <a 
          key={item.path} 
          href={item.path} 
          className={`${itemBaseClass} hover:bg-accent`}
          onClick={variant === "drawer" ? (e) => {
            // Para los mails, no cerramos el drawer inmediatamente para dar tiempo al usuario 
            // de ver que se ha abierto su cliente de correo
            setTimeout(() => {
              onClose?.();
            }, 300);
          } : undefined}
        >
          <i className={`${item.icon} text-lg mr-3`}></i>
          <span>{item.label}</span>
        </a>
      );
    }
    
    return (
      <Link
        key={item.path}
        href={item.path}
        className={itemClass}
        onClick={variant === "drawer" ? onClose : undefined}
      >
        <i className={`${item.icon} text-lg mr-3`}></i>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className={`flex-1 ${variant === "sidebar" ? "p-4" : "p-4"} space-y-5 overflow-y-auto`}>
      {navigationConfig.map((section, index) => (
        <Fragment key={section.title}>
          <div className="space-y-1">
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map(renderNavItem)}
            </div>
          </div>
        </Fragment>
      ))}
    </nav>
  );
}

export default Navigation;