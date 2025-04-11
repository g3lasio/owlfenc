
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
    <div className={`chat-message ${messageClass} flex items-start gap-2`}>
      {message.sender === "assistant" && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src="https://i.postimg.cc/h40sSgpH/Untitled-design-2.png" alt="Mervin" />
        </Avatar>
      )}
      <div className="flex-1">
        <p>{message.content}</p>
        
        {message.options && message.options.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {message.options.map((option: Option, index) => (
              option.clickable ? (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 justify-start font-normal"
                  onClick={() => onOptionClick && onOptionClick(option.text)}
                >
                  <span>{option.text}</span>
                </Button>
              ) : (
                <div key={index} className="text-muted-foreground px-3 py-2">
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
