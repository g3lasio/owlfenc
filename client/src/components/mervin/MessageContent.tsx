import { useTypingEffect } from "@/hooks/useTypingEffect";

interface MessageContentProps {
  content: string;
  sender: "user" | "assistant";
  enableTyping?: boolean;
}

export function MessageContent({ content, sender, enableTyping = true }: MessageContentProps) {
  // Solo aplicar efecto de typing a mensajes del asistente
  const shouldType = sender === "assistant" && enableTyping;
  const { displayedText, isTyping } = useTypingEffect(content, 15, shouldType);
  
  return (
    <div className="whitespace-pre-wrap">
      {shouldType ? displayedText : content}
      {isTyping && <span className="animate-pulse ml-0.5">▋</span>}
    </div>
  );
}
