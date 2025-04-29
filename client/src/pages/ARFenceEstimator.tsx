import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface Measurement {
  id: string;
  distance: number;
  unit: string;
  timestamp: string;
  notes?: string;
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [note, setNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    initCamera();
    loadModel();
  }, []);

  const loadModel = async () => {
    try {
      const loadedModel = await cocoSsd.load({
        base: 'lite_mobilenet_v2',  // Usar versión más ligera del modelo
        modelUrl: 'https://storage.googleapis.com/tfjs-models/tfjs/coco-ssd/lite_mobilenet_v2/model.json'
      });
      setModel(loadedModel);
      setIsModelLoading(false);
    } catch (err) {
      console.error('Error cargando el modelo:', err);
      alert('Error al cargar el modelo de detección. Por favor, recarga la página.');
      setIsModelLoading(false);
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

  const detectObjects = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const predictions = await model.detect(videoRef.current);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;

      // Dibujar el rectángulo de detección
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Calcular medidas reales aproximadas (asumiendo una distancia promedio)
      const realWorldWidth = calculateRealWorldDimension(width);
      const realWorldHeight = calculateRealWorldDimension(height);

      // Mostrar medidas
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText(`${realWorldWidth.toFixed(2)} ft x ${realWorldHeight.toFixed(2)} ft`, x, y - 5);
    });
  };

  const calculateRealWorldDimension = (pixels: number): number => {
    // Factor de conversión aproximado (ajustar según necesidad)
    const PIXELS_PER_FOOT = 50;
    return pixels / PIXELS_PER_FOOT;
  };

  const captureMeasurement = async () => {
    if (!model || !videoRef.current) return;

    const predictions = await model.detect(videoRef.current);
    if (predictions.length > 0) {
      const largestObject = predictions.reduce((prev, current) => 
        (current.bbox[2] * current.bbox[3]) > (prev.bbox[2] * prev.bbox[3]) ? current : prev
      );

      const [, , width, height] = largestObject.bbox;
      const realWorldWidth = calculateRealWorldDimension(width);
      const realWorldHeight = calculateRealWorldDimension(height);

      const measurement: Measurement = {
        id: `m-${Date.now()}`,
        distance: realWorldWidth,
        unit: 'ft',
        timestamp: new Date().toISOString(),
        notes: `${note || 'Medición automática'} (${realWorldWidth.toFixed(2)} x ${realWorldHeight.toFixed(2)} ft)`
      };

      setMeasurements(prev => [...prev, measurement]);
      setNote('');
    }
  };

  useEffect(() => {
    let animationFrame: number;

    const detectLoop = () => {
      detectObjects();
      animationFrame = requestAnimationFrame(detectLoop);
    };

    if (!isModelLoading) {
      detectLoop();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isModelLoading, model]);

  const deleteMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <i className="ri-ruler-line text-3xl text-primary"></i>
        </div>
        <h1 className="text-3xl font-bold">Medición Automática</h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Nueva Medición</CardTitle>
          <CardDescription>
            Apunte la cámara al objeto a medir
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
              className="absolute inset-0 w-full h-full"
            />
            {isModelLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                <p className="text-white">Cargando modelo de medición...</p>
                <p className="text-white/70 text-sm mt-2">Esto puede tomar unos segundos</p>
              </div>
            )}
          </div>

          <Input
            placeholder="Título/Nota para esta medida..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Button
            onClick={captureMeasurement}
            disabled={isModelLoading}
            className="w-full"
          >
            Capturar Medición
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