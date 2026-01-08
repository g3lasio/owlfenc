/**
 * LiveTaskIndicator Component
 * 
 * Muestra el estado en tiempo real de las tareas que Mervin está ejecutando.
 * Se actualiza dinámicamente basándose en los StreamUpdate del backend.
 * Proporciona feedback visual inmediato al usuario sobre qué está haciendo el agente.
 */

import { useEffect, useState } from 'react';
import {
  Globe,
  Database,
  FileText,
  Brain,
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Home,
  FileCheck,
  Sparkles,
  Calculator,
  Gavel,
  DollarSign,
  Mail,
  User,
  Building,
  MapPin,
  Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StreamUpdate {
  type: 'progress' | 'message' | 'complete' | 'error';
  content: string;
  progress?: any;
  data?: any;
  metadata?: Record<string, any>;
}

interface LiveTaskIndicatorProps {
  updates: StreamUpdate[];
  isActive: boolean;
  onComplete?: () => void;
}

interface TaskState {
  icon: any;
  title: string;
  description: string;
  color: string;
  animationClass: string;
}

export function LiveTaskIndicator({ updates, isActive, onComplete }: LiveTaskIndicatorProps) {
  const [currentState, setCurrentState] = useState<TaskState | null>(null);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!isActive && updates.length === 0) {
      setCurrentState(null);
      setProgress(0);
      setCompletedSteps([]);
      return;
    }

    // Obtener el último update
    const latestUpdate = updates[updates.length - 1];
    if (!latestUpdate) return;

    // Detectar el tipo de tarea basado en el contenido
    const state = detectTaskState(latestUpdate);
    setCurrentState(state);

    // Actualizar progreso
    if (latestUpdate.type === 'complete') {
      setProgress(100);
      if (onComplete) {
        setTimeout(onComplete, 1500);
      }
    } else if (latestUpdate.type === 'error') {
      setProgress(100);
    } else {
      // Calcular progreso basado en número de updates
      const progressValue = Math.min((updates.length * 20), 90);
      setProgress(progressValue);
    }

    // Agregar paso completado si es relevante
    if (latestUpdate.type === 'progress' && latestUpdate.content) {
      setCompletedSteps(prev => {
        if (!prev.includes(latestUpdate.content)) {
          return [...prev, latestUpdate.content];
        }
        return prev;
      });
    }
  }, [updates, isActive, onComplete]);

  const detectTaskState = (update: StreamUpdate): TaskState => {
    const content = update.content.toLowerCase();

    // Estado de error
    if (update.type === 'error') {
      return {
        icon: AlertCircle,
        title: 'Error Detectado',
        description: update.content,
        color: 'text-red-500',
        animationClass: 'animate-pulse'
      };
    }

    // Estado completado
    if (update.type === 'complete') {
      return {
        icon: CheckCircle2,
        title: 'Tarea Completada',
        description: 'Mervin ha finalizado exitosamente',
        color: 'text-green-500',
        animationClass: 'animate-none'
      };
    }

    // Detección de tareas específicas
    
    // Property Verification
    if (content.includes('propiedad') || content.includes('property') || content.includes('ownership')) {
      if (content.includes('verificando') || content.includes('verifying') || content.includes('checking')) {
        return {
          icon: Home,
          title: 'Verificando Propiedad',
          description: 'Consultando registros públicos y bases de datos...',
          color: 'text-blue-500',
          animationClass: 'animate-pulse'
        };
      }
      if (content.includes('analizando') || content.includes('analyzing')) {
        return {
          icon: FileCheck,
          title: 'Analizando Datos de Propiedad',
          description: 'Procesando información del propietario y detalles del lote...',
          color: 'text-purple-500',
          animationClass: 'animate-pulse'
        };
      }
    }

    // Estimate Generation
    if (content.includes('estimado') || content.includes('estimate') || content.includes('presupuesto')) {
      if (content.includes('calculando') || content.includes('calculating')) {
        return {
          icon: Calculator,
          title: 'Calculando Estimado',
          description: 'Procesando costos de materiales y mano de obra...',
          color: 'text-orange-500',
          animationClass: 'animate-pulse'
        };
      }
      if (content.includes('generando') || content.includes('generating') || content.includes('creando')) {
        return {
          icon: FileText,
          title: 'Generando Estimado',
          description: 'Creando documento profesional con detalles...',
          color: 'text-orange-500',
          animationClass: 'animate-pulse'
        };
      }
    }

    // Contract Generation
    if (content.includes('contrato') || content.includes('contract')) {
      if (content.includes('preparando') || content.includes('preparing')) {
        return {
          icon: Gavel,
          title: 'Preparando Contrato',
          description: 'Recopilando información legal y términos...',
          color: 'text-indigo-500',
          animationClass: 'animate-pulse'
        };
      }
      if (content.includes('generando') || content.includes('generating')) {
        return {
          icon: FileText,
          title: 'Generando Contrato',
          description: 'Creando documento legal con cláusulas personalizadas...',
          color: 'text-indigo-500',
          animationClass: 'animate-pulse'
        };
      }
    }

    // Permit Advisor
    if (content.includes('permiso') || content.includes('permit')) {
      return {
        icon: FileCheck,
        title: 'Analizando Permisos',
        description: 'Consultando requisitos municipales y regulaciones...',
        color: 'text-yellow-500',
        animationClass: 'animate-pulse'
      };
    }

    // Web Research
    if (content.includes('investigando') || content.includes('researching') || 
        content.includes('buscando') || content.includes('searching') || 
        content.includes('web')) {
      return {
        icon: Globe,
        title: 'Investigando en la Web',
        description: 'Buscando información relevante en línea...',
        color: 'text-cyan-500',
        animationClass: 'animate-spin'
      };
    }

    // Database/API Operations
    if (content.includes('endpoint') || content.includes('api') || 
        content.includes('database') || content.includes('conectando')) {
      return {
        icon: Database,
        title: 'Consultando Base de Datos',
        description: 'Accediendo a sistemas internos...',
        color: 'text-purple-500',
        animationClass: 'animate-pulse'
      };
    }

    // Client/Contact Operations
    if (content.includes('cliente') || content.includes('client') || content.includes('contacto')) {
      return {
        icon: User,
        title: 'Procesando Información del Cliente',
        description: 'Verificando y organizando datos de contacto...',
        color: 'text-pink-500',
        animationClass: 'animate-pulse'
      };
    }

    // Analysis
    if (content.includes('analizando') || content.includes('analyzing') || content.includes('procesando')) {
      return {
        icon: Brain,
        title: 'Analizando Información',
        description: 'Procesando datos con inteligencia artificial...',
        color: 'text-cyan-500',
        animationClass: 'animate-pulse'
      };
    }

    // Default thinking state
    return {
      icon: Sparkles,
      title: 'Mervin Trabajando',
      description: update.content || 'Procesando tu solicitud...',
      color: 'text-cyan-400',
      animationClass: 'animate-pulse'
    };
  };

  if (!isActive && updates.length === 0) {
    return null;
  }

  if (!currentState) {
    return null;
  }

  const Icon = currentState.icon;

  return (
    <Card className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-cyan-500/30 shadow-lg">
      <CardContent className="p-4">
        {/* Header con icono y título */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`${currentState.color} ${currentState.animationClass}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-semibold ${currentState.color}`}>
              {currentState.title}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {currentState.description}
            </p>
          </div>
          <div className="text-xs font-mono text-cyan-400">
            {progress}%
          </div>
        </div>

        {/* Barra de progreso */}
        <Progress 
          value={progress} 
          className="h-1.5 mb-3"
        />

        {/* Pasos completados (últimos 3) */}
        {completedSteps.length > 0 && (
          <div className="space-y-1.5 mt-3 pt-3 border-t border-cyan-900/30">
            {completedSteps.slice(-3).map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs text-gray-400 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer con estado del sistema */}
        {isActive && currentState.title !== 'Tarea Completada' && currentState.title !== 'Error Detectado' && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cyan-900/30">
            <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />
            <span className="text-xs text-cyan-400">
              Inteligencia híbrida activa
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
