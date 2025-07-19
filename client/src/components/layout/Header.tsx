import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
// No usamos useAuth en este componente, así que removemos la importación innecesaria
import { useToast } from "@/hooks/use-toast";

// Componente del ícono hexagonal futurista
const HexagonalMenuIcon = ({ onClick }: { onClick?: () => void }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [scanlinePosition, setScanlinePosition] = useState(0);

  // Animación de escaneo continuo
  useEffect(() => {
    const scanInterval = setInterval(() => {
      setScanlinePosition(prev => (prev >= 100 ? 0 : prev + 2));
    }, 50);

    return () => clearInterval(scanInterval);
  }, []);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="hexagonal-menu-icon relative group p-2 rounded-lg transition-all duration-300 hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50"
      aria-label="Abrir menú"
      style={{
        transform: isClicked ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.2s ease-out'
      }}
    >
      <div className="relative w-8 h-8">
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full"
          style={{
            transform: isHovering ? 'rotateY(15deg) rotateX(5deg)' : 'rotateY(0deg) rotateX(0deg)',
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Definiciones de filtros y gradientes */}
          <defs>
            {/* Gradiente principal con efecto neón */}
            <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0080ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4040ff" stopOpacity="0.7" />
            </linearGradient>

            {/* Gradiente para el glow */}
            <radialGradient id="glowGradient">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#0080ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Filtro de glow */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Filtro para el efecto de escaneo */}
            <mask id="scanMask">
              <rect width="100%" height="100%" fill="black"/>
              <rect 
                x="0" 
                y={`${scanlinePosition}%`}
                width="100%" 
                height="2" 
                fill="white"
                opacity="0.8"
              />
            </mask>
          </defs>

          {/* Hexágonos base con glow de fondo */}
          <g opacity={isHovering ? "1" : "0.7"}>
            {/* Hexágono superior */}
            <polygon
              points="20,4 26,8 26,16 20,20 14,16 14,8"
              fill="url(#glowGradient)"
              transform="scale(1.2)"
              opacity="0.3"
            />
            {/* Hexágono inferior izquierdo */}
            <polygon
              points="12,20 18,24 18,32 12,36 6,32 6,24"
              fill="url(#glowGradient)"
              transform="scale(1.2)"
              opacity="0.3"
            />
            {/* Hexágono inferior derecho */}
            <polygon
              points="28,20 34,24 34,32 28,36 22,32 22,24"
              fill="url(#glowGradient)"
              transform="scale(1.2)"
              opacity="0.3"
            />
          </g>

          {/* Líneas de conexión */}
          <g stroke="url(#hexGradient)" strokeWidth="1" fill="none" filter="url(#glow)">
            {/* Conexión superior a inferior izquierdo */}
            <line x1="17" y1="18" x2="15" y2="22" opacity={isHovering ? "1" : "0.6"} />
            {/* Conexión superior a inferior derecho */}
            <line x1="23" y1="18" x2="25" y2="22" opacity={isHovering ? "1" : "0.6"} />
            {/* Conexión entre hexágonos inferiores */}
            <line x1="18" y1="28" x2="22" y2="28" opacity={isHovering ? "1" : "0.6"} />
          </g>

          {/* Hexágonos principales */}
          <g fill="none" stroke="url(#hexGradient)" strokeWidth="1.5" filter="url(#glow)">
            {/* Hexágono superior */}
            <polygon
              points="20,6 25,10 25,18 20,22 15,18 15,10"
              className={`transition-all duration-500 ${isHovering ? 'animate-pulse' : ''}`}
              style={{
                strokeOpacity: isHovering ? 1 : 0.8,
                filter: isHovering ? 'drop-shadow(0 0 8px #00ffff)' : 'drop-shadow(0 0 4px #0080ff)'
              }}
            />
            
            {/* Hexágono inferior izquierdo */}
            <polygon
              points="12,22 17,26 17,34 12,38 7,34 7,26"
              className={`transition-all duration-500 ${isHovering ? 'animate-pulse' : ''}`}
              style={{
                strokeOpacity: isHovering ? 1 : 0.8,
                filter: isHovering ? 'drop-shadow(0 0 8px #00ffff)' : 'drop-shadow(0 0 4px #0080ff)',
                animationDelay: '0.1s'
              }}
            />
            
            {/* Hexágono inferior derecho */}
            <polygon
              points="28,22 33,26 33,34 28,38 23,34 23,26"
              className={`transition-all duration-500 ${isHovering ? 'animate-pulse' : ''}`}
              style={{
                strokeOpacity: isHovering ? 1 : 0.8,
                filter: isHovering ? 'drop-shadow(0 0 8px #00ffff)' : 'drop-shadow(0 0 4px #0080ff)',
                animationDelay: '0.2s'
              }}
            />
          </g>

          {/* Efecto de escaneo */}
          <g mask="url(#scanMask)">
            <rect 
              width="100%" 
              height="100%" 
              fill="url(#hexGradient)" 
              opacity="0.4"
            />
          </g>

          {/* Puntos centrales con pulso */}
          <g fill="url(#hexGradient)">
            <circle cx="20" cy="14" r="1" opacity={isHovering ? "1" : "0.6"}>
              <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="12" cy="30" r="1" opacity={isHovering ? "1" : "0.6"}>
              <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle cx="28" cy="30" r="1" opacity={isHovering ? "1" : "0.6"}>
              <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite" begin="0.6s" />
            </circle>
          </g>
        </svg>

        {/* Efecto de vibración al hacer clic */}
        {isClicked && (
          <div 
            className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping"
            style={{ animationDuration: '0.3s' }}
          />
        )}
      </div>
    </button>
  );
};

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

  // Función de manejo del clic del menú hexagonal
  const handleMenuClick = () => {
    console.log('Menú hexagonal clicked - funcionalidad por implementar');
    // Aquí se puede agregar la lógica del menú cuando sea necesario
  };

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
      {/* Ícono hexagonal futurista - Posición izquierda */}
      <div className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-10">
        <HexagonalMenuIcon onClick={handleMenuClick} />
      </div>

      {/* Logo centrado */}
      <div className="flex-1 flex flex-col items-center justify-center pl-12 sm:pl-16">
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