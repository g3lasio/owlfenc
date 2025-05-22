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
  contractQuestions,
  formatAnswersForContract,
  createQuestionGroups,
  projectCategories
} from "@/services/newContractQuestionService";
import { AIEnhancedField } from "@/components/contract/AIEnhancedField";
import { ImprovedAIField } from "@/components/contract/ImprovedAIField";
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

// Import Question type from our service
import { Question as SurveyQuestion } from "@/services/newContractQuestionService";

// Interface for question groups that display 2 questions at a time
interface QuestionGroup {
  questions: SurveyQuestion[];
  title: string;
  description?: string;
}

interface ContractSurveyFlowProps {
  onComplete: (data: Record<string, any>) => void;
  onPreview: (data: Record<string, any>) => void;
}

const NewContractSurveyFlow: React.FC<ContractSurveyFlowProps> = ({ 
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
  
  // States for AI clause generation
  const [isGeneratingClauses, setIsGeneratingClauses] = useState(false);
  const [aiGeneratedClauses, setAiGeneratedClauses] = useState('');
  const [isClausesDialogOpen, setIsClausesDialogOpen] = useState(false);
  
  // Get company profile data
  const { profile, isLoading: isProfileLoading } = useProfile();

  // Create question groups using the helper function
  const questionGroups = createQuestionGroups();
  
  // Update progress when current step changes
  useEffect(() => {
    const totalSteps = questionGroups.length;
    setProgress(((currentStep + 1) / totalSteps) * 100);
  }, [currentStep, questionGroups.length]);

  // Populate answers with company profile data when available
  useEffect(() => {
    if (profile && !isProfileLoading) {
      console.log("Profile loaded, pre-filling company data");
      
      // Create a mapping of profile fields to form fields
      const companyData: Record<string, any> = {
        'contractor.companyName': profile.companyName || '',
        'contractor.contactName': profile.ownerName || '',
        'contractor.address': profile.address || '',
        'contractor.phone': profile.phone || '',
        'contractor.email': profile.email || '',
        'signatures.contractorName': profile.ownerName || ''
      };
      
      // Update answers with the company data (filled or empty)
      setAnswers(prev => ({
        ...prev,
        ...companyData
      }));
    }
  }, [profile, isProfileLoading]);

  // Advance to the next step
  const handleNext = () => {
    // Validate the current questions
    if (!validateCurrentGroup()) {
      return;
    }
    
    if (currentStep < questionGroups.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      // If we're on the last step, complete the survey
      const formattedData = formatAnswersForContract(answers);
      onComplete(formattedData);
    }
  };

  // Go back to the previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string | number) => {
    setAnswers({
      ...answers,
      [field]: value
    });
  };

  // Handle address changes with autocomplete
  const handleAddressChange = (field: string, value: string) => {
    setAnswers({
      ...answers,
      [field]: value
    });

    // Si es la dirección del proyecto, extraer el estado para autocompletar
    if (field === 'project.propertyAddress') {
      // Buscar el patrón de estado (2 letras mayúsculas)
      const stateMatch = value.match(/,\s*([A-Z]{2})\s*\d{5}/) || value.match(/,\s*([A-Z]{2})$/);
      if (stateMatch && stateMatch[1]) {
        setAnswers(prev => ({
          ...prev,
          'legal.governingState': stateMatch[1]
        }));
      }
    }
  };

  // Enhance description with AI
  const handleEnhanceDescription = async () => {
    const field = questionGroups[currentStep].questions.find(q => q.type === 'ai-enhanced')?.field;
    if (!field) return;
    
    const description = answers[field] || '';
    if (!description.trim()) {
      toast({
        title: "Empty description",
        description: "Please write a description before enhancing it with AI",
        variant: "destructive"
      });
      return;
    }
    
    setOriginalDescription(description);
    setIsAIDialogOpen(true);
    setIsAIEnhancingDescription(true);
    
    try {
      const category = answers['project.category'] || 'general';
      const categoryId = projectCategories.find(cat => cat.name === category)?.id || 'general';
      
      const enhancedText = await enhanceDescriptionWithAI(
        description, 
        categoryId
      );
      
      setEnhancedDescription(enhancedText);
    } catch (error) {
      console.error("Error enhancing description:", error);
      toast({
        title: "AI Error",
        description: "Could not enhance the description. Please try again later.",
        variant: "destructive"
      });
      setIsAIDialogOpen(false);
    } finally {
      setIsAIEnhancingDescription(false);
    }
  };
  
  // Generate additional clauses with AI
  const handleGenerateClauses = async () => {
    // Create a formatted dataset for AI
    const formattedData = formatAnswersForContract(answers);
    
    setIsClausesDialogOpen(true);
    setIsGeneratingClauses(true);
    
    try {
      const category = answers['project.category'] || 'general';
      const categoryId = projectCategories.find(cat => cat.name === category)?.id || 'general';
      
      const generatedClauses = await generateAdditionalClauses(
        formattedData,
        categoryId
      );
      
      setAiGeneratedClauses(generatedClauses);
    } catch (error) {
      console.error("Error generating clauses:", error);
      toast({
        title: "AI Error",
        description: "Could not generate additional clauses. Please try again later.",
        variant: "destructive"
      });
      setIsClausesDialogOpen(false);
    } finally {
      setIsGeneratingClauses(false);
    }
  };
  
  // Apply generated clauses
  const applyGeneratedClauses = () => {
    const currentTerms = answers['legal.specialClauses'] || '';
    const updatedTerms = currentTerms ? `${currentTerms}\n\n${aiGeneratedClauses}` : aiGeneratedClauses;
    
    setAnswers({
      ...answers,
      'legal.specialClauses': updatedTerms
    });
    
    setIsClausesDialogOpen(false);
    
    toast({
      title: "Clauses applied",
      description: "The generated clauses have been added to the special clauses section.",
      variant: "default"
    });
  };

  // Apply AI enhanced description
  const applyEnhancedDescription = () => {
    const field = questionGroups[currentStep].questions.find(q => q.type === 'ai-enhanced')?.field;
    if (!field) return;
    
    setAnswers({
      ...answers,
      [field]: enhancedDescription
    });
    setIsAIDialogOpen(false);
  };

  // Validate current question group
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
            title: "Invalid Phone Format",
            description: "Please enter a valid phone number",
            variant: "destructive"
          });
          isValid = false;
        }
      }
    });
    
    return isValid;
  };

  // Show preview of the contract
  const handlePreview = () => {
    const formattedData = formatAnswersForContract(answers);
    onPreview(formattedData);
  };

  // Render the appropriate input control based on question type
  const renderInputControl = (question: SurveyQuestion) => {
    const value = answers[question.field] ?? '';
    
    // Always allow manual editing of fields
    switch (question.type) {
      case 'multiline':
        return (
          <div className="space-y-2">
            {/* Si el campo es candidato para mejora con IA, usar el componente mejorado */}
            {(question.field.includes('scope') || 
              question.field.includes('clauses') || 
              question.field.includes('background') || 
              question.field.includes('terms') || 
              question.field.includes('description')) ? (
              <ImprovedAIField
                value={value}
                onChange={(newValue) => handleInputChange(question.field, newValue)}
                label={question.prompt}
                placeholder={`Enter ${question.prompt.toLowerCase().replace('?', '')}`}
                field={question.field}
                projectType={answers.project_type}
              />
            ) : (
              <Textarea
                id={question.id}
                value={value}
                onChange={(e) => handleInputChange(question.field, e.target.value)}
                placeholder={`Enter ${question.prompt.toLowerCase().replace('?', '')}`}
                className="w-full"
              />
            )}
            {question.id === 'legal_special_clauses' && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateClauses}
                className="flex items-center"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Clauses with AI
              </Button>
            )}
          </div>
        );
      
      case 'ai-enhanced':
        // Get current project type for better AI context
        const projectType = answers['project.type'] || answers['project.category'] || 'general';
        const projectTypeId = projectCategories.find(cat => cat.name === projectType)?.id || 'general';
        
        return (
          <AIEnhancedField
            value={value || ''}
            onChange={(newValue) => handleInputChange(question.field, newValue)}
            label={question.prompt}
            description={question.description}
            placeholder={`Enter ${question.prompt.toLowerCase().replace('?', '')}`}
            projectType={projectTypeId}
            field={question.field}
          />
        );
      
      case 'address':
        return (
          <AddressAutocomplete
            value={value}
            onChange={(address) => handleAddressChange(question.field, address)}
            placeholder={`Enter ${question.prompt.toLowerCase().replace('?', '')}`}
          />
        );
      
      case 'choice':
        return (
          <Select
            value={value}
            onValueChange={(selectedValue) => handleInputChange(question.field, selectedValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${question.prompt.toLowerCase().replace('?', '')}`} />
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
            onChange={(e) => handleInputChange(question.field, e.target.valueAsNumber || e.target.value)}
            className="w-full"
            placeholder={`Enter ${question.prompt.toLowerCase().replace('?', '')}`}
          />
        );
        
      default: // text
        return (
          <div className="relative">
            <Input
              id={question.id}
              value={value}
              onChange={(e) => handleInputChange(question.field, e.target.value)}
              className="w-full"
              placeholder={`Enter ${question.prompt.toLowerCase().replace('?', '')}`}
            />
            {question.useCompanyProfile && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background px-1 rounded">
                <Info className="h-3 w-3 inline mr-1" />
                Using profile data
              </div>
            )}
          </div>
        );
    }
  };

  // Find current group and check if it's the last one
  const currentGroup = questionGroups[currentStep];
  const isLastStep = currentStep === questionGroups.length - 1;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Contract Builder</h2>
        <p className="text-muted-foreground">Complete the form to generate your professional contract.</p>
        <Progress value={progress} className="mt-4" />
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
          
          {/* Company profile loading indicator */}
          {isProfileLoading && currentGroup?.questions.some(q => q.useCompanyProfile) && (
            <Alert className="mt-4">
              <AlertDescription className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading your company profile information...
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
          Previous
        </Button>
        
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={handlePreview}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          
          <Button onClick={handleNext}>
            {isLastStep ? 'Complete' : 'Next'}
            {!isLastStep && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Dialog for AI-enhanced description */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              AI-Enhanced Description
            </DialogTitle>
          </DialogHeader>
          
          {isAIEnhancingDescription ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary mb-4 animate-spin" />
              <p>AI is enhancing your description...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This may take a few seconds
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Original Description</Label>
                  <div className="border rounded-md p-3 bg-muted/30 text-sm min-h-[200px] overflow-y-auto">
                    {originalDescription || "No description"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Enhanced Description</Label>
                  <div className="border rounded-md p-3 bg-primary/5 text-sm min-h-[200px] overflow-y-auto">
                    {enhancedDescription || "No enhancements available"}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={applyEnhancedDescription}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply Enhancements
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog for AI-generated clauses */}
      <Dialog open={isClausesDialogOpen} onOpenChange={setIsClausesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>AI-Generated Additional Clauses</DialogTitle>
          </DialogHeader>
          
          {isGeneratingClauses ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Generating additional clauses...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 overflow-y-auto flex-1 p-1">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    These are suggested additional clauses for your contract, based on the project type and details provided.
                  </p>
                  
                  <div className="border rounded-md p-4 bg-primary/5 text-sm overflow-y-auto whitespace-pre-wrap">
                    {aiGeneratedClauses || "No clauses available"}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsClausesDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={applyGeneratedClauses}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply Clauses
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewContractSurveyFlow;