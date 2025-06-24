
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
    <div className="page-container" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      height: '100vh',
      width: '100%',
      backgroundColor: '#0F172A'
    }}>
      <Link href="/mervin">
        <button style={{ 
          position: 'relative',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          width: '200px',
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          margin: '0 auto',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          
          {/* Resplandor circular futurista */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 40%, rgba(0,255,255,0.1) 60%, rgba(0,255,255,0.3) 80%, rgba(0,255,255,0.1) 100%)',
            animation: 'borderGlow 3s ease-in-out infinite'
          }}></div>
          
          {/* Imagen del logo con pulsaciones */}
          <img 
            src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
            alt="Mervin AI" 
            style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              zIndex: 10,
              animation: 'logoGlow 2.5s ease-in-out infinite'
            }}
          />
          
          {/* Texto de Mervin AI con efecto de aparición - CORREGIDO Y VISIBLE */}
          <div style={{
            position: 'absolute',
            bottom: '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '20px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            letterSpacing: '0.1em',
            zIndex: 10,
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                background: 'linear-gradient(to right, #22d3ee, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block',
                animation: 'fadeIn 2s ease-in-out'
              }}>
                Mervin AI
              </span>
              <span style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '100%',
                height: '2px',
                background: 'linear-gradient(to right, #22d3ee, #3b82f6)',
                animation: 'expandWidth 2s ease-in-out'
              }}></span>
            </div>
            {/* Marcadores de tecnología futurista */}
            <span style={{
              position: 'absolute',
              left: '-16px',
              bottom: '-4px',
              height: '8px',
              width: '8px',
              backgroundColor: '#22d3ee',
              borderRadius: '50%',
              opacity: 0.7,
              animation: 'pulse 2s infinite'
            }}></span>
            <span style={{
              position: 'absolute',
              right: '-16px',
              bottom: '-4px',
              height: '8px',
              width: '8px',
              backgroundColor: '#22d3ee',
              borderRadius: '50%',
              opacity: 0.7,
              animation: 'pulse 2s infinite',
              animationDelay: '0.5s'
            }}></span>
          </div>
        </button>
      </Link>
    </div>
  );
}
