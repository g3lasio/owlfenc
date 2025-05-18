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
import { ChevronLeft, ChevronRight, CheckSquare } from "lucide-react";
import { fenceContractQuestions } from "@/services/contractQuestionService";
import { formatAnswersForContract } from "@/services/contractQuestionService";
import { useToast } from "@/hooks/use-toast";

interface SurveyQuestion {
  id: string;
  field: string;
  prompt: string;
  type: 'text' | 'multiline' | 'date' | 'number' | 'choice';
  options?: string[];
  required?: boolean;
}

// Agrupación de preguntas para mostrar 2 a la vez
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
  const { toast } = useToast();

  // Agrupar preguntas de 2 en 2 para mejor experiencia
  const questionGroups: QuestionGroup[] = [
    {
      title: "Información del Contratista",
      description: "Datos de tu empresa para el contrato",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'contractor_name' || q.id === 'contractor_address'
      )
    },
    {
      title: "Contacto del Contratista",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'contractor_phone' || q.id === 'contractor_email'
      )
    },
    {
      title: "Licencia del Contratista",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'contractor_license'
      )
    },
    {
      title: "Información del Cliente",
      description: "Datos del cliente para el contrato",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'client_name' || q.id === 'client_address'
      )
    },
    {
      title: "Contacto del Cliente",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'client_phone' || q.id === 'client_email'
      )
    },
    {
      title: "Detalles de la Cerca",
      description: "Especificaciones del proyecto",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'fence_type' || q.id === 'fence_material'
      )
    },
    {
      title: "Dimensiones de la Cerca",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'fence_height' || q.id === 'fence_length'
      )
    },
    {
      title: "Portones y Detalles",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'gates' || q.id === 'gate_details'
      )
    },
    {
      title: "Alcance del Proyecto",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'scope_details'
      )
    },
    {
      title: "Cronograma del Proyecto",
      description: "Fechas y plazos de ejecución",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'start_date' || q.id === 'estimated_duration'
      )
    },
    {
      title: "Información de Pago",
      description: "Costos y estructura de pagos",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'total_cost' || q.id === 'deposit_amount'
      )
    },
    {
      title: "Calendario de Pagos",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'payment_schedule'
      )
    },
    {
      title: "Garantías",
      description: "Términos de garantía ofrecidos",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'warranty_period' || q.id === 'warranty_coverage'
      )
    },
    {
      title: "Permisos y Términos Adicionales",
      questions: fenceContractQuestions.filter(q => 
        q.id === 'permits' || q.id === 'additional_terms'
      )
    }
  ];

  // Calcular progreso basado en el paso actual
  useEffect(() => {
    const totalSteps = questionGroups.length;
    setProgress(((currentStep + 1) / totalSteps) * 100);
  }, [currentStep]);

  // Validar el grupo de preguntas actual
  const validateCurrentGroup = (): boolean => {
    const group = questionGroups[currentStep];
    let isValid = true;
    
    group.questions.forEach(question => {
      if (question.required && (!answers[question.field] || answers[question.field].trim() === '')) {
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
  const handleInputChange = (field: string, value: string) => {
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
    const value = answers[question.field] || '';
    
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
      
      case 'choice':
        return (
          <Select 
            value={value} 
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

  const currentGroup = questionGroups[currentStep];
  const isLastStep = currentStep === questionGroups.length - 1;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {currentGroup.title}
            </h3>
            {currentGroup.description && (
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
          {currentGroup.questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={question.id} className="flex items-center">
                {question.prompt}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderInputControl(question)}
            </div>
          ))}
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
              <CheckSquare className="mr-2 h-4 w-4" />
              Vista Previa
            </Button>
          )}
          
          <Button onClick={handleNext}>
            {isLastStep ? 'Completar' : 'Siguiente'}
            {!isLastStep && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContractSurveyFlow;