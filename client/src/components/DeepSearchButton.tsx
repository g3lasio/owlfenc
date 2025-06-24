/**
 * Componente DeepSearch IA - Botón inteligente para generar materiales automáticamente
 * 
 * Este componente integra la funcionalidad de DeepSearch directamente en el 
 * flujo de creación de estimados, permitiendo generar listas de materiales
 * automáticamente usando IA.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Brain, Sparkles, Package, DollarSign, Clock, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface DeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    supplier?: string;
    specifications?: string;
  }>;
  laborCosts: Array<{
    category: string;
    description: string;
    hours: number;
    rate: number;
    total: number;
  }>;
  additionalCosts: Array<{
    category: string;
    description: string;
    cost: number;
    required: boolean;
  }>;
  totalMaterialsCost: number;
  totalLaborCost: number;
  totalAdditionalCost: number;
  grandTotal: number;
  confidence: number;
  recommendations: string[];
  warnings: string[];
}

interface DeepSearchButtonProps {
  projectDescription: string;
  location?: string;
  onMaterialsGenerated: (materials: any[]) => void;
  disabled?: boolean;
  className?: string;
}

export function DeepSearchButton({ 
  projectDescription, 
  location, 
  onMaterialsGenerated, 
  disabled = false,
  className = "" 
}: DeepSearchButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DeepSearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const canAnalyze = projectDescription && projectDescription.length >= 10;

  const runDeepSearch = async () => {
    if (!canAnalyze) {
      toast({
        title: "Descripción requerida",
        description: "Por favor describe tu proyecto con al menos 10 caracteres para usar DeepSearch IA",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    // Simular progreso de análisis
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      console.log('🧠 Iniciando DeepSearch IA para:', projectDescription);

      const response = await fetch('/api/deepsearch/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectDescription,
          location,
          includeLabor: true,
          includeAdditionalCosts: true,
          startTime: Date.now()
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el análisis DeepSearch');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setAnalysisResult(result.data);
        setShowResults(true);
        
        toast({
          title: "🎉 DeepSearch Completado",
          description: `Se generaron ${result.data.materials.length} materiales automáticamente con ${Math.round(result.data.confidence * 100)}% de confianza`
        });

        console.log('✅ DeepSearch completado:', result.data);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }

    } catch (error: any) {
      console.error('❌ Error en DeepSearch:', error);
      toast({
        title: "Error en DeepSearch",
        description: error.message || "No se pudo analizar el proyecto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const applyMaterials = () => {
    if (!analysisResult) return;

    // Convertir los materiales del DeepSearch al formato esperado por el wizard
    const materialsForWizard = analysisResult.materials.map(material => ({
      id: material.id,
      name: material.name,
      description: material.description || '',
      category: material.category,
      quantity: material.quantity,
      unit: material.unit,
      price: material.unitPrice,
      total: material.totalPrice,
      supplier: material.supplier || 'DeepSearch IA',
      specifications: material.specifications || ''
    }));

    onMaterialsGenerated(materialsForWizard);
    setShowResults(false);

    toast({
      title: "✅ Materiales Aplicados",
      description: `Se agregaron ${materialsForWizard.length} materiales al estimado`,
      variant: "default"
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <>
      <Button
        onClick={runDeepSearch}
        disabled={disabled || !canAnalyze || isAnalyzing}
        className={`relative  ${className}`}
        variant="outline"
        size="sm"
      >
        {isAnalyzing ? (
          <>
            <Brain className="h-4 w-4 mr-2 animate-pulse" />
            Analizando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            DeepSearch IA
            <Badge variant="secondary" className="ml-2 text-xs">
              AUTO
            </Badge>
          </>
        )}
        
        {isAnalyzing && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
        )}
      </Button>

      {isAnalyzing && (
        <div className="mt-2 space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Claude IA está analizando tu proyecto...
          </p>
        </div>
      )}

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl max-h-[80vh] ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              Resultados del DeepSearch IA
            </DialogTitle>
            <DialogDescription>
              Análisis completo realizado por Claude 3.7 Sonnet
            </DialogDescription>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-6">
              {/* Resumen del Proyecto */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{analysisResult.projectType}</CardTitle>
                  <CardDescription>{analysisResult.projectScope}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getConfidenceColor(analysisResult.confidence)}`} />
                      <span className="text-sm">
                        Confianza: {Math.round(analysisResult.confidence * 100)}%
                      </span>
                    </div>
                    <Badge variant="outline">
                      {analysisResult.materials.length} materiales
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Totales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Materiales</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(analysisResult.totalMaterialsCost)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Labor</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(analysisResult.totalLaborCost)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Adicionales</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(analysisResult.totalAdditionalCost)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(analysisResult.grandTotal)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Materiales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Materiales Detectados ({analysisResult.materials.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 ">
                    {analysisResult.materials.map((material, index) => (
                      <div key={material.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <div className="flex-1">
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.quantity} {material.unit} × {formatCurrency(material.unitPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(material.totalPrice)}</p>
                          <p className="text-xs text-muted-foreground">{material.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recomendaciones y Advertencias */}
              {(analysisResult.recommendations.length > 0 || analysisResult.warnings.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Recomendaciones
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {analysisResult.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {analysisResult.warnings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          Advertencias
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {analysisResult.warnings.map((warning, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-orange-500 mt-1">•</span>
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex gap-4 pt-4">
                <Button onClick={applyMaterials} className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  Aplicar Materiales al Estimado
                </Button>
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}