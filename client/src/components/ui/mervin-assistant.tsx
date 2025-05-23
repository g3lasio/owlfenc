import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Wand2 } from 'lucide-react';
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
        title: 'Empty Description',
        description: 'Please enter a project description to enhance it.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("Starting professional description enhancement with AI...");
      
      // Using Anthropic Claude for professional project description enhancement
      const response = await fetch('/api/enhance-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: originalText.trim(),
          projectType: projectType || 'general construction'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.enhancedDescription) {
        console.log("Professional description enhanced successfully");
        
        // Update the text in the parent component
        onTextEnhanced(data.enhancedDescription);
        
        toast({
          title: 'Description Enhanced Successfully',
          description: 'Your project description has been professionally enhanced and translated to English.',
        });
      } else {
        throw new Error('No enhanced description received');
      }
    } catch (error) {
      console.error('Error enhancing description with AI:', error);
      
      toast({
        title: 'Enhancement Error',
        description: 'Could not enhance the description. Please check your connection and try again.',
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
                <Wand2 className="h-4 w-4 text-primary" />
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