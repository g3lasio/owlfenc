import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  toggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({
  toggleMobileMenu,
  isMobileMenuOpen,
}: HeaderProps) {
  const [location] = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    console.log("Menu toggle clicked, current state:", isMobileMenuOpen);
    toggleMobileMenu();
  };

  let title = "Dashboard";
  let subtitle = "Bienvenido";

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
    <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-card">
      <button
        className="p-2 rounded-md hover:bg-accent transition-colors"
        onClick={handleMenuToggle}
        aria-label="Menu principal"
        aria-expanded={isMobileMenuOpen}
        type="button"
      >
        <i className="ri-menu-line text-xl"></i>
      </button>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
        <Link href="/" className="cursor-pointer">
          <img
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png"
            alt="Owl Fenc"
            className="h-14 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications Button */}
        <button className="relative p-2 rounded-md hover:bg-accent">
          <i className="ri-notification-3-line text-xl"></i>
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        
        {/* User Profile Dropdown */}
        <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-accent">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <span className="font-medium text-sm">JC</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">John Contractor</p>
                <p className="text-xs text-muted-foreground">admin@fencequotepro.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/profile" className="flex items-center w-full">
                  <i className="ri-user-settings-line mr-2"></i>
                  <span>Perfil de Empresa</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/settings/pricing" className="flex items-center w-full">
                  <i className="ri-money-dollar-circle-line mr-2"></i>
                  <span>Precios y Tarifas</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/settings/account" className="flex items-center w-full">
                  <i className="ri-user-3-line mr-2"></i>
                  <span>Mi Cuenta</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/settings/notifications" className="flex items-center w-full">
                  <i className="ri-notification-2-line mr-2"></i>
                  <span>Notificaciones</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <a href="mailto:mervin@owlfenc.com" className="flex items-center w-full">
                  <i className="ri-customer-service-line mr-2"></i>
                  <span>Contactar Soporte</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/about-owlfenc" className="flex items-center w-full">
                  <i className="ri-building-2-line mr-2"></i>
                  <span>Acerca de Owl Fence App</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/about-mervin" className="flex items-center w-full">
                  <i className="ri-robot-line mr-2"></i>
                  <span>Acerca de Mervin AI</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <i className="ri-logout-box-line mr-2"></i>
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
