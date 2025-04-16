import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import Navigation from "./Navigation";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [location] = useLocation();
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location && location !== "/") {
      console.log("Location changed, closing menu");
      onClose();
    }
  }, [location, onClose]);

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

        {/* Navegación usando el componente unificado */}
        <Navigation variant="drawer" onClose={onClose} />

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
