import { 
  Brain, 
  Search, 
  Cog, 
  Sparkles, 
  FileText, 
  Upload, 
  FileCheck, 
  Globe, 
  Lightbulb, 
  Cpu, 
  Wand2, 
  BookOpen, 
  Eye, 
  Calculator,
  Pencil,
  Microscope,
  Zap,
  Database,
  CheckCircle
} from "lucide-react";

interface ThinkingIndicatorProps {
  currentAction?: string;
}

export function ThinkingIndicator({ currentAction }: ThinkingIndicatorProps) {
  const getActionDisplay = () => {
    if (!currentAction) {
      return { icon: Brain, text: "Thinking" };
    }

    const lowerAction = currentAction.toLowerCase();
    
    // File processing states (Spanish & English)
    if (lowerAction.includes('archivo') || lowerAction.includes('file') || lowerAction.includes('pdf')) {
      if (lowerAction.includes('subiendo') || lowerAction.includes('uploading')) {
        return { icon: Upload, text: "Uploading files" };
      }
      if (lowerAction.includes('analizando') || lowerAction.includes('analyzing') || lowerAction.includes('reviewing')) {
        return { icon: FileCheck, text: "Analyzing document" };
      }
      if (lowerAction.includes('leyendo') || lowerAction.includes('reading')) {
        return { icon: BookOpen, text: "Reading file content" };
      }
      if (lowerAction.includes('procesando') || lowerAction.includes('processing')) {
        return { icon: FileText, text: "Processing document" };
      }
      return { icon: FileText, text: "Examining files" };
    }
    
    // Web research states
    if (lowerAction.includes('investigando') || lowerAction.includes('researching') || 
        lowerAction.includes('buscando') || lowerAction.includes('searching') || 
        lowerAction.includes('web') || lowerAction.includes('browsing')) {
      const variants = [
        { icon: Globe, text: "Browsing the web" },
        { icon: Search, text: "Searching for information" },
        { icon: Globe, text: "Researching online" },
        { icon: Database, text: "Gathering data" }
      ];
      return variants[Math.floor(Math.random() * variants.length)];
    }
    
    // Analysis states
    if (lowerAction.includes('analizando') || lowerAction.includes('analyzing') || 
        lowerAction.includes('análisis') || lowerAction.includes('analysis')) {
      const variants = [
        { icon: Microscope, text: "Analyzing deeply" },
        { icon: Brain, text: "Deep analysis" },
        { icon: Eye, text: "Examining details" },
        { icon: Calculator, text: "Computing analysis" }
      ];
      return variants[Math.floor(Math.random() * variants.length)];
    }
    
    // Processing states
    if (lowerAction.includes('procesando') || lowerAction.includes('processing') || 
        lowerAction.includes('ejecutando') || lowerAction.includes('executing')) {
      const variants = [
        { icon: Cog, text: "Processing request" },
        { icon: Cpu, text: "Computing" },
        { icon: Zap, text: "Executing task" },
        { icon: Cog, text: "Working on it" }
      ];
      return variants[Math.floor(Math.random() * variants.length)];
    }
    
    // Generation states
    if (lowerAction.includes('preparando') || lowerAction.includes('preparing') || 
        lowerAction.includes('generando') || lowerAction.includes('generating') ||
        lowerAction.includes('escribiendo') || lowerAction.includes('writing')) {
      const variants = [
        { icon: Sparkles, text: "Generating response" },
        { icon: Wand2, text: "Crafting answer" },
        { icon: Pencil, text: "Writing response" },
        { icon: Sparkles, text: "Creating content" }
      ];
      return variants[Math.floor(Math.random() * variants.length)];
    }
    
    // Verification states
    if (lowerAction.includes('verificando') || lowerAction.includes('verifying') || 
        lowerAction.includes('revisando') || lowerAction.includes('reviewing') ||
        lowerAction.includes('checking')) {
      return { icon: CheckCircle, text: "Verifying information" };
    }
    
    // Default thinking states (varied)
    const thinkingVariants = [
      { icon: Brain, text: "Thinking" },
      { icon: Lightbulb, text: "Processing thoughts" },
      { icon: Brain, text: "Pondering" },
      { icon: Cpu, text: "Computing" }
    ];
    return thinkingVariants[Math.floor(Math.random() * thinkingVariants.length)];
  };

  const { icon: Icon, text } = getActionDisplay();

  return (
    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
      <Icon className="w-4 h-4 animate-pulse" />
      <span className="text-sm">
        {text}
        <span className="inline-flex ml-0.5">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
        </span>
      </span>
    </div>
  );
}
