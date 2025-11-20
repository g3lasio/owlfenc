import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';

export function ChatToggleButton() {
  const { isChatOpen, toggleChat } = useChat();

  return (
    <Button
      onClick={toggleChat}
      size="lg"
      data-testid="button-toggle-chat"
      className={cn(
        "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg transition-all duration-300",
        "hover:scale-110 active:scale-95",
        isChatOpen 
          ? "bg-red-500 hover:bg-red-600" 
          : "bg-primary hover:bg-primary/90"
      )}
      aria-label={isChatOpen ? "Cerrar chat con Mervin" : "Abrir chat con Mervin"}
    >
      {isChatOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageSquare className="h-6 w-6" />
      )}
    </Button>
  );
}
