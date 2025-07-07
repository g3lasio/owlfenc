import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pen, Type, RotateCcw, Check, AlertCircle, Smartphone, Monitor } from 'lucide-react';

interface SignatureData {
  imageData: string;
  biometrics: {
    velocity: number[];
    pressure: number[];
    timestamps: number[];
    coordinates: { x: number; y: number }[];
    totalTime: number;
    strokeCount: number;
  };
  metadata: {
    deviceType: 'mobile' | 'desktop';
    timestamp: string;
    userAgent: string;
  };
}

interface DigitalSignatureCanvasProps {
  onSignatureComplete: (signature: SignatureData) => void;
  onSignatureReset: () => void;
  signerName: string;
  signerRole: 'contractor' | 'client';
  isReadOnly?: boolean;
  existingSignature?: string;
  className?: string;
}

export default function DigitalSignatureCanvas({
  onSignatureComplete,
  onSignatureReset,
  signerName,
  signerRole,
  isReadOnly = false,
  existingSignature,
  className = ""
}: DigitalSignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');
  const [biometricData, setBiometricData] = useState<SignatureData['biometrics']>({
    velocity: [],
    pressure: [],
    timestamps: [],
    coordinates: [],
    totalTime: 0,
    strokeCount: 0
  });
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
  const [signatureQuality, setSignatureQuality] = useState<'poor' | 'good' | 'excellent'>('poor');

  // Detect device type
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setDeviceType(isMobile ? 'mobile' : 'desktop');
  }, []);

  // Load existing signature if provided
  useEffect(() => {
    if (existingSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasSignature(true);
        };
        img.src = existingSignature;
      }
    }
  }, [existingSignature]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // High DPI
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing style
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return;
    
    event.preventDefault();
    setIsDrawing(true);
    
    const coords = getCoordinates(event);
    const timestamp = Date.now();
    
    setBiometricData(prev => ({
      ...prev,
      strokeCount: prev.strokeCount + 1,
      timestamps: [...prev.timestamps, timestamp]
    }));

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isReadOnly) return;
    
    event.preventDefault();
    const coords = getCoordinates(event);
    const timestamp = Date.now();
    
    // Calculate velocity (pixels per millisecond)
    const lastTimestamp = biometricData.timestamps[biometricData.timestamps.length - 1] || timestamp;
    const lastCoords = biometricData.coordinates[biometricData.coordinates.length - 1] || coords;
    const timeDiff = timestamp - lastTimestamp;
    const distance = Math.sqrt(
      Math.pow(coords.x - lastCoords.x, 2) + Math.pow(coords.y - lastCoords.y, 2)
    );
    const velocity = timeDiff > 0 ? distance / timeDiff : 0;

    // Simulate pressure (for touch devices, use force or default to 0.5)
    const pressure = 'touches' in event && (event.touches[0] as any).force 
      ? (event.touches[0] as any).force 
      : 0.5;

    setBiometricData(prev => ({
      ...prev,
      velocity: [...prev.velocity, velocity],
      pressure: [...prev.pressure, pressure],
      timestamps: [...prev.timestamps, timestamp],
      coordinates: [...prev.coordinates, coords]
    }));

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }

    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    setBiometricData(prev => ({
      ...prev,
      totalTime: Date.now() - (prev.timestamps[0] || Date.now())
    }));

    // Analyze signature quality
    analyzeSignatureQuality();
  };

  const analyzeSignatureQuality = () => {
    const { velocity, coordinates, strokeCount, totalTime } = biometricData;
    
    // Quality metrics
    const avgVelocity = velocity.reduce((a, b) => a + b, 0) / velocity.length || 0;
    const coordinateVariance = calculateVariance(coordinates.map(c => c.x + c.y));
    const complexityScore = strokeCount * coordinates.length / (totalTime + 1);
    
    // Determine quality
    if (complexityScore > 10 && avgVelocity > 0.1 && coordinateVariance > 100) {
      setSignatureQuality('excellent');
    } else if (complexityScore > 5 && avgVelocity > 0.05) {
      setSignatureQuality('good');
    } else {
      setSignatureQuality('poor');
    }
  };

  const calculateVariance = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  };

  // Handle typed signature
  const handleTypedSignatureChange = (text: string) => {
    setTypedSignature(text);
    if (text.trim()) {
      generateTypedSignatureCanvas(text);
      generateSimulatedBiometrics(text);
      setHasSignature(true);
      setSignatureQuality('excellent'); // Typed signatures are considered high quality
    } else {
      setHasSignature(false);
      setSignatureQuality('poor');
    }
  };

  // Convert typed text to canvas using Amsterdam Four font
  const generateTypedSignatureCanvas = (text: string) => {
    const canvas = typedCanvasRef.current || canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set Amsterdam Four font styling
    ctx.font = "40px 'Amsterdam Four', cursive";
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text shadow effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    // Draw the signature text
    const centerX = canvas.width / 4; // Adjust for scale
    const centerY = canvas.height / 4;
    ctx.fillText(text, centerX, centerY);

    // Reset shadow
    ctx.shadowColor = 'transparent';
  };

  // Generate simulated biometric data for typed signatures
  const generateSimulatedBiometrics = (text: string) => {
    const typingTime = text.length * 150; // 150ms per character average
    const coordinates = [];
    const timestamps = [];
    const velocity = [];
    const pressure = [];
    
    // Simulate typing coordinates and timing
    for (let i = 0; i < text.length; i++) {
      const x = 50 + (i * 10); // Simulate cursor position
      const y = 60 + Math.random() * 10; // Slight vertical variation
      coordinates.push({ x, y });
      timestamps.push(Date.now() - typingTime + (i * 150));
      velocity.push(0.1 + Math.random() * 0.2); // Simulate typing velocity
      pressure.push(0.6 + Math.random() * 0.3); // Simulate key pressure
    }

    setBiometricData({
      velocity,
      pressure,
      timestamps,
      coordinates,
      totalTime: typingTime,
      strokeCount: text.length
    });
  };

  const clearSignature = () => {
    // Clear both canvases
    const drawCanvas = canvasRef.current;
    const typeCanvas = typedCanvasRef.current;
    
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
    
    if (typeCanvas) {
      const ctx = typeCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
    }
    
    setHasSignature(false);
    setSignatureQuality('poor');
    setTypedSignature('');
    setBiometricData({
      velocity: [],
      pressure: [],
      timestamps: [],
      coordinates: [],
      totalTime: 0,
      strokeCount: 0
    });
    
    onSignatureReset();
  };

  const saveSignature = () => {
    const canvas = signatureMode === 'type' ? typedCanvasRef.current : canvasRef.current;
    if (!canvas || !hasSignature) return;

    const imageData = canvas.toDataURL('image/png');
    
    const signatureData: SignatureData = {
      imageData,
      biometrics: biometricData,
      metadata: {
        deviceType,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent + (signatureMode === 'type' ? ' [Typed-Amsterdam]' : ' [Canvas-Draw]')
      }
    };

    onSignatureComplete(signatureData);
  };

  const getQualityColor = () => {
    switch (signatureQuality) {
      case 'excellent': return 'bg-green-600';
      case 'good': return 'bg-yellow-600';
      case 'poor': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getQualityIcon = () => {
    switch (signatureQuality) {
      case 'excellent': return <Check className="h-4 w-4" />;
      case 'good': return <AlertCircle className="h-4 w-4" />;
      case 'poor': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`cyberpunk-border ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {signatureMode === 'type' ? (
              <Type className="h-5 w-5 text-cyan-400" />
            ) : (
              <Pen className="h-5 w-5 text-cyan-400" />
            )}
            <span>Firma Digital - {signerRole === 'contractor' ? 'Contratista' : 'Cliente'}</span>
          </div>
          <div className="flex items-center gap-2">
            {deviceType === 'mobile' ? 
              <Smartphone className="h-4 w-4 text-blue-400" /> : 
              <Monitor className="h-4 w-4 text-blue-400" />
            }
            {hasSignature && (
              <Badge className={`${getQualityColor()} text-white`}>
                {getQualityIcon()}
                <span className="ml-1 capitalize">{signatureQuality}</span>
              </Badge>
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-gray-400">
          {signerName} - {signatureMode === 'type' ? 'Escriba su firma en cursiva' : (deviceType === 'mobile' ? 'Use su dedo para firmar' : 'Use el mouse para firmar')}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Signature Mode Tabs */}
        <Tabs value={signatureMode} onValueChange={(value) => {
          setSignatureMode(value as 'draw' | 'type');
          clearSignature();
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger 
              value="draw" 
              className="flex items-center gap-2 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
              disabled={isReadOnly}
            >
              <Pen className="h-4 w-4" />
              Dibujar
            </TabsTrigger>
            <TabsTrigger 
              value="type" 
              className="flex items-center gap-2 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
              disabled={isReadOnly}
            >
              <Type className="h-4 w-4" />
              Escribir Cursiva
            </TabsTrigger>
          </TabsList>

          {/* Drawing Mode */}
          <TabsContent value="draw" className="space-y-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ touchAction: 'none' }}
              />
              
              {!hasSignature && !isReadOnly && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-gray-500 text-sm">
                    {deviceType === 'mobile' ? 'Firme aquí con su dedo' : 'Firme aquí con el mouse'}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Typing Mode */}
          <TabsContent value="type" className="space-y-4">
            <div className="space-y-3">
              {/* Typed Signature Input */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Escriba su nombre para la firma cursiva..."
                  value={typedSignature}
                  onChange={(e) => handleTypedSignatureChange(e.target.value)}
                  disabled={isReadOnly}
                  className="text-center bg-gray-900 border-gray-600 text-white placeholder-gray-400"
                  maxLength={50}
                />
              </div>

              {/* Signature Preview */}
              <div className="relative">
                <div className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg bg-white flex items-center justify-center">
                  {typedSignature ? (
                    <div className="amsterdam-signature text-gray-800">
                      {typedSignature}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      Vista previa de la firma cursiva aparecerá aquí
                    </span>
                  )}
                </div>
                
                {/* Hidden canvas for image generation */}
                <canvas
                  ref={typedCanvasRef}
                  className="hidden"
                  width="400"
                  height="200"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Biometric Info Display */}
        {hasSignature && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">{signatureMode === 'type' ? 'Caracteres' : 'Trazos'}</div>
              <div className="text-cyan-400 font-mono">{biometricData.strokeCount}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Tiempo</div>
              <div className="text-cyan-400 font-mono">{(biometricData.totalTime / 1000).toFixed(1)}s</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Puntos</div>
              <div className="text-cyan-400 font-mono">{biometricData.coordinates.length}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Modo</div>
              <div className="text-cyan-400 font-mono capitalize">{signatureMode === 'type' ? 'Cursiva' : 'Canvas'}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSignature}
              disabled={!hasSignature}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
            
            <Button
              onClick={saveSignature}
              disabled={!hasSignature || (signatureMode === 'draw' && signatureQuality === 'poor')}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700"
            >
              <Check className="h-4 w-4" />
              Confirmar Firma
            </Button>
          </div>
        )}

        {/* Quality Warning (only for drawing mode) */}
        {hasSignature && signatureMode === 'draw' && signatureQuality === 'poor' && (
          <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-600 rounded">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">
              Calidad de firma baja. Intente firmar más claramente para mejor validación.
            </span>
          </div>
        )}

        {/* Typing Mode Info */}
        {signatureMode === 'type' && (
          <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-600 rounded">
            <Type className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400">
              Firma cursiva usando fuente Amsterdam Four - Escriba su nombre exactamente como desea que aparezca.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}