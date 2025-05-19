import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Wand2 } from 'lucide-react';
import { enhanceDescriptionWithAI } from '@/services/openaiService';
import { useToast } from '@/hooks/use-toast';

// URL de la imagen de Mervin (imagen optimizada y verificada)
const MERVIN_IMAGE_URL = 'https://i.postimg.cc/jd0cwYWP/Chat-GPT-Image-May-10-2025-05-35-38-PM.png';

interface MervinAssistantProps {
  originalText: string;
  onTextEnhanced: (enhancedText: string) => void;
  className?: string;
  projectType?: string;
}

/**
 * Componente MervinAssistant
 * 
 * Proporciona funcionalidad para mejorar textos usando OpenAI
 * Muestra un botón con el icono de Mervin que al hacer clic procesa
 * y mejora el texto proporcionado
 */
export function MervinAssistant({ 
  originalText, 
  onTextEnhanced, 
  className = '',
  projectType = 'general'
}: MervinAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleEnhance = async () => {
    if (!originalText.trim()) {
      toast({
        title: 'Texto vacío',
        description: 'Por favor, ingresa una descripción del proyecto para mejorarla.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("Iniciando mejora de texto con Mervin AI...");
      
      // Usando la función para el tipo de proyecto especificado (o general por defecto)
      const enhancedText = await enhanceDescriptionWithAI(originalText, projectType);
      
      if (!enhancedText || enhancedText === originalText) {
        throw new Error("No se recibió una mejora significativa del texto");
      }
      
      console.log("Texto mejorado recibido correctamente");
      
      // Actualizar el texto en el componente padre
      onTextEnhanced(enhancedText);
      
      toast({
        title: 'Texto mejorado exitosamente',
        description: 'La descripción del proyecto ha sido reformulada profesionalmente por Mervin AI.',
      });
    } catch (error) {
      console.error('Error al mejorar el texto con Mervin AI:', error);
      
      // Mensaje de error más específico y útil
      toast({
        title: 'Error en el procesamiento',
        description: 'No se pudo procesar el texto. Verifica tu conexión y vuelve a intentarlo.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-7 w-7 p-0.5 rounded-full overflow-hidden shadow-sm hover:shadow focus:ring-2 focus:ring-offset-1 focus:ring-primary-400 ${className}`}
            onClick={handleEnhance}
            disabled={isLoading || !originalText.trim()}
            aria-label="Mejorar descripción con Mervin AI"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Imagen principal de Mervin */}
                <img 
                  src={MERVIN_IMAGE_URL} 
                  alt="Mervin AI Asistente" 
                  className="h-full w-full object-cover rounded-full z-10 relative" 
                  onError={(e) => {
                    // Ocultar la imagen y mostrar el fallback
                    (e.target as HTMLImageElement).style.opacity = "0";
                  }}
                />
                {/* Icono de fallback para cuando la imagen no carga */}
                <div className="absolute inset-0 flex items-center justify-center bg-background rounded-full" style={{zIndex: 5}}>
                  <Wand2 className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-primary text-primary-foreground">
          <p className="text-xs">Mejorar descripción profesionalmente</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}