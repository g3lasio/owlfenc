/**
 * EnhancedErrorMessage Component
 * 
 * Muestra mensajes de error enriquecidos con contexto, ID de error,
 * y opciones de acción (reintentar, reportar).
 * Proporciona una experiencia de error más amigable y accionable.
 */

import { AlertCircle, RefreshCw, Flag, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

interface EnhancedErrorMessageProps {
  errorId: string;
  errorMessage: string;
  errorContext?: string;
  canRetry?: boolean;
  onRetry?: () => void;
  onReport?: (errorId: string, errorMessage: string) => void;
}

export function EnhancedErrorMessage({
  errorId,
  errorMessage,
  errorContext,
  canRetry = false,
  onRetry,
  onReport
}: EnhancedErrorMessageProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const handleCopyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(errorId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying error ID:', error);
    }
  };

  const handleReport = () => {
    setIsReporting(true);
    if (onReport) {
      onReport(errorId, errorMessage);
    }
    setTimeout(() => setIsReporting(false), 2000);
  };

  return (
    <Card className="bg-gradient-to-br from-red-950/30 to-red-900/20 border-red-500/50 shadow-lg">
      <CardContent className="p-4">
        {/* Header con icono de error */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-400 mb-1">
              Algo salió mal
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {errorMessage}
            </p>
            {errorContext && (
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {errorContext}
              </p>
            )}
          </div>
        </div>

        {/* Error ID */}
        <div className="bg-black/30 rounded-lg p-3 mb-3 border border-red-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">ID de Error</p>
              <code className="text-xs font-mono text-red-400">{errorId}</code>
            </div>
            <button
              onClick={handleCopyErrorId}
              className="text-gray-400 hover:text-gray-300 transition-colors p-1.5 rounded hover:bg-gray-800/50"
              title="Copiar ID de error"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          {canRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex-1 bg-red-900/20 border-red-500/50 text-red-400 hover:bg-red-900/30 hover:text-red-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          )}
          
          {onReport && (
            <Button
              onClick={handleReport}
              variant="outline"
              size="sm"
              className={`flex-1 bg-orange-900/20 border-orange-500/50 text-orange-400 hover:bg-orange-900/30 hover:text-orange-300 ${
                isReporting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isReporting}
            >
              <Flag className="w-4 h-4 mr-2" />
              {isReporting ? 'Reportado' : 'Reportar'}
            </Button>
          )}
        </div>

        {/* Footer con ayuda */}
        <div className="mt-3 pt-3 border-t border-red-900/30">
          <p className="text-xs text-gray-400">
            Si el problema persiste, contacta a soporte con el ID de error.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
