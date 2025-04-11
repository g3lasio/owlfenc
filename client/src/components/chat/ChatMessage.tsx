
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
}

export default function ChatMessage({ message, onOptionClick }: ChatMessageProps) {
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
            {message.options.map((option: Option, index) => (
              option.clickable ? (
                <Button
                  key={index}
                  variant="outline"
                  size="lg"
                  className="h-auto py-3 px-4 justify-start font-medium relative overflow-hidden group bg-gradient-to-r from-primary/5 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-300 border-primary/30 hover:border-primary hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => onOptionClick && onOptionClick(option.text)}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full duration-700 transition-transform"></span>
                  <i className="ri-cursor-fill mr-2 text-lg text-primary group-hover:scale-110 transition-transform"></i>
                  <span className="text-primary/80 group-hover:text-primary transition-colors">{option.text}</span>
                </Button>
              ) : (
                <div key={index} className="text-muted-foreground px-4 py-3">
                  {option.text}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
