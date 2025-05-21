import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Template {
  id: number;
  name: string;
  type: string;
  html: string;
  isDefault: boolean;
}

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

  // Group templates by their intended style
  const standardTemplates = templates.filter(t => !t.name.toLowerCase().includes("professional") && !t.name.toLowerCase().includes("luxury"));
  const professionalTemplates = templates.filter(t => t.name.toLowerCase().includes("professional"));
  const luxuryTemplates = templates.filter(t => t.name.toLowerCase().includes("luxury"));
  
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
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Plantillas básicas con información clara y funcional.
              </p>
              {standardTemplates.length > 0 ? (
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
              ) : (
                <p className="text-sm italic">No hay plantillas estándar disponibles</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="professional">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Plantillas profesionales con diseño moderno y detallado.
              </p>
              {professionalTemplates.length > 0 ? (
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
              ) : (
                <p className="text-sm italic">No hay plantillas profesionales disponibles</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="luxury">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Plantillas premium con diseño elegante y sofisticado.
              </p>
              {luxuryTemplates.length > 0 ? (
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