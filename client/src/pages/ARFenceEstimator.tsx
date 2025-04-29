
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as THREE from 'three';

interface Point {
  id: string;
  position: THREE.Vector3;
  screenX: number;
  screenY: number;
}

interface Measurement {
  id: string;
  points: Point[];
  value: number;
  unit: string;
  type: 'linear' | 'area';
  notes?: string;
  timestamp: string;
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [note, setNote] = useState('');
  const [measurementType, setMeasurementType] = useState<'linear' | 'area'>('linear');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);

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
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const point: Point = {
      id: `p-${Date.now()}`,
      position: new THREE.Vector3(x, y, 0),
      screenX: x,
      screenY: y
    };

    if (!isDrawing) {
      // Primer punto (A)
      setStartPoint(point);
      setIsDrawing(true);
      clearCanvas();
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText('A', x + 10, y);
      }
    } else {
      // Segundo punto (B) y finalizar medición
      setIsDrawing(false);
      setCurrentPoints([startPoint!, point]);
      finalizeMeasurement();
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Redibujar la línea en tiempo real
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      clearCanvas();
      
      // Redibujar punto A
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(startPoint.screenX, startPoint.screenY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillText('A', startPoint.screenX + 10, startPoint.screenY);

      // Dibujar línea temporal
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startPoint.screenX, startPoint.screenY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Mostrar distancia en tiempo real
      const distance = calculateDistance(startPoint, { 
        id: 'temp', 
        position: new THREE.Vector3(x, y, 0),
        screenX: x,
        screenY: y 
      });
      ctx.fillText(`${distance.toFixed(2)} ft`, (startPoint.screenX + x) / 2, (startPoint.screenY + y) / 2);
    }
  };

    // Completar medición si tenemos suficientes puntos
    if (measurementType === 'linear' && currentPoints.length >= 1) {
      finalizeMeasurement();
    } else if (measurementType === 'area' && currentPoints.length >= 2) {
      finalizeMeasurement();
    }
  };

  const calculateDistance = (point1: Point, point2: Point): number => {
    const dx = point2.screenX - point1.screenX;
    const dy = point2.screenY - point1.screenY;
    // Factor de escala aproximado basado en la resolución de la cámara
    const scaleFactor = 0.01; // Ajustar según calibración
    return Math.sqrt(dx * dx + dy * dy) * scaleFactor;
  };

  const calculateArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].screenX * points[j].screenY;
      area -= points[j].screenX * points[i].screenY;
    }
    const scaleFactor = 0.0001; // Ajustar según calibración
    return Math.abs(area / 2) * scaleFactor;
  };

  const finalizeMeasurement = () => {
    if (currentPoints.length < 2) return;

    const value = measurementType === 'linear' 
      ? calculateDistance(currentPoints[0], currentPoints[currentPoints.length - 1])
      : calculateArea(currentPoints);

    const measurement: Measurement = {
      id: `m-${Date.now()}`,
      points: currentPoints,
      value: Math.round(value * 100) / 100,
      unit: measurementType === 'linear' ? 'ft' : 'sq ft',
      type: measurementType,
      notes: note,
      timestamp: new Date().toISOString()
    };

    setMeasurements(prev => [...prev, measurement]);
    clearCanvas();
    setCurrentPoints([]);
    setNote('');
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const deleteMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <i className="ri-ruler-line text-3xl text-primary"></i>
        </div>
        <h1 className="text-3xl font-bold">Medición con Cámara</h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Nueva Medición</CardTitle>
          <CardDescription>
            {measurementType === 'linear' 
              ? 'Toca dos puntos para medir distancia' 
              : 'Toca tres o más puntos para medir área'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => {
                setMeasurementType('linear');
                clearCanvas();
                setCurrentPoints([]);
              }}
              variant={measurementType === 'linear' ? 'default' : 'outline'}
            >
              Distancia
            </Button>
            <Button
              onClick={() => {
                setMeasurementType('area');
                clearCanvas();
                setCurrentPoints([]);
              }}
              variant={measurementType === 'area' ? 'default' : 'outline'}
            >
              Área
            </Button>
          </div>

          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              className="absolute inset-0 w-full h-full"
            />
          </div>

          <Input
            placeholder="Título/Nota para esta medida..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex gap-2">
            <Button 
              onClick={finalizeMeasurement}
              disabled={currentPoints.length < 2}
              className="flex-1"
            >
              Finalizar Medición
            </Button>
            <Button 
              onClick={() => {
                clearCanvas();
                setCurrentPoints([]);
              }}
              variant="outline"
            >
              Limpiar
            </Button>
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
                        {m.notes || `${m.type === 'linear' ? 'Distancia' : 'Área'} sin título`}
                      </p>
                      <p className="text-md text-primary">
                        {m.value.toFixed(2)} {m.unit}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(m.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMeasurement(m.id)}
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
