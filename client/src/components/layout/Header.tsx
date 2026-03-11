import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { WalletBadge } from "@/components/wallet";

export default function Header() {
  const [path] = useLocation();
  const [glowPulse, setGlowPulse] = useState(false);
  const { user } = useAuth();

  // Efecto para animar el pulso del logo
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowPulse(prev => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Verificar si estamos en la página de Materials para evitar duplicación de header
  const isMaterialsPage = path === '/materials';

  // Si estamos en la página de materiales, no mostrar el header duplicado
  if (isMaterialsPage) {
    return null;
  }

  return (
    <header 
      className="w-full flex items-center bg-card border-b border-border flex-shrink-0 relative"
      style={{
        height: 'var(--header-height)',
        minHeight: 'var(--header-height)',
        zIndex: 'var(--z-header)'
      }}
    >
      {/* Espacio izquierdo para balance visual */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
        {/* Reservado para futuras acciones izquierda */}
      </div>

      {/* Logo centrado */}
      <div className="flex-1 flex flex-col items-center justify-center pr-16 sm:pr-0">
        <Link href="/" className="flex flex-col items-center">
          <div className="h-10 flex items-center justify-center relative">
            {/* Imagen del logo */}
            <img
              src="https://i.postimg.cc/yYSwtxhq/White-logo-no-background.png" 
              alt="Logo"
              className="h-10 w-auto object-contain"
              style={{ filter: 'brightness(1.1) contrast(1.1)' }}
              onError={(e) => {
                console.log("Error cargando logo en Header, usando fallback");
                const imgElement = e.currentTarget;
                imgElement.src = "/White-logo-no-background-new.png";
                imgElement.onerror = () => {
                  imgElement.classList.add('hidden');
                  imgElement.nextElementSibling?.classList.remove('hidden');
                };
              }}
            />
            
            {/* Texto de respaldo si la imagen falla */}
            <span className="text-xl font-bold text-primary hidden">Owl Fenc</span>
          </div>
          
          {/* Slogan */}
          <p className="text-xs font-medium bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
            The AI Force Crafting the Future Skyline
          </p>
        </Link>
      </div>

      {/* Wallet Badge — PAY AS YOU GROW (solo si el usuario está autenticado) */}
      {user && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {/* Compact badge for mobile (< sm), full badge for desktop */}
          <span className="block sm:hidden">
            <WalletBadge compact={true} />
          </span>
          <span className="hidden sm:block">
            <WalletBadge compact={false} />
          </span>
        </div>
      )}
    </header>
  );
}
