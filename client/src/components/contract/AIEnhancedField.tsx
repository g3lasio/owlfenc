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
import { Wand2, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateEnhancedContent } from "@/services/openaiService";

interface AIEnhancedFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  placeholder?: string;
  projectType?: string;
  field: string;
}

export function AIEnhancedField({
  value,
  onChange,
  label,
  description,
  placeholder = "Enter text or use AI to generate content",
  projectType,
  field,
}: AIEnhancedFieldProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const { toast } = useToast();

  // Helper to determine the field type and create appropriate instructions
  const getFieldInstructions = () => {
    if (field.includes('scope')) {
      return `Provide a detailed scope of work for a ${projectType || 'construction'} project. Include bullet points for key deliverables, timeline details, and specific steps in the project development. Be concise but thorough.`;
    } else if (field.includes('clauses') || field.includes('terms')) {
      return `Suggest additional legal terms or clauses that would be appropriate for a ${projectType || 'construction'} contract. Focus on contractor protections, client responsibilities, and industry-specific considerations.`;
    } else if (field.includes('background')) {
      return `Write a professional background section explaining the purpose and context of this ${projectType || 'construction'} project contract.`;
    }
    return "Generate professional contract language appropriate for this section.";
  };

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    try {
      // Use the user's prompt if provided, otherwise use the default instructions
      const promptToUse = userPrompt.trim() 
        ? userPrompt 
        : getFieldInstructions();
      
      const result = await generateEnhancedContent(promptToUse, projectType || '');
      setGeneratedContent(result);
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate content. Please try again or enter text manually.",
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
      title: "Content Added",
      description: "The AI-generated content has been added to your contract.",
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
          Enhance with Mervin AI
        </Button>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Enhance Contract Content with AI</DialogTitle>
            <DialogDescription>
              Generate professional content for your contract using AI assistance.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="generate">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Content</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Instructions (Optional)</label>
                <Textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={getFieldInstructions()}
                  className="min-h-20"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use our default suggestions for {projectType || 'this type of'} projects.
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
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Professional Content
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="preview" className="mt-4">
              {generatedContent ? (
                <div className="border rounded-md p-4 bg-muted/30 min-h-[200px] whitespace-pre-wrap">
                  {generatedContent}
                </div>
              ) : (
                <div className="border rounded-md p-4 bg-muted/30 min-h-[200px] flex items-center justify-center text-muted-foreground">
                  Generate content first to preview it here
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAcceptGenerated} 
              disabled={!generatedContent || isGenerating}
            >
              <Check className="mr-2 h-4 w-4" />
              Use This Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}