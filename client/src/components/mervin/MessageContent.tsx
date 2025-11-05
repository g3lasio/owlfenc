import { useTypingEffect } from "@/hooks/useTypingEffect";
import { ExternalLink } from "lucide-react";

interface MessageContentProps {
  content: string;
  sender: "user" | "assistant";
  enableTyping?: boolean;
}

function parseContentWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: Array<{ type: 'text' | 'link', content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    parts.push({
      type: 'link',
      content: match[0]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text' as const, content: text }];
}

export function MessageContent({ content, sender, enableTyping = true }: MessageContentProps) {
  const shouldType = sender === "assistant" && enableTyping;
  const { displayedText, isTyping } = useTypingEffect(content, 15, shouldType);
  
  const textToRender = shouldType ? displayedText : content;
  const parts = parseContentWithLinks(textToRender);
  
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={index}
              href={part.content}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/50 hover:decoration-cyan-400 transition-colors"
              data-testid={`link-${index}`}
            >
              {part.content}
              <ExternalLink className="w-3 h-3 inline-block" />
            </a>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
      {isTyping && <span className="animate-pulse ml-0.5">▋</span>}
    </div>
  );
}
