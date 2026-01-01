/**
 * DynamicActionButtons Component
 * 
 * Renderiza botones de acción dinámicos que ejecutan herramientas del backend.
 * Cuando se hace clic, envía una solicitud al backend con el `action` y `params`.
 */

import { ActionButton } from "@/mervin-v2/types/responses";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { useState } from "react";

interface DynamicActionButtonsProps {
  actions: ActionButton[];
  onActionExecute: (action: string, params?: Record<string, any>) => Promise<void>;
}

export function DynamicActionButtons({ actions, onActionExecute }: DynamicActionButtonsProps) {
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  if (!actions || actions.length === 0) {
    return null;
  }

  const handleActionClick = async (action: ActionButton) => {
    try {
      setExecutingAction(action.action);
      await onActionExecute(action.action, action.params);
    } catch (error) {
      console.error('Error ejecutando acción:', error);
    } finally {
      setExecutingAction(null);
    }
  };

  const getVariant = (style?: ActionButton['style']) => {
    switch (style) {
      case 'primary':
        return 'default';
      case 'secondary':
        return 'outline';
      case 'danger':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-muted-foreground font-medium">⚡ Acciones disponibles:</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => {
          const isExecuting = executingAction === action.action;
          
          return (
            <Button
              key={index}
              variant={getVariant(action.style)}
              size="sm"
              onClick={() => handleActionClick(action)}
              disabled={isExecuting || executingAction !== null}
              className="group relative overflow-hidden"
            >
              {/* Efecto de brillo al hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full duration-700 transition-transform"></span>
              
              {/* Contenido del botón */}
              <div className="flex items-center gap-2 relative z-10">
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>{action.label}</span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
