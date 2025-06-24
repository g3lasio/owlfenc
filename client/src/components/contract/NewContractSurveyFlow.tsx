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
  Eye,
  Shield,
  Brain,
  FileText
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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { enhanceDescriptionWithAI, generateAdditionalClauses } from "@/services/openaiService";
import { IntelligentContractService } from "@/services/intelligentContractService";

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

  // Sistema inteligente para auto-completar y optimizar flujo
  const handleIntelligentStep = async () => {
    // Si se capturó una dirección, auto-completar el estado
    if (answers['property.address'] && !answers['legal.state']) {
      const extractedState = IntelligentContractService.extractStateFromAddress(answers['property.address']);
      setAnswers(prev => ({
        ...prev,
        'legal.state': extractedState
      }));
      
      toast({
        title: "🤖 Mervin AI - Smart Auto-completion",
        description: `State automatically detected: ${extractedState}`,
        variant: "default"
      });
    }

    // Si hay descripción básica del proyecto, ofrecer mejora automática
    if (answers['project.description'] && selectedCategory && answers['project.description'].length > 10) {
      try {
        const enhancedDesc = await IntelligentContractService.enhanceProjectDescription(
          answers['project.description'], 
          selectedCategory
        );
        
        if (enhancedDesc && enhancedDesc !== answers['project.description']) {
          setOriginalDescription(answers['project.description']);
          setEnhancedDescription(enhancedDesc);
          setIsAIDialogOpen(true);
          return; // Parar para mostrar mejora
        }
      } catch (error) {
        console.log('Enhancement not available');
      }
    }

    // Generar cláusulas legales automáticamente si hay suficiente información
    if (selectedCategory && answers['property.address'] && !isGeneratingClauses) {
      setIsGeneratingClauses(true);
      
      try {
        const projectInfo = {
          category: selectedCategory,
          address: answers['property.address'],
          description: answers['project.description'] || '',
          totalCost: answers['payment.totalAmount'] || '',
          timeline: answers['project.timeline'] || '',
          state: answers['legal.state'] || ''
        };
        
        const legalClauses = await IntelligentContractService.generateLegalClauses(projectInfo);
        
        if (legalClauses && legalClauses.trim().length > 0) {
          setAiGeneratedClauses(legalClauses);
          setIsClausesDialogOpen(true);
          
          toast({
            title: "🤖 Mervin AI - Smart Legal Protection",
            description: "Intelligent clauses generated based on your project details",
            variant: "default"
          });
        }
      } catch (error) {
        console.log('Legal clauses generation not available');
      } finally {
        setIsGeneratingClauses(false);
      }
    }
  };

  // Advance to the next step
  const handleNext = async () => {
    // Validate the current questions
    if (!validateCurrentGroup()) {
      return;
    }
    
    // Ejecutar lógica inteligente antes de avanzar
    await handleIntelligentStep();
    
    if (currentStep < questionGroups.length - 1) {
      // Revisar si la siguiente pregunta debe omitirse
      let nextStep = currentStep + 1;
      
      // Omitir pregunta del estado si ya tenemos dirección
      const nextGroup = questionGroups[nextStep];
      if (nextGroup && nextGroup.questions.some(q => q.id === 'legal.state') && answers['property.address']) {
        // Auto-completar estado y saltar esa pregunta
        const extractedState = IntelligentContractService.extractStateFromAddress(answers['property.address']);
        setAnswers(prev => ({
          ...prev,
          'legal.state': extractedState
        }));
        
        // Buscar el siguiente paso que no sea redundante
        nextStep = nextStep + 1 < questionGroups.length ? nextStep + 1 : nextStep;
        
        toast({
          title: "🚀 Optimized Flow",
          description: `State question skipped - automatically detected: ${extractedState}`,
        });
      }
      
      setCurrentStep(nextStep);
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

  // State for contract preview dialog
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewContractData, setPreviewContractData] = useState<Record<string, any>>({});
  
  // Show preview of the contract
  const handlePreview = () => {
    // Format the answers for the contract with all provided data
    const formattedData = formatAnswersForContract(answers);
    setPreviewContractData(formattedData);
    setIsPreviewDialogOpen(true);
    
    // Also call the onPreview prop if provided
    if (onPreview) {
      onPreview(formattedData);
    }
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
                Generate Clauses with Mervin AI
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
        
        {/* Cyberpunk Progress Indicator */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cyan-400 font-mono">System Progress</span>
            <span className="text-cyan-400 font-mono">{Math.round(progress)}%</span>
          </div>
          
          <div className="relative">
            {/* Progress Bar Background */}
            <div className="w-full h-4 bg-black border border-cyan-500/30 rounded-lg  relative">
              {/* Animated Progress Fill */}
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-300 transition-all duration-700 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                {/* Scanning Line Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
              
              {/* Holographic Border Effect */}
              <div className="absolute inset-0 border border-cyan-400/50 rounded-lg pointer-events-none"></div>
              
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-400"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-400"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-400"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-400"></div>
            </div>
            
            {/* Progress Steps Indicators */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-cyan-400/60">
              {questionGroups.map((_, index) => (
                <div 
                  key={index}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'text-cyan-400' : 'text-gray-600'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mb-1 ${
                    index <= currentStep 
                      ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' 
                      : 'bg-gray-600'
                  }`}></div>
                  <span className="font-mono text-[10px]">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dynamic Status Text */}
          <div className="text-center">
            <span className="text-xs text-cyan-400/80 font-mono">
              Step {currentStep + 1} of {questionGroups.length} • {currentGroup?.title || 'Processing'}
            </span>
          </div>
        </div>
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
            <Alert className="mt-4 border-cyan-500/30 bg-cyan-500/5">
              <AlertDescription className="flex items-center text-cyan-400">
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-cyan-400" />
                <span className="font-mono">Loading your company profile information...</span>
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
          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={handlePreview}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          
          <Button 
            onClick={handleNext}
            className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:from-cyan-400 hover:to-cyan-300 border-0 shadow-lg shadow-cyan-500/20"
          >
            {isLastStep ? 'Complete Contract' : 'Next Step'}
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
                  <div className="border rounded-md p-3 bg-muted/30 text-sm min-h-[200px] ">
                    {originalDescription || "No description"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Enhanced Description</Label>
                  <div className="border rounded-md p-3 bg-primary/5 text-sm min-h-[200px] ">
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
        <DialogContent className="max-w-4xl max-h-[80vh]  flex flex-col border-cyan-500/30 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center text-cyan-400">
              <Shield className="mr-2 h-5 w-5 text-cyan-400" />
              🤖 Mervin AI - Smart Legal Protection
            </DialogTitle>
            <DialogDescription className="text-cyan-300/80">
              Based on your project details, Mervin AI has generated specific legal clauses to protect your interests and ensure compliance.
            </DialogDescription>
          </DialogHeader>
          
          {isGeneratingClauses ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-cyan-400" />
              <p className="text-cyan-400 font-mono">Mervin AI analyzing project...</p>
              <p className="text-sm text-cyan-300/60 mt-2">Generating protective legal clauses</p>
            </div>
          ) : (
            <>
              <div className="space-y-4  flex-1 p-1">
                {/* AI Analysis Summary */}
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <h4 className="font-semibold text-cyan-400 mb-2 flex items-center">
                    <Brain className="mr-2 h-4 w-4" />
                    AI Analysis Summary
                  </h4>
                  <div className="text-sm text-cyan-200/80 space-y-1">
                    <p>• <strong>Project Type:</strong> {selectedCategory}</p>
                    <p>• <strong>Location:</strong> {answers['property.address']}</p>
                    <p>• <strong>State Regulations:</strong> {answers['legal.state'] || 'Detected from address'}</p>
                    <p>• <strong>Risk Assessment:</strong> Generated protective clauses based on project scope</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-cyan-400 flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    🛡️ AI-Generated Protective Clauses
                  </Label>
                  <p className="text-sm text-cyan-300/60">
                    These clauses have been specifically tailored to your {selectedCategory} project to provide legal protection.
                  </p>
                  
                  <div className="border rounded-md p-4 bg-black/50 border-cyan-500/30 text-sm  whitespace-pre-wrap max-h-64">
                    {aiGeneratedClauses || "No clauses available"}
                  </div>
                  
                  {/* AI Confidence Indicator */}
                  <div className="mt-3 flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400">AI Confidence: High</span>
                    </div>
                    <span className="text-cyan-400/60">•</span>
                    <span className="text-cyan-400/60">Based on {selectedCategory} project analysis</span>
                    <span className="text-cyan-400/60">•</span>
                    <span className="text-cyan-400/60">State-specific compliance included</span>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsClausesDialogOpen(false)} className="border-gray-600 text-gray-300">
                  Skip AI Suggestions
                </Button>
                <Button onClick={applyGeneratedClauses} className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-black">
                  <Shield className="h-4 w-4 mr-2" />
                  Apply Smart Clauses
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog for Contract Preview */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]  flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa del Contrato</DialogTitle>
          </DialogHeader>
          
          <div className=" flex-1 p-4 bg-white rounded-md border">
            <h2 className="text-2xl font-bold mb-6 text-center">CONTRATO DE SERVICIOS PROFESIONALES</h2>
            
            <div className="space-y-6">
              {/* Información de las partes */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold">1. PARTES DEL CONTRATO</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">CONTRATISTA:</h4>
                    <p>{previewContractData.contractor?.companyName || "No especificado"}</p>
                    <p>{previewContractData.contractor?.contactName || "No especificado"}</p>
                    <p>{previewContractData.contractor?.address || "No especificado"}</p>
                    <p>Teléfono: {previewContractData.contractor?.phone || "No especificado"}</p>
                    <p>Email: {previewContractData.contractor?.email || "No especificado"}</p>
                    {previewContractData.contractor?.license && (
                      <p>Licencia: {previewContractData.contractor.license}</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">CLIENTE:</h4>
                    <p>{previewContractData.client?.name || "No especificado"}</p>
                    <p>{previewContractData.client?.address || "No especificado"}</p>
                    <p>Teléfono: {previewContractData.client?.phone || "No especificado"}</p>
                    <p>Email: {previewContractData.client?.email || "No especificado"}</p>
                  </div>
                </div>
              </section>
              
              {/* Fechas y detalles del contrato */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold">2. INFORMACIÓN DEL CONTRATO</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Fecha de emisión:</strong> {previewContractData.contract?.issueDate || "No especificada"}</p>
                    <p><strong>Fecha de inicio:</strong> {previewContractData.contract?.startDate || "No especificada"}</p>
                    <p><strong>Fecha estimada de finalización:</strong> {previewContractData.contract?.completionDate || "No especificada"}</p>
                  </div>
                  <div>
                    <p><strong>Tipo de proyecto:</strong> {previewContractData.project?.type || "No especificado"}</p>
                    <p><strong>Dirección del proyecto:</strong> {previewContractData.project?.propertyAddress || "No especificada"}</p>
                  </div>
                </div>
              </section>
              
              {/* Alcance del trabajo */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold">3. ALCANCE DEL TRABAJO</h3>
                <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md border">
                  {previewContractData.project?.scope || "No especificado"}
                </div>
                
                {previewContractData.project?.materialRequirements && (
                  <div>
                    <h4 className="font-semibold">Requisitos de materiales:</h4>
                    <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md border">
                      {previewContractData.project.materialRequirements}
                    </div>
                  </div>
                )}
              </section>
              
              {/* Términos de pago */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold">4. TÉRMINOS DE PAGO</h3>
                <div>
                  <p><strong>Monto total del contrato:</strong> {previewContractData.payment?.totalAmount || "No especificado"}</p>
                  <p><strong>Esquema de pago:</strong> {previewContractData.payment?.splitFiftyFifty === "Yes" ? 
                    "50% al firmar, 50% al completar" : 
                    (previewContractData.payment?.schedule || "No especificado")}
                  </p>
                  <p><strong>Penalización por pagos tardíos:</strong> {previewContractData.payment?.latePenalty || "No especificado"}</p>
                </div>
                
                {previewContractData.expenses?.details && (
                  <div>
                    <h4 className="font-semibold">Gastos reembolsables:</h4>
                    <p>{previewContractData.expenses.details}</p>
                  </div>
                )}
              </section>
              
              {/* Equipos y materiales */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold">5. EQUIPOS Y MATERIALES</h3>
                <div>
                  <p><strong>Responsable de proveer equipos:</strong> {previewContractData.equipment?.provider || "No especificado"}</p>
                  {previewContractData.equipment?.clientOwnedTools && (
                    <p><strong>Herramientas propiedad del cliente:</strong> {previewContractData.equipment.clientOwnedTools}</p>
                  )}
                </div>
              </section>
              
              {/* Información legal */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold">6. INFORMACIÓN LEGAL</h3>
                <div>
                  <p><strong>Estado que rige:</strong> {previewContractData.legal?.governingState || "No especificado"}</p>
                  
                  {previewContractData.legal?.requirements && (
                    <div>
                      <h4 className="font-semibold">Requisitos legales especiales:</h4>
                      <p>{previewContractData.legal.requirements}</p>
                    </div>
                  )}
                  
                  {previewContractData.legal?.confidentialityClause && (
                    <div>
                      <h4 className="font-semibold">Cláusulas de confidencialidad:</h4>
                      <p>{previewContractData.legal.confidentialityClause}</p>
                    </div>
                  )}
                  
                  {previewContractData.legal?.restrictions && (
                    <div>
                      <h4 className="font-semibold">Restricciones de subcontratación:</h4>
                      <p>{previewContractData.legal.restrictions}</p>
                    </div>
                  )}
                </div>
              </section>
              
              {/* Cláusulas especiales */}
              {previewContractData.legal?.specialClauses && (
                <section className="space-y-3">
                  <h3 className="text-lg font-bold">7. CLÁUSULAS ESPECIALES</h3>
                  <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md border">
                    {previewContractData.legal.specialClauses}
                  </div>
                </section>
              )}
              
              {/* Firmas */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold">8. FIRMAS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="border-t pt-4">
                    <p className="text-center">____________________________</p>
                    <p className="text-center font-semibold">{previewContractData.signatures?.contractorName || "Contratista"}</p>
                    <p className="text-center text-sm">Fecha: _________________</p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-center">____________________________</p>
                    <p className="text-center font-semibold">{previewContractData.signatures?.clientName || "Cliente"}</p>
                    <p className="text-center text-sm">Fecha: _________________</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => setIsPreviewDialogOpen(false)}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewContractSurveyFlow;