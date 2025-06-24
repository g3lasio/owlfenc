import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Sparkles, 
  Info, 
  Loader2,
  MapPin
} from "lucide-react";
import { 
  generalContractQuestions,
  fencingSpecificQuestions,
  formatAnswersForContract,
  projectCategories
} from "@/services/contractQuestionService";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useProfile } from "@/hooks/use-profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { enhanceDescriptionWithAI } from "@/services/openaiService";

// Importar el tipo Question del servicio de preguntas
import { Question as SurveyQuestion } from "@/services/contractQuestionService";

// Agrupación de preguntas para mostrar 2 a la vez cuando sea posible
interface QuestionGroup {
  questions: SurveyQuestion[];
  title: string;
  description?: string;
}

interface ContractSurveyFlowProps {
  onComplete: (data: Record<string, any>) => void;
  onPreview: (data: Record<string, any>) => void;
}

const ContractSurveyFlow: React.FC<ContractSurveyFlowProps> = ({ 
  onComplete,
  onPreview
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAIEnhancingDescription, setIsAIEnhancingDescription] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [originalDescription, setOriginalDescription] = useState('');
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const { toast } = useToast();
  
  // Obtener datos del perfil de la empresa
  const { profile, isLoading: isProfileLoading } = useProfile();

  // Combinar preguntas según el tipo de proyecto seleccionado
  const getQuestionsForCategory = () => {
    // Siempre comenzar con las preguntas generales
    let questions = [...generalContractQuestions];
    
    // Encontrar la categoría seleccionada por su nombre
    if (selectedCategory) {
      const category = projectCategories.find(cat => cat.name === selectedCategory);
      if (category) {
        // Si la categoría es cercas, añadir preguntas específicas
        if (category.id === 'fencing') {
          questions = [
            ...generalContractQuestions,
            ...fencingSpecificQuestions
          ];
        }
        
        // Podríamos añadir más categorías específicas aquí
        // Por ejemplo: techos, plomería, electricidad, etc.
        // if (category.id === 'roofing') { ... }
        // if (category.id === 'plumbing') { ... }
        
        // Filtrar preguntas específicas según el tipo de proyecto
        questions = questions.filter(q => 
          // Incluir si aplica a todos los proyectos (sin projectTypes) o si incluye esta categoría
          !q.projectTypes || q.projectTypes.includes(category.id)
        );
      }
    }
    
    return questions;
  };
  
  // Crear grupos de preguntas para mostrar 2 a la vez cuando sea posible
  const createQuestionGroups = (): QuestionGroup[] => {
    const groups: QuestionGroup[] = [];
    const allQuestions = getQuestionsForCategory();
    
    // Categoría de proyecto (primera pantalla)
    const categoryQuestion = allQuestions.find(q => q.id === 'project_category');
    if (categoryQuestion) {
      groups.push({
        title: "Tipo de Proyecto",
        description: "Selecciona el tipo de proyecto para el que necesitas un contrato",
        questions: [categoryQuestion]
      });
    }
    
    // Solo continuar si se ha seleccionado una categoría
    if (!selectedCategory) {
      return groups;
    }
    
    // Datos del cliente (agrupar nombre, apellido, empresa en una pantalla)
    const clientBasicQuestions = allQuestions.filter(q => 
      q.id === 'client_name' || q.id === 'client_company'
    );
    
    if (clientBasicQuestions.length > 0) {
      groups.push({
        title: "Información del Cliente",
        questions: clientBasicQuestions
      });
    }
    
    // Dirección del cliente
    const clientAddressQuestions = allQuestions.filter(q => 
      q.id === 'client_address'
    );
    
    if (clientAddressQuestions.length > 0) {
      groups.push({
        title: "Dirección del Cliente",
        questions: clientAddressQuestions
      });
    }
    
    // Contacto del cliente
    const clientContactQuestions = allQuestions.filter(q => 
      q.id === 'client_phone' || q.id === 'client_email'
    );
    
    if (clientContactQuestions.length > 0) {
      groups.push({
        title: "Contacto del Cliente",
        questions: clientContactQuestions
      });
    }
    
    // Título del proyecto
    const titleQuestion = allQuestions.find(q => q.id === 'project_title');
    if (titleQuestion) {
      groups.push({
        title: "Título del Proyecto",
        questions: [titleQuestion]
      });
    }
    
    // Descripción del proyecto (con AI)
    const descriptionQuestion = allQuestions.find(q => q.id === 'project_description');
    if (descriptionQuestion) {
      groups.push({
        title: "Descripción del Proyecto",
        description: "Describe en detalle el trabajo a realizar. Puedes usar AI para mejorar la descripción.",
        questions: [descriptionQuestion]
      });
    }
    
    // Preguntas específicas según el tipo de proyecto seleccionado
    if (selectedCategory) {
      // Encontrar la categoría por nombre
      const category = projectCategories.find(cat => cat.name === selectedCategory);
      
      if (category) {
        // Filtrar preguntas específicas para esta categoría
        const specificQuestions = allQuestions.filter(q => 
          q.projectTypes && q.projectTypes.includes(category.id)
        );
        
        // Agrupar preguntas específicas (2 por grupo cuando sea posible)
        for (let i = 0; i < specificQuestions.length; i += 2) {
          const groupQuestions = specificQuestions.slice(i, Math.min(i + 2, specificQuestions.length));
          if (groupQuestions.length > 0) {
            groups.push({
              title: `Detalles del ${selectedCategory}`,
              questions: groupQuestions
            });
          }
        }
      }
    }
    
    // Fechas de proyecto
    const dateQuestions = allQuestions.filter(q => 
      q.id === 'start_date' || q.id === 'completion_date'
    );
    
    if (dateQuestions.length > 0) {
      groups.push({
        title: "Fechas del Proyecto",
        questions: dateQuestions
      });
    }
    
    // Precios y pagos
    const pricingQuestions = allQuestions.filter(q => 
      q.id === 'total_price' || q.id === 'deposit' || q.id === 'payment_schedule'
    );
    
    if (pricingQuestions.length > 0) {
      groups.push({
        title: "Detalles de Pago",
        questions: pricingQuestions
      });
    }
    
    // Términos adicionales
    const termsQuestions = allQuestions.filter(q => 
      q.id === 'permits' || q.id === 'additional_terms'
    );
    
    if (termsQuestions.length > 0) {
      groups.push({
        title: "Permisos y Términos Adicionales",
        questions: termsQuestions
      });
    }
    
    return groups;
  };
  
  // Obtener los grupos de preguntas
  const questionGroups = createQuestionGroups();

  // Calcular progreso basado en el paso actual
  useEffect(() => {
    const totalSteps = questionGroups.length;
    setProgress(((currentStep + 1) / totalSteps) * 100);
  }, [currentStep, questionGroups.length]);

  // Mejorar descripción con IA
  const handleEnhanceDescription = async () => {
    const description = answers['project.description'] || '';
    if (!description.trim()) {
      toast({
        title: "Descripción vacía",
        description: "Por favor escribe una descripción antes de mejorarla con IA",
        variant: "destructive"
      });
      return;
    }
    
    setOriginalDescription(description);
    setIsAIDialogOpen(true);
    setIsAIEnhancingDescription(true);
    
    try {
      const category = projectCategories.find(cat => cat.name === selectedCategory);
      const enhancedText = await enhanceDescriptionWithAI(
        description, 
        category?.id || 'general'
      );
      
      setEnhancedDescription(enhancedText);
    } catch (error) {
      console.error("Error mejorando descripción:", error);
      toast({
        title: "Error de IA",
        description: "No se pudo mejorar la descripción. Intenta de nuevo más tarde.",
        variant: "destructive"
      });
      setIsAIDialogOpen(false);
    } finally {
      setIsAIEnhancingDescription(false);
    }
  };

  // Aplicar mejoras de IA
  const applyEnhancedDescription = () => {
    setAnswers({
      ...answers,
      'project.description': enhancedDescription
    });
    setIsAIDialogOpen(false);
    
    toast({
      title: "Descripción mejorada",
      description: "Se ha aplicado la descripción mejorada por IA."
    });
  };

  // Validar el grupo de preguntas actual
  const validateCurrentGroup = (): boolean => {
    const group = questionGroups[currentStep];
    let isValid = true;
    
    group.questions.forEach(question => {
      if (question.required && (!answers[question.field] || String(answers[question.field]).trim() === '')) {
        toast({
          title: "Campo requerido",
          description: `Por favor completa el campo: ${question.prompt}`,
          variant: "destructive"
        });
        isValid = false;
      }
    });
    
    return isValid;
  };

  // Avanzar al siguiente paso
  const handleNext = () => {
    if (!validateCurrentGroup()) return;
    
    if (currentStep < questionGroups.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      // Último paso - completar el proceso
      const formattedData = formatAnswersForContract(answers);
      onComplete(formattedData);
    }
  };

  // Retroceder al paso anterior
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Manejar el cambio en un campo
  const handleInputChange = (field: string, value: string | number) => {
    setAnswers({
      ...answers,
      [field]: value
    });
  };

  // Manejar cambio de dirección con autocompletado
  const handleAddressChange = (field: string, value: string) => {
    setAnswers({
      ...answers,
      [field]: value
    });
  };

  // Ver vista previa antes de completar
  const handlePreview = () => {
    const formattedData = formatAnswersForContract(answers);
    onPreview(formattedData);
  };

  // Renderizar un control de entrada basado en el tipo de pregunta
  const renderInputControl = (question: SurveyQuestion) => {
    const value = answers[question.field] ?? '';
    
    // Si la pregunta usa el perfil de la empresa, mostrar un campo deshabilitado o mensaje
    if (question.useCompanyProfile && profile && !isProfileLoading) {
      const fieldValue = value || 'No disponible';
      
      return (
        <div className="relative">
          <Input
            id={question.id}
            value={fieldValue}
            className="pr-8"
            disabled={true}
          />
          <Info className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
        </div>
      );
    }
    
    switch (question.type) {
      case 'multiline':
        return (
          <Textarea
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.field, e.target.value)}
            placeholder={`Ingresa ${question.prompt.toLowerCase().replace('¿', '').replace('?', '')}`}
            className="w-full"
          />
        );
      
      case 'ai-enhanced':
        return (
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                id={question.id}
                value={value}
                onChange={(e) => handleInputChange(question.field, e.target.value)}
                placeholder={`Describe en detalle el trabajo a realizar`}
                className="w-full min-h-[120px]"
              />
              <Button
                type="button"
                size="sm"
                className="absolute bottom-2 right-2"
                variant="outline"
                onClick={handleEnhanceDescription}
                disabled={isAIEnhancingDescription}
              >
                {isAIEnhancingDescription ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Mejorar con IA
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La IA puede ayudarte a mejorar la claridad y nivel de detalle de tu descripción
            </p>
          </div>
        );
      
      case 'choice':
        return (
          <Select
            value={String(value)}
            onValueChange={(val) => handleInputChange(question.field, val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una opción" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'date':
        return (
          <Input
            id={question.id}
            type="date"
            value={value}
            onChange={(e) => handleInputChange(question.field, e.target.value)}
            className="w-full"
          />
        );
      
      case 'number':
        return (
          <Input
            id={question.id}
            type="number"
            value={value}
            onChange={(e) => handleInputChange(question.field, e.target.value)}
            placeholder="Ingresa un número"
            className="w-full"
          />
        );
      
      case 'address':
        return (
          <div className="space-y-2">
            <AddressAutocomplete
              value={String(value)}
              onChange={(address) => handleAddressChange(question.field, address)}
              placeholder="Ingresa la dirección"
            />
            <p className="text-xs text-muted-foreground flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              Utiliza el autocompletado para dirección exacta
            </p>
          </div>
        );
      
      default:
        return (
          <Input
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.field, e.target.value)}
            placeholder={`Ingresa ${question.prompt.toLowerCase().replace('¿', '').replace('?', '')}`}
            className="w-full"
          />
        );
    }
  };

  // Obtener el grupo actual y verificar si es el último
  const currentGroup = questionGroups[currentStep];
  const isLastStep = currentStep === questionGroups.length - 1;

  return (
    <div className="space-y-6">
      {/* Diálogo para mostrar la comparación de descripciones mejoradas con IA */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Mejora de descripción con IA</DialogTitle>
          </DialogHeader>
          
          {isAIEnhancingDescription ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>La IA está mejorando tu descripción...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Esto puede tomar unos segundos
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Descripción Original</Label>
                  <div className="border rounded-md p-3 bg-muted/30 text-sm min-h-[200px] ">
                    {originalDescription || "Sin descripción"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Descripción Mejorada</Label>
                  <div className="border rounded-md p-3 bg-primary/5 text-sm min-h-[200px] ">
                    {enhancedDescription || "No hay mejoras disponibles"}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={applyEnhancedDescription}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Aplicar Mejoras
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {currentGroup?.title || "Información del Contrato"}
            </h3>
            {currentGroup?.description && (
              <p className="text-sm text-muted-foreground">
                {currentGroup.description}
              </p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Paso {currentStep + 1} de {questionGroups.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {currentGroup?.questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={question.id} className="flex items-center">
                {question.prompt}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {question.description && (
                <p className="text-xs text-muted-foreground mb-2">{question.description}</p>
              )}
              {renderInputControl(question)}
            </div>
          ))}
          
          {/* Información de perfil de empresa si está cargando */}
          {isProfileLoading && currentGroup?.questions.some(q => q.useCompanyProfile) && (
            <Alert className="mt-4">
              <AlertDescription className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cargando información del perfil de tu empresa...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
        
        <div className="space-x-2">
          {isLastStep && (
            <Button 
              variant="outline" 
              onClick={handlePreview}
            >
              <Eye className="mr-2 h-4 w-4" />
              Vista Previa
            </Button>
          )}
          
          <Button onClick={handleNext}>
            {isLastStep ? (
              <>
                <CheckSquare className="mr-2 h-4 w-4" />
                Finalizar
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContractSurveyFlow;