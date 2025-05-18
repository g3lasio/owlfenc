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

  return (
    <div className="home-container w-full h-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">Welcome to Owl Fence</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Your AI-powered fence estimation and management solution
        </p>
      </div>
    </div>
  );
}