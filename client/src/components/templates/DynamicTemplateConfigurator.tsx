/**
 * DynamicTemplateConfigurator
 * 
 * Renders template-specific configuration forms based on templateConfigRegistry.
 * This is a PARALLEL system to the legacy Independent Contractor flow.
 * 
 * IMPORTANT: Independent Contractor Agreement uses the existing Step 2 in
 * SimpleContractGenerator. This component is ONLY for new templates like Change Order.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  ChevronDown, 
  ChevronUp, 
  FileEdit, 
  Link as LinkIcon, 
  Edit, 
  DollarSign, 
  Calendar,
  HelpCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  FileText,
  Sparkles,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  templateConfigRegistry,
  type FieldDescriptor,
  type FieldGroup,
  type TemplateUIConfig,
} from "@/lib/templateConfigRegistry";
import { useAuth } from "@/hooks/use-auth";

interface DynamicTemplateConfiguratorProps {
  templateId: string;
  baseData: any;
  onSubmit: (transformedData: any) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const iconMap: Record<string, any> = {
  FileEdit,
  Link: LinkIcon,
  Edit,
  DollarSign,
  Calendar,
};

interface ExistingContract {
  id: string;
  clientName: string;
  projectType?: string;
  createdAt?: string;
}

interface AIEnhancementMetadata {
  aiEnhanced: boolean;
  aiOriginalText: string;
  aiFinalText: string;
  aiModelVersion: string;
  timestamp: string;
}

export default function DynamicTemplateConfigurator({
  templateId,
  baseData,
  onSubmit,
  onBack,
  isSubmitting = false,
}: DynamicTemplateConfiguratorProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [enhancedText, setEnhancedText] = useState('');
  const [originalTextForEnhance, setOriginalTextForEnhance] = useState('');
  const [aiMetadata, setAiMetadata] = useState<AIEnhancementMetadata | null>(null);
  const [appliedEnhancementText, setAppliedEnhancementText] = useState<string | null>(null);
  
  const { data: existingContracts = [], isLoading: loadingContracts } = useQuery<ExistingContract[]>({
    queryKey: ['/api/contracts/history'],
    enabled: !!user,
    select: (data: any[]) => {
      return data.map((contract: any) => ({
        id: contract.contractId || contract.id,
        clientName: contract.clientName || contract.contractData?.client?.name || 'Unknown Client',
        projectType: contract.projectType || contract.contractData?.project?.type || 'Construction',
        createdAt: contract.createdAt,
      }));
    },
  });
  
  const configEntry = templateConfigRegistry.get(templateId);
  
  if (!configEntry) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">
            No configuration found for template: {templateId}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { config, transformToTemplateData } = configEntry;
  
  const defaultValues = config.groups.reduce((acc, group) => {
    group.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        acc[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        acc[field.id] = false;
      } else if (field.type === 'number' || field.type === 'currency') {
        acc[field.id] = 0;
      } else {
        acc[field.id] = '';
      }
    });
    return acc;
  }, {} as Record<string, any>);

  const form = useForm({
    resolver: zodResolver(config.zodSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedValues = form.watch();

  useEffect(() => {
    config.groups.forEach((group) => {
      if (group.collapsed) {
        setCollapsedGroups((prev) => new Set(prev).add(group.id));
      }
    });
  }, [config.groups]);

  useEffect(() => {
    if (appliedEnhancementText !== null && watchedValues.changeDescription !== appliedEnhancementText) {
      setAiMetadata(null);
      setAppliedEnhancementText(null);
    }
  }, [watchedValues.changeDescription, appliedEnhancementText]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleFormSubmit = (formData: any) => {
    const transformedData = transformToTemplateData(formData, baseData);
    if (aiMetadata && appliedEnhancementText && formData.changeDescription === appliedEnhancementText) {
      transformedData.aiEnhancement = aiMetadata;
    }
    onSubmit(transformedData);
  };

  const handleEnhanceWithAI = async () => {
    const currentDescription = form.getValues('changeDescription');
    if (!currentDescription || currentDescription.trim().length < 5) {
      toast({
        title: "Text too short",
        description: "Please enter at least 5 characters to enhance with AI.",
        variant: "destructive",
      });
      return;
    }

    setOriginalTextForEnhance(currentDescription);
    setIsEnhancing(true);

    try {
      const response = await fetch('/api/project/enhance-change-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          originalText: currentDescription,
          costType: form.getValues('costType') || 'addition',
          additionalCost: form.getValues('additionalCost') || 0,
          adjustTimeline: form.getValues('adjustTimeline') || false,
          newCompletionDate: form.getValues('newCompletionDate'),
          originalContract: {
            clientName: baseData?.client?.name,
            originalTotal: baseData?.financials?.total,
            originalDate: baseData?.signedDate,
            projectType: baseData?.project?.type,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEnhancedText(data.enhancedDescription);
        setAiMetadata(data.metadata);
        setShowEnhanceModal(true);
      } else {
        throw new Error(data.error || 'Enhancement failed');
      }
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      toast({
        title: "Enhancement failed",
        description: error.message || "Unable to enhance description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApplyEnhancement = () => {
    form.setValue('changeDescription', enhancedText, { shouldValidate: true });
    setAppliedEnhancementText(enhancedText);
    setShowEnhanceModal(false);
    toast({
      title: "Enhancement applied",
      description: "Your description has been updated with the AI-enhanced version.",
    });
  };

  const handleCancelEnhancement = () => {
    setShowEnhanceModal(false);
    setEnhancedText('');
    setAiMetadata(null);
  };

  const handleRegenerate = () => {
    setShowEnhanceModal(false);
    handleEnhanceWithAI();
  };

  const shouldShowField = (field: FieldDescriptor): boolean => {
    if (!field.showIf) return true;
    const dependentValue = watchedValues[field.showIf.field];
    return dependentValue === field.showIf.value;
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  const renderField = (field: FieldDescriptor) => {
    if (!shouldShowField(field)) return null;

    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          <FormItem className="space-y-2">
            <FormLabel className="flex items-center gap-2">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </FormLabel>
            <FormControl>
              {renderFieldInput(field, formField)}
            </FormControl>
            {field.helpText && (
              <FormDescription className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {field.helpText}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const renderFieldInput = (field: FieldDescriptor, formField: any) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            {...formField}
            placeholder={field.placeholder}
            data-testid={`input-${field.id}`}
          />
        );

      case 'contract-reference':
        return (
          <Select
            value={formField.value || ''}
            onValueChange={formField.onChange}
          >
            <SelectTrigger data-testid={`select-${field.id}`}>
              <SelectValue placeholder={loadingContracts ? "Loading contracts..." : "Select a contract"} />
            </SelectTrigger>
            <SelectContent>
              {loadingContracts ? (
                <SelectItem value="_loading" disabled>
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                </SelectItem>
              ) : existingContracts.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  No contracts found
                </SelectItem>
              ) : (
                existingContracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{contract.clientName}</span>
                      <span className="text-xs text-muted-foreground">
                        #{contract.id.slice(-6)}
                      </span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        const isChangeDescription = field.id === 'changeDescription' && templateId === 'change-order';
        return (
          <div className="space-y-2">
            <Textarea
              {...formField}
              placeholder={field.placeholder}
              className="min-h-[100px]"
              data-testid={`textarea-${field.id}`}
            />
            {isChangeDescription && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnhanceWithAI}
                disabled={isEnhancing || !formField.value || formField.value.trim().length < 5}
                className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                data-testid="button-enhance-ai"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Enhance with AI
                  </>
                )}
              </Button>
            )}
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            {...formField}
            onChange={(e) => formField.onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            data-testid={`input-${field.id}`}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              type="text"
              inputMode="decimal"
              {...formField}
              value={formField.value === 0 ? '' : formField.value}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || val === '.') {
                  formField.onChange(0);
                } else {
                  const num = parseFloat(val);
                  if (!isNaN(num)) {
                    formField.onChange(num);
                  }
                }
              }}
              placeholder={field.placeholder || '0.00'}
              className="pl-7"
              data-testid={`input-${field.id}`}
            />
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            {...formField}
            data-testid={`input-${field.id}`}
          />
        );

      case 'select':
        return (
          <Select
            value={formField.value}
            onValueChange={formField.onChange}
          >
            <SelectTrigger data-testid={`select-${field.id}`}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formField.value}
              onCheckedChange={formField.onChange}
              data-testid={`checkbox-${field.id}`}
            />
            <span className="text-sm text-muted-foreground">
              {field.label}
            </span>
          </div>
        );

      default:
        return (
          <Input
            {...formField}
            placeholder={field.placeholder}
            data-testid={`input-${field.id}`}
          />
        );
    }
  };

  const renderFieldGroup = (group: FieldGroup) => {
    const isCollapsed = collapsedGroups.has(group.id);
    const GroupIcon = group.icon ? iconMap[group.icon] : null;

    return (
      <Collapsible
        key={group.id}
        open={!isCollapsed}
        onOpenChange={() => toggleGroup(group.id)}
      >
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {GroupIcon && (
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <GroupIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    {group.description && (
                      <CardDescription className="text-sm">
                        {group.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-6 space-y-4">
              {group.fields.map((field) => renderField(field))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  const ConfigIcon = iconMap[config.icon] || FileEdit;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <ConfigIcon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      {config.helpText && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{config.helpText}</p>
        </div>
      )}

      {/* Read-only Contract Summary for Change Orders */}
      {templateId === 'change-order' && baseData.linkedContractId && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700">
          <CardHeader className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-orange-800 dark:text-orange-200">Original Contract</CardTitle>
                <CardDescription className="text-orange-600 dark:text-orange-400">This Change Order modifies the following contract</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-orange-600 dark:text-orange-400 font-medium">Contract ID:</span>
                <p className="text-orange-800 dark:text-orange-200 font-mono text-xs">{baseData.linkedContractId}</p>
              </div>
              <div>
                <span className="text-orange-600 dark:text-orange-400 font-medium">Client:</span>
                <p className="text-orange-800 dark:text-orange-200">{baseData.client?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-orange-600 dark:text-orange-400 font-medium">Original Total:</span>
                <p className="text-orange-800 dark:text-orange-200 font-semibold">
                  ${(baseData.financials?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {baseData.signedDate && (
                <div>
                  <span className="text-orange-600 dark:text-orange-400 font-medium">Signed Date:</span>
                  <p className="text-orange-800 dark:text-orange-200">{new Date(baseData.signedDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          {config.groups.map((group) => renderFieldGroup(group))}

          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="gap-2"
              data-testid="button-generate-document"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Document
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={showEnhanceModal} onOpenChange={(open) => { if (!open) handleCancelEnhancement(); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI-Enhanced Description
            </DialogTitle>
            <DialogDescription>
              Review the professionally enhanced version of your change order description.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto my-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground font-medium mb-1">Original Text:</p>
              <p className="text-sm text-muted-foreground">{originalTextForEnhance}</p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-2">Enhanced Version:</p>
              <div className="text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
                {enhancedText}
              </div>
            </div>
            
            {aiMetadata && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded">
                  {aiMetadata.aiModelVersion}
                </span>
                <span>{new Date(aiMetadata.timestamp).toLocaleString()}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelEnhancement}
              className="gap-2"
              data-testid="button-cancel-enhance"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerate}
              disabled={isEnhancing}
              className="gap-2"
              data-testid="button-regenerate"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button
              type="button"
              onClick={handleApplyEnhancement}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              data-testid="button-apply-enhance"
            >
              <Check className="h-4 w-4" />
              Apply Enhancement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
