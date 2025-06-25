
import { Link } from "wouter";
import { useEffect, useState } from "react";

export default function Home() {
  // Estado para manejar la animación de partículas de fondo
  const [particles, setParticles] = useState<Array<{
    id: number, 
    x: number, 
    y: number, 
    size: number, 
    speed: number, 
    opacity: number, 
    delay: number
  }>>([]);
  
  // Generar partículas de fondo tecnológicas
  useEffect(() => {
    const newParticles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
      delay: Math.random() * 3
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="logo-container">
      {/* Partículas de fondo sutiles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${2 + particle.speed}s`
          }}
        />
      ))}

      {/* Logo central con máxima calidad */}
      <Link href="/mervin">
        <button className="logo-button">
          {/* Imagen del logo con efectos profesionales */}
          <img 
            src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
            alt="Mervin AI" 
            className="logo-image"
          />
          
          {/* Texto con tipografía profesional */}
          <div className="logo-text font-quantico">
            <div className="relative">
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent animate-text-reveal">
                Mervin AI
              </span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 animate-line-reveal"></span>
            </div>
            
            {/* Indicadores tecnológicos */}
            <span className="absolute -left-6 -bottom-1 w-2 h-2 bg-cyan-400 rounded-full opacity-80 animate-pulse"></span>
            <span 
              className="absolute -right-6 -bottom-1 w-2 h-2 bg-cyan-400 rounded-full opacity-80 animate-pulse"
              style={{ animationDelay: '0.5s' }}
            ></span>
          </div>
        </button>
      </Link>

      {/* Efecto de resplandor ambiental */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}
