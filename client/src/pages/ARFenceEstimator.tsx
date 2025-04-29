import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as THREE from 'three';

interface Measurement {
  id: string;
  value: number;
  unit: string;
  notes?: string;
  timestamp: string;
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [note, setNote] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);

  useEffect(() => {
    initCamera();
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  const handleMeasurement = () => {
    setIsScanning(true);
    if (measurePoints.length >= 2) {
      const distance = calculateDistance(measurePoints[0], measurePoints[1]);
      const measurement: Measurement = {
        id: `m-${Date.now()}`,
        value: Math.round(distance * 100) / 100,
        unit: 'ft',
        notes: note,
        timestamp: new Date().toISOString()
      };

      setMeasurements(prev => [...prev, measurement]);
      setMeasurePoints([]);
      setNote('');
    }
    setIsScanning(false);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Crear un punto 3D (simplificado para demo)
    const point = new THREE.Vector3(x, y, 0);
    setMeasurePoints(prev => [...prev, point]);

    if (measurePoints.length >= 1) {
      handleMeasurement();
    }
  };

  const calculateDistance = (point1: THREE.Vector3, point2: THREE.Vector3): number => {
    return point1.distanceTo(point2) * 0.1; // Factor de escala aproximado a pies
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
          <CardDescription>Toca dos puntos en la imagen para medir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <Input
            placeholder="Título/Nota para esta medida..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mb-2"
          />
          <Button 
            onClick={handleMeasurement}
            disabled={isScanning}
            className="w-full"
          >
            {isScanning ? 'Midiendo...' : 'Tomar Medida'}
          </Button>
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
                        {m.notes || 'Medida sin título'}
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