import { FileText, FilePlus, HelpCircle, Search, Building2, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ActionSuggestion {
  icon: any;
  label: string;
  prompt: string;
  variant?: 'default' | 'outline' | 'secondary';
}

interface DynamicActionSuggestionsProps {
  context: 'initial' | 'estimate' | 'contract' | 'permit' | 'property' | 'general';
  onSuggestionClick: (prompt: string) => void;
}

export function DynamicActionSuggestions({ context, onSuggestionClick }: DynamicActionSuggestionsProps) {
  const suggestions: Record<string, ActionSuggestion[]> = {
    initial: [
      { icon: FilePlus, label: 'Crear Estimado', prompt: 'Crear un nuevo estimado para un proyecto' },
      { icon: FileText, label: 'Generar Contrato', prompt: 'Generar un contrato para un proyecto' },
      { icon: FileCheck, label: 'Verificar Permisos', prompt: 'Verificar qué permisos necesito para un proyecto' },
      { icon: Building2, label: 'Analizar Propiedad', prompt: 'Analizar información de una propiedad' }
    ],
    estimate: [
      { icon: FilePlus, label: 'Crear Estimado', prompt: 'Crear un nuevo estimado' },
      { icon: FileText, label: 'Ver Plantilla', prompt: 'Muéstrame cómo funciona un estimado' },
      { icon: HelpCircle, label: 'Explicar Proceso', prompt: 'Explícame el proceso de estimación' }
    ],
    contract: [
      { icon: FileText, label: 'Generar Contrato', prompt: 'Generar un contrato profesional' },
      { icon: FilePlus, label: 'Ver Ejemplo', prompt: 'Muéstrame un ejemplo de contrato' },
      { icon: HelpCircle, label: 'Términos Legales', prompt: 'Explícame los términos legales importantes' }
    ],
    permit: [
      { icon: FileCheck, label: 'Verificar Permisos', prompt: 'Verificar permisos necesarios' },
      { icon: Search, label: 'Investigar Regulaciones', prompt: 'Investiga las regulaciones locales' },
      { icon: HelpCircle, label: 'Proceso de Permisos', prompt: 'Explícame el proceso de obtención de permisos' }
    ],
    property: [
      { icon: Building2, label: 'Verificar Propiedad', prompt: 'Verificar información de una propiedad' },
      { icon: Search, label: 'Historial', prompt: 'Buscar historial de la propiedad' },
      { icon: HelpCircle, label: 'Datos Disponibles', prompt: '¿Qué información puedes obtener de una propiedad?' }
    ],
    general: [
      { icon: HelpCircle, label: '¿Qué puedes hacer?', prompt: '¿Qué tareas puedes realizar por mí?' },
      { icon: Search, label: 'Investigar Precios', prompt: 'Investiga precios de materiales en el mercado' },
      { icon: FilePlus, label: 'Ayuda General', prompt: 'Muéstrame ejemplos de lo que puedes hacer' }
    ]
  };

  const currentSuggestions = suggestions[context] || suggestions.general;

  return (
    <Card className="bg-gradient-to-r from-gray-50/50 to-slate-50/50 dark:from-gray-950/50 dark:to-slate-950/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Sugerencias
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentSuggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <Button
                key={index}
                variant={suggestion.variant || "outline"}
                size="sm"
                className="text-xs h-auto py-1.5 px-3"
                onClick={() => onSuggestionClick(suggestion.prompt)}
                data-testid={`suggestion-${context}-${index}`}
              >
                <Icon className="w-3 h-3 mr-1.5" />
                {suggestion.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L14 10L21 12L14 14L12 21L10 14L3 12L10 10L12 3Z" fill="currentColor"/>
    </svg>
  );
}
