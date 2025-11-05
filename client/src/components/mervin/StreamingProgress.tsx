import { CheckCircle2, Loader2, Globe, Database, FileText, Brain, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface StreamUpdate {
  type: 'progress' | 'message' | 'complete' | 'error';
  content: string;
  progress?: any;
  data?: any;
}

interface StreamingProgressProps {
  updates: StreamUpdate[];
  isActive: boolean;
}

export function StreamingProgress({ updates, isActive }: StreamingProgressProps) {
  if (!isActive && updates.length === 0) {
    return null;
  }

  const getIcon = (update: StreamUpdate) => {
    const content = update.content.toLowerCase();
    
    if (update.type === 'complete') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (update.type === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
    
    if (content.includes('investigando') || content.includes('research') || content.includes('búsqueda')) {
      return <Globe className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
    if (content.includes('endpoint') || content.includes('api') || content.includes('conectando')) {
      return <Database className="w-4 h-4 text-purple-500 animate-pulse" />;
    }
    if (content.includes('generando') || content.includes('creating') || content.includes('contrato') || content.includes('estimado')) {
      return <FileText className="w-4 h-4 text-orange-500 animate-pulse" />;
    }
    if (content.includes('analizando') || content.includes('procesando') || content.includes('pensando')) {
      return <Brain className="w-4 h-4 text-cyan-500 animate-pulse" />;
    }
    
    return <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />;
  };

  const getProgressValue = (updates: StreamUpdate[]): number => {
    const totalUpdates = updates.length;
    if (totalUpdates === 0) return 0;
    
    const completedUpdates = updates.filter(u => u.type === 'complete').length;
    if (completedUpdates > 0) return 100;
    
    return Math.min((totalUpdates * 15), 85);
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              Mervin V2 Procesando
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {isActive ? 'En Progreso' : 'Completado'}
          </Badge>
        </div>

        <Progress value={getProgressValue(updates)} className="h-1.5" />

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {updates.slice(-5).map((update, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="mt-0.5 flex-shrink-0">
                {getIcon(update)}
              </div>
              <span className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                {update.content}
              </span>
            </div>
          ))}
        </div>

        {isActive && (
          <div className="flex items-center gap-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Inteligencia híbrida activa (ChatGPT-4o + Claude Sonnet 4)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
