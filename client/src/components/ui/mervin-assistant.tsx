import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

interface MervinAssistantProps {
  originalText: string;
  onTextEnhanced: (enhancedText: string) => void;
  projectType?: string;
}

export function MervinAssistant({
  originalText,
  onTextEnhanced,
  projectType = "general"
}: MervinAssistantProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const enhanceText = async () => {
    // Validación básica
    if (!originalText || originalText.trim().length < 5) {
      toast({
        title: "Texto muy corto",
        description: "Por favor, introduce un texto más detallado para mejorar.",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);

    try {
      console.log("Starting professional description enhancement with AI...");

      // Usar el endpoint correcto y el formato adecuado para el backend
      const response = await axios.post("/api/ai-enhance", {
        originalText: originalText,
        projectType: projectType
      }, {
        timeout: 30000 // 30 segundos de timeout
      });

      if (response.data && response.data.enhancedDescription) {
        // Aplicar el texto mejorado
        onTextEnhanced(response.data.enhancedDescription);

        toast({
          title: "¡Descripción mejorada!",
          description: "Se ha aplicado una versión mejorada y profesional de tu descripción.",
        });
      } else {
        throw new Error("Formato de respuesta incorrecto");
      }
    } catch (error) {
      console.error("Error al mejorar la descripción:", error);

      toast({
        title: "Enhancement Error",
        description: "Could not enhance the description. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={enhanceText}
      disabled={isEnhancing || !originalText}
      className="flex items-center gap-1 text-xs py-1 h-7 px-2"
    >
      <Wand className="h-3 w-3" />
      {isEnhancing ? "Mejorando..." : "Mejorar con IA"}
    </Button>
  );
}