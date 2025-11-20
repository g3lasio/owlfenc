import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type {
  Conversation,
  ConversationListItem,
  ConversationMessage,
  UpdateConversation,
} from '@/../../shared/schema';

interface UseConversationManagerProps {
  userId: string | null;
}

export function useConversationManager({ userId }: UseConversationManagerProps) {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // List conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery<ConversationListItem[]>({
    queryKey: ['/api/conversations', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        // Use apiRequest to include Firebase auth token
        const response = await apiRequest('GET', '/api/conversations');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        // Parse dates from ISO strings
        return data.conversations.map((conv: any) => ({
          ...conv,
          lastActivityAt: new Date(conv.lastActivityAt),
        }));
      } catch (error) {
        // Gracefully handle Firestore index errors and other failures
        // Allow chat to work without conversation history
        console.warn('Failed to load conversation history:', error);
        return [];
      }
    },
    enabled: !!userId,
    retry: false, // Don't retry on failure
  });

  // Get single conversation
  const {
    data: activeConversation,
    isLoading: isLoadingConversation,
  } = useQuery<Conversation | null>({
    queryKey: ['/api/conversations', activeConversationId, userId],
    queryFn: async () => {
      if (!activeConversationId || !userId) return null;
      
      // Use apiRequest to include Firebase auth token
      const response = await apiRequest('GET', `/api/conversations/${activeConversationId}`);
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error);
      
      // Parse dates from ISO strings
      return {
        ...data.conversation,
        createdAt: new Date(data.conversation.createdAt),
        lastActivityAt: new Date(data.conversation.lastActivityAt),
        messages: data.conversation.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      };
    },
    enabled: !!activeConversationId && !!userId,
  });

  // Create conversation
  const createConversationMutation = useMutation({
    mutationFn: async ({
      messages,
      title,
      aiModel,
      category,
    }: {
      messages: ConversationMessage[];
      title: string;
      aiModel: 'chatgpt' | 'claude';
      category?: 'estimate' | 'contract' | 'permit' | 'property' | 'general';
    }) => {
      if (!userId) throw new Error('User ID required');
      
      // userId is derived from auth token automatically, no need to send it
      const response = await apiRequest('POST', '/api/conversations', {
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
        title,
        aiModel,
        category: category || 'general',
      });

      const data = await response.json();
      
      // Parse dates from ISO strings
      return {
        ...data.conversation,
        createdAt: new Date(data.conversation.createdAt),
        lastActivityAt: new Date(data.conversation.lastActivityAt),
        messages: data.conversation.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      };
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', userId] });
      setActiveConversationId(newConversation.conversationId);
    },
  });

  // Update conversation (title, pin, category)
  const updateConversationMutation = useMutation({
    mutationFn: async ({
      conversationId,
      updates,
    }: {
      conversationId: string;
      updates: UpdateConversation;
    }) => {
      if (!userId) throw new Error('User ID required');
      
      // userId is derived from auth token automatically
      await apiRequest('PATCH', `/api/conversations/${conversationId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', userId] });
      if (activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeConversationId, userId] });
      }
    },
  });

  // Add messages to conversation
  const addMessagesMutation = useMutation({
    mutationFn: async ({
      conversationId,
      messages,
    }: {
      conversationId: string;
      messages: ConversationMessage[];
    }) => {
      if (!userId) throw new Error('User ID required');
      
      // userId is derived from auth token automatically
      await apiRequest('POST', `/api/conversations/${conversationId}/messages`, {
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId, userId] });
    },
  });

  // Delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userId) throw new Error('User ID required');
      
      // userId is derived from auth token automatically
      await apiRequest('DELETE', `/api/conversations/${conversationId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', userId] });
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
      }
    },
  });

  // Generate title
  const generateTitleMutation = useMutation({
    mutationFn: async (messages: ConversationMessage[]) => {
      if (!userId) throw new Error('User ID required');
      
      // userId is derived from auth token automatically
      const response = await apiRequest('POST', '/api/conversations/generate-title', {
        messages: messages.map(msg => ({
          sender: msg.sender,
          text: msg.text,
        })),
      });

      const data = await response.json();
      return data.title;
    },
  });

  // Helper functions
  const createConversation = useCallback(
    async (
      messages: ConversationMessage[],
      aiModel: 'chatgpt' | 'claude',
      category?: 'estimate' | 'contract' | 'permit' | 'property' | 'general'
    ) => {
      if (!userId || messages.length === 0) return null;

      // Generate title
      const title = await generateTitleMutation.mutateAsync(messages);

      // Create conversation
      const conversation = await createConversationMutation.mutateAsync({
        messages,
        title,
        aiModel,
        category,
      });

      return conversation;
    },
    [userId, createConversationMutation, generateTitleMutation]
  );

  const loadConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const clearActiveConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const updateConversation = useCallback(
    (conversationId: string, updates: UpdateConversation) => {
      return updateConversationMutation.mutateAsync({ conversationId, updates });
    },
    [updateConversationMutation]
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      return deleteConversationMutation.mutateAsync(conversationId);
    },
    [deleteConversationMutation]
  );

  const addMessages = useCallback(
    (conversationId: string, messages: ConversationMessage[]) => {
      return addMessagesMutation.mutateAsync({ conversationId, messages });
    },
    [addMessagesMutation]
  );

  return {
    // State
    conversations,
    activeConversation,
    activeConversationId,
    isLoadingConversations,
    isLoadingConversation,
    
    // Actions
    createConversation,
    loadConversation,
    clearActiveConversation,
    updateConversation,
    deleteConversation,
    addMessages,
    refetchConversations,
    
    // Mutation states
    isCreating: createConversationMutation.isPending,
    isUpdating: updateConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
    isAddingMessages: addMessagesMutation.isPending,
  };
}
