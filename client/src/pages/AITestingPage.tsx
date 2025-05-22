import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AIEnhancedField } from "@/components/contract/AIEnhancedField";
import { ImprovedAIField } from "@/components/contract/ImprovedAIField";
import { enhanceDescriptionWithAI } from "@/services/openaiService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const AITestingPage = () => {
  const { toast } = useToast();
  
  // Estado para los campos de texto
  const [scopeText, setScopeText] = useState("");
  const [termsText, setTermsText] = useState("");
  const [backgroundText, setBackgroundText] = useState("");
  
  // Estado para el tipo de proyecto seleccionado (para contexto)
  const [projectType, setProjectType] = useState("fencing");
  
  // Estado para mostrar resultados de la API
  const [apiResult, setApiResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Función para probar la API directamente
  const testOpenAIDirect = async () => {
    setIsLoading(true);
    try {
      const result = await enhanceDescriptionWithAI(
        "Instalación de una cerca de madera tratada de 6 pies de altura y 100 pies de longitud", 
        projectType
      );
      setApiResult(result);
      toast({
        title: "Prueba exitosa",
        description: "La API de OpenAI respondió correctamente",
      });
    } catch (error) {
      console.error("Error en prueba directa:", error);
      setApiResult(error instanceof Error ? error.message : "Error desconocido");
      toast({
        title: "Error en prueba",
        description: "La API de OpenAI no respondió correctamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Prueba de Componentes con IA</h1>
      <p className="text-muted-foreground mb-8">
        Esta página permite probar los componentes de IA para mejorar el contenido del contrato sin depender de la base de datos.
      </p>
      
      <Tabs defaultValue="components">
        <TabsList className="mb-6">
          <TabsTrigger value="components">Componentes</TabsTrigger>
          <TabsTrigger value="api">Prueba Directa API</TabsTrigger>
        </TabsList>
        
        <TabsContent value="components" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Contexto del Proyecto</CardTitle>
              <CardDescription>Selecciona el tipo de proyecto para contextualizar las sugerencias de IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  variant={projectType === "fencing" ? "default" : "outline"}
                  onClick={() => setProjectType("fencing")}
                >
                  Cerca
                </Button>
                <Button 
                  variant={projectType === "roofing" ? "default" : "outline"}
                  onClick={() => setProjectType("roofing")}
                >
                  Techo
                </Button>
                <Button 
                  variant={projectType === "painting" ? "default" : "outline"}
                  onClick={() => setProjectType("painting")}
                >
                  Pintura
                </Button>
                <Button 
                  variant={projectType === "construction" ? "default" : "outline"}
                  onClick={() => setProjectType("construction")}
                >
                  Construcción
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Componente Mejorado (ImprovedAIField)</CardTitle>
              <CardDescription>Versión mejorada con mejor manejo de errores y reintentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Alcance del Proyecto</h3>
                <ImprovedAIField
                  value={scopeText}
                  onChange={setScopeText}
                  label="Alcance del Proyecto"
                  field="project_scope"
                  projectType={projectType}
                  description="Describe el alcance del trabajo que se realizará"
                />
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Términos Adicionales</h3>
                <ImprovedAIField
                  value={termsText}
                  onChange={setTermsText}
                  label="Términos Adicionales"
                  field="legal_terms"
                  projectType={projectType}
                  description="Especifica cualquier término legal adicional para el contrato"
                />
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Antecedentes del Proyecto</h3>
                <ImprovedAIField
                  value={backgroundText}
                  onChange={setBackgroundText}
                  label="Antecedentes"
                  field="project_background"
                  projectType={projectType}
                  description="Describe el contexto y antecedentes del proyecto"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Componente Original (AIEnhancedField)</CardTitle>
              <CardDescription>Versión anterior para comparación</CardDescription>
            </CardHeader>
            <CardContent>
              <AIEnhancedField
                value={scopeText}
                onChange={setScopeText}
                label="Alcance del Proyecto"
                field="project_scope"
                projectType={projectType}
                description="Describe el alcance del trabajo que se realizará"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Prueba Directa de API OpenAI</CardTitle>
              <CardDescription>Prueba directa del servicio de OpenAI sin usar los componentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testOpenAIDirect} 
                disabled={isLoading}
              >
                {isLoading ? "Probando..." : "Probar API OpenAI"}
              </Button>
              
              {apiResult && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Resultado:</h3>
                  <div className="p-4 border rounded-md bg-muted/30">
                    <pre className="whitespace-pre-wrap">{apiResult}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITestingPage;