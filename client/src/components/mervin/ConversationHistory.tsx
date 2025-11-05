import { useState, useMemo } from 'react';
import { X, Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConversationItem } from './ConversationItem';
import type { ConversationListItem } from '@/../../shared/schema';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter and group conversations
  const { filteredConversations, groupedConversations } = useMemo(() => {
    // Filter by search query and category
    let filtered = conversations.filter((conv) => {
      const matchesSearch =
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.preview?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' || conv.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    // Group by time periods
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
  }, [conversations, searchQuery, categoryFilter]);

  const renderGroup = (title: string, items: ConversationListItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6" key={title}>
        <h3 className="text-xs font-semibold text-gray-400 mb-2 px-2 uppercase tracking-wider">
          {title}
        </h3>
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-black border-l border-cyan-900/30 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-cyan-900/30 flex items-center justify-between bg-gradient-to-r from-black to-cyan-950/20">
          <div>
            <h2 className="text-lg font-bold text-cyan-400">Historial</h2>
            <p className="text-xs text-gray-400">
              {filteredConversations.length} conversaciones
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            data-testid="button-close-history"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* New Conversation Button */}
        <div className="p-4 border-b border-cyan-900/30">
          <Button
            onClick={onNewConversation}
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold"
            data-testid="button-new-conversation"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Conversación
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 space-y-3 border-b border-cyan-900/30">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900/50 border-cyan-900/30 text-white placeholder:text-gray-500"
              data-testid="input-search-conversations"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1 bg-gray-900/50 border-cyan-900/30 text-white" data-testid="select-category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="estimate">Estimados</SelectItem>
                <SelectItem value="contract">Contratos</SelectItem>
                <SelectItem value="permit">Permisos</SelectItem>
                <SelectItem value="property">Propiedades</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-gray-400">Cargando conversaciones...</p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'No se encontraron conversaciones'
                    : 'No tienes conversaciones guardadas'}
                </p>
              </div>
            ) : (
              <>
                {renderGroup('📌 Fijadas', groupedConversations.pinned)}
                {renderGroup('Hoy', groupedConversations.today)}
                {renderGroup('Ayer', groupedConversations.yesterday)}
                {renderGroup('Esta Semana', groupedConversations.thisWeek)}
                {renderGroup('Este Mes', groupedConversations.thisMonth)}
                {renderGroup('Más Antiguas', groupedConversations.older)}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="p-3 border-t border-cyan-900/30 bg-gray-950/50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total: {conversations.length}</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs border-cyan-700/30 text-cyan-400">
                {conversations.filter((c) => c.category === 'estimate').length} Estimados
              </Badge>
              <Badge variant="outline" className="text-xs border-purple-700/30 text-purple-400">
                {conversations.filter((c) => c.category === 'contract').length} Contratos
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
