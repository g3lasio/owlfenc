
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as THREE from 'three';

interface Measurement {
  id: string;
  distance: number;
  unit: string;
  timestamp: string;
  notes?: string;
}

interface CalibrationMarker {
  x: number;
  y: number;
  size: number; // tamaño real en pulgadas
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [referenceMarker, setReferenceMarker] = useState<CalibrationMarker | null>(null);
  const [measurementInProgress, setMeasurementInProgress] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [note, setNote] = useState('');
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

  const startCalibration = () => {
    setCalibrationMode(true);
    setReferenceMarker(null);
    clearCanvas();
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (calibrationMode) {
      // Modo calibración: establecer marcador de referencia
      setReferenceMarker({
        x,
        y,
        size: 12 // Una hoja de papel estándar (11 pulgadas)
      });
      setCalibrationMode(false);
      drawCalibrationMarker(x, y);
    } else if (!measurementInProgress) {
      // Iniciar medición
      setStartPoint({ x, y });
      setMeasurementInProgress(true);
      drawPoint(x, y, 'A');
    } else {
      // Finalizar medición
      finalizeMeasurement(x, y);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!measurementInProgress || !startPoint || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      clearCanvas();
      if (referenceMarker) drawCalibrationMarker(referenceMarker.x, referenceMarker.y);
      drawPoint(startPoint.x, startPoint.y, 'A');
      drawLine(startPoint.x, startPoint.y, x, y);
      const distance = calculateDistance(startPoint.x, startPoint.y, x, y);
      drawMeasurement(distance, (startPoint.x + x) / 2, (startPoint.y + y) / 2);
    }
  };

  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    if (!referenceMarker) return 0;

    const pixelDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const scale = referenceMarker.size / 30; // Factor de escala basado en el marcador de referencia
    return (pixelDistance * scale) / 12; // Convertir a pies
  };

  const finalizeMeasurement = (endX: number, endY: number) => {
    if (!startPoint) return;

    const distance = calculateDistance(startPoint.x, startPoint.y, endX, endY);
    const measurement: Measurement = {
      id: `m-${Date.now()}`,
      distance: Math.round(distance * 100) / 100,
      unit: 'ft',
      timestamp: new Date().toISOString(),
      notes: note
    };

    setMeasurements(prev => [...prev, measurement]);
    setMeasurementInProgress(false);
    setStartPoint(null);
    setNote('');
    clearCanvas();
    if (referenceMarker) drawCalibrationMarker(referenceMarker.x, referenceMarker.y);
  };

  const drawPoint = (x: number, y: number, label: string) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillText(label, x + 10, y);
    }
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  const drawCalibrationMarker = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(x - 15, y - 15, 30, 30);
      ctx.stroke();
      ctx.fillStyle = '#ff0000';
      ctx.fillText('Referencia', x + 20, y);
    }
  };

  const drawMeasurement = (distance: number, x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText(`${distance.toFixed(2)} ft`, x, y - 10);
    }
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
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
        <h1 className="text-3xl font-bold">Medición con Referencia</h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Nueva Medición</CardTitle>
          <CardDescription>
            Use un objeto de referencia (ej: hoja de papel) para calibrar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={startCalibration}
            disabled={measurementInProgress}
            className="w-full mb-4"
          >
            {calibrationMode ? 'Coloque el marcador de referencia' : 'Calibrar Medición'}
          </Button>

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
              onMouseMove={handleCanvasMouseMove}
              className="absolute inset-0 w-full h-full"
            />
          </div>

          <Input
            placeholder="Título/Nota para esta medida..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
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
                        {m.notes || `Medición ${m.id}`}
                      </p>
                      <p className="text-md text-primary">
                        {m.distance.toFixed(2)} {m.unit}
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
