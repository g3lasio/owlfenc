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
    <header className="h-20 w-full flex items-center justify-between px-0 border-b border-border bg-card sticky top-0 z-50">
      <button
        className={`p-2 rounded-md hover:bg-accent/20 transition-all duration-300 z-[10000] relative overflow-hidden group md:hidden ${isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleMenuToggle();
        }}
        aria-label="Menu principal"
        aria-expanded={isMobileMenuOpen}
        type="button"
      >
        <i className="ri-menu-line text-xl relative z-10 transition-transform duration-300 group-hover:rotate-180"></i>
        <div className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
      </button>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center w-full max-w-[220px]">
        <Link href="/" className="cursor-pointer relative group">
          {/* Efectos futuristas alrededor del logo */}
          <div className={`absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-md opacity-40 ${glowPulse ? 'animate-pulse' : ''} transition-all duration-500 group-hover:opacity-70`}></div>
          <div className="absolute -inset-[2px] border border-blue-400/50 rounded-full opacity-60 group-hover:border-blue-400/80 transition-colors duration-300"></div>
          
          {/* Líneas de escaneo */}
          <div className="absolute inset-0 overflow-hidden rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="h-0.5 bg-cyan-400 w-full absolute top-1/2 -translate-y-1/2 shadow-lg shadow-cyan-400/50 animate-scan-x"></div>
            <div className="w-0.5 bg-cyan-400 h-full absolute left-1/2 -translate-x-1/2 shadow-lg shadow-cyan-400/50 animate-scan-y"></div>
          </div>
          
          <img
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png"
            alt="Owl Fence"
            className="h-14 w-auto object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        
        {/* Slogan con degradado */}
        <div className="text-center mt-1">
          <p className="text-xs font-medium bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 bg-clip-text text-transparent">
            The AI Force Crafting the Future Skyline
          </p>
        </div>
      </div>

      {/* Espacio vacío en el lado derecho para mantener el logo centrado */}
      <div className="w-10"></div>
    </header>
  );
}