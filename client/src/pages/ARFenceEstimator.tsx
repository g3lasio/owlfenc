import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Measurement {
  distance: number;
  timestamp: string;
}

export default function ARFenceEstimator() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const arSessionRef = useRef<any>(null);
  const startPointRef = useRef<any>(null);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    // Detectar si es iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // En iOS, verificar si el navegador es Safari
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (!isSafari) {
        alert('Por favor abre esta página en Safari para usar AR en iOS');
        setIsSupported(false);
        return;
      }
      
      // Verificar soporte de ARKit
      if ('ARKit' in window || 'WebXRViewer' in window) {
        setIsSupported(true);
        return;
      }
    }
    
    // Para otros dispositivos, intentar WebXR
    const webXRSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-ar');
    setIsSupported(webXRSupported);
  };

  const startMeasurement = async () => {
    setIsMeasuring(true);
    try {
      if ('measurementAPI' in window) {
        const measurement = await (window as any).measurementAPI.start();
        if (measurement) {
          addMeasurement(measurement.distance);
        }
      } else if (navigator.xr) {
        const session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
        });
        arSessionRef.current = session;
        session.addEventListener('end', () => setIsMeasuring(false));

        session.addEventListener('select', (event: any) => {
          if (!startPointRef.current) {
            startPointRef.current = event.frame.getPose(event.inputSource.targetRaySpace, event.referenceSpace);
          } else {
            const endPoint = event.frame.getPose(event.inputSource.targetRaySpace, event.referenceSpace);
            const distance = calculateDistance(startPointRef.current.transform.position, endPoint.transform.position);
            addMeasurement(distance);
            startPointRef.current = null;
          }
        });
      }
    } catch (error) {
      console.error('Error iniciando medición AR:', error);
      setIsMeasuring(false);
    }
  };

  const calculateDistance = (point1: any, point2: any) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const addMeasurement = (distance: number) => {
    const measurement = {
      distance: distance,
      timestamp: new Date().toISOString()
    };
    setMeasurements(prev => [...prev, measurement]);
    setIsMeasuring(false);
  };

  const stopMeasurement = () => {
    if (arSessionRef.current) {
      arSessionRef.current.end();
      arSessionRef.current = null;
    }
    setIsMeasuring(false);
    startPointRef.current = null;
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Medición AR</CardTitle>
          <CardDescription>
            {isSupported
              ? "Utiliza la cámara para medir distancias con precisión"
              : "Tu dispositivo no soporta medición AR"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSupported ? (
            <Button
              onClick={isMeasuring ? stopMeasurement : startMeasurement}
              className="w-full"
            >
              {isMeasuring ? "Detener Medición" : "Iniciar Medición"}
            </Button>
          ) : (
            <div className="text-center text-muted-foreground">
              Por favor, usa un dispositivo compatible con AR
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