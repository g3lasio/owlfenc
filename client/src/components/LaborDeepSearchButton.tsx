/**
 * Componente Labor DeepSearch IA - Botón inteligente para generar servicios de labor automáticamente
 * 
 * Este componente permite generar listas de tareas de labor/servicios usando IA,
 * funcionando independientemente del DeepSearch de materiales existente.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Wrench, 
  Brain, 
  Package, 
  Combine,
  Clock, 
  Users, 
  DollarSign,
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Settings
} from 'lucide-react';

interface LaborItem {
  id: string;
  name: string;
  description: string;
  category: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  skillLevel: string;
  crew: number;
  equipment?: string[];
}

interface LaborDeepSearchButtonProps {
  projectDescription: string;
  onLaborGenerated: (items: any[]) => void;
  onMaterialsGenerated?: (items: any[]) => void;
  onCombinedGenerated?: (materials: any[], labor: any[]) => void;
  disabled?: boolean;
}

type SearchMode = 'labor' | 'materials' | 'combined';

export default function LaborDeepSearchButton({
  projectDescription,
  onLaborGenerated,
  onMaterialsGenerated,
  onCombinedGenerated,
  disabled = false
}: LaborDeepSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMode, setCurrentMode] = useState<SearchMode>('labor');
  const [results, setResults] = useState<{
    labor?: any[];
    materials?: any[];
    costs?: {
      labor: number;
      materials: number;
      total: number;
    };
  }>({});

  const { toast } = useToast();

  const generateLaborOnly = async () => {
    try {
      setIsProcessing(true);
      setProgress(20);

      console.log('🔧 Iniciando Labor DeepSearch...');

      const response = await fetch('/api/labor-deepsearch/generate-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDescription,
          location: 'Estados Unidos',
          projectType: 'construction'
        }),
      });

      setProgress(60);

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      setProgress(80);

      if (!data.success) {
        throw new Error(data.error || 'Error generando servicios de labor');
      }

      const laborItems = data.items || [];
      setResults({ labor: laborItems });
      setProgress(100);

      console.log('✅ Labor DeepSearch completado:', laborItems);

      toast({
        title: '🔧 Labor DeepSearch Completado',
        description: `Se generaron ${laborItems.length} servicios de labor`,
      });

      onLaborGenerated(laborItems);

    } catch (error) {
      console.error('❌ Error en Labor DeepSearch:', error);
      toast({
        title: 'Error en Labor DeepSearch',
        description: 'No se pudieron generar los servicios de labor',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const generateMaterialsOnly = async () => {
    try {
      setIsProcessing(true);
      setProgress(20);

      console.log('📦 Iniciando Materials DeepSearch...');

      const response = await fetch('/api/deepsearch/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDescription,
          location: 'Estados Unidos'
        }),
      });

      setProgress(60);

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      setProgress(80);

      if (!data.success) {
        throw new Error(data.error || 'Error generando materiales');
      }

      const materialItems = data.materials || [];
      setResults({ materials: materialItems });
      setProgress(100);

      console.log('✅ Materials DeepSearch completado:', materialItems);

      toast({
        title: '📦 Materials DeepSearch Completado',
        description: `Se generaron ${materialItems.length} materiales`,
      });

      if (onMaterialsGenerated) {
        onMaterialsGenerated(materialItems);
      }

    } catch (error) {
      console.error('❌ Error en Materials DeepSearch:', error);
      toast({
        title: 'Error en Materials DeepSearch',
        description: 'No se pudieron generar los materiales',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const generateCombined = async () => {
    try {
      setIsProcessing(true);
      setProgress(10);

      console.log('🔧📦 Iniciando Combined DeepSearch...');

      const response = await fetch('/api/labor-deepsearch/combined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDescription,
          location: 'Estados Unidos',
          projectType: 'construction',
          includeMaterials: true,
          includeLabor: true
        }),
      });

      setProgress(50);

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      setProgress(80);

      if (!data.success) {
        throw new Error(data.error || 'Error generando análisis combinado');
      }

      const materialItems = data.materials || [];
      const laborItems = data.labor || [];
      const costs = data.costs || { materials: 0, labor: 0, total: 0 };

      setResults({ 
        materials: materialItems, 
        labor: laborItems,
        costs 
      });
      setProgress(100);

      console.log('✅ Combined DeepSearch completado:', { materialItems, laborItems, costs });

      toast({
        title: '🎉 Análisis Combinado Completado',
        description: `${materialItems.length} materiales + ${laborItems.length} servicios de labor`,
      });

      if (onCombinedGenerated) {
        onCombinedGenerated(materialItems, laborItems);
      }

    } catch (error) {
      console.error('❌ Error en Combined DeepSearch:', error);
      toast({
        title: 'Error en Análisis Combinado',
        description: 'No se pudo completar el análisis combinado',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleGenerate = () => {
    switch (currentMode) {
      case 'labor':
        generateLaborOnly();
        break;
      case 'materials':
        generateMaterialsOnly();
        break;
      case 'combined':
        generateCombined();
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || !projectDescription.trim()}
          className="flex items-center space-x-2"
        >
          <Brain className="h-4 w-4" />
          <span>Smart DeepSearch</span>
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] ">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-500" />
            <span>Smart DeepSearch IA</span>
          </DialogTitle>
          <DialogDescription>
            Elige el tipo de análisis que necesitas para tu proyecto
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentMode} onValueChange={(value) => setCurrentMode(value as SearchMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="labor" className="flex items-center space-x-2">
              <Wrench className="h-4 w-4" />
              <span>Solo Labor</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Solo Materiales</span>
            </TabsTrigger>
            <TabsTrigger value="combined" className="flex items-center space-x-2">
              <Combine className="h-4 w-4" />
              <span>Combinado</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="labor">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  <span>DeepSearch de Labor</span>
                </CardTitle>
                <CardDescription>
                  Genera automáticamente tareas de labor y servicios. Perfecto cuando el cliente provee los materiales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>Servicios de instalación</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-green-500" />
                      <span>Preparación del sitio</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span>Estimación de horas</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span>Costos de mano de obra</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <span>DeepSearch de Materiales</span>
                </CardTitle>
                <CardDescription>
                  Utiliza el sistema existente para generar listas de materiales con precios actualizados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span>Lista completa de materiales</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span>Precios actualizados</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Cantidades precisas</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>Especificaciones detalladas</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="combined">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Combine className="h-5 w-5 text-purple-500" />
                  <span>Análisis Combinado</span>
                </CardTitle>
                <CardDescription>
                  Genera una lista completa con materiales Y servicios de labor para un estimado integral.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span>Materiales completos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wrench className="h-4 w-4 text-orange-500" />
                      <span>Servicios de labor</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span>Costos separados</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Estimado completo</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Procesando con IA...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {results.costs && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Costos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-500">
                    {formatCurrency(results.costs.materials)}
                  </div>
                  <div className="text-sm text-gray-500">Materiales</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {formatCurrency(results.costs.labor)}
                  </div>
                  <div className="text-sm text-gray-500">Labor</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {formatCurrency(results.costs.total)}
                  </div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isProcessing || !projectDescription.trim()}
            className="flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                <span>Generar {currentMode === 'labor' ? 'Labor' : currentMode === 'materials' ? 'Materiales' : 'Ambos'}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}