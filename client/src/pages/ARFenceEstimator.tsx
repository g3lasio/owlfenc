
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  const [referenceLength, setReferenceLength] = useState<number>(0);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [pixelsPerFoot, setPixelsPerFoot] = useState(0);
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

  const handleCalibration = () => {
    if (currentPoints.length !== 2 || !referenceLength) return;

    const pixelDistance = calculatePixelDistance(currentPoints[0], currentPoints[1]);
    const calculatedPixelsPerFoot = pixelDistance / referenceLength;
    setPixelsPerFoot(calculatedPixelsPerFoot);
    setIsCalibrating(false);
    setCurrentPoints([]);
    clearCanvas();
  };

  const calculatePixelDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoint: Point = {
      x,
      y,
      label: String.fromCharCode(65 + currentPoints.length)
    };

    const updatedPoints = [...currentPoints, newPoint];
    setCurrentPoints(updatedPoints);
    drawPoints(updatedPoints);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const drawPoints = (points: Point[]) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    clearCanvas();

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#00ff00';
    ctx.font = '20px Arial';

    points.forEach((point, i) => {
      // Dibujar punto
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillText(point.label, point.x + 10, point.y - 10);

      // Dibujar línea al punto anterior
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();

        const distance = calculateDistance(points[i - 1], point);
        const midX = (points[i - 1].x + point.x) / 2;
        const midY = (points[i - 1].y + point.y) / 2;
        ctx.fillText(`${distance.toFixed(2)} ft`, midX, midY - 10);
      }
    });

    // Calcular y mostrar área si hay 3 puntos
    if (points.length === 3) {
      const area = calculateArea(points);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${area.toFixed(2)} sq ft`, points[1].x + 20, points[1].y + 20);
    }
  };

  const calculateDistance = (p1: Point, p2: Point): number => {
    const pixelDistance = calculatePixelDistance(p1, p2);
    return pixelDistance / pixelsPerFoot;
  };

  const calculateArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    const [p1, p2, p3] = points;
    const base = calculateDistance(p1, p2);
    const height = calculateDistance(p2, p3);
    return base * height;
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
    clearCanvas();
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
              ? "Marca dos puntos y especifica la distancia real entre ellos para calibrar"
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
              <>
                <Input
                  type="number"
                  placeholder="Distancia en pies"
                  value={referenceLength || ''}
                  onChange={(e) => setReferenceLength(parseFloat(e.target.value))}
                  className="w-full"
                />
                <Button 
                  onClick={handleCalibration}
                  disabled={currentPoints.length !== 2 || !referenceLength}
                  className="whitespace-nowrap"
                >
                  Calibrar
                </Button>
              </>
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
                  onClick={() => {
                    setCurrentPoints([]);
                    clearCanvas();
                  }}
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
                        {m.distance.toFixed(2)} ft
                      </p>
                      {m.area && (
                        <p className="text-sm text-primary mt-1">
                          Área: {m.area.toFixed(2)} sq ft
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
