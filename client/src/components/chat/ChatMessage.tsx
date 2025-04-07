import { Button } from "@/components/ui/button";
import { Message } from "./ChatInterface";

interface ChatMessageProps {
  message: Message;
  onOptionClick?: (option: string) => void;
}

export default function ChatMessage({ message, onOptionClick }: ChatMessageProps) {
  const messageClass = message.sender === "user" ? "user-message" : "bot-message";
  
  return (
    <div className={`chat-message ${messageClass}`}>
      <p>{message.content}</p>
      
      {message.options && message.options.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {message.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-auto py-2 px-3 justify-start font-normal"
              onClick={() => onOptionClick && onOptionClick(option)}
            >
              <span>{option}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
