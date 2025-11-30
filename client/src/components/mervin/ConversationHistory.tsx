import { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationItem } from './ConversationItem';
import type { ConversationListItem } from '@/../../shared/schema';
import { isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onPinConversation: (id: string, isPinned: boolean) => void;
  isLoading: boolean;
}

export function ConversationHistory({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onPinConversation,
  isLoading,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const { filteredConversations, groupedConversations } = useMemo(() => {
    let filtered = conversations.filter((conv) => {
      const matchesSearch =
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.preview?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    const groups = {
      pinned: [] as ConversationListItem[],
      today: [] as ConversationListItem[],
      yesterday: [] as ConversationListItem[],
      thisWeek: [] as ConversationListItem[],
      thisMonth: [] as ConversationListItem[],
      older: [] as ConversationListItem[],
    };

    filtered.forEach((conv) => {
      if (conv.isPinned) {
        groups.pinned.push(conv);
      } else if (isToday(conv.lastActivityAt)) {
        groups.today.push(conv);
      } else if (isYesterday(conv.lastActivityAt)) {
        groups.yesterday.push(conv);
      } else if (isThisWeek(conv.lastActivityAt)) {
        groups.thisWeek.push(conv);
      } else if (isThisMonth(conv.lastActivityAt)) {
        groups.thisMonth.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return {
      filteredConversations: filtered,
      groupedConversations: groups,
    };
  }, [conversations, searchQuery]);

  const renderGroup = (title: string, items: ConversationListItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-5" key={title}>
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent" />
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">
            {title}
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-gray-800 to-transparent" />
        </div>
        <div className="space-y-1">
          {items.map((conversation) => (
            <ConversationItem
              key={conversation.conversationId}
              conversation={conversation}
              isActive={conversation.conversationId === activeConversationId}
              onClick={() => onSelectConversation(conversation.conversationId)}
              onDelete={() => onDeleteConversation(conversation.conversationId)}
              onPin={() =>
                onPinConversation(conversation.conversationId, !conversation.isPinned)
              }
            />
          ))}
        </div>
      </div>
    );
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop con animación */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sidebar con animación de deslizamiento */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-gradient-to-b from-gray-950 to-black z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Borde decorativo izquierdo */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/40 via-purple-500/20 to-transparent" />

        {/* Header minimalista */}
        <div className="relative px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Historial</h2>
              <p className="text-[11px] text-gray-500">
                {filteredConversations.length} conversaciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200"
            data-testid="button-close-history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Separador sutil */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />

        {/* Botón Nueva Conversación */}
        <div className="px-5 py-4">
          <Button
            onClick={onNewConversation}
            className="w-full h-10 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-new-conversation"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Conversación
          </Button>
        </div>

        {/* Buscador limpio */}
        <div className="px-5 pb-4">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors duration-200" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-white/5 border-0 text-white placeholder:text-gray-600 rounded-xl focus:ring-1 focus:ring-cyan-500/50 focus:bg-white/10 transition-all duration-200"
              data-testid="input-search-conversations"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Separador */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-gray-800/50 to-transparent" />

        {/* Lista de conversaciones */}
        <ScrollArea className="flex-1 px-3">
          <div className="py-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mb-4" />
                <p className="text-sm text-gray-500">Cargando...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-gray-700" />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  {searchQuery
                    ? 'No se encontraron conversaciones'
                    : 'No tienes conversaciones guardadas'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <>
                {renderGroup('📌 Fijadas', groupedConversations.pinned)}
                {renderGroup('Hoy', groupedConversations.today)}
                {renderGroup('Ayer', groupedConversations.yesterday)}
                {renderGroup('Esta semana', groupedConversations.thisWeek)}
                {renderGroup('Este mes', groupedConversations.thisMonth)}
                {renderGroup('Anteriores', groupedConversations.older)}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Gradiente inferior decorativo */}
        <div className="h-8 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </div>
    </>
  );
}
