import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ChatLayoutMode = 'full' | 'sidebar' | 'closed';

interface ChatContextType {
  isChatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  chatWidth: number;
  setChatWidth: (width: number) => void;
  isMinimized: boolean;
  toggleMinimize: () => void;
  layoutMode: ChatLayoutMode;
  setLayoutMode: (mode: ChatLayoutMode) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'mervin-chat-state';
const DEFAULT_CHAT_WIDTH = 400;
const MIN_CHAT_WIDTH = 300;
const MAX_CHAT_WIDTH = 600;

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { isOpen } = JSON.parse(stored);
        return isOpen ?? false;
      }
    } catch (error) {
      console.warn('Failed to load chat state from localStorage:', error);
    }
    return false;
  });

  const [chatWidth, setChatWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { width } = JSON.parse(stored);
        return width ?? DEFAULT_CHAT_WIDTH;
      }
    } catch (error) {
      console.warn('Failed to load chat width from localStorage:', error);
    }
    return DEFAULT_CHAT_WIDTH;
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  
  const [layoutMode, setLayoutMode] = useState<ChatLayoutMode>('closed');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isOpen: isChatOpen,
        width: chatWidth
      }));
    } catch (error) {
      console.warn('Failed to save chat state to localStorage:', error);
    }
  }, [isChatOpen, chatWidth]);

  const toggleChat = () => setIsChatOpen(prev => !prev);
  const openChat = () => {
    setIsChatOpen(true);
    setIsMinimized(false);
  };
  const closeChat = () => setIsChatOpen(false);

  const toggleMinimize = () => setIsMinimized(prev => !prev);

  const handleSetChatWidth = (width: number) => {
    const clampedWidth = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, width));
    setChatWidth(clampedWidth);
  };

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        toggleChat,
        openChat,
        closeChat,
        chatWidth,
        setChatWidth: handleSetChatWidth,
        isMinimized,
        toggleMinimize,
        layoutMode,
        setLayoutMode
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
