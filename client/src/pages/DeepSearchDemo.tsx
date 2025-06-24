/**
 * Página de demostración del DeepSearch IA
 * 
 * Esta página muestra cómo funciona el módulo DeepSearch para generar
 * automáticamente listas de materiales usando Claude 3.7 Sonnet.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Sparkles, 
  Package, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap,
  MapPin,
  FileText,
  Settings
} from 'lucide-react';

interface MaterialItem {
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
}

interface DeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: MaterialItem[];
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

export default function DeepSearchDemo() {
  const [projectDescription, setProjectDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DeepSearchResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const runDeepSearch = async () => {
    if (!projectDescription.trim() || projectDescription.length < 10) {
      toast({
        title: "Descripción requerida",
        description: "Por favor describe tu proyecto con al menos 10 caracteres para usar DeepSearch IA",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setAnalysisResult(null);

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
          location: location || undefined,
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

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "Alta";
    if (confidence >= 0.6) return "Media";
    return "Baja";
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Brain className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Mervin DeepSearch IA</h1>
          <Badge variant="secondary" className="ml-2">
            Claude 3.7 Sonnet
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Describe tu proyecto de construcción y deja que la IA genere automáticamente 
          una lista completa de materiales con precios y cantidades precisas.
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Descripción del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="description">Describe tu proyecto en detalle</Label>
            <Textarea
              id="description"
              placeholder="Ejemplo: Instalar cerca de madera de 80 pies lineales en el patio trasero, altura de 6 pies, con postes de cedro y tablones horizontales..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={4}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Incluye dimensiones, materiales preferidos, ubicación y cualquier detalle especial
            </p>
          </div>

          <div>
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ubicación (opcional)
            </Label>
            <Input
              id="location"
              placeholder="Ejemplo: Fairfield, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Ayuda a ajustar precios según la región
            </p>
          </div>

          <Button
            onClick={runDeepSearch}
            disabled={!projectDescription.trim() || projectDescription.length < 10 || isAnalyzing}
            className="w-full relative "
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Brain className="h-5 w-5 mr-2 animate-pulse" />
                Analizando con Claude IA...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generar Materiales con DeepSearch IA
              </>
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
            )}
          </Button>

          {isAnalyzing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Claude 3.7 Sonnet está analizando tu proyecto y consultando precios de materiales...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Project Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Resumen del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{analysisResult.projectType}</h3>
                  <p className="text-muted-foreground">{analysisResult.projectScope}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getConfidenceColor(analysisResult.confidence)}`} />
                    <span className="text-sm">
                      Confianza: {getConfidenceText(analysisResult.confidence)} ({Math.round(analysisResult.confidence * 100)}%)
                    </span>
                  </div>
                  <Badge variant="outline">
                    {analysisResult.materials.length} materiales detectados
                  </Badge>
                  <Badge variant="outline" className="text-green-600">
                    Claude 3.7 Sonnet
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Materiales</p>
                    <p className="text-xl font-semibold">
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
                    <p className="text-xl font-semibold">
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
                    <p className="text-xl font-semibold">
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
                    <p className="text-xl font-semibold">
                      {formatCurrency(analysisResult.grandTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Materials List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Lista de Materiales ({analysisResult.materials.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 ">
                {analysisResult.materials.map((material, index) => (
                  <div key={material.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{material.name}</h4>
                      <p className="text-sm text-muted-foreground">{material.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {material.quantity} {material.unit} × {formatCurrency(material.unitPrice)}
                        {material.supplier && ` • ${material.supplier}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(material.totalPrice)}</p>
                      <Badge variant="secondary" className="text-xs">
                        {material.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Labor Costs */}
          {analysisResult.laborCosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Costos de Labor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.laborCosts.map((labor, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <div>
                        <p className="font-medium">{labor.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {labor.hours} horas × {formatCurrency(labor.rate)}/hora
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(labor.total)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Costs */}
          {analysisResult.additionalCosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Costos Adicionales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.additionalCosts.map((additional, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <div>
                        <p className="font-medium">{additional.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={additional.required ? "default" : "secondary"} className="text-xs">
                            {additional.required ? "Requerido" : "Opcional"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{additional.category}</span>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(additional.cost)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations and Warnings */}
          {(analysisResult.recommendations.length > 0 || analysisResult.warnings.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Recomendaciones de IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
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
                    <ul className="space-y-2">
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

          {/* Action Button */}
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                ¿Te gustan estos resultados? Puedes integrar esta funcionalidad directamente en tu flujo de estimados.
              </p>
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                <Zap className="h-4 w-4 mr-2" />
                Integrar en Estimados
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}