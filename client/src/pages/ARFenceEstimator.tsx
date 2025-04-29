
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Measurement {
  distance: number;
  timestamp: string;
}

interface Point {
  x: number;
  y: number;
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [calibrationFactor, setCalibrationFactor] = useState(1);

  useEffect(() => {
    checkCamera();
  }, []);

  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      setHasCamera(false);
    }
  };

  const startMeasurement = () => {
    setIsMeasuring(true);
    setPoints([]);
  };

  const stopMeasurement = () => {
    setIsMeasuring(false);
    setPoints([]);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMeasuring || points.length >= 2) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    if (newPoints.length === 2) {
      const distance = calculateDistance(newPoints[0], newPoints[1]);
      addMeasurement(distance * calibrationFactor);
      setPoints([]);
    }

    drawPoints();
  };

  const calculateDistance = (point1: Point, point2: Point) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const drawPoints = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !videoRef.current) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Dibujar la imagen de la cámara
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Dibujar puntos y línea
    ctx.strokeStyle = '#97fb00';
    ctx.lineWidth = 2;

    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = index === 0 ? '#97fb00' : '#97fb00';
      ctx.fill();
    });

    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    }
  };

  const addMeasurement = (pixels: number) => {
    // Convertir píxeles a pies (esto requerirá calibración)
    const feet = pixels / 100; // Factor de conversión aproximado
    const measurement = {
      distance: feet,
      timestamp: new Date().toISOString()
    };
    setMeasurements(prev => [...prev, measurement]);
  };

  useEffect(() => {
    if (isMeasuring) {
      const interval = setInterval(() => {
        drawPoints();
      }, 1000 / 30); // 30 FPS
      return () => clearInterval(interval);
    }
  }, [isMeasuring, points]);

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Medición con Cámara</CardTitle>
          <CardDescription>
            {hasCamera 
              ? "Toca para marcar los puntos de medición" 
              : "No se pudo acceder a la cámara"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasCamera ? (
            <>
              <div className="relative aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full"
                  style={{ display: isMeasuring ? 'none' : 'block' }}
                />
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="absolute inset-0 w-full h-full"
                  style={{ display: isMeasuring ? 'block' : 'none' }}
                />
              </div>
              <Button
                onClick={isMeasuring ? stopMeasurement : startMeasurement}
                className="w-full"
              >
                {isMeasuring ? "Detener Medición" : "Iniciar Medición"}
              </Button>
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              Por favor, permite el acceso a la cámara
            </div>
          )}

          <div className="space-y-4 mt-6">
            {measurements.map((m, i) => (
              <div key={i} className="border p-4 rounded-lg">
                <p className="font-medium">{m.distance.toFixed(2)} pies</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(m.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
