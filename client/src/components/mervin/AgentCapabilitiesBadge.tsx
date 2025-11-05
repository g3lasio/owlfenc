import { Sparkles, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgentCapabilitiesBadgeProps {
  mode: 'agent' | 'legacy';
}

export function AgentCapabilitiesBadge({ mode }: AgentCapabilitiesBadgeProps) {
  if (mode === 'agent') {
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/30">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
          <span className="font-semibold">Modo Agente Activo:</span> Puedo crear estimados, contratos, verificar permisos, y analizar propiedades automáticamente usando tus endpoints.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
      <MessageCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
        <span className="font-semibold">Modo Legacy:</span> Solo respondo preguntas básicas. Actualiza tu plan para acceder al modo agente autónomo.
      </AlertDescription>
    </Alert>
  );
}
