/**
 * MessageFeedback Component
 * 
 * Proporciona botones de feedback (👍/👎) y opciones adicionales para cada mensaje del asistente.
 * Permite a los usuarios reportar problemas, calificar respuestas y proporcionar feedback
 * que alimenta el sistema de aprendizaje continuo del agente.
 */

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Flag, Copy, Check, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface MessageFeedbackProps {
  messageId: string;
  messageContent: string;
  onCopy: (messageId: string, content: string) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  onReport?: (messageId: string, content: string) => void;
  isCopied?: boolean;
}

export function MessageFeedback({
  messageId,
  messageContent,
  onCopy,
  onFeedback,
  onReport,
  isCopied = false
}: MessageFeedbackProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const { toast } = useToast();

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedbackGiven(type);
    
    if (onFeedback) {
      onFeedback(messageId, type);
    }

    toast({
      title: type === 'positive' ? '¡Gracias por tu feedback!' : 'Feedback recibido',
      description: type === 'positive' 
        ? 'Nos alegra que la respuesta te haya sido útil.'
        : 'Trabajaremos para mejorar las respuestas futuras.',
      duration: 2000,
    });
  };

  const handleReport = () => {
    if (onReport) {
      onReport(messageId, messageContent);
    }

    toast({
      title: 'Problema reportado',
      description: 'Gracias por ayudarnos a mejorar Mervin AI.',
      duration: 3000,
    });
  };

  const handleCopy = () => {
    onCopy(messageId, messageContent);
  };

  return (
    <div className="absolute -top-2 -right-2 md:opacity-0 md:group-hover:opacity-100 opacity-80 transition-opacity flex items-center gap-1">
      {/* Botón de copiar */}
      <button
        onClick={handleCopy}
        className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 md:p-1.5 rounded-lg shadow-lg touch-manipulation transition-colors"
        title="Copiar mensaje"
        data-testid={`button-copy-${messageId}`}
      >
        {isCopied ? (
          <Check className="w-4 h-4 md:w-3.5 md:h-3.5 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 md:w-3.5 md:h-3.5" />
        )}
      </button>

      {/* Menú de opciones */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 md:p-1.5 rounded-lg shadow-lg touch-manipulation transition-colors"
            title="Más opciones"
            data-testid={`button-options-${messageId}`}
          >
            <MoreVertical className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Feedback positivo */}
          <DropdownMenuItem
            onClick={() => handleFeedback('positive')}
            disabled={feedbackGiven === 'positive'}
            className="cursor-pointer"
          >
            <ThumbsUp className={`w-4 h-4 mr-2 ${feedbackGiven === 'positive' ? 'text-green-500' : ''}`} />
            <span>Respuesta útil</span>
            {feedbackGiven === 'positive' && (
              <Check className="w-4 h-4 ml-auto text-green-500" />
            )}
          </DropdownMenuItem>

          {/* Feedback negativo */}
          <DropdownMenuItem
            onClick={() => handleFeedback('negative')}
            disabled={feedbackGiven === 'negative'}
            className="cursor-pointer"
          >
            <ThumbsDown className={`w-4 h-4 mr-2 ${feedbackGiven === 'negative' ? 'text-red-500' : ''}`} />
            <span>Necesita mejorar</span>
            {feedbackGiven === 'negative' && (
              <Check className="w-4 h-4 ml-auto text-red-500" />
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Reportar problema */}
          <DropdownMenuItem
            onClick={handleReport}
            className="cursor-pointer text-orange-500"
          >
            <Flag className="w-4 h-4 mr-2" />
            <span>Reportar problema</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
