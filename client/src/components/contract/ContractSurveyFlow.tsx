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
  MapPin,
  Eye
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
import { enhanceDescriptionWithAI, generateAdditionalClauses } from "@/services/openaiService";

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

  // Actualizar categoría seleccionada cuando cambie en las respuestas
  useEffect(() => {
    if (answers['project.category'] && answers['project.category'] !== selectedCategory) {
      setSelectedCategory(answers['project.category']);
    }
  }, [answers]);

  // Prellenar datos del perfil de empresa cuando esté disponible
  useEffect(() => {
    if (!isProfileLoading) {
      const companyData: Record<string, any> = {};
      
      // Use profile data if available, otherwise leave fields empty for manual entry
      if (profile && profile.company) {
        if (profile.company.name) {
          companyData['contractor.name'] = profile.company.name;
        }
        
        if (profile.company.address) {
          companyData['contractor.address'] = profile.company.address;
        }
        
        if (profile.company.phone) {
          companyData['contractor.phone'] = profile.company.phone;
        }
        
        if (profile.company.email) {
          companyData['contractor.email'] = profile.company.email;
        }
        
        if (profile.company.license) {
          companyData['contractor.license'] = profile.company.license;
        }
      }
      
      // Create empty company data fields if not available in profile
      // This ensures the form fields exist and can be filled manually
      if (!companyData['contractor.name']) companyData['contractor.name'] = '';
      if (!companyData['contractor.address']) companyData['contractor.address'] = '';
      if (!companyData['contractor.phone']) companyData['contractor.phone'] = '';
      if (!companyData['contractor.email']) companyData['contractor.email'] = '';
      if (!companyData['contractor.license']) companyData['contractor.license'] = '';
      
      // Update answers with the company data (filled or empty)
      setAnswers(prev => ({
        ...prev,
        ...companyData
      }));
    }
  }, [profile, isProfileLoading]);

  // Create question groups strictly following the two-questions-per-screen rule
  const createQuestionGroups = (): QuestionGroup[] => {
    const allQuestions = getQuestionsForCategory();
    const groups: QuestionGroup[] = [];
    
    // Create logical groupings of questions
    const questionGroups: {[key: string]: {title: string, description?: string, questions: SurveyQuestion[]}} = {
      projectType: {
        title: "Project Type",
        description: "Select the type of work for this contract",
        questions: []
      },
      contractorInfo: {
        title: "Contractor Information",
        description: "Your company information for the contract",
        questions: []
      },
      clientBasic: {
        title: "Client Information",
        description: "Basic information about your client",
        questions: []
      },
      clientContact: {
        title: "Client Contact Information",
        questions: []
      },
      projectBasic: {
        title: "Project Details",
        questions: []
      },
      projectDates: {
        title: "Project Timeline",
        description: "Dates and timeframes",
        questions: []
      },
      projectPayment: {
        title: "Payment Information",
        description: "Costs and payment structure",
        questions: []
      },
      projectWarranty: {
        title: "Warranty and Terms",
        description: "Warranty information and additional terms",
        questions: []
      },
      projectSpecific: {
        title: selectedCategory ? `${selectedCategory} Details` : "Project Details",
        questions: []
      }
    };
    
    // Sort questions into logical groups
    allQuestions.forEach(question => {
      if (question.id === 'project_category') {
        questionGroups.projectType.questions.push(question);
      } 
      else if (question.field.startsWith('contractor.')) {
        questionGroups.contractorInfo.questions.push(question);
      }
      else if (question.id === 'client_name' || question.id === 'client_address') {
        questionGroups.clientBasic.questions.push(question);
      }
      else if (question.id === 'client_phone' || question.id === 'client_email') {
        questionGroups.clientContact.questions.push(question);
      }
      else if (question.id === 'project_title' || question.id === 'project_description') {
        questionGroups.projectBasic.questions.push(question);
      }
      else if (question.id === 'start_date' || question.id === 'estimated_duration') {
        questionGroups.projectDates.questions.push(question);
      }
      else if (question.field.startsWith('payment.')) {
        questionGroups.projectPayment.questions.push(question);
      }
      else if (question.field.startsWith('terms.')) {
        questionGroups.projectWarranty.questions.push(question);
      }
      else if (question.projectTypes && question.projectTypes.length > 0) {
        // This is a category-specific question
        questionGroups.projectSpecific.questions.push(question);
      }
    });
    
    // First screen is always just the project type selection
    if (questionGroups.projectType.questions.length > 0) {
      groups.push({
        title: questionGroups.projectType.title,
        description: questionGroups.projectType.description,
        questions: [questionGroups.projectType.questions[0]] // Just one question for the first screen
      });
    }
    
    // Process all other question groups and split them into screens with max 2 questions
    Object.entries(questionGroups).forEach(([groupKey, group]) => {
      // Skip project type as we already handled it
      if (groupKey === 'projectType') return;
      
      // Skip empty groups
      if (group.questions.length === 0) return;
      
      // Process category-specific questions if we have a selected category
      if (groupKey === 'projectSpecific' && selectedCategory) {
        const category = projectCategories.find(cat => cat.name === selectedCategory);
        if (category) {
          // Only include questions for this specific category
          const filteredQuestions = group.questions.filter(q => 
            q.projectTypes && q.projectTypes.includes(category.id)
          );
          
          // Split into groups of 2 questions
          for (let i = 0; i < filteredQuestions.length; i += 2) {
            const groupQuestions = filteredQuestions.slice(i, Math.min(i + 2, filteredQuestions.length));
            if (groupQuestions.length > 0) {
              groups.push({
                title: `${selectedCategory} Details`,
                questions: groupQuestions
              });
            }
          }
        }
      } 
      // For all other groups, split into groups of 2 questions
      else {
        for (let i = 0; i < group.questions.length; i += 2) {
          const groupQuestions = group.questions.slice(i, Math.min(i + 2, group.questions.length));
          if (groupQuestions.length > 0) {
            groups.push({
              title: group.title,
              description: i === 0 ? group.description : undefined, // Only include description in first group
              questions: groupQuestions
            });
          }
        }
      }
    });
    
    return groups;
  };
  
  // Obtener los grupos de preguntas
  const questionGroups = createQuestionGroups();

  // Calcular progreso basado en el paso actual
  useEffect(() => {
    const totalSteps = questionGroups.length;
    setProgress(((currentStep + 1) / totalSteps) * 100);
  }, [currentStep, questionGroups.length]);

  // Estados para cláusulas generadas por IA
  const [isGeneratingClauses, setIsGeneratingClauses] = useState(false);
  const [aiGeneratedClauses, setAiGeneratedClauses] = useState('');
  const [isClausesDialogOpen, setIsClausesDialogOpen] = useState(false);
  
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
  
  // Generar cláusulas adicionales con IA
  const handleGenerateClauses = async () => {
    // Crear un conjunto de datos del contrato para enviar a la IA
    const formattedData = formatAnswersForContract(answers);
    
    setIsClausesDialogOpen(true);
    setIsGeneratingClauses(true);
    
    try {
      const category = projectCategories.find(cat => cat.name === selectedCategory);
      const generatedClauses = await generateAdditionalClauses(
        formattedData,
        category?.id || 'general'
      );
      
      setAiGeneratedClauses(generatedClauses);
    } catch (error) {
      console.error("Error generando cláusulas:", error);
      toast({
        title: "Error de IA",
        description: "No se pudieron generar cláusulas adicionales. Intenta de nuevo más tarde.",
        variant: "destructive"
      });
      setIsClausesDialogOpen(false);
    } finally {
      setIsGeneratingClauses(false);
    }
  };
  
  // Aplicar cláusulas generadas
  const applyGeneratedClauses = () => {
    const currentTerms = answers['terms.additional'] || '';
    const updatedTerms = currentTerms ? `${currentTerms}\n\n${aiGeneratedClauses}` : aiGeneratedClauses;
    
    setAnswers({
      ...answers,
      'terms.additional': updatedTerms
    });
    
    setIsClausesDialogOpen(false);
    
    toast({
      title: "Cláusulas aplicadas",
      description: "Las cláusulas generadas se han añadido a los términos adicionales.",
      variant: "default"
    });
  };

  // Aplicar mejoras de IA
  const applyEnhancedDescription = () => {
    setAnswers({
      ...answers,
      'project.description': enhancedDescription
    });
    setIsAIDialogOpen(false);
  };

  // Enhanced validation for the current question group
  const validateCurrentGroup = (): boolean => {
    const group = questionGroups[currentStep];
    let isValid = true;
    let firstInvalidField: string | null = null;
    
    // Validate each question in the group
    group.questions.forEach(question => {
      const value = answers[question.field];
      const stringValue = value !== undefined ? String(value).trim() : '';
      
      // Check for required fields
      if (question.required && stringValue === '') {
        if (!firstInvalidField) {
          firstInvalidField = question.id;
        }
        
        toast({
          title: "Required Field",
          description: `Please complete the field: ${question.prompt}`,
          variant: "destructive"
        });
        isValid = false;
      }
      
      // Additional validation based on field type
      if (stringValue !== '') {
        // Validate email format
        if (question.field.includes('email') && !stringValue.includes('@')) {
          if (!firstInvalidField) {
            firstInvalidField = question.id;
          }
          
          toast({
            title: "Invalid Email Format",
            description: "Please enter a valid email address",
            variant: "destructive"
          });
          isValid = false;
        }
        
        // Validate phone numbers
        if (question.field.includes('phone') && !/^[\d\s\(\)\-\+]+$/.test(stringValue)) {
          if (!firstInvalidField) {
            firstInvalidField = question.id;
          }
          
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid phone number",
            variant: "destructive"
          });
          isValid = false;
        }
        
        // Validate numbers for number fields
        if (question.type === 'number' && isNaN(Number(stringValue))) {
          if (!firstInvalidField) {
            firstInvalidField = question.id;
          }
          
          toast({
            title: "Invalid Number",
            description: "Please enter a valid numeric value",
            variant: "destructive"
          });
          isValid = false;
        }
      }
    });
    
    // Focus on the first invalid field if there's any
    if (firstInvalidField) {
      const element = document.getElementById(firstInvalidField);
      if (element) {
        element.focus();
      }
    }
    
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
  
  // Las funciones handleEnhanceDescription y applyEnhancedDescription ya están definidas anteriormente

  // Manejar cambio de dirección con autocompletado
  const handleAddressChange = (field: string, value: string) => {
    setAnswers({
      ...answers,
      [field]: value
    });
  };
  
  // Añadir botón de vista previa en cada paso
  const renderPreviewButton = () => {
    return (
      <Button 
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePreview}
        className="ml-2"
      >
        <Eye className="h-4 w-4 mr-2" />
        Vista Previa
      </Button>
    );
  };

  // Ver vista previa antes de completar
  const handlePreview = () => {
    const formattedData = formatAnswersForContract(answers);
    onPreview(formattedData);
  };

  // Renderizar un control de entrada basado en el tipo de pregunta
  const renderInputControl = (question: SurveyQuestion) => {
    const value = answers[question.field] ?? '';
    
    // Ahora SIEMPRE permitimos la edición manual de campos de la empresa
    if (question.useCompanyProfile) {
      return (
        <div className="relative">
          <Input
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.field, e.target.value)}
            className="pr-8"
            disabled={false}
            placeholder={`Ingresa ${question.prompt.toLowerCase()}`}
          />
          <Info className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">
            Esta información se guardará en tu perfil de empresa para futuros contratos.
          </p>
        </div>
      );
    }
    
    switch (question.type) {
      case 'multiline':
        return (
          <div className="space-y-2">
            <Textarea
              id={question.id}
              value={value}
              onChange={(e) => handleInputChange(question.field, e.target.value)}
              placeholder={`Ingresa ${question.prompt.toLowerCase().replace('¿', '').replace('?', '')}`}
              className="w-full"
            />
            {question.id === 'additional_terms' && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateClauses}
                className="flex items-center"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Cláusulas con IA
              </Button>
            )}
          </div>
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
            value={value ? String(value) : undefined} 
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
                  <div className="border rounded-md p-3 bg-muted/30 text-sm min-h-[200px] overflow-y-auto">
                    {originalDescription || "Sin descripción"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Descripción Mejorada</Label>
                  <div className="border rounded-md p-3 bg-primary/5 text-sm min-h-[200px] overflow-y-auto">
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
      
      {/* Diálogo para cláusulas generadas con IA */}
      <Dialog open={isClausesDialogOpen} onOpenChange={setIsClausesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Cláusulas Adicionales Generadas con IA</DialogTitle>
          </DialogHeader>
          
          {isGeneratingClauses ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Generando cláusulas adicionales...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 overflow-y-auto flex-1 p-1">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Estas son cláusulas adicionales sugeridas para tu contrato, basadas en el tipo de proyecto y los detalles proporcionados.
                  </p>
                  
                  <div className="border rounded-md p-4 bg-primary/5 text-sm overflow-y-auto whitespace-pre-wrap">
                    {aiGeneratedClauses || "No hay cláusulas disponibles"}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsClausesDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={applyGeneratedClauses}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Aplicar Cláusulas
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
          <Button 
            variant="outline" 
            onClick={handlePreview}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vista Previa
          </Button>
          
          <Button onClick={handleNext}>
            {isLastStep ? 'Completar' : 'Siguiente'}
            {!isLastStep && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Diálogo para mejora de descripción con IA */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              Mejora de descripción con Inteligencia Artificial
            </DialogTitle>
          </DialogHeader>
          
          {isAIEnhancingDescription ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary mb-4 animate-spin" />
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
                  <div className="border rounded-md p-3 bg-muted/30 text-sm min-h-[200px] overflow-y-auto">
                    {originalDescription || "Sin descripción"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Descripción Mejorada</Label>
                  <div className="border rounded-md p-3 bg-primary/5 text-sm min-h-[200px] overflow-y-auto">
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
    </div>
  );
};

export default ContractSurveyFlow;