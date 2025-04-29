
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Measurement {
  id: string;
  type: 'length' | 'height' | 'area';
  value: number;
  unit: 'ft' | 'in' | 'sqft';
  notes?: string;
  timestamp: string;
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [note, setNote] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [xrSession, setXRSession] = useState<XRSession | null>(null);
  const [hitTestSource, setHitTestSource] = useState<XRHitTestSource | null>(null);
  const [measurePoints, setMeasurePoints] = useState<DOMPoint[]>([]);

  const startARSession = async () => {
    if (!navigator.xr) {
      alert('WebXR no está soportado en este dispositivo');
      return;
    }

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.getElementById('ar-overlay')! }
      });

      setXRSession(session);
      setupHitTesting(session);
    } catch (err) {
      console.error('Error iniciando sesión AR:', err);
    }
  };

  const setupHitTesting = async (session: XRSession) => {
    const referenceSpace = await session.requestReferenceSpace('local');
    const hitTestSource = await session.requestHitTestSource({
      space: referenceSpace
    });
    setHitTestSource(hitTestSource);
  };

  const handleMeasurement = async (type: 'length' | 'height' | 'area') => {
    setIsScanning(true);
    
    if (!xrSession) {
      await startARSession();
      return;
    }

    const frame = await new Promise<XRFrame>(resolve => {
      xrSession.requestAnimationFrame((frame) => resolve(frame));
    });

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hitPose = hitTestResults[0].getPose(frame.getViewerPose(referenceSpace)?.transform);
        
        if (hitPose) {
          const point = new DOMPoint(
            hitPose.transform.position.x,
            hitPose.transform.position.y,
            hitPose.transform.position.z
          );
          
          setMeasurePoints(prev => [...prev, point]);

          // Calcular distancia cuando tengamos dos puntos
          if (measurePoints.length >= 1) {
            const distance = calculateDistance(measurePoints[0], point);
            const measurement: Measurement = {
              id: `m-${Date.now()}`,
              type,
              value: Math.round(distance * 3.28084 * 100) / 100, // Convertir metros a pies
              unit: type === 'area' ? 'sqft' : 'ft',
              notes: note,
              timestamp: new Date().toISOString()
            };

            setMeasurements(prev => [...prev, measurement]);
            setMeasurePoints([]);
            setNote('');
            setIsScanning(false);
          }
        }
      }
    }
  };

  const calculateDistance = (point1: DOMPoint, point2: DOMPoint): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
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
        <h1 className="text-3xl font-bold">Medición AR</h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Nueva Medición</CardTitle>
          <CardDescription>Toca dos puntos en el espacio para medir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Añade notas sobre esta medición..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button 
              onClick={() => handleMeasurement('length')} 
              disabled={isScanning}
            >
              {isScanning ? 'Midiendo...' : 'Medir Longitud'}
            </Button>
            <Button 
              onClick={() => handleMeasurement('height')} 
              disabled={isScanning}
            >
              {isScanning ? 'Midiendo...' : 'Medir Altura'}
            </Button>
            <Button 
              onClick={() => handleMeasurement('area')} 
              disabled={isScanning}
            >
              {isScanning ? 'Midiendo...' : 'Medir Área'}
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
                <div key={m.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        {m.type === 'length' ? 'Longitud' : 
                         m.type === 'height' ? 'Altura' : 'Área'}: {m.value.toFixed(2)} {m.unit}
                      </p>
                      {m.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{m.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
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

      <div id="ar-overlay" className="fixed inset-0 pointer-events-none">
        {/* Aquí se mostrarán los elementos AR superpuestos */}
      </div>
    </div>
  );
}
