
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
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Link href="/mervin">
        <button style={{ 
          position: 'relative',
          borderRadius: '50%',
          border: '2px solid transparent',
          background: `
            radial-gradient(circle at center, 
              rgba(0,20,40,0.9) 0%, 
              rgba(0,40,80,0.7) 30%, 
              rgba(0,100,150,0.5) 70%, 
              transparent 100%
            ),
            conic-gradient(from 0deg, 
              rgba(0,255,255,0.8), 
              rgba(0,150,255,0.6), 
              rgba(100,200,255,0.4),
              rgba(0,255,255,0.8)
            )
          `,
          cursor: 'pointer',
          padding: 0,
          width: '200px',
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'borderGlow 3s ease-in-out infinite, reactorPulse 2s ease-in-out infinite'
        }}>
          {/* Efecto de escaneo horizontal */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '50%',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '2px',
              background: 'rgba(0,255,255,0.7)',
              width: '100%',
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: '0 0 10px rgba(0,255,255,0.5)'
            }}></div>
          </div>
          
          {/* Efecto de escaneo vertical */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '50%',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '2px',
              background: 'rgba(0,150,255,0.7)',
              height: '100%',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 10px rgba(0,150,255,0.5)'
            }}></div>
          </div>
          
          {/* Contenedor principal */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '180px',
            height: '180px',
            transform: 'scale(1)',
            transition: 'transform 0.3s ease'
          }} 
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            {/* Partículas animadas alrededor del logo */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
              {particles.map(particle => (
                <div 
                  key={particle.id}
                  className="absolute rounded-full bg-cyan-400"
                  style={{
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                    left: `calc(50% + ${particle.x}px)`,
                    top: `calc(50% + ${particle.y}px)`,
                    opacity: particle.opacity,
                    animation: `floatParticle ${particle.speed}s infinite alternate ease-in-out`,
                    animationDelay: `${particle.delay}s`
                  }}
                />
              ))}
            </div>
            
            {/* Fondo circular oscuro para contraste del logo */}
            <div style={{
              position: 'absolute',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,20,40,0.8) 0%, rgba(0,40,80,0.6) 50%, transparent 100%)',
              zIndex: 5
            }}></div>
            
            {/* Imagen del logo */}
            <img 
              src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
              alt="Mervin AI" 
              style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                zIndex: 10,
                animation: 'logoGlow 2.5s ease-in-out infinite',
                filter: 'brightness(1.2) contrast(1.3) saturate(1.1)'
              }}
            />
          </div>
          
          {/* Texto de Mervin AI con efecto de aparición */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-lg md:text-xl font-quantico whitespace-nowrap tracking-wider z-10">
            <div className="relative overflow-hidden">
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
