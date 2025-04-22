import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import Navigation from "./Navigation";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuPanelRef = useRef<HTMLDivElement>(null);

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
        className={`bg-card w-[300px] h-full overflow-y-auto transform transition-all duration-300 shadow-lg ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Encabezado del Menú */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <img
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png"
            alt="Owl Fenc"
            className="h-10 w-auto max-w-[180px] object-contain"
          />
          <button
            className="p-1.5 rounded-md hover:bg-accent"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Navegación Principal */}
        <div className="p-3">
          <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Navegación</h2>
          <Navigation variant="drawer" type="main" onClose={onClose} />
        </div>

        <div className="h-px bg-border mx-4 my-2"></div>

        {/* Navegación de Usuario */}
        <div className="p-3">
          <h2 className="text-xs font-semibold px-2 mb-2 text-muted-foreground uppercase tracking-wider">Configuración</h2>
          <Navigation variant="drawer" type="user" onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
