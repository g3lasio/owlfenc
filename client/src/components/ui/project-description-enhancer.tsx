import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

interface ProjectDescriptionEnhancerProps {
  originalText: string;
  onTextEnhanced: (enhancedText: string) => void;
  projectType?: string;
  className?: string;
}

export function ProjectDescriptionEnhancer({
  originalText,
  onTextEnhanced,
  projectType = "general",
  className = ""
}: ProjectDescriptionEnhancerProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const enhanceDescription = async () => {
    // Validación básica
    if (!originalText || originalText.trim().length < 5) {
      toast({
        title: "Texto insuficiente",
        description: "Por favor, escribe una descripción más detallada para mejorar.",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);

    try {
      console.log("Iniciando mejora de descripción con IA...");

      // Llamar al nuevo endpoint de mejora de descripciones
      const response = await axios.post("/api/project/enhance-description", {
        originalText: originalText.trim(),
        projectType: projectType
      }, {
        timeout: 45000, // 45 segundos de timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success && response.data.enhancedDescription) {
        // Aplicar el texto mejorado
        onTextEnhanced(response.data.enhancedDescription);

        // Mostrar información adicional si está disponible
        let description = "Se ha aplicado una versión profesional en inglés de tu descripción.";
        
        if (response.data.bulletPoints && response.data.bulletPoints.length > 0) {
          description += ` Se incluyeron ${response.data.bulletPoints.length} puntos clave.`;
        }

        if (response.data.source === 'fallback') {
          description += " (Usó método de respaldo)";
        }

        toast({
          title: "¡Descripción mejorada!",
          description: description,
        });

        console.log("Mejora completada exitosamente");
        console.log("Fuente:", response.data.source);
        
      } else {
        throw new Error("Formato de respuesta incorrecto del servidor");
      }

    } catch (error: any) {
      console.error("Error al mejorar la descripción:", error);

      let errorMessage = "No se pudo mejorar la descripción. ";
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += "El proceso tomó demasiado tiempo.";
      } else if (error.response?.status === 400) {
        errorMessage += "Verifica que el texto tenga suficiente contenido.";
      } else if (error.response?.status === 500) {
        errorMessage += "Error interno del servidor.";
      } else {
        errorMessage += "Verifica tu conexión e intenta nuevamente.";
      }

      toast({
        title: "Error de mejora",
        description: errorMessage,
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
      onClick={enhanceDescription}
      disabled={isEnhancing || !originalText || originalText.trim().length < 5}
      className={`flex items-center gap-2 text-xs py-1 h-7 px-3 ${className}`}
    >
      {isEnhancing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Mejorando...
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3" />
          Mejorar con IA
        </>
      )}
    </Button>
  );
}