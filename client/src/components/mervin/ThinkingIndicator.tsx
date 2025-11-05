import { Brain, Search, Cog, Sparkles } from "lucide-react";

interface ThinkingIndicatorProps {
  currentAction?: string;
}

export function ThinkingIndicator({ currentAction }: ThinkingIndicatorProps) {
  const getActionDisplay = () => {
    if (!currentAction) {
      return { icon: Brain, text: "Mervin pensando" };
    }

    const lowerAction = currentAction.toLowerCase();
    
    if (lowerAction.includes('investigando') || lowerAction.includes('buscando') || lowerAction.includes('web')) {
      return { icon: Search, text: "Investigando" };
    }
    
    if (lowerAction.includes('analizando') || lowerAction.includes('análisis')) {
      return { icon: Brain, text: "Analizando" };
    }
    
    if (lowerAction.includes('procesando') || lowerAction.includes('ejecutando')) {
      return { icon: Cog, text: "Procesando" };
    }
    
    if (lowerAction.includes('preparando') || lowerAction.includes('generando')) {
      return { icon: Sparkles, text: "Generando respuesta" };
    }
    
    return { icon: Brain, text: "Pensando" };
  };

  const { icon: Icon, text } = getActionDisplay();

  return (
    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
      <Icon className="w-4 h-4 animate-pulse" />
      <span className="text-sm">
        {text}
        <span className="inline-flex ml-0.5">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
        </span>
      </span>
    </div>
  );
}
