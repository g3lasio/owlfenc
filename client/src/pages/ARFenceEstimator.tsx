
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Point {
  x: number;
  y: number;
  label: string;
}

interface Measurement {
  id: string;
  points: Point[];
  distance: number;
  area?: number;
  timestamp: string;
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [calibrationFactor, setCalibrationFactor] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    initCamera();
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current!.videoWidth;
            canvasRef.current.height = videoRef.current!.videoHeight;
          }
        };
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  const calibrate = () => {
    // Usar un objeto de referencia conocido (por ejemplo, una hoja de papel tamaño carta)
    const knownLength = 11; // pulgadas
    setCalibrationFactor(knownLength / 100); // Asumiendo 100px como referencia inicial
    setIsCalibrating(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoint: Point = {
      x,
      y,
      label: String.fromCharCode(65 + currentPoints.length) // A, B, C, etc.
    };

    setCurrentPoints(prev => [...prev, newPoint]);
    drawMeasurement([...currentPoints, newPoint]);
  };

  const calculateDistance = (p1: Point, p2: Point): number => {
    const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    return pixelDistance * calibrationFactor;
  };

  const calculateArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    const [p1, p2, p3] = points;
    const base = calculateDistance(p1, p2);
    const height = calculateDistance(p2, p3);
    return base * height;
  };

  const drawMeasurement = (points: Point[]) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Dibujar líneas y puntos
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#00ff00';
    ctx.font = '20px Arial';

    points.forEach((point, i) => {
      // Dibujar punto
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Dibujar etiqueta
      ctx.fillText(point.label, point.x + 10, point.y - 10);

      // Dibujar línea al punto anterior
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();

        // Mostrar medida en la línea
        const distance = calculateDistance(points[i - 1], point);
        const midX = (points[i - 1].x + point.x) / 2;
        const midY = (points[i - 1].y + point.y) / 2;
        const feet = Math.floor(distance);
        const inches = Math.round((distance % 1) * 12);
        ctx.fillText(`${feet}'${inches}"`, midX, midY - 10);
      }
    });

    // Si tenemos 3 puntos, mostrar área
    if (points.length === 3) {
      const area = calculateArea(points);
      const sqft = Math.round(area);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${sqft} sq ft`, points[1].x + 20, points[1].y + 20);
    }
  };

  const finalizeMeasurement = () => {
    if (currentPoints.length < 2) return;

    const measurement: Measurement = {
      id: `m-${Date.now()}`,
      points: currentPoints,
      distance: calculateDistance(currentPoints[0], currentPoints[1]),
      area: currentPoints.length === 3 ? calculateArea(currentPoints) : undefined,
      timestamp: new Date().toISOString()
    };

    setMeasurements(prev => [...prev, measurement]);
    setCurrentPoints([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <i className="ri-ruler-line text-3xl text-primary"></i>
        </div>
        <h1 className="text-3xl font-bold">Medición Digital</h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Nueva Medición</CardTitle>
          <CardDescription>
            {isCalibrating 
              ? "Calibra usando una hoja de papel tamaño carta como referencia"
              : "Toca la pantalla para marcar puntos de medición"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="absolute inset-0 w-full h-full"
            />
          </div>

          <div className="flex gap-2">
            {isCalibrating ? (
              <Button onClick={calibrate} className="w-full">
                Calibrar con Referencia
              </Button>
            ) : (
              <>
                <Button 
                  onClick={finalizeMeasurement}
                  disabled={currentPoints.length < 2}
                  className="w-full"
                >
                  Finalizar Medición
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCurrentPoints([])}
                  className="w-full"
                >
                  Limpiar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medidas Guardadas</CardTitle>
        </CardHeader>
        <CardContent>
          {measurements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay medidas guardadas
            </p>
          ) : (
            <div className="space-y-4">
              {measurements.map((m) => (
                <div key={m.id} className="border p-4 rounded-lg bg-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg mb-1">
                        Medición {m.points.map(p => p.label).join(' → ')}
                      </p>
                      <p className="text-md text-primary">
                        {Math.floor(m.distance)}'
                        {Math.round((m.distance % 1) * 12)}"
                      </p>
                      {m.area && (
                        <p className="text-sm text-primary mt-1">
                          Área: {Math.round(m.area)} sq ft
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(m.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMeasurements(prev => prev.filter(measurement => measurement.id !== m.id))}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
