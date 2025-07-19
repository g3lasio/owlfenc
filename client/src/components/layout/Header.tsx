import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
// No usamos useAuth en este componente, así que removemos la importación innecesaria
import { useToast } from "@/hooks/use-toast";



export default function Header() {
  const [path] = useLocation();
  const [glowPulse, setGlowPulse] = useState(false);

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


      {/* Logo centrado */}
      <div className="flex-1 flex flex-col items-center justify-center">
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
                e.currentTarget.src = "/White-logo-no-background-new.png";
                // Si aún hay error, entonces usar el texto alternativo
                e.currentTarget.onerror = () => {
                  e.currentTarget.classList.add('hidden');
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                };
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

      {/* Espacio derecho para mantener el balance visual */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12">
        {/* Reservado para futuros elementos del header */}
      </div>
    </header>
  );
}