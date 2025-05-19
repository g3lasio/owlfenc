import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { enhanceDescriptionWithAI } from '@/services/openaiService';
import { useToast } from '@/hooks/use-toast';

// URL de la imagen de Mervin
const MERVIN_IMAGE_URL = 'https://i.postimg.cc/jd0cwYWP/Chat-GPT-Image-May-10-2025-05-35-38-PM.png';

interface MervinAssistantProps {
  originalText: string;
  onTextEnhanced: (enhancedText: string) => void;
  className?: string;
}

export function MervinAssistant({ originalText, onTextEnhanced, className = '' }: MervinAssistantProps) {
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
      // Usando la función correcta con el tipo de proyecto general
      const enhancedText = await enhanceDescriptionWithAI(originalText, 'general');
      onTextEnhanced(enhancedText);
      
      toast({
        title: 'Texto mejorado',
        description: 'La descripción del proyecto ha sido mejorada por Mervin.',
      });
    } catch (error) {
      console.error('Error al mejorar el texto:', error);
      toast({
        title: 'Error',
        description: 'No se pudo mejorar el texto. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
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
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Mejorar descripción con Mervin AI</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}