import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  toggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({
  toggleMobileMenu,
  isMobileMenuOpen,
}: HeaderProps) {
  const [location] = useLocation();
  const [glowPulse, setGlowPulse] = useState(false);

  // Efecto para animar el pulso del logo
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowPulse(prev => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleMenuToggle = () => {
    console.log("Menu toggle clicked, current state:", isMobileMenuOpen);
    toggleMobileMenu();
  };

  return (
    <header className="h-20 w-full flex items-center bg-card border-b border-border sticky top-0 z-50">
      {/* Botón del menú */}
      <div className="w-16 flex items-center justify-center">
        <button
          className="p-2 rounded-md hover:bg-primary/10 transition-all duration-300 z-50 relative md:hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMenuToggle();
            console.log("Menu toggle clicked in Header");
          }}
          aria-label="Menu principal"
          aria-expanded={isMobileMenuOpen}
          type="button"
        >
          <i className="ri-menu-line text-2xl text-primary"></i>
        </button>
      </div>

      {/* Logo centrado */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Link href="/" className="flex flex-col items-center">
          <div className="h-10 flex items-center justify-center relative">
            {/* Logo de texto como fallback */}
            <div className="text-2xl font-bold text-primary md:hidden">Owl Fence</div>
            
            {/* Imagen del logo (oculta en móvil) */}
            <img
              src="https://i.postimg.cc/yYSwtxhq/White-logo-no-background.png" 
              alt="Owl Fence"
              className="h-10 w-auto object-contain hidden md:block"
              onError={(e) => {
                e.currentTarget.classList.add('hidden');
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            
            {/* Texto de respaldo si la imagen falla */}
            <span className="text-xl font-bold text-primary hidden">Owl Fence</span>
          </div>
          
          {/* Slogan */}
          <p className="text-xs font-medium bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
            The AI Force Crafting the Future Skyline
          </p>
        </Link>
      </div>

      {/* Espacio vacío en el lado derecho para mantener el balance */}
      <div className="w-16"></div>
    </header>
  );
}