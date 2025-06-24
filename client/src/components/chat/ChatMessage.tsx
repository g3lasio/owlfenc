
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Message } from "./ChatInterface";

interface Option {
  text: string;
  clickable: boolean;
}

interface ChatMessageProps {
  message: Message;
  onOptionClick?: (option: string) => void;
  onActionClick?: (action: { label: string; onClick: () => void }) => void;
}

const extractProgress = (content: string): number | null => {
  const match = content.match(/\[(\d+)%\s*(?:completado|completed)\]/i);
  return match ? parseInt(match[1]) : null;
};

export default function ChatMessage({ message, onOptionClick, onActionClick }: ChatMessageProps) {
  const messageClass = message.sender === "user" ? "user-message" : "bot-message";
  
  return (
    <div className={`chat-message ${messageClass} flex items-start gap-3 mb-4`}>
      {message.sender === "assistant" && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src="https://i.postimg.cc/h40sSgpH/Untitled-design-2.png" alt="Mervin" />
        </Avatar>
      )}
      <div className="flex-1">
        <p>{message.content}</p>
        
        {message.options && message.options.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {message.options.map((option: string | Option, index) => {
              // Manejar tanto opciones de tipo string como Option
              const optionText = typeof option === 'string' ? option : option.text;
              const isClickable = typeof option === 'string' ? true : option.clickable;
              
              return isClickable ? (
                <Button
                  key={index}
                  variant="outline"
                  size="lg"
                  className="h-auto py-3 px-4 justify-start font-medium relative  group bg-gradient-to-r from-primary/10 to-accent/15 hover:from-primary/30 hover:to-accent/30 transition-all duration-300 border-primary/40 hover:border-primary hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left"
                  onClick={() => onOptionClick && onOptionClick(optionText)}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full duration-700 transition-transform"></span>
                  <i className="ri-cursor-fill mr-2 text-lg text-primary group-hover:scale-110 transition-transform"></i>
                  <span className="text-primary/80 group-hover:text-primary transition-colors">{optionText}</span>
                </Button>
              ) : (
                <div key={index} className="text-muted-foreground px-4 py-3">
                  {optionText}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Soporte para botones de acción */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <Button
                key={index}
                variant="default"
                size="sm"
                onClick={() => onActionClick && onActionClick(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
