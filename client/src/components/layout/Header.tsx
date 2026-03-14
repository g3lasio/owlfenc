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
      {/* 
        Spacer izquierdo: en mobile reserva 64px para el ícono hexagonal del sidebar
        En desktop el sidebar ocupa 64px fijos, el header empieza después del sidebar
        así que no necesita padding extra en desktop.
      */}
      <div className="w-16 flex-shrink-0 sm:w-0" />

      {/* Logo centrado — usa flex-1 para ocupar el espacio disponible */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Link href="/" className="flex flex-col items-center">
          <div className="h-10 flex items-center justify-center relative">
            {/* Imagen del logo */}
            <img
              src="https://i.postimg.cc/yYSwtxhq/White-logo-no-background.png" 
              alt="OWL FENC"
              className="h-10 w-auto object-contain"
              style={{ filter: 'brightness(1.1) contrast(1.1)' }}
              onError={(e) => {
                const imgElement = e.currentTarget;
                imgElement.src = "/White-logo-no-background-new.png";
                imgElement.onerror = () => {
                  imgElement.classList.add('hidden');
                  const sibling = imgElement.nextElementSibling as HTMLElement | null;
                  sibling?.classList.remove('hidden');
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

      {/* Wallet Badge — derecha, mismo ancho que el spacer izquierdo para balance visual */}
      <div className="w-16 flex-shrink-0 flex items-center justify-end pr-3 sm:w-auto sm:pr-4">
        {user && (
          <>
            {/* Compact badge for mobile (< sm), full badge for desktop */}
            <span className="block sm:hidden">
              <WalletBadge compact={true} />
            </span>
            <span className="hidden sm:block">
              <WalletBadge compact={false} />
            </span>
          </>
        )}
      </div>
    </header>
  );
}
