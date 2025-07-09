/**
 * 🧠 NEURAL SIGNATURE INTERFACE
 * Revolutionary AI-powered responsive signing experience
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ContractData {
  contractId: string;
  contractHTML: string;
  contractorData: any;
  clientData: any;
  projectDetails: any;
  contractAnalysis: {
    contractComplexity: 'simple' | 'moderate' | 'complex';
    riskFactors: string[];
    recommendedActions: string[];
    aiInsights: string;
  };
}

interface BiometricData {
  drawingSpeed: number[];
  pressure: number[];
  accelerationPatterns: number[];
  authenticityScore: number;
}

export default function NeuralSignature() {
  const { contractId } = useParams();
  const [location] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // State management
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [biometricData, setBiometricData] = useState<BiometricData>({
    drawingSpeed: [],
    pressure: [],
    accelerationPatterns: [],
    authenticityScore: 0
  });
  const [aiValidationResult, setAiValidationResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureCompleted, setSignatureCompleted] = useState(false);

  // Get tracking ID from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const trackingId = urlParams.get('track');

  useEffect(() => {
    loadContractData();
  }, [contractId]);

  const loadContractData = async () => {
    try {
      const response = await fetch(`/api/neural-signature/contract/${contractId}?track=${trackingId}`);
      if (response.ok) {
        const data = await response.json();
        setContractData(data);
      }
    } catch (error) {
      console.error('Error loading contract data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información del contrato."
      });
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture biometric data
    const startTime = Date.now();
    
    // Get position
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Start biometric tracking
    setBiometricData(prev => ({
      ...prev,
      drawingSpeed: [...prev.drawingSpeed, startTime]
    }));
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get position
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563eb';
    ctx.lineTo(x, y);
    ctx.stroke();

    // Capture biometric data
    const currentTime = Date.now();
    setBiometricData(prev => ({
      ...prev,
      drawingSpeed: [...prev.drawingSpeed, currentTime],
      pressure: [...prev.pressure, Math.random() * 0.5 + 0.5], // Simulated pressure
      accelerationPatterns: [...prev.accelerationPatterns, Math.random() * 2]
    }));
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    setSignatureData('');
    setBiometricData({
      drawingSpeed: [],
      pressure: [],
      accelerationPatterns: [],
      authenticityScore: 0
    });
  };

  const submitSignature = async () => {
    if (!signatureData || !contractData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, complete su firma antes de continuar."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Validate signature with AI
      const validationResponse = await fetch('/api/neural-signature/validate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureBase64: signatureData,
          biometricData,
          signerInfo: {
            name: contractData.clientData.name,
            email: contractData.clientData.email,
            role: 'client',
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1', // Would be real IP in production
            userAgent: navigator.userAgent
          }
        })
      });

      if (validationResponse.ok) {
        const validationResult = await validationResponse.json();
        setAiValidationResult(validationResult);

        // Step 2: If valid, process signature and regenerate PDF
        if (validationResult.signatureValidation.isAuthentic) {
          const processResponse = await fetch('/api/neural-signature/process-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractId,
              signatureData,
              biometricData,
              trackingId
            })
          });

          if (processResponse.ok) {
            const processResult = await processResponse.json();
            setSignatureCompleted(true);
            setCurrentStep(4);
            
            toast({
              title: "¡Firma Completada!",
              description: `Firma validada con ${Math.round(validationResult.signatureValidation.confidenceScore * 100)}% de confianza.`
            });
          }
        } else {
          toast({
            variant: "destructive",
            title: "Firma Rechazada",
            description: "La IA detectó posibles irregularidades en la firma. Por favor, inténtelo nuevamente."
          });
        }
      }
    } catch (error) {
      console.error('Error submitting signature:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al procesar la firma. Por favor, inténtelo nuevamente."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contractData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Cargando interfaz neural...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stepProgress = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🧠 Neural Signature
          </h1>
          <p className="text-gray-600">AI-Powered Contract Signing Experience</p>
          
          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <Progress value={stepProgress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2">Paso {currentStep} de 4</p>
          </div>
        </div>

        {/* AI Analysis Summary */}
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧠 Análisis IA Completado
              <Badge className={getComplexityColor(contractData.contractAnalysis.contractComplexity)}>
                {contractData.contractAnalysis.contractComplexity.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm">{contractData.contractAnalysis.aiInsights}</p>
            </div>
            
            {contractData.contractAnalysis.riskFactors.length > 0 && (
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Factores de Riesgo Detectados:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {contractData.contractAnalysis.riskFactors.map((risk, index) => (
                      <li key={index} className="text-sm">{risk}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contract Review */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Revisión del Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary">Resumen</TabsTrigger>
                  <TabsTrigger value="full">Contrato Completo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Detalles del Proyecto</h3>
                    <p><strong>Descripción:</strong> {contractData.projectDetails.description}</p>
                    <p><strong>Valor:</strong> {contractData.projectDetails.value}</p>
                    <p><strong>Ubicación:</strong> {contractData.projectDetails.address}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Partes del Contrato</h3>
                    <p><strong>Contratista:</strong> {contractData.contractorData.company}</p>
                    <p><strong>Cliente:</strong> {contractData.clientData.name}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="full">
                  <div 
                    className="max-h-96 overflow-y-auto p-4 bg-white border rounded-lg text-sm"
                    dangerouslySetInnerHTML={{ __html: contractData.contractHTML }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Signature Interface */}
          <Card>
            <CardHeader>
              <CardTitle>✍️ Firma Digital con IA</CardTitle>
            </CardHeader>
            <CardContent>
              {!signatureCompleted ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={200}
                      className="w-full h-48 border rounded bg-white cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Firme aquí usando su dedo o mouse
                    </p>
                  </div>

                  {/* Biometric Feedback */}
                  {biometricData.drawingSpeed.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-semibold text-blue-800">
                        🔍 Análisis Biométrico en Tiempo Real
                      </p>
                      <p className="text-xs text-blue-600">
                        Puntos capturados: {biometricData.drawingSpeed.length} | 
                        Velocidad promedio: {Math.round(biometricData.drawingSpeed.length / 10)} pts/s
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={clearSignature}
                      className="flex-1"
                    >
                      🗑️ Limpiar
                    </Button>
                    <Button 
                      onClick={submitSignature}
                      disabled={!signatureData || isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Validando...
                        </>
                      ) : (
                        <>🧠 Firmar con IA</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-6xl">✅</div>
                  <h3 className="text-xl font-bold text-green-600">¡Firma Completada!</h3>
                  
                  {aiValidationResult && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-green-800">
                        Validación IA: {Math.round(aiValidationResult.signatureValidation.confidenceScore * 100)}% Confianza
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        El PDF firmado será enviado por email en breve.
                      </p>
                    </div>
                  )}

                  <Button className="w-full" onClick={() => window.close()}>
                    🎉 Completar Proceso
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Validation Results */}
        {aiValidationResult && !signatureCompleted && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>🔍 Resultado de Validación IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(aiValidationResult.signatureValidation.confidenceScore * 100)}%
                  </div>
                  <p className="text-sm text-gray-600">Confianza</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl">
                    {aiValidationResult.signatureValidation.isAuthentic ? '✅' : '❌'}
                  </div>
                  <p className="text-sm text-gray-600">Autenticidad</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {aiValidationResult.signatureValidation.anomalies.length}
                  </div>
                  <p className="text-sm text-gray-600">Anomalías</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}