
import { Link } from "wouter";
import { useEffect, useState } from "react";

export default function Home() {
  // Estado para manejar la animación de partículas
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, speed: number, opacity: number, delay: number}>>([]);
  
  // Generar partículas aleatorias alrededor del logo
  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 200 - 100, // Posición x relativa al centro
      y: Math.random() * 200 - 100, // Posición y relativa al centro
      size: Math.random() * 3 + 1,  // Tamaño aleatorio entre 1 y 4px
      speed: Math.random() * 2 + 0.5, // Velocidad aleatoria
      opacity: Math.random() * 0.7 + 0.3, // Opacidad aleatoria
      delay: Math.random() * 3  // Delay aleatorio para la animación
    }));
    setParticles(newParticles);
  }, []);

  // El color principal del logo de Mervin
  const mervinBlue = "#29ABE2"; // Color cyan del logo de Mervin

  return (
    <div className="h-screen bg-slate-900 text-white overflow-hidden relative">
      <Link href="/mervin">
        <button style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          width: '200px',
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          
          {/* Imagen del logo con pulsaciones */}
          <img 
            src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
            alt="Mervin AI" 
            style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              zIndex: 100,
              animation: 'logoGlow 2.5s ease-in-out infinite'
            }}
          />
          
          {/* Texto de Mervin AI con efecto de aparición */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-lg md:text-xl font-quantico whitespace-nowrap tracking-wider z-100">
            <div className="relative ">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-md animate-text-reveal inline-block">
                Mervin AI
              </span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 animate-line-reveal"></span>
            </div>
            {/* Marcadores de tecnología futurista */}
            <span className="absolute -left-4 -bottom-1 h-2 w-2 bg-cyan-400 rounded-full opacity-70 animate-pulse"></span>
            <span className="absolute -right-4 -bottom-1 h-2 w-2 bg-cyan-400 rounded-full opacity-70 animate-pulse" style={{ animationDelay: '0.5s' }}></span>
          </div>
        </button>
      </Link>
    </div>
  );
}
