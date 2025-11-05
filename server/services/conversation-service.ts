import { db } from '../firebase-admin';
import type { 
  Conversation, 
  ConversationListItem,
  ConversationMessage,
  UpdateConversation 
} from '../../shared/schema';

const CONVERSATIONS_COLLECTION = 'conversations';

export class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(
    userId: string,
    messages: ConversationMessage[],
    title: string,
    aiModel: 'chatgpt' | 'claude',
    category: 'estimate' | 'contract' | 'permit' | 'property' | 'general' = 'general'
  ): Promise<Conversation> {
    const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc();
    const conversationId = conversationRef.id;

    const now = new Date();
    const conversation: Conversation = {
      conversationId,
      userId,
      title,
      messages,
      createdAt: now,
      lastActivityAt: now,
      aiModel,
      category,
      isPinned: false,
      messageCount: messages.length,
    };

    await conversationRef.set({
      ...conversation,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      messages: messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      })),
    });

    console.log(`💾 [CONVERSATION] Created: ${conversationId} for user: ${userId}`);
    return conversation;
  }

  /**
   * Get a specific conversation by ID
   */
  static async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const conversationDoc = await db.collection(CONVERSATIONS_COLLECTION).doc(conversationId).get();

    if (!conversationDoc.exists) {
      return null;
    }

    const data = conversationDoc.data();
    
    // Security: Verify the conversation belongs to the user
    if (data?.userId !== userId) {
      console.warn(`🚨 [CONVERSATION] Unauthorized access attempt: ${userId} -> ${conversationId}`);
      return null;
    }

    return {
      ...data,
      createdAt: new Date(data.createdAt),
      lastActivityAt: new Date(data.lastActivityAt),
      messages: data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    } as Conversation;
  }

  /**
   * List all conversations for a user
   */
  static async listConversations(
    userId: string,
    limit: number = 30,
    category?: string
  ): Promise<ConversationListItem[]> {
    let query = db
      .collection(CONVERSATIONS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('isPinned', 'desc')
      .orderBy('lastActivityAt', 'desc')
      .limit(limit);

    if (category && category !== 'all') {
      query = query.where('category', '==', category) as any;
    }

    const snapshot = await query.get();

    const conversations: ConversationListItem[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const firstUserMessage = data.messages?.find((msg: any) => msg.sender === 'user');

      return {
        conversationId: doc.id,
        title: data.title,
        lastActivityAt: new Date(data.lastActivityAt),
        messageCount: data.messageCount || data.messages?.length || 0,
        category: data.category,
        aiModel: data.aiModel,
        isPinned: data.isPinned || false,
        preview: firstUserMessage?.text?.substring(0, 60) || '',
      };
    });

    console.log(`📋 [CONVERSATION] Listed ${conversations.length} conversations for user: ${userId}`);
    return conversations;
  }

  /**
   * Update conversation (title, pin, category)
   */
  static async updateConversation(
    conversationId: string,
    userId: string,
    updates: UpdateConversation
  ): Promise<boolean> {
    const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversationId);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return false;
    }

    const data = conversationDoc.data();
    
    // Security: Verify ownership
    if (data?.userId !== userId) {
      console.warn(`🚨 [CONVERSATION] Unauthorized update attempt: ${userId} -> ${conversationId}`);
      return false;
    }

    await conversationRef.update({
      ...updates,
      lastActivityAt: new Date().toISOString(),
    });

    console.log(`✏️ [CONVERSATION] Updated: ${conversationId}`);
    return true;
  }

  /**
   * Add messages to existing conversation
   */
  static async addMessages(
    conversationId: string,
    userId: string,
    newMessages: ConversationMessage[]
  ): Promise<boolean> {
    const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversationId);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return false;
    }

    const data = conversationDoc.data();
    
    // Security: Verify ownership
    if (data?.userId !== userId) {
      console.warn(`🚨 [CONVERSATION] Unauthorized message add attempt: ${userId} -> ${conversationId}`);
      return false;
    }

    const existingMessages = data.messages || [];
    const updatedMessages = [
      ...existingMessages,
      ...newMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      })),
    ];

    await conversationRef.update({
      messages: updatedMessages,
      messageCount: updatedMessages.length,
      lastActivityAt: new Date().toISOString(),
    });

    console.log(`➕ [CONVERSATION] Added ${newMessages.length} messages to: ${conversationId}`);
    return true;
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversationId);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return false;
    }

    const data = conversationDoc.data();
    
    // Security: Verify ownership
    if (data?.userId !== userId) {
      console.warn(`🚨 [CONVERSATION] Unauthorized delete attempt: ${userId} -> ${conversationId}`);
      return false;
    }

    await conversationRef.delete();

    console.log(`🗑️ [CONVERSATION] Deleted: ${conversationId}`);
    return true;
  }

  /**
   * Get conversation count for user (for subscription limits)
   */
  static async getConversationCount(userId: string): Promise<number> {
    const snapshot = await db
      .collection(CONVERSATIONS_COLLECTION)
      .where('userId', '==', userId)
      .count()
      .get();

    return snapshot.data().count;
  }

  /**
   * Clean old conversations based on subscription limits
   * Keep only the most recent N conversations
   */
  static async cleanOldConversations(userId: string, keepCount: number): Promise<number> {
    const allConversations = await db
      .collection(CONVERSATIONS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('lastActivityAt', 'desc')
      .get();

    if (allConversations.size <= keepCount) {
      return 0; // No need to delete
    }

    // Get conversations to delete (oldest ones beyond the limit)
    const toDelete = allConversations.docs.slice(keepCount);
    
    // Delete in batch
    const batch = db.batch();
    toDelete.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`🧹 [CONVERSATION] Cleaned ${toDelete.length} old conversations for user: ${userId}`);
    return toDelete.length;
  }
}
