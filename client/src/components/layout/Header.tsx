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
    <header className="h-20 w-full flex items-center justify-between px-4 border-b border-border bg-card sticky top-0 z-50">
      <div className="w-10">
        <button
          className="p-2 rounded-md hover:bg-accent/20 transition-all duration-300 z-[10000] relative overflow-hidden group md:hidden"
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
          <i className="ri-menu-line text-2xl relative z-10 transition-transform duration-300 group-hover:rotate-180 text-primary"></i>
          <div className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
        </button>
      </div>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center w-full max-w-[280px] px-4">
        <Link href="/" className="cursor-pointer relative group px-2 mx-2">
          {/* Efectos futuristas modernos sin contorno */}
          <div className={`absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-500/10 to-purple-500/20 rounded-xl blur-lg opacity-30 ${glowPulse ? 'scale-110' : 'scale-100'} transition-all duration-1000 group-hover:opacity-60`}></div>

          {/* Partículas brillantes */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-80"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${2 + Math.random() * 3}s infinite ease-in-out ${Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          {/* Destellos digitales */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
            <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-full absolute top-1/3 animate-scan-x"></div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent w-full absolute top-2/3 animate-scan-x" style={{animationDelay: '0.5s'}}></div>
          </div>

          <img
              src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png" 
              alt="Owl Fence"
              className="h-16 w-auto object-contain relative z-10 transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_0_3px_rgba(56,189,248,0.5)] my-2"
              style={{ maxWidth: '240px', margin: '0 auto' }}
            />
        </Link>

        {/* Slogan con degradado en línea única */}
        <p className="text-xs font-medium bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap mt-0.5">
          The AI Force Crafting the Future Skyline
        </p>
      </div>

      {/* Espacio vacío en el lado derecho para mantener el logo centrado */}
      <div className="w-10"></div>
    </header>
  );
}