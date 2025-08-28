/**
 * Componente DeepSearch IA - Tres tipos de búsqueda especializada
 * 
 * ONLY MATERIALS: Solo materiales sin labor
 * LABOR COSTS: Solo costos de labor por unidad (proyecto/ft/sqft/square)
 * FULL COSTS: Materiales + Labor combinados
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Brain, Sparkles, Package, DollarSign, Clock, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { DeepSearchChat } from './DeepSearchChat';

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
  const [showSearchTypes, setShowSearchTypes] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSearchType, setCurrentSearchType] = useState<'materials' | 'labor' | 'full' | null>(null);
  const { toast } = useToast();

  const canAnalyze = projectDescription && projectDescription.length >= 10;

  const runDeepSearch = async (searchType: 'materials' | 'labor' | 'full') => {
    if (!canAnalyze) {
      toast({
        title: "Descripción requerida",
        description: "Por favor describe tu proyecto con al menos 10 caracteres para usar DeepSearch IA",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setCurrentSearchType(searchType);
    setProgress(0);
    setShowSearchTypes(false);

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
      console.log(`🔍 ${searchType.toUpperCase()} AI SEARCH clicked - current state:`, isAnalyzing);
      console.log(`🔍 Setting new state from ${isAnalyzing} to true`);

      // Determinar endpoint y parámetros según el tipo de búsqueda
      let endpoint = '';
      let requestBody: any = {
        projectDescription,
        location,
        projectType: 'general_construction'
      };

      switch (searchType) {
        case 'materials':
          endpoint = '/api/deepsearch/materials';
          requestBody.includeMaterials = true;
          requestBody.includeLabor = false;
          break;
        case 'labor':
          endpoint = '/api/labor-deepsearch/labor-only';
          requestBody.includeMaterials = false;
          requestBody.includeLabor = true;
          break;
        case 'full':
          endpoint = '/api/labor-deepsearch/combined';
          requestBody.includeMaterials = true;
          requestBody.includeLabor = true;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
        
        const materialCount = result.data.materials?.length || 0;
        const laborCount = result.data.laborCosts?.length || 0;
        const confidence = result.data.confidence ? Math.round(result.data.confidence * 100) : 90;
        
        let successMessage = '';
        switch (searchType) {
          case 'materials':
            successMessage = `Se generaron ${materialCount} materiales con ${confidence}% de confianza`;
            break;
          case 'labor':
            successMessage = `Se calcularon ${laborCount} costos de labor con ${confidence}% de confianza`;
            break;
          case 'full':
            successMessage = `Se generaron ${materialCount} materiales y ${laborCount} costos de labor con ${confidence}% de confianza`;
            break;
        }
        
        toast({
          title: `${searchType.toUpperCase()} DeepSearch Completado`,
          description: successMessage
        });

        console.log(`✅ ${searchType.toUpperCase()} DeepSearch completado:`, result.data);
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

    // Para MATERIALS ONLY: solo aplicar materiales
    if (currentSearchType === 'materials') {
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
      toast({
        title: "✅ Materiales Aplicados",
        description: `Se agregaron ${materialsForWizard.length} materiales al estimado`,
      });
    }

    // Para LABOR ONLY: aplicar como servicios de labor
    else if (currentSearchType === 'labor') {
      const laborForWizard = analysisResult.laborCosts.map((labor, index) => ({
        id: `labor_${index}`,
        name: labor.category,
        description: labor.description || '',
        category: 'Labor',
        quantity: 1,
        unit: 'project',
        price: labor.total,
        total: labor.total,
        supplier: 'Labor DeepSearch',
        specifications: `${labor.hours} horas @ $${labor.rate}/hr`
      }));

      onMaterialsGenerated(laborForWizard);
      toast({
        title: "✅ Costos de Labor Aplicados",
        description: `Se agregaron ${laborForWizard.length} servicios de labor al estimado`,
      });
    }

    // Para FULL COSTS: aplicar ambos
    else if (currentSearchType === 'full') {
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

      const laborForWizard = analysisResult.laborCosts.map((labor, index) => ({
        id: `labor_${index}`,
        name: labor.category,
        description: labor.description || '',
        category: 'Labor',
        quantity: 1,
        unit: 'project',
        price: labor.total,
        total: labor.total,
        supplier: 'Labor DeepSearch',
        specifications: `${labor.hours} horas @ $${labor.rate}/hr`
      }));

      const allItems = [...materialsForWizard, ...laborForWizard];
      onMaterialsGenerated(allItems);
      toast({
        title: "✅ Análisis Completo Aplicado",
        description: `Se agregaron ${materialsForWizard.length} materiales y ${laborForWizard.length} servicios de labor`,
      });
    }

    setShowResults(false);
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
      <Dialog open={showSearchTypes} onOpenChange={setShowSearchTypes}>
        <DialogTrigger asChild>
          <Button
            disabled={disabled || !canAnalyze || isAnalyzing}
            className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          >
            {isAnalyzing ? (
              <>
                <Brain className="mr-2 h-5 w-5 animate-pulse" />
                Analizando con IA...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                DeepSearch IA
              </>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              SELECT.SEARCH.TYPE
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Selecciona el tipo de análisis DeepSearch que necesitas para tu proyecto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-6">
            {/* ONLY MATERIALS Button */}
            <Button
              onClick={() => runDeepSearch('materials')}
              disabled={isAnalyzing}
              className="w-full h-16 bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-500/30 hover:border-blue-400/50 text-left p-4 rounded-xl transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white">ONLY MATERIALS</div>
                  <div className="text-sm text-blue-200">Search materials database only</div>
                </div>
              </div>
            </Button>

            {/* LABOR COSTS Button */}
            <Button
              onClick={() => runDeepSearch('labor')}
              disabled={isAnalyzing}
              className="w-full h-16 bg-gradient-to-r from-orange-600/20 to-orange-800/20 border border-orange-500/30 hover:border-orange-400/50 text-left p-4 rounded-xl transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white">LABOR COSTS</div>
                  <div className="text-sm text-orange-200">Generate labor service items</div>
                </div>
              </div>
            </Button>

            {/* FULL COSTS Button */}
            <Button
              onClick={() => runDeepSearch('full')}
              disabled={isAnalyzing}
              className="w-full h-16 bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-500/30 hover:border-green-400/50 text-left p-4 rounded-xl transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white flex items-center gap-2">
                    FULL COSTS
                    <Badge className="bg-green-500 text-green-900">RECOMMENDED</Badge>
                  </div>
                  <div className="text-sm text-green-200">Materials + labor complete analysis</div>
                </div>
              </div>
            </Button>
          </div>
          
          {isAnalyzing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Analizando proyecto...</span>
                <span className="text-sm text-slate-300">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-slate-700" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              {currentSearchType?.toUpperCase()} DeepSearch Completado
            </DialogTitle>
            <DialogDescription>
              Análisis inteligente generado con IA para tu proyecto
            </DialogDescription>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-6">
              {/* Project Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen del Proyecto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Tipo:</strong> {analysisResult.projectType}
                    </div>
                    <div>
                      <strong>Confianza:</strong>
                      <Badge 
                        className={`ml-2 ${getConfidenceColor(analysisResult.confidence)}`}
                      >
                        {Math.round(analysisResult.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2">
                    <strong>Alcance:</strong> {analysisResult.projectScope}
                  </div>
                </CardContent>
              </Card>

              {/* Materials Section - Solo mostrar para materials y full */}
              {(currentSearchType === 'materials' || currentSearchType === 'full') && analysisResult.materials.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Materiales ({analysisResult.materials.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.materials.map((material, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{material.name}</div>
                            <div className="text-sm text-muted-foreground">{material.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {material.quantity} {material.unit} × {formatCurrency(material.unitPrice)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(material.totalPrice)}</div>
                            <Badge variant="outline" className="text-xs">{material.category}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between font-semibold">
                        <span>Total Materiales:</span>
                        <span>{formatCurrency(analysisResult.totalMaterialsCost)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Labor Section - Solo mostrar para labor y full */}
              {(currentSearchType === 'labor' || currentSearchType === 'full') && analysisResult.laborCosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Costos de Labor ({analysisResult.laborCosts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.laborCosts.map((labor, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{labor.category}</div>
                            <div className="text-sm text-muted-foreground">{labor.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {labor.hours} horas × {formatCurrency(labor.rate)}/hora
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(labor.total)}</div>
                            <Badge variant="outline" className="text-xs">Labor</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between font-semibold">
                        <span>Total Labor:</span>
                        <span>{formatCurrency(analysisResult.totalLaborCost)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Total Summary */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(analysisResult.grandTotal)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total del Proyecto</div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {/* Chat Interactivo Button */}
                  <DeepSearchChat
                    initialResult={analysisResult}
                    projectDescription={projectDescription}
                    location={location}
                    onResultsUpdated={(updatedResult) => {
                      setAnalysisResult(updatedResult);
                      toast({
                        title: "Estimado actualizado",
                        description: "Los cambios del chat han sido aplicados."
                      });
                    }}
                    onApplyChanges={() => {
                      if (analysisResult) {
                        applyMaterials();
                      }
                    }}
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setShowResults(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={applyMaterials} className="bg-green-600 hover:bg-green-700">
                    Aplicar al Estimado
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}