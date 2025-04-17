import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isDisabled?: boolean;
}

export default function ChatInput({ onSendMessage, isDisabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isDisabled) {
      onSendMessage(message);
      setMessage("");
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);
  
  return (
    <div className="p-4 chat-input">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1 bg-muted rounded-lg border border-border p-2 hover:border-primary focus-within:border-primary transition-colors duration-200">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full bg-transparent resize-none focus:outline-none py-1 px-2 text-foreground scrollbar-hide"
            placeholder="Type your message here..."
            disabled={isDisabled}
          ></textarea>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <button type="button" className="p-1 hover:text-primary rounded-md">
                <i className="ri-attachment-2"></i>
              </button>
              <button type="button" className="p-1 hover:text-primary rounded-md">
                <i className="ri-image-line"></i>
              </button>
              <button type="button" className="p-1 hover:text-primary rounded-md">
                <i className="ri-emotion-line"></i>
              </button>
            </div>
            <div className="text-xs text-muted-foreground">Press Enter to send</div>
          </div>
        </div>
        <Button 
          type="submit" 
          className="p-3 h-auto aspect-square"
          disabled={isDisabled || !message.trim()}
        >
          <i className="ri-send-plane-fill text-lg"></i>
        </Button>
      </form>
    </div>
  );
}
