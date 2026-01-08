import { useTypingEffect } from "@/hooks/useTypingEffect";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MessageContentProps {
  content: string;
  sender: "user" | "assistant";
  enableTyping?: boolean;
}

type ContentPart = {
  type: 'text' | 'link' | 'markdown-link';
  content: string;
  url?: string;
  linkText?: string;
};

function parseContentWithLinks(text: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let currentIndex = 0;
  
  // Regex para detectar links en formato Markdown: [texto](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  // Regex para detectar URLs directas: http://... o https://...
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Primero, encontrar todos los links Markdown
  const markdownMatches: Array<{ start: number; end: number; text: string; url: string }> = [];
  let match;
  
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    markdownMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      url: match[2]
    });
  }
  
  // Procesar el texto
  for (let i = 0; i < text.length; ) {
    // Verificar si estamos en un link Markdown
    const markdownLink = markdownMatches.find(m => m.start === i);
    
    if (markdownLink) {
      // Agregar el link Markdown
      parts.push({
        type: 'markdown-link',
        content: markdownLink.text,
        url: markdownLink.url,
        linkText: markdownLink.text
      });
      i = markdownLink.end;
      continue;
    }
    
    // Buscar el próximo link Markdown
    const nextMarkdownLink = markdownMatches.find(m => m.start > i);
    const endIndex = nextMarkdownLink ? nextMarkdownLink.start : text.length;
    
    // Extraer el texto hasta el próximo link Markdown
    const segment = text.slice(i, endIndex);
    
    // Buscar URLs directas en este segmento
    const urlMatches: Array<{ start: number; end: number; url: string }> = [];
    urlRegex.lastIndex = 0;
    
    while ((match = urlRegex.exec(segment)) !== null) {
      let url = match[0];
      const trailingPunctuation = /[.,;:!?\)\]}>]+$/;
      const punctuationMatch = url.match(trailingPunctuation);
      let actualEnd = match.index + url.length;
      
      if (punctuationMatch) {
        url = url.slice(0, -punctuationMatch[0].length);
        actualEnd -= punctuationMatch[0].length;
      }
      
      urlMatches.push({
        start: match.index,
        end: actualEnd,
        url: url
      });
    }
    
    // Procesar el segmento con URLs directas
    let segmentIndex = 0;
    for (const urlMatch of urlMatches) {
      // Texto antes del URL
      if (urlMatch.start > segmentIndex) {
        parts.push({
          type: 'text',
          content: segment.slice(segmentIndex, urlMatch.start)
        });
      }
      
      // El URL
      parts.push({
        type: 'link',
        content: urlMatch.url,
        url: urlMatch.url
      });
      
      segmentIndex = urlMatch.end;
    }
    
    // Texto restante del segmento
    if (segmentIndex < segment.length) {
      parts.push({
        type: 'text',
        content: segment.slice(segmentIndex)
      });
    }
    
    i = endIndex;
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

export function MessageContent({ content, sender, enableTyping = true }: MessageContentProps) {
  const navigate = useNavigate();
  const shouldType = sender === "assistant" && enableTyping;
  // Velocidad variable: más rápido para mensajes largos
  const speed = content.length > 200 ? 10 : 15;
  const { displayedText, isTyping } = useTypingEffect(content, speed, shouldType);
  
  const textToRender = shouldType ? displayedText : content;
  const parts = parseContentWithLinks(textToRender);
  
  const handleLinkClick = (url: string, e: React.MouseEvent) => {
    // Si es una ruta interna (empieza con /), usar navigate
    if (url.startsWith('/')) {
      e.preventDefault();
      navigate(url);
    }
    // Si es una URL externa, dejar que el navegador la abra normalmente
  };
  
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'markdown-link') {
          const isInternal = part.url?.startsWith('/');
          return (
            <a
              key={index}
              href={part.url}
              onClick={(e) => part.url && handleLinkClick(part.url, e)}
              target={isInternal ? undefined : "_blank"}
              rel={isInternal ? undefined : "noopener noreferrer"}
              className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/50 hover:decoration-cyan-400 transition-colors font-medium cursor-pointer"
              data-testid={`markdown-link-${index}`}
            >
              {part.linkText}
              {!isInternal && <ExternalLink className="w-3 h-3 inline-block" />}
            </a>
          );
        }
        
        if (part.type === 'link') {
          return (
            <a
              key={index}
              href={part.url}
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
