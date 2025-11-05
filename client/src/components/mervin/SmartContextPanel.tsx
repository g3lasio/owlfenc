import { Database, Zap, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SmartContextPanelProps {
  activeEndpoints: string[];
  currentModel: 'ChatGPT-4o' | 'Claude Sonnet 4' | null;
  isProcessing: boolean;
}

export function SmartContextPanel({ activeEndpoints, currentModel, isProcessing }: SmartContextPanelProps) {
  if (!isProcessing && activeEndpoints.length === 0) {
    return null;
  }

  const endpointLabels: Record<string, string> = {
    'estimate': 'Estimados',
    'contract': 'Contratos',
    'permit': 'Permisos',
    'property': 'Verificación de Propiedad',
    'research': 'Investigación Web'
  };

  return (
    <Card className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-semibold text-xs text-purple-900 dark:text-purple-100">
            Contexto Activo
          </span>
        </div>

        {currentModel && (
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              Modelo: <span className="font-medium text-purple-700 dark:text-purple-300">{currentModel}</span>
            </span>
            {currentModel === 'ChatGPT-4o' && (
              <Badge variant="outline" className="text-xs">Rápido</Badge>
            )}
            {currentModel === 'Claude Sonnet 4' && (
              <Badge variant="outline" className="text-xs">Robusto</Badge>
            )}
          </div>
        )}

        {activeEndpoints.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Conectado a:</span>
            </div>
            <div className="flex flex-wrap gap-1 ml-5">
              {activeEndpoints.map((endpoint, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {endpointLabels[endpoint] || endpoint}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
