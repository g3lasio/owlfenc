import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/contexts/PermissionContext';
import { useToast } from '@/hooks/use-toast';
import { useMervinAgent } from '@/mervin-v2/hooks/useMervinAgent';
import { useConversationManager } from '@/hooks/useConversationManager';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageContent } from '@/components/mervin/MessageContent';
import { ThinkingIndicator } from '@/components/mervin/ThinkingIndicator';
import { SystemStatusBar } from '@/components/mervin/SystemStatusBar';
import { WebResearchIndicator } from '@/components/mervin/WebResearchIndicator';
import { DynamicActionSuggestions } from '@/components/mervin/DynamicActionSuggestions';
import { ConversationHistory } from '@/components/mervin/ConversationHistory';
import {
  X,
  Minimize2,
  Maximize2,
  Send,
  History,
  GripVertical,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreamUpdate } from '@/mervin-v2/lib/AgentClient';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  state?: 'analyzing' | 'thinking' | 'none';
  timestamp?: Date;
};

type MessageState = 'analyzing' | 'thinking' | 'none';

export function PersistentChatPanel() {
  const { isChatOpen, closeChat, chatWidth, setChatWidth, isMinimized, toggleMinimize } = useChat();
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // V2 UI States
  const [activeEndpoints, setActiveEndpoints] = useState<string[]>([]);
  const [currentAIModel, setCurrentAIModel] = useState<'ChatGPT-4o' | 'Claude Sonnet 4' | null>(null);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState<number | undefined>(undefined);
  const [webSearchQuery, setWebSearchQuery] = useState<string | undefined>(undefined);
  const [suggestionContext, setSuggestionContext] = useState<'initial' | 'estimate' | 'contract' | 'permit' | 'property' | 'general'>('initial');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Conversation Manager
  const conversationManager = useConversationManager({
    userId: currentUser?.uid || null,
  });

  // Check if user can use agent mode
  const isFreeUser = userPlan?.id === 4 || userPlan?.id === 5 || 
                      userPlan?.name === "Free Trial" || 
                      userPlan?.name === "Primo Chambeador";

  // ONLY initialize Mervin V2 Agent when chat is OPEN to avoid double execution
  // Initialize Mervin V2 Agent
  const mervinAgent = useMervinAgent({
    userId: currentUser?.uid || 'guest',
    enableStreaming: true,
    language: 'es',
    onStreamUpdate: (update: StreamUpdate) => {
      const content = update.content.toLowerCase();
      
      if (content.includes('estimate') || content.includes('estimado')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'estimate'])));
        setSuggestionContext('estimate');
      }
      if (content.includes('contract') || content.includes('contrato')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'contract'])));
        setSuggestionContext('contract');
      }
      if (content.includes('permit') || content.includes('permiso')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'permit'])));
        setSuggestionContext('permit');
      }
      if (content.includes('property') || content.includes('propiedad')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'property'])));
        setSuggestionContext('property');
      }
      
      if (content.includes('investigando') || content.includes('buscando') || content.includes('web search')) {
        setIsWebSearching(true);
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'research'])));
        setWebSearchQuery(content.split('buscando')[1]?.split('.')[0] || 'información relevante');
      }
      
      if (update.type === 'complete' && isWebSearching) {
        setIsWebSearching(false);
        const match = content.match(/(\d+)\s+resultados?/i);
        if (match) {
          setWebSearchResults(parseInt(match[1]));
        }
      }
      
      if (content.includes('chatgpt') || content.includes('gpt-4o')) {
        setCurrentAIModel('ChatGPT-4o');
      } else if (content.includes('claude') || content.includes('sonnet')) {
        setCurrentAIModel('Claude Sonnet 4');
      }
    }
  });

  // Sync mervinAgent.messages to local messages state
  // Only update if message count changed to preserve IDs and avoid wiping streaming updates
  useEffect(() => {
    const currentLength = mervinAgent.messages?.length || 0;
    if (currentLength !== prevMessagesLengthRef.current) {
      if (mervinAgent.messages && mervinAgent.messages.length > 0) {
        const converted: Message[] = mervinAgent.messages.map((msg, idx) => ({
          id: `msg-${idx}`,
          content: msg.content,
          sender: msg.role === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp || new Date(),
        }));
        setMessages(converted);
      } else {
        setMessages([]);
      }
      prevMessagesLengthRef.current = currentLength;
    }
  }, [mervinAgent.messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mervinAgent.streamingUpdates]);

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || mervinAgent.isProcessing) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await mervinAgent.sendMessage(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Handle textarea auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Resize handler with proper cleanup
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setChatWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    // Always cleanup, whether isResizing or not
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setChatWidth]);

  // Handle conversation actions
  const handleNewConversation = () => {
    setMessages([]);
    setActiveEndpoints([]);
    setCurrentAIModel(null);
    setWebSearchResults(undefined);
    setWebSearchQuery(undefined);
    setSuggestionContext('initial');
    conversationManager.clearActiveConversation();
    setIsHistorySidebarOpen(false);
    mervinAgent.startNewConversation();
  };

  const handleSelectConversation = async (conversationId: string) => {
    mervinAgent.loadConversation(conversationId);
    conversationManager.loadConversation(conversationId);
    setIsHistorySidebarOpen(false);

    setTimeout(() => {
      if (conversationManager.activeConversation) {
        const conv = conversationManager.activeConversation;
        const mervinMessages: Message[] = conv.messages.map(msg => ({
          id: msg.id,
          content: msg.text,
          sender: msg.sender === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp,
          state: msg.state as MessageState | undefined,
        }));
        setMessages(mervinMessages);
        setCurrentAIModel(conv.aiModel === 'claude' ? 'Claude Sonnet 4' : 'ChatGPT-4o');
      }
    }, 300);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await conversationManager.deleteConversation(conversationId);
      if (conversationManager.activeConversationId === conversationId) {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la conversación',
        variant: 'destructive',
      });
    }
  };

  const handlePinConversation = async (conversationId: string, isPinned: boolean) => {
    try {
      await conversationManager.updateConversation(conversationId, { isPinned });
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
  };

  if (!isChatOpen) return null;

  return (
    <>
      {/* Resize Handle - Only show when expanded, not when minimized */}
      {!isMinimized && (
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className={cn(
            "fixed top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-primary/50 transition-colors",
            isResizing && "bg-primary"
          )}
          style={{ right: `${chatWidth}px` }}
          data-testid="chat-resize-handle"
        >
          <div className="absolute top-1/2 -translate-y-1/2 -left-2 bg-background border rounded p-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Chat Panel - Responsive */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-background border-l shadow-2xl z-40 flex flex-col transition-all duration-300",
          // Desktop: Resizable panel
          "hidden md:flex",
          isMinimized && "w-12"
        )}
        style={{ width: isMinimized ? '48px' : `${chatWidth}px` }}
        data-testid="persistent-chat-panel"
      >
      {/* Mobile Fullscreen Overlay */}
      
        {/* Header */}
        <div className="flex-shrink-0 border-b p-3 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
          {!isMinimized && (
            <>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Mervin AI</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
                  data-testid="button-history"
                  title="Historial de conversaciones"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMinimize}
                  data-testid="button-minimize"
                  title="Minimizar"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeChat}
                  data-testid="button-close-chat"
                  title="Cerrar chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          {isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMinimize}
              className="w-full"
              data-testid="button-maximize"
              title="Maximizar"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* System Status Bar */}
            <SystemStatusBar
              isHealthy={mervinAgent.isHealthy}
              version="2.0"
            />

            {/* Web Research Indicator */}
            <WebResearchIndicator
              isSearching={isWebSearching}
              query={webSearchQuery}
              resultsFound={webSearchResults}
            />

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 text-primary/50" />
                  <p className="text-lg font-medium">¡Hola! Soy Mervin</p>
                  <p className="text-sm mt-2">Tu asistente de construcción con IA</p>
                  <div className="mt-6">
                    <DynamicActionSuggestions
                      context={suggestionContext}
                      onSuggestionClick={(text) => {
                        setInputValue(text);
                        textareaRef.current?.focus();
                      }}
                    />
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-4 py-2",
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <MessageContent content={msg.content} sender={msg.sender} />
                  </div>
                </div>
              ))}

              {/* Streaming Updates */}
              {mervinAgent.streamingUpdates.map((update, idx) => (
                <div key={`stream-${idx}`} className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg px-4 py-2 bg-muted">
                    <MessageContent content={update.content} sender="assistant" />
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {mervinAgent.isProcessing && mervinAgent.streamingUpdates.length === 0 && (
                <div className="flex justify-start">
                  <ThinkingIndicator />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Suggestions */}
            {messages.length > 0 && !mervinAgent.isProcessing && (
              <div className="flex-shrink-0 px-4 pb-2">
                <DynamicActionSuggestions
                  context={suggestionContext}
                  onSuggestionClick={(text) => {
                    setInputValue(text);
                    textareaRef.current?.focus();
                  }}
                />
              </div>
            )}

            {/* Input Area */}
            <div className="flex-shrink-0 border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  className="resize-none min-h-[60px] max-h-[200px]"
                  disabled={mervinAgent.isProcessing}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || mervinAgent.isProcessing}
                  size="icon"
                  className="h-[60px] w-[60px] flex-shrink-0"
                  data-testid="button-send-message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Conversation History Sidebar */}
      {isHistorySidebarOpen && !isMinimized && (
        <ConversationHistory
          isOpen={isHistorySidebarOpen}
          conversations={conversationManager.conversations}
          activeConversationId={conversationManager.activeConversationId || null}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onPinConversation={handlePinConversation}
          onClose={() => setIsHistorySidebarOpen(false)}
          isLoading={false}
        />
      )}
    </>
  );
}
