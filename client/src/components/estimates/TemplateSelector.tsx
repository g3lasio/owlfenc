import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Template {
  id: number;
  name: string;
  type: string;
  html: string;
  isDefault: boolean;
  style?: string;
}

// Plantillas hardcodeadas para asegurar funcionamiento cuando el backend no devuelva datos
const DEFAULT_TEMPLATES = [
  {
    id: 999001,
    name: "Estimado Básico",
    type: "estimate",
    html: "", // El HTML se cargará dinámicamente desde archivo
    isDefault: true,
    style: "standard"
  },
  {
    id: 999002,
    name: "Estimado Profesional",
    type: "estimate",
    html: "", // El HTML se cargará dinámicamente desde archivo
    isDefault: false,
    style: "professional"
  },
  {
    id: 999003,
    name: "Estimado Premium",
    type: "estimate",
    html: "", // El HTML se cargará dinámicamente desde archivo
    isDefault: false,
    style: "luxury"
  }
];

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: number | null;
  onTemplateSelect: (templateId: number) => void;
}

export default function TemplateSelector({
  templates,
  selectedTemplateId,
  onTemplateSelect,
}: TemplateSelectorProps) {
  const [templateStyle, setTemplateStyle] = useState("standard");
  const [allTemplates, setAllTemplates] = useState<(Template & { style?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar templates, combinando los que vienen de props con los default
  useEffect(() => {
    setIsLoading(true);
    
    // Fusionar templates del backend con los predeterminados
    let merged = [...templates];
    
    // Asignar un estilo a los templates que vienen del backend
    merged = merged.map(t => ({
      ...t,
      style: t.name.toLowerCase().includes("profesional") || t.name.toLowerCase().includes("professional") 
        ? "professional" 
        : t.name.toLowerCase().includes("premium") || t.name.toLowerCase().includes("luxury")
          ? "luxury"
          : "standard"
    }));
    
    // Añadir templates predeterminados solo si no hay templates de ese estilo
    const hasStandard = merged.some(t => t.style === "standard");
    const hasProfessional = merged.some(t => t.style === "professional");
    const hasLuxury = merged.some(t => t.style === "luxury");
    
    if (!hasStandard) merged.push(DEFAULT_TEMPLATES[0]);
    if (!hasProfessional) merged.push(DEFAULT_TEMPLATES[1]);
    if (!hasLuxury) merged.push(DEFAULT_TEMPLATES[2]);
    
    setAllTemplates(merged);
    setIsLoading(false);
    
    // Si no hay un template seleccionado, seleccionar el primero del estilo actual
    if (selectedTemplateId === null) {
      const defaultTemplate = merged.find(t => t.style === templateStyle);
      if (defaultTemplate) {
        onTemplateSelect(defaultTemplate.id);
      }
    }
  }, [templates, selectedTemplateId, templateStyle, onTemplateSelect]);

  // Group templates by their intended style
  const standardTemplates = allTemplates.filter(t => t.style === "standard");
  const professionalTemplates = allTemplates.filter(t => t.style === "professional");
  const luxuryTemplates = allTemplates.filter(t => t.style === "luxury");
  
  // Handle style change
  const handleStyleChange = (style: string) => {
    setTemplateStyle(style);
    
    // Automatically select the first template of the selected style
    if (style === "standard" && standardTemplates.length > 0) {
      onTemplateSelect(standardTemplates[0].id);
    } else if (style === "professional" && professionalTemplates.length > 0) {
      onTemplateSelect(professionalTemplates[0].id);
    } else if (style === "luxury" && luxuryTemplates.length > 0) {
      onTemplateSelect(luxuryTemplates[0].id);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <Label className="text-sm font-medium mb-2 block">Estilo de Plantilla</Label>
        <Tabs 
          defaultValue="standard" 
          value={templateStyle}
          onValueChange={handleStyleChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="standard">Estándar</TabsTrigger>
            <TabsTrigger value="professional">Profesional</TabsTrigger>
            <TabsTrigger value="luxury">Premium</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Plantillas básicas con información clara y funcional.
                </p>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="px-2 h-7"
                  onClick={() => setTemplateStyle("professional")}
                >
                  Siguiente
                </Button>
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full max-w-[200px]" />
                  <Skeleton className="h-5 w-full max-w-[150px]" />
                </div>
              ) : standardTemplates.length > 0 ? (
                <div className="border rounded-md p-4">
                  <div className="space-y-2">
                    <RadioGroup 
                      value={selectedTemplateId?.toString() || ""} 
                      onValueChange={(value) => onTemplateSelect(parseInt(value))}
                    >
                      {standardTemplates.map((template) => (
                        <div key={template.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={template.id.toString()} id={`template-${template.id}`} />
                          <Label htmlFor={`template-${template.id}`}>
                            {template.name} {template.isDefault ? "(Predeterminada)" : ""}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Diseño simple
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Información básica
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic">No hay plantillas estándar disponibles</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="professional">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Plantillas profesionales con diseño moderno y detallado.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="px-2 h-7"
                    onClick={() => setTemplateStyle("standard")}
                  >
                    Anterior
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="px-2 h-7"
                    onClick={() => setTemplateStyle("luxury")}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full max-w-[200px]" />
                  <Skeleton className="h-5 w-full max-w-[150px]" />
                </div>
              ) : professionalTemplates.length > 0 ? (
                <div className="border rounded-md p-4 border-blue-200 bg-blue-50/50">
                  <div className="space-y-2">
                    <RadioGroup 
                      value={selectedTemplateId?.toString() || ""} 
                      onValueChange={(value) => onTemplateSelect(parseInt(value))}
                    >
                      {professionalTemplates.map((template) => (
                        <div key={template.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={template.id.toString()} id={`template-${template.id}`} />
                          <Label htmlFor={`template-${template.id}`}>
                            {template.name} {template.isDefault ? "(Predeterminada)" : ""}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Diseño profesional
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Mejor organización
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Visualización clara
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Áreas para firma
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic">No hay plantillas profesionales disponibles</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="luxury">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Plantillas premium con diseño elegante y sofisticado.
                </p>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="px-2 h-7"
                  onClick={() => setTemplateStyle("professional")}
                >
                  Anterior
                </Button>
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full max-w-[200px]" />
                  <Skeleton className="h-5 w-full max-w-[150px]" />
                </div>
              ) : luxuryTemplates.length > 0 ? (
                <div className="border rounded-md p-4 border-indigo-200 bg-indigo-50/50">
                  <div className="space-y-2">
                    <RadioGroup 
                      value={selectedTemplateId?.toString() || ""} 
                      onValueChange={(value) => onTemplateSelect(parseInt(value))}
                    >
                      {luxuryTemplates.map((template) => (
                        <div key={template.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={template.id.toString()} id={`template-${template.id}`} />
                          <Label htmlFor={`template-${template.id}`}>
                            {template.name} {template.isDefault ? "(Predeterminada)" : ""}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Diseño premium
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Colores distintos
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Áreas para firmas
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Garantía extendida
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Check className="inline-block h-3 w-3 mr-1" /> Limpieza de escombros incluida
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic">No hay plantillas premium disponibles</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}