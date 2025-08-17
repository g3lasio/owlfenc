import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  ClipboardList, 
  ClipboardCheck, 
  Building, 
  BarChart4,
  Command,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartActionSystemProps {
  onAction: (action: string, source: 'slash' | 'smart' | 'fab') => void;
  currentMessage: string;
  isVisible: boolean;
}

interface SmartSuggestion {
  id: string;
  text: string;
  action: string;
  confidence: number;
  icon: React.ReactNode;
}

interface SlashCommand {
  command: string;
  description: string;
  action: string;
  icon: React.ReactNode;
}

const slashCommands: SlashCommand[] = [
  { command: '/estimate', description: 'Generar estimado profesional', action: 'estimates', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { command: '/contract', description: 'Crear contrato legal', action: 'contracts', icon: <ClipboardList className="w-4 h-4" /> },
  { command: '/permit', description: 'Asesor de permisos', action: 'permits', icon: <ClipboardCheck className="w-4 h-4" /> },
  { command: '/property', description: 'Verificar propiedad', action: 'properties', icon: <Building className="w-4 h-4" /> },
  { command: '/analytics', description: 'Analizar pagos', action: 'analytics', icon: <BarChart4 className="w-4 h-4" /> },
];

export function SmartActionSystem({ onAction, currentMessage, isVisible }: SmartActionSystemProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);

  // Detectar comando slash
  useEffect(() => {
    const hasSlash = currentMessage.startsWith('/');
    setShowSlashMenu(hasSlash && currentMessage.length > 1);
  }, [currentMessage]);

  // Inteligencia contextual - detectar intenciones en tiempo real
  useEffect(() => {
    const detectIntentions = () => {
      const message = currentMessage.toLowerCase();
      const suggestions: SmartSuggestion[] = [];

      // Patrones de detección de intenciones
      const patterns = [
        { 
          keywords: ['estimado', 'cotizar', 'precio', 'costo', 'cuanto'], 
          action: 'estimates', 
          text: 'Generar Estimado',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          confidence: 0.9 
        },
        { 
          keywords: ['contrato', 'acuerdo', 'firmar', 'legal'], 
          action: 'contracts', 
          text: 'Crear Contrato',
          icon: <ClipboardList className="w-4 h-4" />,
          confidence: 0.85 
        },
        { 
          keywords: ['permiso', 'municipal', 'ciudad', 'autorización'], 
          action: 'permits', 
          text: 'Revisar Permisos',
          icon: <ClipboardCheck className="w-4 h-4" />,
          confidence: 0.8 
        },
        { 
          keywords: ['propiedad', 'dueño', 'verificar', 'propietario'], 
          action: 'properties', 
          text: 'Verificar Propiedad',
          icon: <Building className="w-4 h-4" />,
          confidence: 0.8 
        },
        { 
          keywords: ['pago', 'cobro', 'dinero', 'analítica', 'reporte'], 
          action: 'analytics', 
          text: 'Ver Analíticas',
          icon: <BarChart4 className="w-4 h-4" />,
          confidence: 0.75 
        }
      ];

      patterns.forEach(pattern => {
        const matches = pattern.keywords.filter(keyword => message.includes(keyword));
        if (matches.length > 0) {
          const confidence = pattern.confidence * (matches.length / pattern.keywords.length);
          if (confidence > 0.6) {
            suggestions.push({
              id: pattern.action,
              text: pattern.text,
              action: pattern.action,
              confidence,
              icon: pattern.icon
            });
          }
        }
      });

      // Ordenar por confianza y tomar las mejores 3
      suggestions.sort((a, b) => b.confidence - a.confidence);
      setSmartSuggestions(suggestions.slice(0, 3));
    };

    if (currentMessage.length > 5 && !currentMessage.startsWith('/')) {
      detectIntentions();
    } else {
      setSmartSuggestions([]);
    }
  }, [currentMessage]);



  // Filtrar comandos slash basado en input
  const filteredCommands = slashCommands.filter(cmd => 
    cmd.command.toLowerCase().includes(currentMessage.toLowerCase().substring(1))
  );

  return (
    <>
      {/* Slash Command Menu */}
      {showSlashMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800/95 backdrop-blur-sm border border-cyan-900/50 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center space-x-2 px-3 py-2 text-cyan-300 text-sm border-b border-gray-700">
              <Command className="w-4 h-4" />
              <span>Comandos Rápidos</span>
            </div>
            {filteredCommands.map((cmd) => (
              <button
                key={cmd.command}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700/50 rounded transition-colors"
                onClick={() => {
                  onAction(cmd.action, 'slash');
                  setShowSlashMenu(false);
                }}
              >
                {cmd.icon}
                <div className="flex-1">
                  <div className="text-cyan-400 font-medium">{cmd.command}</div>
                  <div className="text-gray-400 text-xs">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-40">
          <div className="flex items-center space-x-2 px-3 py-2 text-cyan-300 text-xs">
            <Sparkles className="w-3 h-3" />
            <span>Mervin detectó tu intención:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-full text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-200 transform hover:scale-105"
                onClick={() => onAction(suggestion.action, 'smart')}
              >
                {suggestion.icon}
                <span className="text-sm font-medium">{suggestion.text}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}


    </>
  );
}