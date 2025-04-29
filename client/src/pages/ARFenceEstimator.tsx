import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as THREE from 'three';

interface Point {
  id: string;
  position: THREE.Vector3;
  worldPosition: THREE.Vector3;
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
  const xrSessionRef = useRef<XRSession | null>(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    checkARSupport();
    initCamera(); // Keep the original camera initialization for fallback
  }, []);

  const checkARSupport = async () => {
    if ('xr' in navigator) {
      try {
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        setIsARSupported(isSupported);
      } catch (err) {
        console.error('Error checking AR support:', err);
        setIsARSupported(false);
      }
    }
  };

  const startARSession = async () => {
    if (!isARSupported) return;

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor', 'anchors'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ar-overlay')! }
      });

      xrSessionRef.current = session;
      setIsScanning(true);

      session.addEventListener('end', () => {
        xrSessionRef.current = null;
        setIsScanning(false);
      });

      // Configurar sistema de referencia XR
      const referenceSpace = await session.requestReferenceSpace('local-floor');
      const viewerSpace = await session.requestReferenceSpace('viewer');

      session.addEventListener('select', (event) => {
        const frame = event.frame;
        const pose = frame.getPose(viewerSpace, referenceSpace);

        if (pose) {
          const point: Point = {
            id: `p-${Date.now()}`,
            position: new THREE.Vector3().fromArray(pose.transform.position),
            worldPosition: new THREE.Vector3().fromArray(pose.transform.position),
            screenX: event.inputSource.gamepad?.axes[0] || 0,
            screenY: event.inputSource.gamepad?.axes[1] || 0
          };

          handlePointPlacement(point);
        }
      });

    } catch (err) {
      console.error('Error starting AR session:', err);
      alert('No se pudo iniciar la sesión AR. Por favor, verifica los permisos y compatibilidad.');
    }
  };

  const handlePointPlacement = (point: Point) => {
    if (!isDrawing) {
      setStartPoint(point);
      setIsDrawing(true);
      drawPoint(point, 'A');
    } else {
      finalizeMeasurement([startPoint!, point]);
      setIsDrawing(false);
    }
  };

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


  const calculateRealWorldDistance = (point1: Point, point2: Point): number => {
    return point1.worldPosition.distanceTo(point2.worldPosition);
  };

  const drawPoint = (point: Point, label: string) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(point.screenX, point.screenY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillText(label, point.screenX + 10, point.screenY);
    }
  };

  const finalizeMeasurement = (points: Point[]) => {
    if (points.length < 2) return;

    const value = calculateRealWorldDistance(points[0], points[1]);

    const measurement: Measurement = {
      id: `m-${Date.now()}`,
      points: points,
      value: Math.round(value * 100) / 100,
      unit: 'ft',
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
        <h1 className="text-3xl font-bold">Medición AR Precisa</h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Nueva Medición</CardTitle>
          <CardDescription>
            {isARSupported
              ? 'Utiliza AR para mediciones precisas'
              : 'Tu dispositivo no soporta AR'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={startARSession}
            disabled={!isARSupported || isScanning}
            className="w-full"
          >
            {isScanning ? 'Midiendo...' : 'Iniciar Medición AR'}
          </Button>

          <div id="ar-overlay" className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
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