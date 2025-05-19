import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { enhanceDescriptionWithAI } from '@/services/openaiService';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// URL de la imagen de Mervin
const MERVIN_IMAGE_URL = 'https://i.postimg.cc/jd0cwYWP/Chat-GPT-Image-May-10-2025-05-35-38-PM.png';

interface MervinAssistantProps {
  originalText: string;
  onTextEnhanced: (enhancedText: string) => void;
  projectType?: string;
  className?: string;
}

export function MervinAssistant({ 
  originalText, 
  onTextEnhanced, 
  projectType = 'fencing', 
  className = '' 
}: MervinAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  
  const handleEnhance = async () => {
    // Validar que hay texto para procesar
    if (!originalText.trim()) {
      toast({
        title: 'Texto vacío',
        description: 'Por favor, ingresa una descripción del proyecto para mejorarla.',
        variant: 'destructive'
      });
      return;
    }
    
    // Iniciar proceso de mejora
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Solicitando mejora de texto para proyecto tipo: ${projectType}`);
      
      // Usar la función del servicio con el tipo de proyecto específico
      const enhancedText = await enhanceDescriptionWithAI(originalText, projectType);
      
      // Actualizar el texto original con el mejorado
      onTextEnhanced(enhancedText);
      
      // Notificar al usuario
      toast({
        title: 'Texto mejorado',
        description: 'La descripción del proyecto ha sido mejorada por Mervin AI.',
      });
    } catch (error) {
      // Manejar diferentes tipos de errores de forma más detallada
      console.error('Error al mejorar el texto:', error);
      
      // Determinar el mensaje de error específico
      let errorMessage = 'No se pudo mejorar el texto. Por favor, inténtalo de nuevo.';
      
      if (error instanceof Error) {
        // Si es un error de red o servidor
        if (error.message.includes('servidor') || error.message.includes('conexión')) {
          errorMessage = 'Error de conexión al servicio de IA. Verifica tu conexión a internet.';
          setError('Error de conexión al servicio de IA');
        } else if (error.message.includes('API key')) {
          errorMessage = 'Error de configuración del servicio de IA. Contacta al administrador.';
          setError('Error de configuración del servicio de IA');
        } else {
          setError(error.message);
        }
      }
      
      // Mostrar notificación de error
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Abrir diálogo con información detallada del error
      setShowDialog(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 p-0 rounded-full overflow-hidden ${className}`}
              onClick={handleEnhance}
              disabled={isLoading || !originalText.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <img 
                  src={MERVIN_IMAGE_URL} 
                  alt="Mervin Asistente" 
                  className="h-full w-full object-cover" 
                  onError={(e) => {
                    // Manejar errores de carga de imagen con un fallback
                    console.warn('Error al cargar imagen de Mervin, usando fallback');
                    const target = e.target as HTMLImageElement;
                    target.src = '/owl-logo.png'; // Usar logo local como respaldo
                    // Agregar clase para indicar que es un fallback
                    target.classList.add('mervin-fallback');
                    // Mensaje en consola para diagnóstico
                    console.log('Usada imagen fallback para Mervin:', target.src);
                  }}
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isLoading ? 'Mejorando descripción...' : 'Mejorar descripción con Mervin AI'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Diálogo de error detallado */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Error al mejorar la descripción</DialogTitle>
            <DialogDescription>
              No se pudo procesar tu solicitud con Mervin AI. Detalles del error:
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <p className="text-red-500">{error}</p>
            <p>
              Posibles soluciones:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verifica tu conexión a internet</li>
              <li>Asegúrate de que la configuración del servicio de IA esté correcta</li>
              <li>Intenta con un texto más breve o con menos caracteres especiales</li>
              <li>Contacta al administrador si el problema persiste</li>
            </ul>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}