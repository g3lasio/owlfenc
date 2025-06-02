
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  FileUp, 
  Shield, 
  Zap, 
  CheckCircle, 
  FileText, 
  Upload, 
  Brain,
  Scale,
  Download,
  Eye,
  AlertTriangle,
  Award,
  Sparkles
} from 'lucide-react';

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
}

export default function LegalContractEngineFixed() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [contractStrength, setContractStrength] = useState<number>(0);
  const [legalAdvice, setLegalAdvice] = useState<string[]>([]);
  const [protectionsApplied, setProtectionsApplied] = useState<string[]>([]);
  const { toast } = useToast();

  const processingSteps: ProcessingStep[] = [
    {
      id: 'upload',
      title: 'Analizando PDF del Estimado',
      description: 'Extrayendo información del proyecto, cliente y costos',
      completed: false,
      progress: 20
    },
    {
      id: 'risk',
      title: 'Análisis Legal de Riesgos',
      description: 'Evaluando riesgos específicos y protecciones necesarias',
      completed: false,
      progress: 40
    },
    {
      id: 'clauses',
      title: 'Generando Cláusulas Veteranas',
      description: 'Creando protecciones específicas para tu industria y estado',
      completed: false,
      progress: 70
    },
    {
      id: 'contract',
      title: 'Compilando Contrato Blindado',
      description: 'Ensamblando contrato final con máxima protección legal',
      completed: false,
      progress: 100
    }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      toast({
        title: "📄 PDF Seleccionado",
        description: `Archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    } else {
      toast({
        title: "❌ Archivo inválido",
        description: "Por favor selecciona un archivo PDF válido",
        variant: "destructive"
      });
    }
  };

  const generateDefensiveContract = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingStep(0);

    try {
      const formData = new FormData();
      formData.append('estimatePdf', selectedFile);

      // Simular progreso
      const steps = processingSteps.length;
      for (let i = 0; i < steps; i++) {
        setProcessingStep(i);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      console.log('🛡️ Enviando PDF para procesamiento defensivo...');
      
      const response = await fetch('/api/pdf-contract-processor/pdf-to-contract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Contrato defensivo generado:', result.data);
        
        setExtractedData(result.data.extractedData);
        setRiskAnalysis(result.data.riskAnalysis);
        setGeneratedContract(result.data.contractHtml);
        setContractStrength(result.data.contractStrength);
        setLegalAdvice(result.data.legalAdvice);
        setProtectionsApplied(result.data.protectionsApplied);
        
        toast({
          title: "🎉 ¡Contrato Blindado Generado!",
          description: `Fortaleza legal: ${result.data.contractStrength}/100 - ${result.data.protectionsApplied.length} protecciones aplicadas`,
        });
      } else {
        throw new Error(result.error || 'Error generando contrato');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error en generación",
        description: "No se pudo procesar el PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadContract = () => {
    if (!generatedContract) return;

    const blob = new Blob([generatedContract], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-blindado-${extractedData?.clientName?.replace(/\s+/g, '-') || 'cliente'}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "📥 Contrato Descargado",
      description: "Contrato blindado guardado exitosamente",
    });
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'bajo': return 'bg-green-500';
      case 'medio': return 'bg-yellow-500';
      case 'alto': return 'bg-orange-500';
      case 'crítico': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 90) return 'text-green-600';
    if (strength >= 75) return 'text-blue-600';
    if (strength >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header Mejorado */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="h-12 w-12 text-blue-600" />
          <Scale className="h-10 w-10 text-green-600" />
          <Brain className="h-11 w-11 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-green-600 to-purple-600 bg-clip-text text-transparent mb-4">
          🛡️ Legal Defense Engine 2.0
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Tu Abogado Digital Veterano - De PDF a Contrato Blindado en Minutos
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Sparkles className="h-4 w-4" />
          <span>Protección Legal Nivel Corte Federal</span>
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Generador PDF → Contrato
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2" disabled={!generatedContract}>
            <Award className="h-4 w-4" />
            Contrato Blindado
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Generador */}
        <TabsContent value="generator" className="space-y-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-6 w-6 text-blue-600" />
                Sube tu PDF de Estimado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Arrastra tu PDF aquí o haz clic para seleccionar
                  </h3>
                  <p className="text-gray-500">
                    Soporta PDFs hasta 10MB. El sistema extraerá automáticamente toda la información necesaria.
                  </p>
                </label>
              </div>

              {selectedFile && (
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-red-500" />
                      <div>
                        <p className="font-semibold">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={generateDefensiveContract}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                    >
                      {isProcessing ? (
                        <>
                          <Brain className="h-4 w-4 mr-2 animate-spin" />
                          Generando Protección Legal...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Generar Contrato Blindado
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progreso de Procesamiento */}
          {isProcessing && (
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-6 w-6 text-purple-600 animate-pulse" />
                  Abogado Digital Trabajando...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {processingSteps.map((step, index) => (
                  <div key={step.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {index < processingStep ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : index === processingStep ? (
                          <Brain className="h-5 w-5 text-purple-500 animate-spin" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                        <span className={`font-medium ${index <= processingStep ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.title}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{step.progress}%</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-7">{step.description}</p>
                    {index === processingStep && (
                      <Progress value={step.progress} className="ml-7 mr-12" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Resultados */}
        <TabsContent value="results" className="space-y-6">
          {generatedContract && (
            <>
              {/* Resumen de Protección */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className={`text-2xl font-bold ${getStrengthColor(contractStrength)}`}>
                      {contractStrength}/100
                    </div>
                    <p className="text-sm text-gray-600">Fortaleza Legal</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {protectionsApplied.length}
                    </div>
                    <p className="text-sm text-gray-600">Protecciones Aplicadas</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <Badge className={`${getRiskBadgeColor(riskAnalysis?.riskLevel || 'medio')} text-white`}>
                      {riskAnalysis?.riskLevel?.toUpperCase() || 'MEDIO'}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">Nivel de Riesgo</p>
                  </CardContent>
                </Card>
              </div>

              {/* Consejos Legales */}
              <Card className="border-2 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-6 w-6 text-yellow-600" />
                    Consejos de tu Abogado Digital
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {legalAdvice.map((advice, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{advice}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Botones de Acción */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => document.getElementById('contract-preview')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Contrato
                </Button>
                <Button
                  onClick={downloadContract}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Contrato Blindado
                </Button>
              </div>

              {/* Vista Previa del Contrato */}
              <Card id="contract-preview" className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-6 w-6" />
                      Vista Previa - Contrato Blindado
                    </span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Listo para Firmar
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: generatedContract }}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
