import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Check, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enhanceDescriptionWithAI, generateAdditionalClauses } from "@/services/openaiService";

interface ImprovedAIFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  placeholder?: string;
  projectType?: string;
  field: string;
}

export function ImprovedAIField({
  value,
  onChange,
  label,
  description,
  placeholder = "Enter text or use AI to generate content",
  projectType = "construction",
  field,
}: ImprovedAIFieldProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper to determine the field type and create appropriate instructions
  const getFieldInstructions = () => {
    if (field.includes('scope')) {
      return `Provide a detailed scope of work for a ${projectType} project. Include bullet points for key deliverables, timeline details, and specific steps in the project development. Be concise but thorough.`;
    } else if (field.includes('clauses') || field.includes('terms')) {
      return `Suggest additional legal terms or clauses that would be appropriate for a ${projectType} contract. Focus on contractor protections, client responsibilities, and industry-specific considerations.`;
    } else if (field.includes('background')) {
      return `Write a professional background section explaining the purpose and context of this ${projectType} project contract.`;
    }
    return "Generate professional contract language appropriate for this section.";
  };

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Determinar el tipo de contenido a generar
      let result = "";
      const promptToUse = userPrompt.trim() ? userPrompt : getFieldInstructions();
      
      // Usar el servicio apropiado según el tipo de campo
      if (field.includes('clauses')) {
        // Para cláusulas legales, usamos un enfoque especial
        result = await generateAdditionalClauses({
          projectType: projectType || 'construction'
        }, projectType || 'construction');
      } else {
        // Para otros campos (descripciones, antecedentes, etc.)
        result = await enhanceDescriptionWithAI(promptToUse, projectType || 'construction');
      }
      
      if (result && !result.includes("Error")) {
        setGeneratedContent(result);
      } else {
        throw new Error(result || "No se pudo generar contenido");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      setError(error instanceof Error ? error.message : "Error desconocido generando el contenido");
      toast({
        title: "Error de generación",
        description: "No se pudo generar el contenido. Por favor intenta nuevamente o introduce el texto manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptGenerated = () => {
    onChange(generatedContent);
    setIsDialogOpen(false);
    toast({
      title: "Contenido añadido",
      description: "El contenido generado por IA ha sido añadido a tu contrato.",
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-32"
        />
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-3 right-3 bg-white shadow-sm"
          onClick={() => setIsDialogOpen(true)}
        >
          <Wand2 className="mr-2 h-4 w-4" />
          Mejorar con IA
        </Button>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Mejorar contenido con IA</DialogTitle>
            <DialogDescription>
              Genera contenido profesional para tu contrato utilizando asistencia de IA.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="generate">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generar contenido</TabsTrigger>
              <TabsTrigger value="preview">Vista previa</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Instrucciones personalizadas (Opcional)</label>
                <Textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={getFieldInstructions()}
                  className="min-h-20"
                />
                <p className="text-xs text-muted-foreground">
                  Deja en blanco para usar nuestras sugerencias por defecto para proyectos de {projectType || 'construcción'}.
                </p>
              </div>
              
              <Button 
                onClick={handleGenerateContent} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generar con IA
                  </>
                )}
              </Button>
              
              {error && (
                <div className="bg-destructive/10 p-3 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="preview" className="mt-4">
              {generatedContent ? (
                <div className="space-y-4">
                  <div className="border rounded-md p-4 min-h-[200px] max-h-[300px] overflow-y-auto bg-muted/30">
                    <div className="whitespace-pre-wrap">
                      {generatedContent}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAcceptGenerated} 
                    className="w-full"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aceptar y utilizar este contenido
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Genera contenido primero para ver la vista previa.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}